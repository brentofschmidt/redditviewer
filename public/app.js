const grid = document.getElementById('grid')
const status = document.getElementById('status')
const form = document.getElementById('sub-form')
const input = document.getElementById('sub-input')
const sortSelect = document.getElementById('sort')
const timeSelect = document.getElementById('time')
const sentinel = document.getElementById('sentinel')
const loader = document.getElementById('loader')
const end = document.getElementById('end')

// Only these two listings accept a time window; the rest ignore it.
const TIMED_SORTS = ['top', 'controversial']
const SORTS = ['hot', 'new', 'top', 'rising', 'controversial']
const TIMES = ['hour', 'day', 'week', 'month', 'year', 'all']

const TIME_LABEL = {
  hour: 'this hour',
  day: 'today',
  week: 'this week',
  month: 'this month',
  year: 'this year',
  all: 'of all time',
}

// A listing page can legitimately hold no images (a run of text posts), so one
// empty page is worth skipping past. A whole subreddit of them is not — give up
// rather than walk the entire listing.
const MAX_EMPTY_PAGES = 2

const state = {
  sub: 'cats',
  sort: 'new',
  time: 'day',
  after: null, // Reddit's cursor for the next page; null once exhausted
  done: false,
  loading: false,
  count: 0,
  empties: 0, // consecutive pages that yielded no images
  run: 0, // bumped on every reset, so stale responses can be discarded
}

// How far ahead to work, in viewport-heights. Percentages rather than pixels so
// the lead time is the same on a laptop and a tall monitor. Generous because
// previews are ~640px (tens of KB), and listings are cached server-side — so
// running ahead is cheap, and a tile that isn't decoded when it arrives is the
// thing that actually reads as slow.
const IMAGE_LEAD = '150% 0px 300% 0px' // 1.5 screens up, 3 down
const PAGE_LEAD = '0px 0px 400% 0px' // start the next fetch 4 screens early

// Start fetching a photo well before its tile reaches the viewport, so it is
// decoded and painted by the time it scrolls in.
const lazy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      const img = entry.target.querySelector('img')
      if (img && !img.src) img.src = img.dataset.src
      lazy.unobserve(entry.target)
    }
  },
  { rootMargin: IMAGE_LEAD },
)

function describe() {
  const window = TIMED_SORTS.includes(state.sort) ? ` ${TIME_LABEL[state.time]}` : ''
  return `/r/${state.sub} · ${state.sort}${window}`
}

// The status line is for problems only — the footer covers loading, and the
// grid speaks for itself when posts are there.
function say(message) {
  status.textContent = message ?? ''
  status.hidden = !message
}

// --- routing: /r/<sub>/<sort>?t=<window> ---------------------------------

function readUrl() {
  const match = location.pathname.match(/^\/r\/([A-Za-z0-9_]{1,50})(?:\/([a-z]+))?\/?$/)
  const query = new URLSearchParams(location.search)
  const sort = match?.[2]
  const time = query.get('t')

  state.sub = match?.[1] ?? 'cats'
  state.sort = SORTS.includes(sort) ? sort : 'new'
  state.time = TIMES.includes(time) ? time : 'day'

  // Push the URL's truth into the controls, not the other way round.
  input.value = state.sub
  sortSelect.value = state.sort
  timeSelect.value = state.time
}

function urlFor() {
  const query = TIMED_SORTS.includes(state.sort) ? `?t=${state.time}` : ''
  return `/r/${state.sub}/${state.sort}${query}`
}

function writeUrl() {
  const url = urlFor()
  if (url !== location.pathname + location.search) history.pushState(null, '', url)
}

function el(tag, className, text) {
  const node = document.createElement(tag)
  node.className = className
  if (text != null) node.textContent = text
  return node
}

function meta(post) {
  return `▲ ${post.score} · ${post.num_comments} comments`
}

