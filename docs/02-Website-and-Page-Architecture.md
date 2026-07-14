# Doc 02 — Website & Page Architecture

**Scope:** Page inventory, reusable components, business processes, rendering model.
**Basis:** Verified from deployed code. `🔒 = requires login/screenshot, not verified.`
**Rule:** Documentation only. No fixes, no recommendations.

---

## 2.1 Rendering model
- **Static multi-page site.** 18 hand-authored `.html` files. No SSR, no build step, no framework, no bundler, no component system — shared blocks (nav/footer) are **duplicated inline** in each file.
- **Client-side i18n** (FR default / EN) via `assets/js/i18n.js` toggling `data-fr`/`data-en` + `data-i18n*` attributes. Present on 14/18 pages.
- **Hosting:** Vercel origin behind Cloudflare (CDN/proxy/DNS). Serverless functions under `/api`.

## 2.2 Page inventory (18 pages)

| Page (URL) | Purpose | Indexable | Schema types | Bilingual |
|---|---|---|---|---|
| `/` (index) | Homepage / hub | ✅ canonical | SpaOrBeautySalon, WebSite, OfferCatalog, Breadcrumb, Geo/Postal/Hours, ImageObject | ✅ |
| `/head-spa` | Service: Japanese Head Spa (Scalpcial) | ✅ | SpaOrBeautySalon, Service, Offer, FAQPage, City, Breadcrumb | ✅ |
| `/facial` | Service: Facials / HydraDermabrasion | ✅ | Service, Offer, FAQPage, City, Breadcrumb | ✅ |
| `/laser` | Service: Laser hair removal (Clarity II) | ✅ | Service, Offer, FAQPage, City, Breadcrumb | ✅ |
| `/reviews` | Social proof (1600+ reviews claim) | ✅ | Breadcrumb only | ✅ |
| `/cartes-cadeaux` | Gift cards (sold via Fresha) | ✅ | FAQPage, Breadcrumb | ✅ |
| `/visit-us` | Location / logistics | ✅ | HealthAndBeautyBusiness, Geo/Postal/Hours, Breadcrumb | ✅ |
| `/your-visit` | Pre-visit info (FAQ) | ✅ | FAQPage, Breadcrumb | ✅ |
| `/parking` | Parking info | ✅ | Breadcrumb | ✅ |
| `/insurance` | Insurance receipts info | ✅ | FAQPage, Breadcrumb | ✅ |
| `/tirage` | Giveaway lead-capture form | ✅ | none | ✅ |
| `/menu` | Navigation index page | ❌ `noindex,nofollow` | none | partial |
| `/head-spa-guide` | SEO guide article | ✅ | Article, FAQPage, Organization | — |
| `/laser-guide` | SEO guide article | ✅ | Article, FAQPage, Organization | — |
| `/facial-guide` | SEO guide article | ✅ | Article, FAQPage, Organization | — |
| `/privacy-policy` | Legal | ✅ `index,follow` | none | — |
| `/terms-and-conditions` | Legal | ✅ `index,follow` | none | — |
| `/cookie-policy` | Legal | ✅ `index,follow` | none | — |

- Only page explicitly blocked from indexing: **`/menu`** (`noindex,nofollow`).
- Sitemap lists 17 URLs (all except `/menu`).

## 2.3 Reusable components (duplicated per page, not modularized)

| Component | Appears on | Function |
|---|---|---|
| `#mainNav` (desktop nav) | 15 pages | logo + menu, scroll-state classes |
| `#mobileNav` (drawer) | 13 pages | mobile hamburger menu |
| `.site-footer` | 18 pages | services links, legal links (privacy/terms/cookies), social, copyright |
| `#searchOverlay` | 6 pages | client-side search index/overlay |
| Tirage popup (`sp-stones`/`tirag.popup`) | 10 pages | giveaway promo modal |
| `#fclOverlay` (service detail modal) | 3 pages (facial/laser/head-spa) | slide-up detail panel w/ photo gallery |
| Fresha booking buttons | 14 pages (124 links) | outbound to Fresha |

## 2.4 Business facts embedded in the site (verified strings)
```
Legal/brand name : Skines Med Spa & Wellness
Address          : 19 Av. Shamrock, Montréal, QC H2S 1A3
Phone            : +1 (438) 260-5660  (tel:+14382605660)
Email            : Info@skines.ca  (admin ops: skinesca@gmail.com)
Hours (schema)   : opens 09:00 — closes 22:00
Reviews claim    : "plus de 1600 avis" / 1600 (source: Google, per copy)
Services         : Head Spa (Scalpcial), Facials/HydraDermabrasion, Laser (Clarity II), Gift cards
Positioning      : Luxury Japanese Head Spa + Medical Spa
```

## 2.5 Business processes (as implemented on-site)
1. **Discover** → organic/social/direct lands on a page (GA4 + Clarity record).
2. **Evaluate** → service pages, guides, reviews, FAQ (schema-marked).
3. **Convert intent** → click "Réserver" (Fresha) → `booking_button_click` fires.
4. **Transact** → on Fresha (off-site, not instrumented).
5. **Lead alt-path** → giveaway form (`/tirage`) → server-validated → email + `generate_lead`.
6. **Gift path** → Fresha gift-card link (off-site).
7. **Support/logistics** → visit-us / parking / insurance / your-visit info pages.

---
*End Doc 02.*
