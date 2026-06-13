import "server-only";
import { cookies } from "next/headers";
import { getSupabase } from "./supabase";
import type { Member } from "./types";

const COOKIE = "b2f_member";

/** Read the currently selected member id from the cookie (or null). */
export async function getCurrentMemberId(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE)?.value ?? null;
}

/** Resolve the current member row, or null if not chosen / not found. */
export async function getCurrentMember(): Promise<Member | null> {
  const id = await getCurrentMemberId();
  if (!id) return null;
  const supabase = getSupabase();
  const { data } = await supabase.from("members").select("*").eq("id", id).single();
  return (data as Member) ?? null;
}

export const MEMBER_COOKIE = COOKIE;
