"use client";

import { useRef } from "react";
import { addComment } from "@/app/actions";
import { btn, inputClass } from "@/lib/utils";

export function CommentForm({
  bookId,
  progressPercent,
  placeholder = "Add to the discussion…",
  disabled,
}: {
  bookId: string;
  progressPercent?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addComment(fd);
        ref.current?.reset();
      }}
      className="space-y-2"
    >
      <input type="hidden" name="book_id" value={bookId} />
      {progressPercent != null && (
        <input type="hidden" name="progress_percent" value={progressPercent} />
      )}
      <textarea
        name="body"
        rows={3}
        required
        disabled={disabled}
        placeholder={disabled ? "Pick who you are to comment" : placeholder}
        className={inputClass}
      />
      <div className="flex items-center justify-between">
        {progressPercent != null ? (
          <span className="text-xs text-muted-foreground">
            Posting at your current progress: {progressPercent}%
          </span>
        ) : (
          <span />
        )}
        <button type="submit" className={btn("primary", "sm")} disabled={disabled}>
          Post
        </button>
      </div>
    </form>
  );
}
