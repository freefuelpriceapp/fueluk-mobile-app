# Screen Audit — FreeFuelPrice UK

Audited files:
- `App.js`
- `src/screens/HomeScreen.js`
- `src/screens/StationDetailScreen.js`
- `src/screens/SearchScreen.js`
- `src/screens/MapScreen.js`
- `src/screens/FavouritesScreen.js`
- `src/screens/AlertsScreen.js`
- `src/screens/SettingsScreen.js`
- `src/screens/PremiumScreen.js`

---

## App.js

### What is implemented
- Bottom tab navigator with six tabs: Near Me (HomeStack), Map, Search, Saved (FavouritesStack), Alerts, Settings.
- HomeStack and FavouritesStack each nest a `StationDetail` screen inside a stack navigator so detail pushes work from both tabs.
- Consistent dark header theme (`#1a1a2e` background, white text, green active tab tint).
- `SafeAreaProvider` and `StatusBar` wrappers are in place.

### Placeholder / stub
- PremiumScreen is fully commented out — both the import and the tab entry are marked `DEFERRED: monetization`. The screen exists on disk but is not reachable from the app.

### Code quality
- Clean and conventional. Navigation structure is appropriate for the app scale.
- Minor: the closing brace of `App()` has an odd trailing indent, but it causes no runtime issue.

### Missing for a polished app
- No global state provider (Context, Redux, Zustand). Data fetching is siloed per screen; any cross-screen state (e.g. favourite toggled on detail → reflected on home list) requires the current workaround of focus-listeners.
- No deep-linking configuration.
- No notification handler setup at the app root (only done inside AlertsScreen).
- PremiumScreen completely removed from navigation; there is no upgrade entry point whatsoever at launch.

---

## HomeScreen.js

### What is implemented
- Fetches nearby stations via `getNearbyStations` (lat/lng) or falls back to `searchStations` (postcode) when precise location is unavailable.
- Offline detection with AsyncStorage caching (`cached_nearby_stations`). Shows cached data when offline.
- Pull-to-refresh with analytics events (`trackRefreshInitiated`, `trackRefreshCompleted`).
- Fuel-type filter (Petrol / Diesel / E10) with colour-coded active state.
- Brand filter via `BrandFilter` component.
- `BestOptionCard` header component surfacing the cheapest station.
- `ScanningLoader` shown during initial load.
- `BrandHeader` with dynamic subtitle and search shortcut button.
- Fallback banner (amber) when precise location is off, with an "Open Settings" link.
- Offline banner (red) when serving cached data.
- Empty state with fuel-type-aware copy.
- Footer showing data freshness timestamp, flagged amber when >24 hours stale.
- Navigation to `StationDetail` on station tap.

### Placeholder / stub
- Nothing is visually stubbed, but fuel-type filter changes (`selectedFuel`) are passed to `getNearbyStations` — whether the API actually filters server-side by `e10` depends on the backend; no handling if E10 results are empty when the API doesn't support that type.
- `usingFallback` path uses `searchStations(location.postcode)` which returns a flat list; it does not pass `selectedFuel` or `selectedBrand` to the search call, so filters have no effect on postcode-based results.

### Code quality
- Good. Clear separation of concerns, well-named state variables, proper `useCallback`/`useEffect` dependency arrays.
- `formatUpdated` helper is clean and defensive.
- One escaped apostrophe typo in the error string: `'We\u2019can\u2019t'` — missing a space; should be `'We can't'`.
- `keyExtractor` uses optional chaining (`item.id?.toString()`) — fine for now, but if `id` is ever undefined the list will show warnings.

### Missing for a polished app
- Radius selector (currently hard-coded to 5 km with `location.radiusKm || 5`). Users cannot change search radius.
- Brand filter does not affect the postcode/fallback path.
- E10 and other extended fuel types not in `FUEL_TYPES` array (only Petrol/Diesel/E10); SearchScreen and MapScreen expose Super Unleaded and Premium Diesel — HomeScreen does not.
- No "sort by price" toggle separate from "sort by distance" — the list is implicitly ordered by API response.
- No distance unit preference (miles vs km) — always displays km.
- No loading skeleton; only the custom `ScanningLoader` (which may not convey structural layout).

