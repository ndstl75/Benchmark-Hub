# Stage 1: build client and server
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY client ./client
COPY server ./server
COPY shared ./shared
COPY script ./script
COPY vite.config.ts tsconfig.json drizzle.config.ts ./
COPY vite-plugin-meta-images.ts ./
COPY components.json ./

ENV NODE_ENV=production
RUN npm run build

# Stage 2: runtime
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8447

COPY package.json package-lock.json ./
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server/data ./server/data
COPY --from=builder /app/drizzle.config.ts ./

EXPOSE 8447

# Create tables on first run, then start server (seed runs inside app)
CMD ["sh", "-c", "node ./node_modules/drizzle-kit/bin.cjs push --config=drizzle.config.ts || true; node dist/index.cjs"]
