import "server-only";
import { getSupabase } from "./supabase";
import type {
  ActivityItem,
  Book,
  BookWithExtras,
  Comment,
  FeatureRequestWithExtras,
  Meeting,
  Member,
  ReadingProgress,
  Review,
  Rsvp,
} from "./types";
import { firstName } from "./utils";

export async function getMembers(): Promise<Member[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("members")
    .select("*")
    .order("selection_order", { ascending: true });
  return (data as Member[]) ?? [];
}

export async function getMember(id: string): Promise<Member | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from("members").select("*").eq("id", id).single();
  return (data as Member) ?? null;
}

export async function membersById(): Promise<Map<string, Member>> {
  const members = await getMembers();
  return new Map(members.map((m) => [m.id, m]));
}

/** All books with aggregated votes + ratings, optionally filtered by status. */
export async function getBooksWithExtras(
  currentMemberId: string | null,
  status?: Book["status"],
): Promise<BookWithExtras[]> {
  const supabase = getSupabase();
  let query = supabase.from("books").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data: books } = await query;
  const list = (books as Book[]) ?? [];
  if (list.length === 0) return [];

  const ids = list.map((b) => b.id);
  const [{ data: votes }, { data: reviews }, members] = await Promise.all([
    supabase.from("book_votes").select("book_id, member_id").in("book_id", ids),
    supabase.from("reviews").select("book_id, rating").in("book_id", ids),
    membersById(),
  ]);

  const voteMap = new Map<string, { count: number; mine: boolean }>();
  for (const v of (votes as { book_id: string; member_id: string }[]) ?? []) {
    const entry = voteMap.get(v.book_id) ?? { count: 0, mine: false };
    entry.count += 1;
    if (currentMemberId && v.member_id === currentMemberId) entry.mine = true;
    voteMap.set(v.book_id, entry);
  }

  const ratingMap = new Map<string, { sum: number; n: number }>();
  for (const r of (reviews as { book_id: string; rating: number | null }[]) ?? []) {
    if (r.rating == null) continue;
    const entry = ratingMap.get(r.book_id) ?? { sum: 0, n: 0 };
    entry.sum += r.rating;
    entry.n += 1;
    ratingMap.set(r.book_id, entry);
  }

  return list.map((b) => {
    const v = voteMap.get(b.id) ?? { count: 0, mine: false };
    const r = ratingMap.get(b.id);
    return {
      ...b,
      suggester: b.suggested_by ? members.get(b.suggested_by) ?? null : null,
      votes: v.count,
      voted_by_me: v.mine,
      avg_rating: r ? r.sum / r.n : null,
      review_count: r?.n ?? 0,
    } satisfies BookWithExtras;
  });
}

export async function getBook(id: string): Promise<Book | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from("books").select("*").eq("id", id).single();
  return (data as Book) ?? null;
}

export async function getAllReviews(): Promise<Review[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("reviews").select("*");
  return (data as Review[]) ?? [];
}

export async function getAllMemberReads(): Promise<{ member_id: string; book_id: string }[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("member_book_reads").select("member_id, book_id");
  return (data as { member_id: string; book_id: string }[]) ?? [];
}

export interface CachedRecommendations {
  scope: string;
  recommendations: { title: string; author: string; why: string }[];
  generated_at: string;
}

export async function getRecommendationCache(): Promise<Record<string, CachedRecommendations>> {
  const supabase = getSupabase();
  const { data } = await supabase.from("recommendations_cache").select("*");
  const out: Record<string, CachedRecommendations> = {};
  for (const r of (data as CachedRecommendations[]) ?? []) out[r.scope] = r;
  return out;
}

export interface DismissedRecommendation {
  id: string;
  title: string;
  hardcover_id: string | null;
  reason: string | null;
  created_at: string;
  dismissed_by_member: Member | null;
}

export async function getDismissedRecommendations(): Promise<DismissedRecommendation[]> {
  const supabase = getSupabase();
  const [{ data }, members] = await Promise.all([
    supabase.from("dismissed_recommendations").select("*").order("created_at", { ascending: false }),
    membersById(),
  ]);
  return ((data as (DismissedRecommendation & { dismissed_by: string | null })[]) ?? []).map((d) => ({
    ...d,
    dismissed_by_member: d.dismissed_by ? members.get(d.dismissed_by) ?? null : null,
  }));
}

