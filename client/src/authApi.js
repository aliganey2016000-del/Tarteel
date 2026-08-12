const API_BASE = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '')
const TOKEN_KEY = 'tarteel_token'

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(options.headers || {})
    }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`)
  return payload.data
}

export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || '' } catch { return '' }
}

export const setToken = token => {
  try {
    if (!token) return clearToken()
    localStorage.setItem(TOKEN_KEY, token)
  } catch {}
}

export const clearToken = () => {
  try { localStorage.removeItem(TOKEN_KEY) } catch {}
}

export const getCurrentUser = () => request('/auth/me')

export const register = async ({ email, password, name }) => {
  const data = await request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) })
  setToken(data.token)
  return data.user
}

export const login = async ({ email, password }) => {
  const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  setToken(data.token)
  return data.user
}

export const logout = () => clearToken()

export const isAuthenticated = () => Boolean(getToken())
