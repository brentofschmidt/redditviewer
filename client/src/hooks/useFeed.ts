import { useCallback, useEffect, useRef, useState } from 'react'

import { fetchPosts } from '../api'
import { MAX_EMPTY_PAGES } from '../constants'
import type { Feed, Post } from '../types'

type FeedState = {
  posts: Post[]
  loading: boolean
  /** No more pages: listing exhausted, or nothing here, or it failed. */
  done: boolean
  error: string | null
  loadMore: () => void
  /** Hides a tile whose (signed, expiring) image URL failed to load. */
  dropPost: (id: string) => void
}

export function useFeed(feed: Feed): FeedState {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const after = useRef<string | null>(null)
  const empties = useRef(0)
  // Bumped whenever the feed changes, so a response from the previous feed can
  // be recognised as stale and dropped rather than appended to the new grid.
  const run = useRef(0)
  // Read inside loadMore without making it a dependency (which would recreate
  // the callback on every page and re-fire the scroll effect).
  const live = useRef({ loading: false, done: false })

  const loadMore = useCallback(async () => {
    if (live.current.loading || live.current.done) return
    live.current.loading = true
    setLoading(true)

    const mine = run.current

    try {
      const body = await fetchPosts(feed, after.current)
      // The feed changed while this was in flight — throw the result away.
      if (mine !== run.current) return

      after.current = body.after
      empties.current = body.posts.length ? 0 : empties.current + 1
      // Stop at the end of the listing, or once it's clear there's nothing here.
      const finished = !body.after || empties.current >= MAX_EMPTY_PAGES

      setPosts((current) => [...current, ...body.posts])
      live.current.done = finished
      setDone(finished)
    } catch (err) {
      if (mine !== run.current) return
      setError(err instanceof Error ? err.message : String(err))
      // Stop: otherwise the scroll observer hammers a failing endpoint.
      live.current.done = true
      setDone(true)
    } finally {
      if (mine === run.current) {
        live.current.loading = false
        setLoading(false)
      }
    }
  }, [feed])

  // Reset and load page one whenever the feed changes.
  useEffect(() => {
    run.current++
    after.current = null
    empties.current = 0
    live.current = { loading: false, done: false }
    setPosts([])
    setDone(false)
    setError(null)
    setLoading(false)
    void loadMore()
  }, [loadMore])

  const dropPost = useCallback((id: string) => {
    setPosts((current) => current.filter((post) => post.id !== id))
  }, [])

  return { posts, loading, done, error, loadMore, dropPost }
}
