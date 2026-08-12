import test from 'node:test'
import assert from 'node:assert/strict'
import { isHealthyResponse } from './healthProbe.js'

test('health probe accepts only successful responses explicitly reporting ok=true', () => {
  assert.equal(isHealthyResponse(200, { ok: true }), true)
  assert.equal(isHealthyResponse(204, { ok: true }), true)
  assert.equal(isHealthyResponse(200, { ok: false }), false)
  assert.equal(isHealthyResponse(503, { ok: true }), false)
  assert.equal(isHealthyResponse(200, {}), false)
})
