"""JSON API: /api/posts?sub=cats&sort=top&t=week&after=t3_xxx&limit=50

Serves data only — the UI is a separate Vite app in client/, which proxies
/api here in development.

Run:  python serve.py            (inside the venv — see README.md)
"""

import argparse
import json
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from fetch_cats import SORTS, TIMED_SORTS, TIMES, collect

CACHE_TTL = 600  # seconds; override with --cache-ttl

# (sub, limit, sort, window, after) -> (fetched_at, (posts, cursor)). Every part
# of the key selects a different listing page, not a different view of one. Only
# successes land here, so a failed fetch retries instead of caching the error.
_cache: dict[tuple[str, int, str, str, str], tuple[float, tuple[list, str | None]]] = {}


def cached_collect(sub: str, limit: int, sort: str, window: str, after: str) -> tuple[list, str | None]:
    key = (sub, limit, sort, window, after)
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < CACHE_TTL:
        age = int(time.time() - hit[0])
        print(f"cache hit /r/{sub}/{sort}{' +' + after if after else ''} (age {age}s)")
        return hit[1]
    result = collect(sub, limit, sort, window, after or None)
    _cache[key] = (time.time(), result)
    return result


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if urlparse(self.path).path == "/api/posts":
            return self.serve_posts()
        self.send_error(404, "Not found", "This server only serves /api/posts.")

    def serve_posts(self):
        q = parse_qs(urlparse(self.path).query)
        sub = "".join(c for c in q.get("sub", ["cats"])[0] if c.isalnum() or c == "_")
        try:
            limit = min(int(q.get("limit", ["50"])[0]), 100)
        except ValueError:
            limit = 50

        # Fall back rather than 400 — an odd sort shouldn't break the page.
        sort = q.get("sort", ["new"])[0]
        sort = sort if sort in SORTS else "new"
        window = q.get("t", ["day"])[0]
        window = window if window in TIMES else "day"
        # Reddit ignores `t` for hot/new/rising, so collapse it to one value —
        # otherwise ?t=day and ?t=all cache the same listing twice and refetch it.
        if sort not in TIMED_SORTS:
            window = "day"
        # Reddit fullname, e.g. t3_1uye38f — anything else is dropped.
        after = q.get("after", [""])[0]
        after = after if all(c.isalnum() or c == "_" for c in after) else ""

        try:
            posts, cursor = cached_collect(sub, limit, sort, window, after)
            body = {
                "subreddit": sub,
                "sort": sort,
                "time": window if sort in TIMED_SORTS else None,
                "after": cursor,
                "posts": posts,
            }
            status = 200
        except SystemExit as e:  # credential / subreddit problems
            body, status = {"error": str(e)}, 400
        except Exception as e:
            body, status = {"error": f"{type(e).__name__}: {e}"}, 502

        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        # Listings are cached server-side; let the client always ask.
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def handle_one_request(self):
        # Browsers drop connections routinely (navigating away, closing a tab).
        # That's not an error worth a traceback.
        try:
            super().handle_one_request()
        except ConnectionResetError:
            self.close_connection = True


def main():
    global CACHE_TTL

    ap = argparse.ArgumentParser(description="Serve redditview")
    ap.add_argument("--port", type=int, default=3000)
    ap.add_argument("--cache-ttl", type=int, default=CACHE_TTL, help="seconds (default: 600)")
    args = ap.parse_args()
    CACHE_TTL = args.cache_ttl

    print(f"redditview api -> http://localhost:{args.port}/api/posts  (cache {CACHE_TTL}s)")
    ThreadingHTTPServer(("", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
