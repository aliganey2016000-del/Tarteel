const API_BASE = 'https://api.alquran.cloud/v1'
const REQUEST_TIMEOUT_MS = 8000
const CACHE_TTL_MS = 5 * 60 * 1000

const cache = new Map()

export const isValidSurahNumber = (value) => Number.isInteger(value) && value >= 1 && value <= 114

const fetchJson = async (url) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
    if (!response.ok) throw new Error(`QURAN_PROVIDER_${response.status}`)
    const payload = await response.json()
    if (payload?.code !== 200 || !payload?.data) throw new Error('QURAN_PROVIDER_INVALID_RESPONSE')
    return payload.data
  } finally {
    clearTimeout(timeout)
  }
}

const getEdition = async (surahNumber, edition) => fetchJson(`${API_BASE}/surah/${surahNumber}/${edition}`)

export const getSurah = async (surahNumber) => {
  if (!isValidSurahNumber(surahNumber)) throw new Error('INVALID_SURAH')
  const cached = cache.get(surahNumber)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  const [arabic, translation, audio] = await Promise.all([
    getEdition(surahNumber, 'quran-uthmani'),
    getEdition(surahNumber, 'en.sahih'),
    getEdition(surahNumber, 'ar.alafasy')
  ])

  const audioByAyah = new Map(audio.ayahs.map((ayah) => [ayah.numberInSurah, ayah.audio || null]))
  const data = {
    number: arabic.number,
    name: arabic.englishName,
    arabicName: arabic.name,
    englishNameTranslation: arabic.englishNameTranslation,
    revelationType: arabic.revelationType,
    ayahCount: arabic.numberOfAyahs,
    provider: 'Al Quran Cloud',
    editions: { arabic: 'quran-uthmani', translation: 'en.sahih', audio: 'ar.alafasy' },
    ayahs: arabic.ayahs.map((ayah, index) => ({
      number: ayah.number,
      numberInSurah: ayah.numberInSurah,
      juz: ayah.juz,
      textArabic: ayah.text,
      translation: translation.ayahs[index]?.text || null,
      audioUrl: audioByAyah.get(ayah.numberInSurah) || null
    }))
  }

  cache.set(surahNumber, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  return data
}

export const clearQuranCache = () => cache.clear()
