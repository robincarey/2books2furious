import { GenrePie, PagesLine, RatingsBar } from "@/components/analytics-charts";
import { SetupNotice } from "@/components/setup-notice";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getAllReviews, getBooksWithExtras, getMeetings, getMembers } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const members = await getMembers();
  if (members.length === 0) return <SetupNotice reason="schema" />;

  const [books, reviews, meetings] = await Promise.all([
    getBooksWithExtras(null),
    getAllReviews(),
    getMeetings(),
  ]);

  const readBooks = books.filter((b) => b.status === "read");

  // Genre breakdown
  const genreCounts = new Map<string, number>();
  for (const b of books) {
    for (const g of b.genres) genreCounts.set(g, (genreCounts.get(g) ?? 0) + 1);
  }
  const genreData = [...genreCounts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Ratings distribution
  const ratingCounts = [1, 2, 3, 4, 5].map((r) => ({
    rating: `${r}★`,
    count: reviews.filter((rv) => rv.rating === r).length,
  }));

  // Pages over time (by meeting date, books with page counts)
  const bookMap = new Map(books.map((b) => [b.id, b]));
  const pagesData = meetings
    .filter((m) => m.book_id && bookMap.get(m.book_id)?.page_count)
    .map((m) => ({
      label: formatDate(m.meeting_date).replace(/,.*/, ""),
      pages: bookMap.get(m.book_id as string)?.page_count ?? 0,
    }));

  // Summary stats
  const totalPages = readBooks.reduce((s, b) => s + (b.page_count ?? 0), 0);
  const avgPages =
    readBooks.filter((b) => b.page_count).length > 0
      ? Math.round(totalPages / readBooks.filter((b) => b.page_count).length)
      : 0;
  const finishRate =
    reviews.length > 0
      ? Math.round((reviews.filter((r) => r.finished).length / reviews.length) * 100)
      : 0;

  const hasData = books.length > 0 || reviews.length > 0;

  return (
    <div className="space-y-8">
      <PageHeader title="Analytics" subtitle="What the club's reading habits look like." />

      {!hasData ? (
        <EmptyState title="No data yet" description="Add books and reviews to unlock charts." />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label="Books read" value={readBooks.length} />
            <Stat label="Total pages" value={totalPages.toLocaleString()} />
            <Stat label="Avg book length" value={`${avgPages}p`} />
            <Stat label="Finish rate" value={`${finishRate}%`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-4 font-semibold">Genres</h2>
              {genreData.length ? (
                <GenrePie data={genreData} />
              ) : (
                <p className="text-sm text-muted-foreground">No genres tagged yet.</p>
              )}
            </Card>
            <Card className="p-6">
              <h2 className="mb-4 font-semibold">Ratings distribution</h2>
              <RatingsBar data={ratingCounts} />
            </Card>
            <Card className="p-6 lg:col-span-2">
              <h2 className="mb-4 font-semibold">Book length over time</h2>
              {pagesData.length ? (
                <PagesLine data={pagesData} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Schedule meetings with page-counted books to chart this.
                </p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}
