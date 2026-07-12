# Multi-stage build for workout-service
FROM node:24-alpine AS builder
WORKDIR /repo
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY services/workout-service/package.json ./services/workout-service/
RUN npm ci

COPY services/workout-service ./services/workout-service
WORKDIR /repo/services/workout-service
RUN npx prisma generate --schema=../../packages/prisma-client/prisma/schema.prisma || true
RUN npm run build

# --- Runtime ---
FROM node:24-alpine AS runner
RUN apk add --no-cache dumb-init tini && \
    addgroup -S platform && adduser -S platform -G platform
WORKDIR /app

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/services/workout-service/dist ./dist
COPY --from=builder /repo/services/workout-service/package.json ./
COPY --from=builder /repo/packages/prisma-client/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3000
USER platform
EXPOSE 3000

# Resolve @platform/* TS path aliases at runtime (tsc does not rewrite them).
COPY infra/docker/runtime-tsconfig.json ./tsconfig.json

ENTRYPOINT ["tini", "--"]
CMD ["sh", "-c", "exec node -r tsconfig-paths/register \"$(find dist -name main.js | head -1)\""]
