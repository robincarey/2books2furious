"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = theme === "system" ? resolvedTheme : theme;
  const isDark = current === "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:text-foreground hover:border-primary/50"
    >
      {!mounted ? (
        <span className="h-4 w-4" />
      ) : isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
