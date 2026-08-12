import test from 'node:test'
import assert from 'node:assert/strict'

const { __private__ } = await import('./accountApi.js')

test('account API normalizes local bookmark ids from reader state', () => {
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
    assert.deepEqual(__private__.readLocalBookmarkIds(), [12, 31])
  } finally {
    globalThis.localStorage = previous
  }
})

test('account API safely returns no local bookmarks when storage is unavailable', () => {
  const previous = globalThis.localStorage
  delete globalThis.localStorage
  try {
    assert.deepEqual(__private__.readLocalBookmarkIds(), [])
  } finally {
    globalThis.localStorage = previous
  }
})
