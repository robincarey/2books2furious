import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/book-cover";
import { StarsDisplay } from "@/components/star-rating";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAllMemberReads, getAllReviews, getBooksWithExtras, membersById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function WrappedPage() {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const memberMap = await membersById();
  if (memberMap.size === 0) return <SetupNotice reason="schema" />;

  const [books, reviews, reads] = await Promise.all([
    getBooksWithExtras(null),
    getAllReviews(),
    getAllMemberReads(),
  ]);

  // The whole club-read library, not just books tied to a dated meeting.
  const readBooks = books.filter((b) => b.status === "read");
  const readIds = new Set(readBooks.map((b) => b.id));
  const libraryReviews = reviews.filter((r) => readIds.has(r.book_id));

  const totalPages = readBooks.reduce((s, b) => s + (b.page_count ?? 0), 0);

  const genreCounts = new Map<string, number>();
  for (const b of readBooks) {
    for (const g of b.genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }
  const topGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const ranked = readBooks
    .map((b) => ({ book: b, avg: b.avg_rating ?? 0, n: b.review_count }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.avg - a.avg);
  const favorite = ranked[0];
  const mostDivisive = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  const reviewsByMember = new Map<string, number>();
  for (const r of libraryReviews) {
    reviewsByMember.set(r.member_id, (reviewsByMember.get(r.member_id) ?? 0) + 1);
  }
  const topReviewerId = [...reviewsByMember.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topReviewer = topReviewerId ? memberMap.get(topReviewerId) : null;

  // Per-member completed reads (member_book_reads).
  const completionsByMember = new Map<string, number>();
  for (const r of reads) {
    if (!readIds.has(r.book_id)) continue;
    completionsByMember.set(r.member_id, (completionsByMember.get(r.member_id) ?? 0) + 1);
  }
  const topReaderEntry = [...completionsByMember.entries()].sort((a, b) => b[1] - a[1])[0];
  const topReader = topReaderEntry ? memberMap.get(topReaderEntry[0]) : null;

  const avgLen = readBooks.filter((b) => b.page_count).length
    ? Math.round(totalPages / readBooks.filter((b) => b.page_count).length)
    : 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Wrapped" subtitle="The club's year in books — the whole library so far." />

      {readBooks.length === 0 ? (
        <EmptyState
          title="Nothing read yet"
          description="Mark books as read to build a wrap-up."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <BigStat label="Books read" value={readBooks.length} href="/previous" />
            <BigStat label="Pages devoured" value={totalPages.toLocaleString()} />
            <BigStat label="Reviews written" value={libraryReviews.length} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {favorite && (
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">Group favorite</p>
                <div className="mt-3 flex gap-4">
                  <BookCover url={favorite.book.cover_url} title={favorite.book.title} width={72} />
                  <div>
                    <Link
                      href={`/books/${favorite.book.id}`}
                      className="font-semibold hover:text-primary"
                    >
                      {favorite.book.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">{favorite.book.author}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <StarsDisplay value={favorite.avg} size={14} />
                      <span className="text-sm font-medium">{favorite.avg.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card className="p-6">
              <p className="text-sm text-muted-foreground">Highlights</p>
              <ul className="mt-3 space-y-3 text-sm">
                {topReader && (
                  <li className="flex items-center gap-2">
                    <Avatar name={topReader.name} color={topReader.color} size={26} />
                    <span>
                      <strong>{topReader.name.split(" ")[0]}</strong> completed the most books (
                      {topReaderEntry?.[1]})
                    </span>
                  </li>
                )}
                {topReviewer && (
                  <li className="flex items-center gap-2">
                    <Avatar name={topReviewer.name} color={topReviewer.color} size={26} />
                    <span>
                      <strong>{topReviewer.name.split(" ")[0]}</strong> wrote the most reviews
                    </span>
                  </li>
                )}
                {mostDivisive && (
                  <li>
                    Lowest rated:{" "}
                    <Link
                      href={`/books/${mostDivisive.book.id}`}
                      className="font-medium hover:text-primary"
                    >
                      {mostDivisive.book.title}
                    </Link>{" "}
                    ({mostDivisive.avg.toFixed(2)}★)
                  </li>
                )}
                <li>
                  Average book length: <strong>{avgLen}p</strong>
                </li>
              </ul>
            </Card>
          </div>

          {topGenres.length > 0 && (
            <Card className="p-6">
              <p className="mb-3 text-sm text-muted-foreground">Top genres</p>
              <div className="flex flex-wrap gap-2">
                {topGenres.map(([g, n]) => (
                  <Link key={g} href={`/books?genre=${encodeURIComponent(g)}`}>
                    <Badge tone="secondary">
                      {g} · {n}
                    </Badge>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function BigStat({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const inner = (
    <Card className="p-6 text-center transition hover:border-primary/50">
      <p className="text-4xl font-black text-primary">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
