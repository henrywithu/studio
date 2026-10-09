"""Resumeable migration of public reference Vimeo renditions into the studio R2 bucket.

The default 'plan' command only reads local content. 'refresh' reads public reference
pages. Only 'upload' writes R2 objects; 'apply' rewrites verified content references.
"""
import argparse
import concurrent.futures
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "docs/evidence/r2-videos.json"
BASE_URL = "https://studio-media.henrywithu.workers.dev"
VIMEO_PATH = re.compile(r"^/progressive_redirect/playback/(\d+)/rendition/(\d+p)/")


def video_key(source):
    url = urllib.parse.urlparse(source)
    match = VIMEO_PATH.match(url.path)
    if url.scheme == "https" and url.netloc == "player.vimeo.com" and match:
        return f"videos/vimeo/{match[1]}-{match[2]}.mp4"


def save(data):
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    temporary = MANIFEST.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, indent=2) + "\n")
    temporary.replace(MANIFEST)


def request(url, *, body=None, headers=None, method=None, timeout=60):
    req = urllib.request.Request(url, data=body,
                                 headers={"User-Agent": "studio-media-migration/1.0", **(headers or {})},
                                 method=method)
    return urllib.request.urlopen(req, timeout=timeout)


def content_sources():
    sources, unsupported = {}, {}
    media_base = (json.loads(MANIFEST.read_text()).get("baseUrl", BASE_URL)
                  if MANIFEST.exists() else BASE_URL).rstrip("/") + "/videos/"

    def add(source, page):
        if not isinstance(source, str) or not source.startswith("https://"):
            return
        if source.startswith(media_base):
            return
        target = sources if video_key(source) else unsupported
        target.setdefault(source, set()).add(page)

    def walk(value, page):
        if isinstance(value, dict):
            attrs = value.get("attrs", {})
            if value.get("tag") in ("video", "source", "iframe"):
                for attr in ("src", "data-src", "data-src-small"):
                    add(attrs.get(attr), page)
            if "data-thumbnails" in attrs:
                for item in json.loads(attrs["data-thumbnails"]).values():
                    if item.get("video"):
                        add(item.get("src"), page)
            for child in value.values():
                walk(child, page)
        elif isinstance(value, list):
            for child in value:
                walk(child, page)

    for path in sorted((ROOT / "public/content").glob("*.json")):
        walk(json.loads(path.read_text()), path.name)
    return sources, unsupported


def plan():
    previous = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"entries": []}
    entries = {entry["key"]: entry for entry in previous["entries"]}
    sources, unsupported = content_sources()
    for source, pages in sources.items():
        key = video_key(source)
        entry = entries.setdefault(key, {
            "key": key, "sourceUrls": [], "sourcePages": [],
            "downloadUrl": source, "status": "pending",
        })
        entry["sourceUrls"] = sorted(set(entry["sourceUrls"]) | {source})
        entry["sourcePages"] = sorted(set(entry["sourcePages"]) | pages)
    data = {
        "bucket": "studio", "baseUrl": previous.get("baseUrl", BASE_URL),
        "entries": sorted(entries.values(), key=lambda entry: entry["key"]),
        "unsupported": [{"source": u, "sourcePages": sorted(p),
                         "reason": "YouTube requires a downloadable file; not an MP4 source"}
                        for u, p in sorted(unsupported.items())],
    }
    # Preserve exclusions on reruns after their content has been repaired.
    if not data["unsupported"]:
        data["unsupported"] = previous.get("unsupported", [])
    save(data)
    print(f"Planned {len(entries)} renditions; {len(data['unsupported'])} unsupported references", flush=True)


