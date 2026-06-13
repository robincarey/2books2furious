import { RecommendationsPanel } from "@/components/recommendations-panel";
import { SetupNotice } from "@/components/setup-notice";
import { PageHeader } from "@/components/ui";
import { isHardcoverConfigured } from "@/lib/hardcover";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getDismissedRecommendations,
  getMembers,
  getRecommendationCache,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const members = await getMembers();
  if (members.length === 0) return <SetupNotice reason="schema" />;

  const [cache, dismissed] = await Promise.all([
    getRecommendationCache(),
    getDismissedRecommendations(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Recommendations"
        subtitle="A cached Top 5 from Hardcover, matched to the club's top-rated reads."
      />
      <RecommendationsPanel
        members={members}
        configured={isHardcoverConfigured()}
        cache={cache}
        dismissed={dismissed}
      />
    </div>
  );
}
