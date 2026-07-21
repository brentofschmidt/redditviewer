import type { Sort, TimeWindow } from './types'

export const SORTS: Sort[] = ['hot', 'new', 'top', 'rising', 'controversial']
export const TIMES: TimeWindow[] = ['hour', 'day', 'week', 'month', 'year', 'all']

/** Only these two listings accept a time window; the rest ignore it. */
export const TIMED_SORTS: Sort[] = ['top', 'controversial']

export const DEFAULT_SUB = 'cats'
export const DEFAULT_SORT: Sort = 'new'
export const DEFAULT_TIME: TimeWindow = 'day'

export const PAGE_SIZE = 50

export const TIME_LABEL: Record<TimeWindow, string> = {
  hour: 'this hour',
  day: 'today',
  week: 'this week',
  month: 'this month',
  year: 'this year',
  all: 'of all time',
}

export const SORT_LABEL: Record<Sort, string> = {
  hot: 'Hot',
  new: 'New',
  top: 'Top',
  rising: 'Rising',
  controversial: 'Controversial',
}

export const TIME_OPTION_LABEL: Record<TimeWindow, string> = {
  hour: 'Past hour',
  day: 'Today',
  week: 'This week',
  month: 'This month',
  year: 'This year',
  all: 'All time',
}

/**
 * A listing page can legitimately hold no images (a run of text posts), so one
 * empty page is worth skipping past. A whole subreddit of them is not — give up
 * rather than walk the entire listing.
 */
export const MAX_EMPTY_PAGES = 2

// How far ahead to work, in viewport-heights. Percentages rather than pixels so
// the lead time is the same on a laptop and a tall monitor.
//
// Images run generously ahead — previews are ~640px (tens of KB) and cached, so
// a tile that isn't decoded when it scrolls in is the thing that reads as slow.
export const IMAGE_LEAD = '150% 0px 300% 0px' // 1.5 screens up, 3 down
// The page fetch runs a moderate 2 screens ahead. It must stay *smaller* than a
// full page of content, or the sentinel sits inside the margin after page one
// and the feed eagerly chain-loads several pages before the user ever scrolls.
export const PAGE_LEAD = '0px 0px 200% 0px'

export function isSort(value: string | undefined): value is Sort {
  return !!value && (SORTS as string[]).includes(value)
}

export function isTime(value: string | null | undefined): value is TimeWindow {
  return !!value && (TIMES as string[]).includes(value)
}

export function isTimed(sort: Sort): boolean {
  return TIMED_SORTS.includes(sort)
}
