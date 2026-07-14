# Doc 05 — Forms Inventory, Booking / Gift-Card / Lead Flows & Conversion Paths

**Basis:** Verified from deployed code. Documentation only.

---

## 5.1 Forms Inventory
| Form | Page | Submits to | Fields | Protections | Conversion event |
|---|---|---|---|---|---|
| Giveaway (tirage) | `/tirage` | `POST https://api.skines.ca/api/send-tirage` | `firstname`, `lastname`, `phone` (tel), `email`, `username` (IG, optional), `consent` (checkbox, required), `service` (hidden), `website` (honeypot, hidden) | Honeypot + Cloudflare Turnstile + server rate-limit + Redis dedupe | ✅ `generate_lead` on success |
| Gift card (email flow) | — | `/api/send-gift-card` (defined) | `amount`, `fromName`, `toName`, `toEmail`, `senderEmail`, `message` | Honeypot + rate-limit | ❌ ORPHANED — no page renders/POSTs this form |

- **Only ONE live form on the entire site: the tirage giveaway.** No general contact form, no newsletter form, no on-site booking form.
- Gift-card **purchase** is handled entirely by Fresha (`/book-now/.../gift-cards`), not the orphaned API.

## 5.2 BOOKING FLOW
```
Channel (IG/TikTok/FB/Google/Direct/Email/SMS)
   │  land on skines.ca
   ▼
Page view  →  GA4 page_view (×2 properties) + Clarity session  ✅
   │
   ▼
Click "Réserver"  →  GA4 booking_button_click {location, text, url_type, device}  ✅ INTENT
   │   ⚠ no UTM appended to outbound URL
   │   ⚠ no cross-domain linker (GA client_id not carried)
   ▼
=========  ATTRIBUTION BREAK: fresha.com  =========
   • separate domain, not instrumented by Skines
   • GA counts as self-referral, new client_id
   • booking + payment happen here → invisible
===================================================
   ▼
Fresha booking confirmed  →  Fresha's own confirmation email
```
- **Measurable:** intent (click) + its on-page source/medium (via GA4 session).
- **NOT measurable:** completed booking, revenue, channel→sale join.

## 5.3 GIFT-CARD FLOW
```
/cartes-cadeaux → click Fresha gift-card link
   → GA4 booking_button_click {url_type:'gift_card'}   ✅ intent only
   → fresha.com/.../gift-cards  → purchase off-site (invisible)

Parallel (unused): /api/send-gift-card would email a generated card image
via Resend, but NO page invokes it → dead path.
```

## 5.4 LEAD FLOW (the one closed loop)
```
/tirage form
   → honeypot + Turnstile check
   → POST /api/send-tirage
       → validate + sanitize + rate-limit
       → Upstash Redis: assign sequential SK-00XX + dedupe
       → Resend: participant email + admin email (skinesca@gmail.com)
   → {success:true}
   → skinesTrackLead('tirage') → GA4 generate_lead  ✅ full closed loop
```

## 5.5 CONVERSION PATHS — complete map
| # | Path | Start | End | Instrumented? | Where it breaks |
|---|---|---|---|---|---|
| 1 | Service booking | any page | Fresha booking | intent only | Fresha handoff |
| 2 | Gift-card purchase | /cartes-cadeaux | Fresha gift card | intent only | Fresha handoff |
| 3 | Giveaway lead | /tirage | server + email | ✅ fully | — |
| 4 | Phone call | any `tel:` | phone | ❌ | no click event |
| 5 | Email inquiry | any `mailto:` | email | ❌ | no click event |
| 6 | Ad → booking (Meta) | ad click | Fresha | ❌ | no Pixel/CAPI + Fresha |
| 7 | Ad → booking (TikTok) | ad click | Fresha | ❌ | no pixel + Fresha |
| 8 | Organic search → booking | SERP | Fresha | intent only | Fresha handoff |

## 5.6 Channel → measurement matrix
| Channel | Reaches site? | Session source captured (GA4)? | Booking attributed? |
|---|---|---|---|
| Instagram | yes | yes (referral/social, if UTM'd or referrer intact) | ❌ (breaks at Fresha) |
| Facebook | yes | yes | ❌ |
| TikTok | yes | yes | ❌ |
| Google (organic) | yes | yes | ❌ |
| Google (Ads) | 🔒 no ads live/verified | would need UTM/gclid | ❌ |
| Direct | yes | yes (direct) | ❌ |
| Email | yes | only if UTM'd (none defined) | ❌ |
| SMS | yes | only if UTM'd (none defined) | ❌ |
| Referral | yes | yes | ❌ |

---
*End Doc 05.*
