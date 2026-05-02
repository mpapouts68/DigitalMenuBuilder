# Digital Menu Builder — production image (Node + Vite client + Express API)
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Native toolchain for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build \
    && npm prune --omit=dev

ENV NODE_ENV=production

EXPOSE 5000

# Persisted SQLite lives outside the image via DATABASE_PATH (see docker-compose)
CMD ["node", "dist/index.js"]
