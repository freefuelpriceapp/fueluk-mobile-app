# Free Fuel Price App — Consolidated Strategy Brief

**Purpose:** Master reference document compiled from all strategy, spec, sprint, and playbook files. This brief governs all coding, architecture, and launch decisions.

**Source files synthesised:**
- `NEWfreefuelpriceapp_execution_plan.md`
- `comet_execution_pack_fuel_app.md`
- `freefuelpriceapp-revised-master-spec-waze-strategy.md`
- `freefuelpriceapp-sprint1-tasks-and-timeline.md`
- `waiting-period-agentic-guide.md`
- `free-fuel-price-app-code-blueprint.md`
- `freefuelpriceapp_project_execution_pack.md`
- `freefuelpriceapp_7_day_comet_prompt_pack.md`
- `freefuelpriceapp-agentic-playbook-revision.md`
- `uk_fuel_app_launch_checklist_plain.pdf`
- `comet_launch_playbook.pdf`

---

## 1. PRODUCT VISION

### What the app is

A **UK driver savings app** — not just a fuel price checker. The core promise is helping UK drivers find cheap fuel nearby, compare stations quickly, understand data freshness and trust, and save favourite stations, within a clean map/list experience.

The long-term ambition is to outperform standalone fuel apps and eventually compete with Waze-like driver utility. The winning positioning statement is: **"the smartest UK driver savings app"** — one that helps users save money, avoid wasted journeys, understand road conditions, and earn tangible value from repeated use.

### Competitive positioning

The product competes primarily against **PetrolPrices** (current UK market leader), which already offers map and list views, filters by distance/brand/fuel type, location search, reviews, and some reward-style mechanics. The app must not aim for parity — it must exceed it on:

- Visual polish and premium UX (calm, fast, uncluttered)
- Trust signals (freshness, source confidence, honest permissions)
- Local usefulness (UK-specific data, postcode search)
- Incentive design (rewards/contribution economy — later horizon)
- Driver context (route-aware value, road intelligence — later horizon)

### What the app is NOT at launch

Not a full live-navigation replacement. Not a community-reporting network. Not a monetised rewards economy. Those belong in later phases after moderation, policy, legal, and scale foundations are in place.

### Product Horizons

| Horizon | Goal | Scope |
|---|---|---|
| **Horizon 1 — Launch MVP** | Best UK fuel savings experience | Nearby cheapest fuel, search, filters, detail, favourites, freshness, privacy/support |
| **Horizon 2 — Driver Context** | Expand from fuel to trip usefulness | Route-aware value, price history, local road disruption overlays, smart savings logic |
| **Horizon 3 — Network Intelligence** | Community and rewards loops | Moderated reports, reputation, incentives, partner-funded rewards, data-driven monetisation |

---

## 2. MVP SCOPE

### Must Ship (v1.0)

- Nearby stations using current device location
- Search by postcode, town, or place name
- Map view and list view (list is the **primary** decision surface; map is secondary context)
- Core fuel type filters (petrol, diesel, E5, E10, premium, distance)
- Station detail page: fuel prices by type, last-updated timestamp, address, directions link
- Filters by brand, open now, and distance
- Favourites / saved stations (local persistence first, no cloud sync at launch)
- Station amenities and opening hours where data is available
- Clear privacy, support, and contact links surfaced in-app (tied to live public URLs)
- Strong trust cues: freshness, source confidence, transparent permission rationale
- "Why this station" explanations: cheapest nearby, closest, freshest, best value
- Loading states, empty states, stale-data states, permission-denied states, offline/network-failure states
- Analytics hooks for: nearby view, search performed, station detail opened, favourite saved/removed, refresh initiated/completed
- Crash reporting and structured error logging

### May Ship (low effort, v1.0 optional)

- Price history mini-chart on station detail
- "Best value nearby" ranking (price + distance combined simply)
- Standout differentiator: route-aware savings or predictive price alerts (noted across multiple docs as a launch differentiator if achievable)
- Trust layer: confidence score weighting freshness, confirmations, and source reliability

