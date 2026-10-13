#!/usr/bin/env python3
"""
Scrape public Yupoo album / collection pages into LITT LUXURY Media Library assets.

Personal/reference use on public (no-password) pages only.

Examples:
  python3 scripts/scrape_yupoo_public.py \\
    --url https://paypalshop.x.yupoo.com/collections/2865378

  python3 scripts/scrape_yupoo_public.py \\
    --url https://makeawishlove.x.yupoo.com/albums

  python3 scripts/scrape_yupoo_public.py \\
    --url https://makeawishlove.x.yupoo.com/albums/254205849?uid=1

  python3 scripts/scrape_yupoo_public.py \\
    --url "https://fabpurse.x.yupoo.com/categories/22731?isSubCate=true"
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Iterable
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse

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
ALBUM_ID_RE = re.compile(r"/albums/(\d+)")

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
    """Try higher quality variants first (incl. square → medium/big)."""
    u = url
    candidates = []
    for a, b in (
        ("/square.", "/big."),
        ("/square.", "/medium."),
        ("/thumb.", "/big."),
        ("/thumb.", "/medium."),
        ("/small.", "/big."),
        ("/small.", "/medium."),
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
    """Keep one URL per photo path (prefer higher quality; upgrade square/thumb)."""
    best: dict[str, str] = {}
    rank = {"original": 4, "big": 3, "medium": 2, "small": 1, "square": 0, "thumb": 0}

    def key_and_rank(u: str):
        m = re.search(
            r"(https://photo\.yupoo\.com/.+?)/(square|thumb|small|medium|big|original)\.([a-z0-9]+)",
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


def shop_origin(url: str) -> str:
    p = urlparse(url)
    return f"{p.scheme}://{p.netloc}"


def is_albums_index(url: str) -> bool:
    path = urlparse(url).path.rstrip("/")
    return path.endswith("/albums") or path == "/albums"


def is_category_index(url: str) -> bool:
    return bool(re.search(r"/categories/\d+", urlparse(url).path))


def is_album_listing(url: str) -> bool:
    """Shop pages that list albums (index or category) rather than a single gallery."""
    return is_albums_index(url) or is_category_index(url)


def with_page(url: str, page: int) -> str:
    """Set/replace page=N while preserving other query params (e.g. isSubCate)."""
    if page <= 1:
        return url
    p = urlparse(url)
    q = {k: v[0] for k, v in parse_qs(p.query, keep_blank_values=True).items()}
    q["page"] = str(page)
    return urlunparse(p._replace(query=urlencode(q)))


def normalize_album_url(url: str) -> str:
    """Individual albums on many shops need ?uid=1 to render public gallery HTML."""
    if re.search(r"/albums/\d+", url) and "uid=" not in url:
        return url + ("&" if "?" in url else "?") + "uid=1"
    return url


def fetch_paginated_html(
    session: requests.Session,
    url: str,
    max_pages: int = 8,
    *,
    label: str = "page",
) -> str:
    """Fetch ?page=N until no new photo.yupoo.com URLs appear."""
    chunks: list[str] = []
    seen: set[str] = set()
    base = url
    for page in range(1, max_pages + 1):
        cand = with_page(base, page)
        try:
            resp = session.get(cand, headers=HEADERS, timeout=20)
        except requests.RequestException as e:
            print(f"  {label} {page}: stop ({e})", flush=True)
            break
        if resp.status_code != 200:
            print(f"  {label} {page}: HTTP {resp.status_code}, stop", flush=True)
            break
        imgs = [u for u in PHOTO_RE.findall(resp.text) if "/icons/" not in u]
        new = [u for u in imgs if u not in seen]
        if page > 1 and not new:
            print(f"  {label} {page}: no new photos, stop", flush=True)
            break
        seen.update(new)
        chunks.append(resp.text)
        print(f"  {label} {page}: +{len(new)} (total {len(seen)})", flush=True)
        time.sleep(0.2)
    return "\n".join(chunks)


def discover_album_ids(
    session: requests.Session,
    index_url: str,
    max_pages: int = 12,
    max_albums: int = 80,
) -> list[str]:
    """Collect album IDs from a shop /albums index (paginated)."""
    origin = shop_origin(index_url)
    session.get(index_url, headers={**HEADERS, "Referer": origin}, timeout=20)
    ids: list[str] = []
    seen: set[str] = set()
    for page in range(1, max_pages + 1):
        if len(ids) >= max_albums:
            break
        cand = with_page(index_url, page)
        try:
            resp = session.get(
                cand,
                headers={**HEADERS, "Referer": index_url},
                timeout=20,
            )
        except requests.RequestException as e:
            print(f"  listing page {page}: stop ({e})", flush=True)
            break
        if resp.status_code != 200:
            print(f"  listing page {page}: HTTP {resp.status_code}, stop", flush=True)
            break
        found = ALBUM_ID_RE.findall(resp.text)
        new = [a for a in found if a not in seen]
        # Keep order, unique
        for a in found:
            if a not in seen:
                seen.add(a)
                ids.append(a)
                if len(ids) >= max_albums:
                    break
        print(f"  listing page {page}: +{len(new)} (total {len(ids)})", flush=True)
        if page > 1 and not new:
            break
        time.sleep(0.25)
    return ids[:max_albums]


def fetch_albums_index_photos(
    session: requests.Session,
    index_url: str,
    max_album_pages: int = 6,
    max_albums: int = 80,
) -> str:
    """
    Crawl /albums listing → each /albums/<id>?uid=1 gallery.
    Returns concatenated HTML for photo regex extraction.
    """
    origin = shop_origin(index_url)
    album_ids = discover_album_ids(session, index_url, max_albums=max_albums)
    print(f"  discovered {len(album_ids)} albums", flush=True)
    chunks: list[str] = []
    for i, aid in enumerate(album_ids, 1):
        album_url = normalize_album_url(f"{origin}/albums/{aid}")
        print(f"  [{i}/{len(album_ids)}] {album_url}", flush=True)
        html = fetch_paginated_html(
            session,
            album_url,
            max_pages=max_album_pages,
            label=f"album {aid} page",
        )
        if html.strip():
            chunks.append(html)
        time.sleep(0.15)
    return "\n".join(chunks)


def fetch_collection_pages(session: requests.Session, url: str, max_pages: int = 8) -> str:
    return fetch_paginated_html(session, url, max_pages=max_pages, label="collection page")


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
    ap.add_argument("--max-pages", type=int, default=8, help="Pagination depth per album/collection")
    ap.add_argument("--max-albums", type=int, default=80, help="Max albums when scraping /albums index")
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
            origin = shop_origin(url)
            session.headers.update({**HEADERS, "Referer": origin + "/"})
            resp0 = session.get(url, headers=HEADERS, timeout=25)
            if resp0.status_code == 404 and "uid=" not in url and re.search(r"/albums/\d+", url):
                # retry with uid=1
                url = normalize_album_url(url)
                resp0 = session.get(url, headers=HEADERS, timeout=25)
            if resp0.status_code == 404 and not is_album_listing(url):
                print(f"FAIL: URL returned 404 (private/removed?): {url}", file=sys.stderr)
                continue
            if is_album_listing(url):
                html = fetch_albums_index_photos(
                    session,
                    url,
                    max_album_pages=args.max_pages,
                    max_albums=args.max_albums,
                )
            elif "/collections/" in url:
                html = fetch_collection_pages(session, url, max_pages=args.max_pages)
            elif re.search(r"/albums/\d+", url):
                html = fetch_paginated_html(
                    session,
                    normalize_album_url(url),
                    max_pages=args.max_pages,
                    label="album page",
                )
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
