import { NextResponse } from "next/server";
import { getRecommendations, isHardcoverConfigured } from "@/lib/hardcover";
import { getSupabase } from "@/lib/supabase";
import type { Book, Review } from "@/lib/types";

export async function POST(request: Request) {
  if (!isHardcoverConfigured()) {
    return NextResponse.json({ error: "not_configured", recommendations: [] }, { status: 200 });
  }

  const { scope } = (await request.json().catch(() => ({}))) as { scope?: string };
  const supabase = getSupabase();
  const [{ data: books }, { data: reviews }] = await Promise.all([
    supabase.from("books").select("*"),
    supabase.from("reviews").select("*"),
  ]);

  const bookList = (books as Book[]) ?? [];
  const reviewList = (reviews as Review[]) ?? [];

  // Average rating per book (optionally just for one member's reviews).
  const relevant =
    scope && scope !== "group" ? reviewList.filter((r) => r.member_id === scope) : reviewList;

  const avgByBook = new Map<string, { sum: number; n: number }>();
  for (const r of relevant) {
    if (r.rating == null) continue;
    const e = avgByBook.get(r.book_id) ?? { sum: 0, n: 0 };
    e.sum += r.rating;
    e.n += 1;
    avgByBook.set(r.book_id, e);
  }

  // Seeds: rated books first; fall back to all "read" club books.
  const history = bookList
    .filter((b) => avgByBook.has(b.id) || b.status === "read")
    .map((b) => {
      const a = avgByBook.get(b.id);
      return {
        title: b.title,
        author: b.author,
        avgRating: a ? a.sum / a.n : null,
      };
    });

  const recommendations = await getRecommendations({
    history,
    avoidTitles: bookList.map((b) => b.title),
  });

  return NextResponse.json({ recommendations });
}
