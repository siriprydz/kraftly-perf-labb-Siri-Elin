# Säkerhet – Kraftly Mina sidor

*Genomgång av OWASP Top 10 (2025 års lista) mot portalen, gjord i M6. Varje punkt: vad den betyder för oss, vad vi hittade, vad vi gjorde, och hur man kontrollerar det. Exempelifyllt facit – teamen fyller i sina egna fynd.*

## Hotbilden i en mening

Portalen är en single page-app som pratar med Kraftlys API genom en proxy. Det som är värt något är **kundens data** (förbrukning, fakturor, adress) och **kundens inloggning**. Angriparen är i första hand någon som kan få in JavaScript på sidan (XSS), någon som kan lura en inloggad kund att skicka ett anrop (CSRF), eller någon som gissar sig till en annan kunds data (åtkomstkontroll).

## Autentiseringen sedan M6

```
Browser                      nginx (vår container)              Kraftlys API v2
  │ POST /api/v2/auth/login ──▶ + X-Api-Key ─────────────────────▶ verifierar lösenord (scrypt)
  │ ◀── { accessToken (JWT, 10 min) } + Set-Cookie: kraftly_refresh (HttpOnly, Strict, Path=/api/v2/auth)
  │ GET /api/v2/invoices  Authorization: Bearer <JWT> ─────────────▶ verifierar signatur + exp, väljer data ur sub
  │ …10 min senare: 401 ─▶ POST /api/v2/auth/refresh (cookien följer med) ─▶ ny JWT, ny refresh (rotation)
  │ POST /api/v2/auth/logout ─────────────────────────────────────▶ servern glömmer refresh-token, cookien nollas
```

- **Access token i minnet** (`src/services/token.js`), aldrig i localStorage. Se `docs/decisions/tokenlagring.md`.
- **Refresh token i httpOnly-cookie** med `SameSite=Strict`, `Secure` (i molnet) och `Path=/api/v2/auth` – den skickas bara till de tre auth-endpointsen, och JavaScript kan inte läsa den.
- **Route guard är UX**, inte skydd: `router.beforeEach` skickar utloggade till `/login`. Skyddet sitter i API:t – utan giltig Bearer-token svarar varje dataendpoint 401.
- **v1 (`/api/…`) avvecklas 13/10** – API:t svarar med `Deprecation` och `Sunset`. Appen anropar bara v2.

## OWASP Top 10 – genomgång