export async function getReadsForBook(bookId: string): Promise<string[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("member_book_reads")
    .select("member_id")
    .eq("book_id", bookId);
  return ((data as { member_id: string }[]) ?? []).map((r) => r.member_id);
}

export async function getReviewsForBook(bookId: string): Promise<Review[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("book_id", bookId)
    .order("created_at", { ascending: false });
  return (data as Review[]) ?? [];
}

export async function getMyReview(bookId: string, memberId: string): Promise<Review | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("book_id", bookId)
    .eq("member_id", memberId)
    .maybeSingle();
  return (data as Review) ?? null;
}

export async function getMeetings(): Promise<Meeting[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("meetings")
    .select("*")
    .order("meeting_date", { ascending: true });
  return (data as Meeting[]) ?? [];
}

export async function getMeeting(id: string): Promise<Meeting | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from("meetings").select("*").eq("id", id).single();
  return (data as Meeting) ?? null;
}

/** Books that can be assigned when creating or editing a meeting. */
export async function getEligibleBooksForMeeting(
  meetingId: string | null,
): Promise<BookWithExtras[]> {
  const [suggestedBooks, meetings, meeting] = await Promise.all([
    getBooksWithExtras(null, "suggested"),
    getMeetings(),
    meetingId ? getMeeting(meetingId) : Promise.resolve(null),
  ]);

  const now = Date.now();
  const scheduledInOtherUpcoming = new Set(
    meetings
      .filter(
        (m) =>
          m.id !== meetingId &&
          new Date(m.meeting_date).getTime() >= now &&
          m.book_id,
      )
      .map((m) => m.book_id as string),
  );

  const eligible = suggestedBooks.filter((b) => !scheduledInOtherUpcoming.has(b.id));

  const currentBookId = meeting?.book_id ?? null;
  if (currentBookId && !eligible.some((b) => b.id === currentBookId)) {
    const current = await getBook(currentBookId);
    if (current) {
      eligible.unshift({
        ...current,
        suggester: null,
        votes: 0,
        voted_by_me: false,
        avg_rating: null,
        review_count: 0,
      });
    }
  }

  return eligible;
}

export async function getNextMeeting(): Promise<Meeting | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("meetings")
    .select("*")
    .gte("meeting_date", new Date().toISOString())
    .order("meeting_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Meeting) ?? null;
}

/**
 * All progress-gated book comments, ordered by their unlock threshold. The UI
 * decides which to reveal vs. render as locked placeholders based on the
 * viewer's progress, so members can see that discussion exists further ahead.
 */
export async function getBookComments(bookId: string): Promise<Comment[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("comments")
    .select("*")
    .eq("book_id", bookId)
    .is("meeting_id", null)
    .order("progress_percent", { ascending: true })
    .order("created_at", { ascending: true });
  return (data as Comment[]) ?? [];
}

export async function getProgressForBook(bookId: string): Promise<ReadingProgress[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("reading_progress").select("*").eq("book_id", bookId);
  return (data as ReadingProgress[]) ?? [];
}

export async function getMyProgress(
  bookId: string,
  memberId: string,
): Promise<ReadingProgress | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("reading_progress")
    .select("*")
    .eq("book_id", bookId)
    .eq("member_id", memberId)
    .maybeSingle();
  return (data as ReadingProgress) ?? null;
}

export async function getRsvps(meetingId: string): Promise<Rsvp[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("rsvps").select("*").eq("meeting_id", meetingId);
  return (data as Rsvp[]) ?? [];
}

export interface BookLeaderRow {
  book: Book;
  avg_rating: number;
  review_count: number;
  picked_by: Member | null;
}

/**
 * Resolve who picked each book. Book-level `picked_by` (used for historical
 * books with no meeting) takes precedence, falling back to a meeting's picker.
 * Returns only books with an attributed picker so rotation/leaderboards stay fair.
 */
