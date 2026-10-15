# syntax=docker/dockerfile:1

# ---- dependencias de producción ----
FROM node:24-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

# ---- pruebas (docker compose --profile test run --rm backend-test) ----
FROM node:24-alpine AS test
WORKDIR /app
ENV NODE_ENV=test
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
CMD ["sh", "-c", "npm run lint && npm test"]

# ---- imagen final (target por defecto) ----
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/server.js"]
