import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getBook,
  getBooksWithExtras,
  getMembers,
  getNextMeeting,
  getProgressForBook,
  membersById,
} from "@/lib/queries";
import { getCurrentMember } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/book-cover";
import { MemberPicker } from "@/components/member-picker";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, PageHeader, ProgressBar } from "@/components/ui";
import { ProgressControl } from "@/components/progress-control";
import { btn, countdown, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return <SetupNotice reason="env" />;
  }

  const members = await getMembers();
  if (members.length === 0) {
    return <SetupNotice reason="schema" />;
  }

  const [me, nextMeeting, allBooks] = await Promise.all([
    getCurrentMember(),
    getNextMeeting(),
    getBooksWithExtras(null),
  ]);

  const readCount = allBooks.filter((b) => b.status === "read").length;
  const backlogCount = allBooks.filter((b) => b.status === "suggested").length;
  const rated = allBooks.filter((b) => b.avg_rating != null);
  const groupAvg =
    rated.length > 0 ? rated.reduce((s, b) => s + (b.avg_rating ?? 0), 0) / rated.length : null;

  const currentBook = nextMeeting?.book_id ? await getBook(nextMeeting.book_id) : null;
  const progress = currentBook ? await getProgressForBook(currentBook.id) : [];
  const memberMap = await membersById();
  const progressByMember = new Map(progress.map((p) => [p.member_id, p.percent]));

  return (
    <div className="space-y-8">
      <PageHeader
        title={me ? `Welcome back, ${me.name.split(" ")[0]}` : "2 Books 2 Furious"}
        subtitle="Sci-fi, fantasy, and the occasional thriller. Read fast, rate hard."
      />

      {!me && (
        <MemberPicker members={members} redirectTo="/" />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Books read" value={readCount} href="/leaderboard" />
        <Stat label="In the backlog" value={backlogCount} href="/backlog" />
        <Stat
          label="Group avg rating"
          value={groupAvg != null ? `${groupAvg.toFixed(2)}★` : "—"}
          href="/leaderboard"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Next meeting</h2>
            <Link href="/meetings" className="text-sm text-primary hover:underline">
              All meetings →
            </Link>
          </div>

          {nextMeeting ? (
            <div className="flex flex-col gap-5 sm:flex-row">
              {currentBook && <BookCover url={currentBook.cover_url} title={currentBook.title} width={110} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{countdown(nextMeeting.meeting_date)}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(nextMeeting.meeting_date)}
                  </span>
                </div>
                {currentBook ? (
                  <>
                    <Link
                      href={`/books/${currentBook.id}`}
                      className="mt-2 block text-xl font-bold hover:text-primary"
                    >
                      {currentBook.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">{currentBook.author}</p>
                  </>
                ) : (
                  <p className="mt-2 text-base font-medium text-muted-foreground">
                    Book not chosen yet
                  </p>
                )}
                {nextMeeting.location && (
                  <p className="mt-2 text-sm text-muted-foreground">📍 {nextMeeting.location}</p>
                )}
                <Link
                  href={`/meetings/${nextMeeting.id}`}
                  className={`${btn("outline", "sm")} mt-4`}
                >
                  Open meeting
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">No meeting scheduled yet.</p>
              <Link href="/meetings" className={btn("primary", "sm")}>
                Schedule one
              </Link>
            </div>
          )}

          {currentBook && (
            <div className="mt-6 border-t border-border pt-5">
              <h3 className="mb-3 text-sm font-semibold">Who&apos;s where</h3>
              <div className="space-y-3">
                {members.map((m) => {
                  const pct = progressByMember.get(m.id) ?? 0;
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <Avatar name={m.name} color={m.color} size={26} />
                      <span className="w-24 shrink-0 truncate text-sm">{m.name.split(" ")[0]}</span>
                      <ProgressBar value={pct} color={m.color} />
                      <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                        {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
              {me && (
                <div className="mt-4">
                  <ProgressControl
                    bookId={currentBook.id}
                    progress={progress.find((p) => p.member_id === me.id) ?? null}
                    defaultPages={currentBook.page_count}
                    defaultMinutes={currentBook.audiobook_minutes}
                  />
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Top of the backlog</h2>
          {backlogCount === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing suggested yet.{" "}
              <Link href="/backlog" className="text-primary hover:underline">
                Add a book
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3">
              {allBooks
                .filter((b) => b.status === "suggested")
                .sort((a, b) => b.votes - a.votes)
                .slice(0, 5)
                .map((b) => (
                  <li key={b.id} className="flex items-center gap-3">
                    <BookCover url={b.cover_url} title={b.title} width={32} />
                    <Link href={`/books/${b.id}`} className="min-w-0 flex-1 hover:text-primary">
                      <span className="block truncate text-sm font-medium">{b.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {b.suggester ? `via ${b.suggester.name.split(" ")[0]}` : ""}
                      </span>
                    </Link>
                    <Badge tone="secondary">▲ {b.votes}</Badge>
                  </li>
                ))}
            </ul>
          )}
          <Link href="/backlog" className={`${btn("outline", "sm")} mt-4 w-full`}>
            Browse backlog
          </Link>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string | number; href: string }) {
  return (
    <Link href={href}>
      <Card className="p-5 transition hover:border-primary/50">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
      </Card>
    </Link>
  );
}
