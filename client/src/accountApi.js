import { getToken } from './authApi.js'

const API_BASE = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '')
const READER_STORAGE_KEY = 'tarteel:surah-detail:v3'
const LEGACY_READER_STORAGE_KEY = 'tarteel:reader:v2'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    }
  })
  if (response.status === 204) return null
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const retryAfter = response.headers.get('Retry-After')
    const suffix = response.status === 429 && retryAfter ? ` Try again in ${retryAfter}s.` : ''
    throw new Error(`${payload.error || `Request failed (${response.status})`}${suffix}`)
  }
  return payload.data
}

const readJson = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) } catch { return fallback }
}

const writeJson = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); return true } catch { return false }
}

const normalizeBookmarkKey = (surahNumber, ayahNumber) => `${Number(surahNumber)}:${Number(ayahNumber)}`

const readLocalBookmarks = () => {
  const state = readJson(READER_STORAGE_KEY, {})
  const rows = []
  for (const [surahNumber, ayahs] of Object.entries(state.bookmarks || {})) {
    for (const [ayahNumber, metadata] of Object.entries(ayahs || {})) {
      const surah = Number(surahNumber)
      const ayah = Number(ayahNumber)
      if (Number.isInteger(surah) && surah >= 1 && surah <= 114 && Number.isInteger(ayah) && ayah > 0) {
        rows.push({ surahNumber: surah, ayahNumber: ayah, timestamp: metadata?.timestamp || null, readingPosition: metadata?.readingPosition || ayah })
      }
    }
  }
  const legacy = readJson(LEGACY_READER_STORAGE_KEY, {})
  if (Array.isArray(legacy.bookmarks)) {
    for (const id of legacy.bookmarks) {
      const globalId = Number(id)
      if (Number.isInteger(globalId) && globalId > 0) rows.push({ ayahId: globalId })
    }
  }
  return rows
}

const writeMergedBookmarks = rows => {
  const state = readJson(READER_STORAGE_KEY, {})
  const bookmarks = {}
  for (const row of rows) {
    const surah = Number(row.surahNumber)
    const ayah = Number(row.ayahNumber)
    if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Number.isInteger(ayah) || ayah < 1) continue
    bookmarks[surah] ||= {}
    bookmarks[surah][ayah] = {
      timestamp: row.timestamp || new Date().toISOString(),
      readingPosition: Number(row.readingPosition) || ayah
    }
  }
  writeJson(READER_STORAGE_KEY, { ...state, bookmarks })
  return bookmarks
}

export const login = async (email, password) => {
  const result = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  await syncLocalBookmarks(result.token).catch(() => 0)
  return result
}

export const register = async (email, password, name) => {
  const result = await request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) })
  await syncLocalBookmarks(result.token).catch(() => 0)
  return result
}

export const getMe = (token) => request('/auth/me', { token })
export const listBookmarks = (token) => request('/bookmarks', { token })
export const saveBookmark = (token, ayahId) => request(`/bookmarks/${ayahId}`, { method: 'PUT', token })
export const removeBookmark = (token, ayahId) => request(`/bookmarks/${ayahId}`, { method: 'DELETE', token })
export const saveProgress = (token, surahNumber, ayahNumber) => request('/progress', { method: 'PUT', token, body: JSON.stringify({ surahNumber, ayahNumber }) })
export const getProgress = (token) => request('/progress', { token })
export const getStreaks = (token) => request('/streaks', { token })
export const getGoals = (token, date) => request(`/goals${date ? `?date=${encodeURIComponent(date)}` : ''}`, { token })
export const updateGoal = (token, type, target, completed, date) => request(`/goals/${encodeURIComponent(type)}`, { method: 'PUT', token, body: JSON.stringify({ target, completed, ...(date ? { date } : {}) }) })

/**
 * Merge signed-out bookmarks into the account, then hydrate the local reader
 * with the account's complete bookmark set. The operation is best-effort so
 * authentication never becomes dependent on a temporary sync outage.
 */
export const syncLocalBookmarks = async (token = getToken(), remoteBookmarks = null) => {
  if (!token) return { uploaded: 0, merged: 0 }
  const remote = remoteBookmarks || await listBookmarks(token)
  const local = readLocalBookmarks()
  const remoteKeys = new Set(remote.map(item => normalizeBookmarkKey(item?.ayah?.surah?.number, item?.ayah?.number)).filter(key => !key.startsWith('NaN:')))
  let uploaded = 0
  for (const row of local) {
    if (row.ayahId) {
      try { await saveBookmark(token, row.ayahId); uploaded += 1 } catch { /* stale legacy ids are ignored */ }
      continue
    }
    const key = normalizeBookmarkKey(row.surahNumber, row.ayahNumber)
    if (remoteKeys.has(key)) continue
  }
  const freshRemote = uploaded ? await listBookmarks(token) : remote
  const merged = [...local.filter(row => row.surahNumber && row.ayahNumber), ...freshRemote.map(item => ({
    surahNumber: Number(item?.ayah?.surah?.number),
    ayahNumber: Number(item?.ayah?.number),
    timestamp: item?.createdAt || null,
    readingPosition: Number(item?.ayah?.number) || 1
  }))]
  const deduped = [...new Map(merged.map(row => [normalizeBookmarkKey(row.surahNumber, row.ayahNumber), row])).values()]
  writeMergedBookmarks(deduped)
  return { uploaded, merged: deduped.length }
}

export const hydrateAccountReaderState = async (token = getToken()) => {
  if (!token) return { bookmarks: 0, progress: null }
  const [remoteBookmarks, progress] = await Promise.all([listBookmarks(token), getProgress(token)])
  const sync = await syncLocalBookmarks(token, remoteBookmarks)
  return { bookmarks: sync.merged, progress }
}

export const __private__ = { readLocalBookmarks, writeMergedBookmarks, normalizeBookmarkKey }
