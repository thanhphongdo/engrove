# Listening lessons — design

**Date:** 2026-05-19
**Status:** Approved, pending implementation plan
**Companion skill:** `generate-listening-lesson` (to be created at `.claude/skills/generate-listening-lesson/SKILL.md`)

## 1. Goal

Add a Listening section to the english-learning app that mirrors the existing Reading section in structure (hub → detail, MC + cloze quizzes, annotations, grammar notes, translation, critical thinking, attempt history, lesson notes) but plays sentence-level audio generated offline with Edge-TTS. Audio is hosted in a separate public GitHub repo and served via the jsDelivr CDN at runtime.

## 2. Architecture

Three artifacts:

1. **Lesson JSON** at `public/lessons/listening/{level}/listening-{level}-NNN.json` — same shape as a reading lesson plus four listening-specific fields: `voices`, `sentences`, `accents`, `audio`. Durations are filled in later by the TTS script.
2. **Python TTS script** at `scripts/generate-audio.py` (uv-managed, single file, inline metadata). Reads a lesson, generates one MP3 per sentence with Edge-TTS, measures each duration with `mutagen`, batches them into one commit, pushes to `github.com/thanhphongdo/english-learning-audio`. Idempotent via per-sentence content hash in a `manifest.json` published alongside the MP3s.
3. **Frontend** at `src/app/(app)/listening/` — hub + detail pages. Detail page replaces the reading `<Passage>` with a `<Transcript>` block (hidden by default, per-sentence ▶ buttons, sentence highlighting during playback) and adds a single shared `<audio>` element driven by a Zustand store. All other reading components (quiz, cloze, grammar notes, hint settings, attempts, notes) are reused as-is.

Three approaches considered for the **frontend audio engine**:

- **A: Single `<audio>` + manual src swap (chosen).** One element, swap `src` per sentence, listen for `ended` to advance in play-all. No library. Browser caches each MP3 (jsDelivr sets long Cache-Control).
- **B: Pre-fetch all sentences into Blob URLs.** Faster transitions, but memory cost and first-play delay. Overkill when jsDelivr is already fast.
- **C: HLS / streaming.** Way too heavy for short MP3s.

Chose A.

## 3. Lesson JSON schema

Listening keeps the entire reading shape and adds these top-level fields:

```json
{
  "id": "listening-b1-007",
  "level": "B1",
  "title": "The bridge keeper of Amsterdam",
  "summary": "...",
  "format": "dialogue",
  "body": [
    { "speaker": "Elena",  "text": "I came here to see the bridges. Most travellers don't." },
    { "speaker": "Arthur", "text": "Most people walk past them." }
  ],
  "tags": ["Craft", "City life"],

  "accents": ["en-US", "en-GB"],
  "totalDurationMs": 142000,
  "voices": {
    "Elena":  { "sex": "female", "age": "adult",  "accent": "en-US", "edgeVoice": "en-US-AriaNeural"   },
    "Arthur": { "sex": "male",   "age": "senior", "accent": "en-GB", "edgeVoice": "en-GB-ThomasNeural" }
  },
  "sentences": [
    { "id": "s1", "speaker": "Elena",  "text": "I came here to see the bridges.",  "durationMs": 2340 },
    { "id": "s2", "speaker": "Elena",  "text": "Most travellers don't.",            "durationMs": 1810 },
    { "id": "s3", "speaker": "Arthur", "text": "Most people walk past them.",       "durationMs": 2010 }
  ],
  "audio": {
    "cdnBase": "https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main/listening-b1-007",
    "manifestVersion": 1
  },

  "annotations": [...],
  "grammarNotes": [...],
  "translationVi": "...",
  "questions": [...],
  "cloze": { "template": "...", "blanks": [...] },
  "criticalThinkingQuestion": "..."
}
```

### Field semantics

