// Vercel Serverless Function — Pre-appointment health & safety form
// POST /api/send-health-form
//
// Sends 3 emails via Resend on submission:
//   1. Client  — reassuring confirmation (FR/EN)
//   2. Owner   — full submission details (reply-to: client)
//   3. Staff   — appointment-relevant details only (no unnecessary personal data)
//
// All addresses come from environment variables ONLY — never hardcode a
// client-facing "from"/"to" address here. Required env vars:
//   RESEND_API_KEY   (already used by sendViaResend, shared with other forms)
//   FROM_EMAIL       e.g. "Skines Head Spa & Wellness <noreply@skines.ca>"
//   OWNER_EMAIL      e.g. "Info@skines.ca"
//   STAFF_EMAIL      the esthetician's inbox
//
// Never use "medical/médical/nurse/infirmière" in any client-facing copy
// below — say "esthéticienne / esthetician" instead.

import {
  escapeHtml, sanitizeText, validateEmail, validatePhone, validateRequired,
  isHoneypotTriggered, requireJson, setCorsHeaders,
  rateLimit, getClientIp, sendViaResend,
} from './_lib/security.js';

const LOGO = 'https://skines.ca/assets/images/logo-officiel-cropped.PNG';
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 MB, base64-decoded size

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

// ── Cloudflare Turnstile server-side verification (same pattern as /api/send-tirage) ──
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token)  return true;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const d = await r.json();
    return d.success === true;
  } catch (err) {
    console.error('[health-form] turnstile fetch error:', err.message);
    return true;
  }
}

const CONDITION_LABELS = {
  pregnancy:   'Grossesse ou allaitement',
  autoimmune:  "Conditions auto-immunes (ex. lupus, sclérodermie) ou sensibilité à la lumière",
  isotretinoin:"Isotrétinoïne (Accutane) récente ou médicaments photosensibilisants",
  herpes:      "Herpès actif / feux sauvages, infection cutanée ou plaie ouverte dans la zone",
  epilepsy:    "Épilepsie ou crises déclenchées par la lumière",
  keloids:     "Antécédents de chéloïdes ou de cicatrisation anormale",
  skinCancer:  "Cancer de la peau ou grain de beauté suspect dans la zone à traiter",
  diabetes:    "Diabète non contrôlé, troubles de la coagulation ou anticoagulants",
  vitiligo:    "Vitiligo ou psoriasis",
  tanning:     "Bronzage récent ou autobronzant",
};

const PRECARE_LABELS = {
  shaved:    "A rasé (ou rasera) la zone 24h avant le rendez-vous",
  noWaxing:  "Pas de cire/pince/épilateur depuis 4 semaines",
  noTanner:  "Pas d'autobronzant depuis 2 semaines",
  noSun:     "Pas de soleil/solarium depuis 2 semaines",
  noCream:   "N'appliquera aucune crème/actif le jour du rendez-vous",
};

const POSTCARE_LABELS = {
  understand:    "Comprend que rougeur/gonflement léger est normal",
  spf:           "Évitera le soleil, FPS 30-50 pendant 4 semaines",
  heat:          "Évitera la chaleur intense 24-48h",
  noWaxBetween:  "Pas de cire/pince entre les séances",
  contact:       "Contactera Skines en cas de réaction inhabituelle",
};

const CONSENT_POINT_KEYS = ['read', 'questions', 'varies', 'accurate', 'consentToTreatment', 'notMedical'];

