"use client";

import { upsertReview } from "@/app/actions";
import { StarInput } from "./star-rating";
import { btn, inputClass } from "@/lib/utils";
import type { Review } from "@/lib/types";

export function ReviewForm({
  bookId,
  existing,
  disabled,
}: {
  bookId: string;
  existing: Review | null;
  disabled?: boolean;
}) {
  return (
    <form action={upsertReview} className="space-y-4">
      <input type="hidden" name="book_id" value={bookId} />
      <div>
        <label className="mb-1.5 block text-sm font-medium">Rating</label>
        <StarInput defaultValue={existing?.rating ?? 0} />
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="finished"
            defaultChecked={existing?.finished ?? false}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Finished it
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="dnf"
            defaultChecked={existing?.dnf ?? false}
            className="h-4 w-4 accent-[var(--primary)]"
          />
          Did not finish
        </label>
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

      <button type="submit" className={btn("primary")} disabled={disabled}>
        {existing ? "Update review" : "Save review"}
      </button>
      {disabled && <p className="text-xs text-warning">Pick who you are first.</p>}
    </form>
  );
}
