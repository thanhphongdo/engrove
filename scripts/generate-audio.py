#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.11"
# dependencies = ["edge-tts>=6.1", "mutagen>=1.47", "python-dotenv>=1.0", "certifi>=2024.0"]
# ///
"""Generate per-sentence MP3s for listening lessons and publish to the audio repo."""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import certifi
import edge_tts
from dotenv import load_dotenv
from mutagen.mp3 import MP3

_SSL_CTX = ssl.create_default_context(cafile=certifi.where())

REPO_ROOT = Path(__file__).resolve().parent.parent
LESSONS_DIR = REPO_ROOT / "public" / "lessons" / "listening"
SPEAKING_LESSONS_DIR = REPO_ROOT / "public" / "lessons" / "speaking"
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


def process_speaking_lesson(lesson_path: Path, cache_dir: Path, force: bool) -> tuple[int, int]:
    """Generate MP3s for sentences, hintVocab, and hintStarters. Returns (n_changed, n_total)."""
    data = json.loads(lesson_path.read_text(encoding="utf-8"))
    lesson_id: str = data["id"]
    lesson_root = cache_dir / lesson_id

    # Determine the narrator voice for vocab/starters (first character's voice)
    narrator_char = data["characters"][0]
    narrator_voice = data["voices"][narrator_char]
    narrator_edge_voice: str = narrator_voice["edgeVoice"]
    narrator_rate: str = age_to_rate(narrator_voice["age"])

    changed = 0

    # 1. Sentences (same logic as listening, but output goes to sentences/ subfolder)
    sentences_dir = lesson_root / "sentences"
    sentences_dir.mkdir(parents=True, exist_ok=True)
    manifest = {} if force else load_manifest(sentences_dir)
    new_manifest: dict[str, ManifestEntry] = {}

    for s in data["sentences"]:
        sid: str = s["id"]
        speaker: str = s["speaker"]
        voice = data["voices"][speaker]
        edge_voice: str = voice["edgeVoice"]
        rate: str = age_to_rate(voice["age"])
        h = sentence_hash(s["text"], edge_voice, rate)
        existing = manifest.get(sid)
        out_path = sentences_dir / f"{sid}.mp3"
        if existing and existing.hash == h and out_path.exists() and not force:
            new_manifest[sid] = existing
            s["durationMs"] = existing.duration_ms
            continue
        print(f"   sentences/{sid}: synth ({edge_voice})")
        asyncio.run(synth_sentence(s["text"], edge_voice, rate, out_path))
        duration = measure_duration_ms(out_path)
        new_manifest[sid] = ManifestEntry(sid, h, edge_voice, duration)
        s["durationMs"] = duration
        changed += 1

    save_manifest(sentences_dir, new_manifest)
    data["totalDurationMs"] = sum(e.duration_ms for e in new_manifest.values())

    # 2. Hint vocab (narrator voice)
    vocab_dir = lesson_root / "vocab"
    vocab_dir.mkdir(parents=True, exist_ok=True)
    vocab_manifest = {} if force else load_manifest(vocab_dir)
    new_vocab_manifest: dict[str, ManifestEntry] = {}

    for v in data.get("hintVocab", []):
        vid: str = v["id"]
        h = sentence_hash(v["phrase"], narrator_edge_voice, narrator_rate)
        existing = vocab_manifest.get(vid)
        out_path = vocab_dir / f"{vid}.mp3"
        if existing and existing.hash == h and out_path.exists() and not force:
            new_vocab_manifest[vid] = existing
            continue
        print(f"   vocab/{vid}: synth ({narrator_edge_voice})")
        asyncio.run(synth_sentence(v["phrase"], narrator_edge_voice, narrator_rate, out_path))
        duration = measure_duration_ms(out_path)
        new_vocab_manifest[vid] = ManifestEntry(vid, h, narrator_edge_voice, duration)
        changed += 1

    save_manifest(vocab_dir, new_vocab_manifest)

    # 3. Hint starters (narrator voice)
    starters_dir = lesson_root / "starters"
    starters_dir.mkdir(parents=True, exist_ok=True)
    starters_manifest = {} if force else load_manifest(starters_dir)
    new_starters_manifest: dict[str, ManifestEntry] = {}

    for hs in data.get("hintStarters", []):
        hid: str = hs["id"]
        h = sentence_hash(hs["text"], narrator_edge_voice, narrator_rate)
        existing = starters_manifest.get(hid)
        out_path = starters_dir / f"{hid}.mp3"
        if existing and existing.hash == h and out_path.exists() and not force:
            new_starters_manifest[hid] = existing
            continue
        print(f"   starters/{hid}: synth ({narrator_edge_voice})")
        asyncio.run(synth_sentence(hs["text"], narrator_edge_voice, narrator_rate, out_path))
        duration = measure_duration_ms(out_path)
        new_starters_manifest[hid] = ManifestEntry(hid, h, narrator_edge_voice, duration)
        changed += 1

    save_manifest(starters_dir, new_starters_manifest)

    n_sentences = len(data["sentences"])
    n_vocab = len(data.get("hintVocab", []))
    n_starters = len(data.get("hintStarters", []))
    n_total = n_sentences + n_vocab + n_starters

    lesson_path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"   ✓ {lesson_id}: {changed} of {n_total} audio files regenerated")
    return changed, n_total


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


