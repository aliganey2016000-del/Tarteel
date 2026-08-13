export const DISMISS_KEY = 'tarteel:pwa-install-dismissed:v1'

export const isStandalone = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export const isIosSafari = () => {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent || ''
  const ios = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1)
  const webkit = /WebKit/i.test(ua)
  const chromium = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua)
  return ios && webkit && !chromium
}

export const readDismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

export const saveDismissed = () => {
  try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
}
