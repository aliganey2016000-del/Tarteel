const API_BASE = (import.meta.env?.VITE_QURAN_API_URL || 'https://api.alquran.cloud/v1').replace(/\/$/, '')
const AUDIO_CDN_BASE = (import.meta.env?.VITE_QURAN_AUDIO_CDN_URL || 'https://cdn.islamic.network').replace(/\/$/, '')
const AUDIO_BITRATE = String(import.meta.env?.VITE_QURAN_AUDIO_BITRATE || '128')
const REQUEST_TIMEOUT_MS = 15_000
const CACHE_PREFIX = 'tarteel:quran:v2:'
const CATALOG_KEY = `${CACHE_PREFIX}catalog`
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

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

const writeCache = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ data, expiresAt: Date.now() + CACHE_TTL_MS }))
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

export const audioUrlForAyah = (ayahNumber, apiAudioUrl = null) => apiAudioUrl || `${AUDIO_CDN_BASE}/quran/audio/${AUDIO_BITRATE}/ar.alafasy/${ayahNumber}.mp3`

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

export async function getSurah(surahNumber, { signal } = {}) {
  const key = `${CACHE_PREFIX}${surahNumber}`
  const cached = readCache(key)
  if (cached?.fresh) return { ...cached.data, source: 'cache' }

  try {
    const [arabic, translation, audio] = await Promise.all([
      fetchEdition(surahNumber, 'quran-uthmani', signal),
      fetchEdition(surahNumber, 'en.sahih', signal),
      fetchEdition(surahNumber, 'ar.alafasy', signal)
    ])
    const audioByAyah = new Map(audio.ayahs.map((ayah) => [ayah.numberInSurah, ayah.audio || null]))
    const data = {
      number: arabic.number,
      name: arabic.englishName,
      arabicName: arabic.name,
      translationName: arabic.englishNameTranslation,
      revelationType: arabic.revelationType,
      ayahCount: arabic.numberOfAyahs,
      ayahs: arabic.ayahs.map((ayah, index) => ({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        juz: ayah.juz,
        textArabic: ayah.text,
        translation: translation.ayahs[index]?.text || '',
        audioUrl: audioUrlForAyah(ayah.number, audioByAyah.get(ayah.numberInSurah))
      }))
    }
    writeCache(key, data)
    return { ...data, source: 'network' }
  } catch (error) {
    if (cached?.data) return { ...cached.data, source: 'stale-cache' }
    throw error
  }
}

export function clearQuranCache() {
  try {
    Object.keys(localStorage).filter((key) => key.startsWith(CACHE_PREFIX)).forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore storage failures.
  }
}
