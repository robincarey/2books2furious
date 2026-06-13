import Link from "next/link";
import { createMeeting } from "@/app/actions";
import { BookCover } from "@/components/book-cover";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getBooksWithExtras, getMeetings, getMembers, membersById } from "@/lib/queries";
import { getCurrentMemberId } from "@/lib/session";
import { btn, formatDate, inputClass } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ book_id?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const members = await getMembers();
  if (members.length === 0) return <SetupNotice reason="schema" />;

  const { book_id: prefillBookId } = await searchParams;
  const memberId = await getCurrentMemberId();
  const [meetings, suggestedBooks, allBooks, memberMap] = await Promise.all([
    getMeetings(),
    getBooksWithExtras(null, "suggested"),
    getBooksWithExtras(null),
    membersById(),
  ]);

  const bookMap = new Map(allBooks.map((b) => [b.id, b]));
  const now = Date.now();
  const upcoming = meetings.filter((m) => new Date(m.meeting_date).getTime() >= now);
  const past = meetings
    .filter((m) => new Date(m.meeting_date).getTime() < now)
    .reverse();
  const scheduledBookIds = new Set(
    upcoming.map((m) => m.book_id).filter((id): id is string => Boolean(id)),
  );
  const selectable = suggestedBooks.filter((b) => !scheduledBookIds.has(b.id));
  const defaultBookId =
    prefillBookId && selectable.some((b) => b.id === prefillBookId) ? prefillBookId : "";

  return (
    <div className="space-y-8">
      <PageHeader title="Meetings" subtitle="Schedule a book and a date." />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,360px)]">
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Upcoming
            </h2>
            {upcoming.length === 0 ? (
              <EmptyState title="No upcoming meetings" description="Schedule one on the right." />
            ) : (
              <div className="space-y-3">
                {upcoming.map((m) => (
                  <MeetingRow
                    key={m.id}
                    id={m.id}
                    date={m.meeting_date}
                    book={m.book_id ? bookMap.get(m.book_id) : undefined}
                    picker={m.picked_by ? memberMap.get(m.picked_by)?.name : undefined}
                    upcoming
                  />
                ))}
              </div>
            )}
          </section>

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Past
              </h2>
              <div className="space-y-3">
                {past.map((m) => (
                  <MeetingRow
                    key={m.id}
                    id={m.id}
                    date={m.meeting_date}
                    book={m.book_id ? bookMap.get(m.book_id) : undefined}
                    picker={m.picked_by ? memberMap.get(m.picked_by)?.name : undefined}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Schedule a meeting</h2>
            <form action={createMeeting} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Book</label>
                <select name="book_id" className={inputClass} defaultValue={defaultBookId}>
                  <option value="">— pick a book (optional) —</option>
                  {selectable.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Date &amp; time
                </label>
                <input name="meeting_date" type="datetime-local" required className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  Picked by
                </label>
                <select name="picked_by" className={inputClass} defaultValue={memberId ?? ""}>
                  <option value="">— who chose it —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
                <textarea name="notes" rows={2} className={inputClass} />
              </div>
              <button type="submit" className={btn("primary")} disabled={!memberId}>
                Create meeting
              </button>
              {!memberId && (
                <p className="text-xs text-warning">Pick who you are first.</p>
              )}
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MeetingRow({
  id,
  date,
  book,
  picker,
  upcoming,
}: {
  id: string;
  date: string;
  book?: { title: string; author: string | null; cover_url: string | null };
  picker?: string;
  upcoming?: boolean;
}) {
  return (
    <Link href={`/meetings/${id}`}>
      <Card className="flex items-center gap-4 p-4 transition hover:border-primary/50">
        <BookCover url={book?.cover_url ?? null} title={book?.title ?? "TBD"} width={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{formatDate(date)}</span>
            {upcoming && <Badge tone="primary">upcoming</Badge>}
          </div>
          <p className="truncate font-semibold">{book?.title ?? "Book TBD"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {book?.author}
            {picker ? ` · picked by ${picker.split(" ")[0]}` : ""}
          </p>
        </div>
      </Card>
    </Link>
  );
}
