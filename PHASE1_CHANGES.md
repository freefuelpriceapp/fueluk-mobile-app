# Phase 1: Trust & Fixes — Change Summary

All changes were made to files in `/fueluk-hardened/` from the base `/fueluk-audit/` copy.

---

## 1. `src/lib/theme.js` — NEW FILE

Created a central design tokens file exporting:

- `COLORS` — background, surface, card, border, text, textSecondary, accent, warning, error, and all five fuel-type colours (petrol, diesel, e10, superUnleaded, premiumDiesel).
- `FUEL_COLORS` — map from fuel type key string to colour hex value.
- `FUEL_TYPES` — array of `{ key, label, color }` objects for all five fuel types.
- `SPACING` — xs(4), sm(8), md(12), lg(16), xl(24), xxl(32).
- `FONT_SIZES` — xs(10), sm(12), md(14), lg(16), xl(20), xxl(24), hero(32).

---

## 2. `src/lib/quarantine.js` — Verified & Unchanged

`resolvePrice` was already exported as a named export (`export function resolvePrice(...)`). No structural changes needed; downstream consumers updated below.

---

## 3. `src/components/StationCard.js` — Refactored

- **Removed** local `toNum`, `PRICE_FIELD`, and `resolvePrice` function definitions.
- **Removed** local `formatFreshness` function.
- **Added** `import { resolvePrice } from '../lib/quarantine'`.
- **Added** `import { getFreshness, FRESHNESS_COLOR, formatSource } from '../lib/trust'`.
- **Added** `import { COLORS, FUEL_COLORS, SPACING, FONT_SIZES } from '../lib/theme'`.
- **Trust line**: freshness is now derived from `getFreshness(station.last_updated || station.updated_at)`, coloured dynamically via `FRESHNESS_COLOR[freshness.tier]`.
- **Source indicator**: if `station.source` is present, `formatSource(source)` is appended to the trust line (e.g. "Updated 2h ago · GOV data").
- All hardcoded hex colours replaced with `COLORS.*` / `FUEL_COLORS.*` references.

---

## 4. `src/lib/brandLeadership.js` — Refactored

- **Removed** local `toNum` helper and `priceOf` function (duplicate of `resolvePrice`).
- **Added** `import { resolvePrice } from './quarantine'`.
- All price resolution calls now use the shared `resolvePrice`.

---

## 5. `src/screens/HomeScreen.js` — Updated

- **Added** `import { EmptyState, NetworkErrorState } from '../components/TrustStates'`.
- **Added** `import { COLORS } from '../lib/theme'`.
- Replaced inline error `<View>` block with `<NetworkErrorState>` component.
- Replaced inline `ListEmptyComponent` with `<EmptyState>` component.
- **Fixed typo**: error string changed from `"We\u2019can\u2019t ..."` (incorrectly escaped, rendered as "We'can't") to `"We can't ..."` with a proper apostrophe.
- All hardcoded `#0D1117` / `#2ECC71` colour references replaced with `COLORS.*`.

---

## 6. `src/screens/SearchScreen.js` — Updated

- **Added** `import { EmptyState } from '../components/TrustStates'`.
- **Added** `import { COLORS, FUEL_COLORS } from '../lib/theme'`.
- Replaced both `ListEmptyComponent` inline views ("no results" and "start searching") with `<EmptyState>` components.
- All hardcoded colours replaced with `COLORS.*`.

---

## 7. `src/screens/MapScreen.js` — Updated (Critical Bug Fixes)

**Coordinate mismatch fix**: `useLocation` returns `{ coords: { latitude, longitude } }`, but `useStations` expects `{ lat, lng }`. Added a derived `stationsLocation` object:
```js
const stationsLocation = location?.coords
  ? { lat: location.coords.latitude, lng: location.coords.longitude }
  : null;
```

**Price display fix**: Removed `/ 100` divisions from all three `item.*_price` display expressions. Prices are already in pence-per-litre; no conversion is needed.

**Refreshing state fix**: `refreshing={false}` hardcode replaced with `refreshing={stationsLoading}` so the pull-to-refresh indicator reflects actual loading state.

**Error state**: Replaced inline error `<View>` blocks with `<NetworkErrorState>` component.

