import test from 'node:test'
import assert from 'node:assert/strict'
import { readReaderResume } from './readerResumeUtils.js'

function storage(value) {
  return { getItem: () => value }
}

test('reader resume safely parses a valid saved position', () => {
  assert.deepEqual(readReaderResume(storage(JSON.stringify({ surahNumber: 36, ayahNumber: 12 }))), { surahNumber: 36, ayahNumber: 12 })
})

test('reader resume defaults a missing ayah to one', () => {
  assert.deepEqual(readReaderResume(storage(JSON.stringify({ surahNumber: 2 }))), { surahNumber: 2, ayahNumber: 1 })
})

test('reader resume rejects corrupt or unsafe storage values', () => {
  assert.equal(readReaderResume(storage('{bad json')), null)
  assert.equal(readReaderResume(storage(JSON.stringify({ surahNumber: 0, ayahNumber: 4 }))), null)
  assert.equal(readReaderResume(storage(JSON.stringify({ surahNumber: 115, ayahNumber: 4 }))), null)
})
