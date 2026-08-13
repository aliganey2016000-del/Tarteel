import test from 'node:test'
import assert from 'node:assert/strict'
import { isIosSafari } from './installPromptUtils.js'

test('isIosSafari detects iPhone Safari', () => {
  global.window = {
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    },
  }
  assert.equal(isIosSafari(), true)
  delete global.window
})

test('isIosSafari rejects iOS Chromium browsers', () => {
  global.window = {
    navigator: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/120.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
    },
  }
  assert.equal(isIosSafari(), false)
  delete global.window
})
