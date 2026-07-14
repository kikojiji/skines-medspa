# Doc 09 — Architecture Analysis (Systems Intelligence)

**Role:** Chief Systems Architect — comprehension, not repair.
**Basis:** Reconstructed from the deployed codebase. Intent is **inferred from evidence** and marked *(inferred)* where it is not directly provable. No fixes, no recommendations.

---

## 9.1 What kind of system this actually is

Stripped to its essence, Skines is a **"discovery-layer + external-system-of-record" architecture**:

```
   MARKETING / DISCOVERY LAYER            SYSTEM OF RECORD (commerce)
   ─────────────────────────────         ────────────────────────────
   skines.ca (static content)     ──▶    Fresha (bookings, payments,
   • SEO + schema + guides                 gift cards, client records,
   • service/pricing pages                 calendar, confirmations)
   • social proof, logistics
   • ONE lead form (giveaway)
```

The website's job is **to be found, to persuade, and to hand off**. It is not a transactional application. Commerce — the part with money, PII, scheduling, and state — was deliberately **not built**; it was **delegated to Fresha**. Almost every structural property of this system follows from that single separation of concerns.

This is a **coherent, internally-consistent design**, not an accident. Understanding it means understanding that the website was optimized for three things — **discoverability, persuasion, and low operational surface** — and explicitly *not* for **owning the transaction** or **closed-loop measurement**.

## 9.2 Why it works the way it does

- **Static multi-page HTML, no framework/build.** *(inferred)* Chosen for maximum speed, near-zero runtime dependencies, trivial hosting, and perfect crawlability. A med-spa marketing site has content that changes rarely and must load instantly on mobile — static HTML is the lowest-risk medium for that. The cost (duplicated nav/footer across 18 files) was accepted in exchange for simplicity.
- **Heavy Schema.org + SEO investment.** The site pours effort into JSON-LD (9 FAQPage, 22 Service, 19 Offer, business/geo/hours) and per-page titles/canonicals. This reveals the **primary acquisition strategy is organic discovery** (search + AI answer engines), not paid. The architecture is built to be *read by machines* (Google, LLMs) as much as by humans.
- **Fresha as the transaction engine.** Booking, payments, calendar, and client records are Fresha's domain. This removes the need for a database, PCI scope, auth, scheduling logic, and a booking UI from the website. The website keeps **zero commerce state**.
- **A single, hardened lead form.** The only place the site collects PII itself (the giveaway) is wrapped in honeypot + Turnstile + rate-limit + Redis dedupe + server validation. The disproportionate hardening of this *one* form shows the architecture treats **self-collected PII as an exceptional, high-risk path** — everything else is delegated.
- **Serverless-only backend.** Two Vercel functions, no persistent server. State that serverless can't hold (sequential IDs, dedupe) is pushed to **Upstash Redis**; email to **Resend**. The backend is intentionally **stateless and ephemeral**.
- **Client-side analytics, hardcoded, dual-property.** Measurement was added **incrementally and directly** (gtag in the head, then a second property, then two small tracking scripts) rather than through a tag manager. This reveals an architecture that grew by **accretion** — each measurement need solved in place — not one designed up-front as a measurement platform.

## 9.3 The assumptions the architecture makes (implicit contracts)

1. **The transaction does not need to be owned.** Fresha is trusted as the system of record; the website assumes it never needs booking/revenue data back.
2. **Intent is a good-enough proxy for conversion.** `booking_button_click` exists because the architecture assumes measuring the *click* is a usable stand-in for the *sale* it cannot see.
3. **Organic discovery is the main funnel.** The schema/SEO investment assumes traffic comes largely from search/AI, where entity clarity and structured data matter more than pixels.
4. **Content changes are infrequent.** Static duplication assumes edits are rare enough that "change every file" is acceptable.
5. **One language surface is enough.** FR/EN share a URL and toggle client-side — assuming search engines and users don't need separately-addressable language versions.
6. **The site is a leaf, not a hub.** It assumes it can hand traffic *outward* (to Fresha) without needing identity continuity across that boundary.
7. **Consent is out of scope at the code layer.** Analytics initialize on load, assuming consent is either not required or handled elsewhere.
8. **Third-party uptime is the site's uptime.** Fresha, Cloudflare, Vercel, Resend, Upstash, Google/Microsoft tags are assumed reliable; there is no fallback for any of them.

## 9.4 Where the structural limits are (and why they are structural, not configuration)

The defining limit is the **domain boundary at Fresha**. Because commerce lives on a domain the site does not control and cannot instrument:

