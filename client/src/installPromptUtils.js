export const DISMISS_KEY = 'tarteel:pwa-install-dismissed:v1'

export const isStandalone = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export const readDismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

export const saveDismissed = () => {
  try { localStorage.setItem(DISMISS_KEY, '1') } catch {}
}
