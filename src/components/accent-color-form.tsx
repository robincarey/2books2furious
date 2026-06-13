"use client";

import { useState } from "react";
import { updateAccentColor } from "@/app/actions";
import { Avatar } from "./avatar";
import { btn } from "@/lib/utils";

const PRESETS = [
  "#f97316",
  "#fb7185",
  "#f472b6",
  "#a78bfa",
  "#818cf8",
  "#38bdf8",
  "#2dd4bf",
  "#34d399",
  "#facc15",
  "#fb923c",
];

export function AccentColorForm({ name, color }: { name: string; color: string }) {
  const [value, setValue] = useState(color);

  return (
    <form action={updateAccentColor} className="space-y-4">
      <input type="hidden" name="color" value={value} />
      <div className="flex items-center gap-3">
        <Avatar name={name} color={value} size={48} />
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{value}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setValue(c)}
            aria-label={`Use ${c}`}
            style={{ backgroundColor: c }}
            className={`h-8 w-8 rounded-full border-2 transition ${
              value.toLowerCase() === c.toLowerCase()
                ? "border-foreground"
                : "border-transparent hover:scale-110"
            }`}
          />
        ))}
        <label className="ml-1 inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border px-2 text-xs">
          Custom
          <input
            type="color"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
      </div>

      <button type="submit" className={btn("primary", "sm")}>
        Save accent color
      </button>
    </form>
  );
}
