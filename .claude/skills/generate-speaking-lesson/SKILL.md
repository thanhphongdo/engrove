# generate-speaking-lesson

Generate new speaking lessons for the english-learning app. Produces JSON lesson files under `public/lessons/speaking/{level}/`, then rebuilds `public/lessons/speaking/index.json` and runs the Python TTS script to generate + upload per-sentence, per-vocab, and per-starter MP3s to the public audio repo.

Use when asked to "add speaking lessons", "generate more A1/A2/B1/B2/C1 speaking lessons", "scale up speaking content", or `/generate-speaking-lesson`.

---

## Inputs

| Input | Required | Default | Notes |
|---|---|---|---|
| `level` | Yes | — | A1 / A2 / B1 / B2 / C1 |
| `count` | No | 5 | Number of new lessons to generate |
| `topics` | No | — | Comma-separated override topics |

If inputs are ambiguous, ask once. After that, proceed without confirmation.

---

## Lesson Content Rules

### Always
- Format: always `"dialogue"` (body is array of `{speaker, text}` turns).
- Characters: exactly 2. Both must be keys in `voices`. Both must have `accent: "en-US"`.
- Voices: always en-US. Pick from `scripts/voice-catalog.json` under `"en-US"` key. Assign by character gender.
- `accents`: always `["en-US"]`.
- `hintStarters`: 2–4 entries, ids `h1..hK`, each a sentence-starter template with `…` placeholder.
- `hintVocab`: 3–6 entries, ids `v1..vM`, each with `phrase`, `meaningVi`, `pronunciation` (IPA for US accent).
- `criticalThinkingQuestion`: one open-ended question about the dialogue theme.
- `translationVi`: full Vietnamese translation of the dialogue.
- `grammarNotes`: 1–3 entries covering patterns from the dialogue.
- `annotations`: 3–8 phrases from the dialogue with Vietnamese gloss.

### DO NOT write
- `durationMs` on individual sentences (written by TTS script).
- `totalDurationMs` at top level (written by TTS script).

### Per-level content targets

| Level | Dialogue turns (body) | Sentences | Vocabulary difficulty |
|---|---|---|---|
| A1 | 8–12 | 8–15 | Basic daily phrases |
| A2 | 10–16 | 10–18 | Common situations |
| B1 | 14–20 | 14–22 | Everyday contexts |
| B2 | 16–24 | 16–26 | Nuanced expression |
| C1 | 20–30 | 20–32 | Sophisticated register |

### Sentence grouping invariant
Consecutive sentences with the same speaker must concatenate (joined by `" "`) to exactly the `text` field of the corresponding body turn. The schema validator enforces this.

---

## Workflow

### Step 1: Resolve inputs
Confirm `level` and `count`. Pick topics from this list or invent relevant ones:
- A1: ordering food, greetings, directions, introductions, shopping basics
- A2: making appointments, phoning a hotel, at the doctor, weekend plans
- B1: job interviews, travel problems, discussing hobbies, giving advice
- B2: negotiating, discussing current events, academic advising
- C1: debating policy, consulting a specialist, complex negotiation

### Step 2: Find next IDs
```bash
ls public/lessons/speaking/{level_lower}/ 2>/dev/null | sort | tail -1
```
Next ID = `speaking-{level_lower}-{NNN}` where NNN = (last number + 1) zero-padded to 3 digits. Start at 001 if none exist.

### Step 3: Write lessons one at a time

For each lesson:

1. **Pick characters and voices** from `scripts/voice-catalog.json`:
   - Read the catalog: `cat scripts/voice-catalog.json`
   - Pick 2 character names appropriate to the scenario (e.g., "Doctor" + "Patient").
   - For each, pick a voice from `voices["en-US"][age][sex]` array. Randomize within the matching list.

2. **Generate dialogue** (12–20 body turns for A1, scaling up per table above).
   - Keep it natural and context-appropriate.
   - Ensure back-and-forth alternation (no 3+ consecutive turns by same speaker unless very natural).

3. **Split into sentences**: each body turn may be split into 1–3 sentences if it contains multiple clauses. The concatenated sentence texts must equal the body turn text exactly (trimmed).

4. **Write the lesson JSON file** to `public/lessons/speaking/{level_lower}/{id}.json`.

5. **Validate** immediately after writing:
```bash
node scripts/validate-lessons.mjs 2>&1 | grep {id}
```
Fix any errors before writing the next lesson.

### Step 4: Rebuild speaking index

```bash
node scripts/rebuild-indexes.mjs
```

Verify: `public/lessons/speaking/index.json` contains all new lessons.

### Step 5: Validate all speaking lessons

```bash
node scripts/validate-lessons.mjs 2>&1 | grep -E "speaking|error|warning" | head -40
```

Expected: only "audio not generated yet" warnings (no errors).

### Step 6: Generate audio for each lesson

Run for each new lesson ID:
```bash
uv run scripts/generate-audio.py --kind speaking {lesson_id}
```

This generates `sentences/sN.mp3`, `vocab/vN.mp3`, `starters/hN.mp3` and pushes to the audio CDN.

### Step 7: Re-rebuild index (picks up totalDurationMs)

```bash
node scripts/rebuild-indexes.mjs
```

### Step 8: Report

List each generated lesson: ID, title, turn count, sentence count, and CDN base URL.

---

## Audio CDN structure (for reference)

```
speaking-a1-001/
  sentences/s1.mp3 … sN.mp3
  vocab/v1.mp3 … vM.mp3
  starters/h1.mp3 … hK.mp3
  sentences/manifest.json
  vocab/manifest.json
  starters/manifest.json
```

CDN base in lesson JSON:
```json
"audio": {
  "cdnBase": "https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main/{lesson_id}",
  "manifestVersion": 1
}
```
