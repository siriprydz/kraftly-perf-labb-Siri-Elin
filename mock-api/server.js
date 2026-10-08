// Kraftlys test-API, version 2. Två API:er i samma process:
//
//   /api/…      = v1, det gamla API:t. Nyckel räcker, ingen inloggning. AVVECKLAS – se Sunset-headern.
//   /api/v2/…   = riktig autentisering: e-post + lösenord → kort access token (JWT) i svaret
//                 + refresh token i en httpOnly-cookie. Varje skyddad endpoint kräver Bearer.
//
// Konfiguration kommer från miljön. Lokalt läses .env (om den finns), i molnet sätter
// plattformen variablerna. Ingen nyckel och ingen hemlighet i koden.
const express = require('express')
const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')

try {
  process.loadEnvFile()
} catch {
  // ingen .env – helt normalt i en container
}

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------

// API_KEYS = flera klienter, en nyckel var: "volt:abc123,ampere:def456"
// API_KEY  = en enda nyckel (det räcker lokalt)
const keys = new Map(
  (process.env.API_KEYS || (process.env.API_KEY ? `lokal:${process.env.API_KEY}` : ''))
    .split(',')
    .map((entry) => entry.trim())
    .map((entry) => [entry.slice(0, entry.indexOf(':')), entry.slice(entry.indexOf(':') + 1)])
    .filter(([name, key]) => name && key)
    .map(([name, key]) => [key, name])
)
if (keys.size === 0) {
  console.error('API_KEY saknas. Lokalt: kopiera .env.example till .env. I molnet: sätt variabeln hos plattformen.')
  process.exit(1)
}

// Hemligheten som signerar access tokens. Den som har den kan skriva giltiga tokens åt vem som helst.
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET saknas eller är kortare än 32 tecken. Skapa en: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"')
  process.exit(1)
}

const ACCESS_TTL_SECONDS = Number(process.env.ACCESS_TTL_SECONDS || 600) // 10 min
const REFRESH_TTL_SECONDS = Number(process.env.REFRESH_TTL_SECONDS || 8 * 60 * 60) // 8 h
// Secure-cookies skickas bara över https. Lokalt kör vi http – sätt COOKIE_SECURE=true i molnet.
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true'
// Browsern pratar med API:t via servern framför appen (Vite lokalt, nginx i molnet) – samma origin,
// så CORS behövs inte. Bara om någon annan origin ska få anropa API:t direkt listas den här.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean)

// ---------------------------------------------------------------------------
// Data. Lösenorden lagras som scrypt-hash (mock-api/hash-password.js gör en ny).
// Testkonton: anna.andersson@example.com / kraftly-anna · bo.bergstrom@example.com / kraftly-bo
// ---------------------------------------------------------------------------
const users = [
  {
    id: 1,
    email: 'anna.andersson@example.com',
    passwordHash: 'scrypt$7c481b3d8ca0434a0ce8304eafb17d10$9b35e8a271d191a5ff9320006138fa2196496fcf686c9a727fb56aa107723b68655c6220112bbacc27e8fa0f63fe2425dcfabac24fcec45fc911d1f2fc0aca7c',
    name: 'Anna Andersson',
    address: 'Solvägen 12, 802 67 Gävle',
    contract: 'Rörligt pris',
    customerNo: 'K-104233'
  },
  {
    id: 2,
    email: 'bo.bergstrom@example.com',
    passwordHash: 'scrypt$17e7c1d3168b6883efcf082ecc87fd20$e136b8c2cd1c28ae2fd10f7a9e8491c9c50b3558b9cda6942faada2ce1005e1362eb6ea17d4e7cc893fb0e3807ff2f8caf11f5702bf6803349457508f25f607f',
    name: 'Bo Bergström',
    address: 'Kvarnbacken 4, 621 45 Visby',
    contract: 'Fast pris 1 år',
    customerNo: 'K-208811'
  }
]

