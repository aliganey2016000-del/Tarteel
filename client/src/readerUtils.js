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
