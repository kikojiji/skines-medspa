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
Skines Head Spa & Wellness
```

This is the real-world / Google-Maps-displayed name and the brand's original
Head Spa identity. On 2026-07-17 the site was migrated back to this name after a
period using "Skines Med Spa & Wellness" — that variant created entity
inconsistency and weakened relevance for the primary target query "Head Spa
Montréal". **Do not reintroduce "Med Spa" as the business/brand/entity name.**

**Positioning (entity hierarchy):**
- PRIMARY BRAND: `Skines Head Spa & Wellness`
- PRIMARY POSITIONING: Luxury Japanese Head Spa in Montréal
- SECONDARY POSITIONING: Medical Aesthetics & advanced skin treatments

**"Medical Aesthetics" / "med spa" / "medical spa" MAY still be used** when
describing a **service line, treatment category, page topic, or commercial
offering** (facials, Bela MD+, laser, etc.). It must NOT be used as the business
name, logo text, schema `name`/`Organization` name, email brand, or sitewide
identity. Keep Medical Aesthetics visible and strong — the migration must not
make the business look like it only offers Head Spa.

**Never use as the brand/entity name:** `Skines Med Spa`, `Skines Med Spa &
Wellness`, `Skine's Spa`, `Skines Spa`, `Skines Medspa`, `Skines Medical Spa`,
`Skines Wellness`.

**Do NOT add "Montréal" to the business name** unless proven part of the
real-world registered/displayed brand. Do not create a new Google Business
Profile or change the GBP name if it already displays `Skines Head Spa & Wellness`.

This matters for entity consistency in Google's Knowledge Graph and Schema.org
`name`/`alternateName` fields — inconsistent brand naming fragments the entity
and weakens SEO.

**Known existing exceptions (do not "fix" without confirming first):**
- `@skines.spa` / `@skines.ca` — actual Instagram/TikTok/Threads handles, third-party platform constraint.
- `package.json` name `skines-medspa` — internal npm package identifier, not brand-facing.

## Pre-commit safety check

A git pre-commit hook (`.git/hooks/pre-commit`) scans staged files for any
`fresha.com` link that is not the approved `book-now/glowch-bod1k4s2` URL and
blocks the commit if found. If a commit is ever blocked by this hook, fix the
link to the official URL above — do not bypass with `--no-verify`.
