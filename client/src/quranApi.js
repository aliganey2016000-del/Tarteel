const API_BASE = (import.meta.env?.VITE_QURAN_API_URL || 'https://api.alquran.cloud/v1').replace(/\/$/, '')
const AUDIO_CDN_BASE = (import.meta.env?.VITE_QURAN_AUDIO_CDN_URL || 'https://cdn.islamic.network').replace(/\/$/, '')
const AUDIO_BITRATE = String(import.meta.env?.VITE_QURAN_AUDIO_BITRATE || '128')
const REQUEST_TIMEOUT_MS = 15_000
const CACHE_PREFIX = 'tarteel:quran:v3:'
const CATALOG_KEY = `${CACHE_PREFIX}catalog`
const SEARCH_CACHE_PREFIX = `${CACHE_PREFIX}search:`
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const SEARCH_CACHE_TTL_MS = 6 * 60 * 60 * 1000

export const RECITERS = [
  { id: 'ar.alafasy', name: 'Mishary Alafasy', style: 'Murattal' },
  { id: 'ar.husary', name: 'Mahmoud Al-Husary', style: 'Murattal' },
  { id: 'ar.minshawi', name: 'Mohamed Al-Minshawi', style: 'Murattal' },
  { id: 'ar.sudais', name: 'Abdul Rahman Al-Sudais', style: 'Murattal' },
  { id: 'ar.shuraim', name: 'Saud Al-Shuraim', style: 'Murattal' },
  { id: 'ar.abdulbasit', name: 'Abdul Basit Abdul Samad', style: 'Murattal' },
  { id: 'ar.ajamy', name: 'Ahmed Al-Ajamy', style: 'Murattal' },
  { id: 'ar.hudhaify', name: 'Ali Al-Hudhaify', style: 'Murattal' }
]

const DEFAULT_RECITER = RECITERS[0].id

const readCache = (key) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (!cached?.data) return null
    return { data: cached.data, fresh: Number(cached.expiresAt) > Date.now() }
  } catch {
    return null
  }
}

const writeCache = (key, data, ttlMs = CACHE_TTL_MS) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, expiresAt: Date.now() + ttlMs }))
  } catch {
    // Private browsing or storage limits should never prevent reading.
  }
}

