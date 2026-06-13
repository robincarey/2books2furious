import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/book-cover";
import { CommentForm } from "@/components/comment-form";
import { CommentList } from "@/components/comment-list";
import { ProgressControl } from "@/components/progress-control";
import { RemoveFromBacklogButton } from "@/components/remove-from-backlog-button";
import { SelectIdentityBanner } from "@/components/select-identity-banner";
import { ReviewForm } from "@/components/review-form";
import { StarsDisplay } from "@/components/star-rating";
import { Badge, Card, PageHeader, ProgressBar } from "@/components/ui";
import {
  getBook,
  getBookComments,
  getMyProgress,
  getMyReview,
  getProgressForBook,
  getReadsForBook,
  getReviewsForBook,
  membersById,
} from "@/lib/queries";
import { getCurrentMemberId } from "@/lib/session";
import { minutesToHours, relativeTime, btn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BookDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) notFound();

  const memberId = await getCurrentMemberId();
  const [reviews, memberMap, progress, myReview, myProgress, readerIds] = await Promise.all([
    getReviewsForBook(id),
    membersById(),
    getProgressForBook(id),
    memberId ? getMyReview(id, memberId) : Promise.resolve(null),
    memberId ? getMyProgress(id, memberId) : Promise.resolve(null),
    getReadsForBook(id),
  ]);

  const readerSet = new Set(readerIds);
  const completed = memberId ? readerSet.has(memberId) : false;
  const myPercent = myProgress?.percent ?? 0;
  const bookComments = await getBookComments(id);

  const ratings = reviews.filter((r) => r.rating != null).map((r) => r.rating as number);
  const avg = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : null;
  const progressByMember = new Map(progress.map((p) => [p.member_id, p.percent]));

  const members = [...memberMap.values()].sort((a, b) => a.selection_order - b.selection_order);

  return (
    <div className="space-y-6">
      <Link href="/backlog" className="text-sm text-muted-foreground hover:text-foreground">
        ← Back
      </Link>

      {!memberId && <SelectIdentityBanner members={members} redirectTo={`/books/${id}`} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="flex flex-col gap-5 p-6 sm:flex-row">
            <BookCover url={book.cover_url} title={book.title} width={130} />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold">{book.title}</h1>
              <p className="text-muted-foreground">{book.author}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={book.status === "read" ? "success" : book.status === "scheduled" ? "primary" : "muted"}>
                  {book.status}
                </Badge>
                {book.page_count && <Badge>{book.page_count} pages</Badge>}
                {book.audiobook_minutes && <Badge>🎧 {minutesToHours(book.audiobook_minutes)}</Badge>}
                {book.genres.map((g) => (
                  <Badge key={g} tone="secondary">
                    {g}
                  </Badge>
                ))}
              </div>
              {avg != null && (
                <div className="mt-3 flex items-center gap-2">
                  <StarsDisplay value={avg} />
                  <span className="text-sm font-medium">{avg.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({ratings.length} rating{ratings.length === 1 ? "" : "s"})
                  </span>
                </div>
              )}
              {book.description && (
                <p className="mt-4 line-clamp-6 text-sm text-muted-foreground">{book.description}</p>
              )}
              {book.status === "suggested" && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/meetings?book_id=${book.id}`} className={btn("primary", "sm")}>
                    Select this book next
                  </Link>
                  <RemoveFromBacklogButton
                    bookId={book.id}
                    bookTitle={book.title}
                    disabled={!memberId}
                  />
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Reviews</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            ) : (
              <ul className="space-y-5">
                {reviews.map((r) => {
                  const m = memberMap.get(r.member_id);
                  return (
                    <li key={r.id} className="flex gap-3">
                      {m && <Avatar name={m.name} color={m.color} size={36} />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{m?.name}</span>
                          {r.rating != null && <StarsDisplay value={r.rating} size={14} />}
                          {readerSet.has(r.member_id) ? (
                            <Badge tone="success">completed</Badge>
                          ) : (
                            r.dnf && <Badge tone="warning">DNF</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {relativeTime(r.updated_at)}
                          </span>
                        </div>
                        {r.body && (
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                            {r.body}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg font-semibold">Spoiler-safe discussion</h2>
              <Badge tone="secondary">@ {myPercent}%</Badge>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              You only see comments posted at or below your reading progress. Set your progress to
              reveal more — and to tag where your own comments belong.
            </p>
            <div className="mb-5">
              <CommentForm
                bookId={id}
                progressPercent={memberId ? myPercent : undefined}
                placeholder="Discuss up to where you are…"
                disabled={!memberId}
              />
            </div>
            <CommentList
              comments={bookComments}
              members={memberMap}
              showProgress
              viewerPercent={myPercent}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 text-lg font-semibold">Completed by</h2>
            {readerSet.size === 0 ? (
              <p className="text-sm text-muted-foreground">No one has marked this completed yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...memberMap.values()]
                  .filter((m) => readerSet.has(m.id))
                  .map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-0.5 pr-2 text-xs"
                    >
                      <Avatar name={m.name} color={m.color} size={20} />
                      {m.name.split(" ")[0]}
                    </span>
                  ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Your review</h2>
            <ReviewForm
              bookId={id}
              existing={myReview}
              disabled={!memberId}
              completed={completed}
            />
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold">Reading progress</h2>
            <div className="space-y-3">
              {[...memberMap.values()]
                .sort((a, b) => a.selection_order - b.selection_order)
                .map((m) => {
                  const pct = progressByMember.get(m.id) ?? 0;
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <Avatar name={m.name} color={m.color} size={24} />
                      <span className="w-20 shrink-0 truncate text-sm">{m.name.split(" ")[0]}</span>
                      <ProgressBar value={pct} color={m.color} />
                      <span className="w-9 text-right text-xs text-muted-foreground">{pct}%</span>
                    </div>
                  );
                })}
            </div>
            <div className="mt-4 border-t border-border pt-4">
              {memberId ? (
                <ProgressControl
                  bookId={id}
                  progress={myProgress}
                  defaultPages={book.page_count}
                  defaultMinutes={book.audiobook_minutes}
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select who you are first to update your reading progress.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
