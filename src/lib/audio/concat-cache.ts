import { db } from "@/lib/db/client";
import { buildConcatTrack, type ConcatTrack } from "./concat-track";

// In-memory promise dedup so concurrent callers (e.g. the page kicking off a
// background build + the user clicking Play) share one build, never two.
const inflight = new Map<string, Promise<ConcatTrack>>();

/**
 * Return the cached gapless "Play all" track for a lesson, building + persisting
 * it on first use. Safe to call eagerly on page load (pre-warms the cache).
 */
export async function getOrBuildConcatTrack(
  lessonId: string,
  cdnBase: string,
  sentenceIds: string[],
  manifestVersion: number,
): Promise<ConcatTrack> {
  const key = `${lessonId}@${manifestVersion}`;

  const existing = inflight.get(key);
  if (existing) return existing;

  const work = (async () => {
    try {
      const cached = await db.audioConcat.get(key);
      if (cached) {
        return { blob: cached.blob, offsetsMs: cached.offsetsMs, totalMs: cached.totalMs };
      }
    } catch {
      // Dexie unavailable (private mode etc.) — fall through to building uncached.
    }

    const track = await buildConcatTrack(cdnBase, sentenceIds, manifestVersion);

    try {
      await db.audioConcat.put({ key, ...track, createdAt: Date.now() });
    } catch {
      // Persisting is best-effort; the in-memory result is still returned.
    }
    return track;
  })();

  inflight.set(key, work);
  try {
    return await work;
  } finally {
    inflight.delete(key);
  }
}
