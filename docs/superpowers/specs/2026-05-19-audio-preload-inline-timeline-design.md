# Audio Preload + Inline Playback Timeline

**Date:** 2026-05-19  
**Status:** Approved

## Problem

1. Audio preloads only 5 sentences ahead (`PRELOAD_AHEAD = 5`). On slow connections, the next sentence buffers while the current one is playing, causing a gap.
2. `PlayAllButton` flickers — its text cycles through "Play all (1m 8s)" → "Pause" → "Play all…" → "Pause" on every sentence boundary because `status` briefly touches `loading`.
3. The fixed bottom `PlaybackTimeline` only appears after playback starts, so the play control and the scrubber are two separate UI elements in two different positions.
4. No visual signal to the user about how much audio is buffered; seeking to an unbuffered position causes a noticeable loading gap.

## Goals

- All audio is preloaded eagerly. First 10 sentences load immediately on mount; remaining sentences queue via `requestIdleCallback` so preloading yields to UI events.
- Inline playback bar replaces `PlayAllButton` in the Transcript header — no text changes between sentences, no flicker.
- Bottom `PlaybackTimeline` appears only when the inline bar scrolls out of view (tracked via `IntersectionObserver`).
- Timeline shows a buffered-region indicator. Seeking beyond the buffered range is blocked.

## Architecture

### Store additions (`listening-audio-store.ts`)

```ts
// Buffering state
readySet: ReadonlySet<number>      // sentence indices with fully-buffered audio
markReady(index: number): void     // called by TranscriptPlayer on canplaythrough
clearReady(): void                 // called on lesson change

// Inline bar visibility (drives bottom bar show/hide)
inlineBarVisible: boolean          // default true
setInlineBarVisible(v: boolean): void
```

`markReady` creates a new `Set` to preserve Zustand's referential equality check:
```ts
markReady(index) {
  const prev = get().readySet;
  if (prev.has(index)) return;
  set({ readySet: new Set([...prev, index]) });
},
```

### TranscriptPlayer (`transcript-player.tsx`)

**Preloading strategy:**
- `IMMEDIATE_COUNT = 10` — load first 10 sentences synchronously on mount (or when lesson changes).
- Remaining sentences queued with `requestIdleCallback` in batches of `IDLE_BATCH = 5`.
- Each idle callback loads one batch then schedules the next idle callback.
- Fallback for browsers without `requestIdleCallback`: `setTimeout(cb, 50)`.

```ts
const rIC = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 50));
```

**Readiness tracking:**
- Each preloaded `Audio` element registers `oncanplaythrough = () => markReady(i)`.
- If `readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA` at creation time (already cached by browser), call `markReady(i)` synchronously.
- `clearReady()` is called inside the existing `useEffect` that clears the preload cache when `[sentences, cdnBase, manifestVersion]` change.

**No change to playback logic** — only preloading and readiness tracking are added.

### InlinePlaybackBar (`components/listening/inline-playback-bar.tsx`)

New component. Replaces `<PlayAllButton>` in `Transcript`.

**States:**

| Condition | Rendered UI |
|---|---|
| `status === "idle"` OR `mode !== "playAll"` | `▶ Play all (1m 8s)` button |
| `mode === "playAll"` AND status active | Compact scrubber |

**Compact scrubber layout:**
```
[⏸/▶]  [──────●──────────────]  0:32 / 1:08
```
- Play/pause icon button (left)
- Inline progress track with drag handle (flex-1)
- `currentMs / totalMs` time display (right, tabular-nums)
- Buffered region: lighter-tinted track segment beneath the primary fill

**No text that changes between sentences** — only the scrub position moves. Zero flicker.

**IntersectionObserver:**
```ts
const barRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  const el = barRef.current;
  if (!el) return;
  const obs = new IntersectionObserver(
    ([entry]) => setInlineBarVisible(entry.isIntersecting),
    { threshold: 0.1 }
  );
  obs.observe(el);
  return () => obs.disconnect();
}, [setInlineBarVisible]);
```

The ref wraps the outermost div of `InlinePlaybackBar`. When `isIntersecting = false`, the bottom `PlaybackTimeline` becomes visible.

### PlaybackTimeline (`components/listening/playback-timeline.tsx`)

**Render condition change:**
```ts
// Before
if (mode !== "playAll" || status === "idle" || totalMs === 0) return null;

// After
if (mode !== "playAll" || status === "idle" || totalMs === 0 || inlineBarVisible) return null;
```

**Buffered region visualization:**
- Compute `bufferedMs`: sum of `durationMs` for the longest contiguous run of ready indices starting at 0.
- Render a secondary `<div>` inside the track at `(bufferedMs / totalMs) * 100%` width with `bg-muted-foreground/30`.
- The primary fill (played) renders on top.

**Seek blocking:**
```ts
function handlePointerUp(e) {
  const ms = msFromPointer(e.clientX);
  if (ms > bufferedMs) return; // block seek to unbuffered region
  seekToGlobalMs(ms);
}
```
Keyboard navigation (`ArrowLeft/Right`) also clamps to `bufferedMs`.

The same blocking logic applies to `InlinePlaybackBar`.

### File changes summary

| File | Change |
|---|---|
| `stores/listening-audio-store.ts` | Add `readySet`, `markReady`, `clearReady`, `inlineBarVisible`, `setInlineBarVisible` |
| `components/listening/transcript-player.tsx` | Full eager preload + idle batch + `canplaythrough` → `markReady` |
| `components/listening/inline-playback-bar.tsx` | **New** — replaces `PlayAllButton` |
| `components/listening/playback-timeline.tsx` | Add `inlineBarVisible` gate + buffered-region vis + seek blocking |
| `components/listening/transcript.tsx` | Swap `<PlayAllButton>` → `<InlinePlaybackBar>` |
| `components/listening/play-all-button.tsx` | **Delete** |

## Data flow

```
page mounts
  └─ store.load() sets sentences/cdnBase
  └─ TranscriptPlayer:
       ├─ load sentences[0..9] immediately (Audio src set, preload=auto)
       ├─ queue sentences[10..] via requestIdleCallback batches
       └─ each canplaythrough → store.markReady(i)

user sees InlinePlaybackBar
  ├─ idle: "▶ Play all (1m 8s)" button
  └─ clicks → store.playAll()
       └─ TranscriptPlayer plays, status cycles loading→playing
       └─ InlinePlaybackBar: scrubber moves smoothly, no text changes

user scrolls down
  └─ IntersectionObserver: inlineBarVisible = false
  └─ PlaybackTimeline (bottom bar) renders

user drags timeline to unbuffered region
  └─ bufferedMs check → seek blocked, handle stays in place
```

## Edge cases

- **Lesson with no `totalDurationMs`**: inline bar stays as disabled "audio pending" button (same as current `PlayAllButton` behaviour).
- **Browser without `requestIdleCallback`**: falls back to `setTimeout(cb, 50)`.
- **Audio already browser-cached**: `readyState === HAVE_ENOUGH_DATA` at creation → `markReady` called synchronously, buffered region fills instantly.
- **Lesson change mid-playback**: store `stop()` + `clearReady()` + cache clear already triggered by existing `useEffect([sentences, cdnBase, manifestVersion])`.
