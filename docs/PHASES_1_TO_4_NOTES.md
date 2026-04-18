# Phases 1–4 — Foundation Notes

Branch: `phase-1/trust-and-quarantine`

This branch lands the **pure / additive** foundation for Phases 1–4 of the
Free Fuel Price App roadmap. Nothing here changes existing screen behaviour
on its own — each module is dormant until a parent component imports it.
Integration (wiring into StationCard, StationDetailScreen, BrandHeader,
etc.) should be done in a Codespace / local dev environment where
`expo start`, lint, and tests can run before each commit.

## What’s landed

| Phase | Path | Kind | Purpose |
|------:|------|------|---------|
| 1 | `src/lib/trust.js` | lib | Freshness tiers, source label formatting, trust-state builder |
| 1 | `src/lib/quarantine.js` | lib | Cohort-median outlier filter, `filterRankable`, `evaluateStation` |
| 1 | `src/components/BestOptionCard.js` | edit | Ranking now routed through `filterRankable` |
| 1 | `src/components/FacilitiesPills.js` | comp | Pure-presentational facility pill row |
| 2 | `src/components/ReportPriceButton.js` | comp | “Report price” CTA (callback only) |
| 3 | `src/lib/smartDecision.js` | lib | `worthTheDrive`, `driveCostPence`, `grossSavingsPence` |
| 4 | `src/lib/brandLeadership.js` | lib | `rankBrands`, `cheapestBrand` |

All new lib modules are **pure** — no I/O, no React, no side effects —
and are null-safe against malformed station input.

## Integration plan (do in Codespace)

### Phase 1b — StationCard wiring
- Import `buildTrustState` from `../lib/trust` and `isQuarantined` from
  `../lib/quarantine` inside `StationCard.js`.
- Render a one-line trust row beneath the price: source label + freshness
  tier colour dot + “Needs caution” when `trustState.confidence === 'low'`.
- Render `<FacilitiesPills facilities={station.facilities} />` below the
  trust row. Component returns `null` when there’s nothing to show, so the
  layout degrades cleanly.

### Phase 2 — Station detail depth
- On `StationDetailScreen`, add `<ReportPriceButton onPress={...} />` near
  the price block.
- Wire `onPress` to a lightweight submit (Supabase insert or existing
  analytics event) — keep the button purely presentational.

### Phase 3 — Smart decisions
- In `StationDetailScreen` (or a “Compare” modal), call
  `worthTheDrive({ basePpl, altPpl, extraMiles, mpg, fillLitres })` using
  the current nearest station as `base` and the selected station as `alt`.
- Surface `result.summary` next to the price. Gate behind a feature flag
  until copy is signed off.

### Phase 4 — Brand leadership
- In `BrandHeader`, call `cheapestBrand(stations, fuelType)` on the
  current nearby set and show “Cheapest brand nearby: {brand}” when
  `leadByPence >= 1`.
- `rankBrands` can feed a future “Brand league” screen.

## Verification checklist (run in Codespace)

```bash
npm ci
npx expo start --web       # smoke
npm run lint               # if configured
node -e "require('./src/lib/smartDecision'); require('./src/lib/brandLeadership'); require('./src/lib/quarantine'); require('./src/lib/trust'); console.log('ok');"
```

Suggested Jest cases for the pure libs:

- `trust.getFreshness` — null / NaN date / ≤12h / 36h / 7d / >7d buckets.
- `quarantine.filterRankable` — empty, all-null prices, one outlier beyond
  `MAX_DEVIATION_P`, stale timestamp.
- `smartDecision.worthTheDrive` — save / break_even / lose / unknown.
- `brandLeadership.cheapestBrand` — tie-break by count, all-quarantined
  returns null.

## Non-goals for this branch

- No changes to `StationCard.js`, `StationDetailScreen`, or navigation.
- No new API calls, no new env vars, no schema changes.
- No app-store-facing copy or assets.

Once the PR is reviewed and the Codespace integration pass is green, cut
`phase-2/station-depth` off this branch.

