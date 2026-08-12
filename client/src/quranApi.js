const API_BASE = 'https://api.alquran.cloud/v1'
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

const fetchEdition = async (surahNumber, edition, signal) => {
  const response = await fetch(`${API_BASE}/surah/${surahNumber}/${edition}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(`Quran provider returned ${response.status}`)
  const payload = await response.json()
  if (payload?.code !== 200 || !payload?.data) throw new Error('Quran provider returned an invalid response')
  return payload.data
}

export async function listSurahs({ signal } = {}) {
  const cached = readCache(CATALOG_KEY)
  if (cached?.fresh) return cached.data

  try {
    const response = await fetch(`${API_BASE}/surah`, { signal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`Quran catalog returned ${response.status}`)
    const payload = await response.json()
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
        audioUrl: audioByAyah.get(ayah.numberInSurah) || null
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