### Version 1.1 (post-launch)

- Route-based fuel suggestions for journeys (detour cost logic)
- AI-generated "best stop" suggestion using route distance, price delta, and station quality
- Predictive pricing alerts when local stations are likely to rise
- Better station amenities and opening-status metadata if available
- Optional account sync for favourites/history

### Explicitly Deferred (must NOT appear in launch product)

- Community hazard or police-style reporting
- AI camera / stop-check reports
- Route-aware optimisation requiring heavy routing logic
- Rewards points, reputation systems, or gift-card redemption
- Predictive AI recommendations
- Monetisation placements / adverts
- Gamified rewards or contribution scoring
- User-generated road alerts / enforcement-style reporting
- Driver Hub / traffic/hazard/incident feeds

---

## 3. FEATURE FLAGS

All non-MVP features must exist **only as disabled scaffolding** — present in the codebase as dormant modules, controlled by config, invisible from launch navigation and UI.

### Feature flag architecture

- `backend-api/src/utils/featureFlags.js` — controls backend feature activation
- `mobile-app/lib/core/config/feature_flags.dart` — controls mobile feature activation
- `shared-config/feature-flags.json` (optional) — environment-driven flags for release control
- A `FeatureRegistry` layer on both backend and mobile so modules can be added or removed without rewriting core routing

### Flags that must be LOCKED OFF at launch

| Flag | Module | Reason for deferral |
|---|---|---|
| `route_intelligence` | Backend + Mobile | Heavy routing logic, not store-safe at launch |
| `road_reports` | Backend + Mobile | Requires moderation, abuse handling, policy review |
| `police_alerts` | Backend + Mobile | Store policy risk, moderation required |
| `rewards` | Backend + Mobile | Needs legal/policy, contribution economy design |
| `monetisation` | Backend + Mobile | Not retention-safe at launch; deferred to Horizon 3 |
| `community_reporting` | Backend + Mobile | UGC moderation not in place |
| `predictive_ai` | Backend | Too complex, not evidenced at launch |
| `account_sync` | Backend + Mobile | Cloud sync for favourites deferred to v1.1 |

### Deferred folder structure (must exist but be inactive)

```
backend-api/src/features/
  route_intelligence/
  road_reports/
  rewards/
  monetization/

mobile-app/lib/features/
  route_intelligence/
  road_reports/
  rewards/
  monetization/
```

### Rule for every coding session

Before any session ends: verify deferred features remain disabled in config and are not visible in launch navigation or UI.

---

## 4. ARCHITECTURE

### Repo structure (mono-repo)

```
freefuelpriceapp/
├── mobile-app/          # iOS and Android client
├── backend-api/         # Public API and service logic
├── data-pipeline/       # Scheduled ingestion and refresh jobs
├── shared-types/        # Shared type definitions
├── infra/               # Schema, infra scripts
├── docs/                # Prompts, decisions, runbooks
└── .github/ or aws-pipeline/
```

### Mobile app

**Stack:** Flutter (preferred) — one codebase for iOS + Android, strong map/geolocation/list UI support. React Native is also acceptable.

**Screens:**

| Screen | Purpose | Key elements |
|---|---|---|
| Splash / Launch | Startup checks | App version, config bootstrap, error fallback |
| Onboarding | Explain value and permissions | Benefits, location rationale, privacy link |
| Home / Nearby | Main list experience | Nearby stations, quick filters, refresh state |
| Map | Geographic browsing | Map pins, bottom sheet, recenter, filters |
| Search | Find by town/postcode | Suggestions, recent searches, loading states |
| Station Detail | Compare one location | Fuel table, update time, address, directions |
| Favourites | Saved stations | Reorder/remove, empty state |
| Settings / Support | Trust and account controls | Privacy, support, contact, app version |

**Mobile module structure:**

