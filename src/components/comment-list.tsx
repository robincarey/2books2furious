import { Avatar } from "./avatar";
import { Badge } from "./ui";
import type { Comment, Member } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

export function CommentList({
  comments,
  members,
  showProgress,
}: {
  comments: Comment[];
  members: Map<string, Member>;
  showProgress?: boolean;
}) {
  if (comments.length === 0) {
    return <p className="text-sm text-muted-foreground">No comments yet. Start the discussion.</p>;
  }
  return (
    <ul className="space-y-4">
      {comments.map((c) => {
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
  );
}
