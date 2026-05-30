// Targeted validator for speaking lessons only (imports just speaking-schema.ts,
// which has no extensionless TS imports, so it runs under `node` type-stripping).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  speakingLessonSchema,
  speakingLessonsIndexSchema,
} from "../src/lib/lessons/speaking-schema.ts";

const levels = ["a1", "a2", "b1", "b2", "c1"];
const base = "public/lessons/speaking";
let errors = 0, ok = 0, audioPending = 0;

for (const lvl of levels) {
  const dir = join(base, lvl);
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const raw = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const parsed = speakingLessonSchema.safeParse(raw);
    if (!parsed.success) {
      errors++;
      console.error(`❌ speaking/${lvl}/${f}`);
      for (const issue of parsed.error.issues) {
        console.error(`   ${issue.path.join(".")}: ${issue.message}`);
      }
      continue;
    }
    ok++;
    if (parsed.data.totalDurationMs === undefined || parsed.data.sentences.some((s) => s.durationMs === undefined)) {
      audioPending++;
    }
  }
}

const indexPath = join(base, "index.json");
const idxParsed = speakingLessonsIndexSchema.safeParse(JSON.parse(readFileSync(indexPath, "utf8")));
if (!idxParsed.success) {
  errors++;
  console.error("❌ speaking/index.json");
  for (const issue of idxParsed.error.issues) console.error(`   ${issue.path.join(".")}: ${issue.message}`);
}

console.log(`\n${ok} speaking lessons valid, ${audioPending} audio-pending, ${errors} error(s); index ${idxParsed.success ? "OK" : "INVALID"}`);
process.exit(errors ? 1 : 0);
