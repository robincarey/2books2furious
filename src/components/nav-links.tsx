"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/meetings", label: "Meetings" },
  { href: "/backlog", label: "Backlog" },
  { href: "/previous", label: "Previous Books" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/rotation", label: "Rotation" },
  { href: "/analytics", label: "Analytics" },
  { href: "/recommendations", label: "Recs" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="hidden items-center gap-1 lg:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition",
              isActive(pathname, l.href)
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        aria-label="Menu"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-border bg-card p-2 shadow-lg lg:hidden">
          <div className="grid grid-cols-2 gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition",
                  isActive(pathname, l.href)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
