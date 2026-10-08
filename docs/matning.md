# Fynd

## Nätverksfliken

- Vilken fil tar längst tid: hero image
- Vilket API-anrop tar längst tid? Content download, för att det är stort (waiting for server responce är välsgt liten i jämförelse)

## Bundle-analysen

- Bilbliotek som väger mycket men används lite: Lodash och chart.js
- Lodash används bara på Dashboarden och för bannern i lokal och staging. Vi kan alltså inportera dessa separat istället för hela biblioteket.
- Chart.js använder bara stapeldiagram. Vi behöver alltså egentligen inte importera hela biblioteket med cirkeldiagram etc.

## Cad hoppar- och vad väntar?

- Vad dyker upp först när API:t har svarat? Namnet på anvöndaren syns först.
- Vad trycker ner innehållet under sig och varför vet browsern inte hur stort det ska bli? Bilden trycker ner innehållet för att den inte har en fast bredd och höjd. Korten med priser och förbrukning ändrar också storlek i bredd, eftersom de inte har en fast bredd. Diagrammet trycker ner kortet nedanför när det laddas in, också pga. att det saknar fast bredd och höjd.
- När kommer LCP-elementet jämfört med API-anropet? 50ms efter det kritiska API-anropet (auth/refresh) börjar hero-bilden laddas in, men är inte färsigladdad förrän 6,6 sekunder senare.
