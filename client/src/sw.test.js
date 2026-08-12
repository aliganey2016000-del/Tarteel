import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8')

test('offline shell caches the app entry points', () => {
  assert.match(source, /CACHE_NAME = 'tarteel-shell-v1'/)
  assert.match(source, /APP_SHELL = \['\/', '\/manifest\.webmanifest'\]/)
  assert.match(source, /cache\.addAll\(APP_SHELL\)/)
})

test('service worker serves navigation from shell when offline', () => {
  assert.match(source, /request\.mode === 'navigate'/)
  assert.match(source, /fetch\(request\)\.catch\(\(\) => caches\.match\('\/'\)\)/)
})

test('service worker does not intercept non-GET requests or cross-origin traffic', () => {
  assert.match(source, /if \(request\.method !== 'GET'\) return/)
  assert.match(source, /if \(url\.origin !== self\.location\.origin\) return/)
})
