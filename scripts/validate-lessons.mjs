// One-shot validator for the new lesson structure.
// Walks public/lessons/reading, validates every lesson against the schema,
// and validates index.json against the index schema.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { lessonSchema, lessonsIndexSchema } from "../src/lib/lessons/schema.ts";

const base = "public/lessons/reading";
const levels = ["a1", "a2", "b1", "b2", "c1"];

let errors = 0;
let count = 0;

for (const lvl of levels) {
  const dir = join(base, lvl);
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  for (const f of files) {
    const raw = JSON.parse(readFileSync(join(dir, f), "utf8"));
    const parsed = lessonSchema.safeParse(raw);
    if (!parsed.success) {
      errors++;
      console.error(`❌ ${lvl}/${f}`);
      for (const issue of parsed.error.issues) {
        console.error(`   ${issue.path.join(".")}: ${issue.message}`);
      }
    } else {
      count++;
    }
  }
}

const indexRaw = JSON.parse(readFileSync(join(base, "index.json"), "utf8"));
const indexParsed = lessonsIndexSchema.safeParse(indexRaw);
if (!indexParsed.success) {
  errors++;
  console.error("❌ index.json");
  for (const issue of indexParsed.error.issues) {
    console.error(`   ${issue.path.join(".")}: ${issue.message}`);
  }
}

if (errors === 0) {
  console.log(`✓ ${count} lessons + index validated`);
} else {
  console.error(`\n${errors} validation error(s)`);
  process.exit(1);
}
