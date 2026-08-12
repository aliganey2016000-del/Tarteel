import test from 'node:test'
import assert from 'node:assert/strict'
import { audioUrlForAyah, normalizeSearchResults, searchEditionForQuery, searchQuran } from './quranApi.js'

test('uses provider audio when available', () => {
  assert.equal(audioUrlForAyah(255, 'https://example.test/255.mp3'), 'https://example.test/255.mp3')
})

test('falls back to the Alafasy CDN for missing provider audio', () => {
  assert.equal(
    audioUrlForAyah(255),
    'https://cdn.islamic.network/quran/audio/128/ar.alafasy/255.mp3'
  )
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
