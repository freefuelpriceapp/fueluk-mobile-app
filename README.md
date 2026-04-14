# FreeFuelPrice UK — Mobile App

> Route-aware fuel price app for iOS & Android, built with React Native (Expo).

![React Native](https://img.shields.io/badge/React_Native-Expo-blue) ![Version](https://img.shields.io/badge/version-9.0.0-green) ![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey)

---

## Overview

FreeFuelPrice UK is a free mobile app that helps UK drivers find the cheapest fuel near them or along their route. It pulls live prices from major UK supermarkets and fuel brands, displayed on an interactive map.

**App Store**: `com.freefuelprice.app`
**API**: `https://api.freefuelprice.co.uk`

---

## Features (MVP)

- Find nearby fuel stations with live prices
- Filter by fuel type (petrol / diesel)
- Station detail view with price breakdown by brand
- Device registration for future push notifications
- Supports iOS and Android

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native (Expo SDK 51) |
| Navigation | React Navigation v6 |
| Maps | React Native Maps |
| API Client | Axios |
| Notifications | Expo Notifications |
| Build & Deploy | EAS Build + EAS Submit |
| State | React hooks (useState, useEffect) |

---

## Project Structure

```
fueluk-mobile-app/
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js       # Map + nearby stations
│   │   ├── StationDetailScreen.js
│   │   └── SettingsScreen.js
│   ├── services/
│   │   ├── stationService.js   # Nearby stations API calls
│   │   ├── priceService.js     # Price data API calls
│   │   └── deviceService.js    # Device registration
│   ├── components/
│   │   ├── StationMarker.js
│   │   └── PriceCard.js
│   └── utils/
│       └── api.js              # Axios base client
├── App.js                      # Root navigation
├── app.json                    # Expo config
├── eas.json                    # EAS build profiles
├── package.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- iOS Simulator (Mac) or Android Emulator
- Expo Go app on physical device

### Installation

```bash
# Clone the repository
git clone https://github.com/freefuelpriceapp/fueluk-mobile-app.git
cd fueluk-mobile-app

# Install dependencies
npm install

# Start development server
npx expo start
```

Scan the QR code with Expo Go, or press `i` for iOS Simulator / `a` for Android Emulator.

---

## Environment Configuration

The API base URL is configured in `src/utils/api.js`:

```js
// Development
const BASE_URL = 'http://localhost:3000';

// Production
const BASE_URL = 'https://api.freefuelprice.co.uk';
```

Switch to production URL before building a release.

---

## Building for Release

### iOS

```bash
# Production build
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### Android

```bash
# Production build
eas build --platform android --profile production

# Submit to Google Play
eas submit --platform android
```

---

## Key Screens

### Home Screen
- Displays map centred on user location
- Shows fuel station markers with live prices
- Filter bar for fuel type (petrol/diesel)
- Tap marker to open station detail

### Station Detail Screen
- Station name, address, brand
- Price per litre for each fuel type
- Last updated timestamp
- Distance from user

### Settings Screen
- Fuel type preference
- Search radius
- Notification preferences (post-MVP)

---

## API Integration

All API calls go through the backend at `https://api.freefuelprice.co.uk`.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/stations/nearby` | GET | Stations within radius of coordinates |
| `/prices` | GET | Current prices for a station |
| `/device/register` | POST | Register device for notifications |

See the [backend README](https://github.com/freefuelpriceapp/fueluk-prod-api) for full API reference.

---

## Feature Flags

Post-MVP features are gated behind feature flags (disabled at launch):

- `ROUTE_AWARE_PRICING` — Cheapest fuel along a route
- `PRICE_ALERTS` — Push notifications for price drops
- `FAVOURITE_STATIONS` — Save favourite stations
- `PREMIUM_SUBSCRIPTIONS` — Premium tier unlock
- `TRIP_COST_CALCULATOR` — Estimate trip fuel cost

---

## Supported Brands

Asda, BP, Co-op, Esso, JET, Morrisons, Moto, Motor Fuel Group, Rontec, Sainsbury's, SGN, Shell, Tesco.

---

## Licence

Private — All rights reserved. FreeFuelPrice UK © 2024.
