# Multi-stage build -- Kaniko build context is the repo root (same convention
# as the nouvellesdupays/tekeche projects), hence the apps/api/... paths below.
# NOTE: npm workspaces hoist all deps to the root node_modules -- apps/api's
# own node_modules is empty (confirmed locally), so only the root copy is
# needed in the runtime stage. Node's module resolution walks up parent
# directories to find it from /app/apps/api.
FROM node:20-alpine AS build
WORKDIR /app
# Prisma's query/schema engine binaries need libssl -- Alpine's node image
# doesn't ship it, and without it `prisma migrate deploy` fails at runtime
# with "Could not parse schema engine response" (a real crash, not just the
# accompanying warning -- `prisma generate` alone tolerates its absence).
RUN apk add --no-cache openssl
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --workspace=apps/api --workspace=packages/shared --include-workspace-root
COPY apps/api apps/api
COPY packages/shared packages/shared
RUN npm run prisma:generate --workspace=apps/api
RUN npm run build --workspace=apps/api

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
# prisma-dist is seed.ts pre-compiled to plain JS at build time (see
# package.json's build:seed script) -- ts-node in the runtime image proved
# unreliable (needs tsconfig.json, which isn't copied here, and ended up
# falling through to Node's native loader with "Unknown file extension
# .ts"). Running compiled JS with plain `node` sidesteps that entirely.
COPY --from=build /app/apps/api/prisma-dist ./apps/api/prisma-dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
WORKDIR /app/apps/api
EXPOSE 4001
CMD ["node", "dist/main.js"]
