# Doc 08 — Issue Register, Measurement Limitations & Assumptions

**Basis:** Verified from deployed code. **Documentation only — nothing here is a fix or a recommendation.** Each entry is a stated fact about current state.

---

## 8.1 DETECTED ISSUES (documentation only, severity is descriptive not prescriptive)

### Attribution / measurement
| ID | Observation | Evidence |
|---|---|---|
| M-01 | Completed bookings and booking revenue are not measured anywhere on-site. | conversion happens on fresha.com; no return signal |
| M-02 | No GA4 cross-domain linker to Fresha → Fresha sessions counted as self-referral, client_id resets. | no `linker`/`domains` config |
| M-03 | 124 outbound Fresha links carry no UTM parameters. | grep: 0 `utm_*` on Fresha URLs |
| M-04 | No Meta Pixel and no Conversions API → Meta ad conversions unmeasurable. | zero `fbq`/CAPI |
| M-05 | No TikTok pixel → TikTok performance unmeasurable. | zero `ttq` |
| M-06 | Phone (`tel:`) and email (`mailto:`) clicks fire no events. | no listeners |
| M-07 | Gift-card purchases fire no conversion (only intent click); email API orphaned. | send-gift-card unused |
| M-08 | `booking_button_click` comment claims `sendBeacon`/`transport_type:'beacon'` but code does not set it → hits may be dropped on unload to Fresha. | fresha-tracking.js params object |
| M-09 | No scroll/video/outbound custom events (may exist only if GA4 Enhanced Measurement enabled — `🔒` not verifiable). | no code |
| M-10 | Dual GA4 tagging duplicates every event into two properties. | 2× `config` |

### Consent / privacy
| ID | Observation |
|---|---|
| C-01 | No Google Consent Mode v2. |
| C-02 | No cookie consent banner; GA4 + Clarity (session recording) run on load without consent — relevant under Quebec Law 25. |

### SEO / entity
| ID | Observation |
|---|---|
| S-01 | No `hreflang` despite FR/EN bilingual content on shared URLs. |
| S-02 | EN content is JS-toggled on same URL → not independently indexable. |
| S-03 | Business schema type inconsistent (SpaOrBeautySalon vs HealthAndBeautyBusiness vs Organization); no Medical* type. |
| S-04 | No `AggregateRating` schema despite "1600+ avis" claim. |
| S-05 | Two Instagram handles and two TikTok handles referenced in code (entity fragmentation). |

### Code hygiene
| ID | Observation |
|---|---|
| H-01 | `/api/send-gift-card.js` fully built but never invoked (orphaned). |
| H-02 | Alt domain `skines.info` referenced in code; role unknown. |
| H-03 | Media served from R2 public dev endpoint (`*.r2.dev`), not a custom domain. |
| H-04 | Inert `fbq` hook shipped in fresha-tracking.js (harmless; fires nothing). |

## 8.2 MEASUREMENT LIMITATIONS (what the current stack fundamentally cannot answer)
1. "How many bookings did we get?" — not on-site (Fresha only).
2. "What is our website→booking conversion rate / revenue?" — not measurable.
3. "Which channel (IG/FB/TikTok/Google) produced paying customers?" — not measurable (breaks at Fresha; no UTM/linker).
4. "What did Meta/TikTok ads produce?" — not measurable (no pixels/CAPI).
5. "How many phone/email inquiries came from the site?" — not measurable.
6. "Which EN vs FR audience converts?" — not distinguishable (same URL).
7. "What is our ROAS?" — not computable end-to-end.

**What CAN be answered today:** on-site traffic/sessions/geo/device (GA4×2), booking *intent* clicks with on-page location + source, giveaway leads (full loop), qualitative behaviour (Clarity).

## 8.3 ASSUMPTIONS — explicitly marked
| # | Assumption | Why stated | Verification path |
|---|---|---|---|
| A-01 | `G-VFB8SY59FX`="Fresha", `G-N46K5NG8TW`="Skines" | from commit messages, not GA4 UI | GA4 admin screenshot |
| A-02 | Both GA4 properties are active/receiving | code configures both; receipt not confirmed | GA4 Realtime |
| A-03 | GA4 Enhanced Measurement state (scroll/outbound/video) | not in code; property-level toggle | GA4 data-stream settings |
| A-04 | Fresha plan tier (affects whether tracking can be injected) | unknown | Fresha account |
| A-05 | Live IG/TikTok handles vs schema `sameAs` | code conflicts + CLAUDE.md note | platform login |
| A-06 | `skines.info` role (redirect? parked? separate?) | referenced 2× in code | DNS/registrar |
| A-07 | No Meta/TikTok pixel deployed anywhere else (e.g., via Fresha) | verified absent on skines.ca only | Events Manager / Fresha |
| A-08 | Whether any ads are currently running | none in code; not a code concern | Ads Manager |
| A-09 | GA4 referral-exclusion list contents (Fresha excluded?) | UI-only setting | GA4 admin |
| A-10 | Clarity consent/masking configuration | project-level, not in code | Clarity dashboard |

## 8.4 What was NOT changed in producing this documentation
No tracking, tags, pages, schema, or configuration were modified. This entire `docs/` set is read-only knowledge extraction from the codebase as deployed on 2026-07-14.

---
*End Doc 08.*
