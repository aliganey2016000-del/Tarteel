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
