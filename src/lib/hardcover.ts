import "server-only";

export interface Recommendation {
  title: string;
  author: string;
  why: string;
}

export function isHardcoverConfigured(): boolean {
  return Boolean(process.env.HARDCOVER_API_KEY);
}

/** HARDCOVER_API_KEY may or may not already include the "Bearer " prefix. */
function authHeader(): string {
  const key = process.env.HARDCOVER_API_KEY ?? "";
  return key.startsWith("Bearer ") ? key : `Bearer ${key}`;
}

const ENDPOINT = "https://api.hardcover.app/v1/graphql";

interface HcDoc {
  title?: string;
  author_names?: string[];
  genres?: string[];
  moods?: string[];
  rating?: number;
  ratings_count?: number;
  users_count?: number;
  pages?: number;
  release_year?: number;
}

// Overly broad tags that don't help differentiate recommendations.
const GENERIC = new Set([
  "fiction",
  "nonfiction",
  "audiobook",
  "ebook",
  "science fiction & fantasy",
  "adult",
]);

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Run a Hardcover book search; returns the result documents (or [] on error). */
async function search(query: string, perPage = 10): Promise<HcDoc[]> {
  const gql = `query Search($q: String!, $pp: Int!) {
    search(query: $q, query_type: "Book", per_page: $pp) { results }
  }`;
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader() },
      body: JSON.stringify({ query: gql, variables: { q: query, pp: perPage } }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (data.errors) return [];
    const hits = data?.data?.search?.results?.hits ?? [];
    return hits.map((h: { document?: HcDoc }) => h.document ?? {});
  } catch {
    return [];
  }
}

interface SeedBook {
  title: string;
  author: string | null;
  avgRating: number | null;
}

/**
 * Heuristic recommender (no LLM):
 *  1. Take the club's highest-rated reads as seeds.
 *  2. Resolve each on Hardcover and collect its genres/moods.
 *  3. Search Hardcover within the club's top genres.
 *  4. Rank candidates by genre overlap + Hardcover rating/popularity,
 *     excluding anything already read/queued.
 */
export async function getRecommendations(opts: {
  history: SeedBook[];
  avoidTitles: string[];
}): Promise<Recommendation[]> {
  if (!isHardcoverConfigured()) return [];

  const rated = opts.history.filter((b) => b.avgRating != null);
  const seeds = (
    rated.length > 0
      ? rated.sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))
      : opts.history
  ).slice(0, 6);
  if (seeds.length === 0) return [];

  // 1-2. Resolve each seed on Hardcover -> genre weights + favorite authors.
  const genreWeight = new Map<string, number>();
  const genreLabel = new Map<string, string>();
  const favAuthors = new Map<string, string>(); // normalized -> display
  for (const seed of seeds) {
    if (seed.author) favAuthors.set(norm(seed.author), seed.author);
    const docs = await search(`${seed.title} ${seed.author ?? ""}`.trim(), 1);
    const doc = docs[0];
    if (!doc) continue;
    for (const a of doc.author_names ?? []) favAuthors.set(norm(a), a);
    const weight = (seed.avgRating ?? 3) / 5; // higher-rated seeds weigh more
    for (const g of [...(doc.genres ?? []), ...(doc.moods ?? [])]) {
      if (GENERIC.has(g.toLowerCase())) continue;
      const key = norm(g);
      genreWeight.set(key, (genreWeight.get(key) ?? 0) + weight);
      genreLabel.set(key, g);
    }
  }

  const topGenres = [...genreWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => ({ key, label: genreLabel.get(key) ?? key }));
  const topGenreKeys = new Set(topGenres.map((g) => g.key));

  const avoid = new Set(opts.avoidTitles.map(norm));
  for (const s of seeds) avoid.add(norm(s.title));

  // 3. Build a candidate pool from two strong signals:
  //    (a) other books by authors the club reads, and
  //    (b) books matching the club's top genres.
  const candidates = new Map<string, { doc: HcDoc; overlap: string[]; byAuthor: string | null }>();

  function consider(doc: HcDoc) {
    if (!doc.title) return;
    const key = norm(doc.title);
    if (avoid.has(key) || candidates.has(key)) return;
    const docGenreKeys = new Set((doc.genres ?? []).map(norm));
    const overlap = topGenres.filter((tg) => docGenreKeys.has(tg.key)).map((tg) => tg.label);
    const byAuthor =
      (doc.author_names ?? []).map(norm).find((a) => favAuthors.has(a)) ?? null;
    if (overlap.length === 0 && !byAuthor) return;
    candidates.set(key, {
      doc,
      overlap,
      byAuthor: byAuthor ? favAuthors.get(byAuthor) ?? null : null,
    });
  }

  for (const author of [...favAuthors.values()].slice(0, 6)) {
    for (const doc of await search(author, 8)) consider(doc);
  }
  for (const g of topGenres) {
    for (const doc of await search(g.label, 12)) consider(doc);
  }

  // 4. Score: genre overlap + favorite-author bonus + rating + popularity.
  const ranked = [...candidates.values()]
    .filter((c) => (c.doc.users_count ?? 0) >= 20 || c.byAuthor)
    .map((c) => {
      const rating = c.doc.rating ?? 0;
      const popularity = Math.log10((c.doc.users_count ?? 0) + 1);
      const score = c.overlap.length * 3 + (c.byAuthor ? 2.5 : 0) + rating + popularity * 0.5;
      return { ...c, score, rating };
    })
    .sort((a, b) => b.score - a.score);

  // Cap to 2 per author so a single series doesn't dominate.
  const perAuthor = new Map<string, number>();
  const scored: typeof ranked = [];
  for (const c of ranked) {
    const a = norm(c.doc.author_names?.[0] ?? "");
    const n = perAuthor.get(a) ?? 0;
    if (a && n >= 2) continue;
    perAuthor.set(a, n + 1);
    scored.push(c);
    if (scored.length >= 7) break;
  }

  return scored.map((c) => {
    const ratingStr = c.rating ? `${c.rating.toFixed(1)}★ on Hardcover` : "well rated on Hardcover";
    const why = c.byAuthor
      ? `More from ${c.byAuthor}, an author the club rates highly; ${ratingStr}.`
      : `Matches your taste for ${c.overlap.slice(0, 2).join(" & ")}; ${ratingStr}.`;
    return {
      title: c.doc.title ?? "Untitled",
      author: c.doc.author_names?.join(", ") ?? "",
      why,
    };
  });
}