const fetchJson = async (url, { signal } = {}) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  if (signal) {
    if (signal.aborted) controller.abort()
    else signal.addEventListener('abort', onAbort, { once: true })
  }
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Quran provider returned ${response.status}`)
    return response.json()
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', onAbort)
  }
}

const fetchEdition = async (surahNumber, edition, signal) => {
  const payload = await fetchJson(`${API_BASE}/surah/${surahNumber}/${edition}`, { signal })
  if (payload?.code !== 200 || !payload?.data) throw new Error('Quran provider returned an invalid response')
  return payload.data
}

export const audioUrlForAyah = (ayahNumber, apiAudioUrl = null, reciter = DEFAULT_RECITER) =>
  apiAudioUrl || `${AUDIO_CDN_BASE}/quran/audio/${AUDIO_BITRATE}/${reciter}/${ayahNumber}.mp3`

export async function listSurahs({ signal } = {}) {
  const cached = readCache(CATALOG_KEY)
  if (cached?.fresh) return cached.data

  try {
    const payload = await fetchJson(`${API_BASE}/surah`, { signal })
    if (payload?.code !== 200 || !Array.isArray(payload?.data)) throw new Error('Quran catalog returned an invalid response')
    writeCache(CATALOG_KEY, payload.data)
    return payload.data
  } catch (error) {
    if (cached?.data) return cached.data
    throw error
  }
}

export async function getSurah(surahNumber, { signal, reciter = DEFAULT_RECITER } = {}) {
  const selectedReciter = RECITERS.some(item => item.id === reciter) ? reciter : DEFAULT_RECITER
  const key = `${CACHE_PREFIX}${surahNumber}:${selectedReciter}`
  const cached = readCache(key)
  const legacyCached = selectedReciter === DEFAULT_RECITER ? readCache(`tarteel:quran:v2:${surahNumber}`) : null
  if (cached?.fresh) return { ...cached.data, source: 'cache' }
  if (legacyCached?.fresh) {
    const migrated = { ...legacyCached.data, reciter: selectedReciter, ayahs: legacyCached.data.ayahs.map(ayah => ({ ...ayah, audioUrl: audioUrlForAyah(ayah.number, null, selectedReciter) })) }
    writeCache(key, migrated)
    return { ...migrated, source: 'cache' }
  }

  try {
    const [arabic, translation, audio] = await Promise.all([
      fetchEdition(surahNumber, 'quran-uthmani', signal),
      fetchEdition(surahNumber, 'en.sahih', signal),
      fetchEdition(surahNumber, selectedReciter, signal)
    ])
    const audioByAyah = new Map(audio.ayahs.map((ayah) => [ayah.numberInSurah, ayah.audio || null]))
    const data = {
      number: arabic.number,
      name: arabic.englishName,
      arabicName: arabic.name,
      translationName: arabic.englishNameTranslation,
      revelationType: arabic.revelationType,
      ayahCount: arabic.numberOfAyahs,
      reciter: selectedReciter,
      ayahs: arabic.ayahs.map((ayah, index) => ({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        juz: ayah.juz,
        textArabic: ayah.text,
        translation: translation.ayahs[index]?.text || '',
        audioUrl: audioUrlForAyah(ayah.number, audioByAyah.get(ayah.numberInSurah), selectedReciter)
      }))
    }
    writeCache(key, data)
    return { ...data, source: 'network' }
  } catch (error) {
    if (cached?.data) return { ...cached.data, source: 'stale-cache' }
    if (legacyCached?.data && selectedReciter === DEFAULT_RECITER) return { ...legacyCached.data, source: 'stale-cache' }
    throw error
  }
}

const containsArabic = value => /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(value)

export const searchEditionForQuery = (query, requestedEdition = null) => {
  if (requestedEdition) return requestedEdition
  return containsArabic(query) ? 'quran-simple-clean' : 'en.sahih'
}

export const normalizeSearchResults = (matches = []) => matches
  .filter(match => match?.number && match?.surah?.number && match?.numberInSurah)
  .map(match => ({
    ayahNumber: match.numberInSurah,
    globalAyahNumber: match.number,
    surahNumber: match.surah.number,
    surahName: match.surah.englishName || match.surah.name || `Surah ${match.surah.number}`,
    surahArabicName: match.surah.name || '',
    text: String(match.text || '').trim()
  }))

export async function searchQuran(query, { edition = null, signal } = {}) {
  const normalizedQuery = String(query || '').trim().replace(/\s+/g, ' ')
  if (normalizedQuery.length < 2) throw new Error('Search must contain at least 2 characters.')
  if (normalizedQuery.length > 80) throw new Error('Search is limited to 80 characters.')

  const selectedEdition = searchEditionForQuery(normalizedQuery, edition)
  const cacheKey = `${SEARCH_CACHE_PREFIX}${encodeURIComponent(`${selectedEdition}:${normalizedQuery.toLowerCase()}`)}`
  const cached = readCache(cacheKey)
  if (cached?.fresh) return cached.data

  try {
    const url = `${API_BASE}/search/${encodeURIComponent(normalizedQuery)}/all/${encodeURIComponent(selectedEdition)}`
    const payload = await fetchJson(url, { signal })
    if (payload?.code !== 200 || !Array.isArray(payload?.data?.matches)) throw new Error('Quran search returned an invalid response')
    const data = {
      query: normalizedQuery,
      edition: selectedEdition,
      count: Number(payload.data.count) || payload.data.matches.length,
      matches: normalizeSearchResults(payload.data.matches)
    }
    writeCache(cacheKey, data, SEARCH_CACHE_TTL_MS)
    return data
  } catch (error) {
    if (cached?.data) return { ...cached.data, source: 'stale-cache' }
    throw error
  }
}

export function clearQuranCache() {
  try {
    Object.keys(localStorage).filter((key) => key.startsWith(CACHE_PREFIX) || key.startsWith('tarteel:quran:v2:')).forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore storage failures.
  }
}
