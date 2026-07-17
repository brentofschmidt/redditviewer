import { useRef } from 'react'

import { IMAGE_LEAD } from '../constants'
import { useInView } from '../hooks/useInView'
import type { Post } from '../types'
import { formatMeta } from '../format'

type Props = {
  post: Post
  onImageError: (id: string) => void
}

export function PhotoTile({ post, onImageError }: Props) {
  const ref = useRef<HTMLAnchorElement>(null)
  const inView = useInView(ref, IMAGE_LEAD)

  return (
    <a ref={ref} className="tile" href={post.permalink} target="_blank" rel="noopener">
      {/* src stays unset until the tile nears the viewport — assigning it is what
          starts the fetch. */}
      <img
        src={inView ? post.image! : undefined}
        alt={post.title}
        loading="lazy"
        // Decode off the main thread so a big photo can't block scrolling.
        decoding="async"
        // Preview URLs are signed and can expire; drop the tile rather than
        // leave a broken image in the grid.
        onError={() => onImageError(post.id)}
      />
      <div className="caption">
        <span className="title">{post.title}</span>
        <span className="meta">{formatMeta(post)}</span>
      </div>
    </a>
  )
}
