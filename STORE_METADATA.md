# FreeFuelPrice UK — App Store Metadata

Launch-safe copy for App Store Connect (iOS) and Google Play Console (Android).
All copy describes ONLY the MVP features available at launch. No post-MVP features mentioned.

---

## App Identity

| Field | Value |
|-------|-------|
| App Name | FreeFuelPrice UK |
| Bundle ID (iOS) | com.freefuelpriceapp.uk |
| Package (Android) | com.freefuelpriceapp.uk |
| Version | 9.0.0 |
| Category | Navigation / Travel |
| Content Rating | 4+ (iOS) / Everyone (Android) |
| Support URL | https://api.freefuelpriceapp.com/support |
| Privacy Policy URL | https://api.freefuelpriceapp.com/privacy |
| Contact Email | support@freefuelpriceapp.com |

---

## Short Description (30 chars max — Google Play)

```
Find cheap fuel near you, fast.
```

## Subtitle (30 chars max — App Store)

```
UK Fuel Prices & Savings
```

---

## Full Description (App Store Connect — 4000 chars max)

```
FreeFuelPrice UK helps you find the cheapest fuel stations nearby so you never overpay at the pump.

Simply open the app, allow your location, and instantly see the nearest fuel stations ranked by price. Search by postcode or town to plan ahead. Save your favourite stations for quick access.

KEY FEATURES:
• Nearby Stations — See the cheapest fuel around you, sorted by price and distance
• Search by Postcode or Town — Plan before you drive
• Station Detail — Full price breakdown for petrol, diesel, and E10
• Freshness Signals — Know how recently prices were updated
• Favourites — Save your regular stations for instant access
• Map & List Views — Switch between views to find the best route

DATA YOU CAN TRUST:
Prices are sourced directly from major UK fuel brands and updated regularly. Every price shows when it was last confirmed, so you always know how fresh the data is.

PRIVACY FIRST:
FreeFuelPrice UK only uses your location to find nearby stations. We do not store or share your location data. No account required.

Compatible with iPhone and iPad. Requires iOS 13.0 or later.
```

---

## Full Description (Google Play — 4000 chars max)

```
FreeFuelPrice UK helps UK drivers find the cheapest fuel stations nearby — fast, accurate, and privacy-first.

Open the app and instantly see fuel stations near you ranked by price. Search any postcode or town. Save favourites. Trust the data because freshness timestamps show exactly when prices were last updated.

FEATURES:
• Nearby cheapest fuel, ranked by price and distance
• Search by postcode, town, or station name
• Station detail with petrol, diesel, and E10 prices
• Price freshness indicators
• Favourites for your regular stations
• Map and list view

DATA & TRUST:
Prices are sourced from major UK fuel brands and refreshed regularly. Freshness timestamps are shown throughout the app so you always know how current the data is.

PRIVACY:
Location is only used to find nearby stations. No account required. No location data stored.

Free to use. No ads at launch.
```

---

## Keywords (App Store — 100 chars max, comma-separated)

```
fuel,petrol,diesel,price,cheapest,nearby,UK,stations,savings,pump,E10,map
```

---

## Screenshots Plan

### Required Device Sizes (iOS)
- 6.9" (iPhone 16 Pro Max) — required
- 6.5" (iPhone 14 Plus) — required
- 5.5" (iPhone 8 Plus) — required
- iPad Pro 12.9" — required if supportsTablet=true

### Required Device Sizes (Android)
- Phone screenshots (min 2, max 8)
- Tablet screenshots (optional)
- Feature graphic: 1024x500px

### Screenshot Content Plan (in order)

1. **Home / Nearby** — App open, location granted, 5+ stations listed with prices ranked cheapest first. Caption: "Find the cheapest fuel near you"
2. **Station Detail** — Single station showing petrol/diesel/E10 prices, address, postcode, last updated. Caption: "Full price breakdown with freshness info"
3. **Search** — Postcode search results showing list of stations. Caption: "Search by postcode or town"
4. **Map View** — Map with station pins, cheapest highlighted. Caption: "Map view with price pins"
5. **Favourites** — Saved stations list. Caption: "Save your regular stations"

---

## App Icon Requirements

- iOS: 1024x1024 PNG, no alpha, no rounded corners (Apple adds rounding)
- Android: 512x512 PNG for store listing
- Adaptive icon: foreground 108x108dp on 72x72dp safe zone
- Asset file: `./assets/icon.png` (iOS) and `./assets/adaptive-icon.png` (Android)

---

## Privacy Labels (iOS App Store)

| Data Type | Collected | Linked to User | Tracking |
|-----------|-----------|----------------|----------|
| Location (Precise) | Yes — for nearby stations | No | No |
| Identifiers (Device ID) | Yes — for alerts only | No | No |

**Not collected:** Name, email, phone, health, financial, contacts, messages, browsing history.

---

## Data Safety (Google Play)

| Data | Collected | Shared | Required |
|------|-----------|--------|----------|
| Approximate location | Yes | No | No (optional) |
| Precise location | Yes | No | Yes (for nearby) |
| Device ID | Yes | No | No |

**Encryption:** Data is encrypted in transit. No sensitive data stored on device beyond favourites (local only).

---

## QA Checklist (Pre-Submission)

### Core Journey
- [ ] Open app cold — location permission prompt appears
- [ ] Grant location — nearby stations load within 3 seconds
- [ ] Stations sorted cheapest first by default
- [ ] Tap station — detail screen shows prices + freshness
- [ ] Search postcode (e.g. SW1A 1AA) — results load
- [ ] Save station as favourite — appears in Favourites tab
- [ ] Open Favourites — saved station visible
- [ ] Open Settings — privacy/support/contact links work
- [ ] Deny location — graceful error message, no crash
- [ ] No internet — graceful offline state, no crash

### Trust & Legal
- [ ] Privacy policy URL opens correctly
- [ ] Support URL opens correctly
- [ ] Contact email opens mail app
- [ ] App version shown correctly (9.0.0)
- [ ] No placeholder text visible anywhere in the app
- [ ] No references to future features (route intelligence, rewards, etc.)

### Performance
- [ ] Nearby load time < 3s on WiFi
- [ ] Nearby load time < 5s on 4G
- [ ] No memory leaks after 10 minutes of use
- [ ] App does not crash on background/foreground cycle

---

## Launch-Safe Copy Rules

**NEVER include in store descriptions:**
- Route planning or navigation features
- Community reporting or police-style alerts
- Rewards, points, or gamification
- Monetization or premium features
- Predictive AI or price forecasting
- Any feature not live in the current build

---

## Pending (Unblocked Once Apple Approves)

- [ ] Fill in `eas.json`: `appleId`, `ascAppId`, `appleTeamId`
- [ ] Fill in `app.json`: replace `YOUR_EAS_PROJECT_ID` with real EAS project ID
- [ ] Register app in App Store Connect
- [ ] Run `eas build --platform ios --profile production`
- [ ] Run `eas submit --platform ios`
- [ ] Upload screenshots via App Store Connect web UI

---

Last updated: Sprint 10 — QA checklist complete ✅ | Store metadata & descriptions ready ✅ | Screenshots plan defined ✅ | Privacy labels & data safety complete ✅ | Launch-safe copy rules enforced ✅ | Pending: Apple Developer approval + eas.json placeholders
