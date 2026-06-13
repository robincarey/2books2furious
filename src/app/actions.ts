"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { getCurrentMemberId } from "@/lib/session";
import { MEMBER_COOKIE } from "@/lib/session";
import { notifyDiscord } from "@/lib/discord";

const YEAR = 60 * 60 * 24 * 365;

async function requireMember(): Promise<string> {
  const id = await getCurrentMemberId();
  if (!id) throw new Error("No member selected. Pick who you are first.");
  return id;
}

async function memberName(id: string | null): Promise<string> {
  if (!id) return "Someone";
  const { data } = await getSupabase().from("members").select("name").eq("id", id).single();
  return (data?.name as string) ?? "Someone";
}

// --------------------------------------------------------------------------
// Identity + profile
// --------------------------------------------------------------------------
export async function setMember(formData: FormData) {
  const memberId = String(formData.get("member_id") ?? "");
  const redirectTo = String(formData.get("redirect_to") ?? "/");
  const store = await cookies();
  if (memberId) {
    store.set(MEMBER_COOKIE, memberId, { maxAge: YEAR, path: "/", sameSite: "lax" });
  } else {
    store.delete(MEMBER_COOKIE);
  }
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function updateAccentColor(formData: FormData) {
  const memberId = await requireMember();
  const color = String(formData.get("color") ?? "").trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error("Invalid color.");
  await getSupabase().from("members").update({ color }).eq("id", memberId);
  revalidatePath("/", "layout");
  revalidatePath("/settings");
}

// --------------------------------------------------------------------------
// Books / backlog
// --------------------------------------------------------------------------
export async function addBook(formData: FormData) {
  const memberId = await requireMember();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required.");

  const genresRaw = String(formData.get("genres") ?? "").trim();
  const genres = genresRaw
    ? genresRaw.split(",").map((g) => g.trim()).filter(Boolean)
    : [];
  const pageCount = Number(formData.get("page_count")) || null;
  const audiobookMinutes = Number(formData.get("audiobook_minutes")) || null;

  const supabase = getSupabase();
  const { data: book } = await supabase
    .from("books")
    .insert({
      title,
      author: String(formData.get("author") ?? "").trim() || null,
      page_count: pageCount,
      audiobook_minutes: audiobookMinutes,
      genres,
      cover_url: String(formData.get("cover_url") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      isbn: String(formData.get("isbn") ?? "").trim() || null,
      suggested_by: memberId,
      status: "suggested",
    })
    .select("id")
    .single();

  // Auto-upvote your own suggestion.
  if (book?.id) {
    await supabase.from("book_votes").insert({ book_id: book.id, member_id: memberId });
  }

  await notifyDiscord(`📚 ${await memberName(memberId)} suggested **${title}** for the backlog.`);
  revalidatePath("/backlog");
  revalidatePath("/");
}

export async function toggleVote(formData: FormData) {
  const memberId = await requireMember();
  const bookId = String(formData.get("book_id") ?? "");
  if (!bookId) return;
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("book_votes")
    .select("id")
    .eq("book_id", bookId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (existing) {
    await supabase.from("book_votes").delete().eq("id", existing.id);
  } else {
    await supabase.from("book_votes").insert({ book_id: bookId, member_id: memberId });
  }
  revalidatePath("/backlog");
}

// --------------------------------------------------------------------------
// Meetings
// --------------------------------------------------------------------------
export async function createMeeting(formData: FormData) {
  const memberId = await requireMember();
  const bookId = String(formData.get("book_id") ?? "") || null;
  const date = String(formData.get("meeting_date") ?? "");
  if (!date) throw new Error("A meeting date is required.");

  const supabase = getSupabase();
  const pickedBy = String(formData.get("picked_by") ?? "") || memberId;

  const { data: meeting } = await supabase
    .from("meetings")
    .insert({
      book_id: bookId,
      meeting_date: new Date(date).toISOString(),
      picked_by: pickedBy,
      notes: String(formData.get("notes") ?? "").trim() || null,
    })
    .select("id")
    .single();

  // Promote the selected book to "scheduled".
  let bookTitle = "";
  if (bookId) {
    await supabase.from("books").update({ status: "scheduled" }).eq("id", bookId);
    const { data } = await supabase.from("books").select("title").eq("id", bookId).single();
    bookTitle = (data?.title as string) ?? "";
  }

  await notifyDiscord(
    `📅 New meeting scheduled for ${new Date(date).toLocaleDateString()} ${
      bookTitle ? `— reading **${bookTitle}**` : ""
    }`,
  );

  revalidatePath("/meetings");
  revalidatePath("/");
  if (meeting?.id) redirect(`/meetings/${meeting.id}`);
}

export async function markMeetingRead(formData: FormData) {
  await requireMember();
  const bookId = String(formData.get("book_id") ?? "");
  if (!bookId) return;
  await getSupabase().from("books").update({ status: "read" }).eq("id", bookId);
  revalidatePath("/meetings");
  revalidatePath("/leaderboard");
}

export async function setRsvp(formData: FormData) {
  const memberId = await requireMember();
  const meetingId = String(formData.get("meeting_id") ?? "");
  const status = String(formData.get("status") ?? "going");
  if (!meetingId) return;
  await getSupabase()
    .from("rsvps")
    .upsert(
      { meeting_id: meetingId, member_id: memberId, status, updated_at: new Date().toISOString() },
      { onConflict: "meeting_id,member_id" },
    );
  revalidatePath(`/meetings/${meetingId}`);
}

// --------------------------------------------------------------------------
// Reviews
// --------------------------------------------------------------------------
async function syncMemberCompleted(
  supabase: ReturnType<typeof getSupabase>,
  memberId: string,
  bookId: string,
  completed: boolean,
) {
  const { data: existing } = await supabase
    .from("member_book_reads")
    .select("id")
    .eq("book_id", bookId)
    .eq("member_id", memberId)
    .maybeSingle();

  if (completed && !existing) {
    await supabase.from("member_book_reads").insert({ book_id: bookId, member_id: memberId });
    const { data: prog } = await supabase
      .from("reading_progress")
      .select("unit, total")
      .eq("book_id", bookId)
      .eq("member_id", memberId)
      .maybeSingle();
    const unit = prog?.unit ?? "percent";
    const total = prog?.total ?? null;
    await supabase.from("reading_progress").upsert(
      {
        member_id: memberId,
        book_id: bookId,
        percent: 100,
        unit,
        position: total ?? 100,
        total: total ?? (unit === "percent" ? 100 : null),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id,book_id" },
    );
  } else if (!completed && existing) {
    await supabase.from("member_book_reads").delete().eq("id", existing.id);
  }
}

export async function upsertReview(formData: FormData) {
  const memberId = await requireMember();
  const bookId = String(formData.get("book_id") ?? "");
  if (!bookId) throw new Error("Missing book.");

  const supabase = getSupabase();

  const wantsCompleted = formData.get("completed") === "on";
  const wantsDnf = formData.get("dnf") === "on";
  const dnf = wantsDnf && !wantsCompleted;

  await syncMemberCompleted(supabase, memberId, bookId, wantsCompleted);

  if (wantsCompleted) {
    const ratingRaw = Number(formData.get("rating"));
    const rating = ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null;
    const body = String(formData.get("body") ?? "").trim() || null;

    await supabase.from("reviews").upsert(
      {
        book_id: bookId,
        member_id: memberId,
        finished: true,
        dnf: false,
        rating,
        body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "book_id,member_id" },
    );

    if (rating) {
      const { data } = await supabase.from("books").select("title").eq("id", bookId).single();
      await notifyDiscord(
        `⭐ ${await memberName(memberId)} rated **${data?.title ?? "a book"}** ${rating}/5.`,
      );
    }
  } else if (dnf) {
    await supabase.from("reviews").upsert(
      {
        book_id: bookId,
        member_id: memberId,
        finished: false,
        dnf: true,
        rating: null,
        body: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "book_id,member_id" },
    );
  } else {
    await supabase
      .from("reviews")
      .delete()
      .eq("book_id", bookId)
      .eq("member_id", memberId);
  }

  revalidatePath(`/books/${bookId}`);
  revalidatePath("/previous");
  revalidatePath("/leaderboard");
}

// --------------------------------------------------------------------------
// Spoiler-gated book discussion comments
// --------------------------------------------------------------------------
export async function addComment(formData: FormData) {
  const memberId = await requireMember();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  const bookId = String(formData.get("book_id") ?? "");
  if (!bookId) throw new Error("Missing book.");
  const parentId = String(formData.get("parent_id") ?? "") || null;
  const progressRaw = formData.get("progress_percent");
  const progress =
    progressRaw != null && String(progressRaw) !== ""
      ? Math.max(0, Math.min(100, Number(progressRaw)))
      : null;

  await getSupabase().from("comments").insert({
    book_id: bookId,
    parent_id: parentId,
    member_id: memberId,
    body,
    progress_percent: progress,
  });

  revalidatePath(`/books/${bookId}`);
}

// --------------------------------------------------------------------------
// Per-member read tracking (opt-in; separate from book.status)
// --------------------------------------------------------------------------
export async function toggleMemberRead(formData: FormData) {
  const memberId = await requireMember();
  const bookId = String(formData.get("book_id") ?? "");
  if (!bookId) return;
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("member_book_reads")
    .select("id")
    .eq("book_id", bookId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (existing) {
    await supabase.from("member_book_reads").delete().eq("id", existing.id);
    await supabase
      .from("reviews")
      .delete()
      .eq("book_id", bookId)
      .eq("member_id", memberId);
  } else {
    await syncMemberCompleted(supabase, memberId, bookId, true);
    // Completed and DNF are mutually exclusive.
    await supabase
      .from("reviews")
      .update({ finished: true, dnf: false })
      .eq("book_id", bookId)
      .eq("member_id", memberId);
  }
  revalidatePath("/previous");
  revalidatePath("/");
  revalidatePath("/leaderboard");
  revalidatePath(`/books/${bookId}`);
}

// --------------------------------------------------------------------------
// Feature requests ("suggest a feature")
// --------------------------------------------------------------------------
export async function addFeatureRequest(formData: FormData) {
  const memberId = await requireMember();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("A title is required.");
  const body = String(formData.get("body") ?? "").trim() || null;

  const supabase = getSupabase();
  const { data: req } = await supabase
    .from("feature_requests")
    .insert({ title, body, submitted_by: memberId, status: "open" })
    .select("id")
    .single();

  // Auto-upvote your own request.
  if (req?.id) {
    await supabase
      .from("feature_request_votes")
      .insert({ request_id: req.id, member_id: memberId });
  }

  await notifyDiscord(`💡 ${await memberName(memberId)} suggested a feature: **${title}**`);
  revalidatePath("/suggestions");
}

export async function toggleFeatureVote(formData: FormData) {
  const memberId = await requireMember();
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) return;
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from("feature_request_votes")
    .select("id")
    .eq("request_id", requestId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (existing) {
    await supabase.from("feature_request_votes").delete().eq("id", existing.id);
  } else {
    await supabase
      .from("feature_request_votes")
      .insert({ request_id: requestId, member_id: memberId });
  }
  revalidatePath("/suggestions");
}

// --------------------------------------------------------------------------
// Reading progress (drives dashboard + spoiler gating)
// --------------------------------------------------------------------------
export async function setProgress(formData: FormData) {
  const memberId = await requireMember();
  const bookId = String(formData.get("book_id") ?? "");
  if (!bookId) return;

  const unitRaw = String(formData.get("unit") ?? "percent");
  const unit = (["percent", "pages", "minutes"] as const).includes(unitRaw as never)
    ? (unitRaw as "percent" | "pages" | "minutes")
    : "percent";

  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  let percent: number;
  let position: number | null = null;
  let total: number | null = null;

  if (unit === "percent") {
    percent = clamp(Number(formData.get("percent")) || Number(formData.get("position")) || 0);
    position = percent;
    total = 100;
  } else {
    position = Math.max(0, Math.round(Number(formData.get("position")) || 0));
    total = Math.max(0, Math.round(Number(formData.get("total")) || 0));
    percent = total > 0 ? clamp((position / total) * 100) : 0;
  }

  await getSupabase()
    .from("reading_progress")
    .upsert(
      {
        member_id: memberId,
        book_id: bookId,
        percent,
        unit,
        position,
        total: total && total > 0 ? total : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_id,book_id" },
    );
  revalidatePath(`/books/${bookId}`);
  revalidatePath("/");
}

// --------------------------------------------------------------------------
// Recommendations cache (served by default; manual refresh hits Hardcover)
// --------------------------------------------------------------------------
export async function refreshRecommendations(formData: FormData) {
  await requireMember();
  const scope = String(formData.get("scope") ?? "group") || "group";
  const { getRecommendations, isHardcoverConfigured } = await import("@/lib/hardcover");
  if (!isHardcoverConfigured()) return;

  const supabase = getSupabase();
  const [{ data: books }, { data: reviews }, { data: dismissed }] = await Promise.all([
    supabase.from("books").select("*"),
    supabase.from("reviews").select("*"),
    supabase.from("dismissed_recommendations").select("title"),
  ]);
  const bookList = (books as { id: string; title: string; author: string | null; status: string }[]) ?? [];
  const reviewList = (reviews as { book_id: string; member_id: string; rating: number | null }[]) ?? [];
  const dismissedTitles = ((dismissed as { title: string }[]) ?? []).map((d) => d.title);

  const relevant =
    scope && scope !== "group" ? reviewList.filter((r) => r.member_id === scope) : reviewList;
  const avgByBook = new Map<string, { sum: number; n: number }>();
  for (const r of relevant) {
    if (r.rating == null) continue;
    const e = avgByBook.get(r.book_id) ?? { sum: 0, n: 0 };
    e.sum += r.rating;
    e.n += 1;
    avgByBook.set(r.book_id, e);
  }
  const history = bookList
    .filter((b) => avgByBook.has(b.id) || b.status === "read")
    .map((b) => {
      const a = avgByBook.get(b.id);
      return { title: b.title, author: b.author, avgRating: a ? a.sum / a.n : null };
    });

  const recommendations = await getRecommendations({
    history,
    avoidTitles: [...bookList.map((b) => b.title), ...dismissedTitles],
    limit: 5,
  });

  await supabase
    .from("recommendations_cache")
    .upsert(
      { scope, recommendations, generated_at: new Date().toISOString() },
      { onConflict: "scope" },
    );

  revalidatePath("/recommendations");
}

const normTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function dismissRecommendation(formData: FormData) {
  const memberId = await requireMember();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const hardcoverId = String(formData.get("hardcover_id") ?? "") || null;
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const supabase = getSupabase();

  await supabase
    .from("dismissed_recommendations")
    .upsert(
      { title, hardcover_id: hardcoverId, reason, dismissed_by: memberId },
      { onConflict: "title" },
    );

  // Remove the dismissed title from every cached list immediately (no API call).
  const { data: rows } = await supabase
    .from("recommendations_cache")
    .select("scope, recommendations, generated_at");
  for (const row of (rows as { scope: string; recommendations: { title: string }[]; generated_at: string }[]) ?? []) {
    const filtered = (row.recommendations ?? []).filter(
      (r) => normTitle(r.title) !== normTitle(title),
    );
    if (filtered.length !== (row.recommendations ?? []).length) {
      await supabase
        .from("recommendations_cache")
        .update({ recommendations: filtered })
        .eq("scope", row.scope);
    }
  }

  revalidatePath("/recommendations");
}

export async function undismissRecommendation(formData: FormData) {
  await requireMember();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await getSupabase().from("dismissed_recommendations").delete().eq("id", id);
  revalidatePath("/recommendations");
}
