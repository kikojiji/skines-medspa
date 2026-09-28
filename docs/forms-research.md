# Skines Head Spa & Wellness — Online Forms Research & Specification
**Montreal, Quebec | Laser hair removal · Dermalogica facials · Head spa**

> Saved from the owner's research brief (2026-09-27) as the source of truth for the
> online-forms project (booking, intake, laser/facial consent, staff dashboard).
> Read this file before touching any code for that project.

## ⚠️ Critical framing for this business

Quebec has **no dedicated statute or professional order governing laser hair removal by estheticians**. The AETMIS/INESSS report confirms the practice is widespread in Quebec's personal-care sector but "n'est encadrée ni par un ordre professionnel, ni par une réglementation relative à la santé". Health Canada's laser safety guidelines (federal/provincial/territorial) are the main safety reference: they require trained laser personnel, a controlled treatment zone, protective eyewear, and **an accurate record of all laser treatments**. Because the regulatory vacuum means litigation risk falls on civil liability, your forms (consent, screening, treatment logs) are your primary legal protection. **Verify the current state of Quebec regulation with a lawyer or the CMQ before launch — flagged as an uncertainty below.**

Much of what circulates online about "laser hair removal consent rules" is actually **French law** (décret n° 2024-470, arrêté du 19 février 2025) — that does **not** apply in Quebec.

**Wording rules for a non-medical spa in Quebec:**
- Say: "épilation au laser (soins esthétiques)", "traitement esthétique", "esthéticienne certifiée et formée à l'utilisation sécuritaire du laser".
- Never say: "médical", "médicale", "med spa", "clinique" (reserved for medical establishments under the *Loi sur les services de santé*), "traitement dermatologique", "prescrit", "thérapeutique".
- Avoid outcome guarantees ("résultats permanents garantis") — Quebec's *Consumer Protection Act* prohibits false or misleading representations.

---

## 1. Summary table of all 12 forms

| # | Form | Purpose | When filled | Req/Opt |
|---|------|---------|-------------|---------|
| 1 | Online booking / appointment request | Reserve a service, time, practitioner | Before first visit, every booking | Booking: required fields only |
| 2 | New client intake | Identity, contact, referral source, emergency contact | First visit (or before) | Required |
| 3 | Laser health questionnaire / contraindications | Screen photosensitizing meds, isotretinoin, pregnancy, skin conditions, tanning, tattoos, epilepsy | Before first laser session; re-verify each session | Required for laser |
| 4 | Skin consultation form (facials) | Dermalogica Face Mapping–style skin analysis | First facial; updated annually | Required for first facial |
| 5 | Informed consent — laser | Risks, expected results, sessions, aftercare | Before first laser treatment; re-signed annually or if settings change | Required (signature) |
| 6 | Consent — facials | Product/treatment consent, allergies | Before first facial | Required (signature) |
| 7 | Fitzpatrick skin type assessment | Determine phototype I–VI for laser settings | Before first laser; re-check each session | Required for laser |
| 8 | Pre/post-treatment instructions acknowledgment | Client confirms understanding of prep + aftercare | Before each laser session | Required |
| 9 | Photo consent | Before/after photos; internal vs. marketing use | Optional, separate granular consents | **Optional** (never bundled) |
| 10 | Cancellation / no-show / deposit policy | Set expectations; authorize deposit/charge | At booking; checkbox acknowledgment | Required acknowledgment |
| 11 | Treatment record / session log | Practitioner log: settings, zone, fluence, reaction | After every laser session | Internal — never client-facing |
| 12 | Feedback / satisfaction | NPS, review, service quality | After each visit or course completion | Optional |

---

## 2. Form-by-form specifications

### Form 1 — Online booking / appointment request
**FR:** *Prise de rendez-vous en ligne* | **EN:** Online booking