```
mobile-app/lib/
  app/
  core/
    config/          # feature_flags.dart
    services/
    theme/
    api_client/
    error_handling/
    analytics/
  features/
    home/            # nearby_screen.dart
    search/          # search_screen.dart
    favourites/      # favourites_screen.dart
    settings/        # settings_screen.dart
    station_detail/
    location/        # permissions, geolocation, fallback states
    route_intelligence/   # DORMANT
    road_reports/         # DORMANT
    rewards/              # DORMANT
    monetization/         # DORMANT
```

**Design direction:** Premium, calm, fast. High contrast, generous spacing, strong card hierarchy. Make the home view instantly useful in under five seconds. List is the primary decision surface; map is secondary. Reduce clutter versus typical driving apps. Explain "why this station" through clear labels.

### Backend API

**Stack:** Node.js (JavaScript, existing direction) with Express. TypeScript preferred. PostgreSQL via `pg`. Redis-style caching optional later.

**API Endpoints (v1):**

| Endpoint | Purpose |
|---|---|
| `GET /health` | Health check for load balancer and uptime monitoring |
| `GET /api/v1/status` | Version and dependency status |
| `GET /api/v1/stations/nearby` | Stations near lat/lng |
| `GET /api/v1/stations/search` | Search by postcode, town, or place |
| `GET /api/v1/stations/:id` | Station detail and prices |
| `GET /api/v1/fuel-types` | Supported fuel filter options |
| `GET /api/v1/meta/last-updated` | Freshness transparency |

**Backend service layers:**

```
backend-api/src/
  app.js
  config/
    env.js
    db.js
  routes/            # thin HTTP handlers
  controllers/       # request orchestration
  services/          # station search, geospatial filtering, freshness logic
  repositories/      # PostgreSQL access
  middleware/
    errorHandler.js
    notFound.js
  utils/
    featureFlags.js
  features/
    fuel/
    favourites/
    meta/
    route_intelligence/   # DORMANT
    road_reports/         # DORMANT
    rewards/              # DORMANT
    monetization/         # DORMANT
```

**Backend principles:** Intentionally boring and reliable. Clean endpoint contracts, typed responses, predictable failure handling. No hard-coded station arrays in production path. All mock paths must be removed.

### Database

**Engine:** PostgreSQL (already deployed on AWS RDS). PostGIS extension for geospatial queries.

**Core tables:**

| Table | Purpose |
|---|---|
| `brands` | Brand normalisation |
| `stations` | Canonical station records |
| `station_prices_current` | Current fuel prices per station |
| `station_prices_history` | Historical price snapshots |
| `fuel_types` | Supported fuel definitions |
| `locations_cache` | Search/postcode lookup cache |
| `ingestion_runs` | Pipeline audit history and run logging |
| `data_sources` | Source tracking and status |
| `user_favourites` | Optional future cloud sync capability |

**Schema principles:**
- Keep station identity separate from price history so updates can be traced
- Store source timestamps and ingestion timestamps separately
- Normalise brand names and fuel types early
- Design for read-heavy usage (far more app queries than data writes)

### Data ingestion pipeline

**Stack:** Node.js/TypeScript (or Python). Scheduled via AWS EventBridge.

**Pipeline stages:**

1. Fetch source data from UK fuel/forecourt data sources (UK Government Fuel Finder scheme — official data, price changes reported promptly by law)
2. Validate required fields; reject malformed records
3. Normalise station identity, addresses, brands, and fuel-type labels
4. Upsert stations and insert price snapshots into PostgreSQL
5. Record ingestion metadata (duration, source availability, station count, anomalies); alert if freshness degrades

**Pipeline folder structure:**

```
data-pipeline/src/
  config/
    db.js
  jobs/
    runIngestion.js    # fetch → normalize → write → mark completion
  repositories/
    stationWriteRepository.js   # upsert brands, stations, prices, history, runs
  sources/
    ukFuelSource.js    # first live UK adapter
  transformers/
    normalizeStations.js
  utils/
    logger.js
```

**Source adapters** must be isolated so future sources can be added without rewriting the pipeline.

### AWS infrastructure

