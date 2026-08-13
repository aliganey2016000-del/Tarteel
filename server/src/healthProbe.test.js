import test from 'node:test'
import assert from 'node:assert/strict'
import { isHealthyResponse } from './healthProbe.js'

test('health probe accepts a healthy 2xx response', () => {
  assert.equal(isHealthyResponse(200, { ok: true, service: 'tarteel-api', database: 'ok' }), true)
  assert.equal(isHealthyResponse(204, { ok: true }), true)
})

test('health probe rejects database failures even when the endpoint responds', () => {
  assert.equal(isHealthyResponse(200, { ok: false, service: 'tarteel-api', database: 'unavailable' }), false)
})

test('health probe rejects non-success responses and malformed bodies', () => {
  assert.equal(isHealthyResponse(503, { ok: true }), false)
  assert.equal(isHealthyResponse(500, { ok: false }), false)
  assert.equal(isHealthyResponse(200, null), false)
  assert.equal(isHealthyResponse(200, {}), false)
  assert.equal(isHealthyResponse('200', { ok: true }), false)
})
