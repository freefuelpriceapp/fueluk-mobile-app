# FuelUK — Component & Library Audit

**Scope:** `src/components/`, `src/lib/`, `src/hooks/`, `src/services/`, `src/api/`
**Codebase root:** `/home/user/workspace/fueluk-audit/`

---

## Summary Table

| File | Functional | Placeholder/Stub | Quality | Used Elsewhere |
|---|---|---|---|---|
| `components/BestOptionCard.js` | Yes — full logic + animation | None | Clean | Yes — HomeScreen |
| `components/BrandFilter.js` | Yes — fetches brands + renders chips | None | Clean | Yes — HomeScreen |
| `components/BrandHeader.js` | Yes — header with animated logo | None | Clean | Yes — HomeScreen |
| `components/FacilitiesPills.js` | Yes — fully presentational | None | Clean, best-in-codebase | Yes — StationDetailScreen |
| `components/PriceCard.js` | Yes — basic price display | None | Clean but thin/incomplete | **No** — not imported anywhere |
| `components/ReportPriceButton.js` | Yes — presentational button | None | Clean | Yes — StationDetailScreen |
| `components/ScanningLoader.js` | Yes — animated loading state | None | Clean, polished | Yes — HomeScreen |
| `components/StationCard.js` | Yes — full card with favourites | None | Clean but minor code-smell | Yes — HomeScreen, SearchScreen |
| `components/StationMarker.js` | Yes — map marker + callout | None | Clean | **No** — not imported anywhere |
| `components/TrustStates.js` | Yes — multiple UI state components | None | Clean, well-structured | **No** — not imported anywhere |
| `lib/trust.js` | Yes — freshness/confidence logic | None | Clean | **No** — not imported anywhere in app |
| `lib/quarantine.js` | Yes — price validation + filtering | None | Clean, best lib | Yes — BestOptionCard |
| `lib/smartDecision.js` | Yes — drive-cost economics | None | Clean, pure functions | **No** — not imported anywhere in app |
| `lib/brandLeadership.js` | Yes — brand ranking logic | None | Clean, pure functions | **No** — not imported anywhere in app |
| `lib/featureFlags.js` | Yes — flag config + helpers | None | Clean | Yes — StationDetailScreen |
| `lib/analytics.js` | Scaffolding only — all no-ops | Entirely stubbed (ENABLED=false) | Clean stub | Yes — HomeScreen, SearchScreen |
| `lib/logger.js` | Scaffolding only — local __DEV__ only | Remote sink disabled (REMOTE_ENABLED=false) | Clean stub | **No** — not imported anywhere in app |
| `hooks/useLocation.js` | Yes — full GPS + fallback logic | None | Clean | Yes — HomeScreen, MapScreen |
| `hooks/useStations.js` | Yes — fetch wrapper | Minor: param mismatch | Clean | Yes — MapScreen |
| `services/apiClient.js` | Yes — full fetch-based HTTP client | None | Clean | Yes — services/deviceService, stationService, priceService |
| `services/deviceService.js` | Yes — push token + registration | None | Clean but broken import | **No** — not called from any screen |
| `services/priceService.js` | Yes — price fetch/submit wrappers | None | Clean but broken import | **No** — not called from any screen |
| `services/stationService.js` | Yes — station fetch wrappers | None | Clean | **No** — not called from any screen |
| `api/fuelApi.js` | Yes — axios-based API layer | None | Clean | Yes — most screens, BrandFilter, useStations |

---

## Components

### `BestOptionCard.js`

**Functionality:** Full implementation. Accepts a `stations` array and `fuelType`, runs a multi-factor ranking algorithm (`pickBest`) that scores stations by price (70%) and distance (30%), awards qualifier tags ("Cheapest nearby", "Closest", "Freshest data", "Best value"), and renders the winner with entrance animation (fade + slide via `Animated`). Calls `filterRankable` from `quarantine.js` to exclude suspect prices before ranking.

**Placeholder/Stub:** None.

**Quality:** Clean and well-structured. Logic is readable and the quarantine integration is correct. One minor style issue: the closing brace of the `pickBest` function is indented inconsistently at line 32 (`    const withPrice` is indented 4 spaces while the surrounding function body uses 2). No missing error handling.

