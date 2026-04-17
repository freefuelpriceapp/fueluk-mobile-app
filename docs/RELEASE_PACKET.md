# Release Packet — FreeFuelPrice UK v9.0.0

> Step 12 — Everything needed to move from verified account to submitted app.
> Goal: shorten the final submission path once Apple/Google verification clears.

---

## 1. Metadata Pack

### Status: READY

All store copy lives in `STORE_METADATA.md` (repo root). Verified contents:

| Item | Location | Status |
|------|----------|--------|
| App name | `FreeFuelPrice UK` | Ready |
| Bundle / Package | `com.freefuelpriceapp.uk` | Ready |
| Version | `9.0.0` (build 9) | Ready |
| Category | Navigation / Travel | Ready |
| Content rating | 4+ (iOS) / Everyone (Android) | Ready |
| Short description (Google Play) | 31 chars | Ready |
| Subtitle (App Store) | 24 chars | Ready |
| Full description (iOS) | Under 4000 chars | Ready |
| Full description (Android) | Under 4000 chars | Ready |
| Keywords (iOS) | 100 chars | Ready |
| Promotional text (iOS) | 143 chars | Ready |
| Privacy labels (iOS) | Location + Device ID only | Ready |
| Data safety (Google Play) | Location + Device ID only | Ready |
| App Store review notes | Included with test steps | Ready |
| Google Play review notes | Included | Ready |

### Placeholders Still Needed (blocked on enrollment)

- `app.json` → replace `YOUR_EAS_PROJECT_ID` with real EAS project ID
- `eas.json` → fill `appleId`, `ascAppId`, `appleTeamId`
- `google-service-account.json` → download from Play Console (do NOT commit)

---

## 2. Screenshot Plan

### Status: READY

Full plan lives in `docs/ICON_AND_SCREENSHOT_PLAN.md`.

| # | Screen | App.js name | Caption headline |
|---|--------|-------------|------------------|
| 1 | Home / Nearby | HomeMain | Find the cheapest fuel near you |
| 2 | Station Detail | StationDetail | Full price breakdown at a glance |
| 3 | Map View | MapMain | See every station on the map |
| 4 | Search Results | SearchMain | Search by postcode or town |
| 5 | Favourites | FavouritesMain | Your regular stations, one tap away |
| 6 | Settings | SettingsMain | Privacy-first, transparent data |

### Device matrix

| Platform | Size | Required |
|----------|------|----------|
| iOS | 6.7" (iPhone 15 Pro Max / 16 Pro Max) | Yes |
| iOS | 6.5" (iPhone 14 Plus) | Yes |
| iOS | 5.5" (iPhone 8 Plus) | Yes |
| iOS | iPad Pro 12.9" | Yes (supportsTablet: true) |
| Android | Phone | Yes (min 2, max 8) |
| Android | Feature graphic 1024x500 | Yes |

### Icon assets

| Asset | File | Size |
|-------|------|------|
| iOS icon | `assets/icon.png` | 1024x1024 px |
| Android store | generated from adaptive | 512x512 px |
| Android adaptive | `assets/adaptive-icon.png` | 108x108 dp |
| Splash | `assets/splash.png` | 1284x2778 px |

### Exclusions (per DEFERRED_FEATURES.md)

- No Premium screen shots
- No Alerts screen shots (priceAlerts gated OFF)
- No route intelligence, rewards, or monetization imagery

---

## 3. Privacy / Support / Contact URL Checks

### Status: LIVE — verified 2026-04-17

| URL | Status | Notes |
|-----|--------|-------|
| https://api.freefuelpriceapp.com/privacy | LIVE | Privacy Policy page, dated April 2026 |
| https://api.freefuelpriceapp.com/support | LIVE | Support page with FAQs and contact email |
| support@freefuelpriceapp.com | Listed | Contact email on support page and STORE_METADATA |

### Issues Found

| Issue | Severity | Detail |
|-------|----------|--------|
| Support page version mismatch | Low | Shows "Current version: 1.0.0" — should be 9.0.0 |

---

## 4. Release Notes

### Status: READY

Release notes for v9.0.0 are finalised in `STORE_METADATA.md`.

