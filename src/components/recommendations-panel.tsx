"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { dismissRecommendation, refreshRecommendations, undismissRecommendation } from "@/app/actions";
import type { CachedRecommendations, DismissedRecommendation } from "@/lib/queries";
import type { Member } from "@/lib/types";
import { btn, inputClass, relativeTime } from "@/lib/utils";
import { Avatar } from "./avatar";
import { Card } from "./ui";

interface Rec {
  title: string;
  author: string;
  why: string;
  hardcoverId?: string | null;
}

function PendingButton({ idle, busy, variant = "outline", size = "md" }: { idle: string; busy: string; variant?: "primary" | "outline" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={btn(variant, size)}>
      {pending ? busy : idle}
    </button>
  );
}

function RecCard({ rec, rank, scope }: { rec: Rec; rank: number; scope: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold text-primary">#{rank}</span>
        <p className="font-semibold">{rec.title}</p>
      </div>
      <p className="text-sm text-muted-foreground">{rec.author}</p>
      <p className="mt-2 flex-1 text-sm text-foreground/90">{rec.why}</p>

      {open ? (
        <form action={dismissRecommendation} className="mt-3 space-y-2 border-t border-border pt-3">
          <input type="hidden" name="title" value={rec.title} />
          <input type="hidden" name="hardcover_id" value={rec.hardcoverId ?? ""} />
          <input type="hidden" name="scope" value={scope} />
          <input
            name="reason"
            className={inputClass}
            placeholder="Why dismiss? (e.g. already read, not our thing)"
          />
          <div className="flex gap-2">
            <PendingButton idle="Dismiss" busy="Dismissing…" variant="danger" size="sm" />
            <button type="button" onClick={() => setOpen(false)} className={btn("ghost", "sm")}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 self-start text-xs text-muted-foreground hover:text-danger"
        >
          Dismiss
        </button>
      )}
    </Card>
  );
}

export function RecommendationsPanel({
  members,
  configured,
  cache,
  dismissed,
}: {
  members: Member[];
  configured: boolean;
  cache: Record<string, CachedRecommendations>;
  dismissed: DismissedRecommendation[];
}) {
  const [scope, setScope] = useState("group");
  const current = cache[scope];
  const recs = (current?.recommendations ?? []) as Rec[];

  if (!configured) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Recommendations are optional. To turn them on, set a{" "}
          <code className="rounded bg-muted px-1">HARDCOVER_API_KEY</code> environment variable
          (locally in <code className="rounded bg-muted px-1">.env.local</code> and in Vercel). We
          match the club&apos;s top-rated reads to similar books on Hardcover.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Recommend for
          </label>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className={inputClass}>
            <option value="group">The whole club</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}&apos;s taste
              </option>
            ))}
          </select>
        </div>
        <form action={refreshRecommendations}>
          <input type="hidden" name="scope" value={scope} />
          <PendingButton idle="Refresh recommendations" busy="Refreshing…" />
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Top 5 picks</p>
        {current && (
          <p className="text-xs text-muted-foreground">Updated {relativeTime(current.generated_at)}</p>
        )}
      </div>

      {recs.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">
            {current
              ? "No matches yet — add a few ratings, then refresh."
              : "No recommendations cached for this selection yet. Hit \u201cRefresh recommendations\u201d to generate them."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {recs.map((r, i) => (
            <RecCard key={`${r.title}-${i}`} rec={r} rank={i + 1} scope={scope} />
          ))}
        </div>
      )}

      {dismissed.length > 0 && (
        <Card className="p-5">
          <p className="mb-3 text-sm font-semibold">Dismissed ({dismissed.length})</p>
          <ul className="space-y-3">
            {dismissed.map((d) => (
              <li key={d.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{d.title}</p>
                  {d.reason && <p className="text-xs text-muted-foreground">“{d.reason}”</p>}
                  {d.dismissed_by_member && (
                    <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Avatar name={d.dismissed_by_member.name} color={d.dismissed_by_member.color} size={16} />
                      {d.dismissed_by_member.name.split(" ")[0]} · {relativeTime(d.created_at)}
                    </span>
                  )}
                </div>
                <form action={undismissRecommendation}>
                  <input type="hidden" name="id" value={d.id} />
                  <button type="submit" className="text-xs text-primary hover:underline">
                    Undo
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
