"use client";

import { useState } from "react";
import { setProgress } from "@/app/actions";
import type { ProgressUnit, ReadingProgress } from "@/lib/types";
import { btn, cn, inputClass } from "@/lib/utils";

const UNITS: { value: ProgressUnit; label: string }[] = [
  { value: "percent", label: "%" },
  { value: "pages", label: "Pages" },
  { value: "minutes", label: "Minutes" },
];

export function ProgressControl({
  bookId,
  progress,
  defaultPages,
  defaultMinutes,
}: {
  bookId: string;
  progress: ReadingProgress | null;
  defaultPages?: number | null;
  defaultMinutes?: number | null;
}) {
  const [unit, setUnit] = useState<ProgressUnit>(progress?.unit ?? "percent");

  // Position by mode.
  const [percent, setPercent] = useState(progress?.percent ?? 0);
  const [pagePos, setPagePos] = useState(
    progress?.unit === "pages" ? progress?.position ?? 0 : 0,
  );
  const [minutePos, setMinutePos] = useState(
    progress?.unit === "minutes" ? progress?.position ?? 0 : 0,
  );

  // Remembered totals (per member per book), prefilled from the book's metadata.
  const [pageTotal, setPageTotal] = useState(
    (progress?.unit === "pages" ? progress?.total : null) ?? defaultPages ?? 0,
  );
  const [minuteTotal, setMinuteTotal] = useState(
    (progress?.unit === "minutes" ? progress?.total : null) ?? defaultMinutes ?? 0,
  );

  const derived =
    unit === "percent"
      ? percent
      : unit === "pages"
        ? pageTotal > 0
          ? Math.round((pagePos / pageTotal) * 100)
          : 0
        : minuteTotal > 0
          ? Math.round((minutePos / minuteTotal) * 100)
          : 0;
  const clampedDerived = Math.max(0, Math.min(100, derived));

  return (
    <form action={setProgress} className="space-y-3">
      <input type="hidden" name="book_id" value={bookId} />
      <input type="hidden" name="unit" value={unit} />

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">Your progress</span>
        <div className="inline-flex overflow-hidden rounded-md border border-border">
          {UNITS.map((u) => (
            <button
              key={u.value}
              type="button"
              onClick={() => setUnit(u.value)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition",
                unit === u.value ? "bg-primary text-white" : "hover:bg-muted",
              )}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {unit === "percent" && (
        <div className="flex items-center gap-3">
          <input
            type="range"
            name="position"
            min={0}
            max={100}
            step={1}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer accent-[var(--primary)]"
          />
          <span className="w-10 text-right text-sm tabular-nums">{percent}%</span>
        </div>
      )}

      {unit === "pages" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="number"
            name="position"
            min={0}
            value={pagePos || ""}
            onChange={(e) => setPagePos(Number(e.target.value))}
            placeholder="Page"
            className={cn(inputClass, "w-24")}
          />
          <span className="text-muted-foreground">of</span>
          <input
            type="number"
            name="total"
            min={0}
            value={pageTotal || ""}
            onChange={(e) => setPageTotal(Number(e.target.value))}
            placeholder="Total"
            className={cn(inputClass, "w-24")}
          />
          <span className="text-muted-foreground">pages → {clampedDerived}%</span>
        </div>
      )}

      {unit === "minutes" && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <input
            type="number"
            name="position"
            min={0}
            value={minutePos || ""}
            onChange={(e) => setMinutePos(Number(e.target.value))}
            placeholder="Min"
            className={cn(inputClass, "w-24")}
          />
          <span className="text-muted-foreground">of</span>
          <input
            type="number"
            name="total"
            min={0}
            value={minuteTotal || ""}
            onChange={(e) => setMinuteTotal(Number(e.target.value))}
            placeholder="Total"
            className={cn(inputClass, "w-24")}
          />
          <span className="text-muted-foreground">min → {clampedDerived}%</span>
        </div>
      )}

      <button type="submit" className={btn("primary", "sm")}>
        Save progress
      </button>
    </form>
  );
}