---

## StationDetailScreen.js

### What is implemented
- Parallel fetch of price history (`getPriceHistory`) and live prices (`getPricesByStation`) on mount, with pull-to-refresh.
- Per-fuel-type cards showing:
  - Coloured dot and label.
  - Live price with a "LIVE" tag if `livePrices` data is present.
  - Fallback to most recent history entry if no live price.
  - "No data" fallback.
  - Up to 5 entries of price history with date and pence/litre.
- Alert creation modal (slide-up sheet) with:
  - Fuel type selector (three buttons).
  - Decimal-pad price input.
  - Save loading state.
  - Confirmation alert on success.
  - Input validation (must be a positive number).
- Feature-flagged via `FEATURES.priceAlerts`: alert button and modal are hidden/disabled when the flag is off.
- `FacilitiesPills` component for station amenities.
- `ReportPriceButton` — disabled and shows an alert saying "coming soon" when `FEATURES.priceReports` is false.
- Station header with name, address, and brand.

### Placeholder / stub
- `ReportPriceButton` does nothing functional — price reporting is a stub behind a feature flag (`FEATURES.priceReports`). The button is rendered but disabled.
- Price history is displayed as a plain list of date/price rows — no chart or visual trend.
- No map widget or directions link on the detail page.
- No opening hours data displayed, even though `station.facilities` is accessed.

### Code quality
- Mostly good. The `Promise.all` fetch pattern is correct.
- One messy line (line 53): two statements crammed onto a single line with a compound ternary — should be separated for readability:
  ```js
  const safePrices = Array.isArray(currentPrices) ? currentPrices : Array.isArray(currentPrices?.prices) ? currentPrices.prices : [];
  setLivePrices(safePrices);
  ```
- The alert button uses `display: 'none'` via inline style to hide itself when `!FEATURES.priceAlerts` — better practice would be conditional rendering.
- `openAlertModal` starts with `if (!FEATURES.priceAlerts) return;` as a guard, but the button itself already has `display: 'none'`; the guard is redundant but harmless.
- `console.error` left in `loadData` catch block — should be removed or replaced with a user-visible error state.
- No error state is ever shown to the user if `loadData` throws; failures are silently swallowed after logging.

### Missing for a polished app
- No error UI if data loading fails (only a console.error).
- No map / "Get Directions" button.
- No opening hours.
- Price history is text-only — a sparkline or mini-chart would convey trends far better.
- Cannot add/remove favourite from this screen (no heart button).
- Alert threshold unit is ambiguous: the input placeholder says "e.g. 149.9" (pence/litre) but the label says "p/litre" — confirm whether the API expects pence or pennies-per-litre to avoid off-by-100 bugs.
- No share/copy price button.

---

## SearchScreen.js

### What is implemented
- Auto-focus text input with live debounced search (400 ms) firing on every keystroke, plus explicit submit on keyboard "search" button.
- Clear button (×) appears when input is non-empty.
- Fuel-type filter pills: Petrol, Diesel, E10, Super Unleaded, Premium Diesel — broader set than HomeScreen.
- `StationCard` used for results, consistent with HomeScreen.
- Distinct empty states: pre-search prompt vs "no results found" with query echoed in the message.
- Analytics event `trackSearchPerformed`.
- Navigation to `StationDetail` on result tap.
- `KeyboardAvoidingView` with platform-correct `behavior`.

### Placeholder / stub
- The fuel-type filter on SearchScreen selects `selectedFuel` for rendering `StationCard`, but `searchStations` is called with only the query string — the fuel type is not passed to the API call. Filtering is purely cosmetic at the display level; the result set is not filtered by fuel type server-side.

### Code quality
- Very clean. Good use of `useRef` for the debounce timer, proper cleanup in the `useEffect` return.
- `handleSearch` takes an optional `q` argument to allow both debounce and submit paths to call the same function — the `(q || query).trim()` pattern works but is slightly fragile if `q` is an empty string vs undefined; would be cleaner as two separate handlers.
- No retry button on error state — only a text message.