| Field | FR | EN | Type | Req? |
|---|---|---|---|---|
| Service | Prestation souhaitée | Desired service | Dropdown (épilation laser — zone; soin du visage Dermalogica; head spa) | ✔ |
| Zone (if laser) | Zone à traiter | Treatment area | Dropdown | Conditional ✔ |
| Date/time | Date et heure souhaitées | Preferred date & time | Date + time picker | ✔ |
| Practitioner | Esthéticienne préférée | Preferred esthetician | Dropdown / "aucune préférence" | Optional |
| First visit? | Première visite? | First visit? | Radio | ✔ |
| Name | Nom complet | Full name | Text | ✔ |
| Phone | Téléphone | Phone | Tel | ✔ |
| Email | Courriel | Email | Email | ✔ |
| Notes | Notes / questions | Notes / questions | Textarea | Optional |
| Promo code | Code promo | Promo code | Text | Optional |
| Policy checkbox | J'ai lu et j'accepte la politique d'annulation et de dépôt | ... | Checkbox (linked) | ✔ |
| Loi 25 checkbox | J'accepte la collecte de mes renseignements personnels décrite dans la politique de confidentialité | ... | Checkbox (linked, separate from marketing opt-in) | ✔ |

**Conditional logic:** Service = laser → ask "first laser session?" → if yes, email links to Forms 3, 5, 7, 8 before the appointment. First visit = yes → prompt Form 2 before arrival.

**Mandatory wording:** Link to privacy policy (Loi 25 art. 3.2) and cancellation policy.

---

### Form 2 — New client intake
**FR:** *Formulaire d'accueil — nouvelle cliente* | **EN:** New client intake form

| Field | FR | EN | Type | Req? |
|---|---|---|---|---|
| Full name | Nom complet | Full name | Text | ✔ |
| Preferred name | Nom préféré | Preferred name | Text | Optional |
| Date of birth | Date de naissance | Date of birth | Date | ✔ (drives minor logic) |
| Address | Adresse | Address | Text + postal code | ✔ |
| Phone / mobile | Téléphone / cellulaire | Phone / mobile | Tel | ✔ |
| Email | Courriel | Email | Email | ✔ |
| Preferred contact | Mode de contact préféré | Preferred contact method | Radio | ✔ |
| Language | Langue de correspondance | Correspondence language | Radio (FR default, Bill 96) | ✔ |
| How did you hear about us? | Comment avez-vous entendu parler de nous? | ... | Dropdown | ✔ |
| Emergency contact | Contact d'urgence | Emergency contact | Text | ✔ |
| Occupation | Profession | Occupation | Text | Optional |
| Referral name | Nom de la personne qui vous a référée | Referrer's name | Text | Conditional |
| Allergies (general) | Allergies connues | Known allergies | Text | ✔ |

**Conditional logic:** DOB < 18 → minor flow. "Recommandation" selected → show referral name field.

**Mandatory wording (Loi 25):** state collector, purpose, sensitive-info notice, retention period, privacy officer contact, access/rectification rights. Sensitive info needs express, specific, affirmative (never pre-checked) consent.

---

### Form 3 — Laser health questionnaire / contraindications
**FR:** *Questionnaire de santé — épilation au laser* | **EN:** Laser health screening questionnaire

Highest-risk form; re-verify (changes-since-last-visit) at every session.

| Field | FR | EN | Type | Req? |
|---|---|---|---|---|
| Pregnancy | Êtes-vous enceinte, soupçonnez-vous une grossesse ou allaitez-vous? | ... | Radio | ✔ |
| Isotretinoin | Isotrétinoïne (Accutane®, Epuris®) dans les 12 derniers mois? | ... | Radio | ✔ |
| Photosensitizing medication | Médicaments photosensibilisants (quinolones/tétracyclines, AINS, certains antidépresseurs/antidiabétiques)? | ... | Radio + conditional list | ✔ |
| Active skin condition in area | Infection, lésion, poussée d'acné, eczéma, psoriasis, plaie ouverte sur la zone? | ... | Radio | ✔ |
| Recent tanning | Soleil/solarium/autobronzant dans les 4 dernières semaines? | ... | Radio + date/details | ✔ |
| Tanning plans | Vacances au soleil / bronzage prévus pendant le traitement? | ... | Radio | ✔ |
| Tattoos in area | Tatouages, grains de beauté foncés, taches pigmentées sur la zone? | ... | Radio | ✔ |
| Epilepsy | Épilepsie ou crises photosensibles? | ... | Radio | ✔ |
| Skin cancer history | Cancer de la peau sur la zone? | ... | Radio | ✔ |
| Keloid scars | Tendance aux cicatrices chéloïdes? | ... | Radio | ✔ |
| Hormonal conditions | Trouble hormonal (SOPK, thyroïde) ou hormonothérapie? | ... | Radio | ✔ |
| Metal implants | Implants métalliques ou pacemaker dans la zone? | ... | Radio | ✔ |
| Gold therapy | Chrysothérapie ou injections de collagène? | ... | Radio | ✔ |
| Recent procedures | Peeling, dermabrasion, injections, cire récents sur la zone? | ... | Radio + details | ✔ |
| Herpes | Antécédents d'herpès labial/génital (visage/maillot)? | ... | Radio | Conditional ✔ |
| Other conditions | Autre condition médicale pertinente | ... | Textarea | Optional |
| Medication list | Liste des médicaments actuels | ... | Textarea | Optional |
| Confirmation | Je confirme l'exactitude de mes réponses | ... | Checkbox + date | ✔ |

