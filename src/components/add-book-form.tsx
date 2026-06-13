"use client";

import { useState } from "react";
import { addBook } from "@/app/actions";
import type { BookSearchResult } from "@/lib/types";
import { btn, inputClass } from "@/lib/utils";
import { BookCover } from "./book-cover";

const empty: BookSearchResult = {
  title: "",
  author: "",
  page_count: null,
  genres: [],
  cover_url: null,
  description: null,
  isbn: null,
};

export function AddBookForm({ disabled }: { disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<BookSearchResult>(empty);
  const [open, setOpen] = useState(false);

  async function runSearch() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/book-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } finally {
      setSearching(false);
    }
  }

  function choose(r: BookSearchResult) {
    setSelected(r);
    setResults([]);
    setQuery(r.title);
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Search Google Books</label>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="Title or author…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
          />
          <button type="button" className={btn("outline")} onClick={runSearch} disabled={searching}>
            {searching ? "…" : "Search"}
          </button>
        </div>
        {results.length > 0 && (
          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-md border border-border bg-card p-1">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => choose(r)}
                className="flex w-full items-center gap-3 rounded-md p-2 text-left transition hover:bg-muted"
              >
                <BookCover url={r.cover_url} title={r.title} width={36} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.author ?? "Unknown"} {r.page_count ? `· ${r.page_count}p` : ""}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <form action={addBook} className="space-y-3">
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm text-primary hover:underline"
          >
            …or enter details manually
          </button>
        )}

        {(open || selected.title) && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Title *</label>
              <input
                name="title"
                required
                className={inputClass}
                defaultValue={selected.title}
                key={`title-${selected.title}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Author</label>
              <input
                name="author"
                className={inputClass}
                defaultValue={selected.author ?? ""}
                key={`author-${selected.title}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Pages</label>
              <input
                name="page_count"
                type="number"
                className={inputClass}
                defaultValue={selected.page_count ?? ""}
                key={`pages-${selected.title}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Audiobook minutes
              </label>
              <input name="audiobook_minutes" type="number" className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Genres (comma separated)
              </label>
              <input
                name="genres"
                className={inputClass}
                defaultValue={selected.genres.join(", ")}
                key={`genres-${selected.title}`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                className={inputClass}
                defaultValue={selected.description ?? ""}
                key={`desc-${selected.title}`}
              />
            </div>
            <input type="hidden" name="cover_url" value={selected.cover_url ?? ""} />
            <input type="hidden" name="isbn" value={selected.isbn ?? ""} />
            <div className="sm:col-span-2">
              <button type="submit" className={btn("primary")} disabled={disabled}>
                Add to backlog
              </button>
              {disabled && (
                <span className="ml-3 text-xs text-warning">Pick who you are first.</span>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
