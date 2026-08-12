import test from 'node:test'
import assert from 'node:assert/strict'
import { clampNumber, formatAudioTime, nextAyahNumber, normalizeRepeatCount, readingTheme } from './readerUtils.js'

test('normalizes supported repeat counts', () => {
  assert.equal(normalizeRepeatCount(3), 3)
  assert.equal(normalizeRepeatCount('infinity'), Infinity)
  assert.equal(normalizeRepeatCount(9), 1)
})

test('clamps and advances ayah positions safely', () => {
  assert.equal(clampNumber(9, 1, 7), 7)
  assert.equal(clampNumber(-2, 1, 7), 1)
  assert.equal(nextAyahNumber(7, 7, 1), 7)
  assert.equal(nextAyahNumber(1, 7, -1), 1)
  assert.equal(nextAyahNumber(3, 7, 1), 4)
})

test('formats audio time', () => {
  assert.equal(formatAudioTime(0), '0:00')
  assert.equal(formatAudioTime(65.9), '1:05')
  assert.equal(formatAudioTime('bad'), '0:00')
})

test('resolves reading theme', () => {
  assert.equal(readingTheme('light', true), 'light')
  assert.equal(readingTheme('dark', false), 'dark')
  assert.equal(readingTheme('auto', true), 'dark')
  assert.equal(readingTheme('auto', false), 'light')
})