export async function getPickerByBook(): Promise<Map<string, string>> {
  const supabase = getSupabase();
  const [{ data: books }, { data: meetings }] = await Promise.all([
    supabase.from("books").select("id, picked_by"),
    supabase.from("meetings").select("book_id, picked_by"),
  ]);
  const meetingPicker = new Map<string, string>();
  for (const m of (meetings as { book_id: string | null; picked_by: string | null }[]) ?? []) {
    if (m.book_id && m.picked_by) meetingPicker.set(m.book_id, m.picked_by);
  }
  const out = new Map<string, string>();
  for (const b of (books as { id: string; picked_by: string | null }[]) ?? []) {
    const picker = b.picked_by ?? meetingPicker.get(b.id) ?? null;
    if (picker) out.set(b.id, picker);
  }
  return out;
}

/** Books ranked by average rating (read books with at least one rating). */
export async function getBookLeaderboard(): Promise<BookLeaderRow[]> {
  const supabase = getSupabase();
  const [{ data: books }, { data: reviews }, members, pickerByBook] = await Promise.all([
    supabase.from("books").select("*"),
    supabase.from("reviews").select("book_id, rating"),
    membersById(),
    getPickerByBook(),
  ]);
  const bookList = (books as Book[]) ?? [];
  const ratingMap = new Map<string, { sum: number; n: number }>();
  for (const r of (reviews as { book_id: string; rating: number | null }[]) ?? []) {
    if (r.rating == null) continue;
    const e = ratingMap.get(r.book_id) ?? { sum: 0, n: 0 };
    e.sum += r.rating;
    e.n += 1;
    ratingMap.set(r.book_id, e);
  }

  return bookList
    .map((book) => {
      const r = ratingMap.get(book.id);
      const pickerId = pickerByBook.get(book.id) ?? null;
      return {
        book,
        avg_rating: r ? r.sum / r.n : 0,
        review_count: r?.n ?? 0,
        picked_by: pickerId ? members.get(pickerId) ?? null : null,
      };
    })
    .filter((row) => row.review_count > 0)
    .sort((a, b) => b.avg_rating - a.avg_rating);
}

export interface MemberStatRow {
  member: Member;
  reviews_written: number;
  ratings_given: number;
  avg_given: number | null;
  books_finished: number;
  picks: number;
  avg_pick_rating: number | null;
}

/** Per-member stats for the member leaderboard. */
export async function getMemberLeaderboard(): Promise<MemberStatRow[]> {
  const supabase = getSupabase();
  const [members, { data: reviews }, { data: reads }, pickerByBook] = await Promise.all([
    getMembers(),
    supabase.from("reviews").select("member_id, rating, book_id"),
    supabase.from("member_book_reads").select("member_id"),
    getPickerByBook(),
  ]);

  const revs = (reviews as {
    member_id: string;
    rating: number | null;
    book_id: string;
  }[]) ?? [];

  // avg rating per book (for evaluating a member's picks)
  const bookAvg = new Map<string, { sum: number; n: number }>();
  for (const r of revs) {
    if (r.rating == null) continue;
    const e = bookAvg.get(r.book_id) ?? { sum: 0, n: 0 };
    e.sum += r.rating;
    e.n += 1;
    bookAvg.set(r.book_id, e);
  }

  // Picks come from the unified picker-per-book resolution (book or meeting).
  const picksByMember = new Map<string, string[]>();
  for (const [bookId, pickerId] of pickerByBook.entries()) {
    const arr = picksByMember.get(pickerId) ?? [];
    arr.push(bookId);
    picksByMember.set(pickerId, arr);
  }

  // Completion ("finished") is the per-member read flag, not the old checkbox.
  const finishedByMember = new Map<string, number>();
  for (const r of (reads as { member_id: string }[]) ?? []) {
    finishedByMember.set(r.member_id, (finishedByMember.get(r.member_id) ?? 0) + 1);
  }

  return members.map((member) => {
    const mine = revs.filter((r) => r.member_id === member.id);
    const rated = mine.filter((r) => r.rating != null) as { rating: number }[];
    const picks = picksByMember.get(member.id) ?? [];
    const pickRatings = picks
      .map((bid) => bookAvg.get(bid))
      .filter((x): x is { sum: number; n: number } => Boolean(x));
    const pickAvg =
      pickRatings.length > 0
        ? pickRatings.reduce((s, x) => s + x.sum / x.n, 0) / pickRatings.length
        : null;
    return {
      member,
      reviews_written: mine.length,
      ratings_given: rated.length,
      avg_given:
        rated.length > 0 ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : null,
      books_finished: finishedByMember.get(member.id) ?? 0,
      picks: picks.length,
      avg_pick_rating: pickAvg,
    };
  });
}

