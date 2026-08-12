import test from 'node:test'
import assert from 'node:assert/strict'
import { buildStreakSummary } from './streaks.js'

test('counts a current streak anchored on today', () => {
  const summary = buildStreakSummary([
    '2026-08-10T12:00:00Z',
    '2026-08-11T12:00:00Z',
    '2026-08-12T08:00:00Z',
    '2026-08-07T08:00:00Z'
  ], '2026-08-12T12:00:00Z')

  assert.equal(summary.currentStreak, 3)
  assert.equal(summary.longestStreak, 3)
  assert.equal(summary.activeToday, true)
  assert.equal(summary.totalActiveDays, 4)
})

test('continues yesterday streak when today is not active', () => {
  const summary = buildStreakSummary([
    '2026-08-09T12:00:00Z',
    '2026-08-10T12:00:00Z',
    '2026-08-11T12:00:00Z'
  ], '2026-08-12T12:00:00Z')

  assert.equal(summary.currentStreak, 3)
  assert.equal(summary.activeToday, false)
})

test('deduplicates multiple events on the same day', () => {
  const summary = buildStreakSummary([
    '2026-08-12T01:00:00Z',
    '2026-08-12T18:00:00Z'
  ], '2026-08-12T20:00:00Z')

  assert.equal(summary.currentStreak, 1)
  assert.equal(summary.totalActiveDays, 1)
})
