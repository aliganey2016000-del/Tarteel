import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import { buildStreakSummary, utcDay } from './streaks.js'

const app = express()
const prisma = new PrismaClient()
const port = process.env.PORT || 4000
const tokenSecret = process.env.AUTH_SECRET
const adminEmails = new Set(String(process.env.ADMIN_EMAILS || '').split(',').map(normalizeEmail).filter(Boolean))

if (!tokenSecret || tokenSecret.length < 32) {
  console.warn('AUTH_SECRET is missing or shorter than 32 characters; authentication routes will reject requests until it is configured.')
}

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json({ limit: '64kb' }))
app.use(morgan('dev'))

function normalizeEmail(email) { return String(email || '').trim().toLowerCase() }
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

const requireAdmin = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true } })
    if (!user) return res.status(401).json({ error: 'User account no longer exists' })
    if (user.role !== 'ADMIN') return res.status(403).json({ error: 'Administrator access required' })
    req.user.role = user.role
    next()
  } catch (error) {
    console.error(error)
    res.status(503).json({ error: 'Authorization service is temporarily unavailable' })
  }
}

const startOfDay = (value = new Date()) => {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date
}
const recordActivity = async (userId) => {
  const date = utcDay()
  return prisma.activityDay.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date },
    update: {}
  })
}

const validGoalType = (value) => ['MEMORIZE', 'REVIEW', 'RECITE'].includes(value)
const validSurahNumber = (value) => Number.isInteger(value) && value >= 1 && value <= 114

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
    const role = adminEmails.has(email) ? 'ADMIN' : 'USER'
    const user = await prisma.user.create({ data: { email, name, passwordHash: await passwordHash(password), role }, select: { id: true, email: true, name: true, role: true } })
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
    res.json({ data: { user: { id: user.id, email: user.email, name: user.name, role: user.role }, token: signToken(user.id) } })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to sign in' })
  }
})

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { id: true, email: true, name: true, role: true, createdAt: true } })
  if (!user) return res.status(401).json({ error: 'User account no longer exists' })
  res.json({ data: user })
})

app.get('/api/admin/stats', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [users, bookmarks, goals, recitations] = await prisma.$transaction([
      prisma.user.count(),
      prisma.bookmark.count(),
      prisma.goal.count(),
      prisma.recitationSession.count()
    ])
    res.json({ data: { users, bookmarks, goals, recitations } })
  } catch (error) {
    console.error(error)
    res.status(503).json({ error: 'Admin statistics are temporarily unavailable' })
  }
})

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query?.limit || 50), 1), 100)
  try {
    const data = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: limit, select: { id: true, email: true, name: true, role: true, createdAt: true, _count: { select: { bookmarks: true, goals: true, sessions: true } } } })
    res.json({ data })
  } catch (error) {
    console.error(error)
    res.status(503).json({ error: 'Admin user list is temporarily unavailable' })
  }
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
    const data = await prisma.bookmark.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' }, select: { id: true, createdAt: true, ayah: { select: { id: true, number: true, textArabic: true, translation: true, surah: { select: { number: true, name: true, arabicName: true } } } } } })
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
    const bookmark = await prisma.bookmark.upsert({ where: { userId_ayahId: { userId: req.user.id, ayahId } }, create: { userId: req.user.id, ayahId }, update: {}, select: { id: true, createdAt: true, ayahId: true } })
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
  if (!validSurahNumber(surahNumber) || !Number.isInteger(ayahNumber) || ayahNumber < 1) return res.status(400).json({ error: 'Valid surahNumber and ayahNumber are required' })
  try {
    const surah = await prisma.surah.findUnique({ where: { number: surahNumber }, select: { ayahCount: true } })
    if (!surah || ayahNumber > surah.ayahCount) return res.status(400).json({ error: 'Ayah is outside the selected Surah' })
    const data = await prisma.readingProgress.upsert({ where: { userId: req.user.id }, create: { userId: req.user.id, surahNumber, ayahNumber }, update: { surahNumber, ayahNumber } })
    await recordActivity(req.user.id)
    res.json({ data })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to save reading progress' })
  }
})

app.post('/api/activity', requireAuth, async (req, res) => {
  try {
    const activity = await recordActivity(req.user.id)
    res.status(201).json({ data: { id: activity.id, date: activity.date } })
  } catch (error) {
    console.error(error)
    res.status(503).json({ error: 'Activity tracking is temporarily unavailable' })
  }
})

app.get('/api/streaks', requireAuth, async (req, res) => {
  try {
    const today = utcDay()
    const data = await prisma.activityDay.findMany({
      where: { userId: req.user.id, date: { lte: today } },
      orderBy: { date: 'desc' },
      take: 366,
      select: { date: true }
    })
    res.json({ data: buildStreakSummary(data.map(item => item.date), today) })
  } catch (error) {
    console.error(error)
    res.status(503).json({ error: 'Streak data is temporarily unavailable' })
  }
})