**Production stack (in place):**

| Service | Role |
|---|---|
| ECS (or App Runner) | Backend API hosting |
| RDS PostgreSQL | Database |
| S3 | Public assets, policy pages, operational exports |
| Route 53 | DNS routing (api, www, support, legal subdomains) |
| CloudFront | CDN for landing page, privacy policy, support pages |
| CloudWatch | Monitoring and billing alerts |
| IAM | Permissions |
| Secrets Manager | API secrets and database credentials |
| ECR | Container image registry |
| EventBridge | Scheduled ingestion jobs |

**Push notifications (future):**
- Firebase Cloud Messaging (Android)
- Apple Push Notification Service (iOS)
Coordinated via backend jobs.

**Naming convention:** `fueluk-prod-*`

**Domain:** `freefuelpriceapp.com`  
**API endpoint:** `api.freefuelpriceapp.com`

### Delivery / CI-CD flow

1. Push code to central repository
2. Run lint, tests, and build checks automatically
3. Build backend Docker image and push to ECR
4. Deploy backend to ECS after successful checks
5. Produce mobile test builds for internal testing tracks

**Minimum release gates:**
- Backend `/health` endpoint passes
- Critical API flows return correct data
- Mobile app runs nearby/search/detail journey without crash
- Public privacy and support URLs remain live and match in-app references

---

## 5. MONETISATION STRATEGY

Monetisation is **explicitly deferred from the launch product**. No monetisation placements should appear in v1.0. The approach follows a phased model.

### Phase 1 — Retention-safe monetisation (Horizon 2, post-launch)

- Partner offers from local car-related businesses
- Sponsored but clearly labelled offers near stations
- Opt-in promotions tied to user savings behaviour
- Referral bonuses rewarding real retention (not shallow installs)

### Phase 2 — Rewards economy (Horizon 3)

- Digital discount gift cards funded by partner campaigns
- Challenge-style engagement rewards for verified useful contributions
- Points earned for confirming/correcting fuel data and validating road reports
- Streak bonuses for repeated useful engagement
- Higher reputation for accurate reporting over time
- **Critical design rule:** Reward quality, not quantity. Weighted contribution system values accuracy and sustained usefulness over raw submission volume. Spammy behaviour must not be rewarded.

### Phase 3 — Data and audience monetisation (Horizon 3, later)

- Aggregated market insights for partners, brands, or forecourt-related businesses (privacy-safe aggregation, clear legal boundaries)
- Premium partner placement opportunities (strict labelling and fairness controls)
- Audience intelligence (requires scale and legal/privacy foundation)

### Cost context (for planning)

**Initial launch costs:**
- Apple Developer Program: $99/year
- Google Play registration: $25 one-time
- Domain: ~$10–$20/year
- AWS MVP setup: low double digits if usage is light
- Design assets (icon, screenshots): $0–$300

**Ongoing operating budget:** Realistically £100–£400/month excluding marketing. AWS backend + database: ~$20–$100/month. Maps/geocoding: near $0 on free tiers initially.

---

## 6. COMPETITIVE LANDSCAPE

### Primary competitor

**PetrolPrices** — current UK market leader. Offers:
- Map and list views
- Filters by distance, brand, fuel type
- Location search
- User reviews
- Some reward/points mechanics

**Differentiation targets vs PetrolPrices:**
- Visual polish: premium, calm, fast vs. utility-heavy
- Trust cues: explicit freshness indicators, source confidence, honest permission language
- Speed: instantly useful home screen (under 5 seconds)
- List-first UX: ranked decisions without forcing map interaction
- "Why this station" explanations
- Future: route-aware value, contribution economy, road intelligence layer

### Secondary reference

**Waze** — navigation + live traffic + community road intelligence at scale. The app aspires to Waze-like driver utility but competes by being meaningfully better in fuel savings, cleaner UX, more transparent, and more UK-relevant — while building the architecture for route intelligence without shipping the riskiest features at launch.

### Competitive feature ideas that can beat the market

