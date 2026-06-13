export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type BtnVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type BtnSize = "sm" | "md";

export function btn(variant: BtnVariant = "primary", size: BtnSize = "md"): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const sizes: Record<BtnSize, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
  };
  const variants: Record<BtnVariant, string> = {
    primary: "bg-primary text-primary-foreground hover:opacity-90",
    secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
    outline: "border border-border bg-card hover:bg-muted",
    ghost: "hover:bg-muted text-muted-foreground hover:text-foreground",
    danger: "bg-danger text-white hover:opacity-90",
  };
  return cn(base, sizes[size], variants[variant]);
}

export const inputClass =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/30";

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateInput(iso: string): string {
  // yyyy-MM-ddTHH:mm for <input type="datetime-local">
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function countdown(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "happening now";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `in ${days}d ${hours}h`;
  const mins = Math.floor((diff % 3600000) / 60000);
  return `in ${hours}h ${mins}m`;
}

export function minutesToHours(mins: number | null): string | null {
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Pick readable text color (black/white) for a given hex background. */
export function contrastText(hex: string): string {
  const c = hex.replace("#", "");
  if (c.length !== 6) return "#ffffff";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0a0a0a" : "#ffffff";
}
