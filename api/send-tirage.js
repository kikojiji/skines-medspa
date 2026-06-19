// Vercel Serverless Function — Tirage giveaway registration
// POST /api/send-tirage

import {
  escapeHtml, sanitizeText, validatePhone, validateEmail, validateRequired,
  isHoneypotTriggered, requireJson, setCorsHeaders,
  rateLimit, getClientIp, sendViaResend,
} from './_lib/security.js';

const FROM  = 'Skines Med Spa <giftcards@skines.info>';
const ADMIN = 'adobe.abidi@gmail.com';

// In-memory duplicate guard (best-effort on serverless cold starts)
const seenEmails = new Set();

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ct = requireJson(req);
  if (!ct.ok) return res.status(ct.status).json({ error: ct.error });

  const rl = rateLimit(getClientIp(req), { maxRequests: 3, windowMs: 60_000 });
  if (!rl.ok) return res.status(rl.status).json({ error: rl.error });

  if (isHoneypotTriggered(req.body)) return res.status(200).json({ success: true });

  const check = validateRequired(req.body, ['firstName', 'lastName', 'phone', 'email', 'username']);
  if (!check.ok) return res.status(check.status).json({ error: check.error });

  // Sanitize
  const firstName = sanitizeText(req.body.firstName, 80);
  const lastName  = sanitizeText(req.body.lastName, 80);
  const phone     = sanitizeText(req.body.phone, 30);
  const email     = sanitizeText(req.body.email, 254);
  const username  = sanitizeText(req.body.username, 100);
  const service   = sanitizeText(req.body.service, 120);

  // Validate
  if (!validatePhone(phone)) return res.status(400).json({ error: 'Numéro de téléphone invalide.' });
  if (!validateEmail(email)) return res.status(400).json({ error: 'Adresse email invalide.' });

  // Duplicate check
  const emailKey = email.toLowerCase().trim();
  if (seenEmails.has(emailKey)) {
    return res.status(409).json({ error: 'Cette adresse email est déjà inscrite au tirage.' });
  }
  seenEmails.add(emailKey);

  // Photo attachment (optional, compressed base64 from client)
  let photoAttachment = null;
  const rawPhoto    = req.body.photo;
  const rawPhotoType = req.body.photoType || 'image/jpeg';
  if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.length > 20) {
    if (rawPhoto.length > 9_000_000) {
      return res.status(413).json({ error: 'Photo trop volumineuse. Maximum 7 MB.' });
    }
    const ext = rawPhotoType.includes('png') ? 'png'
              : rawPhotoType.includes('heic') || rawPhotoType.includes('heif') ? 'heic'
              : 'jpg';
    photoAttachment = { filename: `${firstName}_${lastName}.${ext}`, content: rawPhoto };
  }

  // Escape for HTML
  const safeFirst    = escapeHtml(firstName);
  const safeLast     = escapeHtml(lastName);
  const safePhone    = escapeHtml(phone);
  const safeEmail    = escapeHtml(email);
  const safeUsername = escapeHtml(username);
  const safeService  = escapeHtml(service) || '—';

  const ua         = req.headers['user-agent'] || '';
  const deviceType = /mobile|android|iphone|ipad/i.test(ua) ? 'Mobile' : 'Desktop';
  const ip         = getClientIp(req);
  const submittedAt = new Date().toLocaleString('fr-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  /* ── ADMIN EMAIL ── */
  const adminHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2EBE3;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE3;padding:40px 20px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" style="max-width:100%;background:#FDFAF7;border-radius:14px;border:1px solid rgba(182,106,90,0.15);box-shadow:0 8px 40px rgba(58,30,20,0.09);overflow:hidden;">

  <tr><td style="background:#3A1E14;padding:28px 40px;text-align:center;">
    <p style="margin:0;font-size:11px;letter-spacing:0.38em;color:rgba(245,237,227,0.55);text-transform:uppercase;font-family:Arial,sans-serif;">S K I N E S</p>
    <p style="margin:4px 0 0;font-size:10px;letter-spacing:0.26em;color:rgba(245,237,227,0.35);text-transform:uppercase;font-family:Arial,sans-serif;">MED SPA · MONTRÉAL</p>
  </td></tr>

  <tr><td style="background:linear-gradient(135deg,#B66A5A,#9A4A3A);padding:16px 40px;text-align:center;">
    <p style="margin:0;font-size:12px;letter-spacing:0.22em;color:#FDF8F5;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">✦ Nouvelle inscription — Tirage Exclusif</p>
  </td></tr>

  <tr><td style="padding:36px 40px 28px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F4F0;border:1px solid rgba(182,106,90,0.14);border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(182,106,90,0.10);">
        <p style="margin:0;font-size:9.5px;letter-spacing:0.22em;text-transform:uppercase;color:#B66A5A;font-family:Arial,sans-serif;font-weight:700;">Informations du participant</p>
      </td></tr>
      <tr><td style="padding:4px 20px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${[
            ['Prénom',       safeFirst],
            ['Nom',          safeLast],
            ['Téléphone',    safePhone],
            ['Email',        safeEmail],
            ['Instagram / TikTok', safeUsername],
            ['Soin d\'intérêt',   safeService],
          ].map(([label, val]) => `
          <tr>
            <td width="38%" style="padding:9px 0;border-bottom:1px solid rgba(182,106,90,0.07);vertical-align:top;">
              <p style="margin:0;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(106,90,80,0.50);font-family:Arial,sans-serif;">${label}</p>
            </td>
            <td style="padding:9px 0 9px 12px;border-bottom:1px solid rgba(182,106,90,0.07);vertical-align:top;">
              <p style="margin:0;font-size:14px;color:#3A1E14;font-family:Georgia,serif;">${val}</p>
            </td>
          </tr>`).join('')}
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F4F0;border:1px solid rgba(182,106,90,0.14);border-radius:10px;overflow:hidden;margin-bottom:24px;">
      <tr><td style="padding:14px 20px;border-bottom:1px solid rgba(182,106,90,0.10);">
        <p style="margin:0;font-size:9.5px;letter-spacing:0.22em;text-transform:uppercase;color:#B66A5A;font-family:Arial,sans-serif;font-weight:700;">Métadonnées</p>
      </td></tr>
      <tr><td style="padding:4px 20px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${[
            ['Date / Heure',  submittedAt],
            ['Adresse IP',    ip],
            ['Appareil',      deviceType],
            ['Photo jointe',  photoAttachment ? `Oui — ${photoAttachment.filename}` : 'Non'],
          ].map(([label, val]) => `
          <tr>
            <td width="38%" style="padding:9px 0;border-bottom:1px solid rgba(182,106,90,0.07);vertical-align:top;">
              <p style="margin:0;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(106,90,80,0.50);font-family:Arial,sans-serif;">${label}</p>
            </td>
            <td style="padding:9px 0 9px 12px;border-bottom:1px solid rgba(182,106,90,0.07);vertical-align:top;">
              <p style="margin:0;font-size:13px;color:#3A1E14;font-family:Arial,sans-serif;">${val}</p>
            </td>
          </tr>`).join('')}
        </table>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:rgba(182,106,90,0.07);border-left:3px solid #B66A5A;padding:14px 18px;border-radius:0 6px 6px 0;">
        <p style="margin:0;font-size:12.5px;color:rgba(58,30,20,0.75);font-family:Arial,sans-serif;line-height:1.65;">
          Contactez <strong style="color:#3A1E14;">${safeFirst} ${safeLast}</strong>
          au <strong style="color:#3A1E14;">${safePhone}</strong>
          ou par email : <strong style="color:#3A1E14;">${safeEmail}</strong>
        </p>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="background:#F8F4F0;padding:16px 40px;text-align:center;border-top:1px solid rgba(182,106,90,0.10);">
    <p style="margin:0;font-size:10px;color:rgba(106,90,80,0.40);letter-spacing:0.14em;font-family:Arial,sans-serif;">
      SKINES MED SPA &nbsp;·&nbsp; 19 Av. Shamrock, Montréal &nbsp;·&nbsp; skines.ca
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  /* ── CONFIRMATION EMAIL TO PARTICIPANT ── */
  const confirmHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a0d07;font-family:'Georgia',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a0d07;padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#2C1810;border-radius:10px;overflow:hidden;max-width:100%;">

  <tr><td style="background:#3A1E14;padding:32px 40px;text-align:center;border-bottom:1px solid rgba(201,169,110,0.20);">
    <p style="margin:0;font-size:11px;letter-spacing:0.38em;color:rgba(245,237,227,0.50);text-transform:uppercase;font-family:Arial,sans-serif;">S K I N E S</p>
    <p style="margin:4px 0 0;font-size:10px;letter-spacing:0.25em;color:rgba(245,237,227,0.32);text-transform:uppercase;font-family:Arial,sans-serif;">MED SPA · MONTRÉAL</p>
  </td></tr>

  <tr><td style="background:linear-gradient(135deg,#B66A5A,#9A4A3A);padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:13px;letter-spacing:0.24em;color:#FDF8F5;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">✦ Inscription confirmée</p>
  </td></tr>

  <tr><td style="padding:40px 40px 32px;">
    <p style="margin:0 0 24px;font-size:19px;color:#F5EDE3;font-family:Georgia,serif;line-height:1.5;">
      Merci, <strong>${safeFirst}</strong>.
    </p>
    <p style="margin:0 0 28px;font-size:14px;color:rgba(245,237,227,0.72);font-family:Arial,sans-serif;line-height:1.75;">
      Votre inscription au <strong style="color:#F5EDE3;">Tirage Exclusif Skine's</strong> a été reçue avec succès.
      Nous avons bien enregistré votre participation et vous en remercions sincèrement.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr><td style="background:rgba(201,169,110,0.08);border:1px solid rgba(201,169,110,0.20);border-radius:8px;padding:22px 28px;">
        <p style="margin:0 0 14px;font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:rgba(201,169,110,0.75);font-family:Arial,sans-serif;">À savoir</p>
        <p style="margin:0 0 10px;font-size:13.5px;color:rgba(245,237,227,0.82);font-family:Arial,sans-serif;line-height:1.7;">
          ✦ &nbsp;Le gagnant sera contacté <strong style="color:#F5EDE3;">personnellement</strong>.
        </p>
        <p style="margin:0 0 10px;font-size:13.5px;color:rgba(245,237,227,0.82);font-family:Arial,sans-serif;line-height:1.7;">
          ✦ &nbsp;Le prix est <strong style="color:#F5EDE3;">personnel et non transférable</strong>.
        </p>
        <p style="margin:0;font-size:13.5px;color:rgba(245,237,227,0.82);font-family:Arial,sans-serif;line-height:1.7;">
          ✦ &nbsp;Une pièce d'identité avec photo correspondant aux informations d'inscription sera <strong style="color:#F5EDE3;">requise pour réclamer le prix</strong>.
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 28px;font-size:13.5px;color:rgba(245,237,227,0.65);font-family:Arial,sans-serif;line-height:1.75;">
      Merci de faire confiance à <strong style="color:#F5EDE3;">Skine's Med Spa &amp; Wellness</strong>.
      Nous avons hâte de vous offrir une expérience bien-être d'exception.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <a href="https://skines.ca" style="display:inline-block;background:#B66A5A;color:#FDF8F5;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;text-decoration:none;padding:15px 32px;border-radius:3px;">
          Découvrir nos soins
        </a>
      </td></tr>
    </table>
  </td></tr>

  <tr><td style="background:#3A1E14;padding:20px 40px;text-align:center;border-top:1px solid rgba(201,169,110,0.10);">
    <p style="margin:0;font-size:10px;color:rgba(245,237,227,0.30);letter-spacing:0.14em;font-family:Arial,sans-serif;">
      SKINES MED SPA · 19 Av. Shamrock, Montréal · skines.ca
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    const [adminId, confirmId] = await Promise.all([
      sendViaResend({
        from: FROM,
        to: ADMIN,
        subject: `✦ Nouveau Tirage — ${firstName} ${lastName}`,
        html: adminHtml,
        attachments: photoAttachment ? [photoAttachment] : [],
      }),
      sendViaResend({
        from: FROM,
        to: email,
        replyTo: ADMIN,
        subject: `✦ Votre inscription au Tirage Skine's est confirmée`,
        html: confirmHtml,
      }),
    ]);
    console.log('[send-tirage] admin:', adminId, 'confirm:', confirmId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[send-tirage] failed:', err.message);
    // Release email from dedupe set so they can retry
    seenEmails.delete(emailKey);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi. Réessayez.' });
  }
}
