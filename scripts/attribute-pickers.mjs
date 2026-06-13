// Sets book-level picker attribution for historical books (no fake meeting dates).
// Idempotent: matches by title. Run: node scripts/attribute-pickers.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i > 0) env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const supabase = createClient(env.B2F_SUPABASE_URL, env.B2F_SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const ATTRIBUTION = {
  "Robin Carey": ["The Tainted Cup", "There Is No Antimemetics Division", "Shroud"],
  "Manoj Kowshik": ["Hard-Boiled Wonderland and the End of the World", "Between Two Fires"],
  "Roberto Lozier": ["Small Mercies"],
  "Eric Wasser": ["The Tender Bar"],
  "Malek Atassi": ["Rivers of London"],
};
// Left intentionally unattributed (outside-group suggestions / group consensus).
const UNATTRIBUTED = [
  "Empire of Silence",
  "Shards of Earth",
  "I Who Have Never Known Men",
  "A Drop of Corruption",
];

const { data: members } = await supabase.from("members").select("id, name");
const memberByName = new Map(members.map((m) => [m.name, m.id]));

for (const [name, titles] of Object.entries(ATTRIBUTION)) {
  const memberId = memberByName.get(name);
  if (!memberId) {
    console.error("No member:", name);
    continue;
  }
  for (const title of titles) {
    const { error, count } = await supabase
      .from("books")
      .update({ picked_by: memberId }, { count: "exact" })
      .eq("title", title);
    console.log(error ? `ERR ${title}: ${error.message}` : `${name} <- ${title} (${count})`);
  }
}

for (const title of UNATTRIBUTED) {
  const { error } = await supabase.from("books").update({ picked_by: null }).eq("title", title);
  console.log(error ? `ERR ${title}: ${error.message}` : `(unattributed) ${title}`);
}

// Set picked_by = Manoj on the existing "Between Two Fires" meeting.
const manoj = memberByName.get("Manoj Kowshik");
const { data: btf } = await supabase.from("books").select("id").eq("title", "Between Two Fires").maybeSingle();
if (btf?.id && manoj) {
  const { error, count } = await supabase
    .from("meetings")
    .update({ picked_by: manoj }, { count: "exact" })
    .eq("book_id", btf.id);
  console.log(error ? `ERR meeting: ${error.message}` : `Between Two Fires meeting <- Manoj (${count})`);
}

console.log("Done.");
