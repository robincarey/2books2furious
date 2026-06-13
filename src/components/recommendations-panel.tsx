"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { refreshRecommendations } from "@/app/actions";
import type { CachedRecommendations } from "@/lib/queries";
import type { Member } from "@/lib/types";
import { inputClass, relativeTime } from "@/lib/utils";
import { Card } from "./ui";

function RefreshButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium transition hover:border-primary/50 disabled:opacity-50"
    >
      {pending ? "Refreshing…" : "Refresh recommendations"}
    </button>
  );
}

export function RecommendationsPanel({
  members,
  configured,
  cache,
}: {
  members: Member[];
  configured: boolean;
  cache: Record<string, CachedRecommendations>;
}) {
  const [scope, setScope] = useState("group");
  const current = cache[scope];
  const recs = current?.recommendations ?? [];

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
          <RefreshButton />
        </form>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Top {Math.max(recs.length, 5)} picks</p>
        {current && (
          <p className="text-xs text-muted-foreground">
            Updated {relativeTime(current.generated_at)}
          </p>
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
            <Card key={i} className="p-5">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-primary">#{i + 1}</span>
                <p className="font-semibold">{r.title}</p>
              </div>
              <p className="text-sm text-muted-foreground">{r.author}</p>
              <p className="mt-2 text-sm text-foreground/90">{r.why}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
