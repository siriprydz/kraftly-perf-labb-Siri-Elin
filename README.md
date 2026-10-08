# Kraftly – Mina sidor

[![CI](https://github.com/<org>/<repo>/actions/workflows/ci.yml/badge.svg)](https://github.com/<org>/<repo>/actions/workflows/ci.yml)

Kundportal för Kraftly (elbolag). Ursprungligen levererad av Webbmakarna AB 2026-06-30, förvaltas av teamet sedan augusti 2026.

## Kom igång

Alla sätt kräver en `.env` med lokala värden. Den committas aldrig:

    cp .env.example .env

### Med Docker (rekommenderat)

    docker compose up --build

Frontend på http://localhost:8080. API:t nås bara via frontendens `/api` – det har ingen egen port. Stoppa med `docker compose down`.

### Utan Docker

    npm install
    npm run api      # mock-API på port 4000 – läser API_KEY från .env (egen terminal)
    npm run dev      # Vite dev-server på http://localhost:5173

## Prestandajakten (labbrepo, vecka 8)

Det här repot är Kraftly efter M6: riktig inloggning, skyddat API, CSP. Men det är **långsamt**, och er uppgift är att mäta, hitta varför och göra det snabbare. Instruktionerna står i övningen i Canvas. Kortversionen:

    cp .env.example .env
    npm install
    npm run api                          # terminal 1: mock-API:t på :4000
    npm run build && npm run preview     # terminal 2: PRODUKTIONSBYGGET på http://localhost:4173

**Mät alltid produktionsbygget (`build` + `preview`), aldrig `npm run dev`.** Dev-servern skickar hundratals små okomprimerade filer och säger ingenting om hur appen beter sig hos en kund.

Logga in med `anna.andersson@example.com` / `kraftly-anna`. Efter varje ändring: `npm run build` igen (preview-servern kan ligga kvar) och mät om.

## Staging

Varje merge till `main` deployas automatiskt till staging: https://kraftly-volt-staging.onrender.com (sover efter 15 min – första anropet tar en minut). Vilken commit som körs: `/version.txt`. Hur det fungerar, var hemligheterna bor och hur man gör rollback: `docs/deploy.md`.

## Inloggning

Riktig autentisering sedan M6: e-post + lösenord mot Kraftlys API v2, access token i minnet, refresh token i en httpOnly-cookie. Testkonton lokalt: `anna.andersson@example.com` / `kraftly-anna` och `bo.bergstrom@example.com` / `kraftly-bo`. Hur det hänger ihop och OWASP-genomgången: `docs/security.md`. Varför token inte ligger i localStorage: `docs/decisions/tokenlagring.md`.

## Kvalitet

    npm run test:run   # enhets- och komponenttester (Vitest)
    npm run test:api   # API-tester mot mock-API:t (node:test)
    npm run e2e:pw     # E2E-smoke (Playwright) – kräver npx playwright install chromium
    npm run build      # produktionsbygge till dist/

Pipeline och beslut: se `docs/pipeline.md`, `docs/containers.md`, `docs/deploy.md`, `docs/decisions/`.
