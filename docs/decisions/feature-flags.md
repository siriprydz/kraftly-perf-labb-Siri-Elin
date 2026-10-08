# Beslut: Norge-stödet bakom en feature flag, satt vid körtid

**Datum:** 2026-09-25 · **Beslutat av:** teamet (tech lead: Rabbiya) · **Status:** gäller

## Beslut

Norge-stödet ligger bakom flaggan `FEATURE_NORWAY`, som containern läser vid start och skriver till `config.js`. Flaggan är **på i staging och av i produktion**. Koden för Norge mergas till `main` löpande, i små PR:er, och syns bara där flaggan är på.

## Bakgrund

CTO:n vill se Norge-expansionen förberedd i portalen, men affären är inte klar och svenska kunder ska inte se något ännu. Samtidigt vill vi inte ha en långlivad branch som ska mergas om tre månader – det är precis det CI ska skydda oss från.

## Alternativ vi jämförde

| | Långlivad branch `norge` | Byggtidsflagga (`VITE_FEATURE_NORWAY`) | Körtidsflagga (`FEATURE_NORWAY` → `config.js`) |
|---|---|---|---|
| Koden i main | nej, mergas vid lansering | ja | ja |
| Slå av vid problem | omöjligt utan rollback | ny build per miljö (~3 min) | ändra en variabel, omstart (~1 min) |
| Bryter "bygg en gång"? | – | **ja** – två images för två miljöer | nej, samma image överallt |
| Kostnad | mergekonflikter i månader | två builds, två artefakter att hålla isär | ett skript i imagen och en variabel per miljö |

## Motivering

Körtidsflaggan är den enda som både håller koden i `main` och behåller principen från M4: imagen som testades i staging är exakt den som körs i produktion. Att byta läge kostar en miljövariabel, inte en release. Det gör den också till ett snabbare verktyg än rollback när en enskild funktion strular.

## Konsekvenser

- **Regeln vi enats om:** går problemet att isolera till en funktion, släck flaggan. Är något fundamentalt trasigt (bygget, konfigurationen, ett beroende), rulla tillbaka. Utskrivet i `docs/scaling.md`.
- Flaggor är tillfälliga. När Norge har lanserats tas flaggan **och** `if`-satsen bort inom två veckor, annars är det död kod. Punkt i retro-mallen.
- `config.js` är publik. Flaggor är inte hemligheter – en nyfiken användare kan se att Norge är på gång. Det är okej för den här funktionen; för något känsligt hade vi behövt ett annat sätt.
- Pipelinens röktest mot produktion kontrollerar att flaggan är **av** där. En felinställd variabel gör deployen röd.
