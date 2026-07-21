import { useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

import { DEFAULT_SORT, DEFAULT_SUB, DEFAULT_TIME, isSort, isTime } from '../constants'
import type { Feed, Sort, TimeWindow } from '../types'

const PATH = /^\/r\/([A-Za-z0-9_]{1,50})(?:\/([a-z]+))?\/?$/

/**
 * The feed described by the current URL. Reads location + query directly (not
 * useParams) so it works both inside a route and in the always-mounted navbar.
 * Invalid sort/time fall back to defaults — the feed's canonical redirect then
 * cleans the URL up.
 *
 * The result is memoised on its primitive values: useFeed resets whenever this
 * object's identity changes, so returning a fresh object each render would loop.
 */
export function useFeedParams(): Feed {
  const { pathname } = useLocation()
  const [search] = useSearchParams()

  const match = pathname.match(PATH)
  const rawSort = match?.[2]
  const rawTime = search.get('t')

  const sub = match?.[1] ?? DEFAULT_SUB
  const sort: Sort = isSort(rawSort) ? rawSort : DEFAULT_SORT
  const time: TimeWindow = isTime(rawTime) ? rawTime : DEFAULT_TIME

  return useMemo(() => ({ sub, sort, time }), [sub, sort, time])
}
