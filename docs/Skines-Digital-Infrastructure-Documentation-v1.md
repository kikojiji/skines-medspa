# Skines Digital Infrastructure Documentation — v1

**Subject:** Skines Med Spa & Wellness — skines.ca
**Type:** Current-state technical reference (audit only — NO fixes, NO recommendations)
**Date:** 2026-07-14
**Author:** Audit Engineer pass over the deployed codebase
**Evidence basis:** Every statement below is verified against the actual repository/deployed code. Anything that could NOT be verified from code is explicitly marked `🔒 REQUIRES LOGIN/SCREENSHOT — NOT VERIFIED`.

> **Method note / honesty flag.** During an earlier verbal audit two claims were made that this document CORRECTS after reading the code:
> 1. ❌ "Booking buttons fire zero events" — **WRONG.** `booking_button_click` fires on 14 pages (see §5, §6).
> 2. ❌ "`skinesTrackLead` is undefined/broken" — **WRONG.** It is defined in `assets/js/lead-tracking.js` and loaded. It works.
> This is exactly why knowledge extraction precedes fixing.

---

## 1. ARCHITECTURE — how the site actually works

### 1.1 Hosting & delivery stack (verified)
```
Visitor
   │
   ▼
Cloudflare (CDN / proxy / DNS)         ← server header: cloudflare
   │  ├─ Cloudflare R2 bucket           ← some videos: pub-d6e38d7bb4f542c895e6ab27796ee053.r2.dev
   │  └─ Cloudflare Turnstile           ← bot check on the tirage form only
   ▼
Vercel (origin)                        ← static HTML hosting + serverless functions
   │  ├─ Static: 18 × .html pages, /assets/*
   │  └─ Serverless API (Node, /api/*):
   │        • send-tirage.js       (LIVE, wired to tirage.html)
   │        • send-gift-card.js    (EXISTS but ORPHANED — not called by any page)
   │        • _lib/security.js, _lib/card-generator.js, _lib/fonts.js
   ▼
Browser renders page + runs client JS
```

- **No build framework.** Plain static HTML/CSS/JS. No React/Next, no bundler. Scripts are hand-included per page.
- **No Google Tag Manager.** `gtag.js` is hardcoded directly into every page `<head>`. There is no container, so all tag logic lives in source files, not a GTM UI.
- **Two domains observed in code:** `skines.ca` (primary), `skines.info` (referenced 2×), `www.skines.ca`. API is served from `api.skines.ca`.

### 1.2 Page inventory (18 HTML pages)
`index` · `head-spa` · `facial` · `laser` · `reviews` · `cartes-cadeaux` (gift cards) · `visit-us` · `your-visit` · `parking` · `insurance` · `tirage` (giveaway) · `menu` · `head-spa-guide` · `laser-guide` · `facial-guide` · `privacy-policy` · `terms-and-conditions` · `cookie-policy`
- **14 of 18** are bilingual FR/EN via `data-fr` / `data-en` attributes (client-side i18n, `assets/js/i18n.js`).

---

## 2. WHAT EXISTS (verified present in code)

