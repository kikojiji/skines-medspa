# Doc 07 — Dependencies, External Services, Integrations & Identifier Registry

**Basis:** Verified from deployed code. Secrets never exposed — names only. Documentation only.

---

## 7.1 External services / third-party integrations (full surface)
| Service | Category | Role | Where | Data touched |
|---|---|---|---|---|
| **Vercel** | Hosting | Static + serverless origin | infra | requests, form payloads |
| **Cloudflare** | CDN/DNS/proxy | Edge, caching, DNS | infra (all traffic) | requests |
| **Cloudflare R2** | Object storage | Video hosting | media | video assets |
| **Cloudflare Turnstile** | Bot mgmt | Form bot check | tirage | token |
| **Fresha** | Booking SaaS | Bookings + gift cards + payments | 124 links | PII + payment (on Fresha) |
| **Resend** | Email API | Transactional email | serverless | name/email/phone |
| **Upstash Redis** | Datastore | Sequential IDs + dedupe | serverless | email/phone/username hashes |
| **Google Analytics 4** | Analytics | Traffic + events (dual property) | all pages | pseudonymous usage |
| **Microsoft Clarity** | Analytics | Session recording/heatmaps | all pages | session behaviour |
| **Google Fonts** | Assets | Web fonts | all pages | IP (font fetch) |
| **Google Maps** | Embed | Location iframe | index/visit | — |
| **jsDelivr** | CDN | Lenis lib | index | — |
| **cdnjs (Cloudflare)** | CDN | GSAP/ScrollTrigger | index | — |
| **YouTube** | Social | Channel links / embeds | multiple | — |
| **Instagram / TikTok / Facebook** | Social | Profile links (no pixels) | all | — |

## 7.2 Integrations that DO NOT exist (verified absent)
```
Meta Pixel · Meta Conversions API · Meta Catalog/Commerce · WhatsApp
TikTok Pixel · TikTok Events API · TikTok Shop
Google Tag Manager · Google Ads tag/gtag conversion · Google Merchant
Consent Management Platform / cookie banner
GA4 Measurement Protocol (server-side) · Server-side tagging
CRM · Email marketing platform (Mailchimp/Klaviyo/etc.) · SMS platform
Zapier/Make webhooks · Any booking API integration with Fresha
```

## 7.3 IDENTIFIER REGISTRY (single source of truth)

### Analytics / marketing
```
GA4 Property A ........ G-VFB8SY59FX      ("Fresha" property)
GA4 Property B ........ G-N46K5NG8TW      ("Skines" property)
Microsoft Clarity ..... xabkor1h4j
Meta Pixel ............ (none)
Meta CAPI dataset ..... (none)
TikTok Pixel .......... (none)
GTM container ......... (none)
Google Ads ID ......... (none)
```
### Commerce / booking
```
Fresha salon slug ..... glowch-bod1k4s2
Fresha pId ............ 1273288
Booking URL ........... /book-now/glowch-bod1k4s2/all-offer?share=true&pId=1273288
Gift-card URL ......... /book-now/glowch-bod1k4s2/gift-cards?share=true&pId=1273288
```
### Social / entity
```
Instagram ............. skines.ca  (also: skines.spa)
TikTok ................ @skines.headspa  (also: @skines.spa)
Facebook page ......... profile.php?id=61561926307617
YouTube channel ....... UCfaDRlj07kg2zGlH6AsnFUw
```
### Domains / endpoints
```
Primary ............... skines.ca / www.skines.ca
Alt ................... skines.info / www.skines.info
API ................... api.skines.ca  (/api/send-tirage [live], /api/send-gift-card [orphaned])
Media CDN ............. pub-d6e38d7bb4f542c895e6ab27796ee053.r2.dev
```
### Contact / ops
```
Public email .......... Info@skines.ca
Admin/ops inbox ....... skinesca@gmail.com
Email FROM ............ noreply@skines.ca
Phone ................. +1 (438) 260-5660
Address ............... 19 Av. Shamrock, Montréal, QC H2S 1A3
```
### Secret env vars (values NOT in repo)
```
UPSTASH_REDIS_REST_URL · UPSTASH_REDIS_REST_TOKEN · TURNSTILE_SECRET_KEY · (Resend key)
```

## 7.4 Dependency risk couplings (fact)
- **Conversion depends on Fresha** (external, uninstrumentable from site).
- **Media depends on R2 public *dev* URL** (`*.r2.dev`) — a non-custom-domain bucket endpoint.
- **All tags hardcoded** (no GTM) → change surface = every HTML file.
- **Two GA4 properties** → double-counting by design; reporting must disambiguate.
- **Alt domain `skines.info`** present in code — purpose/redirect status `🔒 not verified`.

---
*End Doc 07.*
