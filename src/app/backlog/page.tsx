import Link from "next/link";
import { toggleVote } from "@/app/actions";
import { AddBookForm } from "@/components/add-book-form";
import { BookCover } from "@/components/book-cover";
import { RemoveFromBacklogButton } from "@/components/remove-from-backlog-button";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getBooksWithExtras, getMembers } from "@/lib/queries";
import { getCurrentMemberId } from "@/lib/session";
import { cn, btn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BacklogPage() {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const members = await getMembers();
  if (members.length === 0) return <SetupNotice reason="schema" />;

  const memberId = await getCurrentMemberId();
  const books = (await getBooksWithExtras(memberId, "suggested")).sort(
    (a, b) => b.votes - a.votes,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Backlog"
        subtitle="Suggest books and upvote what you want to read next."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,360px)]">
        <div className="space-y-3">
          {books.length === 0 ? (
            <EmptyState
              title="The backlog is empty"
              description="Search for a book on the right to get the club's reading list started."
            />
          ) : (
            books.map((b) => (
              <Card key={b.id} className="flex gap-4 p-4">
                <BookCover url={b.cover_url} title={b.title} width={64} />
                <div className="min-w-0 flex-1">
                  <Link href={`/books/${b.id}`} className="font-semibold hover:text-primary">
                    {b.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">{b.author}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {b.page_count && <Badge>{b.page_count}p</Badge>}
                    {b.genres.slice(0, 3).map((g) => (
                      <Badge key={g} tone="secondary">
                        {g}
                      </Badge>
                    ))}
                    {b.suggester && <Badge>via {b.suggester.name.split(" ")[0]}</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/meetings?book_id=${b.id}`}
                      className={btn("outline", "sm")}
                    >
                      Select this book next
                    </Link>
                    <RemoveFromBacklogButton
                      bookId={b.id}
                      bookTitle={b.title}
                      disabled={!memberId}
                      label="Remove"
                    />
                  </div>
                </div>
                <form action={toggleVote} className="shrink-0">
                  <input type="hidden" name="book_id" value={b.id} />
                  <button
                    type="submit"
                    disabled={!memberId}
                    title={memberId ? "Toggle your vote" : "Pick who you are first"}
                    className={cn(
                      "flex h-16 w-14 flex-col items-center justify-center rounded-lg border transition disabled:opacity-50",
                      b.voted_by_me
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-card hover:border-primary/50",
                    )}
                  >
                    <span className="text-lg leading-none">▲</span>
                    <span className="text-sm font-bold">{b.votes}</span>
                  </button>
                </form>
              </Card>
            ))
          )}
        </div>

        <div>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Suggest a book</h2>
            <AddBookForm disabled={!memberId} />
          </Card>
        </div>
      </div>
    </div>
  );
}
