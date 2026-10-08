import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchInvoices, login, logout, AuthError } from './api'
import { getAccessToken, setAccessToken } from './token'

// fetch mockas: vi bestämmer vad "API:t" svarar och tittar på vad klienten skickar.
const jsonResponse = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

beforeEach(() => {
  setAccessToken(null)
  vi.stubGlobal('fetch', vi.fn())
})
afterEach(() => vi.unstubAllGlobals())

describe('login', () => {
  it('sparar access token i minnet – inte i localStorage', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(200, { accessToken: 'abc.def.ghi', expiresIn: 600, name: 'Anna Andersson' }))
    const data = await login('anna.andersson@example.com', 'kraftly-anna')
    expect(data.name).toBe('Anna Andersson')
    expect(getAccessToken()).toBe('abc.def.ghi')
    expect(localStorage.getItem('kraftly_token')).toBeNull()
    expect(Object.keys(localStorage)).toHaveLength(0)
  })

  it('fel uppgifter → AuthError med användbart meddelande, ingen token', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(401, { error: 'Fel e-post eller lösenord' }))
    await expect(login('a@b.se', 'x')).rejects.toThrow('Fel e-post eller lösenord')
    expect(getAccessToken()).toBeNull()
  })
})

describe('skyddade anrop', () => {
  it('skickar token som Bearer-header till /api/v2', async () => {
    setAccessToken('tok')
    fetch.mockResolvedValueOnce(jsonResponse(200, []))
    await fetchInvoices()
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe('/api/v2/invoices')
    expect(options.headers.Authorization).toBe('Bearer tok')
    expect(options.credentials).toBe('same-origin')
  })

  it('401 → refresh → anropet görs om med den nya token', async () => {
    setAccessToken('gammal')
    fetch
      .mockResolvedValueOnce(jsonResponse(401, { error: 'utgången' })) // första försöket
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'ny', expiresIn: 600, name: 'Anna' })) // refresh
      .mockResolvedValueOnce(jsonResponse(200, [{ id: 'F-1' }])) // omtaget

    const invoices = await fetchInvoices()
    expect(invoices).toEqual([{ id: 'F-1' }])
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(fetch.mock.calls[1][0]).toBe('/api/v2/auth/refresh')
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer ny')
  })

  it('401 och misslyckad refresh → AuthError, token tömd, ingen oändlig loop', async () => {
    setAccessToken('gammal')
    fetch.mockResolvedValueOnce(jsonResponse(401, {})).mockResolvedValueOnce(jsonResponse(401, {}))
    await expect(fetchInvoices()).rejects.toBeInstanceOf(AuthError)
    expect(getAccessToken()).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe('logout', () => {
  it('tömmer token även om servern inte svarar', async () => {
    setAccessToken('tok')
    fetch.mockRejectedValueOnce(new Error('nätverk nere'))
    await expect(logout()).rejects.toThrow()
    expect(getAccessToken()).toBeNull()
  })
})
