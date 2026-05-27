# Speaking Feature — Design Spec

**Date:** 2026-05-27  
**Status:** Approved  
**Scope:** Full Speaking skill — hub page, detail page (Listen + Practice tabs), recording session, in-browser MP3 mixing, CDN audio pipeline, IndexedDB persistence.

---

## 1. Architecture Overview

### Routes
| Route | Description |
|---|---|
| `/speaking` | Hub — lesson grid with filters, search, sort |
| `/speaking/[lessonId]` | Detail — Listen tab + Practice tab |

### Data flow
```
public/lessons/speaking/{level}/*.json   (lesson files)
public/lessons/speaking/index.json       (hub meta)
        ↓ fetch on demand
src/lib/lessons/speaking-schema.ts       (Zod validation)
src/lib/lessons/load.ts                  (useSpeakingLessonsIndex hook)
        ↓
[Hub page]  →  lesson card grid
[Detail page]
  Listen tab  →  TranscriptPlayer (reused from listening)
  Practice tab → PracticeSession component
        ↓ MediaRecorder + Web Audio
src/lib/audio/recorder.ts               (silence detection)
src/lib/audio/mixer.ts + lame-worker.ts (concat + MP3 encode)
        ↓
src/lib/db/  (Dexie v6 speakingRecordings table)
```

### Pre-generated audio
- Python script (`scripts/generate-audio.py` extended with `--kind speaking`).
- Per lesson: sentences `sN.mp3`, hint vocab `vN.mp3`, hint starters `hN.mp3`.
- Hosted on `english-learning-audio` GitHub CDN under `speaking-{level}-NNN/`.
- Same incremental hash-based manifest as listening.
- New skill `generate-speaking-lesson` drives JSON generation + audio generation + index rebuild.

---

## 2. Lesson JSON Schema

### Full lesson file
```jsonc
{
  "id": "speaking-a1-001",
  "level": "A1",
  "title": "Ordering coffee",
  "summary": "A customer orders an iced latte at a café.",
  "topic": "Ordering at a café",
  "tags": ["Daily life", "Café", "Small talk"],

  // Exactly 2 characters, both en-US voices (any M/F combo allowed)
  "characters": ["Customer", "Barista"],
  "voices": {
    "Customer": { "sex": "female", "age": "adult", "accent": "en-US", "edgeVoice": "en-US-JennyNeural" },
    "Barista":  { "sex": "male",   "age": "adult", "accent": "en-US", "edgeVoice": "en-US-GuyNeural" }
  },

  // Sample dialogue — format always "dialogue"
  "body": [
    { "speaker": "Customer", "text": "Hi, can I get an iced latte, please?" },
    { "speaker": "Barista",  "text": "Sure. What size?" }
  ],

  // Per-sentence audio anchors (contiguous s1..sN; grouped sentences must
  // concatenate back to body[].text — same invariant as listening)
  "sentences": [
    { "id": "s1", "speaker": "Customer", "text": "Hi, can I get an iced latte, please?", "durationMs": 2800 },
    { "id": "s2", "speaker": "Barista",  "text": "Sure.",      "durationMs": 900  },
    { "id": "s3", "speaker": "Barista",  "text": "What size?", "durationMs": 1100 }
  ],

  // Practice hints (unique ids h1..hK)
  "hintStarters": [
    { "id": "h1", "text": "Could I have a …, please?" },
    { "id": "h2", "text": "I'd like it with …" }
  ],

  // Hint vocabulary (unique ids v1..vM; includes IPA pronunciation for US accent)
  "hintVocab": [
    { "id": "v1", "phrase": "iced latte", "meaningVi": "cà phê sữa đá kiểu Ý",
      "pronunciation": "/aɪst ˈlɑː.teɪ/" },
    { "id": "v2", "phrase": "to-go",      "meaningVi": "mang đi" }
  ],

  // Annotation highlights shown in Listen tab transcript
  "annotations": [
    { "phrase": "iced latte", "meaningVi": "cà phê sữa đá", "pronunciation": "/aɪst ˈlɑː.teɪ/" }
  ],
  "grammarNotes": [
    { "title": "Polite requests with 'can I'",
      "bodyVi": "Dùng 'Can I …, please?' để yêu cầu lịch sự.",
      "bodyEn": "Use 'Can I …, please?' to ask politely." }
  ],
  "translationVi": "Khách: Cho tôi một ly cà phê sữa đá nhé… Nhân viên: Vâng. Cỡ nào ạ?",
  "criticalThinkingQuestion": "Why might tone matter as much as words when ordering at a café?",

  // CDN pointers
  "audio": {
    "cdnBase": "https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main/speaking-a1-001",
    "manifestVersion": 1
  },
  "totalDurationMs": 23400,
  "accents": ["en-US"]
}
```

