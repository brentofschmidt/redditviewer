import type { Post } from './types'

/** e.g. "u/catlover · ▲ 147,041 · 1,657 comments" */
export function formatMeta(post: Post): string {
  const score = post.score.toLocaleString()
  const comments = post.num_comments.toLocaleString()
  const stats = `▲ ${score} · ${comments} ${post.num_comments === 1 ? 'comment' : 'comments'}`
  // author is null on deleted/removed posts.
  return post.author ? `u/${post.author} · ${stats}` : stats
}
