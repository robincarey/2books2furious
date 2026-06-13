"use client";

import { useState } from "react";
import { upsertReview } from "@/app/actions";
import { StarInput, StarsDisplay } from "./star-rating";
import { btn, cn, inputClass } from "@/lib/utils";
import type { Review } from "@/lib/types";

export function ReviewForm({
  bookId,
  existing,
  disabled,
  completed,
}: {
  bookId: string;
  existing: Review | null;
  disabled?: boolean;
  /** Initial completed state from member_book_reads. */
  completed: boolean;
}) {
  const hasReview = Boolean(existing?.rating || existing?.body);
  const [expanded, setExpanded] = useState(!hasReview);
  const [isCompleted, setIsCompleted] = useState(completed);
  const [isDnf, setIsDnf] = useState(Boolean(existing?.dnf && !completed));

  if (disabled) {
    return <p className="text-sm text-warning">Pick who you are first.</p>;
  }

  if (completed && hasReview && !expanded) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          {existing?.rating ? (
            <StarsDisplay value={existing.rating} size={16} />
          ) : (
            <span className="text-muted-foreground">No rating yet</span>
          )}
          {existing?.body && (
            <span className="truncate text-muted-foreground">— {existing.body}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="shrink-0 text-sm text-primary hover:underline"
        >
          Edit review
        </button>
      </div>
    );
  }

  const ratingLocked = !isCompleted;

  return (
    <form
      action={async (fd) => {
        await upsertReview(fd);
        setExpanded(false);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="book_id" value={bookId} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="completed"
            value="on"
            checked={isCompleted}
            onChange={(e) => {
              setIsCompleted(e.target.checked);
              if (e.target.checked) setIsDnf(false);
            }}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Completed
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="dnf"
            value="on"
            checked={isDnf}
            onChange={(e) => {
              setIsDnf(e.target.checked);
              if (e.target.checked) setIsCompleted(false);
            }}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          DNF
        </label>
      </div>

      {ratingLocked && (
        <p className="text-xs text-muted-foreground">
          Check Completed to rate and review. DNF saves your status without a rating.
        </p>
      )}

      <div className={cn(ratingLocked && "pointer-events-none opacity-40")}>
        <label className="mb-1.5 block text-sm font-medium">Rating</label>
        <StarInput defaultValue={isCompleted ? (existing?.rating ?? 0) : 0} key={isCompleted ? "on" : "off"} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Thoughts <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          name="body"
          rows={4}
          defaultValue={existing?.body ?? ""}
          disabled={ratingLocked}
          className={cn(inputClass, ratingLocked && "opacity-40")}
          placeholder="What did you think?"
        />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className={btn("primary")}>
          {hasReview || isCompleted || isDnf ? "Save" : "Save status"}
        </button>
        {hasReview && (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className={btn("ghost", "sm")}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