const invoicesByUser = {
  1: [
    { id: 'F-2026-06', period: 'Juni 2026', amount: 412, status: 'Obetald', due: '2026-07-31' },
    { id: 'F-2026-05', period: 'Maj 2026', amount: 486, status: 'Betald', due: '2026-06-30' },
    { id: 'F-2026-04', period: 'April 2026', amount: 655, status: 'Betald', due: '2026-05-31' },
    { id: 'F-2026-03', period: 'Mars 2026', amount: 918, status: 'Betald', due: '2026-04-30' },
    { id: 'F-2026-02', period: 'Februari 2026', amount: 1204, status: 'Betald', due: '2026-03-31' },
    { id: 'F-2026-01', period: 'Januari 2026', amount: 1345, status: 'Betald', due: '2026-02-28' }
  ],
  2: [
    { id: 'F-2026-06', period: 'Juni 2026', amount: 289, status: 'Obetald', due: '2026-07-31' },
    { id: 'F-2026-05', period: 'Maj 2026', amount: 301, status: 'Betald', due: '2026-06-30' },
    { id: 'F-2026-04', period: 'April 2026', amount: 377, status: 'Betald', due: '2026-05-31' }
  ]
}

const consumptionByUser = {
  1: {
    unit: 'kWh',
    months: ['Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun'],
    values: [210, 195, 260, 340, 520, 680, 730, 640, 470, 320, 240, 205],
    pricePerKwh: 1.42
  },
  2: {
    unit: 'kWh',
    months: ['Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun'],
    values: [120, 110, 150, 210, 330, 410, 440, 390, 280, 190, 140, 125],
    pricePerKwh: 1.19
  }
}

const publicUser = ({ id, name, email, address, contract, customerNo }) => ({ id, name, email, address, contract, customerNo })

// ---------------------------------------------------------------------------
// Lösenord: scrypt med salt, jämförelse i konstant tid
// ---------------------------------------------------------------------------
const verifyPassword = (password, stored) => {
  const [algo, salt, hash] = String(stored).split('$')
  if (algo !== 'scrypt' || !salt || !hash) return false
  const derived = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected)
}
// En hash att jämföra mot när e-posten inte finns – så att "fel e-post" tar lika lång tid som "fel lösenord".
const DUMMY_HASH = users[0].passwordHash

// ---------------------------------------------------------------------------
// Bruteforce-broms: fem misslyckade försök per e-post → 60 s paus
// ---------------------------------------------------------------------------
const failures = new Map() // email → { count, until }
const MAX_FAILURES = 5
const LOCK_MS = 60_000
const isLocked = (email) => {
  const f = failures.get(email)
  return f && f.count >= MAX_FAILURES && Date.now() < f.until
}
const noteFailure = (email) => {
  const f = failures.get(email) || { count: 0, until: 0 }
  f.count += 1
  if (f.count >= MAX_FAILURES) f.until = Date.now() + LOCK_MS
  failures.set(email, f)
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------
const issueAccessToken = (user) =>
  jwt.sign({ name: user.name, customerNo: user.customerNo }, JWT_SECRET, {
    subject: String(user.id),
    expiresIn: ACCESS_TTL_SECONDS,
    issuer: 'kraftly-api'
  })

// Refresh tokens är slumpvärden, inte JWT: servern måste kunna glömma dem (logout, rotation).
const refreshTokens = new Map() // token → { userId, expires }
const issueRefreshToken = (user) => {
  const token = crypto.randomBytes(32).toString('base64url')
  refreshTokens.set(token, { userId: user.id, expires: Date.now() + REFRESH_TTL_SECONDS * 1000 })
  return token
}

// Cookien når bara /api/v2/auth – ingen annan endpoint ser den. HttpOnly: JavaScript kan inte läsa den.
// SameSite=Strict: skickas aldrig från en annan sajt. Secure: bara över https (i molnet).
const REFRESH_COOKIE = 'kraftly_refresh'
const cookieAttributes = (maxAge) =>
  `Path=/api/v2/auth; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${COOKIE_SECURE ? '; Secure' : ''}`
const setRefreshCookie = (res, token) => res.setHeader('Set-Cookie', `${REFRESH_COOKIE}=${token}; ${cookieAttributes(REFRESH_TTL_SECONDS)}`)
const clearRefreshCookie = (res) => res.setHeader('Set-Cookie', `${REFRESH_COOKIE}=; ${cookieAttributes(0)}`)
const readCookie = (req, name) => {
  const header = req.get('Cookie') || ''
  const pair = header.split(';').map((p) => p.trim()).find((p) => p.startsWith(name + '='))
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null
}

// ---------------------------------------------------------------------------
// Appen
// ---------------------------------------------------------------------------
const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))

