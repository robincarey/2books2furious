import { toggleFeatureVote } from "@/app/actions";
import { Avatar } from "@/components/avatar";
import { FeatureRequestForm } from "@/components/feature-request-form";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getFeatureRequests, getMembers } from "@/lib/queries";
import { getCurrentMemberId } from "@/lib/session";
import type { FeatureStatus } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<FeatureStatus, "muted" | "primary" | "success" | "warning"> = {
  open: "primary",
  planned: "warning",
  done: "success",
  declined: "muted",
};

export default async function SuggestionsPage() {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const members = await getMembers();
  if (members.length === 0) return <SetupNotice reason="schema" />;

  const memberId = await getCurrentMemberId();
  const requests = await getFeatureRequests(memberId);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Feature requests"
        subtitle="Got an idea for the site? Suggest it and upvote your favorites."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,360px)]">
        <div className="space-y-3">
          {requests.length === 0 ? (
            <EmptyState
              title="No suggestions yet"
              description="Be the first to suggest a feature for the club site."
            />
          ) : (
            requests.map((r) => (
              <Card key={r.id} className="flex gap-4 p-4">
                <form action={toggleFeatureVote} className="shrink-0">
                  <input type="hidden" name="request_id" value={r.id} />
                  <button
                    type="submit"
                    disabled={!memberId}
                    title={memberId ? "Toggle your vote" : "Pick who you are first"}
                    className={cn(
                      "flex h-16 w-14 flex-col items-center justify-center rounded-lg border transition disabled:opacity-50",
                      r.voted_by_me
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border bg-card hover:border-primary/50",
                    )}
                  >
                    <span className="text-lg leading-none">▲</span>
                    <span className="text-sm font-bold">{r.votes}</span>
                  </button>
                </form>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{r.title}</h3>
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  </div>
                  {r.body && (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {r.body}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    {r.submitter && (
                      <span className="flex items-center gap-1.5">
                        <Avatar name={r.submitter.name} color={r.submitter.color} size={18} />
                        {r.submitter.name.split(" ")[0]}
                      </span>
                    )}
                    <span>· {relativeTime(r.created_at)}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div>
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold">Suggest a feature</h2>
            <FeatureRequestForm disabled={!memberId} />
          </Card>
        </div>
      </div>
    </div>
  );
}