/** Whose turn is it to pick next? Based on selection_order and past picks. */
const FEATURE_STATUS_ORDER: Record<string, number> = {
  open: 0,
  planned: 1,
  done: 2,
  declined: 3,
};

export async function getFeatureRequests(
  currentMemberId: string | null,
): Promise<FeatureRequestWithExtras[]> {
  const supabase = getSupabase();
  const [{ data: requests }, members] = await Promise.all([
    supabase.from("feature_requests").select("*").order("created_at", { ascending: false }),
    membersById(),
  ]);
  const list = (requests as FeatureRequestWithExtras[]) ?? [];
  if (list.length === 0) return [];

  const ids = list.map((r) => r.id);
  const { data: votes } = await supabase
    .from("feature_request_votes")
    .select("request_id, member_id")
    .in("request_id", ids);

  const voteMap = new Map<string, { count: number; mine: boolean }>();
  for (const v of (votes as { request_id: string; member_id: string }[]) ?? []) {
    const entry = voteMap.get(v.request_id) ?? { count: 0, mine: false };
    entry.count += 1;
    if (currentMemberId && v.member_id === currentMemberId) entry.mine = true;
    voteMap.set(v.request_id, entry);
  }

  return list
    .map((r) => {
      const v = voteMap.get(r.id) ?? { count: 0, mine: false };
      return {
        ...r,
        submitter: r.submitted_by ? members.get(r.submitted_by) ?? null : null,
        votes: v.count,
        voted_by_me: v.mine,
      } satisfies FeatureRequestWithExtras;
    })
    .sort((a, b) => {
      const s = (FEATURE_STATUS_ORDER[a.status] ?? 9) - (FEATURE_STATUS_ORDER[b.status] ?? 9);
      if (s !== 0) return s;
      return b.votes - a.votes;
    });
}

export async function getRotation(): Promise<{
  members: Member[];
  pickCounts: Map<string, number>;
  nextUp: Member | null;
  lastPicker: Member | null;
}> {
  const supabase = getSupabase();
  const [members, pickerByBook, { data: meetings }] = await Promise.all([
    getMembers(),
    getPickerByBook(),
    supabase
      .from("meetings")
      .select("picked_by, meeting_date")
      .lte("meeting_date", new Date().toISOString())
      .order("meeting_date", { ascending: true }),
  ]);

  // Pick counts come from the unified picker-per-book resolution so historical
  // books (attributed at the book level) count alongside scheduled meetings.
  const pickCounts = new Map<string, number>();
  for (const m of members) pickCounts.set(m.id, 0);
  for (const pickerId of pickerByBook.values()) {
    pickCounts.set(pickerId, (pickCounts.get(pickerId) ?? 0) + 1);
  }

  // Last picker = most recent past meeting's picker (used only for tie-breaking).
  const ms = (meetings as { picked_by: string | null; meeting_date: string }[]) ?? [];
  let lastPickerId: string | null = null;
  for (const m of ms) {
    if (m.picked_by) lastPickerId = m.picked_by;
  }

  // Next up = member with fewest picks; tie-break by selection_order starting
  // just after the last picker.
  let nextUp: Member | null = null;
  if (members.length > 0) {
    const minPicks = Math.min(...members.map((m) => pickCounts.get(m.id) ?? 0));
    const candidates = members.filter((m) => (pickCounts.get(m.id) ?? 0) === minPicks);
    if (lastPickerId) {
      const lastOrder = members.find((m) => m.id === lastPickerId)?.selection_order ?? 0;
      nextUp =
        candidates
          .slice()
          .sort((a, b) => a.selection_order - b.selection_order)
          .find((m) => m.selection_order > lastOrder) ??
        candidates.sort((a, b) => a.selection_order - b.selection_order)[0];
    } else {
      nextUp = candidates.sort((a, b) => a.selection_order - b.selection_order)[0];
    }
  }

  return {
    members,
    pickCounts,
    nextUp,
    lastPicker: lastPickerId ? members.find((m) => m.id === lastPickerId) ?? null : null,
  };
}