**Core fuel improvements:**
- "Best value stop" (price + detour time + route relevance) vs. only "cheapest"
- Confidence score weighting freshness, confirmations, source reliability
- Price history mini-chart on station detail
- Smart refill reminders (opt-in)

**Driver utility (Horizon 2/3):**
- Road intelligence feed: traffic disruption, accidents, closures, breakdowns, hazard warnings
- Voice-friendly incident contribution flow
- Local area pulse: "today near you" for fuel shifts and road issues
- AI explanation layer: "prices rising locally — fill up tonight"

---

## 7. SPRINT / EXECUTION PLAN

### Overall delivery phases

| Phase | Objective | Output |
|---|---|---|
| **Phase 1 — Sprint 1** | Close backend/data foundation | Proven schema, ingestion, DB-backed API, mobile shell, feature flags |
| **Phase 2 — Sprint 2** | Build live product integration | Live nearby, search, detail, favourites, map/list polish |
| **Phase 3 — Hardening** | Release-ready product | Analytics, QA, crash handling, store assets, operational checks |
| **Phase 4 — Post-launch** | Driver-intelligence expansion | Route-aware value, community intelligence, rewards, monetisation |

---

### Sprint 1 — 10 working days (Backend/Data Foundation)

**Definition of done:** Real data ingested into PostgreSQL; nearby/search/detail/freshness endpoints return DB-backed results; mobile shell navigable; future features disabled.

**Day-by-day plan:**

| Day | Goal | Key deliverables |
|---|---|---|
| 1 | Schema and Sprint scope | `infra/schema.sql`, `infra/README.md`, `.env.example` files, `config/env.js`, `config/db.js` |
| 2 | Backend repository foundation | Replace mock stationRepository with PostgreSQL-backed methods; `getNearbyStations`, `searchStations`, `getStationById`; add `metaRepository.js` |
| 3 | Services, controllers, validation | Upgrade `stationService.js`, `stationController.js`; add `metaService.js`, `metaController.js`, `metaRoutes.js`; validation and 4xx error handling |
| 4 | Middleware and API polish | `errorHandler.js`, `notFound.js`; update `app.js`; add `featureFlags.js`; smoke test all routes |
| 5 | Data pipeline setup | `data-pipeline/package.json`; `ukFuelSource.js` (first live UK adapter); expand `normalizeStations.js`; add `logger.js` |
| 6 | Data persistence | `stationWriteRepository.js`; upsert brands/stations/prices/history/runs; upgrade `runIngestion.js` to full fetch→normalize→write→complete flow |
| 7 | End-to-end backend verification | Run live ingestion; verify DB records; retest all API endpoints; document local vs ECS config differences |
| 8 | Mobile shell preparation | Replace `main.dart` with navigation shell; add `app_shell.dart`, `feature_flags.dart`; add `nearby_screen.dart`, `search_screen.dart`, `favourites_screen.dart`, `settings_screen.dart` |
| 9 | Trust UX and launch-safe review | Add "last updated" contract assumptions; settings privacy/support/contact hooks; confirm all dormant features disabled |
| 10 | Sprint 1 closure | Review all artifacts; write implementation summary; list Sprint 2 blockers; define Sprint 2 starting tasks |

**Sprint 1 out-of-scope:** Route-aware optimisation, community reporting, police/camera features, gamified rewards, gift-card monetisation, predictive AI.

---

### Sprint 2 — Live Product Build

**Integration order (do not deviate):**

1. Mobile API client with typed models and clear error handling
2. Connect nearby screen to live production API
3. Connect search (postcode/town/place)
4. Connect station detail (prices, freshness, address)
5. Favourites with local persistence
6. Map/list product polish

**Sprint 2 tasks:**
- Build mobile API client with typed models
- Connect nearby screen first (core value proposition)
- Connect search second
- Connect station detail with fuel breakdowns, timestamps, trust messaging
- Add local favourites persistence (no cloud sync yet)
- Include useful empty states and fallback states
- Trust UX: "last updated" prominently displayed; freshness/confidence language; permission rationale copy

