# syntax=docker/dockerfile:1

# ---- pruebas (docker compose --profile test run --rm frontend-test) ----
FROM node:24-alpine AS test
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
CMD ["sh", "-c", "npm run lint && npm test"]

# ---- compilación ----
FROM test AS build
RUN npm run build

# ---- imagen final (target por defecto) ----
FROM nginx:stable-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
