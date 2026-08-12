import test from 'node:test'
import assert from 'node:assert/strict'
import { clampAyahIndex, filterSurahs, parseAyahNumber, progressPercent } from './readerUtils.js'

test('clampAyahIndex keeps navigation inside a Surah', () => {
  assert.equal(clampAyahIndex(-2, 7), 0)
  assert.equal(clampAyahIndex(2, 7), 2)
  assert.equal(clampAyahIndex(99, 7), 6)
})

test('progressPercent reports inclusive reading progress', () => {
  assert.equal(progressPercent(0, 7), 14)
  assert.equal(progressPercent(6, 7), 100)
  assert.equal(progressPercent(0, 0), 0)
})

test('filterSurahs searches number, English and Arabic names', () => {
  const catalog = [
    { number: 1, englishName: 'Al-Fatihah', name: 'الفاتحة', englishNameTranslation: 'The Opening' },
    { number: 2, englishName: 'Al-Baqarah', name: 'البقرة', englishNameTranslation: 'The Cow' }
  ]
  assert.equal(filterSurahs(catalog, 'opening').length, 1)
  assert.equal(filterSurahs(catalog, 'البقرة')[0].number, 2)
  assert.equal(filterSurahs(catalog, '2')[0].number, 2)
})

test('parseAyahNumber validates direct navigation input', () => {
  assert.equal(parseAyahNumber('5', 7), 5)
  assert.equal(parseAyahNumber('0', 7), null)
  assert.equal(parseAyahNumber('8', 7), null)
  assert.equal(parseAyahNumber('x', 7), null)
})
