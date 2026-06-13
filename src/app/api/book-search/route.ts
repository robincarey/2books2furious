import { NextResponse } from "next/server";
import { searchBooks } from "@/lib/books-api";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json({ results: [] });
  const results = await searchBooks(q);
  return NextResponse.json({ results });
}
