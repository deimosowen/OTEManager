# Nuxt 3 + Nitro (preset node-server). Node ≥ 22 — см. package.json engines.

FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build \
  && npm prune --omit=dev

# --- runtime ---
FROM node:22-bookworm-slim AS production

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /app/.output /app/.output
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/package-lock.json /app/package-lock.json
COPY --from=build /app/node_modules /app/node_modules

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
