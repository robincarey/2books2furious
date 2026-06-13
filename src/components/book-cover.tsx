import Image from "next/image";
import { cn } from "@/lib/utils";

export function BookCover({
  url,
  title,
  width = 80,
  className,
}: {
  url: string | null;
  title: string;
  width?: number;
  className?: string;
}) {
  const height = Math.round(width * 1.5);
  if (!url) {
    return (
      <div
        style={{ width, height }}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md border border-border bg-muted p-2 text-center text-[10px] font-medium text-muted-foreground",
          className,
        )}
      >
        {title.slice(0, 40)}
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt={`Cover of ${title}`}
      width={width}
      height={height}
      className={cn("shrink-0 rounded-md border border-border object-cover", className)}
      style={{ width, height }}
      unoptimized
    />
  );
}
