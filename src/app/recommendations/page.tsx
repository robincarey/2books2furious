import { RecommendationsPanel } from "@/components/recommendations-panel";
import { SetupNotice } from "@/components/setup-notice";
import { PageHeader } from "@/components/ui";
import { isAiConfigured } from "@/lib/ai";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getMembers } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage() {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const members = await getMembers();
  if (members.length === 0) return <SetupNotice reason="schema" />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI recommendations"
        subtitle="Suggestions based on what the club has rated."
      />
      <RecommendationsPanel members={members} configured={isAiConfigured()} />
    </div>
  );
}