**Used by:** `HomeScreen.js` — imported and rendered at the top of the nearby station list.

---

### `BrandFilter.js`

**Functionality:** Full implementation. On mount, calls `getBrands()` from `api/fuelApi.js` and renders a horizontal scrollable row of brand chips. Supports an "All" chip to clear the filter. Per-brand accent colours are hardcoded in `BRAND_COLORS` for 8 major UK brands; unknown brands fall back to a default blue.

**Placeholder/Stub:** None.

**Quality:** Clean. Mount-safety (`mounted` flag) is correctly handled. The `BRAND_COLORS` map is a reasonable MVP hardcode — will need updating as the brand list grows. No loading error is surfaced to the user (errors are `console.warn` only), which is acceptable for a filter component.

**Used by:** `HomeScreen.js`.

---

### `BrandHeader.js`

**Functionality:** Full implementation. Renders a custom app header with a CSS-only fuel-drop logo mark (`LogoMark` sub-component built from nested `View`s), a wordmark ("FreeFuelPrice"), a dynamic subtitle, and an optional search button. Supports a `pulse` prop that drives a breathing halo animation on the logo when the app is loading data.

**Placeholder/Stub:** None. The logo mark is a pure-RN primitive approximation of a vector icon — by design, not a stub.

**Quality:** Clean. Animation lifecycle is properly cleaned up on unmount. The `LogoMark` inner component hardcodes `'#0D1117'` for the inner circle colour rather than reading from the `theme` prop — a minor theming inconsistency if the background ever changes.

**Used by:** `HomeScreen.js` (rendered twice: once in the loading state with `pulse=true`, once in the main list header).

---

### `FacilitiesPills.js`

**Functionality:** Full implementation. A pure presentational component that accepts either an array of strings or a boolean-keyed object, normalises labels via `LABEL_MAP`, deduplicates, and renders compact pill badges. Handles null/undefined input gracefully.

**Placeholder/Stub:** None.

**Quality:** Best-quality component in the codebase. Well-commented, defensive, handles multiple input shapes, correctly deduplicates. The `LABEL_MAP` provides a good set of UK-relevant facility labels (`AdBlue`, `LPG`, `EV charging`, etc.).

**Used by:** `StationDetailScreen.js`.

---

### `PriceCard.js`

**Functionality:** Full implementation for its scope. Displays a single fuel type name, price (formatted in pence per litre), last-updated date, and an optional "Cheapest Nearby" badge. Purely presentational; no logic beyond formatting.

**Placeholder/Stub:** None — but notably thin. It uses `(pricePerLitre / 100).toFixed(1)p` for formatting, which is incorrect: if `pricePerLitre` is already in pence (e.g. `141`), dividing by 100 gives `1.4p`. The rest of the codebase treats prices as pence-per-litre directly (e.g. `selectedPrice.toFixed(1)p` in `StationCard.js`). This is a **bug**.

**Quality:** Clean code but the price formatting division is a logic error inconsistent with the rest of the codebase. The component is also limited — it lacks the fuel-type colour coding, distance, and freshness signals present in `StationCard.js`.

**Used by:** **Nowhere** — not imported by any screen or component in the codebase.

---

### `ReportPriceButton.js`

**Functionality:** Full implementation. A presentational button with a flag icon, supports `compact` variant, `disabled` state, and custom `label`. Caller is responsible for all submission logic.

**Placeholder/Stub:** None.

**Quality:** Clean. Accessibility props (`accessibilityRole`, `accessibilityLabel`, `accessibilityState`) are all correctly set. The `disabled` guard inside `handlePress` is redundant given the `disabled` prop already prevents `TouchableOpacity` from firing, but it's harmless.

**Used by:** `StationDetailScreen.js` — rendered with a `console.warn` stub as the `onPress` handler (the actual price-report flow is not yet wired).

---

### `ScanningLoader.js`

**Functionality:** Full implementation. A polished loading screen with three concurrent animations (rotating dual-arc ring, pulsing fuel-drop glyph, shimmer bar) plus a cycling phase text that cross-fades between "Scanning nearby stations…", "Comparing live fuel prices…", and "Ranking the best options for you…".

**Placeholder/Stub:** None.

