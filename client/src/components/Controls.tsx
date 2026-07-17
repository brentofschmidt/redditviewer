import { useEffect, useState } from 'react'

import { SORTS, SORT_LABEL, TIMES, TIME_OPTION_LABEL, isTimed } from '../constants'
import type { Feed, Sort, TimeWindow } from '../types'

type Props = {
  feed: Feed
  onNavigate: (next: Partial<Feed>) => void
}

export function Controls({ feed, onNavigate }: Props) {
  const [draft, setDraft] = useState(feed.sub)

  // The URL is the source of truth: if it changes underneath us (back button,
  // deep link), the input follows it rather than the other way round.
  useEffect(() => setDraft(feed.sub), [feed.sub])

  return (
    <header>
      <h1>redditview</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const sub = draft.trim().replace(/^\/?r\//, '')
          if (sub) onNavigate({ sub })
        }}
      >
        <span className="prefix">/r/</span>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          spellCheck={false}
          aria-label="Subreddit"
        />
        <button type="submit">Load</button>
      </form>

      <select
        aria-label="Sort"
        value={feed.sort}
        onChange={(e) => onNavigate({ sort: e.target.value as Sort })}
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
          onChange={(e) => onNavigate({ time: e.target.value as TimeWindow })}
        >
          {TIMES.map((time) => (
            <option key={time} value={time}>
              {TIME_OPTION_LABEL[time]}
            </option>
          ))}
        </select>
      )}
    </header>
  )
}
