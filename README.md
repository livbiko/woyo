# Woyo

Marketing site for **Woyo** — the shared-ride app that connects independent
drivers with passengers across Cote d'Ivoire. In Abidjan, Woyo runs on the
same driver fleet as [Tekeche](https://tekeche.com); elsewhere in the
country, Woyo offers fixed-fare shared rides (200 FCFA, bearing-matched
dispatch, up to 4 passengers per vehicle — see
`tekeche-api/src/services/woyo.service.js` for the real dispatch logic this
site describes).

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
