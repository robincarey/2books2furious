import { setMember } from "@/app/actions";
import type { Member } from "@/lib/types";
import { Avatar } from "./avatar";
import { Card } from "./ui";

export function MemberPicker({
  members,
  redirectTo = "/",
}: {
  members: Member[];
  redirectTo?: string;
}) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Who are you?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Pick your name so reviews, comments and picks are attributed to you. (Stored in this
        browser — no password needed.)
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <form key={m.id} action={setMember}>
            <input type="hidden" name="member_id" value={m.id} />
            <input type="hidden" name="redirect_to" value={redirectTo} />
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary/60 hover:bg-muted"
            >
              <Avatar name={m.name} color={m.color} size={40} />
              <span className="font-medium">{m.name}</span>
            </button>
          </form>
        ))}
      </div>
    </Card>
  );
}
