import { Avatar } from "./avatar";
import { Badge } from "./ui";
import type { Comment, Member } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

function LockedComment({ percent }: { percent: number }) {
  return (
    <li className="flex gap-3" aria-hidden>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Comment unlocks at {percent}%</span>
        </div>
        <div className="mt-1.5 space-y-1.5 select-none blur-[5px]" aria-hidden>
          <div className="h-2.5 w-3/4 rounded bg-muted-foreground/30" />
          <div className="h-2.5 w-1/2 rounded bg-muted-foreground/20" />
        </div>
      </div>
    </li>
  );
}

export function CommentList({
  comments,
  members,
  showProgress,
  viewerPercent,
}: {
  comments: Comment[];
  members: Map<string, Member>;
  showProgress?: boolean;
  /** When set, comments above this percent render as locked placeholders. */
  viewerPercent?: number;
}) {
  const gated = viewerPercent != null;
  const lockedAhead = gated
    ? comments.filter((c) => (c.progress_percent ?? 0) > viewerPercent).length
    : 0;

  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">No comments yet. Start the discussion.</p>;
  }

  return (
    <div className="space-y-3">
      {gated && lockedAhead > 0 && (
        <p className="text-xs font-medium text-muted-foreground">
          🔒 {lockedAhead} comment{lockedAhead === 1 ? "" : "s"} unlock further in — keep reading to
          reveal {lockedAhead === 1 ? "it" : "them"}.
        </p>
      )}
      <ul className="space-y-4">
        {comments.map((c) => {
          const threshold = c.progress_percent ?? 0;
          if (gated && threshold > (viewerPercent as number)) {
            return <LockedComment key={c.id} percent={threshold} />;
          }
          const m = c.member_id ? members.get(c.member_id) : null;
          return (
            <li key={c.id} className="flex gap-3">
              {m ? (
                <Avatar name={m.name} color={m.color} size={32} />
              ) : (
                <span className="h-8 w-8 rounded-full bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{m?.name ?? "Unknown"}</span>
                  <span className="text-xs text-muted-foreground">{relativeTime(c.created_at)}</span>
                  {showProgress && c.progress_percent != null && (
                    <Badge tone="secondary">@ {c.progress_percent}%</Badge>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground/90">{c.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
