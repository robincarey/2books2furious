export type BookStatus = "suggested" | "scheduled" | "read";
export type RsvpStatus = "going" | "maybe" | "out";

export interface Member {
  id: string;
  name: string;
  color: string;
  selection_order: number;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string | null;
  page_count: number | null;
  audiobook_minutes: number | null;
  genres: string[];
  cover_url: string | null;
  description: string | null;
  isbn: string | null;
  suggested_by: string | null;
  status: BookStatus;
  created_at: string;
}

export interface Meeting {
  id: string;
  book_id: string | null;
  meeting_date: string;
  location: string | null;
  picked_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface Review {
  id: string;
  book_id: string;
  member_id: string;
  finished: boolean;
  dnf: boolean;
  rating: number | null;
  body: string | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  meeting_id: string | null;
  book_id: string | null;
  member_id: string | null;
  parent_id: string | null;
  body: string;
  progress_percent: number | null;
  created_at: string;
}

export interface ReadingProgress {
  id: string;
  member_id: string;
  book_id: string;
  percent: number;
  updated_at: string;
}

export interface Rsvp {
  id: string;
  meeting_id: string;
  member_id: string;
  status: RsvpStatus;
  updated_at: string;
}

export interface BookWithExtras extends Book {
  suggester?: Member | null;
  votes: number;
  voted_by_me: boolean;
  avg_rating: number | null;
  review_count: number;
}

export interface BookSearchResult {
  title: string;
  author: string | null;
  page_count: number | null;
  genres: string[];
  cover_url: string | null;
  description: string | null;
  isbn: string | null;
}
