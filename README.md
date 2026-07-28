# Woyo

Marketing site for **Woyo** — the ride app that connects independent
drivers with passengers across Cote d'Ivoire. In Abidjan, Woyo runs on the
same driver fleet as [Tekeche](https://tekeche.com); elsewhere in the
country, Woyo matches riders with a nearby independent driver for a
private, direct ride.

> **Note**: the current `tekeche-api/src/services/woyo.service.js` backend
> actually implements a fixed-fare (200 FCFA), bearing-matched *shared*
> dispatch model (up to 4 passengers/vehicle) — this site deliberately
> markets the "elsewhere" experience as standard private point-to-point
> rides instead, per explicit direction (2026-07-28). Worth reconciling
> with product/backend if that's a lasting decision, not just a marketing
> simplification.

> **Naming note**: this is the marketing site for the *existing* Woyo
> mobile app (a `tekeche-mobile` `APP_VARIANT`, `com.woyo.app`) — not a
> separate product. Brand colors (`#1B1440` indigo / `#F4A825` gold) match
> that app exactly.

Live at **https://225woyo.com**.

## What this is (and isn't)

A static Next.js marketing site: homepage, `/ride` (passenger pitch),
`/drive` (driver recruitment pitch), `/safety`, `/about`, `/legal`. No
accounts, no backend, no database — all real product functionality (ride
requests, driver dispatch, payments) lives in `tekeche-api` /
`tekeche-mobile`, not here. App Store / Google Play links are intentionally
shown as "coming soon" rather than fake links — the app isn't published on
either store yet.

## Tech stack

Next.js 15 (App Router), TypeScript, TailwindCSS, Framer Motion, next-intl
(French default + English). Standalone project — see `apps/web/`.

## Local development

```bash
cd apps/web
npm install
npm run dev
```

## Deployment

Docker + Kubernetes (OKE), reusing the shared `ingress-nginx` controller
and cert-manager already running in this OCI tenancy. Dedicated NLB
(`woyo-nlb`) — see `ops/MAINTENANCE_LOG.md` for the full deployment history
and the real bugs found/fixed along the way. `infra/k8s/` has the manifests;
`infra/k8s/ci/kaniko-build-web.yaml` builds the image in-cluster via Kaniko.

## License

Proprietary — all rights reserved.