**iOS release notes** — covers nearby stations, search, favourites, map, freshness, privacy.

**Android release notes** — covers same features, adds "no account required, no location data stored."

Both sets are launch-safe: no deferred features mentioned, no premium references.

---

## 5. Internal Testing Notes & Known Limitations

### Build & Deployment

- Backend: ECS production cluster `fuelapp-prod-cluster` (us-east-1), task def rev29, 1/1 tasks running
- API: `https://api.freefuelpriceapp.com` — health endpoint returns v9.0.0, db connected
- Data: 3910 fuel stations from UKPIA/CMA/Gov.UK, ingestion cron running (last sync 2026-04-16)
- Alert cron: firing every 15 min (CloudWatch verified)

### Sprints 1-7: All COMPLETE

Per `LAUNCH_CHECKLIST.md`, Sprints 1-7 are verified complete. Sprint 7 (Premium scaffold) is feature-flagged OFF.

### Feature Flags (src/lib/featureFlags.js)

| Flag | Value | Note |
|------|-------|------|
| MVP features | enabled | All launch screens live |
| priceAlerts | false | Gated OFF — backend push infra not confirmed |
| routeIntelligence | false | Sprint 8+ |
| roadReports | false | Sprint 9+ |
| communityContributions | false | Sprint 9+ |
| rewards | false | Sprint 10+ |
| monetization | false | Sprint 11+ |
| predictivePricing | false | Sprint 12+ |

### Navigation (App.js v9.0.0)

- 5 active tabs: Home, Search, Map, Favourites, Settings
- Premium tab: commented out in JSX (import + Tab.Screen wrapped in comment)
- Alerts tab: present in code but gated by priceAlerts flag

### Known Limitations

| # | Limitation | Impact | Mitigation |
|---|-----------|--------|------------|
| 1 | Apple Developer enrollment pending | Cannot create App Store Connect record or build for iOS | Wait for Apple verification (up to 48h) |
| 2 | EAS project ID placeholder | Cannot run `eas build` | Run `eas init` on local machine once enrolled |
| 3 | Google Play Console not set up | Cannot create Android listing | Requires Play Console access on local machine |
| 4 | No crowdsourced prices yet | `/api/v1/prices/latest` returns count: 0 | Gov.UK data covers all stations; crowdsource is additive |
| 5 | Price alerts gated OFF | Users cannot set alerts at launch | Controlled by feature flag; can enable post-launch |
| 6 | Support page shows version 1.0.0 | Minor inconsistency | Backend update needed |
| 7 | TestFlight / internal testing not yet run | No real-device QA on production build | Blocked on item 1 and 2 |

### Pre-Submission Checklist (to run once enrollment clears)

- [ ] `eas init` — generate EAS project ID
- [ ] Update `app.json` with real project ID
- [ ] Update `eas.json` with appleId, ascAppId, appleTeamId
- [ ] `eas build --platform ios --profile production`
- [ ] `eas build --platform android --profile production`
- [ ] Upload to TestFlight, run smoke test on real device
- [ ] Create App Store Connect record, upload metadata + screenshots
- [ ] Create Google Play Console listing, upload metadata + screenshots + feature graphic
- [ ] Submit for review (both platforms)

---

## 6. Document Cross-Reference

| Document | What it provides to this packet |
|----------|---------------------------------|
| `STORE_METADATA.md` | All store copy, descriptions, keywords, privacy labels, review notes, release notes |
| `docs/ICON_AND_SCREENSHOT_PLAN.md` | Icon brief, shot-list, caption plan, device matrix, asset folder structure |
| `docs/DEFERRED_FEATURES.md` | Exclusion list — what must NOT appear in any submission material |
| `LAUNCH_CHECKLIST.md` | Sprint completion status, endpoint verification, blocking items |
| `docs/QA_SCRIPT.md` | QA test cases for pre-submission verification |
| `app.json` | Bundle ID, version, build number, splash/icon paths |
| `eas.json` | EAS build profiles (dev/preview/production) |
| `src/lib/featureFlags.js` | Runtime feature gates confirming what is ON/OFF |

---

*Last updated: Step 12 — April 2026*
