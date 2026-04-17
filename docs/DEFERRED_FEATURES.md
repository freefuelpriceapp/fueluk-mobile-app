# Deferred Features — FreeFuelPrice UK

This document lists features that **must remain disabled** at launch.
Do not enable any of these without explicit sprint approval.

---

## Feature Flag Reference

All flags live in `src/lib/featureFlags.js`. Every item below is set to `false`.

| Feature | Flag name | Earliest sprint | Why deferred |
|---|---|---|---|
| Route Intelligence | `routeIntelligence` | Sprint 8+ | Requires mapping SDK, cost modelling |
| Road Reports | `roadReports` | Sprint 9+ | Needs moderation, abuse prevention, legal review |
| Community Contributions | `communityContributions` | Sprint 9+ | Needs moderation tooling |
| Rewards / Gamification | `rewards` | Sprint 10+ | Points, streaks, leaderboards — post-launch |
| Monetization | `monetization` | Sprint 11+ | Affiliate offers, promoted stations |
| Predictive Pricing | `predictivePricing` | Sprint 12+ | AI forecasting — requires data maturity |
| Price Alerts | `priceAlerts` | Sprint 4 (gated) | Gated OFF until backend push infra confirmed |

---

## Navigation guardrails

- **Premium tab**: commented out in `App.js` (import + Tab.Screen wrapped in JSX comment)
- **PremiumScreen.js**: file retained as disabled scaffolding; not reachable from any navigation path
- **`getPremiumStatus()` API**: exists in `fuelApi.js` but is never called at launch

---

## Rules

1. No route-heavy logic in launch flows.
2. No community road reports or police-style alerts.
3. No rewards, gamification, or monetization in launch flows.
4. Future modules may exist only as **disabled scaffolding** or design-only architecture.
5. Any re-enablement requires a sprint approval and checklist update.

---

*Last updated: Step 9 — April 2026*
