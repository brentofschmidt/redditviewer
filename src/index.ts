import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const PORT = Number(process.env.PORT ?? 3000)
const PUBLIC_DIR = join(process.cwd(), 'public')

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
}

async function serveStatic(path: string) {
  const rel = path === '/' ? 'index.html' : path
  // Strip any traversal so a request can't escape public/.
  const safe = normalize(rel).replace(/^(\.\.[/\\])+/, '')
  const file = join(PUBLIC_DIR, safe)
  if (!file.startsWith(PUBLIC_DIR)) return null
  try {
    return { body: await readFile(file), type: MIME[extname(file)] ?? 'application/octet-stream' }
  } catch {
    return null
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
  const file = await serveStatic(url.pathname)

  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found')
    return
  }

  res.writeHead(200, { 'Content-Type': file.type })
  res.end(file.body)
}).listen(PORT, () => {
  console.log(`redditview → http://localhost:${PORT}`)
})
