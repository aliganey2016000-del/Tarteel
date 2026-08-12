const API_BASE = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '')

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    }
  })
  if (response.status === 204) return null
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const retryAfter = response.headers.get('Retry-After')
    const suffix = response.status === 429 && retryAfter ? ` Try again in ${retryAfter}s.` : ''
    throw new Error(`${payload.error || `Request failed (${response.status})`}${suffix}`)
  }
  return payload.data
}

export const login = (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
export const register = (email, password, name) => request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) })
export const getMe = (token) => request('/auth/me', { token })
export const listBookmarks = (token) => request('/bookmarks', { token })
export const saveBookmark = (token, ayahId) => request(`/bookmarks/${ayahId}`, { method: 'PUT', token })
export const removeBookmark = (token, ayahId) => request(`/bookmarks/${ayahId}`, { method: 'DELETE', token })
export const saveProgress = (token, surahNumber, ayahNumber) => request('/progress', { method: 'PUT', token, body: JSON.stringify({ surahNumber, ayahNumber }) })
export const getProgress = (token) => request('/progress', { token })
export const getStreaks = (token) => request('/streaks', { token })
export const getGoals = (token, date) => request(`/goals${date ? `?date=${encodeURIComponent(date)}` : ''}`, { token })
export const updateGoal = (token, type, target, completed, date) => request(`/goals/${encodeURIComponent(type)}`, { method: 'PUT', token, body: JSON.stringify({ target, completed, ...(date ? { date } : {}) }) })
