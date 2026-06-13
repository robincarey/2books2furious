import "server-only";
import type { BookSearchResult } from "./types";

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
  const isbn13 = ids.find((i) => i.type === "ISBN_13")?.identifier;
  const isbn10 = ids.find((i) => i.type === "ISBN_10")?.identifier;
  return isbn13 ?? isbn10 ?? null;
}

/** Prefer a higher-res Open Library cover by ISBN; fall back to Google's thumbnail. */
function bestCover(isbn: string | null, googleThumb?: string): string | null {
  if (isbn) return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  if (googleThumb) return googleThumb.replace("http://", "https://");
  return null;
}

/**
 * Search Google Books and return normalized results for autofilling a book.
 * No API key required for basic volume search.
 */
export async function searchBooks(query: string, limit = 6): Promise<BookSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", String(limit));
  url.searchParams.set("printType", "books");

  try {
    const res = await fetch(url, { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: GoogleVolume[] };
    const items = data.items ?? [];

    return items.map((item) => {
      const v = item.volumeInfo ?? {};
      const isbn = pickIsbn(v.industryIdentifiers);
      return {
        title: v.title ?? "Untitled",
        author: v.authors?.join(", ") ?? null,
        page_count: v.pageCount ?? null,
        genres: v.categories ?? [],
        cover_url: bestCover(isbn, v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail),
        description: v.description ?? null,
        isbn,
      } satisfies BookSearchResult;
    });
  } catch {
    return [];
  }
}
