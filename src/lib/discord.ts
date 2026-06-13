import "server-only";

/**
 * Post a message to the club's Discord channel via webhook. No-op (returns
 * false) when DISCORD_WEBHOOK_URL is not configured, so the app works fine
 * without it. Failures are swallowed so notifications never break a mutation.
 */
export async function notifyDiscord(content: string): Promise<boolean> {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "2 Books 2 Furious",
        content,
        allowed_mentions: { parse: [] },
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function isDiscordConfigured(): boolean {
  return Boolean(process.env.DISCORD_WEBHOOK_URL);
}