def find_speaking_lesson_paths(args: argparse.Namespace) -> list[Path]:
    if args.lesson_id:
        parts = args.lesson_id.split("-")
        if len(parts) != 3 or parts[0] != "speaking":
            sys.exit(f"bad speaking lesson id: {args.lesson_id}")
        path = SPEAKING_LESSONS_DIR / parts[1].lower() / f"{args.lesson_id}.json"
        if not path.exists():
            sys.exit(f"lesson file not found: {path}")
        return [path]
    if args.level:
        d = SPEAKING_LESSONS_DIR / args.level.lower()
        return sorted(d.glob("speaking-*.json")) if d.exists() else []
    if args.all:
        return sorted(SPEAKING_LESSONS_DIR.glob("*/speaking-*.json"))
    sys.exit("must pass <lesson_id>, --level X, or --all")


def github_api(method: str, path: str, token: str, body: dict | None = None) -> tuple[int, dict | None]:
    req = urllib.request.Request(
        url=f"https://api.github.com{path}",
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "english-learning-audio-bot",
        },
        data=(json.dumps(body).encode("utf-8") if body is not None else None),
    )
    try:
        with urllib.request.urlopen(req, context=_SSL_CTX) as resp:
            payload = resp.read().decode("utf-8")
            return resp.status, (json.loads(payload) if payload else None)
    except urllib.error.HTTPError as e:
        return e.code, None


def ensure_audio_repo(token: str, audio_repo: str) -> None:
    status, _ = github_api("GET", f"/repos/{audio_repo}", token)
    if status == 200:
        return
    if status != 404:
        sys.exit(f"failed to query audio repo (HTTP {status})")
    print(f"audio repo {audio_repo} not found.")
    resp = input("create it now as public? [y/N] ").strip().lower()
    if resp != "y":
        sys.exit("aborting — create the repo manually then re-run")
    name = audio_repo.split("/")[1]
    status, _ = github_api(
        "POST",
        "/user/repos",
        token,
        {"name": name, "private": False, "auto_init": True, "description": "english-learning per-sentence MP3s"},
    )
    if status not in (200, 201):
        sys.exit(f"create_repo failed (HTTP {status})")
    print(f"created {audio_repo}")


def run(cmd: list[str], cwd: Path) -> str:
    r = subprocess.run(cmd, cwd=cwd, check=True, text=True, capture_output=True)
    return r.stdout.strip()


# Git commands that touch the network embed the token in the URL. macOS keychain
# can override those credentials; disable it for network-bound git operations.
_GIT_NO_CRED = {"GIT_TERMINAL_PROMPT": "0"}


def git_net(cmd: list[str], cwd: Path) -> str:
    """Run a git+network command with the system credential helper disabled."""
    assert cmd[0] == "git"
    full_cmd = ["git", "-c", "credential.helper=", "-c", "http.postBuffer=524288000"] + cmd[1:]
    r = subprocess.run(
        full_cmd, cwd=cwd, check=True, text=True, capture_output=True,
        env={**os.environ, **_GIT_NO_CRED},
    )
    return r.stdout.strip()


