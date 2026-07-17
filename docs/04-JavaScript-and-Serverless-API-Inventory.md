# Doc 04 — JavaScript & Serverless/API Inventory

**Scope:** Every JS file, every serverless function, what each loads/calls, in what order.
**Basis:** Verified from deployed code. Documentation only.

---

## 4.1 Client-side JavaScript (`assets/js/`)

| File | Size | Purpose | Loaded by | Exposes / calls |
|---|---|---|---|---|
| `i18n.js` | ~16.8 KB | FR/EN translation engine. Inline `TRANSLATIONS` object (mirrors `/locales/*.json`), supports `data-i18n`, `data-i18n-html`, `data-i18n-placeholder`, `data-i18n-aria`, `data-i18n-title`, legacy `data-fr`/`data-en`. | 14 bilingual pages | DOM text swap; no tracking |
| `fresha-tracking.js` | ~4.4 KB | Fires `booking_button_click` on Fresha link clicks (capture phase). Inert `fbq` hook. Dev console logging on localhost. | 14 pages (NOT tirage) | `window.gtag('event',…)`; optional `window.fbq` |
| `lead-tracking.js` | ~0.8 KB | `window.skinesTrackLead(formKey)` → `generate_lead` once per key. | tirage.html | `window.gtag`; `window.skinesTrackLead` |

### Third-party client libraries (CDN, homepage + others)
```
gtag.js                 googletagmanager.com/gtag/js
Clarity                 clarity.ms/tag/xabkor1h4j
Lenis 1.0.42            cdn.jsdelivr.net (@studio-freight/lenis) — smooth scroll
GSAP 3.12.5             cdnjs.cloudflare.com — animation
ScrollTrigger 3.12.5    cdnjs.cloudflare.com — scroll animation
Cloudflare Turnstile    challenges.cloudflare.com/turnstile — bot check (tirage only)
Google Maps embed       google.com/maps (iframe)
Google Fonts            fonts.googleapis.com / fonts.gstatic.com
```

## 4.2 Serverless API (Vercel, `/api`, Node ES modules)

| Endpoint | Status | Method | Purpose | External services |
|---|---|---|---|---|
| `POST /api/send-tirage` | **WIRED** (tirage.html) | POST JSON | Giveaway registration | Resend (email ×2), Upstash Redis (seq ID + dedupe), Turnstile (verify) |
| `POST /api/send-gift-card` | **ORPHANED** (no page calls it) | POST JSON | Gift-card email + generated card image | Resend, sharp (image), bundled fonts |

### `/api/send-tirage.js` — flow (verified)
```
1. requireJson + setCorsHeaders
2. isHoneypotTriggered(body.website)         → silent drop if bot
3. rateLimit(getClientIp)                    → throttle abuse
4. Turnstile verify (TURNSTILE_SECRET_KEY)
5. validateRequired(firstname,lastname,phone,email,consent) + validateEmail/Phone
6. Upstash Redis: nextSeqId('customer'|'admin') + dedupe sets (email/phone/username)
7. sendViaResend:  participant email (FROM noreply@skines.ca)
                   admin email    (to skinesca@gmail.com)
8. respond {success:true, id:"SK-00XX"}
Client on success → skinesTrackLead('tirage') → GA4 generate_lead
```
- **From addresses:** `Skines Head Spa <noreply@skines.ca>` / `<Info@skines.ca>`. **Admin inbox:** `skinesca@gmail.com`.
- **Redis seed:** customer seq starts 65 (first ID `SK-0066`), admin seq starts 19 (`SK-0020`).

### `/api/_lib/` shared modules
| File | Exports / role |
|---|---|
| `security.js` | `escapeHtml`, `sanitizeText`, `validatePhone`, `validateEmail`, `validateRequired`, `isHoneypotTriggered`, `requireJson`, `setCorsHeaders`, `rateLimit`, `getClientIp`, `sendViaResend` (async) |
| `card-generator.js` | Server-side participant card image (800×1100) via `sharp`; fetches logo from skines.ca; fonts from `fonts.js` |
| `fonts.js` | Base64 TTF fonts (`FONT_SANS_B64`, `FONT_BOLD_B64`) for Vercel Linux runtime |

## 4.3 Environment variables (names only — values never in repo)
```
UPSTASH_REDIS_REST_URL      UPSTASH_REDIS_REST_TOKEN
TURNSTILE_SECRET_KEY        (Resend API key via env)
```

## 4.4 Load-order summary (homepage)
```
head:  gtag loader → gtag config(×2) → Clarity → meta/fonts → Lenis → GSAP → ScrollTrigger
body:  page content → Maps iframe → i18n.js → fresha-tracking.js
```

---
*End Doc 04.*
