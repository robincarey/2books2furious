import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/book-cover";
import { StarsDisplay } from "@/components/star-rating";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAllReviews, getBooksWithExtras, getMeetings, membersById } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const memberMap = await membersById();
  if (memberMap.size === 0) return <SetupNotice reason="schema" />;

  const { year: yearParam } = await searchParams;
  const year = Number(yearParam) || new Date().getFullYear();

  const [books, reviews, meetings] = await Promise.all([
    getBooksWithExtras(null),
    getAllReviews(),
    getMeetings(),
  ]);

  const bookMap = new Map(books.map((b) => [b.id, b]));
  const meetingsThisYear = meetings.filter(
    (m) => new Date(m.meeting_date).getFullYear() === year,
  );
  const bookIdsThisYear = new Set(
    meetingsThisYear.map((m) => m.book_id).filter(Boolean) as string[],
  );
  const booksThisYear = [...bookIdsThisYear].map((id) => bookMap.get(id)).filter(Boolean);
  const reviewsThisYear = reviews.filter((r) => bookIdsThisYear.has(r.book_id));

  const totalPages = booksThisYear.reduce((s, b) => s + (b?.page_count ?? 0), 0);

  const genreCounts = new Map<string, number>();
  for (const b of booksThisYear) {
    for (const g of b?.genres ?? []) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }
  const topGenres = [...genreCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const ranked = booksThisYear
    .map((b) => ({ book: b!, avg: b!.avg_rating ?? 0, n: b!.review_count }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.avg - a.avg);
  const favorite = ranked[0];
  const mostDivisive = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  const reviewsByMember = new Map<string, number>();
  for (const r of reviewsThisYear) {
    reviewsByMember.set(r.member_id, (reviewsByMember.get(r.member_id) ?? 0) + 1);
  }
  const topReviewerId = [...reviewsByMember.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const topReviewer = topReviewerId ? memberMap.get(topReviewerId) : null;

  const availableYears = [
    ...new Set(meetings.map((m) => new Date(m.meeting_date).getFullYear())),
  ].sort((a, b) => b - a);

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${year} Wrapped`}
        subtitle="The club's year in books."
        action={
          <div className="flex gap-1">
            {availableYears.map((y) => (
              <Link
                key={y}
                href={`/wrapped?year=${y}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  y === year ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        }
      />

      {booksThisYear.length === 0 ? (
        <EmptyState
          title={`Nothing logged for ${year}`}
          description="Schedule meetings with books to build a wrap-up."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <BigStat label="Books read" value={booksThisYear.length} />
            <BigStat label="Pages devoured" value={totalPages.toLocaleString()} />
            <BigStat label="Reviews written" value={reviewsThisYear.length} />
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
                  Average book length:{" "}
                  <strong>
                    {booksThisYear.filter((b) => b?.page_count).length
                      ? Math.round(
                          totalPages / booksThisYear.filter((b) => b?.page_count).length,
                        )
                      : 0}
                    p
                  </strong>
                </li>
              </ul>
            </Card>
          </div>

          {topGenres.length > 0 && (
            <Card className="p-6">
              <p className="mb-3 text-sm text-muted-foreground">Top genres of {year}</p>
              <div className="flex flex-wrap gap-2">
                {topGenres.map(([g, n]) => (
                  <Badge key={g} tone="secondary">
                    {g} · {n}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function BigStat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-6 text-center">
      <p className="text-4xl font-black text-primary">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}
