import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.join(process.cwd(), 'src', 'NetworkStatus.jsx'), 'utf8')

test('network status is a non-blocking, accessible live region', () => {
  assert.match(source, /role="status"/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /addEventListener\('online'/)
  assert.match(source, /addEventListener\('offline'/)
  assert.match(source, /removeEventListener\('online'/)
  assert.match(source, /removeEventListener\('offline'/)
})

test('offline messaging does not claim cloud synchronization while disconnected', () => {
  assert.match(source, /You are offline — local reading stays available\./)
  assert.match(source, /Back online — syncing your progress\./)
})
