import { useEffect, useState } from 'react'

/**
 * One IntersectionObserver per rootMargin, shared by every element watching at
 * that margin — there can be hundreds of tiles on screen, and an observer each
 * would be wasteful.
 */
const observers = new Map<string, IntersectionObserver>()
const callbacks = new WeakMap<Element, () => void>()

function observerFor(rootMargin: string): IntersectionObserver {
  let observer = observers.get(rootMargin)
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          callbacks.get(entry.target)?.()
        }
      },
      { rootMargin },
    )
    observers.set(rootMargin, observer)
  }
  return observer
}

/**
 * True once `ref` has come within `rootMargin` of the viewport. Latches — it
 * never goes back to false, because callers use it to start a fetch that
 * shouldn't be undone by scrolling away.
 */
export function useInView(ref: React.RefObject<Element | null>, rootMargin: string): boolean {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (inView) return
    const element = ref.current
    if (!element) return

    const observer = observerFor(rootMargin)
    callbacks.set(element, () => setInView(true))
    observer.observe(element)

    return () => {
      observer.unobserve(element)
      callbacks.delete(element)
    }
  }, [ref, rootMargin, inView])

  return inView
}
