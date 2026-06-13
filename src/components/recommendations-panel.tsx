"use client";

import { useState } from "react";
import type { Member } from "@/lib/types";
import { btn, inputClass } from "@/lib/utils";
import { Card } from "./ui";

interface Rec {
  title: string;
  author: string;
  why: string;
}

export function RecommendationsPanel({
  members,
  configured,
}: {
  members: Member[];
  configured: boolean;
}) {
  const [scope, setScope] = useState("group");
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setRecs(null);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope }),
      });
      const data = await res.json();
      if (data.error === "not_configured") {
        setError("AI isn't configured. Add OPENAI_API_KEY to enable recommendations.");
      } else if (!data.recommendations?.length) {
        setError("No recommendations came back. Try again once there are some reviews.");
      } else {
        setRecs(data.recommendations);
      }
    } catch {
      setError("Something went wrong reaching the AI service.");
    } finally {
      setLoading(false);
    }
  }

  if (!configured) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          AI recommendations are optional. To turn them on, set an{" "}
          <code className="rounded bg-muted px-1">OPENAI_API_KEY</code> environment variable
          (locally in <code className="rounded bg-muted px-1">.env.local</code> and in Vercel). The
          model reads the club&apos;s ratings and suggests what to read next.
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
        <button onClick={generate} disabled={loading} className={btn("primary")}>
          {loading ? "Thinking…" : "Get recommendations"}
        </button>
      </Card>

      {error && <p className="text-sm text-warning">{error}</p>}

      {recs && (
        <div className="grid gap-3 sm:grid-cols-2">
          {recs.map((r, i) => (
            <Card key={i} className="p-5">
              <p className="font-semibold">{r.title}</p>
              <p className="text-sm text-muted-foreground">{r.author}</p>
              <p className="mt-2 text-sm text-foreground/90">{r.why}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