**Quality:** Clean and well-polished. All animations use the native driver. The `accessibilityLiveRegion="polite"` on the cycling text is a good accessibility touch. The phase cycle uses a `setInterval` + `setTimeout(220ms)` combination to sync the fade-out with the text swap — works correctly but slightly fragile (relies on `setTimeout` resolving before the next interval tick; in practice the gap is large enough).

**Used by:** `HomeScreen.js`.

---

### `StationCard.js`

**Functionality:** Full implementation. Renders a station row card with: brand label, distance badge, favourite toggle (persisted to `AsyncStorage`), station name, address, primary fuel price badge with colour coding, up to 2 secondary fuel prices, and a freshness label. Supports 5 fuel types. Correctly handles both normalised (`prices[fuelType]`) and flat (`petrol_price`) API shapes.

**Placeholder/Stub:** None.

**Quality:** Generally clean. The `AsyncStorage` read/write inside the component is functional but loads the entire favourites array on every mount — a performance concern once the favourites list grows. Also calls `JSON.parse` without a try/catch on `AsyncStorage.getItem` (the only place in the codebase that does this), which could throw on corrupted storage. Minor indentation inconsistency at line 47 (`    if (diffDays >= 7)` has extra spaces) and in `otherChip` list rendering at line 164.

**Used by:** `HomeScreen.js`, `SearchScreen.js`.

---

### `StationMarker.js`

**Functionality:** Full implementation. A `react-native-maps` `<Marker>` component with a custom price-label bubble (blue/green for cheapest), CSS-drawn arrow, and a `<Callout>` tooltip showing name, price, and "Tap for details". Handles null price gracefully with `'?'`.

**Placeholder/Stub:** None — but note the price label uses `(cheapestPrice / 100).toFixed(1)p` — same div-by-100 bug as `PriceCard.js`. If `cheapestPrice` is in pence (e.g. `141`), the label shows `1.4p` instead of `141.0p`.

**Quality:** Clean. `tracksViewChanges={false}` is correctly set for performance. The `fuelType` callout label only handles `'diesel'` and defaults everything else to `'Petrol'` — will silently label E10 and other types as "Petrol".

**Used by:** **Nowhere** — not imported by `MapScreen.js` or any other file. `MapScreen.js` renders its own inline `TouchableOpacity` station cards in a `FlatList` instead of using a map. The comment in the file ("Custom map marker for fuel stations on the MapScreen") is stale.

---

### `TrustStates.js`

**Functionality:** Full implementation. Exports five named exports:
- `LoadingState` — spinner with label
- `EmptyState` — icon + title + subtitle + optional action button
- `NetworkErrorState` — offline icon + retry button
- `PermissionDeniedBanner` — amber banner with Settings link
- `StaleDataBanner` — muted banner with last-refresh time
- `isStale` — utility function (not a component)

**Placeholder/Stub:** None.

**Quality:** Clean. All components share a single `StyleSheet` definition, which is efficient. Styles are aligned to the app's dark theme. The `isStale` function exported alongside the components is an odd mix of concerns (a pure utility mixed in with UI components), though it's not harmful.

**Used by:** **Nowhere** — not imported by any screen or component. Despite being a comprehensive set of trust UI states, it has zero consumers in the current codebase. HomeScreen and MapScreen implement their own inline loading/error states instead.

---

## Libs

### `lib/trust.js`

**Functionality:** Full implementation. Provides:
- `getFreshness(iso)` — categorises data age into tiers: `just_now`, `today`, `recent`, `stale`, `needs_caution`, `unknown` with human-readable labels.
- `formatSource(rawSource)` — normalises data-source strings to display labels.
- `buildTrustState(station, fuelType, quarantineFn)` — composes freshness + source + quarantine status into a single `{ freshness, source, quarantined, confidence, color, line }` object.
- `FRESHNESS_COLOR` — colour map keyed by freshness tier.

**Placeholder/Stub:** None.

**Quality:** Clean and well-structured. The `buildTrustState` function correctly accepts an optional `quarantineFn` callback with a fallback to `station.is_quarantined`. The recency thresholds (`TODAY_MAX: 12h`, `RECENT_MAX: 36h`, `STALE_MAX: 168h`) are reasonable for UK fuel price data.