| System | ID / detail | Where |
|---|---|---|
| **Google Analytics 4 — Property A** | `G-VFB8SY59FX` ("Fresha" property per commit history) | all 18 pages, hardcoded in head |
| **Google Analytics 4 — Property B** | `G-N46K5NG8TW` ("Skines" property, added as 2nd gtag destination) | all 18 pages — **dual-tagged**, both fire on every hit |
| **Microsoft Clarity** | project id `xabkor1h4j` | inline script, 18 pages (session recording + heatmaps) |
| **GA4 event: `booking_button_click`** | custom event w/ rich params | `assets/js/fresha-tracking.js`, loaded on **14 pages** |
| **GA4 event: `generate_lead`** | fires once, on tirage form success only | `assets/js/lead-tracking.js`, loaded on **tirage.html only** |
| **Booking platform** | Fresha, salon slug `glowch-bod1k4s2`, `pId=1273288` | 124 outbound links (`/book-now/.../all-offer`) |
| **Gift-card sales path** | Fresha `/book-now/.../gift-cards` | cartes-cadeaux + others |
| **Transactional email** | Resend API (`api.resend.com`) | `api/send-tirage.js`, `api/send-gift-card.js` |
| **Sequential lead IDs / dedupe** | Upstash Redis (REST) | `api/send-tirage.js` (env: `UPSTASH_REDIS_REST_URL/TOKEN`) |
| **Bot protection** | Cloudflare Turnstile (env: `TURNSTILE_SECRET_KEY`) | tirage form only |
| **Structured data (Schema.org)** | JSON-LD, extensive (see §? below) | most pages |
| **Sitemap / robots** | `sitemap.xml` (17 URLs incl. 3 legal), `robots.txt` Allow all | root |
| **Video CDN** | Cloudflare R2 public dev URL + local `/assets/videos` | hero + reviews videos |
| **Animation libs** | Lenis (jsdelivr), GSAP + ScrollTrigger (cdnjs) | index and others |

### 2.1 Schema.org (structured data) — what's actually emitted
Aggregate `@type` counts across all pages:
```
63 Question / 63 Answer / 9 FAQPage      → strong FAQ coverage
22 Service / 19 Offer / 1 OfferCatalog   → services + pricing marked up
 6 Organization / 4 SpaOrBeautySalon
 1 HealthAndBeautyBusiness
 5 PostalAddress / 5 GeoCoordinates / 5 OpeningHoursSpecification
10 BreadcrumbList / 19 ListItem
 3 Article (the guide pages) / 2 ImageObject / 1 WebSite
```
- Primary business entity type in use: **`SpaOrBeautySalon`** (+ one `HealthAndBeautyBusiness`). NOTE: no `MedicalBusiness`/`MedicalClinic` type despite "Medical Spa" positioning — stated as fact, not a recommendation.
- `sameAs` entity links (homepage): Instagram `skines.ca`, TikTok `@skines.headspa`, Facebook `profile.php?id=61561926307617`, Fresha booking URL.

### 2.2 The `booking_button_click` event — exact payload (verified)
Fires on **capture-phase click** of any `<a href*="fresha.com">`, on 14 pages, without blocking navigation. Sends to GA4 via `gtag('event','booking_button_click', …)`. Parameters:
```
page_url, page_path, button_text, button_location, fresha_url,
url_type (booking | gift_card), timestamp, device_type (mobile|tablet|desktop)
```
- `button_location` is derived by walking the DOM (values: hero, navigation, mobile_nav, footer, reviews_cta, booking_section, service_card, services_section, page).
- Has an **inert Meta Pixel hook**: `if (typeof window.fbq === 'function') fbq('trackCustom','BookingButtonClick',…)` — dormant because `fbq` is never loaded.

### 2.3 The `generate_lead` event — exact behaviour (verified)
`assets/js/lead-tracking.js`: exposes `window.skinesTrackLead(formKey)`. Fires `gtag('event','generate_lead')` **once per formKey** (in-memory dedupe), only from a form's success callback. Called from `tirage.html` on successful giveaway submission. Broadcasts to both GA4 properties (both are `config`'d on the page).

---

## 3. WHAT DOES NOT EXIST (verified absent — listed, NOT fixed)

