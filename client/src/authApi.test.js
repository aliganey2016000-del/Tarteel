import test from 'node:test'
import assert from 'node:assert/strict'

const source = await import('./authApi.js')

test('auth API exposes token lifecycle helpers', () => {
  assert.equal(typeof source.getToken, 'function')
  assert.equal(typeof source.setToken, 'function')
  assert.equal(typeof source.clearToken, 'function')
  assert.equal(typeof source.isAuthenticated, 'function')
})

test('auth API exposes account operations', () => {
  assert.equal(typeof source.login, 'function')
  assert.equal(typeof source.register, 'function')
  assert.equal(typeof source.getCurrentUser, 'function')
  assert.equal(typeof source.logout, 'function')
})
