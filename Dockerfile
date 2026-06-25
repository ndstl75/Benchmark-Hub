# Stage 1: build client and server
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY client ./client
COPY server ./server
COPY shared ./shared
COPY script ./script
COPY vite.config.ts tsconfig.json ./
COPY vite-plugin-meta-images.ts ./
COPY components.json ./

ENV NODE_ENV=production
RUN npm run build

# Stage 2: runtime (Hugging Face Spaces listen on 7860)
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860

COPY package.json package-lock.json ./
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server/data ./server/data
COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh

EXPOSE 7860

CMD ["./scripts/start.sh"]
