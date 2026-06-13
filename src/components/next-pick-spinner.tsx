"use client";

import { useState } from "react";
import Link from "next/link";
import { btn } from "@/lib/utils";

interface Candidate {
  id: string;
  title: string;
  votes: number;
}

export function NextPickSpinner({ candidates }: { candidates: Candidate[] }) {
  const [spinning, setSpinning] = useState(false);
  const [picked, setPicked] = useState<Candidate | null>(null);
  const [weighted, setWeighted] = useState(true);
  const [display, setDisplay] = useState<string>("");

  function pickOne(): Candidate {
    if (weighted) {
      const pool: Candidate[] = [];
      for (const c of candidates) {
        const weight = Math.max(1, c.votes + 1);
        for (let i = 0; i < weight; i++) pool.push(c);
      }
      return pool[Math.floor(Math.random() * pool.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function spin() {
    if (candidates.length === 0 || spinning) return;
    setSpinning(true);
    setPicked(null);
    let ticks = 0;
    const total = 18 + Math.floor(Math.random() * 8);
    const interval = setInterval(() => {
      setDisplay(candidates[Math.floor(Math.random() * candidates.length)].title);
      ticks++;
      if (ticks >= total) {
        clearInterval(interval);
        const result = pickOne();
        setDisplay(result.title);
        setPicked(result);
        setSpinning(false);
      }
    }, 80);
  }

  if (candidates.length === 0) {
    return <p className="text-sm text-muted-foreground">Add books to the backlog to spin.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex min-h-14 items-center justify-center rounded-lg border border-border bg-muted px-4 py-3 text-center font-semibold">
        {display || "Spin to pick the next book"}
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={weighted}
          onChange={(e) => setWeighted(e.target.checked)}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        Weight by upvotes
      </label>
      <div className="flex items-center gap-3">
        <button onClick={spin} disabled={spinning} className={btn("primary")}>
          {spinning ? "Spinning…" : "Spin the wheel"}
        </button>
        {picked && (
          <Link href={`/books/${picked.id}`} className={btn("outline")}>
            Open “{picked.title.slice(0, 24)}”
          </Link>
        )}
      </div>
    </div>
  );
}
