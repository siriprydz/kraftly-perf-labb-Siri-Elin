# Skalning – Kraftly Mina sidor

*Exempelifyllt facit (M5). Siffrorna är uppmätta i teamets miljö och varierar – teamen fyller i sina egna.*

## Vad vi vet om trafiken

Kraftly har ungefär 40 000 kunder med inloggning, och portalen är ny. Det är inte mycket trafik i absoluta tal – det är däremot **ojämn** trafik: fakturan går ut den 25:e, elpriset hamnar i nyheterna kalla dagar, och då loggar många in samtidigt. Det är topparna vi ska klara, inte medelvärdet.

## Vad vi mätte

Vi körde portalens image lokalt (nginx i containern, samma image som i staging) och belastade den med `autocannon` (50 samtidiga anslutningar i 10 sekunder), på en laptop med fyra kärnor:

| Anrop | Req/s (medel) | p99-latens | Storlek |
|---|---|---|---|
| `GET /` (index.html, 0,6 kB) | ~45 000 | 12 ms | 451 000 anrop på 10 s |
| `GET /assets/index-*.js` (393 kB) | ~1 800 | 63 ms | 7 GB på 10 s – nätverkskortet är gränsen, inte nginx |
| `GET /api/user` via nginx → mock-API | ~6 900 | **5 800 ms** | Node-processen köar: genomströmningen ser bra ut, men var femtionde användare väntar sex sekunder |

Mot staging på Render (gratisnivå, en instans, 10 anslutningar i 10 sekunder): `GET /` ~180 req/s, p99 120 ms, där nästan allt är nätverksväg och Renders proxy.

**Slutsats 1:** de statiska filerna är aldrig flaskhalsen. En enda nginx-container serverar tiotusentals sidladdningar per sekund – det räcker till hela Kraftlys kundstock på en gång. Det som kostar är **API-anropen** – inte i antal per sekund utan i latens: under last köar API-processen och p99 går från millisekunder till sekunder, medan nginx ligger kvar på 12 ms och **bytes över nätet** (JS-bundlen är 142 kB gzip, hero-bilden 6,5 MB – den åtgärdas i M7).

**Slutsats 2:** fler kopior av frontenden ger nästan ingenting. Cache ger allt.

## Vad vi gjorde

1. **Cache-headers** (`nginx.conf.template`). Hashade filer under `/assets/` får `Cache-Control: public, max-age=31536000, immutable`. `index.html`, `config.js` och `version.txt` får `no-cache`. Bevis före/efter i `docs/cache.md`. En återkommande användare laddar nu 0,6 kB (index.html) i stället för 400 kB.
2. **CDN framför:** inte nu. Render lägger ingen CDN framför en webbtjänst. Skulle Norge-lanseringen ge trafik från flera länder lägger vi Cloudflare framför – headers ovan är exakt vad ett CDN behöver för att cacha rätt, så det steget kostar ett DNS-byte.
3. **Ingen horisontell skalning av frontenden.** Vi kör en instans i staging och en i prod. Vi vet vid vilken siffra det inte räcker (ovan), och den siffran ligger långt bort.
4. **Det vi inte kan skala:** API:et ägs av Kraftlys backend-team. Vi har flaggat kvällstoppen och den 25:e för dem. Förbrukningsdata uppdateras en gång per dygn – ett `stale-while-revalidate` på det anropet är nästa steg om API:et blir trögt.

## Varför inte Kubernetes

Vi provade att köra portalen i ett lokalt kluster (`k8s/kraftly.yaml`, tre repliker, rolling update). Det fungerar, och vi förstår vad det ger: självläkning, skalning på siffra, deploy utan avbrott. Men allt det får vi redan av Render för en container, och en frontend som är statiska filer bakom nginx har inget tillstånd att sprida. Priset för Kubernetes är att någon i teamet ska kunna klustret – och det är inte där Kraftlys problem ligger. Manifesten ligger kvar i repot som en dörr att öppna om portalen får en egen backend.

## När stänger man en flagga i stället för att rulla tillbaka?

Norge-stödet ligger bakom `FEATURE_NORWAY`: på i staging, av i prod. Vi genomförde en riktig rollback under Boiler Room 2 (loggen i `docs/deploy.md`) och jämförde:

| | Feature flag | Rollback |
|---|---|---|
| Tar | ~1 min (variabel + omstart) | ~2 min (workflow + omstart), plus att hitta rätt sha |
| Påverkar | en funktion | allt sedan förra versionen |
| Kräver | att funktionen är byggd bakom flaggan | att den gamla imagen finns kvar i GHCR |
| Passar när | en funktion är fel | bygget, konfigurationen eller ett beroende är fel |

**Regeln vi enats om:** går problemet att isolera till en funktion, släck flaggan. Är något fundamentalt trasigt, rulla tillbaka. Och båda är tillfälliga lägen – felet ska fixas i koden.

Nackdelen med flaggor är att de blir kvar. En flagga som varit på i alla miljöer i två månader är inte en flagga längre, den är död kod. Vi går igenom flaggorna i varje retro.
