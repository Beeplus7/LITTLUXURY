#!/usr/bin/env python3
"""
Scrape public Yupoo album / collection pages into LITTLUXRY Media Library assets.

Personal/reference use on public (no-password) pages only.

Examples:
  python3 scripts/scrape_yupoo_public.py \\
    --url https://paypalshop.x.yupoo.com/collections/2865378

  python3 scripts/scrape_yupoo_public.py \\
    --url https://soccerjerseys20232024.x.yupoo.com/albums/133050075 \\
    --slug soccer-133050075
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "littluxry-app" / "public" / "assets" / "imports"
MANIFEST = ROOT / "littluxry-app" / "src" / "data" / "yupooImports.json"

PHOTO_RE = re.compile(
    r"https://photo\.yupoo\.com/[^\"'\s<>]+/(?:medium|big|small|original)\.[a-zA-Z0-9]+",
    re.I,
)
# Sometimes paths appear protocol-relative
PHOTO_RE_REL = re.compile(
    r"//photo\.yupoo\.com/[^\"'\s<>]+/(?:medium|big|small|original)\.[a-zA-Z0-9]+",
    re.I,
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/json,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://x.yupoo.com/",
}


def slug_from_url(url: str) -> str:
    p = urlparse(url)
    host = (p.hostname or "yupoo").split(".")[0]
    parts = [x for x in p.path.strip("/").split("/") if x]
    tail = "-".join(parts[-2:]) if parts else "album"
    raw = f"{host}-{tail}".lower()
    return re.sub(r"[^a-z0-9\-]+", "-", raw).strip("-")[:60]


def prefer_big(url: str) -> list[str]:
    """Try higher quality variants first."""
    u = url
    candidates = []
    for a, b in (
        ("/small.", "/big."),
        ("/medium.", "/big."),
        ("/big.", "/original."),
    ):
        if a in u:
            candidates.append(u.replace(a, b))
    candidates.append(url)
    # unique preserve order
    out: list[str] = []
    seen = set()
    for c in candidates:
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


def extract_from_html(html: str, base: str) -> list[str]:
    found: list[str] = []
    found.extend(PHOTO_RE.findall(html))
    found.extend("https:" + m for m in PHOTO_RE_REL.findall(html))

    soup = BeautifulSoup(html, "html.parser")
    for img in soup.find_all(["img", "source"]):
        for attr in ("src", "data-src", "data-origin", "data-original", "data-lazy"):
            src = img.get(attr) or ""
            if "photo.yupoo.com" in src:
                found.append(urljoin(base, src if src.startswith("http") else ("https:" + src if src.startswith("//") else src)))
        srcset = img.get("srcset") or ""
        for part in srcset.split(","):
            u = part.strip().split(" ")[0]
            if "photo.yupoo.com" in u:
                found.append(urljoin(base, u if u.startswith("http") else ("https:" + u if u.startswith("//") else u)))

    # normalize size keys in path to a stable id for dedupe
    return list(dict.fromkeys(found))


def dedupe_by_photo_id(urls: Iterable[str]) -> list[str]:
    """Keep one URL per photo path (prefer later/higher quality order from prefer_big)."""
    best: dict[str, str] = {}
    rank = {"original": 3, "big": 2, "medium": 1, "small": 0}

    def key_and_rank(u: str):
        m = re.search(
            r"(https://photo\.yupoo\.com/.+?)/(small|medium|big|original)\.([a-z0-9]+)",
            u,
            re.I,
        )
        if not m:
            return u, 0
        return f"{m.group(1)}.{m.group(3).lower()}", rank.get(m.group(2).lower(), 0)

    for u in urls:
        k, r = key_and_rank(u)
        prev = best.get(k)
        if prev is None:
            best[k] = u
        else:
            _, pr = key_and_rank(prev)
            if r > pr:
                best[k] = u
    return list(best.values())


def fetch_collection_pages(session: requests.Session, url: str, max_pages: int = 8) -> str:
    """
    Yupoo collections often paginate via ?page=N.
    Keep timeouts short and stop when a page adds no new photo URLs.
    """
    chunks = []
    seen: set[str] = set()
    r = session.get(url, headers=HEADERS, timeout=25)
    r.raise_for_status()
    chunks.append(r.text)
    seen.update(PHOTO_RE.findall(r.text))
    print(f"  page 1: {len(seen)} photos", flush=True)

    for page in range(2, max_pages + 1):
        cand = f"{url.rstrip('/')}?page={page}"
        try:
            resp = session.get(cand, headers=HEADERS, timeout=12)
        except requests.RequestException as e:
            print(f"  page {page}: stop ({e})", flush=True)
            break
        if resp.status_code != 200:
            print(f"  page {page}: HTTP {resp.status_code}, stop", flush=True)
            break
        imgs = PHOTO_RE.findall(resp.text)
        new = [u for u in imgs if u not in seen]
        if not new:
            print(f"  page {page}: no new photos, stop", flush=True)
            break
        seen.update(new)
        chunks.append(resp.text)
        print(f"  page {page}: +{len(new)} (total {len(seen)})", flush=True)
        time.sleep(0.25)
    return "\n".join(chunks)


def download_one(session: requests.Session, img_url: str, dest: Path) -> bool:
    last_err = None
    for u in prefer_big(img_url):
        try:
            r = session.get(u, headers=HEADERS, timeout=40)
            if r.status_code == 200 and len(r.content) > 4000:
                dest.write_bytes(r.content)
                return True
            last_err = f"HTTP {r.status_code} size={len(r.content)}"
        except Exception as e:  # noqa: BLE001
            last_err = str(e)
    if last_err:
        print(f"  skip {img_url}: {last_err}")
    return False


def ext_for(url: str) -> str:
    path = urlparse(url).path.lower()
    for e in (".png", ".webp", ".gif", ".jpeg", ".jpg"):
        if e in path:
            return ".jpg" if e == ".jpeg" else e
    return ".jpg"


def load_manifest() -> list[dict]:
    if MANIFEST.exists():
        try:
            data = json.loads(MANIFEST.read_text())
            if isinstance(data, list):
                return data
        except json.JSONDecodeError:
            pass
    return []


def save_manifest(items: list[dict]) -> None:
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(items, indent=2) + "\n")


def main() -> int:
    ap = argparse.ArgumentParser(description="Scrape public Yupoo album/collection into Media Library")
    ap.add_argument("--url", action="append", required=True, help="Public Yupoo album or collection URL (repeatable)")
    ap.add_argument("--slug", default="", help="Folder slug under public/assets/imports/")
    ap.add_argument("--limit", type=int, default=0, help="Max images per URL (0 = all)")
    ap.add_argument("--max-pages", type=int, default=40, help="Collection pagination depth")
    args = ap.parse_args()

    session = requests.Session()
    all_manifest = load_manifest()
    # drop previous entries for same slugs we overwrite
    new_slugs: set[str] = set()

    for url in args.url:
        slug = args.slug or slug_from_url(url)
        new_slugs.add(slug)
        out_dir = DEFAULT_OUT / slug
        out_dir.mkdir(parents=True, exist_ok=True)

        print(f"\n=== Fetching {url}", flush=True)
        print(f"    → {out_dir}", flush=True)
        try:
            resp0 = session.get(url, headers=HEADERS, timeout=25)
            if resp0.status_code == 404:
                print(f"FAIL: URL returned 404 (private/removed?): {url}", file=sys.stderr)
                continue
            if "/collections/" in url:
                html = fetch_collection_pages(session, url, max_pages=args.max_pages)
            else:
                html = resp0.text
        except Exception as e:  # noqa: BLE001
            print(f"FAIL fetch: {e}", file=sys.stderr)
            return 1

        found = dedupe_by_photo_id(extract_from_html(html, url))
        # skip logos / icons
        found = [u for u in found if "/icons/" not in u]
        if args.limit > 0:
            found = found[: args.limit]
        print(f"Found {len(found)} unique public images", flush=True)

        saved_items = []
        for i, img_url in enumerate(found):
            ext = ext_for(img_url)
            name = f"{slug}_{i:03d}{ext}"
            path = out_dir / name
            if path.exists() and path.stat().st_size > 4000:
                ok = True
            else:
                ok = download_one(session, img_url, path)
            if not ok:
                continue
            rel = f"/assets/imports/{slug}/{name}"
            size_mb = path.stat().st_size / (1024 * 1024)
            item = {
                "id": f"yupoo-{slug}-{i:03d}",
                "type": "image",
                "src": rel,
                "label": f"{slug.replace('-', ' ').title()} {i + 1:02d}",
                "tags": ["yupoo", "import", slug],
                "sizeLabel": f"{size_mb:.1f} MB",
                "sourceUrl": url,
            }
            saved_items.append(item)
            print(f"[{len(saved_items)}/{len(found)}] {rel} ({size_mb:.1f} MB)", flush=True)
            time.sleep(0.08)

        # write per-folder index
        (out_dir / "index.json").write_text(json.dumps(saved_items, indent=2) + "\n")
        print(f"Saved {len(saved_items)} files for {slug}")

        # merge into global manifest (replace this slug)
        all_manifest = [m for m in all_manifest if m.get("id", "").find(f"yupoo-{slug}-") != 0 and slug not in (m.get("tags") or [])]
        # cleaner: remove by tag slug
        all_manifest = [m for m in all_manifest if slug not in (m.get("tags") or [])]
        all_manifest.extend(saved_items)

    save_manifest(all_manifest)
    print(f"\nManifest → {MANIFEST} ({len(all_manifest)} items)")
    print("Open Shop Admin → Media Library to see imports after app reload/deploy.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
