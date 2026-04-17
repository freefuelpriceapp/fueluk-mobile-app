# Privacy Policy — FreeFuelPrice UK

**Effective date:** 17 April 2026  
**Last updated:** 17 April 2026  
**App:** FreeFuelPrice UK (iOS bundle `com.freefuelpriceapp.uk`, Android package `com.freefuelpriceapp.uk`), version 9.0.0  
**Publisher:** FreeFuelPrice UK  
**Contact:** support@freefuelpriceapp.com

---

## 1. Summary (Plain English)

FreeFuelPrice UK is a fuel price comparison app for UK drivers. It is **privacy-first**:

- **No account is required.** You do not sign up, sign in, or give us your name, email, or phone number to use the app.
- **We do not sell, rent, or share your personal data** with advertisers, data brokers, or third-party trackers.
- **We do not track you across apps or websites.**
- **Your location is used only, in the moment, to show fuel stations near you.** It is not stored on our servers and is not linked to your identity.
- **Your favourite stations stay on your device.** We do not see them.
- **Data in transit is encrypted** (HTTPS/TLS).

---

## 2. Data We Collect and Why

| Data | Why we process it | Stored on our servers? | Linked to you? | Shared? |
|---|---|---|---|---|
| Precise location (when you grant permission) | To return fuel stations near your current position via `/api/v1/stations/nearby` | No — used transiently, then discarded | No | No |
| Approximate location | Fallback for nearby lookups if precise location is unavailable | No | No | No |
| Device identifier / push token | Only if you opt into price alerts, so the backend can deliver a push notification for your chosen threshold | Yes, tied to the alert record only | No | No |
| Favourite stations | So you can quickly return to stations you care about | **No — stored locally on your device only** | N/A | No |
| Diagnostic crash / performance data (Expo / platform defaults) | To keep the app stable | Aggregated, non-identifying | No | No |

We do **not** collect: your name, email address, phone number, postal address, contacts, messages, browsing history, health data, financial data, photos, or biometric data.

---

## 3. Legal Basis (UK GDPR)

Where UK GDPR applies, our legal bases are:

- **Legitimate interests** (Article 6(1)(f)) — delivering the core "find nearby cheap fuel" feature.
- **Consent** (Article 6(1)(a)) — for optional location access and optional push notifications for price alerts. You can withdraw consent at any time in your device settings.

---

## 4. How Location Works

When you open the Home or Map screen and grant location permission, your device sends your coordinates to our API (`api.freefuelpriceapp.com`) over an encrypted HTTPS connection. The API uses those coordinates **only** to compute a ranked list of nearby stations and returns that list. Your coordinates are **not written to a database, log file, or analytics system in a way that identifies you**, and they are **not shared with any third party**.

If you deny location permission, the app still works — you can search by postcode or town.

---

## 5. Price Alerts (Optional)

If you create a price alert on a station, we store:

- The station ID, fuel type, and price threshold you chose.
- A push notification token so we can notify your device when the threshold is met.

These records are not linked to a name, email, or account. You can delete any alert from the Alerts screen, which removes the record from our backend.

---

## 6. Data Sources (Prices)

Fuel price and station data is sourced from public UK datasets — UKPIA, the Competition and Markets Authority (CMA), and Gov.UK — and normalised for display. These sources describe fuel retailers, not you.

---

## 7. Data Sharing

We do **not** share personal data with third parties. We do not use advertising SDKs, marketing attribution SDKs, or cross-app trackers. The app does not contain ads at launch.

Our infrastructure providers (AWS and Expo for push notifications) act as **data processors** strictly to host and deliver the service. They do not receive content that identifies you.

---

## 8. International Transfers

Some infrastructure (AWS, Expo push relays) is located outside the UK. Where transfers occur, they are protected by standard contractual clauses and the providers' own UK/EU adequacy frameworks.

---

## 9. Data Retention

- Location coordinates: not retained — discarded after the nearby query is answered.
- Alert records (station ID + threshold + push token): retained until you delete the alert or uninstall the app.
- Favourites: retained on your device until you remove them or uninstall the app.
- Aggregated, non-identifying diagnostic data: retained up to 90 days.

---

## 10. Your Rights (UK GDPR)

Because we do not hold data that identifies you (no name, email, or account), most access / rectification requests do not apply — there is nothing personal to retrieve. You can still:

- **Revoke location permission** at any time in iOS Settings or Android Settings.
- **Disable push notifications** in your device settings.
- **Delete alerts** inside the app.
- **Uninstall the app** to remove all local data (favourites, cached stations).
- **Contact us** at support@freefuelpriceapp.com with any privacy question.

You have the right to lodge a complaint with the UK Information Commissioner's Office (ICO) at https://ico.org.uk.

---

## 11. Children

The app is rated 4+ (iOS) / Everyone (Android) and is safe for all ages. We do not knowingly collect personal data from children. No account system exists.

---

## 12. Security

- All network traffic uses HTTPS/TLS encryption in transit.
- Secrets are stored in AWS Secrets Manager, not in the app.
- Favourites are stored locally on your device only.
- We follow Apple's App Privacy and Google Play's Data Safety standards.

---

## 13. App Store / Google Play Privacy Declarations

**iOS App Privacy labels** declare: Precise Location and Device ID collected, neither linked to you, no tracking.  
**Google Play Data Safety** declares: approximate location, precise location, and device ID collected; none shared; precise location required for the nearby feature; all other items optional.

---

## 14. Changes

If this policy changes materially, we will update the "Last updated" date and, where required, notify users in-app before the change takes effect.

---

## 15. Contact

FreeFuelPrice UK  
Email: support@freefuelpriceapp.com  
Support: https://api.freefuelpriceapp.com/support
