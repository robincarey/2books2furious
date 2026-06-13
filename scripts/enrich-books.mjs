// Backfills metadata (cover, pages, genres, isbn) for books missing it, using
// the Open Library Search API (no API key / quota). Idempotent: only fills gaps.
// Run: node scripts/enrich-books.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const fileEnv = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0 && !line.startsWith("#")) fileEnv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const supabase = createClient(fileEnv.SUPABASE_URL, fileEnv.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const GENRE_KEYWORDS = [
  "science fiction", "fantasy", "mystery", "thriller", "horror", "romance",
  "adventure", "historical", "crime", "detective", "dystopia", "space opera",
  "fiction", "literary",
];

function cleanGenres(subjects) {
  if (!subjects) return [];
  const out = new Set();
  for (const s of subjects) {
    const low = s.toLowerCase();
    for (const kw of GENRE_KEYWORDS) {
      if (low.includes(kw)) {
        out.add(s.replace(/\b\w/g, (c) => c.toUpperCase()).split(" ").slice(0, 3).join(" "));
        break;
      }
    }
    if (out.size >= 4) break;
  }
  return [...out];
}

async function olLookup(title, author) {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("title", title);
  url.searchParams.set("author", author);
  url.searchParams.set("limit", "1");
  url.searchParams.set(
    "fields",
    "title,author_name,number_of_pages_median,cover_i,isbn,subject,first_publish_year",
  );
  const res = await fetch(url, { headers: { "User-Agent": "2Books2Furious/1.0 (book club app)" } });
  if (!res.ok) return null;
  const data = await res.json();
  const doc = (data.docs ?? [])[0];
  if (!doc) return null;
  const isbn = Array.isArray(doc.isbn) ? doc.isbn.find((x) => x.length === 13) ?? doc.isbn[0] : null;
  return {
    page_count: doc.number_of_pages_median ?? null,
    cover_url: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        : null,
    genres: cleanGenres(doc.subject),
    isbn,
  };
}

async function main() {
  const { data: books, error } = await supabase
    .from("books")
    .select("id,title,author,page_count,cover_url,genres,isbn");
  if (error) {
    console.error("Could not read books:", error.message);
    process.exit(1);
  }

  for (const b of books) {
    const needs = !b.page_count || !b.cover_url || !b.genres?.length;
    if (!needs) {
      console.log(`  = ${b.title}: already enriched`);
      continue;
    }
    const meta = await olLookup(b.title, b.author ?? "");
    if (!meta) {
      console.log(`  ? ${b.title}: no Open Library match`);
      continue;
    }
    const update = {};
    if (!b.page_count && meta.page_count) update.page_count = meta.page_count;
    if (!b.cover_url && meta.cover_url) update.cover_url = meta.cover_url;
    if ((!b.genres || b.genres.length === 0) && meta.genres.length) update.genres = meta.genres;
    if (!b.isbn && meta.isbn) update.isbn = meta.isbn;
    if (Object.keys(update).length === 0) {
      console.log(`  ? ${b.title}: nothing to fill`);
      continue;
    }
    const { error: upErr } = await supabase.from("books").update(update).eq("id", b.id);
    console.log(
      upErr
        ? `  ! ${b.title}: ${upErr.message}`
        : `  + ${b.title}: ${Object.keys(update).join(", ")}${
            update.page_count ? ` (${update.page_count}p)` : ""
          }`,
    );
    await new Promise((r) => setTimeout(r, 250)); // be polite to Open Library
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