- `voices` — one entry per distinct speaker (for paragraph format the single speaker is named `Narrator`). `edgeVoice` is the resolved Edge-TTS voice id (e.g. `en-US-AriaNeural`), randomly picked at generation time from the voice catalog bucket `[accent][age][sex]`. Once written, the speaker keeps that voice across the whole lesson.
- `sentences` — canonical playback units. IDs are `s1, s2, …, sN`, contiguous, unique within a lesson. `durationMs` is written by the TTS script and is **optional** in the schema (so a freshly-generated lesson validates before audio is built).
- `accents` — derived field equal to the unique union of `voices[*].accent`, ordered by first appearance. Surfaced in the UI as flag(s).
- `audio.cdnBase` — jsDelivr URL prefix. The runtime resolves each sentence's MP3 as `${cdnBase}/${sentence.id}.mp3`. `manifestVersion` is set to `1` at generation time and bumped manually by the skill (or the user) when a lesson's voices are changed and audio is regenerated, so the runtime can append `?v=N` to MP3 URLs and bust the CDN cache.
- `totalDurationMs` — sum of `sentences[*].durationMs`. Written by the TTS script. Optional.

### Invariants enforced by `listeningLessonSchema` (Zod + custom refinements)

1. `voices` keys are a superset of every `sentences[*].speaker` value.
2. Sentence IDs are unique and contiguous (`s1..sN`).
3. For `format: "paragraph"`, concatenating `sentences[*].text` (normalized whitespace) reproduces `body`.
4. For `format: "dialogue"`, grouping consecutive same-speaker sentences and joining their texts reproduces each `body[i].text`.
5. `accents` equals the unique union of `voices[*].accent`, ordered by first appearance.
6. Every `edgeVoice` exists in `scripts/voice-catalog.json` under its declared `[accent][age][sex]` bucket.

A separate **warning** (not error) prints when any sentence lacks `durationMs`: `⚠ {id}: audio not generated yet — run uv run scripts/generate-audio.py {id}`.

## 4. Voice catalog

Stored at `scripts/voice-catalog.json`. Curated to "popular / natural" English voices from Edge-TTS. Three accents × four age buckets × two sexes:

```json
{
  "en-US": {
    "adult":  { "female": ["AriaNeural", "JennyNeural", "MichelleNeural", "EmmaNeural", "AvaNeural", "SaraNeural"],
                "male":   ["GuyNeural", "DavisNeural", "JasonNeural", "TonyNeural", "BrianNeural", "AndrewNeural"] },
    "child":  { "female": ["AnaNeural"], "male": ["AnaNeural"] },
    "teen":   { "female": ["AriaNeural", "JennyNeural"], "male": ["GuyNeural", "BrianNeural"] },
    "senior": { "female": ["NancyNeural"], "male": ["RogerNeural", "ChristopherNeural"] }
  },
  "en-GB": {
    "adult":  { "female": ["SoniaNeural", "LibbyNeural", "OliviaNeural"],
                "male":   ["RyanNeural", "ThomasNeural", "AlfieNeural", "ElliotNeural"] },
    "child":  { "female": ["MaisieNeural"], "male": ["MaisieNeural"] },
    "teen":   { "female": ["SoniaNeural"],  "male": ["RyanNeural"] },
    "senior": { "female": ["LibbyNeural"],  "male": ["ThomasNeural"] }
  },
  "en-AU": {
    "adult":  { "female": ["NatashaNeural"], "male": ["WilliamNeural"] },
    "child":  { "female": ["NatashaNeural"], "male": ["WilliamNeural"] },
    "teen":   { "female": ["NatashaNeural"], "male": ["WilliamNeural"] },
    "senior": { "female": ["NatashaNeural"], "male": ["WilliamNeural"] }
  }
}
```

Rate per age bucket: `child` `+0%`, `teen` `+5%`, `adult` `+0%`, `senior` `-5%`. The rate is per-sentence and applied via Edge-TTS's `rate` parameter (no SSML required).

The catalog is bootstrapped on first install by `uv run scripts/bootstrap-voice-catalog.py`, which calls `edge-tts --list-voices`, filters to en-US/en-GB/en-AU, buckets the voices, and writes `scripts/voice-catalog.json`. Re-run whenever Microsoft adds or removes voices.

## 5. Python TTS script

`scripts/generate-audio.py` — uv-managed single file:

```python
# /// script
# requires-python = ">=3.11"
# dependencies = ["edge-tts>=6.1", "mutagen>=1.47", "python-dotenv>=1.0"]
# ///
```

### CLI