// Hälsokoll för plattformen – ingen nyckel, inga data
app.get('/healthz', (req, res) => res.send('ok'))

// CORS: bara origins vi uttryckligen listat, och aldrig "*". Ingen lista = inga CORS-headers alls.
app.use((req, res, next) => {
  const origin = req.get('Origin')
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
    res.header('Vary', 'Origin')
    res.header('Access-Control-Allow-Credentials', 'true')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
  }
  next()
})

// Varje anrop till /api måste ha en giltig klientnyckel (den lägger servern framför appen på)
app.use('/api', (req, res, next) => {
  const client = keys.get(req.get('X-Api-Key'))
  if (!client) {
    console.log(`401 ${req.method} ${req.originalUrl} – saknad eller ogiltig nyckel`)
    return res.status(401).json({ error: 'Saknad eller ogiltig API-nyckel' })
  }
  req.client = client
  next()
})

// ============================ v2 ============================
const v2 = express.Router()

// Kräver "Authorization: Bearer <access token>". Fel eller utgången token → 401, aldrig data.
const requireAuth = (req, res, next) => {
  const header = req.get('Authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    res.setHeader('WWW-Authenticate', 'Bearer')
    return res.status(401).json({ error: 'Inloggning krävs' })
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'kraftly-api', algorithms: ['HS256'] })
    req.user = users.find((u) => String(u.id) === payload.sub)
    if (!req.user) throw new Error('okänd användare')
    next()
  } catch (err) {
    res.setHeader('WWW-Authenticate', 'Bearer error="invalid_token"')
    return res.status(401).json({ error: 'Ogiltig eller utgången token', reason: err.name })
  }
}

v2.post('/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')
  if (!email || !password) return res.status(400).json({ error: 'E-post och lösenord krävs' })
  if (isLocked(email)) {
    console.log(`[${req.client}] 429 login ${email} – låst efter ${MAX_FAILURES} försök`)
    return res.status(429).json({ error: 'För många försök. Vänta en minut.' })
  }
  const user = users.find((u) => u.email === email)
  // Kör hashningen även när e-posten inte finns – annars avslöjar svarstiden vilka konton som finns.
  const ok = verifyPassword(password, user ? user.passwordHash : DUMMY_HASH) && Boolean(user)
  if (!ok) {
    noteFailure(email)
    console.log(`[${req.client}] 401 login ${email} – fel uppgifter`)
    return res.status(401).json({ error: 'Fel e-post eller lösenord' }) // samma svar oavsett vilket
  }
  failures.delete(email)
  setRefreshCookie(res, issueRefreshToken(user))
  console.log(`[${req.client}] login ${email}`)
  res.json({ accessToken: issueAccessToken(user), expiresIn: ACCESS_TTL_SECONDS, name: user.name })
})

