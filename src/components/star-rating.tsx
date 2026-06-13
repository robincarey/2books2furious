"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" />
    </svg>
  );
}

/** Read-only star display. */
export function StarsDisplay({
  value,
  size = 16,
  className,
}: {
  value: number | null;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-primary", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} filled={value != null && n <= Math.round(value)} size={size} />
      ))}
    </span>
  );
}

/** Interactive star input backed by a hidden field named `rating`. */
export function StarInput({ defaultValue = 0 }: { defaultValue?: number }) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="inline-flex items-center gap-1">
      <input type="hidden" name="rating" value={value} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => setValue(n === value ? 0 : n)}
          className={cn(
            "transition",
            n <= shown ? "text-primary" : "text-muted-foreground/40 hover:text-primary/60",
          )}
        >
          <Star filled={n <= shown} size={26} />
        </button>
      ))}
      {value > 0 && (
        <button
          type="button"
          onClick={() => setValue(0)}
          className="ml-2 text-xs text-muted-foreground hover:text-foreground"
        >
          clear
        </button>
      )}
    </div>
  );
}
