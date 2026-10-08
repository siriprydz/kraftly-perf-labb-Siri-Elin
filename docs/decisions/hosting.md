# Beslut: var staging körs

**Datum:** 2026-09-18 · **Beslutat av:** teamet (tech lead: Rabbiya) · **Status:** gäller

## Beslut

Vi kör portalen som en container på **Render** (webbtjänst från en färdig image i GitHub Container Registry). Pipelinen bygger imagen en gång och ber Render köra exakt den sha:n via en deploy hook.

## Bakgrund

Portalen finns sedan M3 som en image som kör likadant överallt. Nu behöver den en adress på internet, och en release ska ske automatiskt vid merge till main. Kraven: ingen kostnad för teamet, inget betalkort, deploy av en färdig container (inte en ny build hos leverantören), hemligheter i plattformen och inte i repot, och att det vi lär oss går att ta med till en annan leverantör.

## Alternativ vi jämförde

| | Render | Azure Container Apps | Google Cloud Run | Vercel / Netlify |
|---|---|---|---|---|
| Kör vår image som den är | ja | ja | ja | nej – bygger statiska filer, ingen nginx |
| Kostnad för oss | gratisnivå | Azure for Students-kredit | gratiskvot | gratisnivå |
| Kräver betalkort | nej | nej med skolkonto, annars ja | ja (faktureringskonto) | nej |
| Nyckeln stannar på servern | ja, i nginx | ja | ja | kräver serverless-funktion |
| Kallstart | ~1 min efter 15 min utan trafik | kan skala till noll | kan skala till noll | ingen för statiska filer |
| Uppsättning för teamet | ett konto, två formulär | resursgrupp, miljö, registry-åtkomst | projekt, fakturering, IAM | ett konto |

AWS App Runner var med i kursens ursprungliga plan men tar inte emot nya kunder sedan våren 2026.

## Motivering

Render kör vår image utan ändringar och kräver varken kort eller molnkonto per person. Det viktigaste för oss är att **allt vi bygger är portabelt**: imagen, nginx-mallen och miljövariablerna fungerar likadant på Azure Container Apps eller Cloud Run. Det enda som är Render-specifikt är deploy hooken – en rad `curl` i pipelinen. Byter vi leverantör byts den raden, inget annat.

## Konsekvenser

- Staging sover efter 15 minuter utan trafik – första anropet tar runt en minut. Vi tål det i staging, men det är ett argument att ompröva inför produktion (M5).
- Render-kontot ägs av en person. Vi dokumenterar i `docs/deploy.md` vem, och flyttar kontot vid tech lead-byte.
- Vi är beroende av GHCR för imagen och av att paketet är publikt. Byter vi till privat paket måste Render få en läsnyckel (PAT med `read:packages`).