### Missing for a polished app
- Fuel type not passed to the search API — filtering is a visual illusion.
- No recent searches / search history.
- No postcode autocomplete or UK address suggestions.
- No radius control.
- Error state has no retry action.
- Results are not sorted by price for the selected fuel type; order is whatever the API returns.

---

## MapScreen.js

### What is implemented
- Fuel-type filter chips (5 types: Petrol, Diesel, E10, Super, Premium Diesel).
- Mode toggle: "Nearby" vs "Cheapest" with icon and underline indicator.
- Station list using custom `useStations` hook, wired to live API via `useLocation`.
- Per-station card showing: name, brand (coloured), address, distance, and price badges for petrol/diesel/E10.
- Error states for both location and station loading, each with a Retry button.
- Pull-to-refresh.
- Navigation to `StationDetail`.
- Comment header documents the sprint and intent.

### Placeholder / stub
- **The screen is named "MapScreen" but contains no map.** It renders a scrollable list, identical in structure to HomeScreen. The map (e.g. `react-native-maps`) is entirely absent.
- The `refreshControl` passes `refreshing={false}` hardcoded — the refreshing spinner never shows, even while data is reloading.
- Price values in the card are divided by 100 (`item.petrol_price / 100`), but HomeScreen normalises prices into `item.prices.petrol` during fetch. MapScreen uses `item.petrol_price` directly — these may be different field names from different API call paths, creating an inconsistency.

### Code quality
- Acceptable for a list screen, but the file is misnamed and the intent (a map) is unmet.
- Inline `renderStation` function defined in the render scope — should be extracted or wrapped in `useCallback` to avoid FlatList re-renders.
- The `navigation.navigate('StationDetail', ...)` call works only because MapScreen is in the same tab as no stack wraps it — if navigation structure changes this will break silently.
- `refreshing={false}` hardcode is a clear bug.

### Missing for a polished app
- **The actual map** — this is the most critical gap. Without `react-native-maps` (or equivalent), the "Map" tab is just a duplicate list.
- Map markers with price overlays.
- Tap marker → show station card popover.
- Current location pin.
- Zoom controls / region change triggers new fetch.
- Cluster markers at low zoom.
- Filter panel overlaid on map.

---

## FavouritesScreen.js

### What is implemented
- Loads favourites from AsyncStorage (`user_favourites`) on screen focus (via navigation listener) — ensures list refreshes when returning from StationDetail.
- Pull-to-refresh.
- Per-station card: brand name, address/postcode, petrol and diesel price badges.
- Remove favourite via heart button, with a confirmation `Alert.alert`.
- Empty state with icon and descriptive hint.
- Loading spinner.
- Navigation to `StationDetail` on card tap.

### Placeholder / stub
- Price badges use `item.petrol_price_pence` and `item.diesel_price_pence` — these field names differ from what HomeScreen stores in AsyncStorage (`item.prices.petrol`, `item.prices.diesel` after normalisation) and from what MapScreen reads (`item.petrol_price`). Prices will likely never render on the badges because the field names won't match the cached data shape.
- No live price refresh — prices shown are whatever was stored when the user last viewed the station (potentially stale).
- Diesel badge colour is incorrectly labelled `dieselBadge` but uses `#f39c12` (orange/E10 colour) rather than the blue (`#3498DB`) used everywhere else for diesel.

### Code quality
- Reasonable structure, but the field name inconsistency is a functional bug.
- `container` background is `#0d0d1a`, while most screens use `#0D1117` — a minor inconsistency in the design system.
- Price display uses `.toFixed(2)` (two decimal places), while other screens use `.toFixed(1)` — inconsistent formatting.
- The `stationName` text defaults to `item.brand || 'Station'` — does not use `item.name`, so stations without a brand will show generic "Station" text even if a name exists.
- No `SafeAreaView` wrapper — the root `View` may clip on notched devices.

### Missing for a polished app
- Live price refresh when viewing favourites (prices are static snapshots).
- Ability to add favourites from this screen or HomeScreen (currently only possible from StationDetail if a heart button exists there — but StationDetail has no favourite button either).
- Sort/filter favourites by price or distance.
- E10, Super, Premium Diesel price badges (only Petrol and Diesel shown).
- Price staleness indicator per station.

---

## AlertsScreen.js

