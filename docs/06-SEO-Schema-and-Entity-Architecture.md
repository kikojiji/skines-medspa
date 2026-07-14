# Doc 06 — SEO, Schema & Entity Architecture

**Basis:** Verified from deployed code. Documentation only.

---

## 6.1 SEO architecture (on-page, verified)
- **Titles:** unique, keyword + geo + price patterns per page (e.g. "Épilation Laser Montréal dès 40$ – Skines Med Spa & Wellness").
- **Meta descriptions:** present and unique on all content pages.
- **Canonicals:** present on all content + legal pages (self-referential, `https://skines.ca/<slug>`).
- **Robots:** default indexable; **`/menu` = `noindex,nofollow`**; legal pages `index,follow`.
- **OpenGraph + Twitter cards:** present (index og:7/twitter:4; service pages og:5/twitter:4). Shared OG image `https://skines.ca/assets/og-logo3.webp?v=2`.
- **Sitemap:** `sitemap.xml`, 17 URLs (excludes `/menu`), includes 3 legal pages (added 2026-07-14).
- **robots.txt:** `User-agent: * / Allow: /` + sitemap reference.
- **URL structure:** clean, extensionless in production (Vercel rewrites `.html`), lowercase, hyphenated.

### SEO gaps (documented, not fixed)
- **`hreflang`: absent (0 on homepage)** despite FR/EN bilingual content served from one URL via JS toggle → language variants not signposted to search engines.
- Language switch is client-side only (no separate `/en/` URLs) → EN content not independently indexable.

## 6.2 Schema.org architecture (JSON-LD)
Aggregate across site:
```
FAQ layer      : 9 FAQPage, 63 Question, 63 Answer         (strong)
Service layer  : 22 Service, 19 Offer, 1 OfferCatalog       (services + pricing)
Business layer : 4 SpaOrBeautySalon, 1 HealthAndBeautyBusiness, 6 Organization
Local layer    : 5 PostalAddress, 5 GeoCoordinates, 5 OpeningHoursSpecification, 4 City
Nav layer      : 10 BreadcrumbList, 19 ListItem
Content layer  : 3 Article (guides), 2 ImageObject, 1 WebSite
```
### Per-page primary schema
| Page | Primary business type |
|---|---|
| index | `SpaOrBeautySalon` + `WebSite` + `OfferCatalog` |
| head-spa / facial / laser | `SpaOrBeautySalon` + `Service` + `Offer` + `FAQPage` |
| visit-us | `HealthAndBeautyBusiness` |
| guides (×3) | `Article` + `FAQPage` + `Organization` |
| reviews / parking | `BreadcrumbList` only |
| tirage | none |

### Schema observations (fact, not fix)
- **Business type is inconsistent across pages:** `SpaOrBeautySalon` (most), `HealthAndBeautyBusiness` (visit-us), `Organization` (guides). No `MedicalBusiness`/`MedicalClinic`/`DaySpa` despite "Medical Spa" positioning.
- Hours in schema: `09:00–22:00`.
- No `AggregateRating` schema found despite "1600+ avis" marketing claim (reviews page carries only Breadcrumb schema).

## 6.3 Entity architecture (identity graph the site asserts)
### `sameAs` (homepage) — the canonical entity links
```
Instagram : https://www.instagram.com/skines.ca/
TikTok    : https://www.tiktok.com/@skines.headspa
Facebook  : https://www.facebook.com/profile.php?id=61561926307617
Fresha    : https://www.fresha.com/book-now/glowch-bod1k4s2/all-offer?...
```
### Handles referenced site-wide (frequency)
| Platform | Handle A (dominant) | Handle B (conflicting) |
|---|---|---|
| Instagram | `skines.ca` (35×) | `skines.spa` (5×) |
| TikTok | `@skines.headspa` (35×) | `@skines.spa` (5×) |
| Facebook | `profile.php?id=61561926307617` (35×) | — |
| YouTube | `channel/UCfaDRlj07kg2zGlH6AsnFUw` (31×) | — |

### Entity-consistency findings (documented, not fixed)
- **Two Instagram identities** and **two TikTok identities** appear in code.
- `CLAUDE.md` records that the *live* IG/TikTok handle is `@skines.spa` and the Google Business Profile name is "Skines Head Spa & wellness" — i.e. schema `sameAs` may assert handles that differ from the live accounts.
- Brand name itself standardized to **"Skines Med Spa & Wellness"** in code, but historical variants (Skines Spa, Skines Head Spa) exist in third-party/GBP contexts (per CLAUDE.md).
- **Net:** the Knowledge-Graph entity is fragmented across ≥2 IG and ≥2 TikTok references + brand-name variants. Whether each destination account exists/matches: `🔒 requires login — not verified`.

## 6.4 Domains in the identity surface
```
Primary : skines.ca (+ www)
Alt     : skines.info (+ www)   ← referenced 2× in code; role 🔒 not verified
API     : api.skines.ca
Media   : pub-d6e38d7bb4f542c895e6ab27796ee053.r2.dev (Cloudflare R2)
```

---
*End Doc 06.*