```
uv run scripts/generate-audio.py listening-a2-001          # one lesson
uv run scripts/generate-audio.py --level a2                # all listening-a2-* lessons
uv run scripts/generate-audio.py --all                     # every listening lesson
uv run scripts/generate-audio.py --force listening-a2-001  # ignore manifest, regen everything
uv run scripts/generate-audio.py --dry-run listening-a2-001 # print plan, no TTS, no push
```

### Upload strategy

Local clone + batch commit, **not** GitHub Contents API. One clean commit per regen ("audio: regen listening-b1-007 (3 of 18 changed)"), one HTTPS round-trip per push (not one per file). The token is injected into the remote URL only at push time:

```bash
git push https://x-access-token:${GITHUB_TOKEN}@github.com/thanhphongdo/english-learning-audio.git main
```

The cache dir `.audio-cache/` (gitignored in the app repo) holds the audio-repo clone between runs.

### Audio repo layout

```
english-learning-audio/
├── README.md                    ← auto-written on first run
├── listening-a2-001/
│   ├── manifest.json            ← [{id, hash, edgeVoice, durationMs}]
│   ├── s1.mp3
│   ├── s2.mp3
│   └── ...
├── listening-b1-007/
│   ├── manifest.json
│   └── ...
```

### Per-lesson algorithm

1. Load `public/lessons/listening/{level}/listening-{level}-NNN.json`.
2. **Fast path:** if every sentence has `durationMs` AND the audio-repo `manifest.json` has matching hashes for every sentence, exit with `unchanged`.
3. For each sentence:
   - `hash = sha256(text + "\n" + edgeVoice + "\n" + rate)`.
   - If manifest already has a row with this hash: reuse `durationMs`, skip TTS + upload.
   - Else: `edge_tts.Communicate(text, edgeVoice, rate=rate_str)` → save to `.audio-cache/english-learning-audio/{lessonId}/{sentenceId}.mp3` → measure with `mutagen.mp3.MP3(path).info.length * 1000`.
4. Write new `manifest.json` (sorted by sentence id) into the lesson folder.
5. `git add . && git commit -m "audio: regen {lessonId} ({n} of {N} changed)" && git push`.
6. Write back into the **lesson JSON in this app repo**: `sentences[i].durationMs` (every entry) + top-level `totalDurationMs`. Do **not** auto-commit the app repo — the user inspects and commits.

### Retry and resumption

- Per-sentence TTS retries 3× with backoff (1s, 4s, 16s) on Edge-TTS failures.
- A sentence that ultimately fails aborts that lesson; the manifest is only updated for successful sentences. Re-running picks up where it left off.

### `.env`

```
# scripts/.env  (gitignored)
GITHUB_TOKEN=ghp_xxx                              # classic PAT `repo` scope OR fine-grained `content:write` on the audio repo
AUDIO_REPO=thanhphongdo/english-learning-audio
AUDIO_REPO_BRANCH=main
AUDIO_CACHE_DIR=.audio-cache
```

Committed companion: `scripts/.env.example` with the same keys and empty values.

### First-run bootstrap

If the audio repo doesn't exist yet, the script:

1. Verifies the token with `GET /user`.
2. Checks if `thanhphongdo/english-learning-audio` exists.
3. If not, prompts `audio repo not found. create it now as public? [y/N]`. On `y`, calls `POST /user/repos` with `{name, private: false, auto_init: true}`.
4. Clones into `.audio-cache/` and writes an initial `README.md`.

## 6. Frontend

### Routes

```
src/app/(app)/listening/page.tsx              ← hub (replaces ComingSoon)
src/app/(app)/listening/[lessonId]/page.tsx   ← detail
```

The hub is structurally identical to the reading hub — same `FilterChipRow`, `TagFilterRow`, `LessonSearch`, `SortSelect`, status chips, layout. Only the lesson loader hook, the route base (`/listening`), and the card differ.

### Type model

A shared common base, two concrete types. Reading code keeps using its current `Lesson`; listening code uses `ListeningLesson`. Quiz components are narrowed to consume only the fields they actually read.

