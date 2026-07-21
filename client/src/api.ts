import { PAGE_SIZE } from './constants'
import type { Feed, PostsResponse } from './types'

/**
 * One page of a listing. Vite proxies /api to the Python server (see
 * vite.config.ts), so this is same-origin and needs no CORS handling.
 */
export async function fetchPosts(
  { sub, sort, time }: Feed,
  after: string | null,
  signal?: AbortSignal,
): Promise<PostsResponse> {
  const params = new URLSearchParams({ sub, sort, t: time, limit: String(PAGE_SIZE) })
  if (after) params.set('after', after)

  let res: Response
  try {
    res = await fetch(`/api/posts?${params}`, { signal })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new Error('Could not reach the server.')
  }

  const body = await res.json().catch(() => ({}))
  // The server reports its own problems in `error` — prefer that to a bare status.
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status}).`)
  return body as PostsResponse
}
