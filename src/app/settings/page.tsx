import { AccentColorForm } from "@/components/accent-color-form";
import { MemberPicker } from "@/components/member-picker";
import { SetupNotice } from "@/components/setup-notice";
import { Badge, Card, PageHeader } from "@/components/ui";
import { isHardcoverConfigured } from "@/lib/hardcover";
import { isDiscordConfigured } from "@/lib/discord";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getMembers } from "@/lib/queries";
import { getCurrentMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) return <SetupNotice reason="env" />;
  const members = await getMembers();
  if (members.length === 0) return <SetupNotice reason="schema" />;

  const me = await getCurrentMember();

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" subtitle="Your identity, your color, and club integrations." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Your accent color</h2>
          {me ? (
            <AccentColorForm name={me.name} color={me.color} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Pick who you are below to customize your color.
            </p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold">Identity</h2>
          <MemberPicker members={members} redirectTo="/settings" />
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold">Integrations</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center justify-between">
            <span>
              <strong>Discord notifications</strong>
              <span className="block text-xs text-muted-foreground">
                Posts to your channel when meetings, suggestions and reviews happen. Set{" "}
                <code className="rounded bg-muted px-1">DISCORD_WEBHOOK_URL</code>.
              </span>
            </span>
            <Badge tone={isDiscordConfigured() ? "success" : "muted"}>
              {isDiscordConfigured() ? "on" : "off"}
            </Badge>
          </li>
          <li className="flex items-center justify-between">
            <span>
              <strong>Book recommendations</strong>
              <span className="block text-xs text-muted-foreground">
                Matches your top-rated reads to similar books on Hardcover. Set{" "}
                <code className="rounded bg-muted px-1">HARDCOVER_API_KEY</code>.
              </span>
            </span>
            <Badge tone={isHardcoverConfigured() ? "success" : "muted"}>
              {isHardcoverConfigured() ? "on" : "off"}
            </Badge>
          </li>
        </ul>
      </Card>
    </div>
  );
}
