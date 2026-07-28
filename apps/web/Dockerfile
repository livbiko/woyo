# apps/web is standalone (its own package.json + lockfile, not part of the
# root npm workspace), so its build context is scoped to this directory,
# not the repo root -- see infra/k8s/ci/kaniko-build-web.yaml's
# --context-sub-path. Static marketing site, no backend/API involved.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
