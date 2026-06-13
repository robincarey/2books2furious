"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { setMember } from "@/app/actions";
import type { Member } from "@/lib/types";
import { Avatar } from "./avatar";

export function MemberSwitcher({
  members,
  currentId,
}: {
  members: Member[];
  currentId: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const pathname = usePathname();
  const current = members.find((m) => m.id === currentId) ?? null;

  return (
    <form ref={formRef} action={setMember} className="flex items-center gap-2">
      <input type="hidden" name="redirect_to" value={pathname || "/"} />
      {current && <Avatar name={current.name} color={current.color} size={28} />}
      <div className="relative">
        <select
          name="member_id"
          defaultValue={currentId ?? ""}
          onChange={() => formRef.current?.requestSubmit()}
          className="h-9 cursor-pointer appearance-none rounded-md border border-border bg-card pl-3 pr-8 text-sm font-medium outline-none transition hover:border-primary/50 focus:border-primary"
          aria-label="Who are you?"
        >
          <option value="" disabled>
            Who are you?
          </option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </form>
  );
}
