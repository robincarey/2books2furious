import "server-only";
import { getSupabase } from "./supabase";
import type {
  Book,
  BookWithExtras,
  Comment,
  Meeting,
  Member,
  ReadingProgress,
  Review,
  Rsvp,
} from "./types";

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

export async function getCommentsForMeeting(meetingId: string): Promise<Comment[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("comments")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });
  return (data as Comment[]) ?? [];
}

/** Progress-gated book comments: only those at or below the viewer's progress. */
export async function getSpoilerComments(
  bookId: string,
  viewerPercent: number,
): Promise<Comment[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("comments")
    .select("*")
    .eq("book_id", bookId)
    .is("meeting_id", null)
    .order("progress_percent", { ascending: true })
    .order("created_at", { ascending: true });
  const all = (data as Comment[]) ?? [];
  return all.filter((c) => (c.progress_percent ?? 0) <= viewerPercent);
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

/** Books ranked by average rating (read books with at least one rating). */
export async function getBookLeaderboard(): Promise<BookLeaderRow[]> {
  const supabase = getSupabase();
  const [{ data: books }, { data: reviews }, members] = await Promise.all([
    supabase.from("books").select("*"),
    supabase.from("reviews").select("book_id, rating"),
    membersById(),
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
  // Map books to the member who picked them (via meetings).
  const { data: meetings } = await supabase.from("meetings").select("book_id, picked_by");
  const pickerMap = new Map<string, string | null>();
  for (const m of (meetings as { book_id: string | null; picked_by: string | null }[]) ?? []) {
    if (m.book_id) pickerMap.set(m.book_id, m.picked_by);
  }

  return bookList
    .map((book) => {
      const r = ratingMap.get(book.id);
      const pickerId = pickerMap.get(book.id) ?? book.suggested_by;
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
  avg_given: number | null;
  books_finished: number;
  picks: number;
  avg_pick_rating: number | null;
}

/** Per-member stats for the member leaderboard. */
export async function getMemberLeaderboard(): Promise<MemberStatRow[]> {
  const supabase = getSupabase();
  const [members, { data: reviews }, { data: meetings }] = await Promise.all([
    getMembers(),
    supabase.from("reviews").select("member_id, rating, finished, book_id"),
    supabase.from("meetings").select("book_id, picked_by"),
  ]);

  const revs = (reviews as {
    member_id: string;
    rating: number | null;
    finished: boolean;
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

  const picksByMember = new Map<string, string[]>();
  for (const m of (meetings as { book_id: string | null; picked_by: string | null }[]) ?? []) {
    if (!m.picked_by || !m.book_id) continue;
    const arr = picksByMember.get(m.picked_by) ?? [];
    arr.push(m.book_id);
    picksByMember.set(m.picked_by, arr);
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
      avg_given:
        rated.length > 0 ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : null,
      books_finished: mine.filter((r) => r.finished).length,
      picks: picks.length,
      avg_pick_rating: pickAvg,
    };
  });
}

/** Whose turn is it to pick next? Based on selection_order and past picks. */
export async function getRotation(): Promise<{
  members: Member[];
  pickCounts: Map<string, number>;
  nextUp: Member | null;
  lastPicker: Member | null;
}> {
  const supabase = getSupabase();
  const [members, { data: meetings }] = await Promise.all([
    getMembers(),
    supabase.from("meetings").select("picked_by, meeting_date").order("meeting_date", {
      ascending: true,
    }),
  ]);
  const ms = (meetings as { picked_by: string | null; meeting_date: string }[]) ?? [];
  const pickCounts = new Map<string, number>();
  for (const m of members) pickCounts.set(m.id, 0);
  let lastPickerId: string | null = null;
  for (const m of ms) {
    if (m.picked_by) {
      pickCounts.set(m.picked_by, (pickCounts.get(m.picked_by) ?? 0) + 1);
      lastPickerId = m.picked_by;
    }
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