| Missing system | Verification |
|---|---|
| **Meta Pixel** | zero `fbq` / `fbevents.js` / `connect.facebook.net` / `_fbp` in any file |
| **Meta Conversions API (server-side)** | no `graph.facebook.com`, no CAPI call in any `/api` function |
| **TikTok Pixel / Events API** | zero `ttq` / `analytics.tiktok.com` — only profile links |
| **Google Tag Manager** | no `GTM-` container; gtag loaded directly |
| **Google Consent Mode v2** | no `gtag('consent','default',…)` anywhere |
| **Cookie consent banner** | no consent UI — Clarity + GA4 fire on load unconditionally |
| **GA4 cross-domain linker to Fresha** | no `linker`/`allow_linker`/`domains:['fresha.com']` config |
| **UTM tags on outbound Fresha links** | 124 Fresha links, none carry `utm_*` |
| **Phone-click event** (`tel:+14382605660`) | no listener; plain `<a href="tel:">` |
| **Email-click event** (`mailto:Info@skines.ca`) | no listener |
| **Gift-card purchase/conversion event** | cartes-cadeaux fires no `purchase`/lead; sale happens on Fresha |
| **Scroll-depth / video-play / outbound-click events** | none in code |
| **hreflang tags** (FR/EN) | 0 on homepage despite bilingual content |
| **Server-side GA4 Measurement Protocol** | not used; APIs send email only |
| **WhatsApp integration** | none in code |

---

## 4. DATA FLOW MAP — where tracking survives and where it breaks

### 4.1 Booking journey (the money path)
```
Instagram / TikTok / Facebook / Google / Direct
        │  (ad/organic click → lands on skines.ca)
        ▼
skines.ca page  ── GA4 (both properties) records session_start, page_view ✅
        │           Clarity records the session ✅
        ▼
User clicks "Réserver" (Fresha <a href>)
        │           GA4 booking_button_click fires ✅  (INTENT captured)
        │           ⚠️ NO utm on the outbound URL
        │           ⚠️ NO cross-domain linker (GA client_id NOT passed)
        ▼
╔══════════════════ TRACKING BREAKS HERE ══════════════════╗
║  fresha.com  (separate domain, not controlled by site)   ║
║  • New GA client_id → session counted as SELF-REFERRAL   ║
║  • No Skines pixel/GA runs on Fresha checkout            ║
║  • Actual booking + payment happen here, invisible       ║
╚══════════════════════════════════════════════════════════╝
        ▼
Booking confirmed on Fresha
        ▼
Fresha sends its own confirmation email (Fresha system)
```
**Net:** The site can measure **booking INTENT** (the click) with source/medium, but **cannot measure a completed BOOKING or its revenue**, and cannot join the click to the sale. Attribution terminates at the Fresha handoff.

### 4.2 Tirage (giveaway) lead journey — the one closed loop
```
Visitor → tirage.html → fills form
        │  Turnstile bot check (Cloudflare) ✅
        ▼
POST https://api.skines.ca/api/send-tirage  (Vercel serverless)
        │  • validates + sanitizes + rate-limits (security.js)
        │  • Upstash Redis: sequential ID + dedupe (email/phone/username)
        │  • Resend: 2 emails (participant + admin skinesca@gmail.com)
        ▼
On success → window.skinesTrackLead('tirage') → GA4 generate_lead ✅
```
**Net:** This is the ONLY fully-closed, server-validated conversion loop on the property.

### 4.3 Gift-card journey
```
Visitor → cartes-cadeaux.html → clicks Fresha gift-card link
        │  GA4 booking_button_click (url_type=gift_card) ✅ intent only
        ▼
fresha.com/.../gift-cards  → purchase happens on Fresha (invisible, as §4.1)

[ Separate, ORPHANED: api/send-gift-card.js exists (Resend email flow,
  expects amount/fromName/toName/toEmail/senderEmail) but NO page calls it. ]
```

---

## 5. CONVERSION MAP — present vs missing

