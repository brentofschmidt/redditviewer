import { formatMeta } from '../format'
import type { Post } from '../types'

export function TextTile({ post }: { post: Post }) {
  // Self posts show their text; link posts have none, so show where they go.
  const excerpt = post.text || (!post.is_self ? post.domain : null)
  const isLink = !post.text && !!excerpt

  return (
    <a className="tile text" href={post.permalink} target="_blank" rel="noopener">
      <div className="body">
        <h3 className="title">{post.title}</h3>
        {excerpt && <p className={isLink ? 'excerpt link' : 'excerpt'}>{excerpt}</p>}
      </div>
      <div className="meta">{formatMeta(post)}</div>
    </a>
  )
}
