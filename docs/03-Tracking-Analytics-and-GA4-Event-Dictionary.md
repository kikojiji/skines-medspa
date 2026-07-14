# Doc 03 — Tracking Architecture, Analytics Architecture & GA4 Event Dictionary

**Scope:** All measurement systems, the event inventory, and a full GA4 event dictionary.
**Basis:** Verified from deployed code. Documentation only — no fixes, no recommendations.

---

## 3.1 Tracking architecture (client-side, no GTM)
```
Every page <head>, fixed order:
 1) gtag.js loader     → id G-VFB8SY59FX
 2) inline gtag config → config G-VFB8SY59FX ; config G-N46K5NG8TW   (DUAL property)
 3) Microsoft Clarity  → project xabkor1h4j
Site JS (later in body):
 • i18n.js            (not tracking)
 • fresha-tracking.js → booking_button_click        (14 pages)
 • lead-tracking.js   → generate_lead via helper     (tirage only)
```
- **No Google Tag Manager.** Tags are hardcoded → every tracking change is a code deploy across files.
- **No Meta Pixel, no TikTok pixel, no CAPI.** (An inert `fbq` hook exists in fresha-tracking.js but `fbq` is never loaded.)
- **No Consent Mode v2, no consent gating.** GA4 + Clarity initialize on page load unconditionally.

## 3.2 Analytics architecture — GA4 dual-property
| Property | ID | Role (per commit history) | Receives |
|---|---|---|---|
| A | `G-VFB8SY59FX` | "Fresha" property (original) | all page_view + all custom events |
| B | `G-N46K5NG8TW` | "Skines" property (added 2nd destination) | same — every event duplicated |

- Both are `config`'d on every page → **all hits fire to both**. Any report must specify which property.
- `booking_button_click` code comments reference property A specifically, but because both are configured, the event reaches both.

## 3.3 Microsoft Clarity
- Project `xabkor1h4j`, inline loader on all 18 pages.
- Captures: session recordings, heatmaps, rage/dead clicks (Clarity defaults). Behavioural/qualitative only — not tied to conversions.

## 3.4 Event Inventory (every event the site can emit)

| Event name | Type | Trigger | File | Pages | Params |
|---|---|---|---|---|---|
| `page_view` | GA4 auto | page load (gtag config) | inline head | 18 | GA4 defaults |
| `session_start`, `first_visit`, scroll (GA4 Enhanced Measurement defaults) | GA4 auto | GA4 automatic | inline head | 18 | 🔒 depends on GA4 property settings — Enhanced Measurement toggles NOT verifiable from code |
| `booking_button_click` | GA4 custom | click any Fresha `<a>` (capture phase) | `fresha-tracking.js` | 14 | see dictionary §3.5 |
| `generate_lead` | GA4 recommended | tirage form success only | `lead-tracking.js` | tirage | (none) |
| `BookingButtonClick` | Meta custom (INERT) | same click, but `fbq` never loaded → never fires | `fresha-tracking.js` | 14 | mirrors booking params |

> Note: GA4 Enhanced Measurement (scroll, outbound click, site search, video) may add automatic events **if enabled in the GA4 UI** — that toggle state is `🔒 not verifiable from code`. No such events are defined in code.

## 3.5 GA4 EVENT DICTIONARY

### `booking_button_click` (custom)
- **Source:** `assets/js/fresha-tracking.js`
- **Fires when:** user clicks any `<a href*="fresha.com">`, detected via capture-phase DOM walk. Navigation NOT blocked.
- **Dedupe:** none (every click sends).
- **Transport:** default gtag transport. (Code comment claims `beacon`/`sendBeacon` but the params object does NOT set `transport_type:'beacon'` — documented as a fact/mismatch.)
- **Parameters:**
  | Param | Type | Values / meaning |
  |---|---|---|
  | `page_url` | string | `location.href` |
  | `page_path` | string | `location.pathname` |
  | `button_text` | string | trimmed link text, ≤120 chars |
  | `button_location` | string | `hero` \| `navigation` \| `mobile_nav` \| `footer` \| `reviews_cta` \| `booking_section` \| `service_card` \| `services_section` \| `page` |
  | `fresha_url` | string | full outbound Fresha href |
  | `url_type` | string | `booking` \| `gift_card` (by presence of `gift-cards` in URL) |
  | `timestamp` | string | ISO 8601 |
  | `device_type` | string | `mobile` \| `tablet` \| `desktop` (UA sniff) |

### `generate_lead` (recommended)
- **Source:** `assets/js/lead-tracking.js`, helper `window.skinesTrackLead(formKey)`.
- **Fires when:** tirage form POST returns `{success:true}` — success callback only.
- **Dedupe:** in-memory per `formKey` (won't double-fire same session).
- **Parameters:** none sent (bare `gtag('event','generate_lead')`).
- **Destinations:** both GA4 properties (both configured on page).

### GA4 parameters NOT collected anywhere in code
`value`, `currency`, `transaction_id`, `items[]`, `booking_id`, user-id/user properties — none present. No ecommerce/revenue parameters exist on any event.

---
*End Doc 03.*
