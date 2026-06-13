"use client";

import { useRef } from "react";
import { addFeatureRequest } from "@/app/actions";
import { btn, inputClass } from "@/lib/utils";

export function FeatureRequestForm({ disabled }: { disabled?: boolean }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addFeatureRequest(fd);
        ref.current?.reset();
      }}
      className="space-y-3"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Idea *</label>
        <input
          name="title"
          required
          disabled={disabled}
          className={inputClass}
          placeholder="e.g. Add a reading-pace nudge before each meeting"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Details (optional)
        </label>
        <textarea name="body" rows={3} disabled={disabled} className={inputClass} />
      </div>
      <button type="submit" className={btn("primary")} disabled={disabled}>
        Submit idea
      </button>
      {disabled && <p className="text-xs text-warning">Pick who you are first.</p>}
    </form>
  );
}
