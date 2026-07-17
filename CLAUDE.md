# Skines Med Spa & Wellness — Project Conventions

## Fresha booking link — permanent rule

**Official Direct Booking link (the only one ever allowed in this project):**
```
https://www.fresha.com/book-now/glowch-bod1k4s2/all-offer?share=true&pId=1273288
```

Every booking button, CTA, popup, banner, service card, "Book Now" / "Réserver" link —
on every page, present and future — must point to this exact URL.

**Never use Marketplace-style links** of the form `fresha.com/fr/a/...` or `fresha.com/a/...`.
These route discovery-based traffic through Fresha's Marketplace and are not the
direct-booking link approved for this site.

**Button styling (always):**
```css
background: #F5EDE3;   /* cream */
color: #684034;        /* brand maroon text */
border: 1.5px solid #F5EDE3;
```
Never a dark background on a booking button.

**Colour rule:** never use the old dark maroon `#3A1E14` (`rgba(58,30,20,…)`)
anywhere — always use the brand maroon `#684034` (`rgba(104,64,52,…)`).

This applies automatically — Claude should not need to be reminded per page or per session.

## Official brand name — permanent rule

**Always use the full official brand name:**
```
Skines Med Spa & Wellness
```

**Never use** (unless referring to a legal, historical, or third-party source —
e.g. an existing Instagram handle, a Google Maps listing name already indexed
by Google, or a quote from a third party):
- Skine's Spa
- Skines Spa
- Skines Head Spa
- Skines Wellness

This matters for entity consistency in Google's Knowledge Graph and Schema.org
`name`/`alternateName` fields — inconsistent brand naming across the site
fragments the entity and weakens SEO.

**Known existing exceptions (do not "fix" without confirming first):**
- `@skines.spa` — actual Instagram/TikTok handle, third-party platform constraint.
- "Skines Head Spa & wellness" in Google Maps URLs — reflects the live GBP listing name, third-party source.

**Known inconsistencies found in a 2026-06-30 scan (not yet corrected, flagged for review):**
- `facial.html:6552`, `head-spa.html:6612/6619`, `index.html:7113/7120`,
  `laser.html:7479/7486`, `reviews.html:6119/6126` — internal JS search-index
  text uses "Skines Spa" instead of the full brand name.

## Pre-commit safety check

A git pre-commit hook (`.git/hooks/pre-commit`) scans staged files for any
`fresha.com` link that is not the approved `book-now/glowch-bod1k4s2` URL and
blocks the commit if found. If a commit is ever blocked by this hook, fix the
link to the official URL above — do not bypass with `--no-verify`.
