# Skines Digital Infrastructure — Documentation Library (INDEX)

**Business:** Skines Head Spa & Wellness — Montréal, QC — skines.ca
**Type:** Current-state technical reference. **Audit only** — no fixes, no recommendations.
**Compiled:** 2026-07-14
**Evidence basis:** Every statement verified against the deployed codebase. Anything not verifiable from code is marked `🔒 requires login/screenshot — not verified`.

---

## Documents

| # | Document | Covers |
|---|---|---|
| v1 | `Skines-Digital-Infrastructure-Documentation-v1.md` | Master overview: architecture, what exists / doesn't, data-flow map, conversion map, all scripts, all IDs, entity map, current-state summary |
| 02 | `02-Website-and-Page-Architecture.md` | Rendering model, 18-page inventory, reusable components, business facts, business processes |
| 03 | `03-Tracking-Analytics-and-GA4-Event-Dictionary.md` | Tracking architecture, dual GA4, Clarity, event inventory, full GA4 event dictionary |
| 04 | `04-JavaScript-and-Serverless-API-Inventory.md` | Every JS file + third-party libs, serverless functions, `_lib` modules, env vars, load order |
| 05 | `05-Forms-Flows-and-Conversion-Paths.md` | Forms inventory, booking/gift-card/lead flows, full conversion-path map, channel→measurement matrix |
| 06 | `06-SEO-Schema-and-Entity-Architecture.md` | SEO on-page, JSON-LD schema architecture, entity/identity graph + consistency findings |
| 07 | `07-Dependencies-Services-and-Identifier-Registry.md` | Every external service, integrations present/absent, full identifier registry, risk couplings |
| 08 | `08-Issues-Limitations-and-Assumptions-Register.md` | Detected issues (documentation only), measurement limitations, explicit assumptions |

## Coverage map (your requested topics → where documented)
```
Website Architecture ............ v1 §1, Doc 02
Tracking Architecture ........... v1 §2, Doc 03 §3.1
Analytics Architecture .......... Doc 03 §3.2–3.3
Data Flow Diagrams .............. v1 §4, Doc 05 §5.2–5.4
Event Inventory ................. Doc 03 §3.4
GA4 Event Dictionary ............ Doc 03 §3.5
JavaScript Inventory ............ Doc 04 §4.1
Serverless/API Inventory ........ Doc 04 §4.2–4.3
Forms Inventory ................. Doc 05 §5.1
Booking Flow .................... Doc 05 §5.2
Gift Card Flow .................. Doc 05 §5.3
Lead Flow ....................... Doc 05 §5.4
SEO Architecture ................ Doc 06 §6.1
Schema Architecture ............. Doc 06 §6.2
Entity Architecture ............. Doc 06 §6.3, v1 §8
Every detected issue ............ Doc 08 §8.1
Every dependency ................ Doc 07 §7.1, §7.4
Every external service .......... Doc 07 §7.1
Every third-party integration ... Doc 07 §7.1–7.2
Every identifier used ........... Doc 07 §7.3, v1 §7
Every page inventory ............ Doc 02 §2.2
Every reusable component ........ Doc 02 §2.3
Every business process .......... Doc 02 §2.5
Every conversion path ........... Doc 05 §5.5–5.6
Every measurement limitation .... Doc 08 §8.2
Every assumption marked ......... Doc 08 §8.3
```

## The one-line truth
The site measures traffic and **booking intent** well (GA4×2 + Clarity + `booking_button_click` on 14 pages + a fully-closed giveaway lead loop), but **cannot measure any completed booking, revenue, or channel→sale attribution** because the conversion happens on **Fresha**, an external domain with no linker, no UTM, no pixel bridge, and no return signal — and there is **no Meta Pixel, no CAPI, and no TikTok pixel** anywhere.

---
*This library documents current state only. No system was modified in its creation.*
