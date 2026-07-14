# Architecture Decision Record (ADR) Library — Index

**Subject:** Skines Med Spa & Wellness — skines.ca
**Nature:** These ADRs are **reverse-engineered** from the deployed codebase. The original decisions were not written down at the time; each record below reconstructs the decision, its evident context, and its consequences **from code evidence**. Where motive cannot be proven it is marked *(inferred)*.
**Status legend:** `Active` = in force in current code · `Active (implicit)` = in force but never formally chosen · `Latent` = a hook/allowance exists for a decision not yet taken.
**Rule:** Documentation only. Consequences are stated as facts/trade-offs, never as recommendations.

| ADR | Title | Status |
|---|---|---|
| 001 | Static multi-page HTML; no framework or build step | Active (implicit) |
| 002 | Delegate all commerce to Fresha (buy, not build) | Active |
| 003 | No Google Tag Manager — hardcode gtag directly | Active (implicit) |
| 004 | Dual GA4 property tagging | Active |
| 005 | Measure booking *intent* on-site as a conversion proxy | Active |
| 006 | Client-side i18n on shared URLs (no per-language paths) | Active |
| 007 | Serverless-only backend (Vercel functions) | Active |
| 008 | Externalize backend state to Upstash Redis | Active |
| 009 | Resend as the transactional email provider | Active |
| 010 | Cloudflare as edge + R2 for video (public dev endpoint) | Active |
| 011 | Layered bot defense on the single lead form only | Active |
| 012 | Microsoft Clarity for qualitative analytics | Active |
| 013 | Schema.org / SEO-first acquisition strategy | Active |
| 014 | No Meta Pixel / CAPI / TikTok pixel (social as links only) | Active (implicit) + Latent hook |
| 015 | No consent-management layer; analytics on load | Active (implicit) |
| 016 | Duplicated inline components instead of templating | Active (implicit) |

*Each ADR is a separate file in this folder: `ADR-0XX-*.md`.*
