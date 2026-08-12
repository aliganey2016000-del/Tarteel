export function clampAyahIndex(index, ayahCount) {
  if (!Number.isFinite(ayahCount) || ayahCount <= 0) return 0
  const value = Number.isFinite(index) ? Math.trunc(index) : 0
  return Math.min(Math.max(value, 0), ayahCount - 1)
}

export function progressPercent(index, ayahCount) {
  if (!Number.isFinite(ayahCount) || ayahCount <= 0) return 0
  const current = clampAyahIndex(index, ayahCount)
  return Math.round(((current + 1) / ayahCount) * 100)
}

export function filterSurahs(catalog, query) {
  const value = String(query || '').trim().toLowerCase()
  if (!value) return catalog
  return catalog.filter((item) => `${item.number} ${item.englishName} ${item.name} ${item.englishNameTranslation}`.toLowerCase().includes(value))
}

export function parseAyahNumber(value, ayahCount) {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 1 || number > ayahCount) return null
  return number
}

export const REPEAT_COUNTS = [1, 3, 5, Infinity]

export function normalizeRepeatCount(value) {
  if (value === Infinity || value === 'infinity') return Infinity
  const number = Number(value)
  return REPEAT_COUNTS.includes(number) ? number : 1
}

export function clampNumber(value, min, max) {
  const number = Number(value)
  if (!Number.isFinite(number)) return min
  return Math.min(max, Math.max(min, number))
}

export function nextAyahNumber(current, total, direction) {
  const next = Number(current) + Number(direction)
  return clampNumber(next, 1, Number(total))
}

export function formatAudioTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(value / 60)
  const remainder = String(value % 60).padStart(2, '0')
  return `${minutes}:${remainder}`
}

export function readingTheme(mode, prefersDark) {
  if (mode === 'dark') return 'dark'
  if (mode === 'light') return 'light'
  return prefersDark ? 'dark' : 'light'
}