**Used by:** **Nowhere** — not imported by any component, screen, or lib. `BestOptionCard.js` has its own `timeAgo` helper rather than using this module. `StationCard.js` has its own `formatFreshness` function. This library is complete but entirely unused.

---

### `lib/quarantine.js`

**Functionality:** Full implementation. Core price safety layer:
- `resolvePrice(station, fuelType)` — resolves price from either nested `prices` object or flat API fields.
- `evaluateStation(station, fuelType, cohortMedian)` — multi-rule quarantine check: upstream flag, missing price, out of UK range (80–250p/L), age > 7 days, deviation > 25p from cohort median.
- `filterRankable(stations, fuelType)` — two-pass filter: computes cohort median then excludes outliers.
- `isQuarantined(station, fuelType)` — convenience boolean predicate.

**Placeholder/Stub:** None.

**Quality:** Best-quality lib in the codebase. Defensive, well-commented, deterministic. The two-pass median approach correctly excludes outliers that would skew the median itself. Constants are named and documented. The `resolvePrice` function is duplicated verbatim in `StationCard.js` and `brandLeadership.js` — a DRY violation that should be centralised here.

**Used by:** `BestOptionCard.js` (`filterRankable`). Also tested directly.

---

### `lib/smartDecision.js`

**Functionality:** Full implementation. Pure economic calculator:
- `driveCostPence({ miles, mpg, pencePerLitre })` — calculates round-trip fuel cost in pence.
- `grossSavingsPence({ basePpl, altPpl, litres })` — calculates saving vs baseline.
- `worthTheDrive({ basePpl, altPpl, extraMiles, mpg, fillLitres })` — composes both into a verdict (`save` / `break_even` / `lose` / `unknown`) and human-readable summary.

**Placeholder/Stub:** None.

**Quality:** Clean, pure, well-documented. All edge cases (null inputs, negative miles, zero price) return `null` rather than `NaN`. Constants (`DEFAULT_MPG=40`, `LITRES_PER_GALLON=4.54609`, `DEFAULT_FILL_LITRES=40`) are well-chosen UK defaults. The 50p threshold for `save` vs `break_even` is somewhat arbitrary and undocumented.

**Used by:** **Nowhere** — not imported anywhere in the app. Tagged as "Phase 3" in the header comment; the feature flag `routeIntelligence` in `featureFlags.js` is `false`, consistent with this being unintegrated future work.

---

### `lib/brandLeadership.js`

**Functionality:** Full implementation. Pure brand ranking:
- `rankBrands(stations, fuelType)` — groups stations by brand, computes avg/min price per brand (skipping quarantined), sorts ascending by avg price.
- `cheapestBrand(stations, fuelType)` — returns the winner with `leadByPence` margin over runner-up.

**Placeholder/Stub:** None.

**Quality:** Clean. Correctly skips quarantined prices in average calculation but still counts them in `count`. The internal `priceOf` function duplicates the same price-resolution logic as `quarantine.js:resolvePrice` — DRY violation. Tagged as "Phase 4" in the header.

**Used by:** **Nowhere** — not imported anywhere in the app. `BrandFilter.js` does not use it (it only fetches a brand list from the API). No screen uses brand-ranking logic.

---

### `lib/featureFlags.js`

**Functionality:** Full implementation. Centrally declares all feature flags:
- MVP active: `nearbyMap`, `search`, `stationDetail`, `favourites`, `settings`
- MVP disabled: `priceAlerts` (off, noted as gated)
- Future disabled: `routeIntelligence`, `roadReports`, `communityContributions`, `rewards`, `monetization`, `predictivePricing`
- Helper functions: `isEnabled(featureName)`, `getActiveFeatures()`, `getDormantFeatures()`

**Placeholder/Stub:** The disabled flags are intentional stubs — flags exist to allow future gating without code changes.

**Quality:** Clean and appropriately structured for a launch-safety system. The `isEnabled` function emits a `console.warn` for unknown flag names rather than throwing — a deliberate safety choice. Note: `priceAlerts` has a trailing comment (`// LAUNCH-SAFE: gated OFF until Sprint 4 approval`) that is stale since the current Sprint references are up to Sprint 12+.