### Schema invariants (validated by Zod `speakingLessonSchema`)
1. `characters.length === 2`; both values must be keys of `voices`.
2. All `voices[*].accent === "en-US"`.
3. Every `sentences[].speaker` ∈ `voices`.
4. `sentences[].id` contiguous `s1..sN`.
5. Grouped-by-speaker sentences concatenate back to `body[].text` (same logic as listening).
6. `hintStarters[].id` unique `h1..hK`; `hintVocab[].id` unique `v1..vM`.
7. `accents` field equals `["en-US"]` (derived from voices).

### Hub index meta (`index.json` entry)
```jsonc
{
  "id": "speaking-a1-001",
  "level": "A1",
  "title": "Ordering coffee",
  "summary": "A customer orders an iced latte at a café.",
  "topic": "Ordering at a café",
  "tags": ["Daily life", "Café", "Small talk"],
  "characters": ["Customer", "Barista"],
  "totalDurationMs": 23400,
  "sentenceCount": 3
}
```

### CDN folder layout per lesson
```
speaking-a1-001/
  sentences/s1.mp3 … sN.mp3      (dialogue lines)
  vocab/v1.mp3 … vM.mp3           (hint vocab words)
  starters/h1.mp3 … hK.mp3       (hint starters)
  manifest.json                   (hash cache for incremental rebuild)
```

---

## 3. Hub Page (`/speaking`)

**Clone of** `src/app/(app)/reading/page.tsx` pointing at speaking data.

### Filters
- Level chips: A1 / A2 / B1 / B2 / C1 (same colours as reading).
- Favorites toggle (reuses `bookmarks` Dexie table — `lessonId`-keyed).
- **Learning** — lesson has a saved `speakingSessionDraft` (in-progress session).
- **Learned** — lesson has at least one `speakingRecording` in IndexedDB.
- Tag filter row, search (Fuse.js + highlights), sort (Name / Newest / Random).

### Lesson card (`src/components/speaking/lesson-card.tsx`)
- Title · Level pill · Summary (2-line clamp).
- Bottom meta: characters badge (`Customer · Barista`) · duration (`1m 23s`) · turn count (`12 turns`).
- Bookmark star (top-right).
- Status badge: **Learned** (green) | **Learning** (sky) | none.

### Header counter
`X / total completed` — counts lessons with at least one recording.

### New hooks (in `src/lib/lessons/load.ts` / `src/lib/db/`)
- `useSpeakingLessonsIndex()` — fetches and caches `index.json`.
- `useSpeakingRecordingsByLesson()` — `Map<lessonId, SpeakingRecording>` latest per lesson.
- `useSpeakingSessionDrafts()` — `Set<lessonId>` for in-progress drafts.

---

## 4. Detail Page (`/speaking/[lessonId]`)

### Layout
- `max-w-6xl` centered; **two-column on desktop** (main left, sidebar right, `1fr / 320px`); **stacked on mobile**.
- Sticky header bar.

### Header bar
- Back link · Title · Level pill.
- **Role dropdown** `"You are: [Customer ▾]"` — shows both characters with their voice label (`Jenny (F)` / `Guy (M)`). Default = `characters[0]`. Swapping roles while turns exist prompts "Clear recorded turns and swap?" confirm dialog.
- **Tab switcher**: `Listen` | `Practice`.

---

### Tab: Listen

Reuses `TranscriptPlayer` from `src/components/listening/transcript-player.tsx` with speaking lesson adapter.

- Per-sentence playback with auto-scroll and speaker avatar (👩/👨 + name).
- CDN URL pattern: `{cdnBase}/sentences/{sentenceId}.mp3`.
- Inline annotation tooltips (Vietnamese gloss + IPA) — same `PassageAnnotation` component.
- Collapsible **Vietnamese translation** panel.
- Collapsible **Grammar notes** panel.

---

### Tab: Practice

#### Overview
Turn-by-turn interactive session. All turns pre-listed; upcoming turns grayed out.

