export const utcDay = (value = new Date()) => {
  const date = new Date(value)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

const dayKey = value => utcDay(value).toISOString().slice(0, 10)

export function buildStreakSummary(activityDates, today = new Date()) {
  const uniqueDays = [...new Set(activityDates.map(dayKey))].sort().reverse()
  const activeSet = new Set(uniqueDays)
  const todayKey = dayKey(today)
  const yesterday = utcDay(today)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const anchor = activeSet.has(todayKey) ? utcDay(today) : yesterday

  let currentStreak = 0
  for (let cursor = new Date(anchor); activeSet.has(dayKey(cursor)); cursor.setUTCDate(cursor.getUTCDate() - 1)) {
    currentStreak += 1
  }

  let longestStreak = 0
  for (const key of uniqueDays) {
    const start = new Date(`${key}T00:00:00.000Z`)
    const previous = new Date(start)
    previous.setUTCDate(previous.getUTCDate() - 1)
    if (activeSet.has(dayKey(previous))) continue
    let length = 1
    for (let cursor = new Date(start); ; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const next = new Date(cursor)
      next.setUTCDate(next.getUTCDate() + 1)
      if (!activeSet.has(dayKey(next))) break
      length += 1
    }
    longestStreak = Math.max(longestStreak, length)
  }

  return {
    currentStreak,
    longestStreak,
    activeToday: activeSet.has(todayKey),
    totalActiveDays: uniqueDays.length,
    recentActivity: uniqueDays.slice(0, 30)
  }
}
