import test from 'node:test'
import assert from 'node:assert/strict'
import { isStandalone } from './installPromptUtils.js'

test('install prompt helper is safe without a browser window', () => {
  assert.equal(isStandalone(), false)
})
