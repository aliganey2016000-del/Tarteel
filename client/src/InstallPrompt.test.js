import test from 'node:test'
import assert from 'node:assert/strict'
import { isStandalone } from './InstallPrompt.jsx'

test('install prompt is safe during server-side or test evaluation', () => {
  assert.equal(isStandalone(), false)
})
