# fueluk Mobile App — Internal QA Script (Workstream 1, Step 6)

_Last updated: 2026-04-16_

This is the pre-launch QA script for the fueluk React Native app. It covers
the six edge-case flows the master documents flag as most likely to break
trust at release:

1. Loading state
2. Empty state
3. Stale-data state
4. Permission denied
5. Offline / network failure
6. Main journey: Nearby → Detail → Search → Favourite

Each case lists: setup, steps, expected behaviour, and the defect IDs a
tester should raise if behaviour differs.

---

## Guardrails for QA

- Test on a real device (iOS + Android) AND a cold-start simulator run.
- Do NOT enable route intelligence, community reports, police-style alerts,
  rewards, or monetization — these must remain disabled in launch builds.
- Treat any crash, blank screen, infinite spinner, or silent failure as P0.
- Treat any PII appearing in logs (coords, postcode, token) as P0.

---

## Test 1 — Loading state

**Setup:** Fresh install, location permission granted, device online.
**Steps:** Cold-launch the app; observe Nearby (Home) screen for the first
3 seconds.
**Expected:**
- ActivityIndicator visible.
- `loadingText` rendered.
- No error banner.
- No empty-state copy flashed before stations arrive.
**Defect watch:** D-01 spinner flashes with empty list behind it; D-02
empty-state text renders for <500 ms before data.

## Test 2 — Empty state

**Setup:** Set `radiusKm` low (or test from a rural area) so backend returns
`{ stations: [] }`.
**Steps:** Launch → allow location → wait for load to finish.
**Expected:**
- `emptyState` block visible with actionable copy (e.g. "No stations within
  5 km. Try a wider search.").
- No error banner; `error` state must be null.
- Pull-to-refresh still works.
**Defect watch:** D-03 empty state indistinguishable from error state; D-04
no CTA to broaden search; D-05 filter-produced-empty is not differentiated
from truly-empty.

## Test 3 — Stale-data state

**Setup:** Backend `/api/v1/meta/last-updated` returns a timestamp > 24 h old.
**Steps:** Launch Home → inspect header / list footer.
**Expected:**
- Visible "Prices last updated …" label using `last_updated` from the API.
- If age > 24 h, the label is tinted warning colour and encourages refresh.
- Station cards still render; app does not block the user.
**Defect watch:** D-06 no `last_updated` surfaced anywhere in UI (current
state — OPEN); D-07 timestamp shown in UTC instead of local time.

## Test 4 — Permission denied

**Setup:** Deny location permission at the OS prompt (or revoke in Settings).
**Steps:** Launch app → observe Home behaviour.
**Expected:**
- `useLocation` falls back to `postcode: SW1A 1AA`, `coords: null`.
- Home shows a non-blocking banner: "Location off — showing default area."
- Stations for the default postcode load successfully.
- A "Turn on location" CTA deep-links to OS settings.
**Defect watch:** D-08 (CURRENT) HomeScreen `fetchStations` checks
`coords.latitude/longitude` only and sets error "Location unavailable"
instead of using the postcode fallback path — user sees an error on a
legitimate fallback; D-09 no deep-link to OS settings.

## Test 5 — Offline / network failure

**Setup:** Enable airplane mode, OR block `api.freefuelpriceapp.com` via
router, OR kill the backend.
**Steps:** Launch Home → pull-to-refresh → tap a station → run search.
**Expected:**
- Home shows the cached last-known list if available, plus a "You’re
  offline" badge.
- If no cache, show friendly error with a Retry button (no stack trace).
- Retry button actually retries (not a no-op).
- No uncaught promise rejection in logs (covered by `logger.js` crash hook).
**Defect watch:** D-10 (CURRENT) generic "Unable to load stations" is shown
for both offline and 5xx — no differentiation; D-11 no offline cache layer;
D-12 retry button only calls `fetchStations` but does not reset `error`
state on the first tap.

## Test 6 — Main journey: Nearby → Detail → Search → Favourite

**Setup:** Online, permission granted, fresh install.
**Steps:**
1. Launch → Nearby list renders.
2. Tap a station card → StationDetailScreen opens.
3. Back → open Search → type a postcode → submit.
4. From results, tap a station → tap the favourite (heart) icon.
5. Back out to Favourites tab → confirm station is listed.
6. Return to Favourites → unfavourite → confirm removal.
**Expected:**
- Every transition < 400 ms on mid-range device.
- Favourite state persists across app restart (AsyncStorage).
- Search accepts postcode with and without space ("SW1A1AA" and "SW1A 1AA").
- Analytics hooks fire (`nearby_screen_view`, `station_detail_opened`,
  `search_performed`, `favourite_saved`, `favourite_removed`) — ENABLED
  flag is off in launch build, so verify by toggling flag locally.
**Defect watch:** D-13 (CURRENT) analytics hooks exist in `src/lib/analytics.js`
but are not yet imported by Home/Search/StationDetail/Favourites; D-14
favourite persistence not verified across cold-start; D-15 search input does
not normalise postcode whitespace.

---

## Defect register (as of 2026-04-16)

| ID  | Severity | Area             | Summary                                                                 | Status |
|-----|----------|------------------|-------------------------------------------------------------------------|--------|
| D-01 | P2 | HomeScreen | Spinner may flash with empty list visible behind it                     | OPEN |
| D-02 | P3 | HomeScreen | Empty-state text may render briefly before first data arrives           | OPEN |
| D-03 | P2 | HomeScreen | Empty state visually indistinguishable from error state                 | OPEN |
| D-04 | P3 | HomeScreen | No CTA in empty state to broaden search radius                          | OPEN |
| D-05 | P3 | HomeScreen | Fuel-filter-empty is not differentiated from truly-empty                | OPEN |
| D-06 | P1 | HomeScreen | `last_updated` is not surfaced anywhere in the UI                        | FIXED (25c500b) |
| D-07 | P3 | HomeScreen | `last_updated` timestamp likely needs local-time formatting             | OPEN |
| D-08 | P1 | HomeScreen / useLocation | Permission-denied fallback sets error instead of using postcode   | FIXED (25c500b) |
| D-09 | P2 | HomeScreen | No "Open Settings" deep-link for denied permission                      | OPEN |
| D-10 | P2 | fuelApi / HomeScreen | Offline and 5xx show same generic error message                   | OPEN |
| D-11 | P2 | fuelApi | No offline cache of last-known good response                            | OPEN |
| D-12 | P3 | HomeScreen | Retry button should explicitly reset `error` before re-fetching         | OPEN |
| D-13 | P2 | screens/* | Analytics hooks not wired into the critical journey yet                  | OPEN |
| D-14 | P2 | Favourites | Favourite persistence across cold-start not verified                    | OPEN |
| D-15 | P3 | SearchScreen | Postcode whitespace/casing normalisation missing                      | OPEN |

Severity: P0 = blocks launch, P1 = fix before submission, P2 = fix before
release, P3 = polish.

---

## Sign-off

- Device matrix run (iOS 17, iOS 18, Android 13, Android 14): ____
- Defect register reviewed and triaged: ____
- All P0/P1 defects closed: ____
- QA lead sign-off (name / date): ____
