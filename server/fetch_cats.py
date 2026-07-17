"""Fetch image posts from a subreddit via Reddit's OAuth API and emit JSON.

Credentials (free, ~1 min): https://www.reddit.com/prefs/apps -> create app ->
type "script". Then put them in server/.env:

    REDDIT_CLIENT_ID=...
    REDDIT_CLIENT_SECRET=...

Real environment variables and server/reddit_credentials.json also work.

Run:  python fetch_cats.py                    # /r/cats -> stdout
      python fetch_cats.py aww --limit 25
      python fetch_cats.py cats --out posts.json
"""

import argparse
import datetime as dt
import json
import os
import sys

# Must precede requests' SSL setup: this machine has a TLS-intercepting proxy
# whose root cert Python's OpenSSL rejects but Windows' verifier accepts.
try:
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

import requests
from dotenv import load_dotenv

HERE = os.path.dirname(os.path.abspath(__file__))

# Python does not read .env on its own — without this, os.environ never sees it.
# Anchored to this file's directory so the script works from any cwd.
load_dotenv(os.path.join(HERE, ".env"))
USER_AGENT = "windows:redditview:1.0 (personal project)"
TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
API = "https://oauth.reddit.com"

IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".gif", ".webp")

# Reddit's listing endpoints, and the time windows the ranked ones accept.
SORTS = ("hot", "new", "top", "rising", "controversial")
TIMES = ("hour", "day", "week", "month", "year", "all")
TIMED_SORTS = ("top", "controversial")


def load_credentials() -> tuple[str, str]:
    cid = os.environ.get("REDDIT_CLIENT_ID")
    secret = os.environ.get("REDDIT_CLIENT_SECRET")
    if cid and secret:
        return cid, secret

    path = os.path.join(HERE, "reddit_credentials.json")
    if os.path.isfile(path):
        with open(path) as f:
            j = json.load(f)
        if j.get("client_id") and j.get("client_secret"):
            return j["client_id"], j["client_secret"]

    env_path = os.path.join(HERE, ".env")
    found = "found" if os.path.isfile(env_path) else "missing"
    raise SystemExit(
        f"No Reddit credentials. ({env_path} is {found})\n"
        "  1. https://www.reddit.com/prefs/apps -> create another app -> type: script\n"
        "  2. Put the id and secret in server/.env, unquoted:\n"
        "       REDDIT_CLIENT_ID=abc123\n"
        "       REDDIT_CLIENT_SECRET=xyz789"
    )


def get_token(cid: str, secret: str) -> str:
    res = requests.post(
        TOKEN_URL,
        auth=(cid, secret),
        data={"grant_type": "client_credentials"},
        headers={"User-Agent": USER_AGENT},
        timeout=20,
    )
    if res.status_code == 401:
        raise SystemExit("Reddit rejected the credentials (401). Check the id and secret.")
    res.raise_for_status()
    return res.json()["access_token"]


def get_listing(
    token: str, sub: str, sort: str = "new", time: str = "day", after: str | None = None
) -> tuple[list[dict], str | None]:
    """Returns (posts, cursor). The cursor feeds the next call's `after`."""
    params = {"limit": 100, "raw_json": 1}
    # `t` is only meaningful for the ranked listings; hot/new/rising ignore it.
    if sort in TIMED_SORTS:
        params["t"] = time
    if after:
        params["after"] = after

    res = requests.get(
        f"{API}/r/{sub}/{sort}",
        params=params,
        headers={"User-Agent": USER_AGENT, "Authorization": f"bearer {token}"},
        timeout=20,
    )
    if res.status_code == 404:
        raise SystemExit(f"No such subreddit: /r/{sub}")
    res.raise_for_status()

    data = res.json()["data"]
    return [c["data"] for c in data["children"]], data.get("after")


# Tiles render ~300px wide, so ~640 covers a 2x display. Source images run to
# 4000px+ — decoding those into a 300px tile is what makes scrolling stutter.
TARGET_WIDTH = 640


def _smallest_over(variants: list[tuple[int, str]], target: int = TARGET_WIDTH) -> str | None:
    """Narrowest variant at least `target` wide, else the widest available."""
    if not variants:
        return None
    variants = sorted(variants)
    for width, url in variants:
        if width >= target:
            return url
    return variants[-1][1]