---

### 14-Day Recommended Execution Plan (from execution doc)

| Day | Focus | Key output |
|---|---|---|
| 1 | Sprint 1 audit | Complete/partial/missing view across all workstreams |
| 2 | DB and env verification | Schema, config, ECS/local differences, health routes |
| 3 | Backend repository verification | No production mock paths remain |
| 4 | Ingestion run validation | Real data reaches PostgreSQL with run logging |
| 5 | API proof | Nearby, search, detail, freshness — all DB-backed |
| 6 | Mobile shell audit | Launch-safe navigation, disabled future modules |
| 7 | Sprint 1 closure | Verdict: complete / almost complete / blocked |
| 8 | Mobile API client | Stable client, typed models |
| 9 | Nearby integration | Connect nearby screen to live production API |
| 10 | Search integration | Postcode/town search + results states |
| 11 | Station detail | Prices, freshness, address, trust cues |
| 12 | Favourites and settings | Local favourites + legal/support/settings polish |
| 13 | QA and release hardening | Critical flows, crash/error states, logging, analytics |
| 14 | Launch readiness review | Release gates, blockers, submission prep |

---

### Release hardening checklist

**Product hardening:**
- Analytics hooks: nearby view, search, station detail open, favourite save, refresh
- Crash reporting and reliable error logging (backend + mobile)
- Validate all states: loading, empty, stale-data, permission-denied, network-failure
- Internal test run: open → allow location → view nearby → search → open detail → save favourite

**Operational hardening:**
- Repeatable deploy path: lint → test → build → image push → ECS rollout
- `.env.example` files current for all workstreams
- Maintainer guide: run commands, feature flags, module boundaries, safe editing patterns
- One-command local workflow: `npm run dev`, `npm run ingest`, `flutter run`

---

## 8. AGENTIC WORKFLOW (How Comet/Computer Should Operate)

### Operating model (three-part)

1. **Founder** = owner and approver (pays fees, completes identity checks, approves final submissions, handles 2FA)
2. **Coding agent / Computer** = produces architecture, code, assets, copy, and task plans
3. **Comet** = browser-side operator for AWS console, App Store Connect, Google Play Console tasks

### Core operating rules (apply to every session)

- Keep the product **launch-safe and fuel-first** at all times
- Focus on: product core, release hardening, trust prep, and store assets
- **Do not activate** route intelligence, community road reports, police-style alerts, rewards, or monetisation in launch flows
- Future non-MVP modules may exist **only as disabled scaffolding**
- Prefer **explicit, file-by-file changes** over broad rewrites
- End each session with: what changed / what now works / what is blocked / next action

### Agentic workflow loop

```
1. Audit current repo state
2. Compare to sprint checklist
3. Implement one workstream at a time
4. Run tests or smoke checks
5. Commit with clear milestone note
6. Move to next workstream
```

### 7-Day Comet prompt pack (daily sequence)

| Day | Prompt goal |
|---|---|
| 1 | Repository audit and implementation map — identify build gap, no changes |
| 2 | Infra and backend foundation — schema, env config, DB wiring, remove mocks |
| 3 | Services, controllers, middleware, API contracts — stable DB-backed API |
| 4 | Data ingestion and persistence — first working UK fuel data path |
| 5 | End-to-end verification + mobile shell — prove real data, prepare shell |
| 6 | Trust, UX, and editability hardening — trust hooks, feature flags, maintainer docs |
| 7 | Sprint 1 definition-of-done review + Sprint 2 handoff — close and hand off |

### Automation levels (what Comet can handle)

| Task | Automation level |
|---|---|
| Product specification and feature planning | 90–95% |
| Mobile app and backend implementation | 85–95% |
| AWS infrastructure setup | 75–90% |
| App metadata and launch assets | 80–90% |
| TestFlight and internal testing setup | 70–85% |
| Final store submission | 50–70% |
| Payments, KYC, 2FA, legal acceptance | 0% — must remain manual |

