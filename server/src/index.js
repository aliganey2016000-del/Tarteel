import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const app = express()
const prisma = new PrismaClient()
const port = process.env.PORT || 4000
const tokenSecret = process.env.AUTH_SECRET

if (!tokenSecret || tokenSecret.length < 32) {
  console.warn('AUTH_SECRET is missing or shorter than 32 characters; authentication routes will reject requests until it is configured.')
}

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json({ limit: '64kb' }))
app.use(morgan('dev'))

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const passwordHash = async (password, salt = crypto.randomBytes(16).toString('hex')) => {
  const derived = await new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (err, key) => err ? reject(err) : resolve(key.toString('hex'))))
  return `${salt}:${derived}`
}
const verifyPassword = async (password, stored) => {
  const [salt, expected] = String(stored || '').split(':')
  if (!salt || !expected) return false
  const actual = await passwordHash(password, salt)
  const [, derived] = actual.split(':')
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(expected, 'hex'))
}
const signToken = (userId) => {
  if (!tokenSecret || tokenSecret.length < 32) throw new Error('AUTH_SECRET_NOT_CONFIGURED')
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })).toString('base64url')
  const signature = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}
const readToken = (token) => {
  if (!tokenSecret || tokenSecret.length < 32) return null
  const [payload, signature] = String(token || '').split('.')
  if (!payload || !signature) return null
  const expected = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url')
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return data.exp > Date.now() ? data : null
  } catch { return null }
}

const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null
  const data = readToken(token)
  if (!data) return res.status(401).json({ error: 'Authentication required' })
  req.user = { id: data.sub }
  next()
}

app.get('/api/health', async (_req, res) => {
  let database = 'unknown'
  try { await prisma.$queryRaw`SELECT 1`; database = 'ok' } catch { database = 'unavailable' }
  res.json({ ok: database === 'ok', service: 'tarteel-api', database, timestamp: new Date().toISOString() })
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const name = String(req.body?.name || '').trim().slice(0, 80) || null
    const password = String(req.body?.password || '')
    if (!validEmail(email)) return res.status(400).json({ error: 'A valid email is required' })
    if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be 8–128 characters' })
    if (!tokenSecret || tokenSecret.length < 32) return res.status(503).json({ error: 'Authentication is not configured' })
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' })
    const user = await prisma.user.create({ data: { email, name, passwordHash: await passwordHash(password) }, select: { id: true, email: true, name: true } })
    res.status(201).json({ data: { user, token: signToken(user.id) } })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to create account' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email)
    const password = String(req.body?.password || '')
    if (!validEmail(email) || !password) return res.status(400).json({ error: 'Email and password are required' })
    if (!tokenSecret || tokenSecret.length < 32) return res.status(503).json({ error: 'Authentication is not configured' })
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await verifyPassword(password, user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password' })
    res.json({ data: { user: { id: user.id, email: user.email, name: user.name }, token: signToken(user.id) } })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to sign in' })
  }
})

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, name: true, createdAt: true } })
  if (!user) return res.status(401).json({ error: 'User account no longer exists' })
  res.json({ data: user })
})

app.get('/api/surahs', async (_req, res) => {
  try {
    const data = await prisma.surah.findMany({ orderBy: { number: 'asc' }, select: { number: true, name: true, arabicName: true, ayahCount: true } })
    res.json({ data })
  } catch {
    res.status(503).json({ error: 'Quran data is not available yet' })
  }
})

app.get('/api/bookmarks', requireAuth, async (req, res) => {
  try {
    const data = await prisma.bookmark.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        ayah: { select: { id: true, number: true, textArabic: true, translation: true, surah: { select: { number: true, name: true, arabicName: true } } } }
      }
    })
    res.json({ data })
  } catch (error) {
    console.error(error)
    res.status(503).json({ error: 'Bookmarks are temporarily unavailable' })
  }
})

app.put('/api/bookmarks/:ayahId', requireAuth, async (req, res) => {
  const ayahId = Number(req.params.ayahId)
  if (!Number.isInteger(ayahId) || ayahId < 1) return res.status(400).json({ error: 'A valid ayahId is required' })
  try {
    const bookmark = await prisma.bookmark.upsert({
      where: { userId_ayahId: { userId: req.user.id, ayahId } },
      create: { userId: req.user.id, ayahId },
      update: {},
      select: { id: true, createdAt: true, ayahId: true }
    })
    res.status(201).json({ data: bookmark })
  } catch (error) {
    if (error?.code === 'P2003') return res.status(404).json({ error: 'Ayah not found' })
    console.error(error)
    res.status(500).json({ error: 'Unable to save bookmark' })
  }
})

app.delete('/api/bookmarks/:ayahId', requireAuth, async (req, res) => {
  const ayahId = Number(req.params.ayahId)
  if (!Number.isInteger(ayahId) || ayahId < 1) return res.status(400).json({ error: 'A valid ayahId is required' })
  try {
    await prisma.bookmark.deleteMany({ where: { userId: req.user.id, ayahId } })
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to remove bookmark' })
  }
})

app.get('/api/progress', requireAuth, async (req, res) => {
  try {
    const data = await prisma.readingProgress.findUnique({ where: { userId: req.user.id } })
    res.json({ data })
  } catch (error) {
    console.error(error)
    res.status(503).json({ error: 'Reading progress is temporarily unavailable' })
  }
})

app.put('/api/progress', requireAuth, async (req, res) => {
  const surahNumber = Number(req.body?.surahNumber)
  const ayahNumber = Number(req.body?.ayahNumber)
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114 || !Number.isInteger(ayahNumber) || ayahNumber < 1) {
    return res.status(400).json({ error: 'Valid surahNumber and ayahNumber are required' })
  }
  try {
    const surah = await prisma.surah.findUnique({ where: { number: surahNumber }, select: { ayahCount: true } })
    if (!surah || ayahNumber > surah.ayahCount) return res.status(400).json({ error: 'Ayah is outside the selected Surah' })
    const data = await prisma.readingProgress.upsert({
      where: { userId: req.user.id },
      create: { userId: req.user.id, surahNumber, ayahNumber },
      update: { surahNumber, ayahNumber },
    })
    res.json({ data })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to save reading progress' })
  }
})

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

const shutdown = async () => { await prisma.$disconnect(); process.exit(0) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

app.listen(port, () => console.log(`Tarteel API listening on http://localhost:${port}`))