**Added** `import { NetworkErrorState } from '../components/TrustStates'` and `import { COLORS, FUEL_COLORS } from '../lib/theme'`. All hardcoded colours replaced with `COLORS.*`.

---

## 8. `src/screens/FavouritesScreen.js` — Updated (Critical Bug Fix)

**Price field mismatch fix**: Station objects stored in AsyncStorage by `HomeScreen` carry prices under `item.prices.petrol`, `item.prices.diesel`, `item.prices.e10`. The old code read `item.petrol_price_pence` and `item.diesel_price_pence` (non-existent fields), so prices never displayed.  
Fixed to read `item.prices?.petrol`, `item.prices?.diesel`, `item.prices?.e10`.

Additional fixes:
- **E10 badge** added alongside petrol and diesel badges.
- **Diesel badge colour** corrected from `#f39c12` (orange) to `FUEL_COLORS.diesel` (`#3498DB` blue).
- **Price formatting** changed from `.toFixed(2)` to `.toFixed(1)` to match the rest of the app.
- **Station name** now uses `item.name || item.brand || 'Station'` instead of brand-only.
- **SafeAreaView** wrapper added on all render paths (container, centered, emptyState).
- **Background** changed from `#0d0d1a` to `COLORS.background` (`#0D1117`).
- All hardcoded colours replaced with `COLORS.*` / `FUEL_COLORS.*`.

---

## 9. `src/screens/SettingsScreen.js` — Updated

- **Background** changed from `#0d0d1a` to `COLORS.background` (`#0D1117`).
- **`APP_VERSION`**: Replaced hardcoded `'1.0.0'` with `Constants.expoConfig?.version || '1.0.0'` (dynamic from `app.json` via `expo-constants`). Added `import Constants from 'expo-constants'`.
- **`clearAlerts`**: Removed broken `AsyncStorage.removeItem('price_alerts')` call. Since alerts are API-managed (server-side), the handler now shows a "coming soon" placeholder with a `// TODO` comment for the future `deleteAllAlerts(deviceToken)` API call.
- **Added** `import { COLORS } from '../lib/theme'`. All hardcoded colours replaced with `COLORS.*`.

---

## 10. `src/screens/AlertsScreen.js` — Updated

- Background was already correct (`#0D1117`).
- **Added** `import { COLORS } from '../lib/theme'`.
- `container.backgroundColor` changed from the hardcoded string to `COLORS.background`.

---

## 11. `src/components/PriceCard.js` — Fixed

**Price bug fix**: Removed `/ 100` from price formatting. Prices are in pence-per-litre; dividing by 100 was displaying values 100× too small (e.g. 1.4p instead of 141.9p). Changed to `pricePerLitre.toFixed(1)`.

---

## 12. `src/components/StationMarker.js` — Fixed

**Price bug fix**: Removed `/ 100` from `priceLabel` calculation for the same reason as `PriceCard.js`. Changed to `cheapestPrice.toFixed(1)`.

---

## Files Modified

| File | Type of Change |
|---|---|
| `src/lib/theme.js` | **Created** |
| `src/lib/brandLeadership.js` | Refactored (import resolvePrice) |
| `src/components/StationCard.js` | Refactored (trust.js + quarantine + theme) |
| `src/components/PriceCard.js` | Bug fix (remove /100) |
| `src/components/StationMarker.js` | Bug fix (remove /100) |
| `src/screens/HomeScreen.js` | TrustStates + theme + typo fix |
| `src/screens/SearchScreen.js` | TrustStates + theme |
| `src/screens/MapScreen.js` | Critical coord fix + price fix + TrustStates + theme |
| `src/screens/FavouritesScreen.js` | Critical price field fix + SafeAreaView + theme |
| `src/screens/SettingsScreen.js` | clearAlerts fix + dynamic version + theme |
| `src/screens/AlertsScreen.js` | Background colour via theme |

## Files NOT Modified

- `src/lib/quarantine.js` — `resolvePrice` was already a named export; no changes needed.
- `src/lib/trust.js` — consumed as-is; no changes needed.
- `src/lib/featureFlags.js` — deferred features remain disabled.
- `src/services/*` — dead code layer, not touched.
- All test files — unchanged.