### What must remain manual (founder only)

- Apple Developer enrollment, identity verification, payment of annual fee
- Google Play Console registration, identity verification, registration fee
- AWS billing activation, debit card entry, spend alerts
- Two-factor authentication codes, CAPTCHAs, security challenges
- Final acceptance of store policy statements
- Final submission click in both stores

### Reusable prompt template for scoped edits

```
Open the Free Fuel Price App workspace and make a scoped change.

Goal:
[one clear goal]

Constraints:
- Keep launch-safe MVP behavior intact unless explicitly approved otherwise.
- Preserve feature flags and modular boundaries.
- Do not break existing backend or mobile contracts unless necessary.
- Keep code fully editable and easy to revise later.

Tasks:
1. Identify which files must change.
2. Make only the required edits.
3. Run or describe the relevant verification steps.
4. Summarize what changed, what feature flags or config were affected, and the next best action.
```

### Daily founder checklist (end of every session)

1. What files changed
2. What now works
3. What is still blocked
4. Whether any environment values or AWS assumptions changed
5. The exact next prompt or work block for the following day

### Founder-only action batch (store launch)

1. Pay Apple Developer fee
2. Pay Google Play registration fee
3. Complete Apple ID and developer verification
4. Complete Google identity verification
5. Add AWS billing method and spend alert approval
6. Buy domain and approve DNS changes
7. Approve brand name, icon direction, colour direction, and listing copy
8. Approve final app store descriptions and screenshots
9. Confirm privacy wording for live location access
10. Press final store submission buttons

---

## 9. LAUNCH REQUIREMENTS

### Accounts and identity (pre-requisites)

- [ ] Decide individual vs company enrollment for Apple and Google
- [ ] Prepare: legal name, address, phone number, government ID, payment card
- [ ] Create support email address for store contact
- [ ] Domain bought (`freefuelpriceapp.com`) — confirmed in place
- [ ] AWS account access and billing setup confirmed

### Apple setup

- [ ] Sign in with Apple Account; enable two-factor authentication
- [ ] Enroll in Apple Developer Program via Apple Developer app
- [ ] Complete identity verification with government-issued photo ID
- [ ] Pay Apple Developer Program fee ($99/year)
- [ ] Confirm access to App Store Connect
- [ ] Create the app record in App Store Connect
- [ ] Add bundle identifier and app metadata
- [ ] App name, subtitle, primary language, category
- [ ] Store listing: subtitle, description, keywords, support URL, marketing URL, privacy policy URL
- [ ] Complete privacy answers for location use and any required disclosures
- [ ] Upload iOS build using current supported Xcode toolchain
- [ ] Set up TestFlight and invite testers

### Google Play setup

- [ ] Create Google Play Console developer account
- [ ] Complete identity verification and business verification
- [ ] Pay Google Play registration fee ($25 one-time)
- [ ] Confirm developer profile and account settings complete
- [ ] Create app in Play Console
- [ ] Add store metadata, contact details, and privacy policy URL
- [ ] Complete Data safety and required app content declarations
- [ ] Upload Android build
- [ ] Set up Internal testing before production release

### AWS infrastructure (confirmed in place)

- [ ] App Runner / ECS — backend service live
- [ ] RDS PostgreSQL — database provisioned
- [ ] S3 — bucket for public web assets
- [ ] Route 53 — domain routing to backend
- [ ] CloudFront — CDN for public pages
- [ ] CloudWatch — monitoring and billing alerts
- [ ] IAM — permissions configured
- [ ] Secrets Manager — API secrets and DB credentials stored

### Website and policy pages (required for store listing)

- [ ] Home / About page — live and publicly accessible
- [ ] Privacy Policy — live, URL known, accurate for location-based app
- [ ] Support page — live, URL known
- [ ] Contact page — live
- [ ] All pages confirmed suitable for store listing fields
- [ ] In-app settings links to these URLs are wired and verified

### Store assets (prepare in advance)

