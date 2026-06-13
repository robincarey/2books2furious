import "server-only";

export interface AiRecommendation {
  title: string;
  author: string;
  why: string;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

interface RatedBook {
  title: string;
  author: string | null;
  genres: string[];
  pages: number | null;
  avgRating: number | null;
}

/**
 * Ask an LLM for book recommendations based on the club's (or a member's)
 * reading history. Returns [] when OPENAI_API_KEY is not set or on any error,
 * so the feature stays optional.
 */
export async function getRecommendations(opts: {
  audience: string;
  history: RatedBook[];
  avoidTitles: string[];
}): Promise<AiRecommendation[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const historyLines = opts.history
    .map(
      (b) =>
        `- "${b.title}"${b.author ? ` by ${b.author}` : ""} | genres: ${
          b.genres.join(", ") || "n/a"
        } | pages: ${b.pages ?? "?"} | avg rating: ${
          b.avgRating != null ? b.avgRating.toFixed(2) : "unrated"
        }`,
    )
    .join("\n");

  const prompt = `You are a book recommender for a monthly sci-fi/fantasy book club of five men in their thirties. They lean sci-fi and fantasy but also enjoy thrillers and procedurals.

Recommendation audience: ${opts.audience}

Reading history with ratings (1-5):
${historyLines || "(no history yet)"}

Do NOT recommend any of these already-read/queued titles: ${opts.avoidTitles.join("; ") || "(none)"}

Recommend 5 books they are likely to love based on the patterns above. Respond with ONLY a JSON object of the form {"recommendations":[{"title":"...","author":"...","why":"one concise sentence"}]}.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return [];
    const parsed = JSON.parse(text);
    const recs = parsed?.recommendations;
    if (!Array.isArray(recs)) return [];
    return recs
      .filter((r) => r && typeof r.title === "string")
      .map((r) => ({
        title: String(r.title),
        author: String(r.author ?? ""),
        why: String(r.why ?? ""),
      }));
  } catch {
    return [];
  }
}
