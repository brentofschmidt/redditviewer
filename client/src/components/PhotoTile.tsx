import { useRef, useState } from 'react'

import { IMAGE_LEAD } from '../constants'
import { formatMeta } from '../format'
import { useInView } from '../hooks/useInView'
import type { Post } from '../types'

type Props = {
  post: Post
  onImageError: (id: string) => void
}

export function PhotoTile({ post, onImageError }: Props) {
  const ref = useRef<HTMLAnchorElement>(null)
  const inView = useInView(ref, IMAGE_LEAD)
  const video = useRef<HTMLVideoElement>(null)
  const [hovering, setHovering] = useState(false)

  const animated = Boolean(post.redgif || post.video)

  const onEnter = () => {
    if (post.redgif) setHovering(true)
    // preload="none" means the mp4 isn't fetched until play() — hover is what
    // spends the bandwidth, nothing at rest.
    else video.current?.play().catch(() => {})
  }
  const onLeave = () => {
    if (post.redgif) setHovering(false)
    else {
      const v = video.current
      if (!v) return
      v.pause()
      v.currentTime = 0
    }
  }

  return (
    <a
      ref={ref}
      className="tile"
      href={post.permalink}
      target="_blank"
      rel="noopener"
      onMouseEnter={animated ? onEnter : undefined}
      onMouseLeave={animated ? onLeave : undefined}
    >
      {post.image && (
        // src stays unset until the tile nears the viewport — assigning it is
        // what starts the fetch.
        <img
          src={inView ? post.image : undefined}
          alt={post.title}
          loading="lazy"
          // Decode off the main thread so a big photo can't block scrolling.
          decoding="async"
          // Preview URLs are signed and can expire; drop the tile rather than
          // leave a broken image in the grid.
          onError={() => onImageError(post.id)}
        />
      )}

      {post.video && !post.redgif && inView && (
        <video ref={video} className="preview" src={post.video} muted loop playsInline preload="none" />
      )}

      {/* Kept mounted (like the <video>) and toggled by src rather than mounted
          on hover: inserting a node into a content-visibility tile on hover
          triggers a relayout that briefly flashes the scrollbar. about:blank at
          rest costs nothing and stops the player when the pointer leaves. */}
      {post.redgif && inView && (
        <iframe
          className="preview"
          src={hovering ? post.redgif : 'about:blank'}
          title={post.title}
          allow="autoplay; fullscreen"
        />
      )}

      {animated && <span className="badge">GIF</span>}

      <div className="caption">
        <span className="title">{post.title}</span>
        <span className="meta">{formatMeta(post)}</span>
      </div>
    </a>
  )
}
