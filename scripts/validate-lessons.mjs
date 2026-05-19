// Validates every reading and listening lesson + their indexes.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  lessonSchema,
  lessonsIndexSchema,
  listeningLessonSchema,
  listeningLessonsIndexSchema,
} from "../src/lib/lessons/schema.ts";

const levels = ["a1", "a2", "b1", "b2", "c1"];
let errors = 0;
let warnings = 0;
let readingCount = 0;
let listeningCount = 0;

function validateOne(kind, lvl, file, lessonsBase) {
  const raw = JSON.parse(readFileSync(join(lessonsBase, lvl, file), "utf8"));
  const schema = kind === "reading" ? lessonSchema : listeningLessonSchema;
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
  return true;
}

for (const kind of ["reading", "listening"]) {
  const base = `public/lessons/${kind}`;
  if (!existsSync(base)) continue;
  for (const lvl of levels) {
    const dir = join(base, lvl);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const f of files) {
      if (validateOne(kind, lvl, f, base)) {
        if (kind === "reading") readingCount++;
        else listeningCount++;
      }
    }
  }
  const indexPath = join(base, "index.json");
  if (existsSync(indexPath)) {
    const indexRaw = JSON.parse(readFileSync(indexPath, "utf8"));
    const indexSchema = kind === "reading" ? lessonsIndexSchema : listeningLessonsIndexSchema;
    const indexParsed = indexSchema.safeParse(indexRaw);
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
  console.log(`✓ ${readingCount} reading + ${listeningCount} listening lessons validated${w}`);
} else {
  console.error(`\n${errors} validation error(s)`);
  process.exit(1);
}
