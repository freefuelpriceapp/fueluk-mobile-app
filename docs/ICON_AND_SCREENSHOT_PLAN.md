# App Icon & Screenshot Plan — FreeFuelPrice UK

> Step 11 — Visual submission asset plan for App Store Connect and Google Play Console.
> Tied to the real MVP flow as defined in `App.js` (v9.0.0).

---

## 1. App Icon Brief

### Design Direction

| Attribute | Value |
|-----------|-------|
| App name on icon | None (icon-only, no text) |
| Primary colour | #2ECC71 (green accent) |
| Background colour | #1a1a2e (app dark theme) |
| Shape | Fuel pump or fuel-drop silhouette |
| Style | Flat/minimal, single focal element, high contrast |
| Mood | Clean, modern, trustworthy, UK-centric |

### Technical Requirements

| Platform | File | Size | Format | Notes |
|----------|------|------|--------|-------|
| iOS App Store | `assets/icon.png` | 1024×1024 px | PNG, no alpha, no rounded corners | Apple applies mask |
| Android Store listing | (generated from adaptive) | 512×512 px | PNG | Hi-res icon |
| Android Adaptive | `assets/adaptive-icon.png` | 108×108 dp (foreground on 72dp safe zone) | PNG | Background: #1a1a2e |
| Expo splash | `assets/splash.png` | 1284×2778 px recommended | PNG | Background: #1a1a2e |

### Icon Composition Notes

