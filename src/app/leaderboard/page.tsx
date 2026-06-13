import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { BookCover } from "@/components/book-cover";
import { StarsDisplay } from "@/components/star-rating";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getBookLeaderboard, getMemberLeaderboard, getMembers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const members = await getMembers();
  if (members.length === 0) return <SetupNotice reason="schema" />;

  const [books, memberStats] = await Promise.all([
    getBookLeaderboard(),
    getMemberLeaderboard(),
  ]);

  const mostGenerous = [...memberStats]
    .filter((m) => m.avg_given != null)
    .sort((a, b) => (b.avg_given ?? 0) - (a.avg_given ?? 0))[0];
  const bestPicker = [...memberStats]
    .filter((m) => m.avg_pick_rating != null)
    .sort((a, b) => (b.avg_pick_rating ?? 0) - (a.avg_pick_rating ?? 0))[0];

  return (
    <div className="space-y-8">
      <PageHeader title="Leaderboard" subtitle="Average ratings across everything we've read." />

      {books.length === 0 ? (
        <EmptyState
          title="Nothing rated yet"
          description="Finish a book and drop some stars to populate the leaderboard."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {bestPicker && (
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Best picker</p>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar name={bestPicker.member.name} color={bestPicker.member.color} size={36} />
                  <div>
                    <p className="font-semibold">{bestPicker.member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      picks avg {bestPicker.avg_pick_rating?.toFixed(2)}★
                    </p>
                  </div>
                </div>
              </Card>
            )}
            {mostGenerous && (
              <Card className="p-5">
                <p className="text-sm text-muted-foreground">Most generous rater</p>
                <div className="mt-2 flex items-center gap-3">
                  <Avatar
                    name={mostGenerous.member.name}
                    color={mostGenerous.member.color}
                    size={36}
                  />
                  <div>
                    <p className="font-semibold">{mostGenerous.member.name}</p>
                    <p className="text-xs text-muted-foreground">
                      gives avg {mostGenerous.avg_given?.toFixed(2)}★
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">Books by average rating</h2>
            </div>
            <ul className="divide-y divide-border">
              {books.map((row, i) => (
                <li key={row.book.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-6 text-center text-lg font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <BookCover url={row.book.cover_url} title={row.book.title} width={40} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/books/${row.book.id}`} className="font-medium hover:text-primary">
                      {row.book.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.book.author}
                      {row.picked_by ? ` · picked by ${row.picked_by.name.split(" ")[0]}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StarsDisplay value={row.avg_rating} size={14} />
                    <span className="w-10 text-right font-semibold tabular-nums">
                      {row.avg_rating.toFixed(2)}
                    </span>
                    <Badge>{row.review_count}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">Members</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Member</th>
                    <th className="px-3 py-3 text-center font-medium">Reviews</th>
                    <th className="px-3 py-3 text-center font-medium">Finished</th>
                    <th className="px-3 py-3 text-center font-medium">Avg given</th>
                    <th className="px-3 py-3 text-center font-medium">Picks</th>
                    <th className="px-5 py-3 text-center font-medium">Pick avg</th>
                  </tr>
                </thead>
                <tbody>
                  {memberStats.map((m) => (
                    <tr key={m.member.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={m.member.name} color={m.member.color} size={26} />
                          <span className="font-medium">{m.member.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">{m.reviews_written}</td>
                      <td className="px-3 py-3 text-center tabular-nums">{m.books_finished}</td>
                      <td className="px-3 py-3 text-center tabular-nums">
                        {m.avg_given != null ? `${m.avg_given.toFixed(2)}★` : "—"}
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums">{m.picks}</td>
                      <td className="px-5 py-3 text-center tabular-nums">
                        {m.avg_pick_rating != null ? `${m.avg_pick_rating.toFixed(2)}★` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
