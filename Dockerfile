# syntax=docker/dockerfile:1.7
# ---------- base ----------
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates dumb-init \
 && rm -rf /var/lib/apt/lists/*
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    NEXT_TELEMETRY_DISABLED=1

# ---------- deps ----------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# ---------- build ----------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate \
 && npm run build

# ---------- runtime ----------
FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps  /app/node_modules        ./node_modules
COPY --from=build /app/.next               ./.next
COPY --from=build /app/prisma              ./prisma
COPY --from=build /app/package.json        ./
COPY --from=build /app/next.config.mjs     ./
COPY --from=build /app/src                 ./src
COPY --from=build /app/tsconfig.json       ./
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--", "/usr/local/bin/entrypoint.sh"]
CMD ["app"]
