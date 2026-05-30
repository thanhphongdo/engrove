// Builds final speaking-lesson JSON files from compact "draft" files.
//
// A draft supplies only creative content; this script derives every
// structural field the validator enforces:
//   - body[]            (grouped from consecutive same-speaker sentences, joined by " ")
//   - sentence ids      (s1..sN, contiguous)
//   - hintStarters ids  (h1..hK; draft gives plain strings)
//   - hintVocab ids     (v1..vM)
//   - audio.cdnBase     (derived from id)
//   - accents           (["en-US"])
// It intentionally does NOT write durationMs / totalDurationMs (the TTS script does).
//
// Usage:
//   node scripts/_build-speaking-from-draft.mjs <draftsDir>
// Reads every *.json in <draftsDir>, writes to
//   public/lessons/speaking/<level>/<id>.json
//
// Validates content rules the Zod schema can't (annotation phrase must appear
// verbatim in a sentence; min annotation counts per level) and reports them,
// but still writes the file so they can be inspected.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const CDN = "https://cdn.jsdelivr.net/gh/thanhphongdo/english-learning-audio@main";
const MIN_ANN = { A1: 10, A2: 15, B1: 20, B2: 25, C1: 30 };

function normalize(s) {
  return s.replace(/\s+/g, " ").trim();
}

function buildOne(draft) {
  const issues = [];
  const id = draft.id;
  if (!/^speaking-(a1|a2|b1|b2|c1)-\d{3}$/.test(id || "")) {
    throw new Error(`bad or missing id: ${id}`);
  }
  const level = draft.level;

  // sentences -> ids + body grouping
  const sentences = draft.sentences.map((s, i) => {
    const out = { id: `s${i + 1}`, speaker: s.speaker, text: normalize(s.text) };
    if (s.translationVi) out.translationVi = s.translationVi.trim();
    if (!out.translationVi) issues.push(`s${i + 1} missing translationVi`);
    return out;
  });

  const body = [];
  for (const s of sentences) {
    const last = body[body.length - 1];
    if (last && last.speaker === s.speaker) {
      last.text = normalize(last.text + " " + s.text);
    } else {
      body.push({ speaker: s.speaker, text: s.text });
    }
  }

  const hintStarters = (draft.hintStarters || []).map((t, i) => ({
    id: `h${i + 1}`,
    text: typeof t === "string" ? t : t.text,
  }));

  const hintVocab = (draft.hintVocab || []).map((v, i) => ({
    id: `v${i + 1}`,
    phrase: v.phrase,
    meaningVi: v.meaningVi,
    pronunciation: v.pronunciation,
  }));

  // annotation content checks (verbatim presence + min count)
  const haystack = sentences.map((s) => s.text).join(" ");
  for (const a of draft.annotations || []) {
    if (!a.pronunciation) issues.push(`annotation "${a.phrase}" missing pronunciation`);
    if (!haystack.includes(a.phrase)) issues.push(`annotation "${a.phrase}" not verbatim in dialogue`);
  }
  const minAnn = MIN_ANN[level] ?? 0;
  if ((draft.annotations || []).length < minAnn) {
    issues.push(`only ${(draft.annotations || []).length} annotations (< ${minAnn} for ${level})`);
  }

  const lesson = {
    id,
    level,
    title: draft.title,
    summary: draft.summary,
    topic: draft.topic,
    tags: draft.tags,
    characters: draft.characters,
    voices: draft.voices,
    body,
    sentences,
    hintStarters,
    hintVocab,
    annotations: draft.annotations,
    grammarNotes: draft.grammarNotes,
    translationVi: draft.translationVi,
    criticalThinkingQuestion: draft.criticalThinkingQuestion,
    audio: { cdnBase: `${CDN}/${id}`, manifestVersion: 1 },
    accents: ["en-US"],
  };

  return { lesson, issues };
}

const draftsDir = process.argv[2];
if (!draftsDir) {
  console.error("usage: node scripts/_build-speaking-from-draft.mjs <draftsDir>");
  process.exit(1);
}

const files = readdirSync(draftsDir).filter((f) => f.endsWith(".json")).sort();
let written = 0;
let withIssues = 0;
const allIssues = [];

for (const f of files) {
  let draft;
  try {
    draft = JSON.parse(readFileSync(join(draftsDir, f), "utf8"));
  } catch (e) {
    allIssues.push(`${f}: JSON parse error — ${e.message}`);
    withIssues++;
    continue;
  }
  let built;
  try {
    built = buildOne(draft);
  } catch (e) {
    allIssues.push(`${f}: ${e.message}`);
    withIssues++;
    continue;
  }
  const lvl = built.lesson.level.toLowerCase();
  const dir = join("public/lessons/speaking", lvl);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${built.lesson.id}.json`), JSON.stringify(built.lesson, null, 2) + "\n");
  written++;
  if (built.issues.length) {
    withIssues++;
    allIssues.push(`${built.lesson.id}: ${built.issues.join("; ")}`);
  }
}

console.log(`built ${written} lesson(s); ${withIssues} with content issues`);
if (allIssues.length) {
  console.log("--- issues ---");
  for (const i of allIssues) console.log("  " + i);
}
