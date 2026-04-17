# Free Fuel Price App — Launch Checklist

> Last updated: 2026-04-17 — Backend audit complete, Sprints 1-7 verified live

## Sprint 1 — Infrastructure & Backend ✅ COMPLETE

- [x] ECS production cluster running (`fuelapp-prod-cluster`) — verified Active
- [x] ECS service deployed (`fueluk-prod-service`) — Active, 1/1 tasks, task def rev29
- [x] Secrets loaded via AWS Secrets Manager (DB, API keys)
- [x] PostgreSQL RDS connected and healthy (uptime ~39h)
- [x] 3910 fuel stations upserted from UKPIA / CMA / Gov.UK data (up from 2842 at Sprint 1 baseline)
- [x] Ingestion cron running — last fuel sync completed 2026-04-16 11:00 UTC-7 (3910 upserted)
- [x] AlertJob cron firing every 15 min — verified in CloudWatch logs
- [x] `/api/v1/health` returns `{status: healthy, db: connected, version: 1.0.0}`
- [x] `/api/v1/stations/nearby` returns live station data (20 London stations verified)
- [x] `/api/v1/stations/cheapest` endpoint active (verified diesel sort, distance_miles)
- [x] `/api/v1/stations/search` endpoint active (brand + postcode search verified)
- [x] `/api/v1/prices/latest` endpoint active (count: 0 — awaiting crowdsourced prices)
- [x] `/api/v1/prices/:id/history` endpoint active
- [x] `/api/v1/alerts` CRUD endpoints active
- [x] `/api/v1/premium/status` returns correct MVP shape (is_premium: false, tier: free)
- [x] Feature flags: MVP features enabled, premium/experimental disabled
- [x] No mock data anywhere in codebase — 100% live API
- [x] Email corrected everywhere: refurb79@gmail.com

## Sprint 2 — Wire Screens to Live Production API ✅ COMPLETE

- [x] `HomeScreen.js`, `SearchScreen.js`, `StationDetailScreen.js`, `MapScreen.js`, `FavouritesScreen.js` — all wired to live API
- [x] `StationCard.js`, `useStations.js`, `useLocation.js` — all committed
- [x] Dark theme (#0D1117 / #1a1a2e) + green accent (#2ECC71) consistent across screens
- [x] All 5 fuel types supported: Petrol, Diesel, E10, Super Unleaded, Premium Diesel

## Sprint 3 — Price Alerts & Station Detail ✅ COMPLETE

- [x] Price alert modal on `StationDetailScreen` (fuel type selector + threshold input)
- [x] `createAlert()` wired to `POST /api/v1/alerts`
- [x] AlertJob cron live (15-minute cadence, verified CloudWatch)

## Sprint 4 — Alerts Screen ✅ COMPLETE

- [x] `AlertsScreen.js` committed and wired
- [x] Tab bar entry (bell icon) in `App.js`

## Sprint 5 — HomeScreen Polish ✅ COMPLETE

- [x] HomeScreen null-safe on missing prices
- [x] Pull-to-refresh stable, empty state handled

## Sprint 6 — Store Submission 🕒 IN PROGRESS

- [x] `app.json` bundleId `com.freefuelpriceapp.uk`, version 1.0.0, buildNumber 9
- [x] `eas.json` build profiles (development / preview / production) committed
- [x] STORE_METADATA.md copy finalised (descriptions, keywords, privacy labels, data safety)
- [ ] Apple Developer enrollment payment — awaiting Apple verification (up to 48h)
- [ ] App Store Connect app record — blocked on enrollment
- [ ] Google Play Console app listing — pending (Play Console not reachable from cloud browser)
- [ ] `eas init` to generate EAS project ID (CLI on local machine)
- [ ] Fill `app.json` + `eas.json` placeholders (appleId, ascAppId, appleTeamId, EAS projectId)
- [ ] `google-service-account.json` from Play Console (do NOT commit to public repo)
- [ ] `eas build --platform ios --profile production`
- [ ] `eas build --platform android --profile production`
- [ ] TestFlight beta testing
- [ ] Store screenshots (6.9"/6.5"/5.5" iPhone + iPad Pro 12.9" + Android phone/tablet)
- [x] Privacy Policy live at api.freefuelpriceapp.com/privacy (v1.0.0 launch policy deployed via fueluk-prod-api PR #1)
- [ ] App Store / Play Store submission + review

## Sprint 7 — Premium Scaffold ✅ COMPLETE (feature-flagged OFF at launch)

- [x] `PremiumScreen.js` committed and wired into `App.js`
- [x] `/api/v1/premium/status` backend endpoint returning free-tier shape
- [x] `FEATURES.monetization: false` in `src/lib/featureFlags.js`

## Sprints 8-12 — Future Features 🔒 FEATURE-FLAGGED OFF

- [ ] routeIntelligence (Sprint 8+) — disabled
- [ ] roadReports (Sprint 9+) — disabled (requires moderation tools + legal review)
- [ ] communityContributions (Sprint 9+) — disabled
- [ ] rewards (Sprint 10+) — disabled
- [ ] monetization (Sprint 11+) — disabled
- [ ] predictivePricing (Sprint 12+) — disabled

## Live Endpoints (Production) — Verified 2026-04-16

| Endpoint | Status | Notes |
|---|---|---|
| `GET /health` | ✅ Live | uptime 140k+ sec, v1.0.0 |
| `GET /api/v1/stations/nearby` | ✅ Live | 20 stations within 5-mile radius (London tested) |
| `GET /api/v1/stations/cheapest` | ✅ Live | Sort by fuel_type verified |
| `GET /api/v1/stations/search` | ✅ Live | Brand + postcode search verified |
| `GET /api/v1/prices/latest` | ✅ Live | count: 0 (awaiting crowdsource) |
| `POST /api/v1/alerts` | ✅ Live | AlertJob firing every 15 min |
| `GET /api/v1/premium/status` | ✅ Live | Returns free-tier features list |

## Key Contacts & Links

- **API Base**: https://api.freefuelpriceapp.com
- **GitHub (backend)**: https://github.com/freefuelpriceapp/fueluk-prod-api
- **GitHub (mobile)**: https://github.com/freefuelpriceapp/fueluk-mobile-app
- **AWS Cluster**: `fuelapp-prod-cluster` (us-east-1)
- **Task definition**: `fueluk-prod-api:29` (rolling-update, circuit breaker ON)
- **Contact**: refurb79@gmail.com