```ts
type LessonCommon = {
  id: string; level: CefrLevel; title: string; summary: string;
  tags: string[]; annotations: Annotation[]; grammarNotes: GrammarNote[];
  translationVi: string; questions: Question[]; cloze?: ClozeQuiz;
  criticalThinkingQuestion?: string;
};
type Accent = "en-US" | "en-GB" | "en-AU";
type VoiceProfile = {
  sex: "female" | "male";
  age: "child" | "teen" | "adult" | "senior";
  accent: Accent;
  edgeVoice: string;
};
type Sentence = { id: string; speaker: string; text: string; durationMs?: number };

type ReadingLesson = LessonCommon & (
  | { format: "paragraph"; body: string }
  | { format: "dialogue"; body: DialogueTurn[] }
);

type ListeningLesson = LessonCommon & (
  | { format: "paragraph"; body: string }
  | { format: "dialogue"; body: DialogueTurn[] }
) & {
  accents: Accent[];
  totalDurationMs?: number;
  voices: Record<string, VoiceProfile>;
  sentences: Sentence[];
  audio: { cdnBase: string; manifestVersion: number };
};

export type Lesson = ReadingLesson;  // back-compat alias
```

### New components

```
src/components/listening/lesson-card.tsx               ← clone of reading card + flags + duration
src/components/listening/transcript.tsx                ← replaces <Passage> for listening
src/components/listening/sentence-row.tsx              ← one sentence: ▶ button + highlight + annotations
src/components/listening/transcript-player.tsx         ← hidden <audio>, subscribes to store
src/components/listening/play-all-button.tsx           ← top-of-transcript control
src/components/listening/show-transcript-toggle.tsx    ← reveals/hides sentences
src/components/ui/accent-flag.tsx                      ← shared primitive: accent → 🇺🇸🇬🇧🇦🇺
src/stores/listening-audio-store.ts                    ← Zustand: state machine
```

### Audio store (Zustand)

```ts
type AudioStatus = "idle" | "loading" | "playing" | "paused" | "error";
type PlayMode = "single" | "playAll";

interface ListeningAudioStore {
  lessonId: string | null;
  cdnBase: string | null;
  sentences: Sentence[];
  currentIndex: number;
  status: AudioStatus;
  mode: PlayMode | null;

  playSingle(lessonId: string, cdnBase: string, sentences: Sentence[], index: number): void;
  playAll(lessonId: string, cdnBase: string, sentences: Sentence[], fromIndex?: number): void;
  pause(): void;
  resume(): void;
  stop(): void;
  advanceOnEnded(): void;
}
```

`<TranscriptPlayer>` mounts one `<audio>` element high in the detail page and reacts to store transitions via `useEffect`:

- Status transitions to `loading` → set `audio.src = ${cdnBase}/${sentences[currentIndex].id}.mp3`, call `.play()` once `canplay` fires, then set status to `playing`.
- `ended` event → call `advanceOnEnded()`:
  - In `single` mode: set status `idle`, clear `currentIndex` (highlight goes away).
  - In `playAll` mode: if `currentIndex < sentences.length - 1`, increment + loop; else stop.
- `error` event → status `error` + toast.
- Route unmount → cleanup effect calls `stop()`.

Interaction rules:

- `playSingle` while another sentence is playing or paused: stops the current playback and starts the new sentence from the beginning in `single` mode.
- `playSingle` on the currently-paused sentence: equivalent to `resume()`.
- `pause` toggles via the `Play all` button (which renders as `Pause` while `status === "playing"`). Per-sentence rows do not render a pause control; the player-level button is the single source.
- `playAll` from idle starts at sentence 0; from a paused state, resumes from `currentIndex`.

### Transcript visual states

State 1 — hidden (default):

```
┌─ Transcript ─────────────────────────────────────┐
│  ▶ Play all (1m 27s)         ⌄ Show transcript   │
│                                                   │
│  🎧 Listen first, then reveal the transcript.    │
└───────────────────────────────────────────────────┘
```

State 2 — shown, idle:

```
┌─ Transcript ─────────────────────────────────────┐
│  ▶ Play all (1m 27s)         ⌃ Hide transcript   │
│                                                   │
│  Elena   ▶ I came here to see the bridges.       │
│  Elena   ▶ Most travellers don't.                │
│  Arthur  ▶ Most people walk past them.           │
└───────────────────────────────────────────────────┘
```

State 3 — shown, sentence 2 playing:

