import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_GOAL_TARGETS, clampGoalProgress, defaultGoalTarget, isValidGoalType, normalizeGoalType } from './goals.js'

test('normalizes and validates goal types', () => {
  assert.equal(normalizeGoalType(' memorize '), 'MEMORIZE')
  assert.equal(isValidGoalType('review'), true)
  assert.equal(isValidGoalType('unknown'), false)
})

test('provides conservative daily defaults', () => {
  assert.deepEqual(DEFAULT_GOAL_TARGETS, { MEMORIZE: 5, REVIEW: 10, RECITE: 1 })
  assert.equal(defaultGoalTarget('RECITE'), 1)
  assert.equal(defaultGoalTarget('unknown'), null)
})

test('clamps progress to the configured target', () => {
  assert.equal(clampGoalProgress(2, 5, 2), 4)
  assert.equal(clampGoalProgress(4, 5, 20), 5)
  assert.equal(clampGoalProgress(5, 5, 1), 5)
})
