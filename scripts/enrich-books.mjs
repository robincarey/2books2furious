// Backfills/repairs metadata (cover, pages, genres, isbn) for books using the
// Open Library API (no key/quota). Prefers PRINT edition covers over audiobook
// editions, and normalizes subjects into a clean canonical genre set.
// Force-overwrites cover_url + genres; fills page_count/isbn only if missing.
// Run: node scripts/enrich-books.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const fileEnv = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0 && !line.startsWith("#")) fileEnv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const url = fileEnv.B2F_SUPABASE_URL ?? fileEnv.SUPABASE_URL;
const key = fileEnv.B2F_SUPABASE_SECRET_KEY ?? fileEnv.SUPABASE_SECRET_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });

const UA = { "User-Agent": "2Books2Furious/1.0 (book club app)" };

// --- Genre normalization -------------------------------------------------
// Each rule: if ANY subject matches the regex, add the canonical genre.
const GENRE_RULES = [
  [/science fiction|\bsci-?fi\b|space opera|cyberpunk|dystop|post-apocalyptic|\bspace\b|aliens?/i, "Science Fiction"],
  [/fantasy|magic|dragons?|sword (and|&) sorcery|epic fantasy/i, "Fantasy"],
  [/mystery|detective|whodunit/i, "Mystery"],
  [/thriller|suspense/i, "Thriller"],
  [/crime|noir|police|murder/i, "Crime"],
  [/horror|supernatural|ghost|haunt/i, "Horror"],
  [/romance|love story/i, "Romance"],
  [/histor/i, "Historical Fiction"],
  [/young adult|ya fiction|juvenile/i, "Young Adult"],
  [/memoir|autobiograph|biograph/i, "Memoir"],
  [/literary|literature|literary fiction/i, "Literary Fiction"],
  [/adventure/i, "Adventure"],
];

function normalizeGenres(subjects) {
  if (!subjects || !subjects.length) return [];
  const out = [];
  for (const [re, label] of GENRE_RULES) {
    if (out.length >= 4) break;
    if (subjects.some((s) => re.test(s))) out.push(label);
  }
  if (out.length === 0) out.push("Fiction");
  return out;
}

// --- Print-cover preference ----------------------------------------------
const AUDIO_OR_EBOOK = /audio|cd|cassette|mp3|audible|ebook|kindle|electronic|digital/i;
const PRINT = /hardcover|hardback|paperback|mass market|library binding|board book|spiral|print/i;

async function bestCover(workKey, coverI, isbn) {
  if (workKey) {
    try {
      const res = await fetch(`https://openlibrary.org${workKey}/editions.json?limit=50`, { headers: UA });
      if (res.ok) {
        const entries = (await res.json()).entries ?? [];
        const withCover = entries.filter((e) => Array.isArray(e.covers) && e.covers[0] > 0);
        const fmt = (e) => e.physical_format || "";
        const explicitPrint = withCover
          .filter((e) => PRINT.test(fmt(e)) && !AUDIO_OR_EBOOK.test(fmt(e)))
          .sort((a, b) => (/(hardcover|hardback)/i.test(fmt(a)) ? -1 : 1) - (/(hardcover|hardback)/i.test(fmt(b)) ? -1 : 1));
        const nonAudio = withCover.filter((e) => !AUDIO_OR_EBOOK.test(fmt(e)));
        const chosen = explicitPrint[0] ?? nonAudio[0];
        if (chosen) {
          const pages = chosen.number_of_pages ?? null;
          const ed13 = (chosen.isbn_13 ?? [])[0] ?? (chosen.isbn_10 ?? [])[0] ?? null;
          return { cover_url: `https://covers.openlibrary.org/b/id/${chosen.covers[0]}-L.jpg`, pages, isbn: ed13 };
        }
      }
    } catch {
      /* fall through */
    }
  }
  if (coverI) return { cover_url: `https://covers.openlibrary.org/b/id/${coverI}-L.jpg`, pages: null, isbn: null };
  if (isbn) return { cover_url: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`, pages: null, isbn: null };
  return { cover_url: null, pages: null, isbn: null };
}

function normTitle(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function titleScore(query, candidate) {
  const q = normTitle(query);
  const c = normTitle(candidate ?? "");
  if (!q || !c) return 0;
  if (q === c) return 100;
  if (c.includes(q) || q.includes(c)) return 60;
  return 0;
}

function authorMatches(author, authorNames) {
  if (!author || !authorNames?.length) return false;
  const last = author.trim().split(/\s+/).pop()?.toLowerCase();
  return !!last && authorNames.some((n) => n.toLowerCase().includes(last));
}

function scoreDoc(title, author, doc) {
  let score = titleScore(title, doc.title);
  if (authorMatches(author, doc.author_name)) score += 30;
  if (doc.cover_i) score += 25;
  return score;
}

function pickBestDoc(title, author, docs) {
  if (!docs.length) return null;
  return docs.reduce((best, doc) => {
    const s = scoreDoc(title, author, doc);
    return !best || s > best.score ? { doc, score: s } : best;
  }).doc;
}

async function searchDoc(title, author) {
  const fields = "title,author_name,key,cover_i,number_of_pages_median,subject,isbn";
  // Fetch several hits per query; OL's top result is often a translator edition
  // with no cover (e.g. Murakami's Hard-Boiled Wonderland + Jay Rubin).
  for (const withAuthor of author ? [true, false] : [false]) {
    const u = new URL("https://openlibrary.org/search.json");
    u.searchParams.set("title", title);
    if (withAuthor) u.searchParams.set("author", author);
    u.searchParams.set("limit", "8");
    u.searchParams.set("fields", fields);
    const res = await fetch(u, { headers: UA });
    if (!res.ok) continue;
    const doc = pickBestDoc(title, author, (await res.json()).docs ?? []);
    if (doc && scoreDoc(title, author, doc) >= 60) return doc;
  }
  // OL may index only the original-language title (e.g. Harpman's French title).
  if (author) {
    const u = new URL("https://openlibrary.org/search.json");
    u.searchParams.set("q", `${title} ${author}`.trim());
    u.searchParams.set("limit", "8");
    u.searchParams.set("fields", fields);
    const res = await fetch(u, { headers: UA });
    if (res.ok) {
      const doc = pickBestDoc(title, author, (await res.json()).docs ?? []);
      if (doc?.key && authorMatches(author, doc.author_name)) return doc;
    }
  }
  return null;
}

async function olEnrich(title, author) {
  const doc = await searchDoc(title, author);
  if (!doc) return null;

  // Merge the work's full subject list for richer/more accurate genre matching.
  let subjects = doc.subject ?? [];
  if (doc.key) {
    try {
      const wr = await fetch(`https://openlibrary.org${doc.key}.json`, { headers: UA });
      if (wr.ok) {
        const work = await wr.json();
        if (Array.isArray(work.subjects)) subjects = [...subjects, ...work.subjects];
      }
    } catch {
      /* ignore */
    }
  }

  const isbn = Array.isArray(doc.isbn) ? doc.isbn.find((x) => x.length === 13) ?? doc.isbn[0] : null;
  const cover = await bestCover(doc.key, doc.cover_i, isbn);
  return {
    cover_url: cover.cover_url,
    page_count: cover.pages ?? doc.number_of_pages_median ?? null,
    genres: normalizeGenres(subjects),
    isbn: cover.isbn ?? isbn,
  };
}