function lastNameSlug(value) {
  return String(value || 'cliente').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'cliente';
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const ct = requireJson(req);
  if (!ct.ok) return res.status(ct.status).json({ error: ct.error });

  const rl = rateLimit(getClientIp(req), { maxRequests: 5, windowMs: 60_000 });
  if (!rl.ok) return res.status(rl.status).json({ error: rl.error });

  if (isHoneypotTriggered(req.body)) return res.status(200).json({ success: true });

  const cfToken = sanitizeText(req.body.cfToken, 2048);
  const tsOk = await verifyTurnstile(cfToken, getClientIp(req));
  if (!tsOk) {
    return res.status(400).json({ error: 'Vérification de sécurité échouée. Veuillez recharger la page et réessayer.' });
  }

  const check = validateRequired(req.body, ['firstName', 'lastName', 'email', 'phone']);
  if (!check.ok) return res.status(check.status).json({ error: check.error });

  const firstName = sanitizeText(req.body.firstName, 80);
  const lastName  = sanitizeText(req.body.lastName, 80);
  const email     = sanitizeText(req.body.email, 254);
  const phone     = sanitizeText(req.body.phone, 30);
  const service   = sanitizeText(req.body.service, 120);
  const apptDate  = sanitizeText(req.body.appointmentDate, 60);
  const notes     = sanitizeText(req.body.notes, 1000);
  const lang      = req.body.lang === 'en' ? 'en' : 'fr';

  if (!validateEmail(email)) return res.status(400).json({ error: 'Adresse email invalide.' });
  if (!validatePhone(phone)) return res.status(400).json({ error: 'Numéro de téléphone invalide.' });

  const rawConditions = Array.isArray(req.body.conditions) ? req.body.conditions : [];
  const conditions = rawConditions
    .map((k) => sanitizeText(String(k), 40))
    .filter((k) => Object.prototype.hasOwnProperty.call(CONDITION_LABELS, k));
  const hasFlaggedCondition = conditions.length > 0;

  const rawPreCare = Array.isArray(req.body.preCare) ? req.body.preCare : [];
  const preCare = rawPreCare
    .map((k) => sanitizeText(String(k), 40))
    .filter((k) => Object.prototype.hasOwnProperty.call(PRECARE_LABELS, k));

  const rawPostCare = Array.isArray(req.body.postCare) ? req.body.postCare : [];
  const postCare = rawPostCare
    .map((k) => sanitizeText(String(k), 40))
    .filter((k) => Object.prototype.hasOwnProperty.call(POSTCARE_LABELS, k));

  const rawConsentPoints = Array.isArray(req.body.consentPoints) ? req.body.consentPoints : [];
  const consentPoints = rawConsentPoints
    .map((k) => sanitizeText(String(k), 40))
    .filter((k) => CONSENT_POINT_KEYS.includes(k));
  if (consentPoints.length < CONSENT_POINT_KEYS.length) {
    return res.status(400).json({ error: 'Veuillez cocher chaque énoncé de consentement.' });
  }

  const fpRaw = req.body.fitzpatrick && typeof req.body.fitzpatrick === 'object' ? req.body.fitzpatrick : {};
  const fitzpatrick = {
    eyes: sanitizeText(fpRaw.eyes, 60),
    hair: sanitizeText(fpRaw.hair, 60),
    skin: sanitizeText(fpRaw.skin, 60),
    reaction: sanitizeText(fpRaw.reaction, 80),
    lastSun: sanitizeText(fpRaw.lastSun, 60),
    frequency: sanitizeText(fpRaw.frequency, 40),
  };

  // Signature: required, base64 PNG from the on-page canvas — forwarded as an
  // email attachment only, never stored server-side.
  const sigB64 = req.body.signatureBase64;
  if (!sigB64 || typeof sigB64 !== 'string' || sigB64.length < 100) {
    return res.status(400).json({ error: 'Signature manquante.' });
  }
  const signatureAttachment = { filename: `signature-${lastNameSlug(req.body.lastName)}.png`, content: sigB64 };

  // Optional attachment: client sends { attachmentName, attachmentType, attachmentBase64 }
  // (base64 payload of a PDF/image, no server-side storage — forwarded as an email attachment only)
  let attachment = null;
  const attB64 = req.body.attachmentBase64;
  if (attB64 && typeof attB64 === 'string') {
    const approxBytes = Math.ceil((attB64.length * 3) / 4);
    if (approxBytes > MAX_ATTACHMENT_BYTES) {
      return res.status(400).json({ error: 'Le fichier joint dépasse 5 Mo.' });
    }
    const attName = sanitizeText(req.body.attachmentName || 'note-medicale', 120);
    attachment = { filename: attName, content: attB64 };
  }

  let FROM_EMAIL, OWNER_EMAIL, STAFF_EMAIL;
  try {
    FROM_EMAIL  = requireEnv('FROM_EMAIL');
    OWNER_EMAIL = requireEnv('OWNER_EMAIL');
    STAFF_EMAIL = requireEnv('STAFF_EMAIL');
  } catch (err) {
    console.error('[health-form] config error:', err.message);
    return res.status(500).json({ error: "Configuration serveur incomplète. Contactez l'administrateur." });
  }
  const FROM_DISPLAY = `Formulaire Laser · Skines <${FROM_EMAIL}>`;

  const safeFirst   = escapeHtml(firstName);
  const safeLast    = escapeHtml(lastName);
  const safeEmail   = escapeHtml(email);
  const safePhone   = escapeHtml(phone);
  const safeService = escapeHtml(service || '—');
  const safeAppt    = escapeHtml(apptDate || '—');
  const safeNotes   = escapeHtml(notes || '—');
  const conditionsHtml = hasFlaggedCondition
    ? `<ul style="margin:0;padding-left:18px;">${conditions.map((k) => `<li>${escapeHtml(CONDITION_LABELS[k])}</li>`).join('')}</ul>`
    : '<p style="margin:0;">Aucune condition signalée.</p>';
  const fitzpatrickHtml = `<ul style="margin:0;padding-left:18px;">
    <li>Yeux : ${escapeHtml(fitzpatrick.eyes || '—')}</li>
    <li>Cheveux : ${escapeHtml(fitzpatrick.hair || '—')}</li>
    <li>Peau (non exposée) : ${escapeHtml(fitzpatrick.skin || '—')}</li>
    <li>Réaction au soleil : ${escapeHtml(fitzpatrick.reaction || '—')}</li>
    <li>Dernière exposition sur la zone : ${escapeHtml(fitzpatrick.lastSun || '—')}</li>
    <li>Fréquence d'exposition : ${escapeHtml(fitzpatrick.frequency || '—')}</li>
  </ul>`;
  const preCareHtml = preCare.length
    ? `<ul style="margin:0;padding-left:18px;">${preCare.map((k) => `<li>${escapeHtml(PRECARE_LABELS[k])}</li>`).join('')}</ul>`
    : '<p style="margin:0;">Aucune case cochée.</p>';
  const postCareHtml = postCare.length
    ? `<ul style="margin:0;padding-left:18px;">${postCare.map((k) => `<li>${escapeHtml(POSTCARE_LABELS[k])}</li>`).join('')}</ul>`
    : '<p style="margin:0;">Aucune case cochée.</p>';

  const logoBadgeHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;"><tr>
    <td align="center" valign="middle" width="44" height="44" style="width:44px;height:44px;border-radius:22px;background:#F5EDE3;border:1px solid rgba(201,151,58,0.30);"><img src="${LOGO}" alt="Skines" width="24" style="width:24px;height:auto;display:block;margin:10px auto;"></td>
  </tr></table>`;

  const cardTop = (title) => `
<tr><td style="height:4px;background:linear-gradient(90deg,#D4B896,#C9973A,#D4B896);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:36px 40px 0;text-align:center;">
  ${logoBadgeHtml}
  <p style="margin:0 0 18px;font-size:7.5px;letter-spacing:0.32em;text-transform:uppercase;color:#C9973A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${title}</p>
</td></tr>`;

  /* ── 1. CLIENT EMAIL — reassuring, warm, bilingual FR/EN ── */
  const hasAppointment = Boolean(apptDate);
  const clientCopy = lang === 'en'
    ? {
        title: hasAppointment ? 'YOUR HEALTH FORM · SKINES' : 'YOUR CONSULTATION REQUEST · SKINES',
        heading: `Thank you, ${safeFirst}.`,
        body: !hasAppointment
          ? "We've received your request as a consultation. Since you haven't booked an appointment yet, our team will get back to you within 72 hours" + (hasFlaggedCondition ? ", including guidance on the condition you indicated, before you book." : " to help you plan your session.")
          : (hasFlaggedCondition
              ? "We've received your health form. Because you've indicated a condition that can affect how your skin reacts to laser treatment, our team will review your form and reach out within 48 hours to guide you through next steps — this isn't a refusal, it's how we take care of you."
              : "We've received your health form. Our team reviews every submission before your appointment, as part of our care for you."),
        footer: hasAppointment
          ? 'Our team reviews every health form within 48 hours and will contact you before your appointment.'
          : 'Our team responds to every consultation request within 72 hours.',
      }
    : {
        title: hasAppointment ? 'VOTRE FORMULAIRE DE SANTÉ · SKINES' : 'VOTRE DEMANDE DE CONSULTATION · SKINES',
        heading: `Merci, ${safeFirst}.`,
        body: !hasAppointment
          ? "Nous avons bien reçu votre demande, que nous traitons comme une consultation. Puisque vous n'avez pas encore de rendez-vous réservé, notre équipe vous répondra sous 72 heures" + (hasFlaggedCondition ? ", notamment pour vous guider au sujet de la condition indiquée, avant votre réservation." : " pour vous aider à planifier votre séance.")
          : (hasFlaggedCondition
              ? "Nous avons bien reçu votre formulaire de santé. Puisque vous avez indiqué une condition pouvant modifier la façon dont votre peau réagit au laser, notre équipe examine votre formulaire et vous contactera sous 48 heures pour vous guider dans les prochaines étapes — ce n'est pas un refus, c'est notre façon de prendre soin de vous."
              : "Nous avons bien reçu votre formulaire de santé. Notre équipe examine chaque formulaire avant votre rendez-vous, par souci de votre sécurité."),
        footer: hasAppointment
          ? 'Notre équipe examine chaque formulaire de santé sous 48 heures et vous contacte avant votre rendez-vous.'
          : 'Notre équipe répond à chaque demande de consultation sous 72 heures.',
      };

  const clientHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2EBE1;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;padding:40px 16px 48px;"><tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="max-width:100%;">
  <tr><td style="padding:0 0 28px;text-align:center;">
    <img src="${LOGO}" alt="Skines" width="48" style="width:48px;height:auto;display:block;margin:0 auto 10px;">
    <p style="margin:0;font-size:7.5px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(90,70,55,0.52);font-family:Arial,Helvetica,sans-serif;font-weight:700;">SKINES HEAD SPA &amp; WELLNESS</p>
  </td></tr>
  <tr><td style="background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid rgba(182,106,90,0.13);">
    <table cellpadding="0" cellspacing="0" width="100%">
      ${cardTop(clientCopy.title)}
      <tr><td style="padding:0 44px 40px;text-align:center;">
        <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:30px;color:#2C1810;line-height:1.2;font-weight:400;font-style:italic;">${clientCopy.heading}</p>
        <p style="margin:0 0 28px;font-size:14px;color:#3A1E14;font-family:Georgia,'Times New Roman',serif;line-height:1.85;text-align:left;">${clientCopy.body}</p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;border:1px solid rgba(182,106,90,0.18);border-radius:8px;width:100%;"><tr>
          <td style="padding:14px 20px;font-size:12px;color:rgba(90,70,55,0.65);font-family:Arial,Helvetica,sans-serif;line-height:1.6;">${clientCopy.footer}</td>
        </tr></table>
        <p style="margin:16px 0 0;font-size:12px;color:rgba(90,70,55,0.55);font-family:Arial,Helvetica,sans-serif;line-height:1.6;">${lang === 'en'
          ? 'A question in the meantime? Call us at +1 (438) 260-5660 or write to <a href="mailto:Info@skines.ca" style="color:#C9973A;">Info@skines.ca</a> — no need to wait.'
          : 'Une question en attendant ? Appelez-nous au +1 (438) 260-5660 ou écrivez à <a href="mailto:Info@skines.ca" style="color:#C9973A;">Info@skines.ca</a> — pas besoin d\'attendre.'}</p>
      </td></tr>
      <tr><td style="padding:26px 44px 28px;text-align:center;background:#FAF6F0;border-top:1px solid rgba(182,106,90,0.09);">
        <img src="${LOGO}" alt="Skines" width="30" style="width:30px;height:auto;display:block;margin:0 auto 12px;opacity:0.85;">
        <p style="margin:0 0 4px;font-size:7.5px;letter-spacing:0.28em;text-transform:uppercase;color:#C9973A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">SKINES HEAD SPA &amp; WELLNESS</p>
        <p style="margin:0 0 10px;font-size:13px;color:#3A1E14;font-family:Georgia,'Times New Roman',serif;line-height:1.8;">19 Av. Shamrock, Montréal, QC H2S 1A3<br>Stationnement privé gratuit sur place<br>+1 (438) 260-5660 &nbsp;&middot;&nbsp; <a href="mailto:Info@skines.ca" style="color:#3A1E14;text-decoration:none;">Info@skines.ca</a></p>
        <p style="margin:0 0 12px;font-size:11px;color:rgba(90,70,55,0.5);font-family:Arial,Helvetica,sans-serif;letter-spacing:0.04em;">Ouvert 7j/7 &middot; 9h &ndash; 22h30</p>
        <p style="margin:0;font-size:11px;color:rgba(90,70,55,0.38);font-family:Arial,Helvetica,sans-serif;"><a href="https://skines.ca" style="color:rgba(90,70,55,0.38);text-decoration:none;">skines.ca</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  /* ── 2. OWNER EMAIL — full details ── */
  const ownerHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#EAE0D5;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAE0D5" style="background:#EAE0D5;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:100%;">
  <tr><td style="padding:36px 36px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle" width="44" height="44" align="center" style="width:44px;height:44px;border-radius:22px;background:#FFFFFF;border:1px solid rgba(104,64,52,0.15);"><img src="${LOGO}" alt="Skines" width="24" style="width:24px;height:auto;display:block;margin:10px auto;"></td>
      <td valign="middle" style="padding-left:14px;">
        <p style="margin:0 0 4px;font-size:20px;letter-spacing:0.3em;color:#2C1810;font-family:Georgia,'Times New Roman',serif;">SKINES</p>
        <p style="margin:0;font-size:8px;letter-spacing:0.28em;text-transform:uppercase;color:#B66A5A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${hasFlaggedCondition ? 'Formulaire de santé — Note médicale requise' : 'Formulaire de santé — Aucune condition signalée'}</p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:14px 36px 36px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#FFFFFF;border-radius:12px;border:1px solid rgba(104,64,52,0.12);">
      <tr><td style="padding:26px 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3A1E14;line-height:1.9;">
        <p style="margin:0 0 6px;"><strong>Nom :</strong> ${safeFirst} ${safeLast}</p>
        <p style="margin:0 0 6px;"><strong>Email :</strong> ${safeEmail}</p>
        <p style="margin:0 0 6px;"><strong>Téléphone :</strong> ${safePhone}</p>
        <p style="margin:0 0 6px;"><strong>Service :</strong> ${safeService}</p>
        <p style="margin:0 0 14px;"><strong>Date de rendez-vous indiquée :</strong> ${safeAppt}</p>
        ${!hasAppointment ? '<p style="margin:0 0 14px;padding:12px 14px;background:#EEF3FA;border-radius:6px;color:#2E5A8A;"><strong>Demande de consultation</strong> — aucun rendez-vous réservé. La cliente a été informée d\'une réponse sous 72 heures.</p>' : ''}
        <p style="margin:0 0 6px;"><strong>Conditions signalées :</strong></p>
        <div style="margin:0 0 14px;">${conditionsHtml}</div>
        <p style="margin:0 0 6px;"><strong>Type de peau (auto-évalué, à confirmer en personne) :</strong></p>
        <div style="margin:0 0 14px;">${fitzpatrickHtml}</div>
        <p style="margin:0 0 6px;"><strong>Consignes pré-rendez-vous confirmées :</strong></p>
        <div style="margin:0 0 14px;">${preCareHtml}</div>
        <p style="margin:0 0 6px;"><strong>Consignes post-séance reconnues :</strong></p>
        <div style="margin:0 0 14px;">${postCareHtml}</div>
        <p style="margin:0 0 6px;"><strong>Précisions :</strong></p>
        <p style="margin:0;white-space:pre-wrap;">${safeNotes}</p>
        <p style="margin:14px 0 0;padding:12px 14px;background:${attachment ? '#F3F8F1' : '#FDF8EC'};border-radius:6px;color:${attachment ? '#3D6B3D' : '#8A6A1F'};">
          <strong>Note du médecin :</strong> ${attachment
            ? `fournie (voir pièce jointe « ${escapeHtml(attachment.filename)} »). En la fournissant, le médecin confirme que le soin convient à la cliente — cette validation lui appartient.`
            : "non fournie pour l'instant. Sans validation du médecin, cette condition reste sous la responsabilité de l'esthéticienne : à examiner avant de confirmer le rendez-vous."}
        </p>
        <p style="margin:14px 0 0;color:#684034;"><strong>Signature :</strong> voir pièce jointe (${escapeHtml(signatureAttachment.filename)})</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  /* ── 3. STAFF EMAIL — appointment-relevant only, no extra personal data ── */
  const staffHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#EAE0D5;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAE0D5" style="background:#EAE0D5;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:100%;">
  <tr><td style="padding:36px 36px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle" width="40" height="40" align="center" style="width:40px;height:40px;border-radius:20px;background:#FFFFFF;border:1px solid rgba(104,64,52,0.15);"><img src="${LOGO}" alt="Skines" width="22" style="width:22px;height:auto;display:block;margin:9px auto;"></td>
      <td valign="middle" style="padding-left:14px;">
        <p style="margin:0 0 4px;font-size:18px;letter-spacing:0.3em;color:#2C1810;font-family:Georgia,'Times New Roman',serif;">SKINES</p>
        <p style="margin:0;font-size:8px;letter-spacing:0.28em;text-transform:uppercase;color:#B66A5A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${hasFlaggedCondition ? 'Note médicale requise avant le rendez-vous' : 'Formulaire de santé reçu'}</p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:14px 36px 36px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#FFFFFF;border-radius:12px;border:1px solid rgba(104,64,52,0.12);">
      <tr><td style="padding:26px 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3A1E14;line-height:1.9;">
        <p style="margin:0 0 6px;"><strong>Cliente :</strong> ${safeFirst} ${safeLast.charAt(0)}.</p>
        <p style="margin:0 0 6px;"><strong>Service :</strong> ${safeService}</p>
        <p style="margin:0 0 14px;"><strong>Date de rendez-vous indiquée :</strong> ${safeAppt}</p>
        ${!hasAppointment ? '<p style="margin:0 0 14px;padding:12px 14px;background:#EEF3FA;border-radius:6px;color:#2E5A8A;"><strong>Demande de consultation</strong> — aucun rendez-vous réservé. La cliente a été informée d\'une réponse sous 72 heures.</p>' : ''}
        <p style="margin:0 0 6px;"><strong>Conditions signalées :</strong></p>
        <div style="margin:0 0 14px;">${conditionsHtml}</div>
        <p style="margin:0 0 6px;"><strong>Type de peau (auto-évalué, à confirmer en personne) :</strong></p>
        <div style="margin:0;">${fitzpatrickHtml}</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  try {
    const results = await Promise.allSettled([
      sendViaResend({
        from: FROM_DISPLAY,
        to: email,
        replyTo: OWNER_EMAIL,
        subject: lang === 'en'
          ? (hasAppointment ? 'Your health form — Skines Head Spa & Wellness' : 'Your consultation request — Skines Head Spa & Wellness')
          : (hasAppointment ? 'Votre formulaire de santé — Skines Head Spa & Wellness' : 'Votre demande de consultation — Skines Head Spa & Wellness'),
        html: clientHtml,
      }),
      sendViaResend({
        from: FROM_DISPLAY,
        to: OWNER_EMAIL,
        replyTo: email,
        subject: `${hasFlaggedCondition ? '⚠ Note médicale requise — ' : ''}${hasAppointment ? 'Formulaire de santé' : 'Demande de consultation (72h)'} — ${firstName} ${lastName}`,
        html: ownerHtml,
        attachments: attachment ? [signatureAttachment, attachment] : [signatureAttachment],
      }),
      sendViaResend({
        from: FROM_DISPLAY,
        to: STAFF_EMAIL,
        subject: `${hasFlaggedCondition ? '⚠ Note médicale requise — ' : ''}${hasAppointment ? 'Formulaire de santé reçu' : 'Demande de consultation (72h)'} — ${firstName} ${lastName.charAt(0)}.`,
        html: staffHtml,
      }),
    ]);

    const failures = results.filter((r) => r.status === 'rejected');
    failures.forEach((f) => console.error('[health-form] email failed:', f.reason?.message));

    // Succeed as long as the client confirmation went out; log the rest.
    if (results[0].status === 'rejected') {
      throw new Error('client email failed');
    }

    return res.status(200).json({
      success: true,
      partial: failures.length > 0,
    });
  } catch (err) {
    console.error('[health-form] failed:', err.message);
    return res.status(500).json({ error: "Erreur lors de l'envoi. Réessayez ou contactez-nous directement." });
  }
}