| # | Risk | Gäller oss? | Läget före M6 | Vad vi gjorde | Kontroll |
|---|---|---|---|---|---|
| A01 | **Broken Access Control** – man kommer åt data man inte ska | Ja, kärnan | `/api/invoices` gav alla samma fakturor; fejk-login i `localStorage` | Data väljs ur token (`sub`), aldrig ur ett id i anropet. Query-strängar ignoreras. Guard i routern + 401-hantering i klienten | `mock-api/server.test.js` "token ger bara den inloggades data". `curl` utan token → 401 |
| A02 | **Security Misconfiguration** – öppna standardinställningar, headers som saknas | Ja | CORS `*`, inga säkerhetsheaders, `X-Powered-By` | CSP och övriga headers i `docker/security-headers.conf` (inkluderade i varje location). CORS bara för `ALLOWED_ORIGINS` (tom = inga CORS-headers). `server_tokens off`, `x-powered-by` av | `curl -I https://<staging>/` visar CSP, nosniff, frame DENY. Pipelinens röktest fäller om CSP saknas |
| A03 | **Software Supply Chain Failures** – beroenden och verktyg vi inte kontrollerar | Ja (npm) | 390 kB bundle med hela lodash, inga uppdateringsrutiner | `npm audit` i CI (varning, inte blockerande – se pipeline.md), `package-lock.json` committad, `npm ci` överallt. Inga skript från CDN – CSP `script-src 'self'` gör det omöjligt att av misstag lägga till ett | `npm audit --omit=dev` |
| A04 | **Cryptographic Failures** – hemligheter och känsliga data i klartext | Ja | API-nyckel i källkoden (löst i M4), lösenord i klartext i mock-API:t | Lösenord som scrypt-hash med salt (`hash-password.js`). `JWT_SECRET` ≥ 32 tecken, bara i miljön. HTTPS överallt i molnet + HSTS | `git grep -i secret src/` tom. `.env` gitignorerad |
| A05 | **Injection** – XSS är frontendens injection | Ja | Ingen `v-html` i appen (kontrollerat), men ingen CSP som skydd om det kommer | Regel: aldrig `v-html` med data från API:t. CSP `script-src 'self'` + `connect-src 'self'` gör att ett inskjutet skript varken laddas, körs inline eller kan skicka data någonstans | `git grep v-html src/` tom. Testat i hackerlabbet: payloaden blockeras av CSP |
| A06 | **Insecure Design** – fel i själva upplägget | Delvis | Fejk-login var ett designfel, inte en bugg | Token i minnet + refresh-cookie är ett medvetet val med utskrivna avvägningar (beslutsdokumentet). Kort access token (10 min) begränsar skadan av en läckt token | Beslutsdokumentet |
| A07 | **Authentication Failures** – svaga lösenord, ingen broms, sessioner som aldrig dör | Ja | Vad som helst godtogs som lösenord | Riktig verifiering, samma svar och svarstid vid fel e-post och fel lösenord, fem försök → 60 s lås, refresh-rotation, logout som servern minns | `server.test.js`: "fem fel → 429", "rotation", "logout" |
| A08 | **Software or Data Integrity Failures** – kod/uppdateringar utan integritetskontroll | Delvis | Pipelinen fanns | Imagen byggs en gång och deployas per sha (M4). `npm ci` mot låst lockfil. Inga externa skript | `version.txt` = sha |
| A09 | **Security Logging & Alerting Failures** – det syns inte när något händer | Delvis | Inga loggar alls | API:t loggar 401/429 per klient och kundnummer (aldrig lösenord eller tokens). Render visar loggarna | Render → Logs |
| A10 | **Mishandling of Exceptional Conditions** – felhantering som läcker eller öppnar | Ja | `catch` som svalde fel; `alert()` | 401 hanteras som "logga in igen", 5xx som fel med `role="alert"`. API:t svarar med generiska fel, aldrig stacktrace | `InvoicesView`-testerna |

**Utanför listan men relevant för oss:** CSRF – refresh-cookien är `SameSite=Strict` och inga dataendpoints läser cookies alls (bara Bearer), så ett anrop från en annan sajt kan varken skicka token eller cookie som gör något. Clickjacking – `frame-ancestors 'none'`.

## Headers vi sätter (nginx)

| Header | Värde | Varför |
|---|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'` | Skript, stilar och anrop bara från vår egen origin. Ingen inline-JS. Inga iframes av oss |
| `X-Content-Type-Options` | `nosniff` | Browsern får inte gissa filtyp |
| `X-Frame-Options` | `DENY` | Clickjacking, för browsers utan `frame-ancestors` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Inte hela URL:en till andra |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Vi använder inget av det |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Bara https i ett år framåt |
| `Cache-Control` på `/api/` | `no-store` | Personliga svar cachas aldrig |

Verifierat med `curl -I` mot staging 2026-10-01 (utdrag):

```
HTTP/2 200
content-security-policy: default-src 'self'; script-src 'self'; …; frame-ancestors 'none'
x-content-type-options: nosniff
x-frame-options: DENY
strict-transport-security: max-age=31536000; includeSubDomains
```

Fälla vi gick i: `add_header` ärvs **inte** från `server`-blocket till en `location` som har ett eget `add_header`. Cache-blocken tappade alla säkerhetsheaders tills vi inkluderade filen i varje location.

## Kända brister (medvetet kvar)

- Refresh-tokens ligger i API:ts minne. Startar API:t om (gratisnivån sover) får alla logga in igen. I ett riktigt API: en tabell med utgångstid.
- `style-src 'self'` fungerar för vårt bygge. Ett tredjepartsbibliotek som injicerar `<style>` skulle kräva nonce eller hash – då tar vi det, inte `'unsafe-inline'`.
- Inloggningsformuläret har fortfarande placeholder i stället för `<label>` – tas i M8.
- Ingen MFA. För ett elbolag med 40 000 kunder är det nästa steg, och det är ett skäl att gå mot en identitetsleverantör (OIDC) i stället för egen inloggning – se beslutsdokumentet.
