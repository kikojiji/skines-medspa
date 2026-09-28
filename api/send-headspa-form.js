// Vercel Serverless Function — Pre-appointment Head Spa consultation form
// POST /api/send-headspa-form
//
// Sends 3 emails via Resend on submission:
//   1. Client  — reassuring confirmation (FR/EN)
//   2. Owner   — full submission details (reply-to: client)
//   3. Staff   — appointment-relevant details only (no unnecessary personal data)
//
// All addresses come from environment variables ONLY. Required env vars:
//   RESEND_API_KEY, FROM_EMAIL, OWNER_EMAIL, STAFF_EMAIL (shared with /api/send-health-form)
//
// Never use "medical/médical/nurse/infirmière" in any client-facing copy
// below — say "praticienne" instead.

import {
  escapeHtml, sanitizeText, validateEmail, validatePhone, validateRequired,
  isHoneypotTriggered, requireJson, setCorsHeaders,
  rateLimit, getClientIp, sendViaResend,
} from './_lib/security.js';

const LOGO = 'https://skines.ca/assets/images/logo-officiel-cropped.PNG';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not configured`);
  return v;
}

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
    console.error('[headspa-form] turnstile fetch error:', err.message);
    return true;
  }
}

const CONCERN_LABELS = {
  cuirSensible: 'Cuir chevelu sensible ou irritable',
  chuteCheveux: 'Chute de cheveux',
  pellicules: 'Pellicules',
  secheresse: 'Cheveux secs / cassants',
  tensionsStress: 'Tensions, stress, maux de tête',
  manqueVolume: 'Manque de volume ou de brillance',
};

const RECENT_TREATMENT_LABELS = {
  colorationPermanente: 'Coloration, permanente ou lissage récent (moins de 2 semaines)',
  extensions: 'Extensions, tissage ou perruque fixée',
  keratine: 'Traitement à la kératine récent',
};

const SCALP_CONDITION_LABELS = {
  psoriasis: 'Psoriasis',
  eczema: 'Eczéma',
  dermatite: 'Dermatite',
  hypertension: 'Hypertension ou trouble cardiaque',
  migraines: 'Migraines fréquentes',
  chirurgieRecente: 'Chirurgie ou blessure récente au cuir chevelu / à la tête',
  injections: 'Injections récentes (Botox, fillers) au visage, cou ou cuir chevelu',
};

const CONSENT_POINT_KEYS = ['read', 'accurate', 'consentToTreatment', 'notMedical'];

function listHtml(map, keys) {
  return keys.length
    ? `<ul style="margin:0;padding-left:18px;">${keys.map((k) => `<li>${escapeHtml(map[k])}</li>`).join('')}</ul>`
    : '<p style="margin:0;">Aucune.</p>';
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
  const lang      = req.body.lang === 'en' ? 'en' : 'fr';

  if (!validateEmail(email)) return res.status(400).json({ error: 'Adresse email invalide.' });
  if (!validatePhone(phone)) return res.status(400).json({ error: 'Numéro de téléphone invalide.' });

  const pregnancy = req.body.pregnancy === 'oui' ? 'oui' : 'non';
  const isPregnant = pregnancy === 'oui';

  const allergies = sanitizeText(req.body.allergies, 300);
  const goals     = sanitizeText(req.body.goals, 800);
  const notes     = sanitizeText(req.body.notes, 1000);

  const concerns = (Array.isArray(req.body.concerns) ? req.body.concerns : [])
    .map((k) => sanitizeText(String(k), 30)).filter((k) => k in CONCERN_LABELS);
  const recentTreatments = (Array.isArray(req.body.recentTreatments) ? req.body.recentTreatments : [])
    .map((k) => sanitizeText(String(k), 30)).filter((k) => k in RECENT_TREATMENT_LABELS);
  const scalpConditions = (Array.isArray(req.body.scalpConditions) ? req.body.scalpConditions : [])
    .map((k) => sanitizeText(String(k), 30)).filter((k) => k in SCALP_CONDITION_LABELS);

  const consentPoints = (Array.isArray(req.body.consentPoints) ? req.body.consentPoints : [])
    .map((k) => sanitizeText(String(k), 40)).filter((k) => CONSENT_POINT_KEYS.includes(k));
  if (consentPoints.length < CONSENT_POINT_KEYS.length) {
    return res.status(400).json({ error: 'Veuillez cocher chaque énoncé de consentement.' });
  }

  const sigB64 = req.body.signatureBase64;
  if (!sigB64 || typeof sigB64 !== 'string' || sigB64.length < 100) {
    return res.status(400).json({ error: 'Signature manquante.' });
  }
  const sigSlug = String(lastName || 'cliente').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40) || 'cliente';
  const signatureAttachment = { filename: `signature-${sigSlug}.png`, content: sigB64 };

  let FROM_EMAIL, OWNER_EMAIL, STAFF_EMAIL;
  try {
    FROM_EMAIL  = requireEnv('FROM_EMAIL');
    OWNER_EMAIL = requireEnv('OWNER_EMAIL');
    STAFF_EMAIL = requireEnv('STAFF_EMAIL');
  } catch (err) {
    console.error('[headspa-form] config error:', err.message);
    return res.status(500).json({ error: "Configuration serveur incomplète. Contactez l'administrateur." });
  }

  const safeFirst   = escapeHtml(firstName);
  const safeLast    = escapeHtml(lastName);
  const safeEmail   = escapeHtml(email);
  const safePhone   = escapeHtml(phone);
  const safeService = escapeHtml(service || '—');
  const safeAppt    = escapeHtml(apptDate || '—');
  const safeGoals   = escapeHtml(goals || '—');
  const safeNotes   = escapeHtml(notes || '—');
  const safeAllergies = escapeHtml(allergies || 'Aucune déclarée');

  const concernsHtml = listHtml(CONCERN_LABELS, concerns);
  const recentTreatmentsHtml = listHtml(RECENT_TREATMENT_LABELS, recentTreatments);
  const scalpConditionsHtml = listHtml(SCALP_CONDITION_LABELS, scalpConditions);

  const logoBadgeHtml = `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;"><tr>
    <td align="center" valign="middle" width="44" height="44" style="width:44px;height:44px;border-radius:22px;background:#F5EDE3;border:1px solid rgba(201,151,58,0.30);"><img src="${LOGO}" alt="Skines" width="24" style="width:24px;height:auto;display:block;margin:10px auto;"></td>
  </tr></table>`;

  const cardTop = (title) => `
