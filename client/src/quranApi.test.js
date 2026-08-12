import test from 'node:test'
import assert from 'node:assert/strict'
import { RECITERS, audioUrlForAyah, normalizeSearchResults, searchEditionForQuery, searchQuran } from './quranApi.js'

test('uses provider audio when available', () => {
  assert.equal(audioUrlForAyah(255, 'https://example.test/255.mp3'), 'https://example.test/255.mp3')
})

test('falls back to the selected reciter CDN for missing provider audio', () => {
  assert.equal(
    audioUrlForAyah(255, null, 'ar.husary'),
    'https://cdn.islamic.network/quran/audio/128/ar.husary/255.mp3'
  )
})

test('exposes a curated multi-reciter catalog', () => {
  assert.ok(RECITERS.length >= 6)
  assert.equal(RECITERS[0].id, 'ar.alafasy')
  assert.equal(RECITERS.some(reciter => reciter.id === 'ar.husary'), true)
  assert.equal(RECITERS.some(reciter => reciter.id === 'ar.sudais'), true)
})

test('selects Arabic search edition for Arabic queries', () => {
  assert.equal(searchEditionForQuery('الله'), 'quran-simple-clean')
  assert.equal(searchEditionForQuery('mercy'), 'en.sahih')
  assert.equal(searchEditionForQuery('الله', 'quran-uthmani'), 'quran-uthmani')
})

test('normalizes Quran search matches for reader navigation', () => {
  assert.deepEqual(normalizeSearchResults([{
    number: 255,
    numberInSurah: 255,
    text: 'Allah—there is no deity except Him.',
    surah: { number: 2, name: 'البقرة', englishName: 'Al-Baqarah' }
  }]), [{
    ayahNumber: 255,
    globalAyahNumber: 255,
    surahNumber: 2,
    surahName: 'Al-Baqarah',
    surahArabicName: 'البقرة',
    text: 'Allah—there is no deity except Him.'
  }])
})

test('rejects empty Quran searches before making a network request', async () => {
  await assert.rejects(() => searchQuran(' '), /at least 2 characters/)
})
