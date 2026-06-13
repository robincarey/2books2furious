import Link from "next/link";
import { getMembers } from "@/lib/queries";
import { getCurrentMemberId } from "@/lib/session";
import { isSupabaseConfigured } from "@/lib/supabase";
import { MemberSwitcher } from "./member-switcher";
import { NavLinks } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

export async function Header() {
  const configured = isSupabaseConfigured();
  const [members, currentId] = configured
    ? await Promise.all([getMembers(), getCurrentMemberId()])
    : [[], null];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-lg font-black text-primary-foreground">
            2
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="text-sm font-extrabold tracking-tight">2 Books 2 Furious</span>
            <span className="text-[11px] text-muted-foreground">book club</span>
          </span>
        </Link>

        <div className="flex-1" />
        {configured && <NavLinks />}
        <div className="flex items-center gap-2">
          {configured && members.length > 0 && (
            <MemberSwitcher members={members} currentId={currentId} />
          )}
          <Link
            href="/settings"
            aria-label="Settings"
            className="hidden h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:text-foreground sm:inline-flex"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
