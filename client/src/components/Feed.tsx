import { useEffect, useRef } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { PAGE_LEAD, TIME_LABEL, isTimed } from '../constants'
import { useFeed } from '../hooks/useFeed'
import { useFeedParams } from '../hooks/useFeedParams'
import { urlFor } from '../routing'
import type { Feed as FeedParams } from '../types'
import { Footer } from './Footer'
import { PhotoTile } from './PhotoTile'
import { TextTile } from './TextTile'

/** e.g. "/r/cats · top of all time" */
function describe({ sub, sort, time }: FeedParams): string {
  return `/r/${sub} · ${sort}${isTimed(sort) ? ` ${TIME_LABEL[time]}` : ''}`
}

export function Feed() {
  const feed = useFeedParams()
  const { pathname, search } = useLocation()

  const { posts, loading, done, error, loadMore, dropPost } = useFeed(feed)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = `${describe(feed)} · redditview`
  }, [feed])

  // Load the next page when the sentinel comes within PAGE_LEAD of the viewport.
  // Re-observing after each page (posts.length dep) makes the observer
  // re-evaluate: a full page pushes the sentinel out of range so it waits for
  // the next scroll, while a page too sparse to move it fires again — covering
  // the stall without eagerly chain-loading a normal first page.
  useEffect(() => {
    const element = sentinel.current
    if (!element || done) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore()
      },
      { rootMargin: PAGE_LEAD },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [loadMore, done, posts.length])

  // The canonical URL always carries a sort, so /r/cats becomes /r/cats/new.
  const canonical = urlFor(feed)
  if (canonical !== `${pathname}${search}`) return <Navigate to={canonical} replace />

  // Server errors are self-contained sentences that name the sub (banned,
  // private, no such subreddit), so show them as-is.
  const message = error
    ? error
    : done && !posts.length
      ? `No posts in ${describe(feed)}.`
      : null

  return (
    <>
      {/* Problems only — the footer covers loading, and the grid speaks for
          itself when posts are there. */}
      {message && <p id="status">{message}</p>}

      <main id="grid">
        {posts.map((post) =>
          post.image || post.redgif ? (
            <PhotoTile key={post.id} post={post} onImageError={dropPost} />
          ) : (
            <TextTile key={post.id} post={post} />
          ),
        )}
      </main>

      <div id="sentinel" ref={sentinel} aria-hidden="true" />
      <Footer loading={loading} showEnd={done && posts.length > 0} />
    </>
  )
}
