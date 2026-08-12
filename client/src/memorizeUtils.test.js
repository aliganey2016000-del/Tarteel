import { describe, expect, it } from 'vitest'
import { buildReviewQueue, gradeCard, isDue } from './memorizeUtils.js'

describe('memorizeUtils', () => {
  const now = Date.UTC(2026, 7, 12)

  it('grades a new card and schedules a future review', () => {
    const next = gradeCard({}, 'GOOD', now)
    expect(next.reviews).toBe(1)
    expect(next.intervalDays).toBe(3)
    expect(next.dueAt).toBe(now + 3 * 24 * 60 * 60 * 1000)
    expect(isDue(next, now)).toBe(false)
  })

  it('resets an overdue card with Again', () => {
    const next = gradeCard({ intervalDays: 7, reviews: 4 }, 'AGAIN', now)
    expect(next.intervalDays).toBe(0)
    expect(next.reviews).toBe(5)
    expect(next.dueAt).toBe(now)
    expect(isDue(next, now)).toBe(true)
  })

  it('returns only due cards ordered by due time', () => {
    const cards = [
      { id: 2, numberInSurah: 2 },
      { id: 1, numberInSurah: 1 },
      { id: 3, numberInSurah: 3 }
    ]
    const states = {
      1: { dueAt: now - 100 },
      2: { dueAt: now + 1000 },
      3: { dueAt: now - 500 }
    }
    expect(buildReviewQueue(cards, states, now).map(card => card.id)).toEqual([3, 1])
  })
})
