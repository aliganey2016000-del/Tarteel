export const READER_STATE_KEY = 'tarteel:reader:v2'

export function readReaderResume(storage) {
  try {
    const raw = storage?.getItem(READER_STATE_KEY)
    const state = JSON.parse(raw || '{}')
    const surahNumber = Number(state?.surahNumber)
    const ayahNumber = Number(state?.ayahNumber)
    if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) return null
    return {
      surahNumber,
      ayahNumber: Number.isInteger(ayahNumber) && ayahNumber > 0 ? ayahNumber : 1,
    }
  } catch {
    return null
  }
}