def refresh(data):
    pages = sorted({page for entry in data["entries"] for page in entry["sourcePages"]})

    def fetch_page(page):
        route = "/" if page == "home.json" else "/" + page[:-5].replace("__", "/")
        url = "https://thelinestudio.com" + route
        try:
            with request(url) as response:
                html = response.read().decode()
            match = re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', html, re.S)
            values = json.loads(match[1]) if match else []
            found = {video_key(v): v for v in values if isinstance(v, str) and video_key(v)}
            return page, found
        except Exception as error:
            print(f"Reference refresh failed: {route}: {error}", flush=True)
            return page, {}

    fresh = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for page, found in pool.map(fetch_page, pages):
            fresh.update(found)
    changed = 0
    for entry in data["entries"]:
        if source := fresh.get(entry["key"]):
            entry["downloadUrl"] = source
            entry["sourceUrls"] = sorted(set(entry["sourceUrls"]) | {source})
            changed += 1
    data["referenceCheckedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    save(data)
    print(f"Refreshed {changed}/{len(data['entries'])} renditions from {len(pages)} reference pages", flush=True)


def verify_entry(entry, base):
    url = base.rstrip("/") + "/" + entry["key"]
    with request(url, method="HEAD") as response:
        size = int(response.headers["Content-Length"])
        if size <= 0 or response.headers.get_content_type() != "video/mp4":
            raise ValueError("R2 did not return video metadata")
        if entry.get("bytes") and entry["bytes"] != size:
            raise ValueError("R2 length differs from imported source")
    with request(url, headers={"Range": "bytes=0-31"}) as response:
        if response.status != 206 or response.headers["Content-Range"] != f"bytes 0-31/{size}":
            raise ValueError("R2 byte range response is incorrect")
        if response.read(32)[4:8] != b"ftyp":
            raise ValueError("R2 payload is not an MP4 file")
    return size


def upload(data, token_file, limit):
    if not token_file:
        raise ValueError("Set STUDIO_IMPORT_TOKEN_FILE to a private file containing the temporary importer secret")
    token = Path(token_file).read_text().strip()
    endpoint = os.environ.get("STUDIO_IMPORT_URL", "https://studio-video-import.henrywithu.workers.dev/import")
    pending = [e for e in data["entries"] if e["status"] != "verified"]
    if limit:
        pending = pending[:limit]

    def transfer(entry):
        error = None
        for attempt in range(3):
            try:
                body = json.dumps({"source": entry["downloadUrl"], "key": entry["key"]}).encode()
                with request(endpoint, body=body, headers={
                    "Authorization": "Bearer " + token, "Content-Type": "application/json",
                }, timeout=660) as response:
                    result = json.load(response)
                entry["bytes"] = result["size"]
                entry["etag"] = result["etag"]
                verify_entry(entry, data["baseUrl"])
                entry["status"] = "verified"
                entry["verifiedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                entry.pop("error", None)
                return entry
            except Exception as failure:
                if isinstance(failure, urllib.error.HTTPError):
                    error = f"HTTP {failure.code}: {failure.read(1024).decode(errors='replace')}"
                else:
                    error = str(failure)
                time.sleep(attempt + 1)
        entry.update(status="failed", error=error)
        return entry

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(transfer, entry) for entry in pending]
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            entry = future.result()
            save(data)
            print(f"{index}/{len(pending)} {entry['status']} {entry['key']} "
                  f"{entry.get('bytes', 0)} bytes {entry.get('error', '')}", flush=True)
    failed = sum(e["status"] != "verified" for e in pending)
    if failed:
        raise RuntimeError(f"{failed} transfers failed; original references remain until verified")


def apply(data):
    verified = {entry["key"]: data["baseUrl"].rstrip("/") + "/" + entry["key"]
                for entry in data["entries"] if entry["status"] == "verified"}
    aliases = {source: data["baseUrl"].rstrip("/") + "/" + entry["key"]
               for entry in data["entries"] if entry["status"] == "verified"
               for source in entry["sourceUrls"]}

    def rewrite(value):
        if isinstance(value, str):
            if value in aliases:
                return aliases[value]
            if value.startswith("https://") and (key := video_key(value)) in verified:
                return verified[key]
            if value.startswith(("{", "[")):
                try:
                    decoded = json.loads(value)
                    updated = rewrite(decoded)
                    if updated != decoded:
                        return json.dumps(updated, separators=(",", ":"), ensure_ascii=False)
                except json.JSONDecodeError:
                    pass
            return value
        if isinstance(value, dict):
            return {key: rewrite(child) for key, child in value.items()}
        if isinstance(value, list):
            return [rewrite(child) for child in value]
        return value

    changed = 0
    for path in (ROOT / "public/content").glob("*.json"):
        old = json.loads(path.read_text())
        new = rewrite(old)
        if new != old:
            path.write_text(json.dumps(new, separators=(",", ":"), ensure_ascii=False))
            changed += 1
    print(f"Applied verified R2 aliases to {changed} content files", flush=True)


def verify(data):
    entries = [e for e in data["entries"] if e["status"] == "verified"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(lambda entry: verify_entry(entry, data["baseUrl"]), entries))
    remaining, _ = content_sources()
    if remaining:
        raise RuntimeError(f"{len(remaining)} remote Vimeo sources still present in rendered content")
    print(f"Verified metadata, MP4 signatures and range delivery for {len(entries)} R2 videos", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("plan", "refresh", "upload", "apply", "verify"), nargs="?", default="plan")
    parser.add_argument("--limit", type=int, help="Upload a small trial batch")
    args = parser.parse_args()
    if args.command == "plan":
        plan()
    else:
        data = json.loads(MANIFEST.read_text())
        if args.command == "upload":
            upload(data, os.environ.get("STUDIO_IMPORT_TOKEN_FILE"), args.limit)
        else:
            globals()[args.command](data)
