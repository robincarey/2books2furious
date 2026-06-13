import "server-only";
import type { BookSearchResult } from "./types";

const GENRE_KEYWORDS = [
  "science fiction",
  "fantasy",
  "mystery",
  "thriller",
  "horror",
  "romance",
  "adventure",
  "historical",
  "crime",
  "detective",
  "dystopia",
  "space opera",
  "literary",
  "fiction",
];

/** Turn Open Library's noisy `subject` list into a few clean genre tags. */
function cleanGenres(subjects?: string[]): string[] {
  if (!subjects) return [];
  const out = new Set<string>();
  for (const s of subjects) {
    const low = s.toLowerCase();
    for (const kw of GENRE_KEYWORDS) {
      if (low.includes(kw)) {
        const titled = s
          .split(" ")
          .slice(0, 3)
          .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
          .join(" ");
        out.add(titled);
        break;
      }
    }
    if (out.size >= 4) break;
  }
  return [...out];
}

// --------------------------------------------------------------------------
// Open Library (primary) - no API key, no daily quota.
// --------------------------------------------------------------------------
interface OpenLibraryDoc {
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  cover_i?: number;
  isbn?: string[];
  subject?: string[];
  first_sentence?: string[];
}

function olCover(doc: OpenLibraryDoc, isbn: string | null): string | null {
  if (doc.cover_i) return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  return null;
}

async function searchOpenLibrary(query: string, limit: number): Promise<BookSearchResult[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set(
    "fields",
    "title,author_name,first_publish_year,number_of_pages_median,cover_i,isbn,subject,first_sentence",
  );

  const res = await fetch(url, {
    headers: { "User-Agent": "2Books2Furious/1.0 (book club app)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
  const docs = data.docs ?? [];

  return docs.map((doc) => {
    const isbn = Array.isArray(doc.isbn)
      ? doc.isbn.find((x) => x.length === 13) ?? doc.isbn[0] ?? null
      : null;
    return {
      title: doc.title ?? "Untitled",
      author: doc.author_name?.join(", ") ?? null,
      page_count: doc.number_of_pages_median ?? null,
      genres: cleanGenres(doc.subject),
      cover_url: olCover(doc, isbn),
      description: doc.first_sentence?.[0] ?? null,
      isbn,
    } satisfies BookSearchResult;
  });
}

// --------------------------------------------------------------------------
// Google Books (fallback only) - has a daily quota that we frequently hit.
// --------------------------------------------------------------------------
interface GoogleVolume {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    pageCount?: number;
    categories?: string[];
    description?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type?: string; identifier?: string }[];
  };
}

function pickIsbn(ids?: { type?: string; identifier?: string }[]): string | null {
  if (!ids) return null;
  return (
    ids.find((i) => i.type === "ISBN_13")?.identifier ??
    ids.find((i) => i.type === "ISBN_10")?.identifier ??
    null
  );
}

async function searchGoogleBooks(query: string, limit: number): Promise<BookSearchResult[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", query);
  url.searchParams.set("maxResults", String(limit));
  url.searchParams.set("printType", "books");

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: GoogleVolume[] };
  return (data.items ?? []).map((item) => {
    const v = item.volumeInfo ?? {};
    const isbn = pickIsbn(v.industryIdentifiers);
    const thumb = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail;
    return {
      title: v.title ?? "Untitled",
      author: v.authors?.join(", ") ?? null,
      page_count: v.pageCount ?? null,
      genres: v.categories ?? [],
      cover_url: isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`
        : thumb?.replace("http://", "https://") ?? null,
      description: v.description ?? null,
      isbn,
    } satisfies BookSearchResult;
  });
}

const OL_UA = { "User-Agent": "2Books2Furious/1.0 (book club app)" };

function looksLikeIsbn(s: string): string | null {
  const cleaned = s.replace(/[-\s]/g, "");
  if (/^\d{13}$/.test(cleaned) || /^\d{9}[\dXx]$/.test(cleaned)) return cleaned.toUpperCase();
  return null;
}

/** Resolve a single edition from Open Library's ISBN lookup. */
async function searchByIsbn(isbn: string): Promise<BookSearchResult[]> {
  const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, { headers: OL_UA });
  if (!res.ok) return [];
  const ed = (await res.json()) as {
    title?: string;
    authors?: { key: string }[];
    number_of_pages?: number;
    covers?: number[];
    works?: { key: string }[];
  };

  // Author names (resolve a couple of author keys).
  const authors: string[] = [];
  for (const a of (ed.authors ?? []).slice(0, 3)) {
    try {
      const ar = await fetch(`https://openlibrary.org${a.key}.json`, { headers: OL_UA });
      if (ar.ok) {
        const name = (await ar.json())?.name;
        if (name) authors.push(name);
      }
    } catch {
      /* ignore */
    }
  }

  // Genres from the work's subjects.
  let genres: string[] = [];
  const workKey = ed.works?.[0]?.key;
  if (workKey) {
    try {
      const wr = await fetch(`https://openlibrary.org${workKey}.json`, { headers: OL_UA });
      if (wr.ok) genres = cleanGenres((await wr.json())?.subjects);
    } catch {
      /* ignore */
    }
  }

  const cover = ed.covers?.find((c) => c > 0)
    ? `https://covers.openlibrary.org/b/id/${ed.covers!.find((c) => c > 0)}-L.jpg`
    : `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

  return [
    {
      title: ed.title ?? "Untitled",
      author: authors.join(", ") || null,
      page_count: ed.number_of_pages ?? null,
      genres,
      cover_url: cover,
      description: null,
      isbn,
    },
  ];
}

/**
 * Search for books to autofill a backlog entry. If the query is an ISBN, resolve
 * that exact edition. Otherwise Open Library is primary (no quota), with Google
 * Books as a best-effort fallback only when OL returns nothing.
 */
export async function searchBooks(query: string, limit = 8): Promise<BookSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const isbn = looksLikeIsbn(q);
  if (isbn) {
    try {
      const byIsbn = await searchByIsbn(isbn);
      if (byIsbn.length > 0) return byIsbn;
    } catch {
      /* fall through to text search */
    }
    // Fall back to OL text search using the isbn: qualifier.
    try {
      const viaSearch = await searchOpenLibrary(`isbn:${isbn}`, limit);
      if (viaSearch.length > 0) return viaSearch;
    } catch {
      /* ignore */
    }
  }

  try {
    const ol = await searchOpenLibrary(q, limit);
    if (ol.length > 0) return ol;
  } catch {
    // fall through to Google
  }

  try {
    return await searchGoogleBooks(q, limit);
  } catch {
    return [];
  }
}