<tr><td style="height:4px;background:linear-gradient(90deg,#D4B896,#C9973A,#D4B896);font-size:0;line-height:0;">&nbsp;</td></tr>
<tr><td style="padding:36px 40px 0;text-align:center;">
  ${logoBadgeHtml}
  <p style="margin:0 0 18px;font-size:7.5px;letter-spacing:0.32em;text-transform:uppercase;color:#C9973A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${title}</p>
</td></tr>`;

  /* ── 1. CLIENT EMAIL ── */
  const hasAppointment = Boolean(apptDate);
  const clientCopy = lang === 'en'
    ? {
        title: hasAppointment ? 'YOUR HEAD SPA CONSULTATION · SKINES' : 'YOUR CONSULTATION REQUEST · SKINES',
        heading: `Thank you, ${safeFirst}.`,
        body: hasAppointment
          ? "We've received your Head Spa consultation form. Your practitioner will review it before your appointment to prepare a ritual tailored to your scalp."
          : "We've received your request as a consultation. Since you haven't booked an appointment yet, our team will get back to you within 72 hours to answer your questions and help you choose the right ritual.",
        footer: hasAppointment
          ? 'Your practitioner reviews every form before your appointment.'
          : 'Our team responds to every consultation request within 72 hours.',
      }
    : {
        title: hasAppointment ? 'VOTRE CONSULTATION HEAD SPA · SKINES' : 'VOTRE DEMANDE DE CONSULTATION · SKINES',
        heading: `Merci, ${safeFirst}.`,
        body: hasAppointment
          ? "Nous avons bien reçu votre fiche de consultation Head Spa. Votre praticienne la consultera avant votre rendez-vous pour préparer un rituel adapté à votre cuir chevelu."
          : "Nous avons bien reçu votre demande, que nous traitons comme une consultation. Puisque vous n'avez pas encore de rendez-vous réservé, notre équipe vous répondra sous 72 heures pour répondre à vos questions et vous aider à choisir le rituel qui vous convient.",
        footer: hasAppointment
          ? 'Votre praticienne examine chaque fiche avant votre rendez-vous.'
          : 'Notre équipe répond à chaque demande de consultation sous 72 heures.',
      };

  const clientHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2EBE1;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;padding:40px 16px 48px;"><tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="max-width:100%;">
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
        <p style="margin:0;font-size:8px;letter-spacing:0.28em;text-transform:uppercase;color:#B66A5A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${isPregnant ? '⚠ Grossesse déclarée — Fiche de consultation Head Spa' : 'Fiche de consultation Head Spa'}</p>
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
        ${isPregnant ? '<p style="margin:0 0 14px;padding:12px 14px;background:#FDF0EC;border-radius:6px;color:#9A3520;"><strong>Grossesse ou allaitement déclaré :</strong> adapter le protocole (pression, positionnement) avant la séance.</p>' : ''}
        <p style="margin:0 0 6px;"><strong>Objectifs :</strong></p>
        <div style="margin:0 0 14px;">${concernsHtml}</div>
        <p style="margin:0 0 6px;"><strong>Traitements capillaires récents :</strong></p>
        <div style="margin:0 0 14px;">${recentTreatmentsHtml}</div>
        <p style="margin:0 0 6px;"><strong>Conditions connues :</strong></p>
        <div style="margin:0 0 14px;">${scalpConditionsHtml}</div>
        <p style="margin:0 0 6px;"><strong>Allergies / intolérances :</strong> ${safeAllergies}</p>
        <p style="margin:0 0 6px;"><strong>Précisions sur les objectifs :</strong></p>
        <p style="margin:0 0 14px;white-space:pre-wrap;">${safeGoals}</p>
        <p style="margin:0 0 6px;"><strong>Précisions :</strong></p>
        <p style="margin:0;white-space:pre-wrap;">${safeNotes}</p>
        <p style="margin:14px 0 0;color:#684034;"><strong>Signature :</strong> voir pièce jointe (${escapeHtml(signatureAttachment.filename)})</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  /* ── 3. STAFF EMAIL — appointment-relevant only ── */
  const staffHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#EAE0D5;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAE0D5" style="background:#EAE0D5;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:100%;">
  <tr><td style="padding:36px 36px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle" width="40" height="40" align="center" style="width:40px;height:40px;border-radius:20px;background:#FFFFFF;border:1px solid rgba(104,64,52,0.15);"><img src="${LOGO}" alt="Skines" width="22" style="width:22px;height:auto;display:block;margin:9px auto;"></td>
      <td valign="middle" style="padding-left:14px;">
        <p style="margin:0 0 4px;font-size:18px;letter-spacing:0.3em;color:#2C1810;font-family:Georgia,'Times New Roman',serif;">SKINES</p>
        <p style="margin:0;font-size:8px;letter-spacing:0.28em;text-transform:uppercase;color:#B66A5A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${isPregnant ? '⚠ Grossesse déclarée' : 'Fiche de consultation reçue'}</p>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:14px 36px 36px;">
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#FFFFFF;border-radius:12px;border:1px solid rgba(104,64,52,0.12);">
      <tr><td style="padding:26px 30px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#3A1E14;line-height:1.9;">
        <p style="margin:0 0 6px;"><strong>Cliente :</strong> ${safeFirst} ${safeLast.charAt(0)}.</p>
        <p style="margin:0 0 6px;"><strong>Service :</strong> ${safeService}</p>
        <p style="margin:0 0 14px;"><strong>Date de rendez-vous indiquée :</strong> ${safeAppt}</p>
        ${!hasAppointment ? '<p style="margin:0 0 14px;padding:12px 14px;background:#EEF3FA;border-radius:6px;color:#2E5A8A;"><strong>Demande de consultation</strong> — pas encore de rendez-vous. Réponse promise sous 72 heures.</p>' : ''}
        ${isPregnant ? '<p style="margin:0 0 14px;padding:12px 14px;background:#FDF0EC;border-radius:6px;color:#9A3520;"><strong>Grossesse ou allaitement déclaré</strong> — adapter le protocole.</p>' : ''}
        <p style="margin:0 0 6px;"><strong>Objectifs :</strong></p>
        <div style="margin:0 0 14px;">${concernsHtml}</div>
        <p style="margin:14px 0 6px;"><strong>Conditions connues :</strong></p>
        <div style="margin:0;">${scalpConditionsHtml}</div>
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
        subject: lang === 'en'
          ? (hasAppointment ? 'Your Head Spa consultation — Skines Head Spa & Wellness' : 'Your consultation request — Skines Head Spa & Wellness')
          : (hasAppointment ? 'Votre consultation Head Spa — Skines Head Spa & Wellness' : 'Votre demande de consultation — Skines Head Spa & Wellness'),
        html: clientHtml,
      }),
      sendViaResend({
        from: FROM_EMAIL,
        to: OWNER_EMAIL,
        replyTo: email,
        subject: `${isPregnant ? '⚠ Grossesse — ' : ''}${hasAppointment ? 'Fiche de consultation Head Spa' : 'Demande de consultation (72h)'} — ${firstName} ${lastName}`,
        html: ownerHtml,
        attachments: [signatureAttachment],
      }),
      sendViaResend({
        from: FROM_EMAIL,
        to: STAFF_EMAIL,
        subject: `${isPregnant ? '⚠ Grossesse — ' : ''}${hasAppointment ? 'Fiche de consultation' : 'Demande de consultation (72h)'} — ${firstName} ${lastName.charAt(0)}.`,
        html: staffHtml,
      }),
    ]);

    const failures = results.filter((r) => r.status === 'rejected');
    failures.forEach((f) => console.error('[headspa-form] email failed:', f.reason?.message));

    if (results[0].status === 'rejected') {
      throw new Error('client email failed');
    }

    return res.status(200).json({ success: true, partial: failures.length > 0 });
  } catch (err) {
    console.error('[headspa-form] failed:', err.message);
    return res.status(500).json({ error: "Erreur lors de l'envoi. Réessayez ou contactez-nous directement." });
  }
}