// Manual overrides for club books where Open Library's subjects are sparse,
// mismatched, or missing. Override genres always win; cover_url is a fallback.
const OVERRIDES = {
  "The Tainted Cup": { genres: ["Fantasy", "Mystery"] },
  "Hard-Boiled Wonderland and the End of the World": {
    genres: ["Science Fiction", "Literary Fiction"],
    cover_url: "https://covers.openlibrary.org/b/id/14558822-L.jpg",
  },
  "Small Mercies": { genres: ["Crime", "Thriller"] },
  Shroud: { genres: ["Science Fiction"] },
  "Shards of Earth": { genres: ["Science Fiction"] },
  "I Who Have Never Known Men": {
    genres: ["Science Fiction", "Literary Fiction"],
    // ISBN 9781784875459 resolves to a 1x1 placeholder; use print edition cover id.
    cover_url: "https://covers.openlibrary.org/b/id/14840892-L.jpg",
    isbn: "9781529954463",
  },
  "Between Two Fires": {
    cover_url: "https://covers.openlibrary.org/b/isbn/9798662731349-L.jpg",
    isbn: "9798662731349",
  },
};

async function main() {
  const { data: books, error } = await supabase
    .from("books")
    .select("id,title,author,page_count,cover_url,genres,isbn");
  if (error) {
    console.error("Could not read books:", error.message);
    process.exit(1);
  }

  for (const b of books) {
    const meta = await olEnrich(b.title, b.author ?? "");
    const override = OVERRIDES[b.title];
    if (!meta && !override) {
      console.log(`  ? ${b.title}: no Open Library match`);
      continue;
    }
    const update = {};
    if (meta?.cover_url) update.cover_url = meta.cover_url; // force print cover
    if (meta?.genres.length) update.genres = meta.genres; // force normalized genres
    if (meta && !b.page_count && meta.page_count) update.page_count = meta.page_count;
    if (meta && !b.isbn && meta.isbn) update.isbn = meta.isbn;
    if (override?.genres) update.genres = override.genres;
    if (override?.cover_url) update.cover_url = override.cover_url;
    if (override?.isbn) update.isbn = override.isbn;
    if (Object.keys(update).length === 0) {
      console.log(`  = ${b.title}: nothing to change`);
      continue;
    }
    const { error: upErr } = await supabase.from("books").update(update).eq("id", b.id);
    console.log(
      upErr
        ? `  ! ${b.title}: ${upErr.message}`
        : `  + ${b.title}: [${(update.genres ?? b.genres ?? []).join(", ")}]`,
    );
    await new Promise((r) => setTimeout(r, 200)); // be polite to Open Library
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
