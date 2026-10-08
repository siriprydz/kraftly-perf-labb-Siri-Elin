# Mock-API:t: bara Node + express, ingen build
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY mock-api ./mock-api
EXPOSE 4000
CMD ["node", "mock-api/server.js"]
