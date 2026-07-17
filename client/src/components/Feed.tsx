import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import {
  DEFAULT_SORT,
  DEFAULT_TIME,
  PAGE_LEAD,
  PAGE_LEAD_SCREENS,
  TIME_LABEL,
  isSort,
  isTime,
  isTimed,
} from '../constants'
import { useFeed } from '../hooks/useFeed'
import type { Feed as FeedParams } from '../types'
import { Controls } from './Controls'
import { Footer } from './Footer'
import { PhotoTile } from './PhotoTile'
import { TextTile } from './TextTile'

/** e.g. "/r/cats · top of all time" */
function describe({ sub, sort, time }: FeedParams): string {
  return `/r/${sub} · ${sort}${isTimed(sort) ? ` ${TIME_LABEL[time]}` : ''}`
}

export function urlFor({ sub, sort, time }: FeedParams): string {
  return `/r/${sub}/${sort}${isTimed(sort) ? `?t=${time}` : ''}`
}

export function Feed() {
  const { sub = '', sort: sortParam } = useParams()
  const [search] = useSearchParams()
  const navigate = useNavigate()

  const timeParam = search.get('t')
  const sort = isSort(sortParam) ? sortParam : DEFAULT_SORT
  const time = isTime(timeParam) ? timeParam : DEFAULT_TIME

  // Identity matters: useFeed resets on a new object, so only rebuild when a
  // value actually changes.
  const feed = useMemo<FeedParams>(() => ({ sub, sort, time }), [sub, sort, time])

  const { posts, loading, done, error, loadMore, dropPost } = useFeed(feed)
  const sentinel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = `${describe(feed)} · redditview`
  }, [feed])

  const onNavigate = useCallback(
    (next: Partial<FeedParams>) => navigate(urlFor({ ...feed, ...next })),
    [feed, navigate],
  )

  // Pull the next page well before the sentinel is reached.
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
  }, [loadMore, done])

  // An observer only fires on an intersection *change*. A page of few or no
  // images can leave the sentinel sitting inside the margin, which would stall
  // the feed — so after each page, check whether it's still near and keep going.
  useEffect(() => {
    if (loading || done || !sentinel.current) return
    if (sentinel.current.getBoundingClientRect().top < innerHeight * PAGE_LEAD_SCREENS) {
      void loadMore()
    }
  }, [posts, loading, done, loadMore])

  // The canonical URL always carries a sort, so /r/cats becomes /r/cats/new.
  const canonical = urlFor(feed)
  const current = `${location.pathname}${location.search}`
  if (sub && canonical !== current) return <Navigate to={canonical} replace />

  const message = error
    ? `Couldn't load /r/${sub}: ${error}`
    : done && !posts.length
      ? `No posts in ${describe(feed)}.`
      : null

  return (
    <>
      <Controls feed={feed} onNavigate={onNavigate} />

      {/* Problems only — the footer covers loading, and the grid speaks for
          itself when posts are there. */}
      {message && <p id="status">{message}</p>}

      <main id="grid">
        {posts.map((post) =>
          post.image ? (
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