app.get('/api/goals', requireAuth, async (req, res) => {
  const requestedDate = req.query?.date ? new Date(String(req.query.date)) : new Date()
  if (Number.isNaN(requestedDate.getTime())) return res.status(400).json({ error: 'Invalid date' })
  const day = startOfDay(requestedDate)
  const nextDay = new Date(day); nextDay.setDate(nextDay.getDate() + 1)
  try {
    const data = await prisma.goal.findMany({ where: { userId: req.user.id, date: { gte: day, lt: nextDay } }, orderBy: { type: 'asc' } })
    res.json({ data })
  } catch (error) {
    console.error(error)
    res.status(503).json({ error: 'Goals are temporarily unavailable' })
  }
})

app.put('/api/goals/:type', requireAuth, async (req, res) => {
  const type = String(req.params.type || '').toUpperCase()
  const target = Number(req.body?.target)
  const completed = req.body?.completed === undefined ? 0 : Number(req.body.completed)
  const requestedDate = req.body?.date ? new Date(String(req.body.date)) : new Date()
  if (!validGoalType(type)) return res.status(400).json({ error: 'Goal type must be MEMORIZE, REVIEW, or RECITE' })
  if (!Number.isInteger(target) || target < 1 || target > 100000) return res.status(400).json({ error: 'Target must be a positive integer' })
  if (!Number.isInteger(completed) || completed < 0 || completed > target) return res.status(400).json({ error: 'Completed must be between 0 and target' })
  if (Number.isNaN(requestedDate.getTime())) return res.status(400).json({ error: 'Invalid date' })
  const day = startOfDay(requestedDate)
  try {
    const existing = await prisma.goal.findFirst({ where: { userId: req.user.id, type, date: day } })
    const data = existing
      ? await prisma.goal.update({ where: { id: existing.id }, data: { target, completed } })
      : await prisma.goal.create({ data: { userId: req.user.id, type, target, completed, date: day } })
    res.json({ data })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to save goal' })
  }
})

app.patch('/api/goals/:type/progress', requireAuth, async (req, res) => {
  const type = String(req.params.type || '').toUpperCase()
  const increment = Number(req.body?.increment ?? 1)
  if (!validGoalType(type)) return res.status(400).json({ error: 'Goal type must be MEMORIZE, REVIEW, or RECITE' })
  if (!Number.isInteger(increment) || increment < 1 || increment > 10000) return res.status(400).json({ error: 'Increment must be a positive integer' })
  const day = startOfDay()
  try {
    const existing = await prisma.goal.findFirst({ where: { userId: req.user.id, type, date: day } })
    if (!existing) return res.status(404).json({ error: 'Create today’s goal before recording progress' })
    const completed = Math.min(existing.target, existing.completed + increment)
    const data = await prisma.goal.update({ where: { id: existing.id }, data: { completed } })
    await recordActivity(req.user.id)
    res.json({ data })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to update goal progress' })
  }
})

app.post('/api/recitations', requireAuth, async (req, res) => {
  const surahNumber = req.body?.surahNumber === undefined || req.body?.surahNumber === null ? null : Number(req.body.surahNumber)
  if (surahNumber !== null && !validSurahNumber(surahNumber)) return res.status(400).json({ error: 'surahNumber must be between 1 and 114' })
  try {
    if (surahNumber !== null) {
      const surah = await prisma.surah.findUnique({ where: { number: surahNumber }, select: { number: true } })
      if (!surah) return res.status(404).json({ error: 'Surah not found' })
    }
    const data = await prisma.recitationSession.create({ data: { userId: req.user.id, surahNumber } })
    res.status(201).json({ data })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to start recitation session' })
  }
})

app.get('/api/recitations', requireAuth, async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query?.limit || 20), 1), 100)
  try {
    const data = await prisma.recitationSession.findMany({ where: { userId: req.user.id }, orderBy: { startedAt: 'desc' }, take: limit })
    res.json({ data })
  } catch (error) {
    console.error(error)
    res.status(503).json({ error: 'Recitation history is temporarily unavailable' })
  }
})

app.patch('/api/recitations/:id', requireAuth, async (req, res) => {
  const id = String(req.params.id || '')
  const durationSec = Number(req.body?.durationSec)
  const accuracy = req.body?.accuracy === null || req.body?.accuracy === undefined ? null : Number(req.body.accuracy)
  const mistakes = Number(req.body?.mistakes ?? 0)
  if (!id) return res.status(400).json({ error: 'Session id is required' })
  if (!Number.isInteger(durationSec) || durationSec < 0 || durationSec > 24 * 60 * 60) return res.status(400).json({ error: 'durationSec must be 0–86400' })
  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100)) return res.status(400).json({ error: 'accuracy must be between 0 and 100' })
  if (!Number.isInteger(mistakes) || mistakes < 0 || mistakes > 100000) return res.status(400).json({ error: 'mistakes must be a non-negative integer' })
  try {
    const existing = await prisma.recitationSession.findFirst({ where: { id, userId: req.user.id }, select: { id: true } })
    if (!existing) return res.status(404).json({ error: 'Recitation session not found' })
    const data = await prisma.recitationSession.update({ where: { id }, data: { durationSec, accuracy, mistakes } })
    res.json({ data })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Unable to finish recitation session' })
  }
})

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }))

const shutdown = async () => { await prisma.$disconnect(); process.exit(0) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

app.listen(port, () => console.log(`Tarteel API listening on http://localhost:${port}`))
