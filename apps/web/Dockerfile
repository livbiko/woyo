# apps/web is standalone (its own package.json + lockfile, not part of the
# root npm workspace -- see the root package.json comment for why), so its
# build context is scoped to this directory, not the repo root.
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* vars are inlined into the client bundle at BUILD time, not
# read at runtime -- must be passed as a Kaniko --build-arg, matching the
# fix already applied on NouvellesDuPays's web Dockerfile for the same reason.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
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