#### State machine
```
idle → role_selected → in_session(turnIndex) → done → mixed
```

#### Turn card — System turn
1. Card becomes active; MP3 auto-plays (`{cdnBase}/sentences/{sentenceId}.mp3`).
2. Waveform playback bar animates.
3. On `ended` → advance to next turn.
4. User may click to pause/replay.

#### Turn card — User turn
1. Card becomes active; shows script text + **▶ Play model** button (plays the user character's MP3(s) for this turn — all sentences belonging to this body turn played sequentially via `{cdnBase}/sentences/{sN}.mp3`; lets them hear the pronunciation before recording).
   `expectedDurationMs` for the recorder hard cap = sum of `durationMs` for all sentences belonging to this body turn.
2. **🎙 Record** button. On click:
   - Requests microphone permission (if not already granted).
   - Starts `recorder.ts`; mic visualizer (animated bars).
3. Auto-stop triggers when either:
   - 3 seconds of silence after first speech detected (user requirement).
   - Hard cap: `max(8000 ms, expectedDurationMs × 2.5)` elapsed.
4. Mini controls appear:
   - **⟳ Re-record** — discards blob, restarts step 2.
   - **▶ Play back** — plays the captured blob.
   - **→ Continue** — auto-fires after 2 seconds if untouched.
5. Recorded `Blob` stored in component state keyed by turn index.

#### Completion
After all turns recorded, **Mix & Save** button appears.

**Mix flow:**
1. Progress overlay: "Mixing your recording…"
2. `mixer.ts`: decode all blobs → concat with 300ms gaps → lamejs Worker → MP3 Blob.
3. Save `SpeakingRecording` to Dexie `speakingRecordings`.
4. Save/clear `speakingSessionDraft` (mark done).
5. Show **Result card**:
   - Inline `<audio>` player.
   - Total duration.
   - **⬇ Download .mp3** (triggers `URL.createObjectURL` + `<a download>`).
   - "✓ Saved to My recordings."
6. Critical thinking question renders below result card.

#### Restart session
Button in header: "Restart session" — clears all recorded blobs and session draft (confirm dialog).

---

### Sidebar
- **Hint vocab**: phrase · IPA pronunciation · Vietnamese gloss · **▶** button (plays `{cdnBase}/vocab/{id}.mp3`).
- **Hint starters**: text · **▶** button (plays `{cdnBase}/starters/{id}.mp3`).
- **Grammar notes**: collapsible accordion (same style as reading).

---

### My Recordings panel (below Practice section)
- Lists saved recordings for this lesson: date, role played, duration, **▶** play, **⬇** download, **🗑** delete.
- Displayed when `speakingRecordings` table has entries for this lesson.

---

## 5. Technical: Recording & Mixing

### `src/lib/audio/recorder.ts`

```
open mic → AudioContext + AnalyserNode (FFT 256, smoothing 0.8)
  ↓
calibrate noise floor: sample RMS every 100ms for first 500ms
threshold = noiseRms + 12dB  (≈ ×4 linear)
  ↓
MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
  ↓
wait for speech: RMS > threshold sustained ≥ 100ms → speechDetected = true
  ↓
track silence: rolling 100ms ticks
  silentTicks ≥ 30 (= 3000ms) AND speechDetected → auto stop
  elapsed ≥ max(8000, expectedMs × 2.5) → force stop
  ↓
returns Blob (webm/opus)
```

Public API:
```ts
interface RecorderHandle {
  start(): Promise<void>;
  stop(): void;                       // manual stop
  onStop: (blob: Blob) => void;
  getRmsLevel(): number;              // 0–1, poll each animation frame
  dispose(): void;
}
createRecorder(opts: { expectedDurationMs: number }): RecorderHandle
```

### `src/lib/audio/mixer.ts`

Inputs: ordered array of `{ kind: "system" | "user"; blob: Blob }`.

```
1. AudioContext.decodeAudioData(blob) for every chunk → Float32Array mono 44100 Hz
2. Build output buffer:
   for each chunk:
     copy samples
     append 300ms silence gap (except after last chunk)
3. postMessage({ pcm: Float32Array, sampleRate: 44100 }) to LameWorker
4. Worker encodes mono 128kbps MP3 → ArrayBuffer
5. return new Blob([arrayBuffer], { type: "audio/mpeg" })
```

### `src/lib/audio/lame-worker.ts` (Web Worker)

```ts
importScripts("lamejs.min.js"); // ~70KB
onmessage = ({ data: { pcm, sampleRate } }) => {
  const encoder = new lamejs.Mp3Encoder(1, sampleRate, 128);
  // encode in 1152-sample blocks
  // …
  postMessage({ mp3: concatenatedUint8Array });
};
```

`lamejs` added to `package.json`; Worker bundled via Next.js `new Worker(new URL(..., import.meta.url))`.

---

## 6. Database Schema (Dexie v6)

**New type** in `src/lib/db/types.ts`:
```ts
export type SpeakingRecording = {
  id: string;           // nanoid
  profileId: string;
  lessonId: string;
  role: string;         // character name the user played
  completedAt: number;  // Unix ms
  durationMs: number;
  turnCount: number;
  mp3Blob: Blob;        // stored locally only, never uploaded
};

export type SpeakingSessionDraft = {
  profileId: string;
  lessonId: string;
  role: string;
  turnBlobs: Record<number, Blob>;  // turnIndex → recorded Blob
  updatedAt: number;
};
```

**Dexie version 6** in `src/lib/db/client.ts`:
```ts
this.version(6).stores({
  // … all previous tables unchanged …
  speakingRecordings:    "id, [profileId+lessonId], completedAt",
  speakingSessionDrafts: "[profileId+lessonId]",
});
```

**New hooks:**
- `src/lib/db/use-speaking-recordings.ts` — `useSpeakingRecordings(lessonId)` (list for detail page) and `useSpeakingRecordingsByLesson()` (map for hub).
- `src/lib/db/use-speaking-session-draft.ts` — `useSpeakingSessionDraft(lessonId)` for save/restore in-progress session.

---

## 7. New Components

| File | Responsibility |
|---|---|
| `src/components/speaking/lesson-card.tsx` | Hub card with characters badge + status |
| `src/components/speaking/sample-listen-tab.tsx` | Listen tab wrapper around TranscriptPlayer |
| `src/components/speaking/practice-session.tsx` | Full Practice tab state machine |
| `src/components/speaking/turn-row.tsx` | Single turn (system or user) |
| `src/components/speaking/recorder-button.tsx` | Record / stop button with state |
| `src/components/speaking/voice-visualizer.tsx` | Animated mic RMS bars |
| `src/components/speaking/hint-panel.tsx` | Sidebar: vocab + starters + grammar |
| `src/components/speaking/mix-result-card.tsx` | Post-mix result: player + download |
| `src/components/speaking/recordings-history.tsx` | My recordings list with play/download/delete |

---

## 8. Scripts & Skill

### `scripts/generate-audio.py` extension
- New `--kind speaking` flag (default: `listening`).
- When `speaking`: reads `sentences[]`, `hintVocab[]`, `hintStarters[]` from JSON.
- Generates `sentences/sN.mp3`, `vocab/vN.mp3`, `starters/hN.mp3`.
- Same manifest, hash-cache, and git-push logic.

### New skill `generate-speaking-lesson`
Parallel to `generate-listening-lesson`. On invocation:
1. Generate lesson JSON (topic, dialogue 12–20 turns, hints, annotations, grammar notes, translationVi, critical thinking).
2. All voices must be `en-US`; assign voices by character gender.
3. Run `scripts/generate-audio.py --kind speaking` for each new lesson.
4. Rebuild `public/lessons/speaking/index.json`.

---

## 9. File Locations Summary

```
src/
  app/(app)/speaking/
    page.tsx                     ← hub
    [lessonId]/page.tsx          ← detail
  components/speaking/
    lesson-card.tsx
    sample-listen-tab.tsx
    practice-session.tsx
    turn-row.tsx
    recorder-button.tsx
    voice-visualizer.tsx
    hint-panel.tsx
    mix-result-card.tsx
    recordings-history.tsx
  lib/
    audio/
      recorder.ts
      mixer.ts
      lame-worker.ts
    db/
      use-speaking-recordings.ts
      use-speaking-session-draft.ts
      queries-speaking.ts
    lessons/
      speaking-schema.ts         ← Zod schema (or added to schema.ts)
      load.ts                    ← useSpeakingLessonsIndex() added here
public/lessons/speaking/
  index.json
  a1/ a2/ b1/ b2/ c1/
scripts/
  generate-audio.py              ← extended with --kind speaking
~/.claude/skills/
  generate-speaking-lesson/      ← new skill
```
