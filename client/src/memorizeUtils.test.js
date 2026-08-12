import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReviewQueue, gradeCard, isDue } from './memorizeUtils.js'

const now = Date.UTC(2026, 7, 12)

test('gradeCard schedules a new Good review in three days', () => {
  const next = gradeCard({}, 'GOOD', now)
  assert.equal(next.reviews, 1)
  assert.equal(next.intervalDays, 3)
  assert.equal(next.dueAt, now + 3 * 24 * 60 * 60 * 1000)
  assert.equal(isDue(next, now), false)
})

test('gradeCard resets an overdue card with Again', () => {
  const next = gradeCard({ intervalDays: 7, reviews: 4 }, 'AGAIN', now)
  assert.equal(next.intervalDays, 0)
  assert.equal(next.reviews, 5)
  assert.equal(next.dueAt, now)
  assert.equal(isDue(next, now), true)
})

test('buildReviewQueue returns only due cards ordered by due time', () => {
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
  assert.deepEqual(buildReviewQueue(cards, states, now).map(card => card.id), [3, 1])
})
