import { setMember } from "@/app/actions";
import type { Member } from "@/lib/types";
import { Avatar } from "./avatar";

export function SelectIdentityBanner({
  members,
  redirectTo,
}: {
  members: Member[];
  redirectTo: string;
}) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
      <p className="text-sm font-medium">
        Select who you are to track progress and unlock discussion
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {[...members]
          .sort((a, b) => a.selection_order - b.selection_order)
          .map((m) => (
            <form key={m.id} action={setMember}>
              <input type="hidden" name="member_id" value={m.id} />
              <input type="hidden" name="redirect_to" value={redirectTo} />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-3 text-sm font-medium transition hover:border-primary/60 hover:bg-muted"
              >
                <Avatar name={m.name} color={m.color} size={24} />
                {m.name.split(" ")[0]}
              </button>
            </form>
          ))}
      </div>
    </div>
  );
}