def ensure_clone(audio_root: Path, audio_repo: str, branch: str, token: str) -> None:
    if (audio_root / ".git").exists():
        git_net(["git", "fetch", "origin", branch], cwd=audio_root)
        run(["git", "reset", "--hard", f"origin/{branch}"], cwd=audio_root)
        return
    audio_root.parent.mkdir(parents=True, exist_ok=True)
    if audio_root.exists():
        run(["rm", "-rf", str(audio_root)], cwd=audio_root.parent)
    auth_url = f"https://x-access-token:{token}@github.com/{audio_repo}.git"
    # Try cloning with the target branch; if the repo is empty, fall back to init.
    r = subprocess.run(
        ["git", "-c", "credential.helper=", "clone", "--branch", branch, auth_url, str(audio_root)],
        cwd=audio_root.parent, text=True, capture_output=True,
        env={**os.environ, **_GIT_NO_CRED},
    )
    if r.returncode != 0:
        # Empty repo — init locally and set the remote.
        audio_root.mkdir(parents=True, exist_ok=True)
        run(["git", "init", "-b", branch], cwd=audio_root)
        run(["git", "remote", "add", "origin", auth_url], cwd=audio_root)
    name = os.environ.get("GIT_AUTHOR_NAME", "english-learning audio bot")
    email = os.environ.get("GIT_AUTHOR_EMAIL", "audio-bot@english-learning.local")
    run(["git", "config", "user.name", name], cwd=audio_root)
    run(["git", "config", "user.email", email], cwd=audio_root)
    readme = audio_root / "README.md"
    if not readme.exists():
        readme.write_text(
            "# english-learning audio\n\n"
            "Per-sentence MP3s generated by `scripts/generate-audio.py` from "
            "`siliconprime-phongdo/english-learning`. Layout: `{lessonId}/{sentenceId}.mp3`.\n",
            encoding="utf-8",
        )
        run(["git", "add", "README.md"], cwd=audio_root)
        run(["git", "commit", "-m", "init: README"], cwd=audio_root)
        git_net(["git", "push", "--set-upstream", "origin", branch], cwd=audio_root)


def commit_and_push(audio_root: Path, lesson_id: str, n_changed: int, n_total: int, branch: str) -> None:
    run(["git", "add", lesson_id], cwd=audio_root)
    status = run(["git", "status", "--porcelain"], cwd=audio_root)
    if not status:
        return
    msg = f"audio: regen {lesson_id} ({n_changed} of {n_total} changed)"
    run(["git", "commit", "-m", msg], cwd=audio_root)
    git_net(["git", "push", "origin", branch], cwd=audio_root)


def main() -> int:
    load_dotenv(SCRIPTS_DIR / ".env")
    parser = argparse.ArgumentParser(description="Generate lesson audio")
    parser.add_argument("lesson_id", nargs="?")
    parser.add_argument("--kind", choices=["listening", "speaking"], default="listening", help="lesson kind")
    parser.add_argument("--level", help="e.g. a2")
    parser.add_argument("--all", action="store_true")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    is_speaking = args.kind == "speaking"
    lessons = find_speaking_lesson_paths(args) if is_speaking else find_lesson_paths(args)
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
            n_audio = len(data["sentences"])
            if is_speaking:
                n_audio += len(data.get("hintVocab", [])) + len(data.get("hintStarters", []))
            print(f"→ {data['id']}: {n_audio} audio files across {len(data['voices'])} voice(s)")
            if not is_speaking:
                for s in data["sentences"]:
                    voice = data["voices"][s["speaker"]]["edgeVoice"]
                    print(f"   {s['id']:>4}  {voice:<28}  {s['text'][:60]}{'…' if len(s['text']) > 60 else ''}")
        return 0

    token = os.environ.get("GITHUB_TOKEN")
    branch = os.environ.get("AUDIO_REPO_BRANCH", "main")
    if not token:
        sys.exit("GITHUB_TOKEN missing — copy scripts/.env.example to scripts/.env and fill it in")
    ensure_audio_repo(token, audio_repo)
    ensure_clone(audio_root, audio_repo, branch, token)

    for path in lessons:
        data = json.loads(path.read_text(encoding="utf-8"))
        print(f"→ {data['id']}")
        if is_speaking:
            n_changed, n_total = process_speaking_lesson(path, audio_root, args.force)
        else:
            n_changed, n_total = process_lesson(path, audio_root, args.force)
        if n_changed > 0:
            commit_and_push(audio_root, data["id"], n_changed, n_total, branch)
            print(f"   pushed {data['id']}: {n_changed} of {n_total}")
        else:
            print(f"   unchanged {data['id']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