// Ny access token mot refresh-cookien. Rotation: den gamla refresh-token förbrukas, en ny sätts.
v2.post('/auth/refresh', (req, res) => {
  const token = readCookie(req, REFRESH_COOKIE)
  const entry = token && refreshTokens.get(token)
  if (!entry || entry.expires < Date.now()) {
    if (token) refreshTokens.delete(token)
    clearRefreshCookie(res)
    return res.status(401).json({ error: 'Sessionen har gått ut – logga in igen' })
  }
  refreshTokens.delete(token)
  const user = users.find((u) => u.id === entry.userId)
  setRefreshCookie(res, issueRefreshToken(user))
  res.json({ accessToken: issueAccessToken(user), expiresIn: ACCESS_TTL_SECONDS, name: user.name })
})

// Utloggning = servern glömmer refresh-token och cookien nollas. Access token dör av sig själv.
v2.post('/auth/logout', (req, res) => {
  const token = readCookie(req, REFRESH_COOKIE)
  if (token) refreshTokens.delete(token)
  clearRefreshCookie(res)
  res.status(204).end()
})

// Allt nedanför kräver inloggning. Datan väljs utifrån token – aldrig utifrån ett id i anropet.
v2.use(requireAuth)
v2.use((req, res, next) => {
  console.log(`[${req.client}] ${req.user.customerNo} ${req.method} ${req.originalUrl}`)
  next()
})

v2.get('/user', (req, res) => res.json(publicUser(req.user)))

v2.put('/user', (req, res) => {
  const { name, email, address } = req.body || {}
  if (typeof name === 'string' && name.trim()) req.user.name = name.trim().slice(0, 100)
  if (typeof email === 'string' && email.includes('@')) req.user.email = email.trim().toLowerCase().slice(0, 100)
  if (typeof address === 'string') req.user.address = address.trim().slice(0, 200)
  res.json(publicUser(req.user))
})

v2.get('/consumption', (req, res) => {
  // quick fix: dashboard felt too fast in the demo, added a delay so the spinner shows /J
  setTimeout(() => res.json(consumptionByUser[req.user.id]), 600)
})

v2.get('/invoices', (req, res) => res.json(invoicesByUser[req.user.id]))

v2.post('/move', (req, res) => {
  console.log(`[${req.client}] move ${req.user.customerNo}:`, req.body)
  res.json({ ok: true, ref: 'FLYTT-' + Math.floor(Math.random() * 90000 + 10000) })
})

app.use('/api/v2', v2)

// ============================ v1 (avvecklas) ============================
// Oförändrat sedan M4 så att appar som inte hunnit byta fortsätter fungera – men varje svar
// säger att versionen försvinner. Datum i Sunset är löftet; efter det svarar /api/… 410 Gone.
const v1 = express.Router()
v1.use((req, res, next) => {
  res.setHeader('Deprecation', 'true')
  res.setHeader('Sunset', 'Tue, 13 Oct 2026 23:59:59 GMT')
  res.setHeader('Link', '</api/v2>; rel="successor-version"')
  console.log(`[${req.client}] v1 (avvecklas) ${req.method} ${req.originalUrl}`)
  next()
})
const legacyUser = users[0]
// anyone gets in, we'll add real auth later(TM)
v1.post('/login', (req, res) => res.json({ token: 'fake-token-123', name: legacyUser.name }))
v1.get('/user', (req, res) => res.json(publicUser(legacyUser)))
v1.get('/consumption', (req, res) => setTimeout(() => res.json(consumptionByUser[1]), 600))
v1.get('/invoices', (req, res) => res.json(invoicesByUser[1]))
v1.post('/move', (req, res) => res.json({ ok: true, ref: 'FLYTT-' + Math.floor(Math.random() * 90000 + 10000) }))
v1.put('/user', (req, res) => {
  Object.assign(legacyUser, req.body)
  res.json(publicUser(legacyUser))
})
app.use('/api', v1)

// Plattformen bestämmer porten (Render sätter PORT). Lokalt: 4000.
if (require.main === module) {
  const port = process.env.PORT || 4000
  app.listen(port, () => console.log(`Kraftly API v2 on port ${port} – ${keys.size} nyckel/nycklar, v1 avvecklas 2026-10-13`))
}

module.exports = app
