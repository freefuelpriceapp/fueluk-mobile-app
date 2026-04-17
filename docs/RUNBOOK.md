# Runbook — FreeFuelPrice UK Mobile App

> Step 13 — Setup, local development, and deployment reference.
> Goal: any future coding session starts cleanly without guessing.

---

## 1. One-Command Local Start

```bash
git clone https://github.com/freefuelpriceapp/fueluk-mobile-app.git
cd fueluk-mobile-app
cp .env.example .env          # edit if you need a local backend
npm install
npx expo start
```

Then press `i` (iOS Simulator), `a` (Android Emulator), or scan the QR with Expo Go.

---

## 2. Prerequisites

| Tool | Version | Install |
|------|---------|----------|
| Node.js | 20+ | https://nodejs.org |
| npm | 10+ | Ships with Node |
| Expo CLI | latest | `npm install -g expo-cli` |
| EAS CLI | 7.8+ | `npm install -g eas-cli` |
| Watchman (macOS) | latest | `brew install watchman` |
| Xcode (iOS builds) | 15+ | Mac App Store |
| Android Studio (Android builds) | latest | https://developer.android.com/studio |

---

## 3. Environment Variables

See `.env.example` in the repo root.

| Variable | Used by | Default | Notes |
|----------|---------|---------|-------|
| `EXPO_PUBLIC_API_URL` | Mobile app | `https://api.freefuelpriceapp.com` | Fallback hardcoded in `src/services/apiClient.js` |

Expo injects `EXPO_PUBLIC_*` variables at build time via `process.env`.

To point at a local backend:
```bash
EXPO_PUBLIC_API_URL=http://localhost:3000
```

---

## 4. NPM Scripts

| Script | Command | What it does |
|--------|---------|-------------|
| `npm start` | `expo start` | Dev server with QR code |
| `npm run android` | `expo start --android` | Dev server targeting Android |
| `npm run ios` | `expo start --ios` | Dev server targeting iOS Simulator |
| `npm run build:android` | `eas build --platform android` | Production Android build via EAS |
| `npm run build:ios` | `eas build --platform ios` | Production iOS build via EAS |

---

## 5. Project Structure (Actual)

```
fueluk-mobile-app/
├── src/
│   ├── api/
│   │   └── fuelApi.js            # High-level API helpers (getNearby, getLastUpdated)
│   ├── components/
│   │   └── StationCard.js        # Station list item with freshness badge
│   ├── hooks/
│   │   ├── useStations.js        # Nearby station data hook
│   │   └── useLocation.js        # Device location hook
│   ├── lib/
│   │   ├── featureFlags.js       # Central feature gate config
│   │   └── logger.js             # Structured logging
│   ├── screens/
│   │   ├── HomeScreen.js         # Nearby stations list (main tab)
│   │   ├── StationDetailScreen.js
│   │   ├── SearchScreen.js
│   │   ├── MapScreen.js
│   │   ├── FavouritesScreen.js
│   │   ├── SettingsScreen.js
│   │   ├── AlertsScreen.js       # Gated by priceAlerts flag
│   │   └── PremiumScreen.js      # Disabled scaffold (commented out in App.js)
│   └── services/
│       ├── apiClient.js          # Centralised fetch with timeout + error handling
│       ├── stationService.js
│       ├── priceService.js
│       └── deviceService.js
├── docs/
│   ├── DEFERRED_FEATURES.md
│   ├── ICON_AND_SCREENSHOT_PLAN.md
│   ├── QA_SCRIPT.md
│   ├── RELEASE_PACKET.md
│   └── RUNBOOK.md             # (this file)
├── App.js                        # Root: tab navigator + stack navigators
├── app.json                      # Expo config (bundle ID, version, icons, splash)
├── eas.json                      # EAS Build profiles (dev/preview/production)
├── package.json                  # Dependencies + npm scripts
├── .env.example                  # Environment variable template
├── .gitignore
├── LAUNCH_CHECKLIST.md
├── STORE_METADATA.md
└── README.md
```

