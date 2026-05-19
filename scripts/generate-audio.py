#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["edge-tts>=6.1", "mutagen>=1.47", "python-dotenv>=1.0"]
# ///
"""Generate per-sentence MP3s for listening lessons and publish to the audio repo.

Reads `public/lessons/listening/{level}/{id}.json`, runs Edge-TTS per sentence,
measures durations, writes them back, and pushes the MP3s to the audio repo.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
LESSONS_DIR = REPO_ROOT / "public" / "lessons" / "listening"


def find_lesson_paths(args: argparse.Namespace) -> list[Path]:
    if args.lesson_id:
        # listening-a2-007 → public/lessons/listening/a2/listening-a2-007.json
        parts = args.lesson_id.split("-")
        if len(parts) != 3 or parts[0] != "listening":
            sys.exit(f"bad lesson id: {args.lesson_id}")
        level = parts[1].lower()
        path = LESSONS_DIR / level / f"{args.lesson_id}.json"
        if not path.exists():
            sys.exit(f"lesson file not found: {path}")
        return [path]
    if args.level:
        dir_ = LESSONS_DIR / args.level.lower()
        if not dir_.exists():
            return []
        return sorted(dir_.glob("listening-*.json"))
    if args.all:
        return sorted(LESSONS_DIR.glob("*/listening-*.json"))
    sys.exit("must pass <lesson_id>, --level X, or --all")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate listening audio")
    parser.add_argument("lesson_id", nargs="?")
    parser.add_argument("--level", help="e.g. a2")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--force", action="store_true", help="ignore manifest, regen everything")
    parser.add_argument("--dry-run", action="store_true", help="print plan, no TTS, no push")
    args = parser.parse_args()

    lessons = find_lesson_paths(args)
    if not lessons:
        print("no lessons matched")
        return 0
    for path in lessons:
        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"→ {data['id']}: {len(data['sentences'])} sentences across {len(data['voices'])} voice(s)")
        if args.dry_run:
            for s in data["sentences"]:
                voice = data["voices"][s["speaker"]]["edgeVoice"]
                print(f"   {s['id']:>4}  {voice:<28}  {s['text'][:60]}{'…' if len(s['text']) > 60 else ''}")
    if args.dry_run:
        return 0
    print("(real run not implemented yet — see later tasks)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
