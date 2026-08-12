import test from 'node:test'
import assert from 'node:assert/strict'
import { streakLabel, summarizeStreak } from './progressUtils.js'

test('summarizeStreak normalizes a valid API response', () => {
  assert.deepEqual(summarizeStreak({ currentStreak: 7, longestStreak: 12, activeToday: true }), {
    current: 7,
    longest: 12,
    activeToday: true
  })
})

test('summarizeStreak safely handles missing or invalid values', () => {
  assert.deepEqual(summarizeStreak({ currentStreak: -4, longestStreak: 'nope' }), {
    current: 0,
    longest: 0,
    activeToday: false
  })
})

test('streakLabel uses singular and plural correctly', () => {
  assert.equal(streakLabel(1), '1 day')
  assert.equal(streakLabel(3), '3 days')
})