def image_url(post: dict) -> str | None:
    """A display-sized image for a post, or None if it hasn't got one.

    Any post carrying a preview qualifies — videos and link posts have
    thumbnails worth showing. Text posts have none, and render as text tiles.
    """
    if post.get("is_gallery"):
        # Galleries keep resized copies in media_metadata[id]['p'], source in 's'.
        for item in (post.get("media_metadata") or {}).values():
            item = item or {}
            sized = _smallest_over([(p["x"], p["u"]) for p in item.get("p", []) if p.get("u")])
            if sized:
                return sized
            if item.get("s", {}).get("u"):
                return item["s"]["u"]
        return None

    # Prefer a resized preview over the full-size original.
    images = (post.get("preview") or {}).get("images") or []
    if images:
        sized = _smallest_over(
            [(r["width"], r["url"]) for r in images[0].get("resolutions", []) if r.get("url")]
        )
        if sized:
            return sized
        if images[0].get("source", {}).get("url"):
            return images[0]["source"]["url"]

    url = post.get("url_overridden_by_dest") or post.get("url") or ""
    return url if url.lower().endswith(IMAGE_EXTS) else None


# A tile only has room for a few lines; no point shipping a 10k-word post.
TEXT_PREVIEW_CHARS = 400


def clean(post: dict, img: str | None) -> dict:
    return {
        "id": post["id"],
        "title": post["title"],
        "author": post.get("author"),
        "score": post.get("score", 0),
        "num_comments": post.get("num_comments", 0),
        "created_utc": dt.datetime.fromtimestamp(
            post["created_utc"], dt.timezone.utc
        ).isoformat(),
        "permalink": f"https://www.reddit.com{post['permalink']}",
        "image": img,
        "text": (post.get("selftext") or "").strip()[:TEXT_PREVIEW_CHARS],
        "domain": post.get("domain"),
        "is_self": post.get("is_self", False),
        "nsfw": post.get("over_18", False),
    }


def collect(
    sub: str, limit: int, sort: str = "new", time: str = "day", after: str | None = None
) -> tuple[list[dict], str | None]:
    """Returns (image posts, cursor). Cursor is None once the listing runs out."""
    if sort not in SORTS:
        raise SystemExit(f"Unknown sort: {sort} (pick one of {', '.join(SORTS)})")
    if time not in TIMES:
        raise SystemExit(f"Unknown time: {time} (pick one of {', '.join(TIMES)})")

    token = get_token(*load_credentials())
    posts, cursor = get_listing(token, sub, sort, time, after)
    window = f"/{time}" if sort in TIMED_SORTS else ""
    print(f"{len(posts)} posts fetched from /r/{sub}/{sort}{window}", file=sys.stderr)

    out = []
    for p in posts:
        if p.get("stickied"):
            continue
        out.append(clean(p, image_url(p)))
        if len(out) == limit:
            # Stopping early: resume from this post, not from the end of the
            # batch, or everything after it would be skipped.
            return out, p["name"]
    return out, cursor


def main() -> int:
    ap = argparse.ArgumentParser(description="Fetch image posts from a subreddit")
    ap.add_argument("sub", nargs="?", default="cats")
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument("--sort", choices=SORTS, default="new")
    ap.add_argument("--time", choices=TIMES, default="day", help="window for top/controversial")
    ap.add_argument("--out", help="write JSON here instead of stdout")
    args = ap.parse_args()

    posts, after = collect(args.sub, args.limit, args.sort, args.time)
    if not posts:
        print(f"No image posts found in /r/{args.sub}.", file=sys.stderr)
        return 1

    payload = json.dumps(
        {
            "subreddit": args.sub,
            "sort": args.sort,
            "time": args.time if args.sort in TIMED_SORTS else None,
            "count": len(posts),
            "after": after,
            "posts": posts,
        },
        indent=2,
    )
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(payload)
        print(f"Wrote {len(posts)} posts to {args.out}", file=sys.stderr)
    else:
        print(payload)
    return 0


if __name__ == "__main__":
    sys.exit(main())
