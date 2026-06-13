import { Avatar } from "@/components/avatar";
import { Card } from "@/components/ui";
import type { MemberStatRow } from "@/lib/queries";

const MIN_RATINGS_FOR_CRITIC = 3;

type Highlight = {
  label: string;
  member: MemberStatRow["member"];
  detail: string;
};

function buildHighlights(stats: MemberStatRow[]): Highlight[] {
  const highlights: Highlight[] = [];

  const mostGenerous = [...stats]
    .filter((m) => m.avg_given != null)
    .sort((a, b) => (b.avg_given ?? 0) - (a.avg_given ?? 0))[0];
  if (mostGenerous) {
    highlights.push({
      label: "Most generous rater",
      member: mostGenerous.member,
      detail: `gives avg ${mostGenerous.avg_given?.toFixed(2)}★`,
    });
  }

  const toughestCritic = [...stats]
    .filter((m) => m.avg_given != null && m.ratings_given >= MIN_RATINGS_FOR_CRITIC)
    .sort((a, b) => (a.avg_given ?? 0) - (b.avg_given ?? 0))[0];
  if (toughestCritic) {
    highlights.push({
      label: "Toughest critic",
      member: toughestCritic.member,
      detail: `gives avg ${toughestCritic.avg_given?.toFixed(2)}★`,
    });
  }

  const mostFinished = [...stats]
    .filter((m) => m.books_finished > 0)
    .sort((a, b) => b.books_finished - a.books_finished)[0];
  if (mostFinished) {
    highlights.push({
      label: "Most books finished",
      member: mostFinished.member,
      detail: `${mostFinished.books_finished} book${mostFinished.books_finished === 1 ? "" : "s"}`,
    });
  }

  const mostReviews = [...stats]
    .filter((m) => m.reviews_written > 0)
    .sort((a, b) => b.reviews_written - a.reviews_written)[0];
  if (mostReviews) {
    highlights.push({
      label: "Most reviews",
      member: mostReviews.member,
      detail: `${mostReviews.reviews_written} review${mostReviews.reviews_written === 1 ? "" : "s"}`,
    });
  }

  const mostPicks = [...stats]
    .filter((m) => m.picks > 0)
    .sort((a, b) => b.picks - a.picks)[0];
  if (mostPicks) {
    highlights.push({
      label: "Most picks",
      member: mostPicks.member,
      detail: `${mostPicks.picks} pick${mostPicks.picks === 1 ? "" : "s"}`,
    });
  }

  return highlights;
}

function HighlightCard({ label, member, detail }: Highlight) {
  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-center gap-3">
        <Avatar name={member.name} color={member.color} size={36} />
        <div>
          <p className="font-semibold">{member.name}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

export function LeaderboardHighlights({ stats }: { stats: MemberStatRow[] }) {
  const highlights = buildHighlights(stats);
  if (highlights.length === 0) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {highlights.map((h) => (
        <HighlightCard key={h.label} {...h} />
      ))}
    </div>
  );
}
