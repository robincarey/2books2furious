import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/book-cover";
import { ReadToggle } from "@/components/read-toggle";
import { ReviewForm } from "@/components/review-form";
import { StarsDisplay } from "@/components/star-rating";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getAllMemberReads,
  getAllReviews,
  getBooksWithExtras,
  getMembers,
} from "@/lib/queries";
import { getCurrentMemberId } from "@/lib/session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PreviousBooksPage() {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const members = await getMembers();
  if (members.length === 0) return <SetupNotice reason="schema" />;

  const memberId = await getCurrentMemberId();
  const [books, reviews, reads] = await Promise.all([
    getBooksWithExtras(null, "read"),
    getAllReviews(),
    getAllMemberReads(),
  ]);

  const readSet = new Set(reads.map((r) => `${r.member_id}|${r.book_id}`));
  const reviewByKey = new Map(reviews.map((r) => [`${r.member_id}|${r.book_id}`, r]));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Previous books"
        subtitle="Everything the club has read. Mark the ones you've personally read and drop a review."
      />

      {books.length === 0 ? (
        <EmptyState
          title="No finished books yet"
          description="Books show up here once a meeting is marked as read."
        />
      ) : (
        <div className="space-y-4">
          {books.map((b) => {
            const myReview = memberId ? reviewByKey.get(`${memberId}|${b.id}`) ?? null : null;
            const iRead = memberId ? readSet.has(`${memberId}|${b.id}`) : false;
            return (
              <Card key={b.id} className="p-5">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <BookCover url={b.cover_url} title={b.title} width={72} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link href={`/books/${b.id}`} className="font-semibold hover:text-primary">
                          {b.title}
                        </Link>
                        <p className="text-sm text-muted-foreground">{b.author}</p>
                      </div>
                      <ReadToggle bookId={b.id} read={iRead} disabled={!memberId} size="sm" />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {b.avg_rating != null && (
                        <span className="flex items-center gap-1">
                          <StarsDisplay value={b.avg_rating} size={13} />
                          <span className="text-xs font-medium">{b.avg_rating.toFixed(2)}</span>
                        </span>
                      )}
                      {b.page_count && <Badge>{b.page_count}p</Badge>}
                      {b.genres.slice(0, 3).map((g) => (
                        <Badge key={g} tone="secondary">
                          {g}
                        </Badge>
                      ))}
                    </div>

                    {/* Per-member read + review status */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {members.map((m) => {
                        const r = reviewByKey.get(`${m.id}|${b.id}`);
                        const read = readSet.has(`${m.id}|${b.id}`);
                        return (
                          <span
                            key={m.id}
                            title={`${m.name}: ${read ? "read" : "not read"}${
                              r?.rating ? `, ${r.rating}★` : ""
                            }`}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5",
                              read ? "border-current" : "border-transparent opacity-40",
                            )}
                            style={{ color: m.color }}
                          >
                            <Avatar name={m.name} color={m.color} size={20} />
                            {r?.rating != null && (
                              <span className="text-[11px] font-semibold">{r.rating}★</span>
                            )}
                          </span>
                        );
                      })}
                    </div>

                    {memberId && (
                      <details className="mt-3 group">
                        <summary className="cursor-pointer text-sm font-medium text-primary marker:content-['']">
                          {myReview ? "Edit your review" : "Write a review"} ↓
                        </summary>
                        <div className="mt-3 rounded-lg border border-border p-4">
                          <ReviewForm bookId={b.id} existing={myReview} completed={iRead} />
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
