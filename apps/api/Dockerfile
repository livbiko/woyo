# Multi-stage build -- Kaniko build context is the repo root (same convention
# as the nouvellesdupays/tekeche projects), hence the apps/api/... paths below.
# NOTE: npm workspaces hoist all deps to the root node_modules -- apps/api's
# own node_modules is empty (confirmed locally), so only the root copy is
# needed in the runtime stage. Node's module resolution walks up parent
# directories to find it from /app/apps/api.
FROM node:20-alpine AS build
WORKDIR /app
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
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
WORKDIR /app/apps/api
EXPOSE 4001
CMD ["node", "dist/main.js"]