```
┌─ Transcript ─────────────────────────────────────┐
│  ⏸ Pause                      ⌃ Hide transcript  │
│                                                   │
│  Elena      I came here to see the bridges.      │
│  Elena   ▌▶ Most travellers don't.               │  ← highlight bg + animated icon
│  Arthur   ▶ Most people walk past them.          │
└───────────────────────────────────────────────────┘
```

Annotations and translation toggles from `HintSettingsPopover` still apply to each sentence's text (via the existing `splitWithAnnotations` + `<PassageAnnotation>` pipeline).

The "Show transcript" toggle is local component state (`useState`), defaulting to hidden. Per-visit, not persisted to preferences in v1 (YAGNI).

### Hub card

```
┌──────────────────────────────────────────────────┐
│ [A2] 🇺🇸 · 1m 27s · 12 sentences                  │
│ The night the lights went out                     │
│ A child remembers an hour without electricity     │
│ #Memory #City life                                │
└──────────────────────────────────────────────────┘
```

Multi-accent example:

```
[B1] 🇺🇸🇬🇧 · 2m 22s · 18 sentences
The bridge keeper of Amsterdam
A US tourist talks to a senior British bridge keeper about a dying craft.
#Craft #City life
```

When `totalDurationMs` is missing (audio not yet generated) the card shows a small `audio pending` badge instead of the duration.

### Detail page header

Same shell as the reading detail header. Adds accent flag(s) and total duration next to the level chip:

```
← Back to Listening
The bridge keeper of Amsterdam
[B1] 🇺🇸🇬🇧 · 2m 22s · 18 sentences · Best 8/10 (3 attempts)
★ Bookmark · ⏱ Timer · 🎚 Hints · ⊟ Layout
```

### Index file

