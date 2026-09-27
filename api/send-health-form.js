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

  const cardTop = (title) => `
<tr><td style="height:4px;background:linear-gradient(90deg,#D4B896,#C9973A,#D4B896);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:36px 40px 0;text-align:center;">
  <p style="margin:0 0 18px;font-size:7.5px;letter-spacing:0.32em;text-transform:uppercase;color:#C9973A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${title}</p>
</td></tr>`;

  /* ── 1. CLIENT EMAIL — reassuring, warm, bilingual FR/EN ── */
  const clientCopy = lang === 'en'
    ? {
        title: 'YOUR HEALTH FORM · SKINES',
        heading: `Thank you, ${safeFirst}.`,
        body: hasFlaggedCondition
          ? "We've received your health form. Because you've indicated a condition that can affect how your skin reacts to laser treatment, our team will review your form and reach out within 48 hours to guide you through next steps — this isn't a refusal, it's how we take care of you."
          : "We've received your health form. Our team reviews every submission before your appointment, as part of our care for you.",
        footer: 'Our team reviews every health form within 48 hours and will contact you before your appointment.',
      }
    : {
        title: 'VOTRE FORMULAIRE DE SANTÉ · SKINES',
        heading: `Merci, ${safeFirst}.`,
        body: hasFlaggedCondition
          ? "Nous avons bien reçu votre formulaire de santé. Puisque vous avez indiqué une condition pouvant modifier la façon dont votre peau réagit au laser, notre équipe examine votre formulaire et vous contactera sous 48 heures pour vous guider dans les prochaines étapes — ce n'est pas un refus, c'est notre façon de prendre soin de vous."
          : "Nous avons bien reçu votre formulaire de santé. Notre équipe examine chaque formulaire avant votre rendez-vous, par souci de votre sécurité.",
        footer: 'Notre équipe examine chaque formulaire de santé sous 48 heures et vous contacte avant votre rendez-vous.',
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
      </td></tr>
      <tr><td style="padding:20px 44px 24px;text-align:center;background:#FAF6F0;border-top:1px solid rgba(182,106,90,0.09);">
        <p style="margin:0;font-size:11px;color:rgba(90,70,55,0.38);font-family:Arial,Helvetica,sans-serif;">Montréal, Canada &nbsp;&middot;&nbsp; <a href="https://skines.ca" style="color:rgba(90,70,55,0.38);text-decoration:none;">skines.ca</a></p>
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
    <p style="margin:0 0 4px;font-size:20px;letter-spacing:0.3em;color:#2C1810;font-family:Georgia,'Times New Roman',serif;">SKINES</p>
    <p style="margin:0;font-size:8px;letter-spacing:0.28em;text-transform:uppercase;color:#B66A5A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${hasFlaggedCondition ? 'Formulaire de santé — Note médicale requise' : 'Formulaire de santé — Aucune condition signalée'}</p>
  </td></tr>
  <tr><td style="padding:14px 36px 36px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#FFFFFF;border-radius:12px;border:1px solid rgba(104,64,52,0.12);">
      <tr><td style="padding:26px 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3A1E14;line-height:1.9;">
        <p style="margin:0 0 6px;"><strong>Nom :</strong> ${safeFirst} ${safeLast}</p>
        <p style="margin:0 0 6px;"><strong>Email :</strong> ${safeEmail}</p>
        <p style="margin:0 0 6px;"><strong>Téléphone :</strong> ${safePhone}</p>
        <p style="margin:0 0 6px;"><strong>Service :</strong> ${safeService}</p>
        <p style="margin:0 0 14px;"><strong>Date de rendez-vous indiquée :</strong> ${safeAppt}</p>
        <p style="margin:0 0 6px;"><strong>Conditions signalées :</strong></p>
        <div style="margin:0 0 14px;">${conditionsHtml}</div>
        <p style="margin:0 0 6px;"><strong>Précisions :</strong></p>
        <p style="margin:0;white-space:pre-wrap;">${safeNotes}</p>
        ${attachment ? `<p style="margin:14px 0 0;color:#684034;"><strong>Pièce jointe :</strong> ${escapeHtml(attachment.filename)}</p>` : ''}
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
    <p style="margin:0 0 4px;font-size:18px;letter-spacing:0.3em;color:#2C1810;font-family:Georgia,'Times New Roman',serif;">SKINES</p>
    <p style="margin:0;font-size:8px;letter-spacing:0.28em;text-transform:uppercase;color:#B66A5A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${hasFlaggedCondition ? 'Note médicale requise avant le rendez-vous' : 'Formulaire de santé reçu'}</p>
  </td></tr>
  <tr><td style="padding:14px 36px 36px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#FFFFFF;border-radius:12px;border:1px solid rgba(104,64,52,0.12);">
      <tr><td style="padding:26px 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3A1E14;line-height:1.9;">
        <p style="margin:0 0 6px;"><strong>Cliente :</strong> ${safeFirst} ${safeLast.charAt(0)}.</p>
        <p style="margin:0 0 6px;"><strong>Service :</strong> ${safeService}</p>
        <p style="margin:0 0 14px;"><strong>Date de rendez-vous indiquée :</strong> ${safeAppt}</p>
        <p style="margin:0 0 6px;"><strong>Conditions signalées :</strong></p>
        <div style="margin:0;">${conditionsHtml}</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  try {
    const results = await Promise.allSettled([
      sendViaResend({
        from: FROM_EMAIL,
        to: email,
        replyTo: OWNER_EMAIL,
        subject: lang === 'en' ? 'Your health form — Skines Head Spa & Wellness' : 'Votre formulaire de santé — Skines Head Spa & Wellness',
        html: clientHtml,
      }),
      sendViaResend({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        replyTo: email,
        subject: `${hasFlaggedCondition ? '⚠ Note médicale requise' : 'Formulaire de santé'} — ${firstName} ${lastName}`,
        html: ownerHtml,
        attachments: attachment ? [attachment] : undefined,
      }),
      sendViaResend({
        from: FROM_EMAIL,
        to: STAFF_EMAIL,
        subject: `${hasFlaggedCondition ? '⚠ Note médicale requise' : 'Formulaire de santé reçu'} — ${firstName} ${lastName.charAt(0)}.`,
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
