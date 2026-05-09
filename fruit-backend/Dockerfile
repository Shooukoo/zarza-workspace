FROM node:22-alpine AS builder

WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

# Copy workspace manifests (cacheable layer)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/database/package.json ./packages/database/package.json
COPY fruit-backend/package.json ./fruit-backend/package.json

RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/database ./packages/database
COPY fruit-backend ./fruit-backend

# Generate Prisma client + build shared package
RUN pnpm --filter @rubus/database run build

# Build fruit-backend TypeScript
RUN pnpm --filter ./fruit-backend run build

# ── Production runner ──────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@10.26.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY packages/database/package.json ./packages/database/package.json
COPY fruit-backend/package.json ./fruit-backend/package.json

RUN pnpm install --prod --frozen-lockfile

# Copy compiled assets
COPY --from=builder /repo/packages/database/dist  ./packages/database/dist
COPY --from=builder /repo/packages/database/generated ./packages/database/generated
COPY --from=builder /repo/fruit-backend/dist ./fruit-backend/dist

WORKDIR /repo/fruit-backend

EXPOSE 3000

USER node

CMD ["node", "dist/main"]