- [ ] App name finalised
- [ ] Subtitle / short title variant
- [ ] Short description
- [ ] Full store description (aligned to actual MVP, no deferred features described as live)
- [ ] Keywords
- [ ] Release notes
- [ ] iPhone screenshots (all required sizes)
- [ ] Android screenshots
- [ ] App icon (all required sizes)
- [ ] Google Play feature graphic
- [ ] Support URL
- [ ] Privacy policy URL
- [ ] Marketing URL (optional)

### Final QA and submission

- [ ] Test on real devices: location, maps, nearby search, filters, station detail, favourites
- [ ] Confirm live fuel data updates load correctly
- [ ] Check support and privacy URLs are live and correct
- [ ] Review final branding, screenshots, and store copy
- [ ] Complete any remaining verification and security prompts
- [ ] Submit to Apple for review
- [ ] Submit to Google Play production release

### Launch timing (realistic estimates)

| Stage | Typical time |
|---|---|
| Account creation and verification | 1–5 days (KYC dependent) |
| MVP build to internal test | 7–14 days |
| AWS hosted beta environment | 2–4 days after MVP stabilises |
| TestFlight and Play internal testing | 1–3 days |
| Store submission and review | Apple: 24–48 hours typically; Google: potentially longer for new accounts |
| **Total from account-ready** | **2–4 weeks (fast track, tight scope)** |

### Store submission risk areas (location-based app)

- Location permission wording must match actual behaviour precisely
- Privacy answers in App Store Connect must be accurate and complete
- User-generated content features (road reports, community) must be deferred until moderation systems exist
- Data safety declarations in Google Play must cover all data collected
- Any enforcement-style reporting (police/camera alerts) deferred entirely until legal review

---

## APPENDIX: Sprint 1 File Checklist

### `infra/`
- [ ] `schema.sql`
- [ ] `README.md`

### `backend-api/`
- [ ] `package.json`
- [ ] `.env.example`
- [ ] `src/config/env.js`
- [ ] `src/config/db.js`
- [ ] `src/middleware/errorHandler.js`
- [ ] `src/middleware/notFound.js`
- [ ] `src/routes/metaRoutes.js`
- [ ] `src/controllers/metaController.js`
- [ ] `src/services/metaService.js`
- [ ] `src/repositories/metaRepository.js`
- [ ] `src/repositories/stationRepository.js` (upgraded — no mocks)
- [ ] `src/services/stationService.js` (upgraded)
- [ ] `src/controllers/stationController.js` (upgraded)
- [ ] `src/app.js` (upgraded)
- [ ] `src/utils/featureFlags.js`

### `data-pipeline/`
- [ ] `package.json`
- [ ] `.env.example`
- [ ] `src/config/db.js`
- [ ] `src/sources/ukFuelSource.js`
- [ ] `src/transformers/normalizeStations.js` (upgraded)
- [ ] `src/repositories/stationWriteRepository.js`
- [ ] `src/jobs/runIngestion.js` (upgraded)
- [ ] `src/utils/logger.js`

### `mobile-app/`
- [ ] `lib/main.dart` (upgraded — navigation shell)
- [ ] `lib/app/app_shell.dart`
- [ ] `lib/core/config/feature_flags.dart`
- [ ] `lib/features/home/nearby_screen.dart`
- [ ] `lib/features/search/search_screen.dart`
- [ ] `lib/features/favourites/favourites_screen.dart`
- [ ] `lib/features/settings/settings_screen.dart`

---

## APPENDIX: Five Execution Principles (apply to all workstreams)

1. **Complete the real data path before polishing secondary features.** Backend and ingestion are the core product engine.
2. **Treat the backend and ingestion flow as the core product engine**, not supporting infrastructure.
3. **Keep all non-MVP features modular, isolated, and disabled by default.**
4. **Use short, controlled implementation cycles with verification after each work block.**
5. **Optimise for trust, clarity, and maintainability over feature count.**

---

*Last compiled from source documents — all sections reflect the full consensus across all strategy files.*