`public/lessons/listening/index.json` is generated by `scripts/rebuild-indexes.mjs` (extracted from the reading skill's inline `node -e` and generalized to walk both `reading/` and `listening/`). Listening entries carry `accents`, `totalDurationMs`, and `sentenceCount` in addition to the reading entry fields.

### Loader changes

`src/lib/lessons/load.ts` is extended:

- Regex now matches `^(reading|listening)-(a1|a2|b1|b2|c1)-`. The kind segment routes to the right folder.
- New hooks: `useListeningLessonsIndex()`, `useListeningLesson(id)`. Same `useQuery` skeleton as the reading hooks. The existing reading hooks keep their existing names; no breaking change.

### Cleanup on navigation

Detail page mounts the `<TranscriptPlayer>` inside the section. Its cleanup effect calls `store.stop()` so navigating between lessons or back to the hub silences playback immediately.

## 7. Validator

`scripts/validate-lessons.mjs`:

- Walks both `public/lessons/reading/` and `public/lessons/listening/`.
- Listening lessons run through `listeningLessonSchema`. Custom refinements enforce the six invariants in §3.
- Missing `durationMs` on any sentence → **warning** (still validates).
- Final output:
  - `✓ N reading + M listening lessons validated` on success.
  - `✗ {file}: {message}` per failure (existing format extended).

## 8. New skill — `generate-listening-lesson`

Lives at `.claude/skills/generate-listening-lesson/SKILL.md`. Mirrors the structure of `generate-reading-lesson/SKILL.md`.

### Procedure

1. **Resolve inputs.** `level`, `count` (default 5), optional `topics`, optional `accentBias` (e.g. "all en-GB" for a UK-themed batch).
2. **Plan the batch.** Topics + format mix + accent context + speakers' (sex, age) per lesson.
3. **Find next IDs.** `ls public/lessons/listening/{level}/` → next `listening-{level}-NNN`, zero-padded.
4. **Write lessons one at a time.** Each is one `Write` call producing the full JSON. New content rules on top of reading rules:
   - **Sentence splitting.** Paragraph: split on `.`/`!`/`?` boundaries, don't split inside quotes, keep punctuation with the sentence. Dialogue: each turn ≥ 1 sentence; if a turn has multiple sentences AND its text is >120 chars, emit them as separate `sentences` entries (same speaker, in order).
   - **Voice picking.** For each distinct speaker: infer (sex, age) from character description, infer accent from story context (London → en-GB; New York → en-US; Sydney → en-AU). When the setting doesn't pin an accent, pick weighted en-US 50% / en-GB 30% / en-AU 20% with batch-level variety (a batch of 5 should not all share one accent). Then random-pick one voice from `scripts/voice-catalog.json[accent][age][sex]` and write the full `edgeVoice` id.
   - **`accents` field.** Unique union of `voices[*].accent`, ordered by first appearance.
   - **Sentence counts.** Emerge from body word count — roughly 10-15 sentences for A1-A2 (matches the 150-250 word range), 20-25 for B1-B2, 30+ for C1.
   - Annotations / grammar / translation / critical thinking / MC / cloze — same per-level minimums as reading.
5. **Rebuild indexes.** `node scripts/rebuild-indexes.mjs` (writes both reading and listening indexes).
6. **Validate.** `npx tsx scripts/validate-lessons.mjs` — must pass. Audio warnings are expected at this stage.
7. **Generate audio.** `uv run scripts/generate-audio.py listening-{level}-NNN` per new lesson, or batched: `uv run scripts/generate-audio.py --level {level}`. On success the script writes `durationMs` + `totalDurationMs` back into each lesson JSON.
8. **Report.** New IDs grouped by level — title, one-line angle, accents, duration.

### Skill install bootstrap

On first run in a fresh checkout, the skill ensures:

```bash
[ -f scripts/voice-catalog.json ] || uv run scripts/bootstrap-voice-catalog.py
[ -f scripts/.env ] || (cp scripts/.env.example scripts/.env && echo "→ edit scripts/.env to add GITHUB_TOKEN")
```

### Common failure modes

- Sentences don't concatenate back to body → validator fails, points at the first divergent character. Fix one side, not both.
- `edgeVoice` not in `voice-catalog.json` for the declared `[accent][age][sex]` bucket → validator fails. Re-run `bootstrap-voice-catalog.py` if the voice was deprecated.
- Forgot to run the TTS script → hub card shows `audio pending`, `Play all` is disabled. Run the script.
- Edge-TTS throttled mid-batch → re-run; idempotent manifest skips completed sentences.

## 9. Files

### New

```
public/lessons/listening/index.json
public/lessons/listening/{a1,a2,b1,b2,c1}/                       ← created as lessons are added

src/app/(app)/listening/page.tsx                                  ← replace ComingSoon
src/app/(app)/listening/[lessonId]/page.tsx
src/components/listening/lesson-card.tsx
src/components/listening/transcript.tsx
src/components/listening/sentence-row.tsx
src/components/listening/transcript-player.tsx
src/components/listening/play-all-button.tsx
src/components/listening/show-transcript-toggle.tsx
src/components/ui/accent-flag.tsx
src/stores/listening-audio-store.ts

scripts/generate-audio.py
scripts/bootstrap-voice-catalog.py
scripts/rebuild-indexes.mjs
scripts/voice-catalog.json                                        ← generated by bootstrap-voice-catalog.py
scripts/.env.example

.claude/skills/generate-listening-lesson/SKILL.md
docs/superpowers/specs/2026-05-19-listening-lessons-design.md     ← this file
```

### Modified

```
src/lib/lessons/types.ts          ← add ListeningLesson, Sentence, VoiceProfile, Accent
src/lib/lessons/schema.ts         ← add listeningLessonSchema + listening index entry schema
src/lib/lessons/load.ts           ← regex extended + new listening hooks
scripts/validate-lessons.mjs      ← walk listening/, enforce listening invariants, warn on missing durations
.gitignore                        ← scripts/.env, .audio-cache/
.claude/skills/generate-reading-lesson/SKILL.md  ← step 5 now calls scripts/rebuild-indexes.mjs
```

## 10. Out of scope (v1)

- Per-profile "default show transcript" preference (currently per-visit `useState`).
- Sentence-level shadowing / loop / variable playback rate UI. (Engine supports rate via `audio.playbackRate` but no UI control yet.)
- Audio prefetch of the next sentence during playback (jsDelivr is fast enough for v1).
- Per-sentence translation reveal. (The translation toggle reveals the whole translation panel, same as reading.)
- A "Mark as listened" status separate from quiz-attempt status.
- Quiz unlock gating ("must listen first"). Quiz is always available.
- Right-click download of MP3s.
- Offline-first audio caching beyond what the browser already does.

## 11. Open questions

None. All decisions confirmed in brainstorming session 2026-05-19.
