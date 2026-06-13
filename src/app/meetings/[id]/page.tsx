import Link from "next/link";
import { notFound } from "next/navigation";
import { markMeetingRead } from "@/app/actions";
import { BookCover } from "@/components/book-cover";
import { CommentForm } from "@/components/comment-form";
import { CommentList } from "@/components/comment-list";
import { RsvpControl } from "@/components/rsvp-control";
import { Badge, Card, PageHeader } from "@/components/ui";
import {
  getBook,
  getCommentsForMeeting,
  getMeeting,
  getRsvps,
  membersById,
} from "@/lib/queries";
import { getCurrentMemberId } from "@/lib/session";
import type { RsvpStatus } from "@/lib/types";
import { btn, countdown, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MeetingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const meeting = await getMeeting(id);
  if (!meeting) notFound();

  const memberId = await getCurrentMemberId();
  const [book, comments, rsvps, memberMap] = await Promise.all([
    meeting.book_id ? getBook(meeting.book_id) : Promise.resolve(null),
    getCommentsForMeeting(id),
    getRsvps(id),
    membersById(),
  ]);

  const picker = meeting.picked_by ? memberMap.get(meeting.picked_by) : null;
  const myRsvp = (rsvps.find((r) => r.member_id === memberId)?.status ?? null) as RsvpStatus | null;
  const isPast = new Date(meeting.meeting_date).getTime() < Date.now();
  const rsvpGroups: Record<RsvpStatus, string[]> = { going: [], maybe: [], out: [] };
  for (const r of rsvps) {
    const name = memberMap.get(r.member_id)?.name.split(" ")[0];
    if (name) rsvpGroups[r.status].push(name);
  }

  return (
    <div className="space-y-6">
      <Link href="/meetings" className="text-sm text-muted-foreground hover:text-foreground">
        ← All meetings
      </Link>

      <PageHeader
        title={book?.title ?? "Book TBD"}
        subtitle={`${formatDateTime(meeting.meeting_date)}${
          meeting.location ? ` · ${meeting.location}` : ""
        }`}
        action={<Badge tone={isPast ? "muted" : "primary"}>{isPast ? "past" : countdown(meeting.meeting_date)}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {book && (
            <Card className="flex gap-4 p-5">
              <BookCover url={book.cover_url} title={book.title} width={88} />
              <div className="min-w-0">
                <Link href={`/books/${book.id}`} className="font-semibold hover:text-primary">
                  {book.title}
                </Link>
                <p className="text-sm text-muted-foreground">{book.author}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {book.page_count && <Badge>{book.page_count}p</Badge>}
                  {book.genres.slice(0, 3).map((g) => (
                    <Badge key={g} tone="secondary">
                      {g}
                    </Badge>
                  ))}
                </div>
                {picker && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Picked by {picker.name}
                  </p>
                )}
                <Link href={`/books/${book.id}`} className={`${btn("outline", "sm")} mt-3`}>
                  Review &amp; discuss the book →
                </Link>
              </div>
            </Card>
          )}

          {meeting.notes && (
            <Card className="p-5">
              <h3 className="mb-2 text-sm font-semibold">Notes</h3>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{meeting.notes}</p>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="mb-4 text-lg font-semibold">Discussion</h3>
            <div className="mb-5">
              <CommentForm meetingId={id} disabled={!memberId} />
            </div>
            <CommentList comments={comments} members={memberMap} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-3 text-sm font-semibold">Your RSVP</h3>
            <RsvpControl meetingId={id} current={myRsvp} disabled={!memberId} />
            <div className="mt-4 space-y-2 text-sm">
              <RsvpLine label="Going" names={rsvpGroups.going} tone="success" />
              <RsvpLine label="Maybe" names={rsvpGroups.maybe} tone="warning" />
              <RsvpLine label="Can't" names={rsvpGroups.out} tone="muted" />
            </div>
          </Card>

          {book && isPast && book.status !== "read" && (
            <Card className="p-5">
              <h3 className="mb-2 text-sm font-semibold">Wrap up</h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Mark this book as read so it shows on the leaderboard and analytics.
              </p>
              <form action={markMeetingRead}>
                <input type="hidden" name="book_id" value={book.id} />
                <button type="submit" className={btn("secondary", "sm")} disabled={!memberId}>
                  Mark “{book.title}” as read
                </button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function RsvpLine({
  label,
  names,
  tone,
}: {
  label: string;
  names: string[];
  tone: "success" | "warning" | "muted";
}) {
  return (
    <div className="flex items-center gap-2">
      <Badge tone={tone}>{label}</Badge>
      <span className="text-muted-foreground">{names.length ? names.join(", ") : "—"}</span>
    </div>
  );
}
