"use client";

import { useState } from "react";
import { updateMeeting } from "@/app/actions";
import { btn, formatDateInput, inputClass } from "@/lib/utils";
import type { BookWithExtras, Member } from "@/lib/types";

export function MeetingEditForm({
  meetingId,
  meetingDate,
  bookId,
  pickedBy,
  notes,
  isPast,
  eligibleBooks,
  members,
  disabled,
}: {
  meetingId: string;
  meetingDate: string;
  bookId: string | null;
  pickedBy: string | null;
  notes: string | null;
  isPast: boolean;
  eligibleBooks: BookWithExtras[];
  members: Member[];
  disabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (disabled) {
    return <p className="text-xs text-warning">Pick who you are first.</p>;
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className={btn("outline", "sm")}>
        Edit meeting
      </button>
    );
  }

  return (
    <form
      action={async (fd) => {
        await updateMeeting(fd);
        setEditing(false);
      }}
      className="space-y-3"
    >
      <input type="hidden" name="meeting_id" value={meetingId} />

      {!isPast && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Book</label>
            <select name="book_id" className={inputClass} defaultValue={bookId ?? ""}>
              <option value="">— pick a book (optional) —</option>
              {eligibleBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                  {b.status !== "suggested" ? ` (${b.status})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Date &amp; time
            </label>
            <input
              name="meeting_date"
              type="datetime-local"
              required
              className={inputClass}
              defaultValue={formatDateInput(meetingDate)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Picked by
            </label>
            <select name="picked_by" className={inputClass} defaultValue={pickedBy ?? ""}>
              <option value="">— who chose it —</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes</label>
        <textarea name="notes" rows={3} className={inputClass} defaultValue={notes ?? ""} />
        {isPast && (
          <p className="mt-1 text-xs text-muted-foreground">
            Past meetings can only have notes edited.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className={btn("primary", "sm")}>
          Save
        </button>
        <button type="button" onClick={() => setEditing(false)} className={btn("ghost", "sm")}>
          Cancel
        </button>
      </div>
    </form>
  );
}
