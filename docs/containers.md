# Containrar – Kraftly Mina sidor

*Exempelifyllt facit (M3). Siffrorna nedan är illustrativa – teamen mäter sina egna.*

## Så kör man
`cp .env.example .env` och `docker compose up --build` → http://localhost:8080 (API:t nås via `/api`)

## Imagen
| Version | Basimage | Storlek | Byggtid (utan cache) | Byggtid (kodändring) |
|---|---|---|---|---|
| Naiv (bara Node) | node:22 | ~1,2 GB | ~55 s | ~40 s (npm ci körs om) |
| Multi-stage | nginx:1.27-alpine | ~55 MB | ~50 s | ~6 s |

## Beslut 1 · Basimage för frontenden
Vi valde `nginx:1.27-alpine` i stället för `busybox`/`nginx:alpine-slim`. Tävlingen visade att vi kan komma ner till ~10 MB, men då förlorar vi konfigurerbar proxy, standardloggning och en server som alla i teamet (och nästa team) kan felsöka. 55 MB är under gränsen (80 MB) med god marginal. Omprövas om storlek blir en faktisk kostnad i M4/M5.

## Beslut 2 · Hur mock-API:t körs lokalt
Egen image via Compose (`mock-api/Dockerfile`). Alternativet bind mount av källkoden ger hot reload, men API:t ändras sällan och vi vill att `docker compose up` ska fungera i ett rent klon utan `npm install`. `npm ci --omit=dev` tar ändå med vue/pinia/lodash eftersom de ligger under `dependencies` – flyttas till ett eget `package.json` i `mock-api/` om det blir ett problem.

## Beslut 3 · Hur browsern når API:t
Proxy: appen anropar `/api` relativt, Vite proxar i dev/preview och nginx proxar till `http://api:4000` i containern. API-porten är inte publicerad. **Konsekvens för vecka 5:** frontenden har ingen aning om var API:t bor – det avgörs av servern (nginx-konfig/miljö), vilket är precis vad staging behöver.

## Vad som körs i CI
`docker build` i jobbet `image` – bevisar att Dockerfilen bygger i en neutral miljö. Storleken skrivs ut i loggen. Imagen pushas inte ännu (M4).

## Kända begränsningar
- `hero.png` är fortfarande 6,5 MB – tas i M7 (prestanda)
- ~~API-nyckeln ligger kvar i `api.js`~~ – borttagen och roterad i M4, se `docs/deploy.md`
- Imagen byggs för värdens arkitektur (arm64 på Apple Silicon) – `--platform linux/amd64` kan behövas vid deploy i M4
