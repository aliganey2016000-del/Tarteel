export const DEFAULT_GOAL_TARGETS = Object.freeze({
  MEMORIZE: 5,
  REVIEW: 10,
  RECITE: 1
})

export const normalizeGoalType = value => String(value || '').trim().toUpperCase()

export const isValidGoalType = value => Object.prototype.hasOwnProperty.call(DEFAULT_GOAL_TARGETS, normalizeGoalType(value))

export const defaultGoalTarget = value => DEFAULT_GOAL_TARGETS[normalizeGoalType(value)] ?? null

export const clampGoalProgress = (completed, target, increment = 1) => {
  const current = Number.isInteger(completed) ? completed : 0
  const limit = Number.isInteger(target) && target > 0 ? target : 1
  const step = Number.isInteger(increment) && increment > 0 ? increment : 1
  return Math.min(limit, Math.max(0, current + step))
}
