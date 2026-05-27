// Rebuilds public/lessons/{reading,listening,writing,speaking}/index.json from the lesson files.
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const levels = ["a1", "a2", "b1", "b2", "c1"];

function rebuildReading() {
  const base = "public/lessons/reading";
  const out = [];
  for (const lvl of levels) {
    const dir = join(base, lvl);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    for (const f of files) {
      const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
      out.push({ id: j.id, level: j.level, title: j.title, summary: j.summary, tags: j.tags });
    }
  }
  writeFileSync(join(base, "index.json"), JSON.stringify(out, null, 2));
  return out.length;
}

function rebuildListening() {
  const base = "public/lessons/listening";
  if (!existsSync(base)) return 0;
  const out = [];
  for (const lvl of levels) {
    const dir = join(base, lvl);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    for (const f of files) {
      const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
      out.push({
        id: j.id,
        level: j.level,
        title: j.title,
        summary: j.summary,
        tags: j.tags,
        accents: j.accents,
        totalDurationMs: j.totalDurationMs,
        sentenceCount: j.sentences.length,
      });
    }
  }
  writeFileSync(join(base, "index.json"), JSON.stringify(out, null, 2));
  return out.length;
}

function rebuildWriting() {
  const base = "public/lessons/writing";
  if (!existsSync(base)) return 0;
  const out = [];
  for (const lvl of levels) {
    const dir = join(base, lvl);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    for (const f of files) {
      const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
      out.push({
        id: j.id,
        level: j.level,
        title: j.title,
        summary: j.summary,
        tags: j.tags,
        topic: j.topic,
      });
    }
  }
  writeFileSync(join(base, "index.json"), JSON.stringify(out, null, 2));
  return out.length;
}

function rebuildSpeaking() {
  const base = "public/lessons/speaking";
  if (!existsSync(base)) return 0;
  const out = [];
  for (const lvl of levels) {
    const dir = join(base, lvl);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
    for (const f of files) {
      const j = JSON.parse(readFileSync(join(dir, f), "utf8"));
      out.push({
        id: j.id,
        level: j.level,
        title: j.title,
        summary: j.summary,
        topic: j.topic,
        tags: j.tags,
        characters: j.characters,
        totalDurationMs: j.totalDurationMs,
        sentenceCount: j.sentences.length,
        turnCount: j.body.length,
      });
    }
  }
  writeFileSync(join(base, "index.json"), JSON.stringify(out, null, 2));
  return out.length;
}

const r = rebuildReading();
const l = rebuildListening();
const w = rebuildWriting();
const sp = rebuildSpeaking();
console.log(`wrote ${r} reading + ${l} listening + ${w} writing + ${sp} speaking index entries`);
