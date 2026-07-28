# Woyo

Marketing site for **Woyo** — the ride app that connects independent
drivers with passengers, privately and directly, everywhere in Cote
d'Ivoire.

> **Public positioning, per explicit direction (2026-07-28)**: Woyo is
> presented as its own fully independent brand on this site — no mention
> of any other Livbiko brand or shared fleet/backend. Brand color is red
> (`#E11D2E`), matching the actual Woyo vehicle livery.
>
> **Internal note for future devs** (not public-facing): the app is
> technically still built as a `tekeche-mobile` `APP_VARIANT`
> (`com.woyo.app`), and the current `woyo.service.js` backend implements a
> fixed-fare (200 FCFA), bearing-matched *shared* dispatch model (up to 4
> passengers/vehicle) — this site deliberately markets standard private
> point-to-point rides instead. Worth reconciling with product/backend if
> that's a lasting decision, not just a marketing simplification.

Live at **https://225woyo.com**.

## What this is (and isn't)

A static Next.js marketing site: homepage, `/ride` (passenger pitch),
`/drive` (driver recruitment pitch), `/safety`, `/about`, `/legal`. No
accounts, no backend, no database — this repo is presentation only, all
real ride/dispatch functionality lives in the actual Woyo app and its
backend, not here. App Store / Google Play links are intentionally shown
as "coming soon" rather than fake links — the app isn't published on
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
