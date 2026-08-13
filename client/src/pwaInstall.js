export const INSTALL_DISMISS_KEY = 'tarteel:pwa-install-dismissed:v1'
export const INSTALL_DISMISS_DAYS = 14

export function isStandaloneDisplayMode() {
  try {
    return window.matchMedia?.('(display-mode: standalone)').matches === true || window.navigator.standalone === true
  } catch {
    return false
  }
}

export function shouldShowInstallPrompt(storage = globalThis.localStorage, now = Date.now()) {
  if (isStandaloneDisplayMode()) return false
  try {
    const dismissedAt = Number(storage?.getItem(INSTALL_DISMISS_KEY) || 0)
    return !dismissedAt || now - dismissedAt >= INSTALL_DISMISS_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return true
  }
}

export function dismissInstallPrompt(storage = globalThis.localStorage, now = Date.now()) {
  try { storage?.setItem(INSTALL_DISMISS_KEY, String(now)) } catch {}
}

export function canInstallFromEvent(event) {
  return Boolean(event && typeof event.preventDefault === 'function' && typeof event.prompt === 'function')
}
