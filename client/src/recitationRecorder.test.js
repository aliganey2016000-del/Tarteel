import test from 'node:test'
import assert from 'node:assert/strict'
import { RECITATION_MIME_TYPES, getSupportedMimeType, isRecordingSupported } from './recitationRecorder.js'

test('chooses the first browser-supported recording mime type', () => {
  const fakeRecorder = { isTypeSupported: type => type === 'audio/webm' }
  assert.equal(getSupportedMimeType(fakeRecorder), 'audio/webm')
})

test('falls back to an empty mime type when MediaRecorder is unavailable', () => {
  assert.equal(getSupportedMimeType(undefined), '')
  assert.equal(isRecordingSupported(undefined, undefined), false)
})

test('keeps a stable ordered codec preference list', () => {
  assert.equal(RECITATION_MIME_TYPES[0], 'audio/webm;codecs=opus')
  assert.equal(RECITATION_MIME_TYPES.at(-1), 'audio/mp4')
})
