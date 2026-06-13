// Generates the group Top-5 recommendations via Hardcover and stores them in
// recommendations_cache so the page serves a cached list on first load.
// Mirrors src/lib/hardcover.ts. Run: node scripts/seed-recs-cache.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const HC = process.env.HARDCOVER_API_KEY || env.HARDCOVER_API_KEY;
const auth = HC?.startsWith("Bearer ") ? HC : `Bearer ${HC}`;
const supabase = createClient(env.B2F_SUPABASE_URL, env.B2F_SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const GENERIC = new Set(["fiction", "nonfiction", "audiobook", "ebook", "science fiction & fantasy", "adult"]);
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

async function search(q, pp) {
  const gql = `query($q:String!,$pp:Int!){search(query:$q,query_type:"Book",per_page:$pp){results}}`;
  const r = await fetch("https://api.hardcover.app/v1/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({ query: gql, variables: { q, pp } }),
  });
  if (!r.ok) return [];
  const d = await r.json();
  if (d.errors) return [];
  return (d.data?.search?.results?.hits ?? []).map((h) => h.document ?? {});
}

async function generate(scope) {
  const [{ data: books }, { data: reviews }] = await Promise.all([
    supabase.from("books").select("id,title,author,status"),
    supabase.from("reviews").select("book_id,member_id,rating"),
  ]);
  const relevant = scope === "group" ? reviews : reviews.filter((r) => r.member_id === scope);
  const avg = new Map();
  for (const r of relevant) {
    if (r.rating == null) continue;
    const e = avg.get(r.book_id) ?? { sum: 0, n: 0 };
    e.sum += r.rating; e.n += 1; avg.set(r.book_id, e);
  }
  const history = books
    .filter((b) => avg.has(b.id) || b.status === "read")
    .map((b) => ({ title: b.title, author: b.author, avgRating: avg.has(b.id) ? avg.get(b.id).sum / avg.get(b.id).n : null }));

  const rated = history.filter((b) => b.avgRating != null);
  const seeds = (rated.length ? rated.sort((a, b) => b.avgRating - a.avgRating) : history).slice(0, 5);
  if (!seeds.length) return [];

  const genreWeight = new Map(), genreLabel = new Map(), favAuthors = new Map();
  for (const s of seeds) {
    if (s.author) favAuthors.set(norm(s.author), s.author);
    const doc = (await search(`${s.title} ${s.author ?? ""}`.trim(), 1))[0];
    if (!doc) continue;
    for (const a of doc.author_names ?? []) favAuthors.set(norm(a), a);
    const w = (s.avgRating ?? 3) / 5;
    for (const g of [...(doc.genres ?? []), ...(doc.moods ?? [])]) {
      if (GENERIC.has(g.toLowerCase())) continue;
      genreWeight.set(norm(g), (genreWeight.get(norm(g)) ?? 0) + w);
      genreLabel.set(norm(g), g);
    }
  }
  const topGenres = [...genreWeight.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => ({ key: k, label: genreLabel.get(k) }));
  const avoid = new Set(books.map((b) => norm(b.title)));
  for (const s of seeds) avoid.add(norm(s.title));

  const candidates = new Map();
  const consider = (doc) => {
    if (!doc.title) return;
    const key = norm(doc.title);
    if (avoid.has(key) || candidates.has(key)) return;
    const dg = new Set((doc.genres ?? []).map(norm));
    const overlap = topGenres.filter((t) => dg.has(t.key)).map((t) => t.label);
    const byA = (doc.author_names ?? []).map(norm).find((a) => favAuthors.has(a));
    if (!overlap.length && !byA) return;
    candidates.set(key, { doc, overlap, byAuthor: byA ? favAuthors.get(byA) : null });
  };
  for (const a of [...favAuthors.values()].slice(0, 5)) for (const d of await search(a, 8)) consider(d);
  for (const g of topGenres) for (const d of await search(g.label, 12)) consider(d);

  const ranked = [...candidates.values()]
    .filter((c) => (c.doc.users_count ?? 0) >= 20 || c.byAuthor)
    .map((c) => {
      const rating = c.doc.rating ?? 0;
      const pop = Math.log10((c.doc.users_count ?? 0) + 1);
      return { ...c, rating, score: c.overlap.length * 3 + (c.byAuthor ? 2.5 : 0) + rating + pop * 0.5 };
    })
    .sort((a, b) => b.score - a.score);

  const perAuthor = new Map(), out = [];
  for (const c of ranked) {
    const a = norm(c.doc.author_names?.[0] ?? "");
    if (a && (perAuthor.get(a) ?? 0) >= 2) continue;
    perAuthor.set(a, (perAuthor.get(a) ?? 0) + 1);
    const ratingStr = c.rating ? `${c.rating.toFixed(1)}★ on Hardcover` : "well rated on Hardcover";
    out.push({
      title: c.doc.title,
      author: c.doc.author_names?.join(", ") ?? "",
      why: c.byAuthor
        ? `More from ${c.byAuthor}, an author the club rates highly; ${ratingStr}.`
        : `Matches your taste for ${c.overlap.slice(0, 2).join(" & ")}; ${ratingStr}.`,
    });
    if (out.length >= 5) break;
  }
  return out;
}

const recs = await generate("group");
console.log(`Generated ${recs.length} group recommendations.`);
recs.forEach((r, i) => console.log(`  ${i + 1}. ${r.title} — ${r.author}`));
const { error } = await supabase
  .from("recommendations_cache")
  .upsert({ scope: "group", recommendations: recs, generated_at: new Date().toISOString() }, { onConflict: "scope" });
console.log(error ? `ERR: ${error.message}` : "Cached for scope=group.");
