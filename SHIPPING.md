# FreeFuelPrice UK — Shipping Runbook (v1.0.0)

> Single source of truth for local-machine steps to ship v1.0.0 to App Store + Play Store.
> Code-side work is complete on `main`. Everything below requires local CLI + personal credentials.

## Prerequisites

- Local clone of `fueluk-mobile-app` up to date with `main`
- Node 20+, `npm` or `pnpm`
- Expo CLI: `npm i -g eas-cli` (>= 7.8.0)
- Signed in: `eas login`
- Apple ID: `refurb79@gmail.com` (already set in `eas.json` submit.production.ios.appleId)
- Apple Developer enrollment VERIFIED (see Apple Developer app / https://developer.apple.com/account)
- Google Play Console developer verification COMPLETE (must be done from local Android device)

## Step 1 — EAS project init (one-time)

```bash
cd fueluk-mobile-app
eas init
```

This generates the EAS project ID. Replace both placeholders in `app.json`:

- `expo.updates.url` → `https://u.expo.dev/<EAS_PROJECT_ID>`
- `expo.extra.eas.projectId` → `<EAS_PROJECT_ID>`

Commit:

```bash
git commit -am "chore(eas): set EAS projectId after init"
git push
```

## Step 2 — Apple credentials (after Apple verification clears)

1. Open App Store Connect → My Apps → `+` → New App.
2. Bundle ID: `com.freefuelpriceapp.uk` (already registered via `app.json`).
3. SKU: `fueluk-mobile-app`.
4. Copy the generated App Store Connect **App ID** (numeric).
5. Copy your Apple **Team ID** from https://developer.apple.com/account → Membership.
6. Update `eas.json` submit.production.ios:
   - `ascAppId`: <paste numeric ASC app id>
   - `appleTeamId`: <paste team id>
7. Commit: `chore(eas): fill ascAppId + appleTeamId`.

## Step 3 — Google credentials

1. Play Console → Setup → API access → create service account → grant "Release manager".
2. Download JSON key as `google-service-account.json`.
3. Place at repo root. `.gitignore` already excludes it — DO NOT COMMIT.

## Step 4 — Production builds

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

Each build: ~15–25 min. Output: `.ipa` and `.aab` artifacts in EAS.

## Step 5 — Submit to stores

```bash
eas submit --platform ios --profile production --latest
eas submit --platform android --profile production --latest
```

iOS → goes to App Store Connect for TestFlight + review.
Android → goes to Play Console `internal` track (promote to production after QA).

## Step 6 — Screenshots

Required sizes (per STORE_METADATA.md):

- iPhone 6.9" (1290×2796)
- iPhone 6.5" (1284×2778 or 1242×2688)
- iPhone 5.5" (1242×2208)
- iPad Pro 12.9" (2048×2732)
- Android phone (1080×1920 min)
- Android 7" + 10" tablet

Capture using iOS Simulator + Android Emulator on a preview build:

```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

## Step 7 — Submit for review

- App Store Connect → add screenshots, paste copy from `STORE_METADATA.md`, submit for review.
- Play Console → fill content rating questionnaire, data safety form, upload screenshots, submit to production track.

## Verification checklist before submission

- [ ] `app.json` placeholders filled: `YOUR_EAS_PROJECT_ID` (x2)
- [ ] `eas.json` placeholders filled: `ascAppId`, `appleTeamId`
- [ ] `google-service-account.json` present locally, NOT committed
- [ ] Privacy Policy URL reachable: https://api.freefuelpriceapp.com/privacy
- [ ] Support URL configured
- [ ] Age rating + data safety forms completed in both consoles
- [ ] TestFlight internal test passed
- [ ] App opens on real device, nearby results render, dark theme verified

## External blockers (cannot be done from cloud browser)

- Apple Developer enrollment verification → Apple side, up to 48h
- Google Play Console developer verification → local Android device required
- EAS CLI commands → local machine only
- TestFlight device testing → physical iOS device or Simulator

## Contact

refurb79@gmail.com
