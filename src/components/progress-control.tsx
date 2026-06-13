"use client";

import { useState } from "react";
import { setProgress } from "@/app/actions";
import { btn } from "@/lib/utils";

export function ProgressControl({ bookId, initial }: { bookId: string; initial: number }) {
  const [value, setValue] = useState(initial);

  return (
    <form action={setProgress} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="book_id" value={bookId} />
      <span className="text-sm font-medium">Your progress</span>
      <input
        type="range"
        name="percent"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-2 flex-1 min-w-[160px] cursor-pointer accent-[var(--primary)]"
      />
      <span className="w-10 text-right text-sm tabular-nums">{value}%</span>
      <button type="submit" className={btn("primary", "sm")}>
        Save
      </button>
    </form>
  );
}
