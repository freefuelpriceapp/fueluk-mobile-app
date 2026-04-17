# FreeFuelPrice UK — Mobile App

> UK fuel price app for iOS & Android, built with React Native (Expo).

![React Native](https://img.shields.io/badge/React_Native-Expo-blue) ![Version](https://img.shields.io/badge/version-9.0.0-green) ![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey)

---

## Overview

FreeFuelPrice UK helps UK drivers find the cheapest fuel stations near them using live data from UKPIA, CMA, and Gov.UK sources. Fuel-first, privacy-first, no account required.

- **Bundle ID (iOS)**: `com.freefuelpriceapp.uk`
- **Package (Android)**: `com.freefuelpriceapp.uk`
- **API**: `https://api.freefuelpriceapp.com`
- **Version**: 9.0.0

---

## Quick Start (One-Command)

```bash
git clone https://github.com/freefuelpriceapp/fueluk-mobile-app.git
cd fueluk-mobile-app
cp .env.example .env
npm install
npx expo start
```

For the full setup, local/ECS differences, and troubleshooting, see **[`docs/RUNBOOK.md`](./docs/RUNBOOK.md)**.

---

## Features (MVP — Live at Launch)

- Nearby cheapest fuel stations, ranked by price and distance
- Search by postcode or town
- Station detail with petrol, diesel, E10, super unleaded, premium diesel
- Price freshness indicators
- Favourites (local device storage)
- Map and list views
- Settings with privacy, support, and contact links

All post-MVP features (route intelligence, road reports, community contributions, rewards, monetization, predictive pricing) are feature-flagged **OFF** at launch. See [`docs/DEFERRED_FEATURES.md`](./docs/DEFERRED_FEATURES.md).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native (Expo SDK 50) |
| Navigation | React Navigation v6 (bottom tabs + native stack) |
| Maps | React Native Maps |
| HTTP | Native fetch via `src/services/apiClient.js` |
| Location | expo-location |
| Build & Deploy | EAS Build + EAS Submit |
| State | React hooks + custom hooks (`useStations`, `useLocation`) |

---

## Project Structure

```
fueluk-mobile-app/
├── src/
│   ├── api/            # High-level API helpers
│   ├── components/     # StationCard, shared UI
│   ├── hooks/          # useStations, useLocation
│   ├── lib/            # featureFlags, logger
│   ├── screens/        # Home, Search, Map, Favourites, Settings, etc.
│   └── services/       # apiClient, stationService, priceService, deviceService
├── docs/
│   ├── DEFERRED_FEATURES.md
│   ├── ICON_AND_SCREENSHOT_PLAN.md
│   ├── QA_SCRIPT.md
│   ├── RELEASE_PACKET.md
│   └── RUNBOOK.md
├── App.js
├── app.json
├── eas.json
├── package.json
├── .env.example
├── LAUNCH_CHECKLIST.md
├── STORE_METADATA.md
└── README.md
```

Full tree in [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) §5.

---

## Environment Variables

The app reads `EXPO_PUBLIC_API_URL` at build time (with a production fallback hardcoded in `src/services/apiClient.js`).

See [`.env.example`](./.env.example) for the template.

---

## Building for Release

### iOS
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### Android
```bash
eas build --platform android --profile production
eas submit --platform android
```

Placeholders in `eas.json` (appleId, ascAppId, appleTeamId) and `app.json` (EAS project ID) must be filled first — see [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) §8.

---

## Master Documents

| Document | Purpose |
|----------|---------|
| [`LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) | Sprint status, endpoint verification, blocking items |
| [`STORE_METADATA.md`](./STORE_METADATA.md) | Store copy, privacy labels, review notes, release notes |
| [`docs/DEFERRED_FEATURES.md`](./docs/DEFERRED_FEATURES.md) | Features that must remain disabled at launch |
| [`docs/RELEASE_PACKET.md`](./docs/RELEASE_PACKET.md) | Full submission readiness packet |
| [`docs/RUNBOOK.md`](./docs/RUNBOOK.md) | Setup, local dev, ECS differences, troubleshooting |
| [`docs/QA_SCRIPT.md`](./docs/QA_SCRIPT.md) | Pre-submission test cases |
| [`docs/ICON_AND_SCREENSHOT_PLAN.md`](./docs/ICON_AND_SCREENSHOT_PLAN.md) | Visual asset plan |

---

## Supported Fuel Types

Petrol, Diesel, E10, Super Unleaded, Premium Diesel.

## Supported UK Brands

Asda, BP, Co-op, Esso, JET, Morrisons, Moto, Motor Fuel Group, Rontec, Sainsbury's, SGN, Shell, Tesco.

---

## Licence

Private — All rights reserved. FreeFuelPrice UK © 2026.
