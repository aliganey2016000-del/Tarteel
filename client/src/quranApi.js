const API_BASE = 'https://api.alquran.cloud/v1'
const CACHE_PREFIX = 'tarteel:quran:v1:'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

const readCache = (surahNumber) => {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${surahNumber}`)
    if (!raw) return null
    const cached = JSON.parse(raw)
    return cached.expiresAt > Date.now() ? cached.data : null
  } catch {
    return null
  }
}

const writeCache = (surahNumber, data) => {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${surahNumber}`, JSON.stringify({ data, expiresAt: Date.now() + CACHE_TTL_MS }))
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

export async function getSurah(surahNumber, { signal } = {}) {
  const cached = readCache(surahNumber)
  if (cached) return { ...cached, source: 'cache' }

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
  writeCache(surahNumber, data)
  return { ...data, source: 'network' }
}

export function clearQuranCache() {
  try {
    Object.keys(localStorage).filter((key) => key.startsWith(CACHE_PREFIX)).forEach((key) => localStorage.removeItem(key))
  } catch {
    // Ignore storage failures.
  }
}