- The foreground element (fuel-drop or pump) should be centred within the 72dp safe zone for Android adaptive icons.
- Use only the green (#2ECC71) and white (#FFFFFF) on the dark background.
- Do NOT include any text, price numbers, or map pins in the icon.
- Do NOT reference any deferred features (routes, premium stars, AI).
- The icon should read clearly at 29×29 pt (smallest iOS size) — keep detail minimal.

---

## 2. Screenshot Shot-List

All screenshots follow the actual MVP user journey. Each shot maps to a real, reachable screen in the launch build.

### Shot-List (in submission order)

| # | Screen | Source File | Tab / Nav | What to Show | Caption (overlay text) | Status Bar |
|---|--------|-------------|-----------|--------------|------------------------|------------|
| 1 | **Home / Near Me** | `HomeScreen.js` | Near Me tab (active) | Location granted, 5+ station cards listed cheapest first, fuel-type filter on Petrol, price + distance visible, dark theme | **Find the cheapest fuel near you** | Light (white) |
| 2 | **Station Detail** | `StationDetailScreen.js` | Tapped from Home list | Single station: petrol/diesel/E10 prices with coloured badges, price history rows, address, brand, freshness label | **Full price breakdown at a glance** | Light |
| 3 | **Map View** | `MapScreen.js` | Map tab (active) | Map centred on user location, 10+ station pins, bottom sheet or list preview, cheapest pin highlighted green | **See every station on the map** | Light |
| 4 | **Search Results** | `SearchScreen.js` | Search tab (active) | Search bar with typed postcode (e.g. "SW1A 1AA"), results list below with station cards | **Search by postcode or town** | Light |
| 5 | **Favourites** | `FavouritesScreen.js` | Saved tab (active) | 2-3 saved stations with heart icons filled red, prices visible | **Save your regular stations** | Light |
| 6 | **Settings** | `SettingsScreen.js` | Settings tab (active) | Support, Privacy, Location Data, Clear Favourites, App Version 9.0.0, Data Source, Price Freshness rows | **Privacy-first. No account needed.** | Light |

### Shots NOT to include

- Alerts screen (price alerts are gated OFF via `FEATURES.priceAlerts: false`)
- Premium screen (commented out in `App.js`)
- Any empty state, error state, or loading spinner
- Any screen showing placeholder data or "No stations found"

---

## 3. Caption Plan

Each screenshot gets a short overlay caption at the top or bottom of the framed device image.

| Shot # | Caption Text | Position | Font Colour | Background |
|--------|-------------|----------|-------------|------------|
| 1 | Find the cheapest fuel near you | Top | #FFFFFF | #0D1117 (60% opacity) |
| 2 | Full price breakdown at a glance | Top | #FFFFFF | #0D1117 (60% opacity) |
| 3 | See every station on the map | Top | #FFFFFF | #0D1117 (60% opacity) |
| 4 | Search by postcode or town | Top | #FFFFFF | #0D1117 (60% opacity) |
| 5 | Save your regular stations | Top | #FFFFFF | #0D1117 (60% opacity) |
| 6 | Privacy-first. No account needed. | Top | #FFFFFF | #0D1117 (60% opacity) |

### Caption Rules

- Max 40 characters per caption.
- No exclamation marks.
- No mention of deferred features (routes, rewards, premium, AI).
- Captions should match the KEY FEATURES list in `STORE_METADATA.md`.
- Use sentence case (capitalise first word only).

---

## 4. Device Coverage Matrix

### iOS (App Store Connect)

| Device Class | Display Size | Required? | Resolution | Notes |
|-------------|-------------|-----------|------------|-------|
| iPhone 16 Pro Max | 6.9" | **Yes** | 1320×2868 px | Primary set — newest required size |
| iPhone 14 Plus / 15 Plus | 6.7" | **Yes** | 1290×2796 px | Covers 6.5" requirement |
| iPhone SE 3rd gen / 8 Plus | 5.5" | **Yes** | 1242×2208 px | Required for older device support |
| iPad Pro 12.9" (6th gen) | 12.9" | **Yes** | 2048×2732 px | Required because `supportsTablet: true` in app.json |

**Total iOS screenshots:** 6 shots × 4 device sizes = **24 images**

### Android (Google Play Console)

| Device Class | Required? | Resolution | Notes |
|-------------|-----------|------------|-------|
| Phone | **Yes** (min 2, max 8) | 1080×1920 px min (16:9) or 1080×2340 px (19.5:9) | Use 6 shots from shot-list |
| 7" Tablet | Optional | 1200×1920 px | Skip for launch unless resources allow |
| 10" Tablet | Optional | 1600×2560 px | Skip for launch |

**Total Android screenshots:** 6 phone shots = **6 images** (tablet optional)

### Google Play Feature Graphic

| Asset | Size | Format | Content |
|-------|------|--------|---------|
| Feature graphic | 1024×500 px | PNG or JPEG | App name "FreeFuelPrice UK" + tagline "Find cheap fuel near you, fast." + fuel-drop icon on #1a1a2e background with #2ECC71 accent |

---

## 5. Screenshot Capture Checklist

Before capturing, ensure the simulator/device is set up correctly:

- [ ] Dark theme active (#0D1117 background confirmed)
- [ ] Location set to central London (51.5074, -0.1278) for realistic UK station data
- [ ] At least 5 stations visible in the Home list
- [ ] Fuel type filter set to "Petrol" (default)
- [ ] At least 2 stations saved as favourites
- [ ] Status bar shows realistic time (e.g. 09:41 for iOS, carrier hidden)
- [ ] No debug banners, red error boxes, or console overlays
- [ ] No references to deferred features visible anywhere
- [ ] App version 9.0.0 visible in Settings screen
- [ ] All prices show realistic UK pence values (e.g. 142.9p, 148.5p)
- [ ] Freshness labels show recent times (e.g. "Updated 2h ago"), NOT "Price may be outdated"

---

## 6. Asset File Naming Convention

```
screenshots/
  ios/
    6.9/
      01-home-nearby.png
      02-station-detail.png
      03-map-view.png
      04-search-results.png
      05-favourites.png
      06-settings.png
    6.7/
      (same names)
    5.5/
      (same names)
    ipad-12.9/
      (same names)
  android/
    phone/
      01-home-nearby.png
      02-station-detail.png
      03-map-view.png
      04-search-results.png
      05-favourites.png
      06-settings.png
  feature-graphic.png
icon/
  icon-1024.png
  adaptive-icon-foreground.png
```

---

## 7. Relationship to Master Documents

| Document | What this plan uses from it |
|----------|----------------------------|
| `STORE_METADATA.md` | Screenshot content plan (expanded here), icon requirements, captions aligned with KEY FEATURES |
| `DEFERRED_FEATURES.md` | Exclusion list — no shots of Premium, route intelligence, rewards |
| `LAUNCH_CHECKLIST.md` | Confirms which screens are live (Sprints 1-7 complete) |
| `App.js` | Tab order and actual screen names for the shot-list |
| `app.json` | Icon file paths, supportsTablet flag, splash config |
| `src/lib/featureFlags.js` | Confirms priceAlerts is OFF (so Alerts screen excluded from shots) |

---

*Last updated: Step 11 — April 2026*