**Conditional logic (critical):**
- Pregnancy/breastfeeding = yes → **block laser booking**, offer facial/head spa instead; message explaining why.
- Isotretinoin < 12 months = yes → block booking, ask for physician clearance before returning.
- Recent tanning = yes → soft block, esthetician review, typically reschedule 2–4 weeks.
- Epilepsy = yes → requires physician note + protective-measures assessment.
- Any red-flag "yes" → file flagged "à réviser par l'esthéticienne", not auto-confirmed.

**Mandatory wording:** disclaimer that the esthetician is not a medical professional, the form doesn't replace medical advice, recommend consulting a physician when in doubt.

---

### Form 4 — Skin consultation form (facials / Dermalogica Face Mapping style)
**FR:** *Fiche de consultation cutanée — soins du visage* | **EN:** Skin consultation form

| Field | FR | EN | Type | Req? |
|---|---|---|---|---|
| Main concerns | Principales préoccupations | ... | Checkboxes (acné, ridules, sécheresse, sensibilité/rougeurs, pigmentation, pores, éclat, relâchement) | ✔ |
| Skin type (self-assessment) | Comment décririez-vous votre peau? | ... | Radio (sèche/normale/mixte/grasse/sensible) | ✔ |
| Reactivity | Réagit facilement (rougeurs, picotements)? | ... | Radio (jamais/parfois/souvent) | ✔ |
| Current routine | Produits actuels (nettoyant, tonique, sérum, hydratant, SPF) | ... | Textarea/list | ✔ |
| Active ingredients | Rétinol, vitamine C, AHA/BHA, peroxyde de benzoyle? | ... | Checkboxes | ✔ |
| Recent exfoliation | Peelings/exfoliations récents? | ... | Radio + details | ✔ |
| Allergies (cosmetic) | Allergies/intolérances (produits, ingrédients, parfums) | ... | Text | ✔ |
| Skin conditions | Eczéma, rosacée, psoriasis, dermatite | ... | Checkboxes + details | ✔ |
| Lifestyle | Tabac? Alcool? | ... | Radio | ✔ |
| Water intake / diet | Consommation d'eau / habitudes alimentaires | ... | Radio/textarea | Optional |
| Stress & sleep | Niveau de stress / sommeil | ... | Radio | Optional |
| Exercise | Fréquence d'exercice | ... | Radio | Optional |
| Menstrual cycle link | Imperfections liées au cycle? | ... | Radio | Optional |
| Pregnancy | Enceinte ou allaitement? (actifs déconseillés) | ... | Radio | ✔ |
| Goals | Objectifs pour votre peau | ... | Textarea | ✔ |
| Treatments elsewhere | Injections, facials réguliers ailleurs? | ... | Textarea | Optional |

**Conditional logic:** pregnancy = yes → adapted protocol (avoid certain actives/essential oils). Rosacea/sensitive = yes → gentler protocol + esthetician review.

