import test from 'node:test'
import assert from 'node:assert/strict'

const { __private__ } = await import('./accountApi.js')

test('account API reads v3 reader bookmarks', () => {
  const previous = globalThis.localStorage
  const values = new Map([
    ['tarteel:surah-detail:v3', JSON.stringify({ bookmarks: { 2: { 3: { timestamp: '2026-08-12T00:00:00.000Z' }, 5: {} } } })]
  ])
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  }

  try {
    assert.deepEqual(__private__.readLocalBookmarks(), [
      { surahNumber: 2, ayahNumber: 3, timestamp: '2026-08-12T00:00:00.000Z', readingPosition: 3 },
      { surahNumber: 2, ayahNumber: 5, timestamp: null, readingPosition: 5 }
    ])
  } finally {
    globalThis.localStorage = previous
  }
})

test('account API migrates legacy global bookmark ids without treating invalid ids as valid', () => {
  const previous = globalThis.localStorage
  const values = new Map([
    ['tarteel:reader:v2', JSON.stringify({ bookmarks: [12, '12', 0, -4, 'bad', 27.5, 31] })]
  ])
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  }

  try {
    assert.deepEqual(__private__.readLocalBookmarks(), [
      { ayahId: 12 },
      { ayahId: 12 },
      { ayahId: 31 }
    ])
  } finally {
    globalThis.localStorage = previous
  }
})

test('bookmark keys are stable across numeric string values', () => {
  assert.equal(__private__.normalizeBookmarkKey(2, 3), '2:3')
  assert.equal(__private__.normalizeBookmarkKey('2', '3'), '2:3')
})

test('account API safely returns no local bookmarks when storage is unavailable', () => {
  const previous = globalThis.localStorage
  delete globalThis.localStorage
  try {
    assert.deepEqual(__private__.readLocalBookmarks(), [])
  } finally {
    globalThis.localStorage = previous
  }
})
