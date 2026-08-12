import test from 'node:test'
import assert from 'node:assert/strict'
import { audioUrlForAyah } from './quranApi.js'

test('uses provider audio when available', () => {
  assert.equal(audioUrlForAyah(255, 'https://example.test/255.mp3'), 'https://example.test/255.mp3')
})

test('falls back to the Alafasy CDN for missing provider audio', () => {
  assert.equal(
    audioUrlForAyah(255),
    'https://cdn.islamic.network/quran/audio/128/ar.alafasy/255.mp3'
  )
})
