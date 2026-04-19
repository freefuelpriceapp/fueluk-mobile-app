# Phase Requirements Summary

_Derived from `docs/PHASES_1_TO_4_NOTES.md` and supporting QA/launch docs._

---

## Phase 1 — Trust & Quarantine

**New libs/components:**
- `src/lib/trust.js` — freshness tiers, source label formatting, `buildTrustState()`
- `src/lib/quarantine.js` — cohort-median outlier filter, `filterRankable()`, `evaluateStation()`
- `src/components/FacilitiesPills.js` — pure-presentational facility pill row (returns `null` when empty)
- `src/components/BestOptionCard.js` — ranking now routed through `filterRankable()`

**Integration work (Phase 1b):**
- In `StationCard.js`: import `buildTrustState` + `isQuarantined`; render a one-line trust row (source label + freshness tier colour dot + "Needs caution" when `trustState.confidence === 'low'`).
- Render `<FacilitiesPills facilities={station.facilities} />` below the trust row.

**Tests needed:**
- `trust.getFreshness`: null / NaN date / ≤12h / 36h / 7d / >7d buckets
- `quarantine.filterRankable`: empty, all-null prices, one outlier beyond `MAX_DEVIATION_P`, stale timestamp

---

## Phase 2 — Station Detail Depth

**New components:**
- `src/components/ReportPriceButton.js` — "Report price" CTA (callback-only, purely presentational)

**Integration work:**
- On `StationDetailScreen`, add `<ReportPriceButton onPress={...} />` near the price block.
- Wire `onPress` to a lightweight submit (Supabase insert or existing analytics event).

---

## Phase 3 — Smart Decisions

**New libs:**
- `src/lib/smartDecision.js` — `worthTheDrive()`, `driveCostPence()`, `grossSavingsPence()`

**Integration work:**
- In `StationDetailScreen` (or a "Compare" modal), call `worthTheDrive({ basePpl, altPpl, extraMiles, mpg, fillLitres })` using nearest station as `base` and selected station as `alt`.
- Surface `result.summary` next to the price.
- Gate behind a feature flag until copy is signed off.

**Tests needed:**
- `smartDecision.worthTheDrive`: save / break_even / lose / unknown outcomes

---

## Phase 4 — Brand Leadership

**New libs:**
- `src/lib/brandLeadership.js` — `rankBrands()`, `cheapestBrand()`

**Integration work:**
- In `BrandHeader`, call `cheapestBrand(stations, fuelType)` on the current nearby set.
- Show "Cheapest brand nearby: {brand}" when `leadByPence >= 1`.
- `rankBrands()` feeds a future "Brand league" screen.

**Tests needed:**
- `brandLeadership.cheapestBrand`: tie-break by count, all-quarantined returns null

---

## Cross-cutting non-goals (all phases)

- No changes to existing screen behaviour until integration pass is complete.
- No new API calls, no new env vars, no schema changes.
- No app-store-facing copy or assets on this branch.
- All new lib modules must be pure — no I/O, no React, no side effects, null-safe.

---

---

# UI Hardening Notes

_Drawn from `docs/QA_SCRIPT.md`, `docs/DEFERRED_FEATURES.md`, `LAUNCH_CHECKLIST.md`, and `docs/RUNBOOK.md`._

---

## Open defects requiring UI fixes (QA_SCRIPT.md)

| ID  | Sev | Area | Issue | Fix needed |
|-----|-----|------|-------|------------|
| D-01 | P2 | HomeScreen | Spinner flashes with empty list visible behind it | Guard list render behind loading state |
| D-02 | P3 | HomeScreen | Empty-state text renders briefly before first data | Delay empty-state until load completes |
| D-03 | P2 | HomeScreen | Empty state visually indistinguishable from error state | Distinct empty vs error UI |
| D-04 | P3 | HomeScreen | No CTA in empty state to broaden search radius | Add "Try wider search" action |
| D-05 | P3 | HomeScreen | Fuel-filter-empty not differentiated from truly-empty | Show filter-empty message when a filter is active |
| D-07 | P3 | HomeScreen | `last_updated` timestamp shown in UTC not local time | Format to device local time |
| D-09 | P2 | HomeScreen | No "Open Settings" deep-link when location permission denied | Add `Linking.openSettings()` CTA |
| D-10 | P2 | fuelApi / HomeScreen | Offline and 5xx show same generic error message | Differentiate network-offline vs server-error strings |
| D-11 | P2 | fuelApi | No offline cache of last-known good response | Add AsyncStorage/cache layer; show cached list + "offline" badge |
| D-12 | P3 | HomeScreen | Retry button does not reset `error` state before re-fetching | Reset error to null on retry tap |
| D-13 | P2 | screens/* | Analytics hooks exist but are not imported by Home/Search/StationDetail/Favourites | Wire `src/lib/analytics.js` into all critical-journey screens |
| D-14 | P2 | Favourites | Favourite persistence across cold-start not verified | Verify AsyncStorage read on mount |
| D-15 | P3 | SearchScreen | Postcode whitespace/casing not normalised | Strip spaces + uppercase before API call |

**Already fixed (D-06, D-08):** `last_updated` surfaced in UI and permission-denied fallback using postcode path — both landed in commit `25c500b`.

---

## Deferred features — must stay disabled (DEFERRED_FEATURES.md)

All flags live in `src/lib/featureFlags.js` set to `false`. UI hardening must not accidentally enable any:

| Flag | Feature |
|------|---------|
| `routeIntelligence` | Route Intelligence (Sprint 8+) |
| `roadReports` | Road Reports / police-style alerts (Sprint 9+) |
| `communityContributions` | Community Contributions (Sprint 9+) |
| `rewards` | Rewards / Gamification (Sprint 10+) |
| `monetization` | Affiliate offers, promoted stations (Sprint 11+) |
| `predictivePricing` | AI price forecasting (Sprint 12+) |
| `priceAlerts` | Price Alerts (gated OFF — push infra not confirmed) |

**Navigation guardrails:**
- Premium tab commented out in `App.js`.
- `PremiumScreen.js` retained as disabled scaffolding; unreachable from any nav path.
- `getPremiumStatus()` exists in `fuelApi.js` but must not be called at launch.

---

## Launch checklist blockers relevant to UI (LAUNCH_CHECKLIST.md)

- Store submission (Sprint 6) is in progress; Apple Developer enrollment and Play Console listing are blocked — not a UI code issue but screenshots and metadata must be ready.
- App Store screenshots required: 6.9" / 6.5" / 5.5" iPhone + iPad Pro 12.9" + Android phone/tablet.

---

## Key architectural constraints (RUNBOOK.md)

- **Feature flags are compile-time** — changing `featureFlags.js` requires a full rebuild. No remote config server exists.
- **No PII in logs** — coordinates, postcode, and tokens must never appear in console output; treat as P0 if found.
- Any crash, blank screen, infinite spinner, or silent failure is P0.
- Test on real device (iOS + Android) AND cold-start simulator before any release build.
