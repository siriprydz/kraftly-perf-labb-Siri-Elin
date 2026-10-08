# Cache-headers – bevis före och efter

*Uppmätt mot staging. `curl -I` visar bara headers.*

## Före (M4)

```
$ curl -sI https://kraftly-volt-staging.onrender.com/assets/index-BqLSoxwz.js | grep -i -E "cache-control|etag"
ETag: "68d1a0c2-5fdd4"
```

Ingen `Cache-Control`. Browsern får gissa (heuristisk cache utifrån `Last-Modified`), och ett CDN skulle inte cacha alls. Varje sidladdning hämtar 393 kB JS på nytt, eller gör ett villkorligt anrop som svarar 304.

## Efter (M5)

```
$ curl -sI https://kraftly-volt-staging.onrender.com/assets/index-BqLSoxwz.js | grep -i -E "cache-control|etag"
Cache-Control: public, max-age=31536000, immutable
ETag: "68d1a0c2-5fdd4"

$ curl -sI https://kraftly-volt-staging.onrender.com/ | grep -i cache-control
Cache-Control: no-cache

$ curl -sI https://kraftly-volt-staging.onrender.com/config.js | grep -i cache-control
Cache-Control: no-cache

$ curl -sI https://kraftly-volt-staging.onrender.com/version.txt | grep -i cache-control
Cache-Control: no-cache
```

## Vad vi såg i browsern

DevTools → Network, ladda om sidan två gånger. Andra gången: `index-*.js` och `index-*.css` markerade **(memory cache)** / **(disk cache)**, 0 ms. `index.html` och `config.js` hämtas med `If-None-Match` och får **304 Not Modified**. Total överföring: 400 kB → 1,2 kB.

## Varför inte cacha index.html?

Den pekar på de hashade filnamnen. Efter en deploy heter JS-filen något nytt – en cachad `index.html` skulle peka på en fil som inte finns längre. `no-cache` betyder inte "cacha inte" utan "fråga först": browsern skickar `ETag` och får 304 om inget ändrats. Det kostar ett anrop på några hundra byte, och garanterar att ingen ser en gammal version efter en deploy.
