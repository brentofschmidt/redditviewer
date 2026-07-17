export type Sort = 'hot' | 'new' | 'top' | 'rising' | 'controversial'
export type TimeWindow = 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'

/** One row of /api/posts — mirrors clean() in server/fetch_cats.py. */
export type Post = {
  id: string
  title: string
  author: string | null
  score: number
  num_comments: number
  created_utc: string
  permalink: string
  /** Display-sized preview, or null for text posts. */
  image: string | null
  /** Self-post body, truncated server-side. Empty for link posts. */
  text: string
  domain: string | null
  is_self: boolean
  nsfw: boolean
}

export type PostsResponse = {
  subreddit: string
  sort: Sort
  time: TimeWindow | null
  /** Cursor for the next page; null at the end of the listing. */
  after: string | null
  posts: Post[]
}

export type Feed = {
  sub: string
  sort: Sort
  time: TimeWindow
}
