const REVIEW_INTERVALS = {
  AGAIN: 0,
  HARD: 1,
  GOOD: 3,
  EASY: 7
}

export const REVIEW_RATINGS = Object.keys(REVIEW_INTERVALS)

export function normalizeCardState(state = {}) {
  return {
    dueAt: Number(state.dueAt) || 0,
    intervalDays: Math.max(0, Number(state.intervalDays) || 0),
    reviews: Math.max(0, Number(state.reviews) || 0),
    rating: typeof state.rating === 'string' ? state.rating : null
  }
}

export function isDue(state, now = Date.now()) {
  return normalizeCardState(state).dueAt <= now
}

export function gradeCard(state = {}, rating, now = Date.now()) {
  const normalized = normalizeCardState(state)
  if (!REVIEW_INTERVALS[rating]) {
    if (rating !== 'AGAIN') throw new Error('Unknown review rating')
  }
  const days = REVIEW_INTERVALS[rating]
  const nextInterval = rating === 'AGAIN'
    ? 0
    : Math.max(days, normalized.intervalDays + (rating === 'EASY' ? 2 : rating === 'HARD' ? 0 : 1))
  return {
    dueAt: now + nextInterval * 24 * 60 * 60 * 1000,
    intervalDays: nextInterval,
    reviews: normalized.reviews + 1,
    rating
  }
}

export function buildReviewQueue(cards = [], states = {}, now = Date.now()) {
  return cards
    .map(card => ({ ...card, state: normalizeCardState(states[card.id]) }))
    .filter(card => isDue(card.state, now))
    .sort((a, b) => a.state.dueAt - b.state.dueAt || a.numberInSurah - b.numberInSurah)
}
