export function summarizeStreak(data) {
  const current = Number(data?.currentStreak || 0)
  const longest = Number(data?.longestStreak || 0)
  const activeToday = Boolean(data?.activeToday)
  return {
    current: Number.isFinite(current) && current >= 0 ? current : 0,
    longest: Number.isFinite(longest) && longest >= 0 ? longest : 0,
    activeToday
  }
}

export function streakLabel(days) {
  return `${days} ${days === 1 ? 'day' : 'days'}`
}
