"use client";

import { upsertReview } from "@/app/actions";
import { StarInput } from "./star-rating";
import { btn, inputClass } from "@/lib/utils";
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
  /** Single source of truth: rating + text only unlock once completed. */
  completed: boolean;
}) {
  if (disabled) {
    return <p className="text-sm text-warning">Pick who you are first.</p>;
  }

  // Not completed: rating + review text are locked. DNF is a separate state
  // that does NOT unlock rating.
  if (!completed) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          ⭐ Mark this book <strong className="text-foreground">Completed</strong> (top of this
          column) to rate it and write a review. Ratings are only possible once you&apos;ve
          finished.
        </div>
        <form action={upsertReview} className="space-y-3">
          <input type="hidden" name="book_id" value={bookId} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="dnf"
              defaultChecked={existing?.dnf ?? false}
              className="h-4 w-4 accent-[var(--primary)]"
            />
            Mark as did-not-finish (DNF)
          </label>
          <button type="submit" className={btn("secondary", "sm")}>
            Save status
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={upsertReview} className="space-y-4">
      <input type="hidden" name="book_id" value={bookId} />
      <div>
        <label className="mb-1.5 block text-sm font-medium">Rating</label>
        <StarInput defaultValue={existing?.rating ?? 0} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">
          Thoughts <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          name="body"
          rows={4}
          defaultValue={existing?.body ?? ""}
          className={inputClass}
          placeholder="What did you think?"
        />
      </div>

      <button type="submit" className={btn("primary")}>
        {existing ? "Update review" : "Save review"}
      </button>
    </form>
  );
}
