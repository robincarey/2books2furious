// Seeds the club's reading history. Looks up metadata from Google Books and
// inserts via the Supabase secret key. Idempotent: skips books whose title
// already exists. Run: node scripts/seed-books.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- load .env.local (authoritative; do NOT inherit shell env, which may
// point at a different Supabase project) ---
const fileEnv = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0 && !line.startsWith("#")) fileEnv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const supabase = createClient(fileEnv.SUPABASE_URL, fileEnv.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

function pickIsbn(ids) {
  if (!ids) return null;
  return ids.find((i) => i.type === "ISBN_13")?.identifier
    ?? ids.find((i) => i.type === "ISBN_10")?.identifier
    ?? null;
}
function bestCover(isbn, googleThumb) {
  if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  if (googleThumb) return googleThumb.replace("http://", "https://");
  return null;
}

async function lookup(title, author) {
  const q = `intitle:${title} inauthor:${author}`;
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("printType", "books");
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const item = (data.items ?? [])[0];
    if (!item) return null;
    const v = item.volumeInfo ?? {};
    const isbn = pickIsbn(v.industryIdentifiers);
    return {
      title: v.title ?? title,
      author: v.authors?.join(", ") ?? author,
      page_count: v.pageCount ?? null,
      genres: v.categories ?? [],
      cover_url: bestCover(isbn, v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail),
      description: v.description ?? null,
      isbn,
    };
  } catch {
    return null;
  }
}

const READ = [
  ["Empire of Silence", "Christopher Ruocchio"],
  ["I Who Have Never Known Men", "Jacqueline Harpman"],
  ["The Tender Bar", "J.R. Moehringer"],
  ["Shroud", "Adrian Tchaikovsky"],
  ["Small Mercies", "Dennis Lehane"],
  ["Rivers of London", "Ben Aaronovitch"],
  ["Shards of Earth", "Adrian Tchaikovsky"],
  ["A Drop of Corruption", "Robert Jackson Bennett"],
  ["The Tainted Cup", "Robert Jackson Bennett"],
  ["Hard-Boiled Wonderland and the End of the World", "Haruki Murakami"],
  ["There Is No Antimemetics Division", "qntm"],
];
const SCHEDULED = [["Between Two Fires", "Christopher Buehlman"]];

async function exists(title) {
  const { data } = await supabase.from("books").select("id").ilike("title", title).maybeSingle();
  return data?.id ?? null;
}

async function insertBook(title, author, status) {
  const existingId = await exists(title);
  if (existingId) {
    console.log(`  = skip (exists): ${title}`);
    return existingId;
  }
  const meta = await lookup(title, author);
  const row = {
    title: meta?.title ?? title,
    author: meta?.author ?? author,
    page_count: meta?.page_count ?? null,
    genres: meta?.genres ?? [],
    cover_url: meta?.cover_url ?? null,
    description: meta?.description ?? null,
    isbn: meta?.isbn ?? null,
    status,
  };
  const { data, error } = await supabase.from("books").insert(row).select("id").single();
  if (error) {
    console.log(`  ! error inserting ${title}: ${error.message}`);
    return null;
  }
  console.log(
    `  + ${status}: ${row.title}${meta ? ` (${row.page_count ?? "?"}p, ${row.genres[0] ?? "no genre"})` : " [no metadata]"}`,
  );
  return data.id;
}

async function main() {
  console.log("Seeding read books...");
  for (const [t, a] of READ) await insertBook(t, a, "read");

  console.log("Seeding current (scheduled) book...");
  let scheduledId = null;
  for (const [t, a] of SCHEDULED) scheduledId = await insertBook(t, a, "scheduled");

  if (scheduledId) {
    const { data: existingMeeting } = await supabase
      .from("meetings")
      .select("id")
      .eq("book_id", scheduledId)
      .maybeSingle();
    if (existingMeeting) {
      console.log("  = meeting already exists for Between Two Fires");
    } else {
      const { error } = await supabase.from("meetings").insert({
        book_id: scheduledId,
        meeting_date: new Date("2026-06-28T19:00:00").toISOString(),
        location: null,
        notes: null,
      });
      console.log(error ? `  ! meeting error: ${error.message}` : "  + meeting on 2026-06-28");
    }
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