- Identity **cannot** persist across the boundary (no shared cookie/client_id space).
- The sale **cannot** emit a signal back to the site's analytics.
- Therefore **click→sale joining is impossible from within this architecture** — not because a setting is off, but because the two systems are separate ownership domains with no data contract between them.

This is a **hard architectural boundary**: every measurement limitation downstream (revenue, ROAS, channel→booking, ad optimization) is a *consequence* of this one boundary, not an independent defect. You could add UTMs, a linker, pixels — but the completed-sale truth still lives inside Fresha and only returns if Fresha itself is configured to share it. The website architecture, by itself, **structurally cannot** close that loop.

Secondary structural limits:
- **No tag manager** → measurement changes are code-deploy-scoped, so the *measurement layer's* agility is bounded by the *content layer's* release process. The two are fused.
- **Shared-URL i18n** → language is a runtime property, not an addressable resource, so anything that keys on URL (search indexing, per-language analytics, per-language ads) cannot distinguish FR from EN.
- **Stateless backend** → the site has no memory of a visitor across sessions beyond what GA4/Clarity hold; there is no first-party customer database.

## 9.5 Dependency intelligence — what depends on what

### What depends on **Fresha**
- 100% of revenue-generating actions: bookings, payments, gift-card purchases.
- The system of record for clients, calendar, confirmations.
- The *entire* conversion truth (which is why nothing else can measure it).
- Consequence: **Fresha is the single most load-bearing external dependency.** If Fresha is down, the business cannot transact; if Fresha changes its share/pId URL scheme, 124 links break.

### What depends on **GA4**
- All quantitative traffic understanding: sessions, geo, device, source/medium.
- Both custom signals the site does emit (`booking_button_click`, `generate_lead`).
- Consequence: GA4 is the **only quantitative lens** on the discovery layer. It is dual-property, so every insight is duplicated and must be property-qualified. GA4 sees *up to the Fresha boundary and no further*.

### What depends on **Meta**
- **Nothing, currently, at the code layer.** No Pixel, no CAPI, no catalog. Meta is present only as outbound social links + `sameAs` entity references.
- Consequence: Meta is a **discovery/social-proof channel only** in this architecture. Any Meta *advertising* capability is not wired — Meta has no data contract with the site at all. (An inert `fbq` hook anticipates a future pixel but does nothing today.)

### What depends on the **website**
- Discovery (SEO/schema/AI-readability), persuasion (content), and the *handoff* to Fresha.
- The single lead form (giveaway) and its serverless pipeline.
- The intent-measurement signals.
- Consequence: the website is the **top of the funnel and the entity anchor** (its `sameAs`/schema define the business to machines) — but it is **not** where value is captured or measured to completion.

### What depends on **external services** (fan-out)
```
Cloudflare    → all traffic (DNS/proxy/CDN); R2 → video; Turnstile → form bot check
Vercel        → hosting + the two serverless functions
Resend        → all transactional email (leads, gift-card emails)
Upstash Redis → sequential IDs + dedupe state for the lead pipeline
Google        → GA4 (analytics), Fonts, Maps embed
Microsoft     → Clarity (qualitative analytics)
jsDelivr/cdnjs→ Lenis, GSAP (visual behaviour)
```
- Consequence: the site is a **thin orchestration layer over ~10 external services**. It owns almost no infrastructure of its own. Resilience = the union of these vendors' reliability. There is no graceful degradation coded for any of them.

## 9.6 What can NEVER be measured *with this architecture as designed*
(Not "hard to measure" — structurally impossible without changing the architecture's boundaries.)

1. A completed booking or its revenue, from within the website's own systems.
2. The join between a specific website visitor/click and a specific paying booking.
3. True channel→revenue attribution or ROAS end-to-end.
4. Ad-driven conversions (no pixel/CAPI data contract with any ad platform).
5. FR-vs-EN audience behaviour as separable populations (shared URL).
6. Cross-session customer identity / lifetime value (no first-party customer store).
7. Anything happening *inside* Fresha (funnel drop-off on the booking page, abandonment).

## 9.7 The architecture in one sentence
> Skines is a **static, SEO-first discovery layer** that **delegates all commerce and all conversion truth to Fresha**, measures only up to the moment of hand-off, and treats its own PII collection as a single hardened exception — a coherent low-surface design whose every measurement limit is the direct consequence of one deliberate boundary: **the website persuades; Fresha transacts; and nothing crosses back.**

---
*End Doc 09. Analysis only — no changes made.*