**Used by:** `StationDetailScreen.js` — imports `FEATURES` and gates the price-alert UI behind `FEATURES.priceAlerts`. The `isEnabled`, `getActiveFeatures`, `getDormantFeatures` helpers are **not used anywhere**.

---

### `lib/analytics.js`

**Functionality:** Scaffolding only. All functions are implemented as named exports with descriptive names, but the core `safeLog` function is gated behind `ENABLED = false`, making every call a no-op. The module provides 8 named tracking functions for the critical user journey.

**Placeholder/Stub:** Entirely stubbed at the transport layer. The comment in the file explicitly states: "Wire a real backend (e.g. Amplitude / PostHog / Firebase) AFTER launch sign-off." No data is ever sent.

**Quality:** Clean and well-designed stub. The architecture (named event functions rather than raw `track()` calls) will make future backend integration a one-line change per function, not a codebase-wide refactor. The `__DEV__` console logging will surface events in development even with `ENABLED=false`.

**Used by:** `HomeScreen.js` (`trackNearbyScreenView`, `trackRefreshInitiated`, `trackRefreshCompleted`), `SearchScreen.js` (`trackSearchPerformed`). The `track` base function and remaining named exports (`trackStationDetailOpened`, `trackFavouriteSaved`, `trackFavouriteRemoved`) are unused.

---

### `lib/logger.js`

**Functionality:** Scaffolding only. Implements a structured logger with levels (debug/info/warn/error/fatal), PII scrubbing, and global crash handlers (`installCrashHandlers` for `ErrorUtils` and `process.on('unhandledRejection')`). All remote logging is gated behind `REMOTE_ENABLED = false`. In non-`__DEV__` builds, all output is completely silent.

**Placeholder/Stub:** Remote sink is explicitly disabled scaffolding. The `sendRemote` function is an empty no-op with a comment pointing to a future Sentry/Bugsnag integration.

**Quality:** Clean and thorough. The PII scrubbing (`PII_KEYS` list) is a good practice — it redacts coordinates, postcodes, tokens, etc. before any log record could be sent remotely. The crash handler correctly chains to any previously registered global handler. Error paths in the logger itself are all silently swallowed (never throws).

**Used by:** **Nowhere** — `installCrashHandlers` is not called from `App.js` or any other file. The `logger` export is not imported by any screen, component, or service. The module exists but has zero consumers.

---

## Hooks

### `hooks/useLocation.js`

**Functionality:** Full implementation. Requests foreground location permission via `expo-location`, fetches GPS position (`Accuracy.Balanced`), reverse-geocodes to a postcode, and exposes `{ location, permissionStatus, error }`. Has three fallback layers: (1) web/Snack platform short-circuit, (2) 6-second permission timeout, (3) permission denied — all resolve to a default Central London coordinate (`SW1A 1AA`, `51.5074, -0.1278`).

**Placeholder/Stub:** None.

**Quality:** Clean. Mount-safety is handled (`isMounted` flag). The timeout clears correctly on cleanup. Reverse-geocode errors are caught and ignored gracefully. One issue: `useLocation` returns `location.coords` with `{ latitude, longitude }` but `useStations` expects `location.lat`/`location.lng` — there is a **coordinate field name mismatch** between the two hooks.

**Used by:** `HomeScreen.js`, `MapScreen.js`.

---

### `hooks/useStations.js`

**Functionality:** Full implementation. Accepts `location` and `options` (`radiusKm`, `fuelType`, `mode`), memoises a `fetchStations` callback with `useCallback`, and exposes `{ stations, loading, error, refetch }`. Supports both `'nearby'` and `'cheapest'` modes by delegating to the appropriate `fuelApi` function.

**Placeholder/Stub:** None.

**Quality:** Clean. There is a **parameter naming inconsistency**: the hook passes `location.lat`/`location.lng` to the API functions, but `useLocation.js` returns `location.coords.latitude`/`location.coords.longitude`. This means if a consumer passes the output of `useLocation` directly into `useStations`, the fetch silently never fires (the `if (!location?.lat || !location?.lng) return` guard at line 22 catches it). `MapScreen.js` uses both hooks together, so this bug is live in MapScreen.

Additionally, the `getCheapestStations` call passes `lon: location.lng` but `getNearbyStations` passes `lng: location.lng` — the parameter name (`lon` vs `lng`) differs between the two call sites within the same function.