### What is implemented
- Requests Expo push notification permission on mount and obtains device push token.
- Fetches active alerts from the API using the device token (`getAlerts(deviceToken)`).
- Per-alert card: fuel type badge (coloured), station name/address, threshold price.
- Delete alert with confirmation dialog, optimistic removal from list.
- Pull-to-refresh.
- Empty state (no alerts set) with instructional copy.
- No-token state with a message explaining notifications must be enabled.
- Error state with retry button.
- Header copy inside ListHeaderComponent.

### Placeholder / stub
- Nothing is visually stubbed, but the screen's utility depends entirely on the `priceAlerts` feature flag in StationDetailScreen. If that flag is off (the current state inferred from `FEATURES.priceAlerts`), no alerts can ever be created, making this screen always empty.
- The "no token" message has no button to open system notification settings — the user is told to enable notifications but given no way to do so from the screen.

### Code quality
- Clean and well-structured for the most part.
- `fetchAlerts` is gated on `deviceToken` being truthy — a good guard, but there is no UI feedback while waiting for the token to resolve (the loader hides immediately when `!deviceToken && !loading`, showing the "notifications not enabled" state even during the brief async window before the token arrives).
- `FUEL_LABELS` only defines Petrol/Diesel/E10, but alerts could theoretically be for Super or Premium Diesel. The `|| item.fuel_type` fallback in `renderAlert` handles it, but the badge colour would fall back to `#888`.
- `console.log` used for non-error conditions (permission not granted, token unavailable) — should be removed or conditional on `__DEV__`.
- Alert card uses `#161B22` and `#21262D` colour tokens which differ from the rest of the app (GitHub-dark-ish palette vs the app's `#0D1117`/`#1a1a2e`) — inconsistent design system usage.

### Missing for a polished app
- Button to open notification settings when permission is denied.
- "Add alert" button or shortcut to station search (currently alerts can only be created via StationDetail).
- Alert status (e.g. "triggered", "active", "expired") — all alerts look the same regardless of state.
- No indication of current fuel price vs alert threshold (how far away from triggering).
- Edit threshold (currently delete and re-create is the only option).

---

## SettingsScreen.js

### What is implemented
- Reusable `SettingsRow` component with icon, label, sublabel, optional chevron, and danger styling.
- `SectionHeader` component.
- Four sections: Support, Privacy & Legal, Data, About.
- Help & Support → opens `SUPPORT_URL` in browser.
- Contact Us → opens `mailto:` link.
- Privacy Policy → opens `PRIVACY_URL` in browser.
- Location Data → informational row (no action, no chevron).
- Clear Favourites → `AsyncStorage.removeItem('user_favourites')` with confirmation.
- Clear All Alerts → `AsyncStorage.removeItem('price_alerts')` with confirmation.
- App Version, Data Source, Price Freshness — all informational.
- Copyright footer.

### Placeholder / stub
- "Clear All Alerts" removes the key `price_alerts` from AsyncStorage. However, AlertsScreen stores and fetches alerts via the API (using `getAlerts`/`deleteAlert`), not from AsyncStorage. This clear action will have no effect on the actual alerts list — it clears a non-existent or unused key.
- Location Data row has a no-op `onPress={() => {}}` — it looks interactive (has a chevron by default from `showChevron=true`) but `showChevron={false}` is passed, so no chevron shows. The row still fires `onPress` which does nothing.
- No functional toggles (notification preferences, default fuel type, radius, units) — the screen is entirely static info and destructive actions.

### Code quality
- The cleanest screen in the codebase. Well-factored with small sub-components.
- `openURL` correctly checks `Linking.canOpenURL` before opening.
- `APP_VERSION` is a hardcoded string `'1.0.0'` — should be pulled from `expo-constants` (`Constants.expoConfig.version`) to stay in sync with `app.json`.
- `clearAlerts` clears the wrong AsyncStorage key (see above) — a functional bug.
- Background is `#0d0d1a`, not `#0D1117` — minor colour inconsistency.

### Missing for a polished app
- Default fuel type preference (currently `petrol` is hardcoded in HomeScreen/SearchScreen).
- Distance unit toggle (km vs miles).
- Search radius setting.
- Notification preferences (enable/disable alert types).
- "Rate the app" row (App Store / Play Store link).
- "What's New" / changelog row.
- Account/login section (if personalisation is planned).
- Version info should be dynamic from `expo-constants`.

---

## PremiumScreen.js

### What is implemented
- Fetches premium status from `getPremiumStatus` API.
- Displays tier badge (FREE or PREMIUM) with colour coding.
- Lists features array from API response, displayed as a checklist.
- "Upgrade" box rendered when not on premium tier.
- Loading and error states.

### Placeholder / stub
- The entire screen is a stub. The upgrade button is `disabled` and labelled "Coming Soon" — no payment flow, no IAP integration, no subscription management.
- The screen is commented out of `App.js` entirely — it is unreachable from within the app (`DEFERRED: monetization`).
- Feature list is purely API-driven strings (e.g. `"price_alerts"` rendered as `"price alerts"` via `replace(/_/g, ' ')`) — no icons, no descriptions, no visual hierarchy.
- No comparison of free vs premium tiers.

### Code quality
- The screen uses a **light theme** (`backgroundColor: '#F5F5F5'`, dark text on light background) while every other screen uses a dark theme. This is a jarring inconsistency and confirms it was not updated to match the app design system.
- `String.fromCharCode(10003)` is used to render a checkmark (`✓`) — should use an Ionicons icon or a Unicode literal (`✓`) for clarity.
- Accent colour is `#E8562A` (orange-red) — inconsistent with the app's green (`#2ECC71`) accent used everywhere else.
- No `SafeAreaView`.
- Error state renders no retry button.

### Missing for a polished app
- In-app purchase / subscription integration (RevenueCat, Expo IAP, etc.).
- Free vs Premium feature comparison table.
- Consistent dark theme matching the rest of the app.
- Trial offer or introductory pricing UI.
- Restore purchases button.
- Entry point from within the app (currently zero navigation path leads here).

---

## Cross-Cutting Issues

### Design system inconsistencies
| Issue | Details |
|---|---|
| Background colours | `#0D1117` (Home, Alerts, Map), `#0d0d1a` (Favourites, Settings), `#F5F5F5` (Premium) — three different backgrounds |
| Diesel badge colour | Favourites uses orange (`#f39c12`) for diesel; every other screen uses blue (`#3498DB`) |
| Price formatting | `.toFixed(2)` in Favourites vs `.toFixed(1)` in Map and Alerts |
| Fuel type sets | HomeScreen: 3 types; SearchScreen/MapScreen: 5 types; StationDetail: 3 types |
| Accent colour | Green `#2ECC71` everywhere except PremiumScreen which uses orange-red `#E8562A` |

### Data shape inconsistencies
| Screen | Price field name |
|---|---|
| HomeScreen (after normalisation) | `item.prices.petrol`, `item.prices.diesel`, `item.prices.e10` |
| MapScreen | `item.petrol_price`, `item.diesel_price`, `item.e10_price` (divided by 100) |
| FavouritesScreen | `item.petrol_price_pence`, `item.diesel_price_pence` (divided by 100) |

Favourites prices will never display because the field names stored by HomeScreen do not match those read by FavouritesScreen.

### Feature flag gaps
- `FEATURES.priceAlerts` is referenced in StationDetailScreen to gate alert creation. If this flag is `false`, AlertsScreen will always be empty and the alert bell tab serves no purpose.
- `FEATURES.priceReports` gates price reporting — the button renders but is permanently disabled and shows a "coming soon" alert.
- The feature flag module (`../lib/featureFlags`) is not audited here, but its state directly controls the utility of two entire tabs.

### Missing app-wide concerns
- No global error boundary.
- No cross-screen state management — favourite toggled in StationDetail is not reflected on HomeScreen list without a full re-fetch on focus.
- No accessibility labels (`accessibilityLabel`, `accessibilityRole`) on any interactive elements.
- No `testID` props — automated testing is not possible.
- No loading skeleton screens — only spinners, which give no layout preview.
- Push notification handler not registered at the app root (only inside AlertsScreen).
- Deep linking not configured.
- PremiumScreen completely unreachable.
