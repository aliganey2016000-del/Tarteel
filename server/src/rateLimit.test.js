import test from 'node:test'
import assert from 'node:assert/strict'
import { createRateLimiter } from './rateLimit.js'

const response = () => {
  const headers = new Map()
  return {
    statusCode: 200,
    body: null,
    headers,
    set(name, value) { headers.set(name, value); return this },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this }
  }
}

test('request cap allows calls up to its maximum', () => {
  const guard = createRateLimiter({ windowMs: 60_000, max: 2, keyGenerator: () => 'test-user' })
  let calls = 0
  guard({}, response(), () => { calls += 1 })
  guard({}, response(), () => { calls += 1 })
  assert.equal(calls, 2)
})

test('request cap rejects the next call with retry metadata', () => {
  const guard = createRateLimiter({ windowMs: 60_000, max: 1, keyGenerator: () => 'test-user' })
  guard({}, response(), () => {})
  const blocked = response()
  guard({}, blocked, () => {})
  assert.equal(blocked.statusCode, 429)
  assert.equal(blocked.headers.get('Retry-After'), '60')
  assert.equal(blocked.body.retryAfter, 60)
})

test('request cap keeps separate keys independent', () => {
  let key = 'one'
  const guard = createRateLimiter({ windowMs: 60_000, max: 1, keyGenerator: () => key })
  let calls = 0
  guard({}, response(), () => { calls += 1 })
  key = 'two'
  guard({}, response(), () => { calls += 1 })
  assert.equal(calls, 2)
})
