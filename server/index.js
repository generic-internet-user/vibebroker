import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = parseInt(process.env.PORT || '5173', 10)
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const YAHOO_HOST = 'query1.finance.yahoo.com'
const CACHE_TTL = 60_000

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

const cache = new Map()

function serveStatic(filePath, res) {
  const ext = path.extname(filePath)
  const contentType = MIME[ext] || 'application/octet-stream'

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not found')
      return
    }
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(data)
  })
}

function proxyRequest(req, res) {
  const cacheKey = req.url + '|' + req.headers['accept-language'] || ''
  const cached = cache.get(cacheKey)
  if (cached && Date.now() < cached.ttl) {
    res.writeHead(200, { 'Content-Type': 'application/json', 'X-Cache': 'hit' })
    res.end(cached.body)
    return
  }

  const url = new URL(req.url, `http://${YAHOO_HOST}`)
  const options = {
    hostname: YAHOO_HOST,
    port: 443,
    path: url.pathname + url.search,
    method: req.method,
    headers: {
      'User-Agent': req.headers['user-agent'] || 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0',
      'Accept': req.headers['accept'] || '*/*',
      'Accept-Language': req.headers['accept-language'] || 'en-US,en;q=0.5',
    },
  }

  const proxyReq = https.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers, 'X-Cache': 'miss' }
    delete headers['set-cookie']
    delete headers['set-cookie2']

    if (proxyRes.statusCode === 200) {
      const chunks = []
      proxyRes.on('data', (chunk) => chunks.push(chunk))
      proxyRes.on('end', () => {
        const body = Buffer.concat(chunks)
        cache.set(cacheKey, { body, ttl: Date.now() + CACHE_TTL })
        res.writeHead(200, headers)
        res.end(body)
      })
    } else {
      res.writeHead(proxyRes.statusCode, headers)
      proxyRes.pipe(res)
    }
  })

  proxyReq.on('error', () => {
    res.writeHead(502, { 'Content-Type': 'text/plain' })
    res.end('Proxy error')
  })

  req.pipe(proxyReq)
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/yahoo')) {
    proxyRequest(req, res)
    return
  }

  const reqPath = req.url === '/' ? '/index.html' : req.url
  const filePath = path.join(DIST, reqPath)

  if (filePath.startsWith(DIST)) {
    serveStatic(filePath, res)
  } else {
    res.writeHead(403, { 'Content-Type': 'text/plain' })
    res.end('Forbidden')
  }
})

server.listen(PORT, () => {
  console.log(`VibeBroker relay serving ${DIST} on http://localhost:${PORT}`)
})
