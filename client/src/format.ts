import type { Post } from './types'

/** e.g. "▲ 147,041 · 1,657 comments" */
export function formatMeta(post: Post): string {
  const score = post.score.toLocaleString()
  const comments = post.num_comments.toLocaleString()
  return `▲ ${score} · ${comments} ${post.num_comments === 1 ? 'comment' : 'comments'}`
}
