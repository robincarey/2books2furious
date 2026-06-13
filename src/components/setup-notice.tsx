import { Card } from "./ui";

export function SetupNotice({ reason }: { reason: "env" | "schema" }) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-warning">Setup needed</h2>
      {reason === "env" ? (
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
          <p>Supabase isn&apos;t configured yet. Add these to <code className="rounded bg-muted px-1">.env.local</code> (and your Vercel project):</p>
          <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
{`SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...`}
          </pre>
        </div>
      ) : (
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">
          <p>
            Connected to Supabase, but the tables / members aren&apos;t there yet. Open the
            Supabase dashboard → SQL Editor, paste the contents of{" "}
            <code className="rounded bg-muted px-1">supabase/schema.sql</code> and run it. It
            creates the tables and seeds the 5 members.
          </p>
        </div>
      )}
    </Card>
  );
}
