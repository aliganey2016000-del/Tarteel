const API_BASE = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '')
const TOKEN_KEY = 'tarteel:auth-token'

const request = async (path) => {
  const token = localStorage.getItem(TOKEN_KEY) || ''
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`)
  return payload.data
}

export const getAdminStats = () => request('/admin/stats')
export const listAdminUsers = (limit = 50) => request(`/admin/users?limit=${encodeURIComponent(limit)}`)
