import 'dotenv/config'
import express from 'express'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '../..')
const clientDist = path.join(rootDir, 'client', 'dist')
const apiPort = Number(process.env.API_PORT || 4000)
const port = Number(process.env.PORT || 3000)

const api = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
  cwd: path.join(rootDir, 'server'),
  env: { ...process.env, PORT: String(apiPort) },
  stdio: 'inherit'
})

api.on('exit', (code, signal) => {
  if (code && code !== 0) console.error(`Tarteel API exited with code ${code}`)
  else if (signal) console.error(`Tarteel API exited from signal ${signal}`)
  process.exit(code ?? 1)
})

const app = express()
app.disable('x-powered-by')

app.use('/api', (req, res) => {
  const headers = { ...req.headers, host: `127.0.0.1:${apiPort}` }
  const proxy = http.request({
    hostname: '127.0.0.1',
    port: apiPort,
    method: req.method,
    path: `/api${req.url}`,
    headers
  }, (upstream) => {
    res.writeHead(upstream.statusCode || 502, upstream.headers)
    upstream.pipe(res)
  })
  proxy.on('error', () => {
    if (!res.headersSent) res.status(502).json({ error: 'API is temporarily unavailable' })
    else res.end()
  })
  req.pipe(proxy)
})

app.use(express.static(clientDist, { index: false, maxAge: '1h' }))
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Tarteel web server listening on http://0.0.0.0:${port}`)
})

const shutdown = (signal) => {
  console.log(`Received ${signal}; shutting down Tarteel services.`)
  server.close(() => api.kill(signal))
  setTimeout(() => api.kill('SIGKILL'), 5000).unref()
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
