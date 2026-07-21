import { isTimed } from './constants'
import type { Feed } from './types'

/** Canonical URL for a feed: /r/<sub>/<sort> with ?t= only where it applies. */
export function urlFor({ sub, sort, time }: Feed): string {
  return `/r/${sub}/${sort}${isTimed(sort) ? `?t=${time}` : ''}`
}
