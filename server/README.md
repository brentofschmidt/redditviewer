# server

Fetches posts from a subreddit via Reddit's OAuth API and serves them as JSON.
Data only — the UI lives in `client/` (Vite + React), which proxies `/api` here.

```
python serve.py     -> :3000  JSON API, nothing else
cd client && npm start -> :3001  the app you actually open
```

## Credentials (required, free, ~1 min)

Reddit blocks anonymous API access, so an app is needed. It is the official
route, not a workaround.

1. <https://www.reddit.com/prefs/apps> -> **create another app...**
2. name: anything &nbsp;|&nbsp; **type: script** &nbsp;|&nbsp; redirect uri: `http://localhost:3000`
3. Copy the **client id** (the unlabelled string under the app name) and the
   **secret**.
4. Save them to `server/reddit_credentials.json` (gitignored):

   ```json
   { "client_id": "...", "client_secret": "..." }
   ```

   Or set `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`.

Rate limit is 100 requests/minute — far more than this needs.

## Setup

```
cd server
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Usage

```
python serve.py                       # API on :3000 (what the client needs)
python serve.py --port 3100           # somewhere else
python serve.py --cache-ttl 60        # tighter cache while developing
```

Listings are cached in memory for 10 minutes, keyed by
`(sub, limit, sort, window, after)` — so each sort, time window and page caches
independently. Only successes are cached; a failure retries next request.

The fetcher also runs standalone:

```
python fetch_cats.py                  # /r/cats -> JSON on stdout
python fetch_cats.py aww --limit 25 --sort top --time all
python fetch_cats.py cats --out posts.json
```

Progress goes to stderr, so stdout stays pipeable.

## Output

```json
{
  "subreddit": "cats",
  "count": 50,
  "posts": [
    {
      "id": "aaa",
      "title": "Loaf achieved",
      "author": "catlover",
      "score": 4821,
      "num_comments": 142,
      "created_utc": "2025-07-18T00:00:00+00:00",
      "permalink": "https://www.reddit.com/r/cats/comments/aaa/loaf/",
      "image": "https://i.redd.it/abc.jpg",
      "nsfw": false
    }
  ]
}
```

`permalink` feeds the iframe embeds in `public/app.js`; `image` is there if you
would rather render plain `<img>` tiles.

Direct images, galleries (via `media_metadata`), and `post_hint: image` posts are
all resolved to a URL. Self posts, videos, and stickied threads are skipped.

## Why OAuth and not scraping

Anonymous access is dead from this machine. Verified — every one of these gets
the same 403 `You've been blocked by network security` page:

| Client | Result |
| --- | --- |
| Node `fetch`, Python `requests` | 403 |
| `curl_cffi` (`impersonate="chrome"`) | 403 |
| Headless Chrome, fresh profile | 403 |
| Selenium — headed, automation flags hidden | 403 |
| Selenium — in-page `fetch()` from a reddit origin | 403 |
| `old.reddit.com` variants of all the above | 403 |

Not the language, the library, the User-Agent, `www` vs `old`, or headless mode.
Selenium's Chrome was verified to send Chrome's exact headers and TLS
fingerprint (JA4 `t13d1516h2_8daaf6152771_...`) and is still refused, while a
normal browser on the same IP loads the same page fine.

The sibling project `trading/strategies/scrapero` hits the identical wall and
silently falls back to ApeWisdom for its data. Its docstring reaches the same
conclusion: get credentials.

## TLS note

This machine has a TLS-intercepting proxy (antivirus or corporate). Its root
cert is in the Windows store, but Python's OpenSSL rejects it as malformed
(`Basic Constraints of CA cert not marked critical`). `truststore` fixes it by
using Windows' native verification — that is why it is in `requirements.txt`.
Node was unaffected; `curl`, `curl_cffi`, and Python were.
