# Google Business Profile — Services (Skines Head Spa & Wellness)

Sourced only from what's actually on skines.ca (head-spa.html, laser.html, facial.html + their guide pages). No prices included — all pricing stays on Fresha. Brand name corrected to **Skines Head Spa & Wellness** (not "Med Spa" — that name was retired site-wide on 2026-07-17 per project rules; reintroducing it on GBP would re-fragment your entity after the whole migration that fixed this).

---

## Comparison: your current GBP list vs. the site

| Current GBP entry | Verdict | Why |
|---|---|---|
| Fêtes spa | **Replace** | Doesn't exist as a named product. Closest real thing is the Head Spa **Trio** format, which the site's own copy markets for "un anniversaire, un enterrement de vie de jeune fille" (head-spa-guide.html:1979). Proposed replacement below: "Trio Scalpcial." |
| Hydrothérapie | **Delete** | Only ever used as a descriptive phrase inside Head Spa copy ("hydrothérapie capillaire"), never a bookable product on its own. |
| Peeling chimique | **Keep** | Real — one of the 5 named facials. |
| Head Spa | **Keep, reworded** | Real, but currently generic; replaced below with "Head Spa japonais" as the umbrella entry, same way the site titles it. |
| Scalp spa | **Delete** | Not a real alternate service — "Head Spa"/"Scalpcial" are the only names used anywhere. |
| Japanese head spa | **Keep** | Real — matches the site's own `alternateName`. |
| Laser hair removal | **Keep** | Real, generic umbrella entry. |
| Clarity II laser hair removal | **Keep** | Real — the actual laser system name used site-wide. |
| Soin du visage | **Keep, reworded** | Real, kept as the facial umbrella entry. |
| Massage de visage | **Delete** | Not a standalone bookable service — "massage relaxant du visage" is one *step* inside Luxury Facial and Personalized Facial, not its own product. |
| Signature Scalpcial | **Keep** | Real — the 90-min Head Spa tier. |
| Focus Scalpcial | **Keep** | Real — the 60-min Head Spa tier. |
| Scalp Detox Treatment | **Delete** | Not found anywhere on the site. |
| Bela MD+ Facial | **Rename** | The real service is called "HydraDermabrasion Bela MD+" — Bela MD+ alone is the device brand, not a service name. |
| Dermalogica Professional Facial | **Delete** | Dermalogica is a product brand mentioned in passing (used within Luxury/Personalized facials) — no service is named after it. |
| *(missing)* | **Add** | **Back Facial** ("Soin du dos") — a real, named 60-min facial that isn't on your GBP list at all. |

**One inconsistency I found on the site itself** (not a GBP issue, flagging for your awareness): `head-spa-guide.html` says the Trio is only offered at 60 min (Focus), but the booking form, the homepage service data, and the site's own JSON-LD all include a 90-min Signature Trio too. Worth fixing on the site at some point — didn't touch it here since you asked me not to change anything without confirming first.

---

## Final GBP service list — copy-paste ready

### Head Spa

**Head Spa japonais**
> Rituel japonais de soin du cuir chevelu à Montréal. Massage profond, shampoing et soin capillaire pour une détente complète du système nerveux. Disponible en formats Focus (60 min) ou Signature (90 min), seul(e), en duo ou en trio.

**Focus Scalpcial**
> Massage profond du cuir chevelu avec outils professionnels, massage manuel à l'huile capillaire, deux shampoings, revitalisant et phase de vapeur. Durée : 60 minutes.

**Signature Scalpcial**
> Le rituel Focus Scalpcial complet, enrichi d'un massage relaxant du visage, du cou, des épaules, du décolleté et des bras, avec phase de vapeur et masque nourrissant prolongée. Durée : 90 minutes.

**Trio Scalpcial** *(replaces "Fêtes spa")*
> Head spa pour trois personnes, dans la même suite privée. Parfait pour un groupe d'amies, un anniversaire ou un enterrement de vie de jeune fille. Disponible en 60 ou 90 minutes.

### Épilation Laser

**Épilation laser**
> Épilation laser permanente à Montréal, pour tous types de peau. Zones individuelles et forfaits multi-zones disponibles, de 10 minutes à 1h30 selon la zone traitée.

**Épilation laser Clarity II**
> Technologie Clarity II par Lutronic, double longueur d'onde (755 nm + 1064 nm), efficace sur les phototypes I à VI. Résultats durables, zones et forfaits multiples disponibles.

### Soins du Visage

**Soin du visage**
> Soins du visage professionnels à Montréal : nettoyage en profondeur, exfoliation, extractions et hydratation. Cinq soins disponibles, adaptés à chaque type de peau.

**Luxury Facial**
> Soin du visage haut de gamme de 60 à 90 minutes : nettoyage, exfoliation douce, extractions, sérums hydratants, massage du visage, masque et photothérapie LED anti-âge.

**Soin du visage personnalisé**
> Soin du visage personnalisé de 60 à 75 minutes, adapté à l'acné, la déshydratation, les taches pigmentaires ou le manque d'éclat. Masque et hydratation sur mesure.

**HydraDermabrasion Bela MD+**
> Soin 6-en-1 avec le système Bela MD+ : microdermabrasion, infusion H₂, extraction ultrasonique, stimulation musculaire et sérums. Non invasif, sans temps de récupération. 75 minutes.

**Peeling chimique**
> Exfoliation chimique professionnelle (AHA, BHA ou TCA) pour réduire l'acné, les taches pigmentaires, les ridules et les pores dilatés. Programme recommandé : 3 à 6 séances. 60 minutes.

**Soin du dos**
> Nettoyage en profondeur, exfoliation, extractions et hydratation pour le dos. Idéal contre l'acné dorsale et la congestion cutanée. Durée : 60 minutes.

---

## On the structured data (JSON-LD) question

You asked me to check if the site has schema.org structured data for services and add it if missing. It's **not missing** — `head-spa.html`, `laser.html`, and `facial.html` already each carry a `Service` node with a full `offers` array (service names + descriptions, no prices), inside a `BeautySalon` business graph on every page. It's solid, already matches the "no prices" rule you want for GBP too, and doesn't need to be built from scratch.

The one real gap: it uses a flat `offers` array rather than a formal `OfferCatalog` wrapper, and the laser page's JSON-LD only samples 8 of the 37 real zone/bundle cards instead of listing all of them. If you want, I can draft that improvement as a diff for you to review — I haven't touched any website file for this, per your instruction to ask first.
