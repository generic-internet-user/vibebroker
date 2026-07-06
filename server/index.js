import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = parseInt(process.env.PORT || '5173', 10)
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const YAHOO_HOST = 'query1.finance.yahoo.com'

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
  const url = new URL(req.url, `http://${YAHOO_HOST}`)
  const options = {
    hostname: YAHOO_HOST,
    port: 443,
    path: url.pathname + url.search,
    method: req.method,
    headers: {
      'User-Agent': 'VibeBroker/1.0',
    },
  }

  const proxyReq = https.request(options, (proxyRes) => {
    const headers = { ...proxyRes.headers }
    delete headers['set-cookie']
    delete headers['set-cookie2']
    res.writeHead(proxyRes.statusCode, headers)
    proxyRes.pipe(res)
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
