import { Avatar } from "@/components/avatar";
import { NextPickSpinner } from "@/components/next-pick-spinner";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, PageHeader } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getBooksWithExtras, getRotation } from "@/lib/queries";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RotationPage() {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const { members, pickCounts, nextUp, lastPicker } = await getRotation();
  if (members.length === 0) return <SetupNotice reason="schema" />;

  const candidates = (await getBooksWithExtras(null, "suggested")).map((b) => ({
    id: b.id,
    title: b.title,
    votes: b.votes,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Selection rotation"
        subtitle="Whose turn it is to choose, and how to break ties."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Up next
          </h2>
          {nextUp ? (
            <div className="mt-3 flex items-center gap-4">
              <Avatar name={nextUp.name} color={nextUp.color} size={56} />
              <div>
                <p className="text-2xl font-bold">{nextUp.name}</p>
                <p className="text-sm text-muted-foreground">
                  {lastPicker ? `follows ${lastPicker.name.split(" ")[0]}` : "kick us off"}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-muted-foreground">No members yet.</p>
          )}

          <div className="mt-6 space-y-2">
            {members.map((m) => {
              const count = pickCounts.get(m.id) ?? 0;
              const isNext = nextUp?.id === m.id;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2",
                    isNext ? "border-primary bg-primary/10" : "border-border",
                  )}
                >
                  <span className="w-5 text-center text-sm text-muted-foreground">
                    {m.selection_order}
                  </span>
                  <Avatar name={m.name} color={m.color} size={30} />
                  <span className="flex-1 font-medium">{m.name}</span>
                  {isNext && <Badge tone="primary">next</Badge>}
                  <Badge>
                    {count} pick{count === 1 ? "" : "s"}
                  </Badge>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Next up = fewest picks so far, breaking ties by rotation order after the last picker.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Can&apos;t decide?
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Spin the wheel to pull a random book from the backlog.
          </p>
          <NextPickSpinner candidates={candidates} />
        </Card>
      </div>
    </div>
  );
}
