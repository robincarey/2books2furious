import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/ui";
import type { ActivityItem } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

function ActivityLine({ item }: { item: ActivityItem }) {
  const content = item.href ? (
    <Link href={item.href} className="text-sm hover:text-primary">
      {item.summary}
    </Link>
  ) : (
    <span className="text-sm">{item.summary}</span>
  );

  return (
    <li className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      {item.member ? (
        <Avatar name={item.member.name} color={item.member.color} size={28} />
      ) : (
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
          ?
        </span>
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          {content}
          <time
            dateTime={item.created_at}
            className="shrink-0 text-xs text-muted-foreground"
            title={item.created_at}
          >
            {relativeTime(item.created_at)}
          </time>
        </div>
      </div>
    </li>
  );
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="p-6">
      <h2 className="mb-4 text-lg font-semibold">Recent activity</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No activity yet. Rate a book, suggest one for the backlog, or schedule a meeting to get
          things rolling.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <ActivityLine key={item.id} item={item} />
          ))}
        </ul>
      )}
    </Card>
  );
}
