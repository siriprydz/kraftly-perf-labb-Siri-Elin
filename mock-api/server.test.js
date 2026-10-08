// API-tester utan browser: startar servern på en ledig port och pratar http med den.
//   npm run test:api
// Testar det som M6 lovar: skyddade endpoints, riktig inloggning, refresh-cookien, v1 med Sunset.
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')

process.env.API_KEY = 'testnyckel'
process.env.JWT_SECRET = 'bara-for-tester-bara-for-tester-1234'
process.env.ACCESS_TTL_SECONDS = '2'
const app = require('./server')

let server, base
before(async () => {
  server = app.listen(0)
  await new Promise((r) => server.once('listening', r))
  base = `http://127.0.0.1:${server.address().port}`
})
after(() => server.close())

const api = (path, { method = 'GET', body, token, cookie, key = 'testnyckel' } = {}) =>
  fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(key ? { 'X-Api-Key': key } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })

const login = (email = 'anna.andersson@example.com', password = 'kraftly-anna') =>
  api('/api/v2/auth/login', { method: 'POST', body: { email, password } })

test('utan nyckel: 401 även på v2', async () => {
  const res = await api('/api/v2/user', { key: null })
  assert.equal(res.status, 401)
})

test('skyddad endpoint utan token → 401 med WWW-Authenticate', async () => {
  const res = await api('/api/v2/invoices')
  assert.equal(res.status, 401)
  assert.equal(res.headers.get('www-authenticate'), 'Bearer')
})

test('fel lösenord → 401 med samma text som fel e-post', async () => {
  const wrongPassword = await login('anna.andersson@example.com', 'fel')
  const wrongEmail = await login('finns.inte@example.com', 'fel')
  assert.equal(wrongPassword.status, 401)
  assert.equal(wrongEmail.status, 401)
  assert.deepEqual(await wrongPassword.json(), await wrongEmail.json())
})

test('rätt uppgifter → access token i svaret och refresh token som httpOnly-cookie', async () => {
  const res = await login()
  assert.equal(res.status, 200)
  const body = await res.json()
  assert.match(body.accessToken, /^eyJ/)
  assert.equal(body.name, 'Anna Andersson')
  const cookie = res.headers.get('set-cookie')
  assert.match(cookie, /^kraftly_refresh=/)
  assert.match(cookie, /HttpOnly/)
  assert.match(cookie, /SameSite=Strict/)
  assert.match(cookie, /Path=\/api\/v2\/auth/)
})

test('token ger bara den inloggades data – kundnumret kommer från token, inte från anropet', async () => {
  const anna = await (await login()).json()
  const bo = await (await login('bo.bergstrom@example.com', 'kraftly-bo')).json()
  const annasInvoices = await (await api('/api/v2/invoices', { token: anna.accessToken })).json()
  const bosInvoices = await (await api('/api/v2/invoices?customerNo=K-104233', { token: bo.accessToken })).json()
  assert.equal(annasInvoices.length, 6)
  assert.equal(bosInvoices.length, 3) // frågesträngen ignoreras
})

test('manipulerad token → 401', async () => {
  const { accessToken } = await (await login()).json()
  const [header, payload, signature] = accessToken.split('.')
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), sub: '2' })).toString('base64url')
  const res = await api('/api/v2/user', { token: `${header}.${forged}.${signature}` })
  assert.equal(res.status, 401)
  assert.equal((await res.json()).reason, 'JsonWebTokenError')
})

test('utgången token → 401 med reason TokenExpiredError', async () => {
  const { accessToken } = await (await login()).json()
  await new Promise((r) => setTimeout(r, 2200))
  const res = await api('/api/v2/user', { token: accessToken })
  assert.equal(res.status, 401)
  assert.equal((await res.json()).reason, 'TokenExpiredError')
})

test('refresh: ny access token, och den gamla refresh-token förbrukas (rotation)', async () => {
  const loginRes = await login()
  const cookie = loginRes.headers.get('set-cookie').split(';')[0]
  const first = await api('/api/v2/auth/refresh', { method: 'POST', cookie })
  assert.equal(first.status, 200)
  assert.match((await first.json()).accessToken, /^eyJ/)
  const again = await api('/api/v2/auth/refresh', { method: 'POST', cookie })
  assert.equal(again.status, 401) // samma cookie en gång till → nej
})

test('logout glömmer refresh-token och nollar cookien', async () => {
  const loginRes = await login()
  const cookie = loginRes.headers.get('set-cookie').split(';')[0]
  const out = await api('/api/v2/auth/logout', { method: 'POST', cookie })
  assert.equal(out.status, 204)
  assert.match(out.headers.get('set-cookie'), /kraftly_refresh=;.*Max-Age=0/)
  const res = await api('/api/v2/auth/refresh', { method: 'POST', cookie })
  assert.equal(res.status, 401)
})

test('bruteforce-broms: fem fel → 429', async () => {
  for (let i = 0; i < 5; i++) await login('bo.bergstrom@example.com', 'gissning' + i)
  const res = await login('bo.bergstrom@example.com', 'kraftly-bo') // rätt lösenord hjälper inte nu
  assert.equal(res.status, 429)
})

test('v1 fungerar men säger att den avvecklas', async () => {
  const res = await api('/api/user')
  assert.equal(res.status, 200)
  assert.equal(res.headers.get('deprecation'), 'true')
  assert.match(res.headers.get('sunset'), /2026/)
  assert.match(res.headers.get('link'), /api\/v2/)
})

test('ingen CORS-header utan ALLOWED_ORIGINS', async () => {
  const res = await fetch(base + '/api/v2/auth/login', { method: 'OPTIONS', headers: { Origin: 'http://evil.example' } })
  assert.equal(res.headers.get('access-control-allow-origin'), null)
})
