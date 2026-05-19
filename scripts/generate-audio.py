#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["edge-tts>=6.1", "mutagen>=1.47", "python-dotenv>=1.0"]
# ///
"""Generate per-sentence MP3s for listening lessons and publish to the audio repo."""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import edge_tts
from dotenv import load_dotenv
from mutagen.mp3 import MP3

REPO_ROOT = Path(__file__).resolve().parent.parent
LESSONS_DIR = REPO_ROOT / "public" / "lessons" / "listening"
SCRIPTS_DIR = REPO_ROOT / "scripts"


def age_to_rate(age: str) -> str:
    return {"child": "+0%", "teen": "+5%", "adult": "+0%", "senior": "-5%"}[age]


def sentence_hash(text: str, edge_voice: str, rate: str) -> str:
    return hashlib.sha256(f"{text}\n{edge_voice}\n{rate}".encode("utf-8")).hexdigest()


@dataclass
class ManifestEntry:
    id: str
    hash: str
    edge_voice: str
    duration_ms: int


def load_manifest(folder: Path) -> dict[str, ManifestEntry]:
    p = folder / "manifest.json"
    if not p.exists():
        return {}
    raw = json.loads(p.read_text(encoding="utf-8"))
    return {
        e["id"]: ManifestEntry(e["id"], e["hash"], e["edgeVoice"], e["durationMs"])
        for e in raw
    }


def save_manifest(folder: Path, entries: dict[str, ManifestEntry]) -> None:
    ordered = sorted(entries.values(), key=lambda e: int(e.id[1:]))
    p = folder / "manifest.json"
    p.write_text(
        json.dumps(
            [
                {"id": e.id, "hash": e.hash, "edgeVoice": e.edge_voice, "durationMs": e.duration_ms}
                for e in ordered
            ],
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


async def synth_sentence(text: str, edge_voice: str, rate: str, out_path: Path) -> None:
    last_exc: Exception | None = None
    for delay in (1, 4, 16):
        try:
            communicate = edge_tts.Communicate(text, edge_voice, rate=rate)
            await communicate.save(str(out_path))
            return
        except Exception as e:  # Edge-TTS occasionally throttles or returns 503
            last_exc = e
            print(f"   (retry in {delay}s — {e})", file=sys.stderr)
            await asyncio.sleep(delay)
    raise RuntimeError(f"edge-tts failed after retries: {last_exc}")


def measure_duration_ms(path: Path) -> int:
    return int(round(MP3(str(path)).info.length * 1000))


def process_lesson(lesson_path: Path, cache_dir: Path, force: bool) -> tuple[int, int]:
    """Generate MP3s + measure durations. Returns (n_changed, n_total)."""
    data = json.loads(lesson_path.read_text(encoding="utf-8"))
    lesson_id: str = data["id"]
    lesson_folder = cache_dir / lesson_id
    lesson_folder.mkdir(parents=True, exist_ok=True)

    manifest = {} if force else load_manifest(lesson_folder)
    changed_ids: list[str] = []
    new_manifest: dict[str, ManifestEntry] = {}

    for s in data["sentences"]:
        sid: str = s["id"]
        speaker: str = s["speaker"]
        voice = data["voices"][speaker]
        edge_voice: str = voice["edgeVoice"]
        rate: str = age_to_rate(voice["age"])
        h = sentence_hash(s["text"], edge_voice, rate)

        existing = manifest.get(sid)
        out_path = lesson_folder / f"{sid}.mp3"
        if existing and existing.hash == h and out_path.exists() and not force:
            new_manifest[sid] = existing
            s["durationMs"] = existing.duration_ms
            continue

        print(f"   {sid}: synth ({edge_voice} {rate})")
        asyncio.run(synth_sentence(s["text"], edge_voice, rate, out_path))
        duration = measure_duration_ms(out_path)
        new_manifest[sid] = ManifestEntry(sid, h, edge_voice, duration)
        s["durationMs"] = duration
        changed_ids.append(sid)

    save_manifest(lesson_folder, new_manifest)
    data["totalDurationMs"] = sum(e.duration_ms for e in new_manifest.values())
    lesson_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"   ✓ {data['id']}: {len(changed_ids)} of {len(data['sentences'])} sentences regenerated")
    return len(changed_ids), len(data["sentences"])


def find_lesson_paths(args: argparse.Namespace) -> list[Path]:
    if args.lesson_id:
        parts = args.lesson_id.split("-")
        if len(parts) != 3 or parts[0] != "listening":
            sys.exit(f"bad lesson id: {args.lesson_id}")
        path = LESSONS_DIR / parts[1].lower() / f"{args.lesson_id}.json"
        if not path.exists():
            sys.exit(f"lesson file not found: {path}")
        return [path]
    if args.level:
        d = LESSONS_DIR / args.level.lower()
        return sorted(d.glob("listening-*.json")) if d.exists() else []
    if args.all:
        return sorted(LESSONS_DIR.glob("*/listening-*.json"))
    sys.exit("must pass <lesson_id>, --level X, or --all")


def main() -> int:
    load_dotenv(SCRIPTS_DIR / ".env")
    parser = argparse.ArgumentParser(description="Generate listening audio")
    parser.add_argument("lesson_id", nargs="?")
    parser.add_argument("--level", help="e.g. a2")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    lessons = find_lesson_paths(args)
    if not lessons:
        print("no lessons matched")
        return 0

    cache_dir = REPO_ROOT / os.environ.get("AUDIO_CACHE_DIR", ".audio-cache")
    audio_repo = os.environ.get("AUDIO_REPO", "thanhphongdo/english-learning-audio")
    audio_root = cache_dir / audio_repo.split("/")[-1]
    audio_root.mkdir(parents=True, exist_ok=True)

    if args.dry_run:
        for path in lessons:
            data = json.loads(path.read_text(encoding="utf-8"))
            print(f"→ {data['id']}: {len(data['sentences'])} sentences across {len(data['voices'])} voice(s)")
            for s in data["sentences"]:
                voice = data["voices"][s["speaker"]]["edgeVoice"]
                print(f"   {s['id']:>4}  {voice:<28}  {s['text'][:60]}{'…' if len(s['text']) > 60 else ''}")
        return 0

    any_changed = False
    for path in lessons:
        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"→ {data['id']}")
        n_changed, n_total = process_lesson(path, audio_root, args.force)
        any_changed = any_changed or (n_changed > 0)

    if not any_changed:
        print("(no changes — nothing to push)")
    else:
        print("audio generated; push step will run in a later task")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
