# JSON-LD diff preview — NOT APPLIED YET

This is a preview only. Nothing in the website has been changed. If you approve, I'll apply these exact edits to `head-spa.html`, `facial.html`, and `laser.html`.

## What changes, in plain terms

1. **head-spa.html** and **facial.html**: the existing `"offers": [ ... ]` array (6 options for Head Spa, 5 for Facial — unchanged, same names/descriptions) gets wrapped in a formal `OfferCatalog` object instead of sitting as a bare array. This is a structural label change only — no new content, no removed content.
2. **laser.html**: same structural wrap, **plus** the real content gap gets filled — today the schema only lists 8 of the 37 real zone/bundle cards that are actually on the page. The new version lists all 37, matching exactly what's shown to visitors (same French/English names, same durations as the `price-card` elements already on the page).

No prices are added anywhere — matches your "no prices" rule.

---

## 1. head-spa.html — before → after

**Before** (`head-spa.html:5999-6042`, inside the `"@type": "Service"` node):
```json
"offers": [
  { "@type": "Offer", "name": "Solo 60 min – Focus Scalpcial", ... },
  { "@type": "Offer", "name": "Solo 90 min – Signature Scalpcial", ... },
  { "@type": "Offer", "name": "Duo 60 min – Focus Scalpcial", ... },
  { "@type": "Offer", "name": "Duo 90 min – Signature Scalpcial", ... },
  { "@type": "Offer", "name": "Trio 60 min – Focus Scalpcial", ... },
  { "@type": "Offer", "name": "Trio 90 min – Signature Scalpcial", ... }
]
```

**After** — same 6 `Offer` objects, byte-for-byte identical, just nested one level deeper:
```json
"hasOfferCatalog": {
  "@type": "OfferCatalog",
  "name": "Head Spa – Formats disponibles",
  "itemListElement": [
    { "@type": "Offer", "name": "Solo 60 min – Focus Scalpcial", ... },
    { "@type": "Offer", "name": "Solo 90 min – Signature Scalpcial", ... },
    { "@type": "Offer", "name": "Duo 60 min – Focus Scalpcial", ... },
    { "@type": "Offer", "name": "Duo 90 min – Signature Scalpcial", ... },
    { "@type": "Offer", "name": "Trio 60 min – Focus Scalpcial", ... },
    { "@type": "Offer", "name": "Trio 90 min – Signature Scalpcial", ... }
  ]
}
```
(`"offers"` key is removed, `"hasOfferCatalog"` takes its place — the 6 Offer objects' own contents don't change at all.)

---

## 2. facial.html — before → after

**Before** (`facial.html:5958-5994`):
```json
"offers": [
  { "@type": "Offer", "name": "Luxury Facial", ... },
  { "@type": "Offer", "name": "Personalized Facial", ... },
  { "@type": "Offer", "name": "HydraDermabrasion Bela MD+", ... },
  { "@type": "Offer", "name": "Chemical Peel", ... },
  { "@type": "Offer", "name": "Back Facial", ... }
]
```

**After** — same 5 `Offer` objects, unchanged content, just wrapped:
```json
"hasOfferCatalog": {
  "@type": "OfferCatalog",
  "name": "Soins du Visage – Options disponibles",
  "itemListElement": [
    { "@type": "Offer", "name": "Luxury Facial", ... },
    { "@type": "Offer", "name": "Personalized Facial", ... },
    { "@type": "Offer", "name": "HydraDermabrasion Bela MD+", ... },
    { "@type": "Offer", "name": "Chemical Peel", ... },
    { "@type": "Offer", "name": "Back Facial", ... }
  ]
}
```

---

## 3. laser.html — before → after (the real content fix)

**Before** (`laser.html:6337-6394`) — only 8 of the 37 real cards represented:
```json
"offers": [
  { "name": "Lèvre Supérieure – Épilation Laser", ... },
  { "name": "Menton – Épilation Laser", ... },
  { "name": "Aisselles – Épilation Laser", ... },
  { "name": "Bikini Brésilien – Épilation Laser", ... },
  { "name": "Jambes Complètes – Épilation Laser", ... },
  { "name": "Corps Complet – Épilation Laser", ... },
  { "name": "Visage + Aisselles – Forfait Laser", ... },
  { "name": "Bikini + Aisselles + Jambes Complètes – Forfait Laser", ... }
]
```

**After** — a full `OfferCatalog` with **all 37** real cards (25 individual zones + 12 bundles), each with its real French name, English `alternateName`-style pairing already used elsewhere on the site, and the exact duration shown on its `price-card` on the page. Full JSON is in the sibling file **`jsonld-laser-offercatalog-preview.json`** (413 lines — too long to paste twice here).

Quick sample of what a new entry looks like (one zone + one bundle, same shape as the existing 8):
```json
{
  "@type": "Offer",
  "name": "Favoris – Épilation Laser",
  "itemOffered": {
    "@type": "Service",
    "name": "Épilation Laser – Favoris",
    "description": "Épilation laser permanente favoris. 10 min."
  },
  "availability": "https://schema.org/InStock",
  "url": "https://www.fresha.com/book-now/glowch-bod1k4s2/all-offer?share=true&pId=1273288"
}
```
```json
{
  "@type": "Offer",
  "name": "Dos Complet + Poitrine – Forfait Laser",
  "itemOffered": {
    "@type": "Service",
    "name": "Forfait Laser – Dos Complet + Poitrine",
    "description": "Forfait épilation laser dos complet + poitrine. 40 min."
  },
  "availability": "https://schema.org/InStock",
  "url": "https://www.fresha.com/book-now/glowch-bod1k4s2/all-offer?share=true&pId=1273288"
}
```

**One name needs your decision:** the current schema calls one zone "Bikini Brésilien," but the live page itself calls that same card "Maillot Intégral" (`laser.html` price-card, EN "Full Bikini"). The new version uses "Maillot Intégral" to match what's actually on the page — flagging this in case "Bikini Brésilien" was intentional for a specific search term you're targeting.

---

## Your call

Reply with which of these you want applied — all three, just the laser completeness fix, or none — and I'll make the edit(s) to the actual HTML files (nothing happens until you say so).