| Conversion | Tracked? | Mechanism | Gap |
|---|---|---|---|
| Booking button click (intent) | ✅ | GA4 `booking_button_click` | intent only, not the sale |
| Completed booking | ❌ | — | happens on Fresha, no signal back |
| Booking revenue ($) | ❌ | — | not captured anywhere on-site |
| Giveaway lead (tirage) | ✅ | GA4 `generate_lead` + email + Redis | complete loop |
| Gift-card click (intent) | ✅ | `booking_button_click` (url_type=gift_card) | intent only |
| Gift-card purchase | ❌ | — | on Fresha |
| Phone call click | ❌ | — | no event on `tel:` |
| Email click | ❌ | — | no event on `mailto:` |
| Contact-form submit | ❌ (n/a) | — | no general contact form exists (only tirage) |
| Newsletter signup | ❌ (n/a) | — | none on site |
| Scroll / video / outbound | ❌ | — | not implemented |
| Meta ad conversions | ❌ | — | no Pixel, no CAPI |
| TikTok conversions | ❌ | — | no pixel |

---

## 6. ALL SCRIPTS — who loads what, in what order

### 6.1 Head of every page (load order)
```
1. gtag.js (async)            src=googletagmanager.com/gtag/js?id=G-VFB8SY59FX
2. inline gtag config         config G-VFB8SY59FX ; config G-N46K5NG8TW
3. inline Microsoft Clarity   clarity project xabkor1h4j
   (then meta tags, fonts: fonts.googleapis.com / fonts.gstatic.com)
```
### 6.2 Homepage extra libs (index.html)
```
cdn.jsdelivr.net  → @studio-freight/lenis@1.0.42  (smooth scroll)
cdnjs.cloudflare  → gsap@3.12.5 + ScrollTrigger    (animations)
google.com/maps   → embedded map iframe (19 Av. Shamrock)
```
### 6.3 Site JS (assets/js), load points
```
i18n.js?v=4            → FR/EN toggle           (bilingual pages)
fresha-tracking.js     → booking_button_click   (14 pages; NOT tirage)
lead-tracking.js?v=1   → skinesTrackLead/generate_lead  (tirage.html only)
```
### 6.4 tirage.html additional
```
challenges.cloudflare.com/turnstile/v0/api.js  → Turnstile widget
```
### 6.5 Serverless (Vercel, /api)
```
send-tirage.js      imports _lib/security.js  → Resend + Upstash Redis   [WIRED]
send-gift-card.js   imports _lib/security.js, _lib/card-generator.js, _lib/fonts.js
                    → Resend                                              [ORPHANED]
_lib/security.js    → escapeHtml, sanitize, validateEmail/Phone/Required,
                      honeypot, rateLimit, getClientIp, sendViaResend, CORS
```

---

## 7. ALL IDs, KEYS, DOMAINS (secrets NOT exposed — names only)

### 7.1 Analytics / tracking IDs (public by nature)
```
GA4 property A : G-VFB8SY59FX   (labelled "Fresha" in commit history)
GA4 property B : G-N46K5NG8TW   (labelled "Skines", 2nd destination)
Microsoft Clarity : xabkor1h4j
Meta Pixel ID     : (none)
TikTok Pixel ID   : (none)
GTM container     : (none)
```
### 7.2 Booking / commerce
```
Fresha salon slug : glowch-bod1k4s2
Fresha pId        : 1273288
Fresha booking    : /book-now/glowch-bod1k4s2/all-offer?share=true&pId=1273288
Fresha gift cards : /book-now/glowch-bod1k4s2/gift-cards?share=true&pId=1273288
```
### 7.3 Domains & endpoints
```
Primary site   : skines.ca  (+ www.skines.ca)
Secondary ref  : skines.info (+ www.skines.info)  ← appears 2× in code
API            : api.skines.ca/api/send-tirage  (send-gift-card = defined, unused)
Video CDN (R2) : pub-d6e38d7bb4f542c895e6ab27796ee053.r2.dev
```
### 7.4 Server-side env vars (secret VALUES never in repo — names only)
```
UPSTASH_REDIS_REST_URL     UPSTASH_REDIS_REST_TOKEN
TURNSTILE_SECRET_KEY       (Resend API key — via env, referenced in _lib)
```
### 7.5 Cross-domain / referral / consent status
```
Cross-domain linker to Fresha : NOT configured
UTM on outbound Fresha links  : NONE
Fresha in GA4 referral-exclusion list : 🔒 GA4 UI — NOT VERIFIED (no code signal)
Google Consent Mode v2        : NOT present
```

