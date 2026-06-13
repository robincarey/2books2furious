"use client";

import { useFormStatus } from "react-dom";
import { removeBookFromBacklog } from "@/app/actions";
import { btn } from "@/lib/utils";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${btn("ghost", "sm")} text-muted-foreground hover:text-danger`}
    >
      {pending ? "Removing…" : label}
    </button>
  );
}

export function RemoveFromBacklogButton({
  bookId,
  bookTitle,
  disabled,
  label = "Remove from backlog",
}: {
  bookId: string;
  bookTitle: string;
  disabled?: boolean;
  label?: string;
}) {
  if (disabled) {
    return (
      <button
        type="button"
        disabled
        title="Pick who you are first"
        className={`${btn("ghost", "sm")} text-muted-foreground`}
      >
        {label}
      </button>
    );
  }

  return (
    <form
      action={removeBookFromBacklog}
      onSubmit={(e) => {
        if (
          !confirm(
            `Remove "${bookTitle}" from the backlog? This can't be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="book_id" value={bookId} />
      <SubmitButton label={label} />
    </form>
  );
}