function photoTile(tile, post) {
  const img = document.createElement('img')
  // src stays unset until the tile nears the viewport — assigning it starts
  // the fetch, so it must be the last thing we do.
  img.dataset.src = post.image
  img.alt = post.title
  img.loading = 'lazy'
  // Decode off the main thread so a big photo can't block scrolling.
  img.decoding = 'async'
  // Preview URLs are signed and can expire; drop the tile rather than leave a
  // broken image in the grid.
  img.addEventListener('error', () => tile.remove())

  const caption = el('div', 'caption')
  caption.append(el('span', 'title', post.title), el('span', 'meta', meta(post)))

  tile.append(img, caption)
  lazy.observe(tile)
}

function textTile(tile, post) {
  tile.classList.add('text')
  const body = el('div', 'body')
  body.append(el('h3', 'title', post.title))

  // Self posts show their text; link posts have none, so show where they go.
  if (post.text) body.append(el('p', 'excerpt', post.text))
  else if (!post.is_self && post.domain) body.append(el('p', 'excerpt link', post.domain))

  tile.append(body, el('div', 'meta', meta(post)))
}

function render(posts) {
  for (const post of posts) {
    const tile = document.createElement('a')
    tile.className = 'tile'
    tile.href = post.permalink
    tile.target = '_blank'
    tile.rel = 'noopener'

    if (post.image) photoTile(tile, post)
    else textTile(tile, post)

    grid.append(tile)
  }
}

function nearViewport(el) {
  // Mirrors PAGE_LEAD, for the case where the observer won't re-fire because
  // the sentinel never left its margin.
  return el.getBoundingClientRect().top < innerHeight * 5
}

async function loadPage() {
  if (state.loading || state.done) return
  state.loading = true
  loader.hidden = false

  const run = state.run
  const { sub, sort, time, after } = state

  try {
    const params = new URLSearchParams({ sub, sort, t: time, limit: 50 })
    if (after) params.set('after', after)

    const res = await fetch(`/api/posts?${params}`)
    const body = await res.json()
    if (!res.ok) throw new Error(body.error ?? res.statusText)
    // A reset (new sub/sort) happened while this was in flight — drop it.
    if (run !== state.run) return

    render(body.posts)
    state.count += body.posts.length
    state.after = body.after
    state.empties = body.posts.length ? 0 : state.empties + 1
    // Stop at the end of the listing, or once it's clear there's nothing here.
    state.done = !body.after || state.empties >= MAX_EMPTY_PAGES

    say(state.count ? '' : state.done ? `No posts in ${describe()}.` : '')
    document.title = `${describe()} · redditview`
    // Only worth announcing an end the user can actually reach.
    end.hidden = !(state.done && state.count)
  } catch (err) {
    say(`Couldn't load /r/${sub}: ${err.message}`)
    console.error('[redditview] fetch failed:', err)
    state.done = true // stop the observer hammering a failing endpoint
    return
  } finally {
    state.loading = false
    if (run === state.run) loader.hidden = true
  }

  // A page of few or no images may leave the sentinel still in view; the
  // observer won't re-fire without a fresh intersection, so keep pulling.
  if (!state.done && nearViewport(sentinel)) loadPage()
}

function reset() {
  state.run++
  state.after = null
  state.done = false
  state.loading = false
  state.count = 0
  state.empties = 0
  lazy.disconnect()
  grid.innerHTML = ''
  end.hidden = true
  say('')
  timeSelect.hidden = !TIMED_SORTS.includes(state.sort)
  loadPage()
}

new IntersectionObserver(
  (entries) => {
    if (entries.some((e) => e.isIntersecting)) loadPage()
  },
  { rootMargin: PAGE_LEAD },
).observe(sentinel)

sortSelect.addEventListener('change', () => {
  state.sort = sortSelect.value
  writeUrl()
  reset()
})

timeSelect.addEventListener('change', () => {
  state.time = timeSelect.value
  writeUrl()
  reset()
})

form.addEventListener('submit', (e) => {
  e.preventDefault()
  const sub = input.value.trim().replace(/^\/?r\//, '')
  if (!sub) return
  state.sub = sub
  writeUrl()
  reset()
})

// Back/forward: the URL is the source of truth, so re-read and reload.
addEventListener('popstate', () => {
  readUrl()
  reset()
})

readUrl()
// Normalise whatever was typed (/, /r/cats, /r/cats/) to the canonical form
// without adding a history entry.
history.replaceState(null, '', urlFor())
reset()
