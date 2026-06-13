import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { StarsDisplay } from "@/components/star-rating";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getBooksWithExtras, getMembers } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface SearchParams {
  genre?: string;
  rating?: string;
  minPages?: string;
  maxPages?: string;
  status?: string;
}

export default async function BooksListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const members = await getMembers();
  if (members.length === 0) return <SetupNotice reason="schema" />;

  const sp = await searchParams;
  const genre = sp.genre?.trim() || null;
  const rating = sp.rating != null && sp.rating !== "" ? Number(sp.rating) : null;
  const minPages = sp.minPages != null && sp.minPages !== "" ? Number(sp.minPages) : null;
  const maxPages = sp.maxPages != null && sp.maxPages !== "" ? Number(sp.maxPages) : null;

  let books = await getBooksWithExtras(null);

  const filters: string[] = [];
  if (genre) {
    const g = genre.toLowerCase();
    books = books.filter((b) => b.genres.some((x) => x.toLowerCase() === g));
    filters.push(`Genre: ${genre}`);
  }
  if (rating != null) {
    books = books.filter((b) => b.avg_rating != null && Math.round(b.avg_rating) === rating);
    filters.push(`Rated ~${rating}★`);
  }
  if (minPages != null || maxPages != null) {
    const lo = minPages ?? 0;
    const hi = maxPages ?? Number.MAX_SAFE_INTEGER;
    books = books.filter((b) => b.page_count != null && b.page_count >= lo && b.page_count <= hi);
    filters.push(
      `Length: ${minPages ?? 0}${maxPages && maxPages < 100000 ? `–${maxPages}` : "+"} pages`,
    );
  }

  books.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0));

  return (
    <div className="space-y-6">
      <Link href="/analytics" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back to analytics
      </Link>
      <PageHeader
        title="Books"
        subtitle={filters.length ? filters.join("  ·  ") : "Every book in the club, ranked by rating."}
        action={
          filters.length ? (
            <Link href="/books" className="text-sm text-primary hover:underline">
              Clear filters
            </Link>
          ) : undefined
        }
      />

      {books.length === 0 ? (
        <EmptyState
          title="No books match"
          description="Try a different filter or clear it to see everything."
        />
      ) : (
        <div className="space-y-3">
          {books.map((b) => (
            <Link key={b.id} href={`/books/${b.id}`}>
              <Card className="flex items-center gap-4 p-4 transition hover:border-primary/50">
                <BookCover url={b.cover_url} title={b.title} width={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.title}</p>
                  <p className="truncate text-sm text-muted-foreground">{b.author}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={b.status === "read" ? "success" : b.status === "scheduled" ? "primary" : "muted"}>
                      {b.status}
                    </Badge>
                    {b.page_count && <Badge>{b.page_count}p</Badge>}
                    {b.genres.slice(0, 3).map((g) => (
                      <Badge key={g} tone="secondary">
                        {g}
                      </Badge>
                    ))}
                  </div>
                </div>
                {b.avg_rating != null && (
                  <div className="flex shrink-0 items-center gap-2">
                    <StarsDisplay value={b.avg_rating} size={14} />
                    <span className="text-sm font-semibold">{b.avg_rating.toFixed(2)}</span>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
