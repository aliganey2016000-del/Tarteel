const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

const request = async (path, options = {}) => {
  const token = localStorage.getItem('tarteel_token')
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) }
  })
  if (response.status === 204) return null
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`)
  return payload.data
}

export const startRecitation = surahNumber => request('/recitations', { method: 'POST', body: JSON.stringify(surahNumber ? { surahNumber } : {}) })
export const finishRecitation = (id, { durationSec, accuracy, mistakes }) => request(`/recitations/${id}`, { method: 'PATCH', body: JSON.stringify({ durationSec, accuracy, mistakes }) })
export const incrementReciteGoal = () => request('/goals/RECITE/progress', { method: 'PATCH', body: JSON.stringify({ increment: 1 }) })
export const listRecitations = (limit = 20) => request(`/recitations?limit=${limit}`)
