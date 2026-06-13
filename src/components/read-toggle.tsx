import { toggleMemberRead } from "@/app/actions";
import { cn } from "@/lib/utils";

export function ReadToggle({
  bookId,
  read,
  disabled,
  size = "md",
}: {
  bookId: string;
  read: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <form action={toggleMemberRead}>
      <input type="hidden" name="book_id" value={bookId} />
      <button
        type="submit"
        disabled={disabled}
        title={disabled ? "Pick who you are first" : read ? "Unmark" : "Mark as read"}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border font-medium transition disabled:opacity-50",
          size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
          read
            ? "border-success bg-success/15 text-success"
            : "border-border bg-card hover:border-primary/50",
        )}
      >
        {read ? "✓ You read this" : "Mark as read"}
      </button>
    </form>
  );
}