**Note:** Dermalogica-authorized status lets this be branded as inspired by/integrated with Face Mapping®; the 14-zone in-person analysis is filled by the esthetician (Form 11's facial counterpart), not the client online.

---

### Form 5 — Informed consent: laser treatments
**FR:** *Formulaire de consentement éclairé — épilation au laser* | **EN:** Laser informed consent form

Signed once before first session; refreshed annually or on protocol change.

**Sections:**
1. Nature of the service — light energy targets melanin in the hair follicle; cosmetic aesthetic service, not medical; multiple sessions (6–10, up to 10 for phototypes IV–VI).
2. Expected results — significant reduction, not guaranteed permanent removal; individual variation; hormonal regrowth possible.
3. Risks (client scrolls through) — temporary redness/swelling/discomfort (normal); rare: burns/blisters, temporary or permanent hyper-/hypopigmentation (elevated risk IV–VI), scarring (rare, higher with keloid tendency), paradoxical hair growth, eye injury without protection (client agrees to wear provided eyewear at all times — Health Canada requirement).
4. Alternatives — shaving, waxing, electrolysis; option to decline.
5. Pre-treatment obligations (see Form 8).
6. Acknowledgments (each its own checkbox):
   - J'ai reçu et lu les informations ci-dessus
   - J'ai eu l'occasion de poser mes questions et j'ai reçu des réponses
   - Je comprends que les résultats varient d'une personne à l'autre
   - Je confirme l'exactitude de mon questionnaire de santé
   - Je consens au traitement
   - **Je comprends que ce service est esthétique et ne constitue pas un acte médical**

| Field | FR | EN | Type | Req? |
|---|---|---|---|---|
| Client name | Nom de la cliente | ... | Text (prefilled) | ✔ |
| Date | Date | ... | Date | ✔ |
| Signature | Signature | ... | E-signature (draw/type) | ✔ |
| For minors | Consentement du parent/tuteur | ... | Signature + name + relationship | Conditional ✔ (<18) |
| Interpreter/witness | Témoin / interprète | ... | Name + signature | Optional |
| Copy requested | Je souhaite recevoir une copie | ... | Checkbox | Optional |

**Conditional logic:** DOB < 18 → parental signature block; service flagged for review.

---

### Form 6 — Consent: facials
**FR:** *Formulaire de consentement — soins du visage* | **EN:** Facial treatment consent form

| Field | FR | EN | Type | Req? |
|---|---|---|---|---|
| Service acknowledgment | Consens au soin sélectionné et aux techniques décrites (nettoyage, exfoliation, extraction, masque, massage) | ... | Checkbox | ✔ |
| Product patch-test acknowledgment | Réaction aux produits possible; allergies déclarées | ... | Checkbox | ✔ |
| Extractions consent | Accepte les extractions (marques rouges possibles 24–48h) | ... | Checkbox | Optional (per session) |
| Active ingredients acknowledgment | Rétinol/AHA/BHA déclarés, précautions comprises | ... | Checkbox | Conditional ✔ |
| Photography waiver | Voir formulaire de consentement photo séparé | ... | Link | — |
| Signature / date | Signature / date | ... | E-signature + date | ✔ |

**Conditional logic:** pregnancy (Form 4) → adapted protocol notice; recent isotretinoin → same block as laser.

---

### Form 7 — Fitzpatrick skin type assessment
**FR:** *Évaluation du phototype cutané (Fitzpatrick)* | **EN:** Fitzpatrick skin type assessment

Scored questionnaire (0–4 pts/question): Type I = 0–7, II = 8–16, III = 17–25, IV = 25–30, V–VI > 30.

| # | FR | EN |
|---|---|---|
| 1 | Couleur des yeux | Eye color |
| 2 | Couleur naturelle des cheveux | Natural hair color |
| 3 | Couleur de peau (zones non exposées) | Skin color (unexposed areas) |
| 4 | Taches de rousseur (zones non exposées)? | Freckles on unexposed areas? |
| 5 | Réaction au soleil (brûlure/ampoules/désquamation) | Reaction to prolonged sun exposure |
| 6 | Degré de bronzage obtenu | Degree of tanning |
| 7 | Bronzage après plusieurs heures d'exposition? | Tan after several hours of sun? |
| 8 | Réaction du visage au soleil | How does your face react to the sun? |
| 9 | Dernière exposition (soleil/autobronzant/solarium) | Last sun/tanner/bed exposure |
| 10 | Fréquence d'exposition du visage au soleil | Frequency of facial sun exposure |

Result auto-calculated (I–VI) but **esthetician-confirmed in person** (self-report unreliable, especially IV–VI).

**Conditional logic:** score IV–VI → extra consent text (pigment-change risk), Nd:YAG/longer wavelength + patch test required, auto-schedule patch test. Q9 < 2 weeks → hard stop/reschedule.

---

### Form 8 — Pre-treatment & post-treatment instructions acknowledgment
**FR:** *Reconnaissance des consignes avant et après traitement* | **EN:** Pre & post-treatment instructions acknowledgment

Sent automatically 48h before each laser session.

**Pre-treatment (checkboxes):**
- J'ai rasé la zone 24h avant le rendez-vous
- Je n'ai pas épilé à la cire, pincé ou utilisé d'épilateur depuis 4–6 semaines
- Je n'ai pas utilisé d'autobronzant depuis 2 semaines
- Je n'ai pas été exposée au soleil ou au solarium depuis 2–4 semaines
- Je n'applique aucune crème/actif sur la zone le jour du traitement
- Mes réponses au questionnaire de santé n'ont pas changé

**Post-treatment (checkboxes):**
- J'éviterai le soleil et j'utiliserai un FPS 30–50 pendant 4 semaines
- J'éviterai la chaleur (sauna, bain chaud, sport intense) pendant 24–48h
- Je ne pratiquerai pas d'épilation à la cire/pince entre les séances
- Une rougeur et un gonflement légers sont normaux et temporaires
- Je contacterai le spa en cas de réaction inhabituelle (cloques, changement de pigmentation)

**Design note:** send pre-care 72h before, post-care immediately after; only the pre-care acknowledgment gates the treatment.

---

### Form 9 — Photo consent
**FR:** *Consentement à la prise de photos* | **EN:** Photography consent form

Granular, revocable; never bundled with treatment consent (Loi 25 art. 12).

| Field | FR | EN | Type | Req? |
|---|---|---|---|---|
| Internal records | Photos avant/après pour mon dossier (usage interne uniquement) | ... | Checkbox | Optional |
| Marketing use | Utilisation promotionnelle (site web, réseaux sociaux, publicité) | ... | Checkbox — separate | Optional |
| Identifiable? | Visage visible / associées à mon nom? | ... | Radio (anonyme/visage visible) | Conditional |
| Duration | Durée du consentement | ... | Radio (12 mois / jusqu'à révocation) | ✔ if checked |
| Revocation | Retrait possible en tout temps via [privacy officer email] | ... | Info text | — |
| Signature / date | Signature / date | ... | E-signature | ✔ if checked |

**Conditional logic:** no box checked → photo module disabled in the practitioner app; consent status shown on client record.

---

### Form 10 — Cancellation / no-show / deposit policy
**FR:** *Politique d'annulation, d'absence et de dépôt* | **EN:** Cancellation, no-show & deposit policy

Accepted once at first booking; re-presented if policy changes.

| Field | FR | EN | Type | Req? |
|---|---|---|---|---|
| Advance notice | Préavis 24h (48h forfaits) | ... | Info + checkbox | ✔ |
| Late fee | Annulation tardive : 50% du tarif | ... | Info + checkbox | ✔ |
| No-show | Absence sans préavis : 100% | ... | Info + checkbox | ✔ |
| Late arrival | Grâce 10 min; au-delà soin raccourci/annulé | ... | Info + checkbox | ✔ |
| Deposit authorization | Autorise le dépôt de [X]$ et frais d'annulation sur ma carte | ... | Checkbox + card tokenization (never store raw card data) | ✔ |
| Health & safety right | Droit de refuser en cas de symptômes contagieux | ... | Checkbox | ✔ |

**Legal note (TODO LEGAL):** no-show fee disclosure + reasonable liquidated damages; card-on-file mandate language; CPA future-performance-contract rules for deposits — verify thresholds with a lawyer.

---

### Form 11 — Treatment record / session log (internal, never client-facing)
**FR:** *Fiche de traitement / journal des séances* | **EN:** Treatment record / session log

Completed by the esthetician immediately after every laser session (ideally facials too).

| Field | FR | EN | Type |
|---|---|---|---|
| Date & time | Date et heure | ... | Auto |
| Client | Cliente | ... | Prefilled |
| Practitioner | Esthéticienne | ... | Prefilled |
| Zone(s) | Zone(s) traitée(s) | ... | Multi-select |
| Phototype (confirmed) | Phototype (confirmé) | ... | I–VI |
| Skin/hair observation | Observations (peau, poils, réactions antérieures) | ... | Textarea |
| Device | Appareil / longueur d'onde | ... | Dropdown (diode 810nm, Nd:YAG 1064nm, IPL) |
| Settings | Fluence (J/cm²), fréquence (Hz), durée d'impulsion, taille de spot, refroidissement | ... | Numeric |
| Test spot result | Résultat du test | ... | Text |
| Client tolerance | Tolérance (douleur /10) | ... | Numeric |
| Immediate reaction | Rougeur, œdème, urtication, autre | ... | Checkboxes + notes |
| Eye protection worn | Lunettes portées | ... | Checkbox |
| Pre-care verified | Consignes pré-traitement vérifiées | ... | Checkbox |
| Post-care explained | Consignes post-traitement expliquées | ... | Checkbox |
| Next session | Prochaine séance (intervalle) | ... | Date |
| Incidents | Incident / réaction inhabituelle (détails + suivi) | ... | Textarea |
| Signature | Signature de l'esthéticienne | ... | E-sign |

**Conditional logic:** blistering/burn → open incident sub-record (date, description, action, client notified, photos); feed Loi 25 incident register if personal info involved.

**Retention (TODO LEGAL):** no Quebec statute fixes spa record retention; benchmark 7–10 years for consent + laser logs — confirm with lawyer/insurer.

---

### Form 12 — Feedback / satisfaction
**FR:** *Sondage de satisfaction* | **EN:** Client feedback form

| Field | FR | EN | Type | Req? |
|---|---|---|---|---|
| Overall rating | Note globale (1–5 / émojis) | ... | Radio/emoji | ✔ |
| Staff rating | Accueil et professionnalisme | ... | 1–5 | ✔ |
| Results satisfaction | Satisfaction des résultats | ... | 1–5 | ✔ |
| Comfort/cleanliness | Confort et propreté | ... | 1–5 | ✔ |
| Would recommend | NPS 0–10 | ... | 0–10 | ✔ |
| Testimonial permission | Puis-je utiliser votre témoignage (prénom seulement)? | ... | Checkbox | Optional |
| Improvement | Qu'améliorerions-nous? | ... | Textarea | Optional |
| Review link | [Lien Google Reviews] | ... | Button | Optional |

**Conditional logic:** NPS ≤ 6 → private recovery workflow (manager follow-up within 24h), no review link shown. NPS ≥ 7 → show Google review link. Testimonial use = separate consent.

---

## 3. Best practices for online forms (UX)

1. Split into steps — never one giant page. Booking (5 fields) → Intake (once) → service-specific package.
2. Trigger, don't dump — laser forms only after a laser booking exists; facial forms only after a facial booking.
3. Save progress — account/email + magic link so a client can resume on another device. Loi 25 privacy-by-default (art. 9.1) applies to the client portal too.
4. Mobile-first, large touch targets, numeric keypads for phone/DOB, date pickers.
5. Conditional logic everywhere — route ambiguous cases to human review rather than binary auto-block, except hard contraindications (pregnancy, isotretinoin, <2-week tanning).
6. French first, at equal or better prominence (Bill 96) — default FR with an equally visible EN toggle.
7. E-signature on the same screen as the final acknowledgment, PDF copy emailed to the client.
8. Reminders — 72h (pre-care + incomplete forms), 24h (confirm/cancel free), 2h (directions), one-tap modify/cancel link.
9. Error prevention over error messages — inline validation, explain why a field exists, never mark a gating health question as merely "optional".
10. Accessibility — WCAG 2.1 AA, real labels, keyboard nav, contrast.
11. After completion — confirmation summary + "what happens next" + .ics calendar file.

---

## 4. Legal checklist for Quebec

| # | Item | Status | Detail |
|---|------|--------|--------|
| 1 | Privacy officer (Loi 25 art. 3.1) | Verified law | Highest-authority person is officer by default, can delegate in writing; title + contact must be published on the website |
| 2 | Governance policies (art. 3.2) | Verified law | Written policies (retention/destruction, staff roles, complaints); summary published in plain language |
| 3 | Privacy Impact Assessment / EFVP (art. 3.3) | Verified law | Required for new/updated electronic services involving personal info — **building these forms triggers it** |
| 4 | Express consent for sensitive info (art. 12) | Verified law | Health info = sensitive → dedicated, specific, affirmative, never-pre-checked consent; state retention |
| 5 | Collect only what's necessary (art. 9) | Verified law | No health data on the booking form; only when the service requires it |
| 6 | Retention & destruction | Verified law | Define in privacy policy; destroy/anonymize once purpose fulfilled; info used for decisions kept ≥ 1 year (art. 11) |
| 7 | Breach register + notification (art. 3.5–3.8) | Verified law | Incident register; notify CAI + affected individuals on risk of serious harm |
| 8 | Third-party processors | Verified law | Data hosted outside Quebec (e.g. US SaaS) → written contract + EFVP required before transfer |
| 9 | Sanctions | Verified law | Administrative penalties up to $25M or 4% of worldwide turnover; minimum $1,000 statutory damages |
| 10 | Bill 96 / Charter | Verified law | Websites, adhesion contracts, invoices, receipts must be in French; French version at least as favourable (Charter s.57) |
| 11 | Laser scope of practice | Partially verified | No Quebec order/regulation specific to esthetic laser (AETMIS 2008); Health Canada expects training, controlled zones, eye protection, records. **TODO LEGAL: confirm with a Quebec lawyer/insurer** |
| 12 | Prohibited wording | Verified statute + industry practice | "Clinique" reserved for health establishments; avoid "médical/médicale/med spa" entirely |
| 13 | Minors (CCQ art. 14–18) | Verified law | <14: parental consent required in writing for non-required care. 14–17: may consent alone unless serious/permanent-risk care — laser is arguably cautious-category; **industry practice = parental co-signature under 18; consider refusing laser under 16 — TODO LEGAL** |
| 14 | E-signature validity | Verified law | LCJTI art. 39 + CCQ art. 2827: must identify the signer, express consent, preserve document integrity. Typed name alone was rejected in *Tabet c. Equityfeed* (2017 QCCS 3303) — use a drawn signature or click-wrap with full audit trail |
| 15 | Record retention period | Uncertain | No Quebec statute fixes spa record retention; benchmark 7–10 years for consent + laser logs — **TODO LEGAL** |
| 16 | Consumer protection (CPA) | Verified law | No false/misleading claims; disclose total prices; future-performance-contract rules may apply to prepaid packages |

---

## 5. Sources

**Legal & regulatory:**
1. LégisQuébec — Loi 25 (Loi sur la protection des renseignements personnels dans le secteur privé), art. 3.1–3.8, 9, 9.1, 11–12 — https://www.legisquebec.gouv.qc.ca/fr/document/lc/p-39.1
2. RCGT — Loi 25 obligations & sanctions — https://www.rcgt.com/fr/conseils/avis-d-experts/loi-25-quels-impacts-entreprises/
3. Ordre des optométristes — Loi 25 briefing — https://www.ooq.org/sites/default/files/2023-12/20231118%20OOQ_Loi25.pdf
4. Hilotech — sensitive info consent rules — https://hilotech.ca/fr/wiki/loi-25/consentement
5. DLA Piper — Bill 96 update (June 2025) — https://www.dlapiper.com/en-us/insights/publications/2025/06/quebecs-language-laws-changed-this-week
6. NMMA — Bill 96 implications incl. websites — https://www.nmma.org/press/article/25271
7. Bill 96 official text — https://www.publicationsduquebec.gouv.qc.ca/fileadmin/Fichiers_client/lois_et_reglements/LoisAnnuelles/en/2022/2022C14A.PDF
8. Code civil du Québec, art. 14 — https://www.legisquebec.gouv.qc.ca/fr/version/lc/CCQ-1991?code=se:14
9. Éducaloi — consent of minors 14+ — https://educaloi.qc.ca/capsules/le-consentement-aux-soins-dun-mineur-de-14-ans-ou-plus/
10. Clinique juridique UdeM — minor consent rules — https://clinique-juridique.umontreal.ca/nos-actualites/nouvelle/news/detail/News/le-consentement-aux-soins-dun-mineur-as-tu-besoin-de-la-permission-de-tes-parents/
11. CMPA — minor consent in Quebec — https://www.cmpa-acpm.ca/fr/advice-publications/browse-articles/2014/can-a-child-provide-consent
12. Stein Monast — Quebec e-signature law & *Tabet* case — https://steinmonast.ca/nouvelles-et-ressources/signature-electronique-outil-essentiel-teletravail/
13. DocuSign — Québec e-signature legality (LCJTI C-1.1) — https://www.docusign.com/fr-ca/produits/signature-electronique/legalite
14. Santé Canada — Épilation au laser: lignes directrices (CRFPT 2011) — https://www.canada.ca/fr/sante-canada/services/sante-environnement-milieu-travail/rapports-publications/radiation/epilation-laser-lignes-directrices-matiere-securite-intention-proprietaires-operateurs-installations-sante-canada-2011.html
15. INESSS (ex-AETMIS) — lasers esthétiques en contexte non médical au Québec — https://www.inesss.qc.ca/publications/repertoire-des-publications/publication/utilisation-des-lasers-de-classe-3b-et-4-et-de-la-lumiere-intense-pulsee-a-des-fins-esthetiques-dans-un-contexte-non-medical.html

**Industry practice (form structures & standards):**
16. Evergreen Laser & Medspa — published consent form suite — https://www.evergreencosmeticlaser.com/consent-forms
17. Pabau — laser hair removal informed consent template — https://pabau.com/templates/laser-hair-removal-informed-consent/
18. Dermalogica PRO — FaceMappingPRO digital consultation platform — https://pro.dermalogica.com/dermalogicas-facemapping-pro/
19. Dermalogica — Face Mapping® methodology — https://www.dermalogica.com/blogs/living-skin/face-mapping-skin-analysis
20. NCBI/StatPearls — Fitzpatrick skin types & laser recommendations — https://www.ncbi.nlm.nih.gov/books/NBK557626/
21. LazaDerm — validated Fitzpatrick scored questionnaire — https://lazaderm.com/blog/fitzpatrick-test-identifying-your-skin-type/
22. IJDVL — Fitzpatrick typing in laser hair removal — https://ijdvl.com/fitzpatrick-skin-typing-applications-in-dermatology/
23. Koalendar — salon cancellation policy template (FR) — https://koalendar.com/fr/blog/politique-d-annulation-pour-salon-de-beaute
24. Lakahina, Montréal — cancellation policy example — https://www.lakahina.ca/politique-annulation
25. Body+Beauty Lab — Fitzpatrick types vs. laser selection — https://bodyandbeautylab.com/considering-laser-hair-removal-know-your-fitzpatrick-skin-type-first/

**⚠️ Flags — verify before launch:**
- Whether Quebec has moved (or will move) toward licensing laser practice (the French décret 2024-470 is France-only) — check with a Quebec lawyer and insurer.
- Whether parental consent should be mandatory for 14–17 (recommend yes for laser; get insurer's position in writing).
- Exact record retention period (recommend 7–10 years; confirm).
- CPA treatment of prepaid laser packages (future-performance contracts) and deposit/no-show fee enforceability.
- Any municipal permit requirements for aesthetic services at the Montreal location (certificat d'autorisation d'usage).

---

## Requested build (owner's brief, 2026-09-27)

**Flow:** Form 1 (public booking, no health questions) → 3 emails (client/owner/staff) → triggers secure tokenized links to service-specific forms (first visit → Form 2; laser → Forms 3+7+5+8; facial → Forms 4+6) → staff dashboard (client files, treatment log, incident records, feedback routing).

**Hard rules:**
- Never use "médical/médicale/medical/med spa/clinique/clinic/thérapeutique/prescrit/nurse/infirmière" — use "esthéticienne/esthetician", "soin esthétique/aesthetic service".
- No guaranteed-results wording.
- French default everywhere (Bill 96); English toggle never more prominent.
- Health info is sensitive (Law 25): collect only when needed, separate unchecked consent checkboxes, never pre-checked.
- **Never send health answers by email** — emails carry only a summary + secure link to the staff dashboard.
- Prefer a Canada-hosted database (Supabase/Neon Canada region); flag clearly if any service stores data outside Canada (triggers a privacy impact assessment).
- Mobile-first, WCAG 2.1 AA.

**E-signature:** drawn signature (canvas) + name + date, never typed-name-only. Audit trail: timestamp, IP, user agent, document version. Generate a PDF per signed form, store securely, email the client a copy — decide attachment vs. secure link (owner asked which is safer).

**Staff dashboard (private, login required):** client/appointment list with status badges (forms complete/missing/to review/blocked); client file (all forms, signed PDFs, photo-consent status, Fitzpatrick result editable by esthetician); Form 11 entry after each session; burn/blister report → incident record; Form 12 auto-sent post-visit, NPS ≤ 6 → owner alert (no review link), NPS ≥ 7 → show Google review link.

**Work order (owner's phasing):**
1. Database schema + booking form (Form 1) + 3 emails.
2. Secure client links + intake (Form 2) + laser forms (3/7/5/8) + conditional logic.
3. Facial forms (4/6) + e-signature + PDFs.
4. Staff dashboard + treatment log (Form 11) + feedback (Form 12).
5. Reminders, privacy pages, tests, accessibility check.

After each phase: summarize what was done, list new Vercel env vars, wait for owner's OK before the next phase. Mark any text needing a lawyer's validation as **TODO LEGAL** (consent wording, minors, retention, deposit/no-show fees).
