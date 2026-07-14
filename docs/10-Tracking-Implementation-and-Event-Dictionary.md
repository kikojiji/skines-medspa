# Doc 10 — Level-1 Tracking Implementation & Event Dictionary

**Status:** IMPLEMENTED (Consent + Attribution + Core Tracking). Meta Pixel next.
**Scope:** First-party measurement on skines.ca. NO completed-booking / revenue data
(those live on Fresha and remain out of scope — see Doc 08 M-01).
**Honesty rule:** `booking_intent` / `gift_card_intent` are INTENT signals (a qualified
click toward Fresha). They are NOT bookings and carry NO value/currency/revenue.
`CompletedBooking` and `Purchase` are reserved and unimplemented.

---

## 10.1 Module architecture (load order, every page)

```
<head>  (defer, runs in this order)
  1. inline: gtag('consent','default', DENIED)   ← before gtag config (Consent Mode v2)
  2. gtag.js + config G-VFB8SY59FX + G-N46K5NG8TW
  3. skines-consent.js       → banner, consent update, gated Clarity loader
  4. skines-attribution.js   → UTM/click-id capture, first/last touch, visitor/session, event_id
  5. skines-tracker.js       → core dispatcher + auto service_view/phone/email
<body end>
  6. fresha-tracking.js      → booking_intent / gift_card_intent (routes through core)
     lead-tracking.js        → degraded fallback only (core owns generate_lead)
```

| File | Role | Public API |
|---|---|---|
| `assets/js/skines-consent.js` | Consent Mode v2 + Law 25 banner (necessary/analytics/advertising) | `window.skinesConsent` = `get / set / open / onChange` |
| `assets/js/skines-attribution.js` | First-party attribution + IDs | `window.skinesAttribution` = `getVisitorId / getSession / getFirstTouch / getLastTouch / getClickIds / newEventId / snapshot / ready` |
| `assets/js/skines-tracker.js` | Unified event layer + auto-instrumentation | `window.skinesTrack(name, params, opts)`, `window.skinesTrackLead(formKey)` |
| `assets/js/fresha-tracking.js` | Fresha-click detector → core | (none; listens on click) |
| `assets/js/lead-tracking.js` | Fallback `skinesTrackLead` if core absent | `window.skinesTrackLead` (guarded) |

---

## 10.2 Consent model (Quebec Law 25 / Consent Mode v2)

- Default (pre-choice): `analytics_storage=denied`, `ad_storage/ad_user_data/ad_personalization=denied`,
  `functionality_storage/security_storage=granted`.
- **Microsoft Clarity loads only after Analytics consent.** No advertising tag loads before Advertising consent.
- Choice stored first-party in `localStorage['sk_consent']` `{v,necessary,analytics,ads,ts}`; re-applied silently on later visits.
- Attribution durability: captured in-memory immediately; persisted to `localStorage` only once
  Analytics **or** Advertising consent is granted (before that, `sessionStorage` only), then promoted on consent.

---

## 10.3 THE EVENT DICTIONARY (internal taxonomy — names are contractual)

Every event carries, in addition to its own params:
`event_id`, `page_path`, `language`, `device_type`, `source`, `medium`, `campaign`, `content`,
`first_source`, `first_campaign`, `landing_page`, `transport_type:'beacon'`, and — **only with Analytics
consent** — `visitor_id`, `session_id`.

| Event | Trigger | Extra params | Fired by | Dedupe |
|---|---|---|---|---|
| `service_view` | page load on a service/guide page | `service_category` = head_spa \| facial \| laser \| gift_card | skines-tracker (auto) | once per page load |
| `booking_intent` | click a Fresha booking link | `button_text`, `button_location`, `destination_url`, `url_type:'booking'`, `service_category` | fresha-tracking → core | none (each click) |
| `gift_card_intent` | click a Fresha gift-card link | same, `url_type:'gift_card'` | fresha-tracking → core | none |
| `phone_click` | click any `tel:` link | `link_url`, `button_location` | skines-tracker (delegated) | none |
| `email_click` | click any `mailto:` link | `link_url`, `button_location` | skines-tracker (delegated) | none |
| `generate_lead` | tirage form success | `form_id`, `service_category` | skines-tracker via `skinesTrackLead` | once per formKey |

`button_location` ∈ `hero | navigation | mobile_nav | footer | services_section | page`.
**No `value`/`currency`/`transaction_id`/`items` on any event.**

### Retired (documented removal)
- `booking_button_click` → replaced by `booking_intent` / `gift_card_intent`.
- Inert `fbq` hook in fresha-tracking.js → removed (dead code; real Pixel comes as its own module).

---

## 10.4 Attribution snapshot (`skinesAttribution.snapshot()`)

```
visitor_id, session_id,
source, medium, campaign, content, term, landing_page, referrer,      ← last touch
first_source, first_medium, first_campaign, first_landing, first_referrer, first_ts,
fbclid, ttclid, gclid, fbc                                            ← click IDs (fbc = fb.1.<ts>.<fbclid>)
```
Channel priority: UTM → click-id → referrer classification (organic/social/referral) → direct.
`first_touch` is written once and never overwritten; `last_touch` refreshes only on a new attribution signal.

---

## 10.5 ⚠️ GA4 UI ACTIONS YOU MUST COMPLETE MANUALLY

The code emits the events; these are property-side settings only the account owner can set.
Apply to **both** properties (A `G-VFB8SY59FX`, B `G-N46K5NG8TW`) unless noted.

1. **Update Key Events (conversions).** Remove/replace any key event named `booking_button_click`.
   Mark as Key Events: `booking_intent`, `generate_lead`, and (optionally) `phone_click`, `email_click`.
   **Do NOT** mark `service_view` or `page_view` as conversions.
2. **Register Custom Dimensions** (Admin → Custom definitions → event-scoped) so params appear in reports:
   `event_id`, `button_location`, `service_category`, `url_type`, `source`, `medium`, `campaign`,
   `content`, `first_source`, `first_campaign`, `landing_page`, `visitor_id`, `session_id`.
3. **Referral exclusion:** add `fresha.com` to unwanted-referrals / configure cross-domain if desired
   (reduces self-referral noise after the Fresha handoff). Admin → Data streams → Configure tag settings.
4. **Designate the reporting property.** Property A `G-VFB8SY59FX` is the primary business-reporting
   property; B `G-N46K5NG8TW` is the secondary destination (every event reaches both by design).
5. **Do NOT** attach revenue to `booking_intent`. It is intent, not a sale.

---

## 10.6 Meta Pixel mapping (implemented as a separate, ads-consent-gated module)

Browser Pixel only in this phase (CAPI is a later commit). The Pixel loads and fires **only after
Advertising consent**. `eventID` = the event's `event_id` (reserved for future CAPI deduplication).
No value/currency is sent.

| Internal event | Meta standard event | Notes |
|---|---|---|
| `service_view` | `ViewContent` | `content_category` = service_category |
| `booking_intent` | `InitiateCheckout` | honest funnel stage — NOT Purchase |
| `gift_card_intent` | `InitiateCheckout` | `content_category:'gift_card'` |
| `phone_click` / `email_click` | `Contact` | — |
| `generate_lead` | `Lead` | tirage giveaway |
| (page load) | `PageView` | after consent |

`CompletedBooking` / `Purchase` are intentionally never mapped until verified Fresha data exists.
