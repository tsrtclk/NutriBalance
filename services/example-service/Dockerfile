# Multi-stage build for example-service
FROM node:24-alpine AS builder
WORKDIR /repo
COPY package*.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY services/example-service/package.json ./services/example-service/
RUN npm ci

COPY services/example-service ./services/example-service
WORKDIR /repo/services/example-service
RUN npx prisma generate --schema=../../packages/prisma-client/prisma/schema.prisma || true
RUN npm run build

# --- Runtime ---
FROM node:24-alpine AS runner
RUN apk add --no-cache dumb-init tini && \
    addgroup -S koydas && adduser -S koydas -G koydas
WORKDIR /app

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/services/example-service/dist ./dist
COPY --from=builder /repo/services/example-service/package.json ./
COPY --from=builder /repo/packages/prisma-client/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=3000
USER koydas
EXPOSE 3000

# Resolve @koydas/* TS path aliases at runtime (tsc does not rewrite them).
COPY infra/docker/runtime-tsconfig.json ./tsconfig.json

ENTRYPOINT ["tini", "--"]
CMD ["sh", "-c", "exec node -r tsconfig-paths/register \"$(find dist -name main.js | head -1)\""]
