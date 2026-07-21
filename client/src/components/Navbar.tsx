import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  DEFAULT_SUB,
  SORTS,
  SORT_LABEL,
  TIMES,
  TIME_OPTION_LABEL,
  isTimed,
} from '../constants'
import { useFeedParams } from '../hooks/useFeedParams'
import { urlFor } from '../routing'
import type { Feed, Sort, TimeWindow } from '../types'

export function Navbar() {
  const feed = useFeedParams()
  const navigate = useNavigate()
  const [draft, setDraft] = useState(feed.sub)

  // The URL is the source of truth; follow it when it changes underneath us
  // (back button, deep link, logo click).
  useEffect(() => setDraft(feed.sub), [feed.sub])

  const go = (next: Partial<Feed>) => navigate(urlFor({ ...feed, ...next }))

  return (
    <header className="navbar">
      <nav className="navbar-inner">
        <a
          className="brand"
          href={urlFor({ ...feed, sub: DEFAULT_SUB })}
          onClick={(e) => {
            e.preventDefault()
            go({ sub: DEFAULT_SUB })
          }}
        >
          redditview
        </a>

        <form
          className="search"
          onSubmit={(e) => {
            e.preventDefault()
            const sub = draft.trim().replace(/^\/?r\//, '')
            if (sub) go({ sub })
          }}
        >
          <span className="prefix">r/</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            aria-label="Subreddit"
          />
        </form>

        <div className="filters">
          <select
            aria-label="Sort"
            value={feed.sort}
            onChange={(e) => go({ sort: e.target.value as Sort })}
          >
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABEL[sort]}
              </option>
            ))}
          </select>

          {/* Reddit ignores `t` for hot/new/rising, so don't offer it there. */}
          {isTimed(feed.sort) && (
            <select
              aria-label="Time range"
              value={feed.time}
              onChange={(e) => go({ time: e.target.value as TimeWindow })}
            >
              {TIMES.map((time) => (
                <option key={time} value={time}>
                  {TIME_OPTION_LABEL[time]}
                </option>
              ))}
            </select>
          )}
        </div>
      </nav>
    </header>
  )
}
