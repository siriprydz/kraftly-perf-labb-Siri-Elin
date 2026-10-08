// API client for Kraftly "Mina sidor" – mot API v2, med riktig autentisering.
//
// Ingen nyckel här. Allt som ligger i frontendkoden hamnar i JavaScript-filen som
// browsern laddar ner. Appen anropar /api relativt; servern framför appen (Vite lokalt,
// nginx i molnet) skickar anropet vidare till API:t och lägger på klientnyckeln på vägen.
//
// Vem användaren är bevisas med en access token i Authorization-headern. Den är kortlivad.
// När den gått ut svarar API:t 401 – då hämtar vi en ny med refresh-cookien och gör om anropet.
import { getAccessToken, setAccessToken } from './token'

const BASE_URL = '/api/v2'

export class AuthError extends Error {
  constructor(message = 'Inloggning krävs') {
    super(message)
    this.name = 'AuthError'
  }
}

const rawRequest = (path, options = {}) =>
  fetch(BASE_URL + path, {
    ...options,
    // same-origin: cookien (refresh token) skickas bara till vår egen adress, aldrig till andra
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}),
      ...options.headers
    }
  })

// Refresh-cookien är httpOnly – JavaScript ser den inte, men browsern skickar den med
// eftersom anropet går till samma origin och cookiens Path matchar. Lyckas det har vi en ny token.
export const refresh = async () => {
  const res = await fetch(BASE_URL + '/auth/refresh', { method: 'POST', credentials: 'same-origin' })
  if (!res.ok) {
    setAccessToken(null)
    return null
  }
  const data = await res.json()
  setAccessToken(data.accessToken)
  return data
}

const request = async (path, options = {}) => {
  let res = await rawRequest(path, options)
  // 401 = token saknas eller har gått ut. Ett försök till efter refresh – inte fler, annars loopar vi.
  if (res.status === 401 && !options._retried) {
    const renewed = await refresh()
    if (!renewed) throw new AuthError()
    res = await rawRequest(path, { ...options, _retried: true })
  }
  if (res.status === 401) throw new AuthError()
  if (!res.ok) {
    console.log('API error', res.status)
    throw new Error('API error ' + res.status)
  }
  return res.status === 204 ? null : res.json()
}

// --- auth ---
export const login = async (email, password) => {
  const res = await rawRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  if (res.status === 401) throw new AuthError('Fel e-post eller lösenord')
  if (res.status === 429) throw new AuthError('För många försök – vänta en minut')
  if (!res.ok) throw new Error('API error ' + res.status)
  const data = await res.json()
  setAccessToken(data.accessToken)
  return data
}

export const logout = async () => {
  try {
    await rawRequest('/auth/logout', { method: 'POST' })
  } finally {
    setAccessToken(null) // lokalt är vi utloggade oavsett vad servern svarade
  }
}

// --- data (kräver inloggning) ---
export const fetchUser = () => request('/user')

export const fetchConsumption = () => request('/consumption')

export const fetchInvoices = () => request('/invoices')

export const submitMove = (data) => request('/move', { method: 'POST', body: JSON.stringify(data) })

export const saveUser = (data) => request('/user', { method: 'PUT', body: JSON.stringify(data) })