**Used by:** `MapScreen.js`.

---

## Services

### `services/apiClient.js`

**Functionality:** Full implementation. A fetch-based HTTP client with: configurable `BASE_URL` via `EXPO_PUBLIC_API_URL` env var, 10-second `AbortController` timeout, JSON error body extraction, and named exports for all API operations (stations, prices, alerts, favourites, meta/health).

**Placeholder/Stub:** None.

**Quality:** Clean. Timeout handling is correct (clears on both success and error paths). The API provides a parallel and partially overlapping implementation to `api/fuelApi.js` — see cross-file conflicts below.

**Used by:** `services/deviceService.js`, `services/priceService.js`, `services/stationService.js`.

---

### `services/deviceService.js`

**Functionality:** Full implementation. Three functions: `getExpoPushToken` (requests notification permission, returns Expo push token), `registerDevice` (POST to `/device/register`), `onboardDevice` (orchestrates the full flow). Guards against simulator runs with `Device.isDevice`.

**Placeholder/Stub:** None functionally, but the service is never called so it has never been exercised.

**Quality:** **Broken import** — imports `apiClient` as a default import (`import apiClient from './apiClient'`) and calls `apiClient.post(...)`. However, `services/apiClient.js` has no default export — it only has named function exports. This import will resolve to `undefined` at runtime, and `apiClient.post` will throw `TypeError: apiClient.post is not a function`. The service is broken.

**Used by:** **Nowhere** — not imported or called by any screen or hook.

---

### `services/priceService.js`

**Functionality:** Full implementation in intent. Wraps `apiGetByStation`, `apiSubmit`, `apiGetLatest` from `./apiClient` and normalises response shapes via `formatPrice`.

**Placeholder/Stub:** None.

**Quality:** **Broken imports** — imports `getPricesByStation as apiGetByStation`, `submitPrice as apiSubmit`, and `getLatestPrices as apiGetLatest` from `./apiClient`. However, `services/apiClient.js` does not export any of these three functions (`getPricesByStation`, `submitPrice`, `getLatestPrices`). These functions exist in `api/fuelApi.js` — this service is importing from the wrong module. All three imported names will be `undefined`, making every function in this service throw at runtime.

**Used by:** **Nowhere** — not imported or called by any screen or hook.

---

### `services/stationService.js`

**Functionality:** Full implementation. Wraps `getNearbyStations`, `searchStations`, `getStationById`, `getCheapestStations` from `./apiClient` and normalises responses via `formatStation`.

**Placeholder/Stub:** None.

**Quality:** Clean — and the imports are correct (all four functions are exported by `services/apiClient.js`). The `formatStation` function normalises coordinates to `lat`/`lon` fields, but the rest of the app uses `lat`/`lng` (in `useStations`) or `latitude`/`longitude` (in `useLocation`) — a minor field-name inconsistency that would need resolving before consumers adopt this service.

**Used by:** **Nowhere** — not imported or called by any screen or hook. Screens bypass the service layer entirely and call `api/fuelApi.js` directly.

---

## API

### `api/fuelApi.js`

**Functionality:** Full implementation. Axios-based API client (uses `expo-constants` for base URL config). Exports: `getNearbyStations`, `getBrands`, `searchStations`, `getPriceHistory`, `getApiStatus`, `createAlert`, `getAlerts`, `deleteAlert`, `getPricesByStation`, `submitPrice`, `getLatestPrices`, `getCheapestStations`, `getPremiumStatus`, `getLastUpdated`.

**Placeholder/Stub:** None. `getPremiumStatus` is the most speculative endpoint (Sprint 7+) but is a real call, not a stub.

**Quality:** Clean. Good JSDoc comments on every function. However, this module duplicates much of what `services/apiClient.js` does — there are now two separate API clients targeting the same base URL with different HTTP libraries (`axios` here vs `fetch` in `services/apiClient.js`). This is the de-facto live API layer since all screens import from here directly, bypassing the services layer.

**Used by:** `BrandFilter.js`, `hooks/useStations.js`, `screens/HomeScreen.js`, `screens/SearchScreen.js`, `screens/StationDetailScreen.js`, `screens/AlertsScreen.js`, `screens/PremiumScreen.js`.

