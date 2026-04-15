# Free Fuel Price App — Launch Checklist

> Last updated: Sprint 2 complete

## Sprint 1 — Infrastructure & Backend ✅ COMPLETE

- [x] ECS production cluster running (`fuelapp-prod-cluster`)
- [x] ECS service deployed (`fueluk-prod-service`) with forced new deployment
- [x] Secrets loaded via AWS Secrets Manager (DB, API keys)
- [x] PostgreSQL RDS connected and healthy
- [x] 2842 fuel stations upserted from UKPIA/CMA data ingestion
- [x] Ingestion cron running every 6 hours
- [x] `/api/v1/health` returns `{status: ok, db: connected}`
- [x] `/api/v1/stations/nearby` returns live station data (20 London stations verified)
- [x] `/api/v1/stations/cheapest` endpoint active
- [x] `/api/v1/stations/search` endpoint active
- [x] `/api/v1/prices/latest` endpoint active (count: 0 — awaiting crowdsourced prices)
- [x] `/api/v1/alerts` CRUD endpoints active
- [x] Feature flags: MVP features enabled, premium/experimental disabled
- [x] No mock data anywhere in codebase — 100% live API
- [x] Email corrected everywhere: refurb79@gmail.com
- [x] MAINTAINER.md created with ops runbook
- [x] STORE_METADATA.md created with App Store / Play Store copy

## Sprint 2 — Wire Screens to Live Production API ✅ COMPLETE

- [x] `HomeScreen.js` — wired to `getNearbyStations`, fuel type filter (Petrol/Diesel/E10), location hook, pull-to-refresh
- [x] `SearchScreen.js` — wired to `searchStations`, debounced live search (400ms), 5 fuel type filter, dark theme
- [x] `StationDetailScreen.js` — wired to `getPriceHistory` + `getPricesByStation`, live prices, price alerts modal
- [x] `MapScreen.js` — wired via `useStations` hook (nearby + cheapest modes), dark theme, 5 fuel types, colour-coded prices
- [x] `FavouritesScreen.js` — AsyncStorage persistence, focus listener reloads, remove with confirm alert
- [x] `StationCard.js` — dark theme, selected fuel price, distance badge, data freshness, favourite toggle
- [x] `useStations.js` hook — wraps `getNearbyStations` + `getCheapestStations` with mode switching
- [x] `useLocation.js` hook — GPS + reverse-geocode to UK postcode, graceful fallback
- [x] All screens: consistent dark theme (#0D1117 / #1a1a2e), green (#2ECC71) accent
- [x] All 5 fuel types supported: Petrol, Diesel, E10, Super Unleaded, Premium Diesel

## Sprint 3 — Price Submission & Crowdsourcing 🕒 NEXT

- [ ] Price submission modal on StationDetailScreen
- [ ] Crowdsourced price validation pipeline
- [ ] Moderation queue (flag suspicious prices)
- [ ] User submission history
- [ ] Gamification: submission count badge

## Sprint 4 — Alerts & Push Notifications 🕒 PENDING

- [ ] Expo Push Token registration on app launch
- [ ] Alert creation wired to `/api/v1/alerts`
- [ ] Alert list screen
- [ ] Backend push notification delivery via Expo SDK
- [ ] Alert threshold reached → push notification

## Sprint 5 — Premium & Monetisation 🕒 PENDING

- [ ] RevenueCat integration
- [ ] Premium status check on app launch
- [ ] Premium paywall screen
- [ ] Feature gating: unlimited radius, price history charts, export

## Sprint 6 — Store Submission 🕒 PENDING

- [ ] EAS Build: iOS production build
- [ ] EAS Build: Android production build
- [ ] App Store Connect submission
- [ ] Google Play Console submission
- [ ] TestFlight beta testing
- [ ] App Store screenshots (6.5", 5.5", iPad)
- [ ] Privacy Policy live at freefuelpriceapp.com/privacy
- [ ] App Store Review compliance check

## Live Endpoints (Production)

| Endpoint | Status |
|---|---|
| `GET /api/v1/health` | ✅ Live |
| `GET /api/v1/stations/nearby` | ✅ Live |
| `GET /api/v1/stations/cheapest` | ✅ Live |
| `GET /api/v1/stations/search` | ✅ Live |
| `GET /api/v1/prices/latest` | ✅ Live |
| `GET /api/v1/prices/:id/history` | ✅ Live |
| `POST /api/v1/prices` | ✅ Live |
| `POST /api/v1/alerts` | ✅ Live |
| `GET /api/v1/premium/status` | ✅ Live |

## Key Contacts & Links

- **API Base**: https://api.freefuelpriceapp.com
- **GitHub**: https://github.com/freefuelpriceapp/fueluk-mobile-app
- **AWS Cluster**: `fuelapp-prod-cluster` (us-east-1)
- **Contact**: refurb79@gmail.com

