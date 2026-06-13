import { setRsvp } from "@/app/actions";
import type { RsvpStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const OPTIONS: { value: RsvpStatus; label: string }[] = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "out", label: "Can't" },
];

export function RsvpControl({
  meetingId,
  current,
  disabled,
}: {
  meetingId: string;
  current: RsvpStatus | null;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      {OPTIONS.map((o) => (
        <form key={o.value} action={setRsvp}>
          <input type="hidden" name="meeting_id" value={meetingId} />
          <input type="hidden" name="status" value={o.value} />
          <button
            type="submit"
            disabled={disabled}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50",
              current === o.value
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        </form>
      ))}
    </div>
  );
}
