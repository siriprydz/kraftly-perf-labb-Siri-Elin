# Steg 1: bygg appen med Node
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Steg 2: servera de statiska filerna med nginx – bara det här blir imagen
FROM nginx:1.27-alpine
# En mall i stället för en färdig config: nginx fyller i PORT, API_URL och API_KEY
# från miljön när containern startar. Samma image kan köras lokalt, i staging och i prod.
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
# Säkerhetsheaders (CSP m.fl.) som mallen inkluderar i varje location
COPY docker/security-headers.conf /etc/nginx/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Skriver config.js från APP_ENV när containern startar (övning 2 B)
COPY --chmod=755 docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
# Vilken commit är det här? Pipelinen skickar in sha:n. Går att läsa på /version.txt
ARG GIT_SHA=lokal
RUN echo "$GIT_SHA" > /usr/share/nginx/html/version.txt
# Render sätter PORT själv. Lokalt och i compose gäller 80.
ENV PORT=80
EXPOSE 80
