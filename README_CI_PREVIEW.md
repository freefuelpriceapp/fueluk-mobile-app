# CI Auto-Preview for `ui/**` Branches

Every commit pushed to a branch named `ui/**` triggers two workflows:

1. `.github/workflows/expo-preview.yml` - publishes an EAS Update (OTA) channel + uploads a web bundle artifact. When run on a PR, it auto-comments the Expo Go preview URL on the PR.
2. `.github/workflows/expo-preview-pages.yml` - exports the web bundle and deploys it to GitHub Pages under `/previews/<branch>-<sha7>/` — a permanent, browser-visible URL per commit.

## One-time manual setup (owner must do these, agent cannot)

1. ```
   npx eas-cli login             # interactive, Expo 2FA
   npx eas-cli init --force   # writes real projectId into app.json
   git add app.json
   git commit -m "chore(eas): bind EAS projectId"
   git push
   ```
2. Settings → Secrets and variables → Actions→ New repository secret
   - Name: `EXPO_TOKEN`
   - Value: output of `npx eas-cli whoami --json` access token, or generate one at https://expo.dev/accesses

## After that

Push any  ui/**  branch → workflows run → you get:

- A GitHub Pages URL like  https://freefuelpriceapp.github.io/fueluk-mobile-app/previews/ui_refinement-abc1234/
- An Expo Update URL commented on the PR (if one is open)
- A `web-preview-<branch>-<sha>` workflow artifact (14-day retention)

Never touches `main`.