---

## 6. Local vs ECS (Production) Differences

| Aspect | Local dev | Production (ECS) |
|--------|-----------|------------------|
| **What runs locally** | Mobile app via Expo dev server | Backend API only |
| **Backend** | Optional local Node server or point to prod | ECS Fargate (`fuelapp-prod-cluster`, task def rev29) |
| **Database** | Local PostgreSQL or connect to RDS | RDS PostgreSQL (us-east-1) |
| **Secrets** | `.env` file | AWS Secrets Manager |
| **API URL** | `http://localhost:3000` | `https://api.freefuelpriceapp.com` |
| **Fuel data** | Same prod API or local seed | 3910 stations via UKPIA/CMA ingestion cron |
| **Builds** | `npx expo start` (dev client) | `eas build --profile production` (EAS cloud) |
| **Push notifications** | Expo Go (limited) | Expo Notifications service |
| **Feature flags** | Same file (`src/lib/featureFlags.js`) | Same file — no runtime override |
| **Alert cron** | Not running locally | CloudWatch-triggered, 15-min cadence |

### Key points

1. **The mobile app never runs on ECS.** ECS hosts only the backend API. The mobile app is built via EAS Build and distributed through App Store / Play Store / TestFlight.
2. **You can develop the mobile app pointing at the production API** — just leave `EXPO_PUBLIC_API_URL` at its default. No local backend needed for UI work.
3. **Feature flags are compile-time.** Changing `featureFlags.js` requires a new build to take effect. There is no remote config server.

---

## 7. Common Tasks

### Run on a physical device
```bash
npx expo start
# Scan QR code with Expo Go app (iOS/Android)
```

### Build for TestFlight (iOS)
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

### Build for internal testing (Android APK)
```bash
eas build --platform android --profile preview
# Download .apk from EAS dashboard
```

### Check API health
```bash
curl https://api.freefuelpriceapp.com/api/v1/health
# Expected: {"status":"healthy","db":"connected","version":"9.0.0"}
```

### Verify nearby stations
```bash
curl "https://api.freefuelpriceapp.com/api/v1/stations/nearby?lat=51.5074&lon=-0.1278&radius=5"
```

---

## 8. Placeholders to Fill Before First Build

| File | Placeholder | What to put |
|------|-------------|-------------|
| `app.json` | `YOUR_EAS_PROJECT_ID` | Run `eas init` to generate |
| `eas.json` | `YOUR_APPLE_ID@email.com` | Apple ID email |
| `eas.json` | `YOUR_APP_STORE_CONNECT_APP_ID` | From App Store Connect |
| `eas.json` | `YOUR_APPLE_TEAM_ID` | From Apple Developer portal |
| repo root | `google-service-account.json` | Download from Play Console (gitignored) |

---

## 9. Troubleshooting

| Problem | Fix |
|---------|-----|
| `expo start` fails with module not found | Run `npm install` again |
| iOS simulator won't launch | Ensure Xcode CLI tools installed: `xcode-select --install` |
| Android emulator not detected | Start emulator first, then `npx expo start --android` |
| API calls return network error | Check `EXPO_PUBLIC_API_URL` in `.env`; verify backend is reachable |
| EAS build fails | Check `eas.json` placeholders are filled; run `eas whoami` to verify login |
| Feature flag change not visible | Flags are build-time; restart Expo or rebuild |

---

## 10. Related Documents

| Document | Purpose |
|----------|---------|
| `LAUNCH_CHECKLIST.md` | Sprint completion, endpoint status, blocking items |
| `STORE_METADATA.md` | All store copy, privacy labels, review notes |
| `docs/DEFERRED_FEATURES.md` | What must stay disabled at launch |
| `docs/RELEASE_PACKET.md` | Full submission readiness checklist |
| `docs/QA_SCRIPT.md` | Pre-submission test cases |
| `docs/ICON_AND_SCREENSHOT_PLAN.md` | Screenshot and icon asset brief |

---

*Last updated: Step 13 — April 2026*
