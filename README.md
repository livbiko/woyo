# Woyo

A digital marketplace connecting Ivorians with trusted local professionals and
businesses -- electricians, doctors, restaurants, lawyers, IT consultants, and
more. Search, compare, and contact professionals near you.

> **Naming note**: this is unrelated to the "Woyo" ride-share `APP_VARIANT`
> inside `tekeche-mobile`. Same brand name, two intentionally separate
> products -- do not conflate the two.

Domain: `woyo.ci` (available, not yet registered as of this writing).

## Phase 1 scope (this repo, current state)

Built as a lean MVP walking skeleton, same pattern used for NouvellesDuPays --
ship a real, verified end-to-end product first, then layer in the larger
spec incrementally rather than generating shallow stubs for everything at
once.

**Included**: homepage (hero search, popular categories, featured
businesses, stats, testimonials), business directory search with list + map
views and filters (category, city, verified-only), full business profile
pages (gallery, hours, services, reviews, contact, map, JSON-LD structured
data), email/password + Google OAuth authentication, a "Become a Provider"
submission flow (creates a `PENDING` listing for admin review), French
(default) + English i18n, basic SEO (SSR, dynamic sitemap, robots.txt,
OpenGraph, Schema.org).

**Deferred to later phases** (not built yet): admin panel, business
dashboard (analytics, lead tracking, subscriptions/invoices), messaging,
appointment booking, payments (Stripe/Orange Money/MTN/Wave), AI features
(chatbot, recommendations, fraud detection), GraphQL API, production
Kubernetes/OCI deployment, CI/CD pipeline.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, TailwindCSS, hand-rolled shadcn-style UI primitives, Framer Motion, next-intl |
| Backend | NestJS, PostgreSQL, Prisma ORM, JWT + Passport (Google OAuth), class-validator |
| Maps | Leaflet + react-leaflet, OpenStreetMap tiles |
| Deployment (this repo) | Docker + docker-compose for local dev; production K8s/OCI deploy is a follow-on phase |

## Project structure

```
woyo/
  apps/
    api/            NestJS backend (own package.json, part of the root npm workspace)
    web/             Next.js frontend (own package.json + lockfile, standalone -- NOT
                     a workspace member, same fix applied on NouvellesDuPays after
                     hitting a lockfile-hoisting bug there)
  packages/
    shared/          Shared TypeScript DTOs/types
  docker-compose.yml Local full-stack orchestration (postgres + api + web)
```

## Local development

### Prerequisites
- Node.js 20+
- PostgreSQL 16 (local install, or use `docker-compose up postgres`)

### 1. Install dependencies

```bash
npm install                      # installs api + shared (root workspace)
cd apps/web && npm install       # web is standalone, separate install
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# Edit apps/api/.env: set DATABASE_URL, generate a real JWT_SECRET
```

### 3. Database

```bash
npm run db:migrate   # applies Prisma migrations
npm run db:seed       # loads categories, cities, and demo businesses
```

Seed data includes a demo account: `demo.reviewer@woyo.ci` / `DemoPassword123!`.
Business names/contact details in seed data are **fictional placeholders**
for local development and screenshots, not real businesses.

### 4. Run

```bash
npm run api:dev   # NestJS on :4001
npm run web:dev   # Next.js on :3000
```

### Or, full stack via Docker Compose

```bash
docker compose up --build
```

## Google OAuth (optional)

Unset `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `apps/api/.env` and the
Google login button will simply not be wired up server-side -- email/password
remains the primary path for local development.

## License

Proprietary -- all rights reserved.
