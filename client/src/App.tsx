import { Navigate, Route, Routes } from 'react-router-dom'

import { Feed } from './components/Feed'
import { Navbar } from './components/Navbar'
import { DEFAULT_SORT, DEFAULT_SUB } from './constants'

const HOME = `/r/${DEFAULT_SUB}/${DEFAULT_SORT}`

export function App() {
  return (
    <>
      {/* Full-width sticky bar; the feed below is width-constrained by .app. */}
      <Navbar />
      <div className="app">
        <Routes>
          <Route path="/r/:sub" element={<Feed />} />
          <Route path="/r/:sub/:sort" element={<Feed />} />
          {/* Bare / and anything unrecognised land on the default feed. */}
          <Route path="*" element={<Navigate to={HOME} replace />} />
        </Routes>
      </div>
    </>
  )
}