---

## 8. ENTITY MAP — linked accounts (from code) + consistency findings

### 8.1 Handles referenced in code
```
Instagram : instagram.com/skines.ca        (35× — footer/schema, primary)
            instagram.com/skines.spa        ( 5× — conflicting)
TikTok    : tiktok.com/@skines.headspa      (35× — primary)
            tiktok.com/@skines.spa          ( 5× — conflicting)
Facebook  : facebook.com/profile.php?id=61561926307617   (35×)
YouTube   : youtube.com/channel/UCfaDRlj07kg2zGlH6AsnFUw (31×)
Fresha    : glowch-bod1k4s2 / pId 1273288
Google    : Maps embed for 19 Av. Shamrock, Montréal QC H2S 1A3
```
### 8.2 ⚠️ Entity-consistency findings (fact, not fix)
- **Two different Instagram handles** in code: `skines.ca` and `skines.spa`.
- **Two different TikTok handles** in code: `@skines.headspa` and `@skines.spa`.
- `CLAUDE.md` project note states the real IG/TikTok handle is `@skines.spa` and the GBP name is "Skines Head Spa & wellness" — i.e. the *live third-party* handles may differ from what schema `sameAs` asserts. This split weakens the Knowledge-Graph entity.
- These are **assertions the site makes about itself**; whether each destination account exists/matches is `🔒 REQUIRES LOGIN — NOT VERIFIED`.

### 8.3 🔒 NOT VERIFIABLE FROM CODE (needs dashboard screenshots)
Meta Business Manager, Ad Account, Events Manager/Dataset, CAPI, Aggregated Event Measurement, domain verification, IG/FB page roles & permissions, Meta Verified, WhatsApp, TikTok Business Center/pixel/Shop, GA4 property settings (Signals, retention, audiences, conversions marked, referral exclusions), GTM (none exists), Fresha plan tier & its Meta/marketing integrations.

---

## 9. CURRENT STATE SUMMARY — the plain truth

**What CAN be measured today:**
- On-site sessions, page views, geo, device — via GA4 (dual property) + Clarity session recordings.
- Booking/gift-card **click intent** with on-page location + device (`booking_button_click`), 14 pages.
- Giveaway leads end-to-end (`generate_lead` + validated server record + email).
- Qualitative behaviour (Clarity heatmaps/recordings).

**What CANNOT be measured today:**
- Any **completed booking**, its **revenue**, or **which channel produced a paying customer** — the loop breaks at the Fresha domain handoff (no linker, no UTM, no return signal).
- **Any Meta ad performance** (no Pixel, no CAPI) → Meta optimizes blind.
- **Any TikTok performance** (no pixel).
- **Phone-call and email conversions** (high-intent for a med spa).
- **Gift-card purchases** (sale on Fresha; the on-site email API is orphaned).
- Scroll/video/outbound engagement.

**Dependencies & couplings (single points of failure):**
- Conversion reality lives on **Fresha**, which the site cannot instrument → attribution ceiling is structural, not a settings toggle.
- All tag logic is **hardcoded across 18 files** (no GTM) → every tracking change = code deploy on every page.
- **Dual GA4 tagging** means every event is duplicated into two properties (by design) — reporting must always specify which property.
- **No consent layer** → GA4 + Clarity run before consent, a live Quebec Law 25 exposure (documented as fact).
- Legal pages, footer links, and sitemap for privacy/terms/cookies are present and live (200) as of 2026-07-14.

---

*End of Skines Digital Infrastructure Documentation v1. This file documents current state only. No changes were made to tracking, pages, or configuration in producing it.*
