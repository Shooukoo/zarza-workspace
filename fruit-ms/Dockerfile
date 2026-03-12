# ─── Etapa de build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Instala pnpm
RUN npm install -g pnpm

# Copia manifiestos e instala dependencias (capa cacheable)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copia el código fuente y compila TypeScript
COPY . .
RUN pnpm run build

# ─── Etapa de producción ────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm

# Solo copia el build compilado y las dependencias de producción
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

CMD ["node", "dist/main"]
