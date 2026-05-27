// Validates every reading, listening, writing, and speaking lesson + their indexes.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  lessonSchema,
  lessonsIndexSchema,
  listeningLessonSchema,
  listeningLessonsIndexSchema,
  writingLessonSchema,
  writingLessonsIndexSchema,
} from "../src/lib/lessons/schema.ts";
import {
  speakingLessonSchema,
  speakingLessonsIndexSchema,
} from "../src/lib/lessons/speaking-schema.ts";

const levels = ["a1", "a2", "b1", "b2", "c1"];
let errors = 0;
let warnings = 0;
let readingCount = 0;
let listeningCount = 0;
let writingCount = 0;
let speakingCount = 0;

function schemaFor(kind) {
  if (kind === "reading") return lessonSchema;
  if (kind === "listening") return listeningLessonSchema;
  if (kind === "speaking") return speakingLessonSchema;
  return writingLessonSchema;
}

function indexSchemaFor(kind) {
  if (kind === "reading") return lessonsIndexSchema;
  if (kind === "listening") return listeningLessonsIndexSchema;
  if (kind === "speaking") return speakingLessonsIndexSchema;
  return writingLessonsIndexSchema;
}

function validateOne(kind, lvl, file, lessonsBase) {
  const raw = JSON.parse(readFileSync(join(lessonsBase, lvl, file), "utf8"));
  const schema = schemaFor(kind);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    errors++;
    console.error(`❌ ${kind}/${lvl}/${file}`);
    for (const issue of parsed.error.issues) {
      console.error(`   ${issue.path.join(".")}: ${issue.message}`);
    }
    return false;
  }
  if (kind === "listening") {
    const data = parsed.data;
    const missing = data.sentences.some((s) => s.durationMs === undefined);
    if (missing || data.totalDurationMs === undefined) {
      warnings++;
      console.warn(
        `⚠ ${kind}/${lvl}/${file}: audio not generated yet — run uv run scripts/generate-audio.py ${data.id}`,
      );
    }
  }
  if (kind === "speaking") {
    const data = parsed.data;
    const missing = data.sentences.some((s) => s.durationMs === undefined);
    if (missing || data.totalDurationMs === undefined) {
      warnings++;
      console.warn(
        `⚠ ${kind}/${lvl}/${file}: audio not generated yet — run uv run scripts/generate-audio.py --kind speaking ${data.id}`,
      );
    }
  }
  return true;
}

for (const kind of ["reading", "listening", "writing", "speaking"]) {
  const base = `public/lessons/${kind}`;
  if (!existsSync(base)) continue;
  for (const lvl of levels) {
    const dir = join(base, lvl);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      if (validateOne(kind, lvl, f, base)) {
        if (kind === "reading") readingCount++;
        else if (kind === "listening") listeningCount++;
        else if (kind === "speaking") speakingCount++;
        else writingCount++;
      }
    }
  }
  const indexPath = join(base, "index.json");
  if (existsSync(indexPath)) {
    const indexRaw = JSON.parse(readFileSync(indexPath, "utf8"));
    const indexParsed = indexSchemaFor(kind).safeParse(indexRaw);
    if (!indexParsed.success) {
      errors++;
      console.error(`❌ ${kind}/index.json`);
      for (const issue of indexParsed.error.issues) {
        console.error(`   ${issue.path.join(".")}: ${issue.message}`);
      }
    }
  }
}

if (errors === 0) {
  const w = warnings > 0 ? ` (${warnings} audio-pending warning${warnings === 1 ? "" : "s"})` : "";
  console.log(
    `✓ ${readingCount} reading + ${listeningCount} listening + ${writingCount} writing + ${speakingCount} speaking lessons validated${w}`,
  );
} else {
  console.error(`\n${errors} validation error(s)`);
  process.exit(1);
}
