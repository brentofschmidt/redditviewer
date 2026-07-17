type Props = {
  loading: boolean
  /** Only announce an end the user can actually reach. */
  showEnd: boolean
}

export function Footer({ loading, showEnd }: Props) {
  return (
    <footer aria-live="polite">
      {loading && (
        <div id="loader">
          <span className="spinner" aria-hidden="true" />
          <span>Loading...</span>
        </div>
      )}
      {!loading && showEnd && <p id="end">That's everything</p>}
    </footer>
  )
}