---

## Tests (`src/lib/__tests__/`)

### `brandLeadership.test.js`

**Coverage:** Tests `rankBrands` (empty input, ascending sort, quarantine exclusion, null-avg brands) and `cheapestBrand` (correct winner, null when no rankable brands). 6 test cases.

**Quality:** Good — uses a realistic fixture dataset. Covers quarantine-aware averaging. Tests use `require` (CommonJS) rather than `import` (ESM), which works with Jest's default transform.

---

### `quarantine.test.js`

**Coverage:** Tests `evaluateStation` (missing price, out-of-range, upstream flag, too old, cohort deviation, happy path) and `filterRankable` (outlier removal, empty/invalid input) and `isQuarantined` (predicate convenience). 8 test cases.

**Quality:** Excellent — covers all quarantine reasons individually. Uses `hoursAgo` helper for time-dependent tests, which is correct.

---

### `smartDecision.test.js`

**Coverage:** Tests `grossSavingsPence` (positive, negative, null inputs), `driveCostPence` (numeric accuracy, invalid inputs), `worthTheDrive` (save/lose/break_even/unknown verdicts). 8 test cases.

**Quality:** Good. The accuracy test for `driveCostPence` uses `toBeGreaterThan`/`toBeLessThan` rather than an exact value — appropriate for floating-point arithmetic.

**Notable gap:** No test file exists for `trust.js`, `featureFlags.js`, `analytics.js`, or `logger.js`.

---

## Cross-Cutting Issues

### 1. Duplicate API client layers (critical architectural issue)

There are **two parallel HTTP clients** that both target `https://api.freefuelpriceapp.com`:

| Layer | File | Library | Consumers |
|---|---|---|---|
| Active | `api/fuelApi.js` | axios | Screens, BrandFilter, useStations |
| Dead | `services/apiClient.js` | fetch | Only the services sub-layer |

All screens import directly from `api/fuelApi.js`. The `services/` layer wraps `services/apiClient.js` but is never called by any screen. The codebase effectively has two incompatible API layers, with only one in active use.

### 2. Services layer is entirely bypassed

`stationService.js`, `priceService.js`, and `deviceService.js` are all implemented but never imported by any screen. Two of the three have broken imports. The architecture implies a service layer but the screens skip it entirely.

### 3. Coordinate field-name inconsistency

- `useLocation` returns `location.coords.latitude/longitude`
- `useStations` expects `location.lat/lng`
- `stationService.formatStation` normalises to `lat/lon`
- `fuelApi.getNearbyStations` expects `lat/lng`
- `services/apiClient.getNearbyStations` expects `lat/lon`

This inconsistency is a live bug in `MapScreen.js`, which passes `useLocation` output directly to `useStations` — the fetch never fires because `location.lat` is undefined.

### 4. Price-per-litre formatting bug (two components)

`PriceCard.js` and `StationMarker.js` both divide the price value by 100 before displaying it (e.g. `(price / 100).toFixed(1)p`). The rest of the codebase (`StationCard.js`, `BestOptionCard.js`) treats prices as pence-per-litre integers and formats them directly (`price.toFixed(1)p`). This will display `1.4p` instead of `141.0p` in these two components.

### 5. Unused but complete implementations

Five components/libs are fully implemented but have zero imports:
- `PriceCard.js` (component)
- `StationMarker.js` (component)
- `TrustStates.js` (component)
- `lib/trust.js` (lib)
- `lib/brandLeadership.js` (lib)
- `lib/smartDecision.js` (lib)
- `lib/logger.js` (lib)

These represent significant dead code. `TrustStates.js`, `trust.js`, and `logger.js` in particular are production-quality implementations that could immediately replace the inline loading/error states currently repeated across screens.

### 6. `resolvePrice` duplication

The function that resolves a price from either `station.prices[fuelType]` or `station.petrol_price` (flat field) is independently reimplemented in at least three places: `quarantine.js`, `StationCard.js`, and `brandLeadership.js`. The canonical implementation should live in `quarantine.js` and be imported elsewhere.

### 7. No test for `trust.js`, `logger.js`, `featureFlags.js`

The three libs that handle data trust, crash logging, and feature gating — arguably the highest-risk runtime paths — have no test files.