/** Recent club activity aggregated from reviews, reads, meetings, comments, votes, etc. */
export async function getRecentActivity(limit = 20): Promise<ActivityItem[]> {
  const supabase = getSupabase();
  const batch = Math.max(limit * 2, 40);

  const [
    members,
    { data: reviews },
    { data: reads },
    { data: meetings },
    { data: comments },
    { data: votes },
    { data: suggestedBooks },
    { data: dismissed },
  ] = await Promise.all([
    membersById(),
    supabase.from("reviews").select("*").order("updated_at", { ascending: false }).limit(batch),
    supabase
      .from("member_book_reads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(batch),
    supabase.from("meetings").select("*").order("created_at", { ascending: false }).limit(batch),
    supabase
      .from("comments")
      .select("*")
      .not("book_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(batch),
    supabase.from("book_votes").select("*").order("created_at", { ascending: false }).limit(batch),
    supabase
      .from("books")
      .select("*")
      .not("suggested_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(batch),
    supabase
      .from("dismissed_recommendations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(batch),
  ]);

  const bookIds = new Set<string>();
  for (const r of (reviews as Review[]) ?? []) bookIds.add(r.book_id);
  for (const r of (reads as { book_id: string }[]) ?? []) bookIds.add(r.book_id);
  for (const m of (meetings as Meeting[]) ?? []) if (m.book_id) bookIds.add(m.book_id);
  for (const c of (comments as Comment[]) ?? []) if (c.book_id) bookIds.add(c.book_id);
  for (const v of (votes as { book_id: string }[]) ?? []) bookIds.add(v.book_id);
  for (const b of (suggestedBooks as Book[]) ?? []) bookIds.add(b.id);

  const bookMap = new Map<string, Book>();
  if (bookIds.size > 0) {
    const { data: bookRows } = await supabase.from("books").select("*").in("id", [...bookIds]);
    for (const b of (bookRows as Book[]) ?? []) bookMap.set(b.id, b);
  }

  const bookTitle = (id: string) => bookMap.get(id)?.title ?? "a book";
  const memberName = (id: string | null) =>
    id ? firstName(members.get(id)?.name ?? "Someone") : "Someone";

  const items: ActivityItem[] = [];

  for (const r of (reviews as Review[]) ?? []) {
    const member = members.get(r.member_id) ?? null;
    const book = bookMap.get(r.book_id) ?? null;
    const title = book?.title ?? bookTitle(r.book_id);

    if (r.rating != null) {
      items.push({
        id: `rating:${r.id}:${r.updated_at}`,
        type: "rating",
        member,
        book,
        meeting: null,
        rating: r.rating,
        progress_percent: null,
        created_at: r.updated_at,
        summary: `${memberName(r.member_id)} rated ${title} ${r.rating}★`,
        href: `/books/${r.book_id}`,
      });
    }

    if (r.dnf) {
      items.push({
        id: `dnf:${r.id}:${r.updated_at}`,
        type: "dnf",
        member,
        book,
        meeting: null,
        rating: null,
        progress_percent: null,
        created_at: r.updated_at,
        summary: `${memberName(r.member_id)} marked ${title} as did not finish`,
        href: `/books/${r.book_id}`,
      });
    }
  }

  for (const r of (reads as { id: string; member_id: string; book_id: string; created_at: string }[]) ??
    []) {
    const member = members.get(r.member_id) ?? null;
    const book = bookMap.get(r.book_id) ?? null;
    const title = book?.title ?? bookTitle(r.book_id);
    items.push({
      id: `completed:${r.id}`,
      type: "completed",
      member,
      book,
      meeting: null,
      rating: null,
      progress_percent: null,
      created_at: r.created_at,
      summary: `${memberName(r.member_id)} marked ${title} as read`,
      href: `/books/${r.book_id}`,
    });
  }

  for (const m of (meetings as Meeting[]) ?? []) {
    const member = m.picked_by ? members.get(m.picked_by) ?? null : null;
    const book = m.book_id ? bookMap.get(m.book_id) ?? null : null;
    const title = book?.title ?? (m.book_id ? bookTitle(m.book_id) : null);
    const who = memberName(m.picked_by);
    const summary = title
      ? `${who} scheduled a meeting for ${title}`
      : `${who} scheduled a meeting`;
    items.push({
      id: `meeting:${m.id}`,
      type: "meeting",
      member,
      book,
      meeting: m,
      rating: null,
      progress_percent: null,
      created_at: m.created_at,
      summary,
      href: `/meetings/${m.id}`,
    });
  }

  for (const c of (comments as Comment[]) ?? []) {
    if (!c.book_id) continue;
    const member = c.member_id ? members.get(c.member_id) ?? null : null;
    const book = bookMap.get(c.book_id) ?? null;
    const title = book?.title ?? bookTitle(c.book_id);
    const pct = c.progress_percent ?? 0;
    items.push({
      id: `comment:${c.id}`,
      type: "comment",
      member,
      book,
      meeting: null,
      rating: null,
      progress_percent: c.progress_percent,
      created_at: c.created_at,
      summary: `${memberName(c.member_id)} commented at ${pct}% on ${title}`,
      href: `/books/${c.book_id}`,
    });
  }

  const suggestionMeta = new Map<string, { suggested_by: string; created_at: string }>();
  for (const b of (suggestedBooks as Book[]) ?? []) {
    if (b.suggested_by) suggestionMeta.set(b.id, { suggested_by: b.suggested_by, created_at: b.created_at });
  }

  for (const v of (votes as { id: string; book_id: string; member_id: string; created_at: string }[]) ??
    []) {
    const suggestion = suggestionMeta.get(v.book_id);
    if (
      suggestion &&
      suggestion.suggested_by === v.member_id &&
      Math.abs(new Date(v.created_at).getTime() - new Date(suggestion.created_at).getTime()) <= 2000
    ) {
      continue;
    }

    const member = members.get(v.member_id) ?? null;
    const book = bookMap.get(v.book_id) ?? null;
    const title = book?.title ?? bookTitle(v.book_id);
    items.push({
      id: `vote:${v.id}`,
      type: "vote",
      member,
      book,
      meeting: null,
      rating: null,
      progress_percent: null,
      created_at: v.created_at,
      summary: `${memberName(v.member_id)} upvoted ${title} on the backlog`,
      href: `/books/${v.book_id}`,
    });
  }

  for (const b of (suggestedBooks as Book[]) ?? []) {
    if (!b.suggested_by) continue;
    const member = members.get(b.suggested_by) ?? null;
    items.push({
      id: `suggestion:${b.id}`,
      type: "suggestion",
      member,
      book: b,
      meeting: null,
      rating: null,
      progress_percent: null,
      created_at: b.created_at,
      summary: `${memberName(b.suggested_by)} suggested ${b.title}`,
      href: `/books/${b.id}`,
    });
  }

  for (const d of (dismissed as {
    id: string;
    title: string;
    dismissed_by: string | null;
    created_at: string;
  }[]) ?? []) {
    const member = d.dismissed_by ? members.get(d.dismissed_by) ?? null : null;
    items.push({
      id: `dismissed:${d.id}`,
      type: "dismissed",
      member,
      book: null,
      meeting: null,
      rating: null,
      progress_percent: null,
      created_at: d.created_at,
      summary: `${memberName(d.dismissed_by)} dismissed a recommendation: ${d.title}`,
      href: "/recommendations",
    });
  }

  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const seen = new Set<string>();
  const deduped: ActivityItem[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
    if (deduped.length >= limit) break;
  }

  return deduped;
}
