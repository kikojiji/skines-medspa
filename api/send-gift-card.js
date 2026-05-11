// Vercel Serverless Function — Resend email for gift card orders
// POST /api/send-gift-card

import {
  escapeHtml, sanitizeText, validateEmail, validateRequired,
  isHoneypotTriggered, requireJson, setCorsHeaders,
  rateLimit, getClientIp, sendViaResend,
} from './_lib/security.js';

const FROM  = 'Skines Gift Cards <giftcards@skines.info>';
const ADMIN = 'info@skines.info';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Content-Type guard
  const ct = requireJson(req);
  if (!ct.ok) return res.status(ct.status).json({ error: ct.error });

  // Rate limit: 5 orders per minute per IP
  const rl = rateLimit(getClientIp(req), { maxRequests: 5, windowMs: 60_000 });
  if (!rl.ok) return res.status(rl.status).json({ error: rl.error });

  // Honeypot — silently accept but don't send
  if (isHoneypotTriggered(req.body)) {
    return res.status(200).json({ success: true });
  }

  // Validate required fields
  const check = validateRequired(req.body, ['amount', 'fromName', 'toName', 'toEmail', 'senderEmail']);
  if (!check.ok) return res.status(check.status).json({ error: check.error });

  // Sanitize
  const amount      = sanitizeText(req.body.amount, 20);
  const fromName    = sanitizeText(req.body.fromName, 80);
  const toName      = sanitizeText(req.body.toName, 80);
  const toEmail     = sanitizeText(req.body.toEmail, 254);
  const senderEmail = sanitizeText(req.body.senderEmail, 254);
  const message     = sanitizeText(req.body.message, 500);

  // Validate emails
  if (!validateEmail(toEmail)) {
    return res.status(400).json({ error: 'Adresse email du destinataire invalide.' });
  }
  if (!validateEmail(senderEmail)) {
    return res.status(400).json({ error: 'Votre adresse email est invalide.' });
  }

  // Escape for HTML injection
  const safeAmount      = escapeHtml(amount);
  const safeFromName    = escapeHtml(fromName);
  const safeToName      = escapeHtml(toName);
  const safeToEmail     = escapeHtml(toEmail);
  const safeSenderEmail = escapeHtml(senderEmail);
  const safeMessage     = escapeHtml(message);

  const recipientHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a0d07;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a0d07;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#2C1810;border-radius:8px;overflow:hidden;max-width:100%;">

        <tr><td style="background:#3A1E14;padding:32px 40px;text-align:center;border-bottom:1px solid rgba(201,169,110,0.25);">
          <p style="margin:0;font-size:11px;letter-spacing:0.35em;color:rgba(245,237,227,0.50);text-transform:uppercase;font-family:Arial,sans-serif;">S K I N E S</p>
          <p style="margin:4px 0 0;font-size:10px;letter-spacing:0.25em;color:rgba(245,237,227,0.35);text-transform:uppercase;font-family:Arial,sans-serif;">MED SPA · MONTRÉAL</p>
        </td></tr>

        <tr><td style="background:#C9A96E;padding:20px 40px;text-align:center;">
          <p style="margin:0;font-size:13px;letter-spacing:0.28em;color:#2C1810;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">🎁 Vous avez reçu une Carte Cadeau</p>
        </td></tr>

        <tr><td style="padding:40px 40px 32px;">
          <p style="margin:0 0 24px;font-size:18px;color:#F5EDE3;font-family:Georgia,serif;line-height:1.5;">
            Bonjour <strong>${safeToName}</strong>,
          </p>
          <p style="margin:0 0 32px;font-size:14px;color:rgba(245,237,227,0.75);font-family:Arial,sans-serif;line-height:1.7;">
            <strong style="color:#F5EDE3;">${safeFromName}</strong> vous offre une expérience Skines Med Spa.<br>
            Votre carte cadeau d'une valeur de&nbsp;<strong style="color:#C9A96E;">${safeAmount}</strong> est prête à être utilisée.
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td style="background:linear-gradient(135deg,#3A1E14,#5C2E1A);border:1px solid rgba(201,169,110,0.35);border-radius:8px;padding:28px 32px;">
              <p style="margin:0;font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(201,169,110,0.60);font-family:Arial,sans-serif;">Carte Cadeau · Skines Med Spa</p>
              <p style="margin:10px 0 0;font-size:42px;color:#C9A96E;font-family:Georgia,serif;font-weight:400;line-height:1;">${safeAmount}</p>
              <p style="margin:12px 0 0;font-size:11px;color:rgba(245,237,227,0.40);font-family:Arial,sans-serif;letter-spacing:0.12em;">Valable 12 mois · Tous soins Skines</p>
            </td></tr>
          </table>

          ${safeMessage ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
            <tr><td style="background:rgba(201,169,110,0.07);border-left:2px solid #C9A96E;padding:16px 20px;border-radius:0 4px 4px 0;">
              <p style="margin:0;font-size:10px;letter-spacing:0.20em;text-transform:uppercase;color:rgba(201,169,110,0.65);font-family:Arial,sans-serif;">Message de ${safeFromName}</p>
              <p style="margin:10px 0 0;font-size:15px;color:rgba(245,237,227,0.88);font-family:Georgia,serif;font-style:italic;line-height:1.7;">&ldquo;${safeMessage}&rdquo;</p>
            </td></tr>
          </table>` : ''}

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
            <tr><td style="background:rgba(201,169,110,0.08);border:1px solid rgba(201,169,110,0.18);border-radius:6px;padding:20px 24px;">
              <p style="margin:0 0 10px;font-size:11px;letter-spacing:0.20em;text-transform:uppercase;color:#C9A96E;font-family:Arial,sans-serif;">Comment utiliser votre carte</p>
              <p style="margin:0;font-size:13px;color:rgba(245,237,227,0.72);font-family:Arial,sans-serif;line-height:1.7;">
                1. Réservez votre soin sur <strong style="color:#F5EDE3;">Fresha</strong> ou appelez-nous au <strong style="color:#F5EDE3;">+1 (438) 260-5660</strong><br>
                2. Mentionnez votre carte cadeau lors de la réservation<br>
                3. Présentez cet email lors de votre visite
              </p>
            </td></tr>
          </table>

          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
            <tr><td align="center">
              <a href="https://www.fresha.com/fr/a/skines-head-spa-montreal-19-av-shamrock-montreal-qc-lytdaphf"
                 style="display:inline-block;background:#C9A96E;color:#1A0D07;font-family:Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;text-decoration:none;padding:16px 36px;border-radius:3px;">
                Réserver mon soin
              </a>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="background:#3A1E14;padding:20px 40px;text-align:center;border-top:1px solid rgba(201,169,110,0.12);">
          <p style="margin:0;font-size:10px;color:rgba(245,237,227,0.35);letter-spacing:0.15em;font-family:Arial,sans-serif;">
            SKINES MED SPA · 19 Av. Shamrock, Montréal · info@skines.info
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const adminHtml = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#1a0d07;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a0d07;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#2C1810;border-radius:8px;overflow:hidden;max-width:100%;">

        <tr><td style="background:#3A1E14;padding:28px 40px;text-align:center;border-bottom:1px solid rgba(201,169,110,0.25);">
          <p style="margin:0;font-size:11px;letter-spacing:0.35em;color:rgba(245,237,227,0.50);text-transform:uppercase;font-family:Arial,sans-serif;">S K I N E S</p>
          <p style="margin:4px 0 0;font-size:10px;letter-spacing:0.25em;color:rgba(245,237,227,0.35);text-transform:uppercase;font-family:Arial,sans-serif;">MED SPA · MONTRÉAL</p>
        </td></tr>

        <tr><td style="background:#C9A96E;padding:16px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;letter-spacing:0.28em;color:#2C1810;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">🎁 Nouvelle commande — Carte Cadeau</p>
        </td></tr>

        <tr><td style="padding:32px 40px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(201,169,110,0.12);">
              <p style="margin:0;font-size:10px;letter-spacing:0.20em;text-transform:uppercase;color:rgba(245,237,227,0.40);font-family:Arial,sans-serif;">Montant</p>
              <p style="margin:5px 0 0;font-size:30px;color:#C9A96E;font-family:Georgia,serif;">${safeAmount}</p>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(201,169,110,0.12);">
              <p style="margin:0;font-size:10px;letter-spacing:0.20em;text-transform:uppercase;color:rgba(245,237,227,0.40);font-family:Arial,sans-serif;">De la part de</p>
              <p style="margin:5px 0 0;font-size:16px;color:#F5EDE3;font-family:Georgia,serif;">${safeFromName}</p>
              <p style="margin:3px 0 0;font-size:12px;color:rgba(245,237,227,0.50);font-family:Arial,sans-serif;">${safeSenderEmail}</p>
            </td></tr>
            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(201,169,110,0.12);">
              <p style="margin:0;font-size:10px;letter-spacing:0.20em;text-transform:uppercase;color:rgba(245,237,227,0.40);font-family:Arial,sans-serif;">Pour</p>
              <p style="margin:5px 0 0;font-size:16px;color:#F5EDE3;font-family:Georgia,serif;">${safeToName}</p>
              <p style="margin:3px 0 0;font-size:12px;color:rgba(245,237,227,0.50);font-family:Arial,sans-serif;">${safeToEmail}</p>
            </td></tr>
            ${safeMessage ? `
            <tr><td style="padding:12px 0;border-bottom:1px solid rgba(201,169,110,0.12);">
              <p style="margin:0;font-size:10px;letter-spacing:0.20em;text-transform:uppercase;color:rgba(245,237,227,0.40);font-family:Arial,sans-serif;">Message</p>
              <p style="margin:8px 0 0;font-size:14px;color:rgba(245,237,227,0.85);font-family:Georgia,serif;font-style:italic;line-height:1.65;">&ldquo;${safeMessage}&rdquo;</p>
            </td></tr>` : ''}
            <tr><td style="padding:16px 0 4px;">
              <p style="margin:0;font-size:12px;color:rgba(245,237,227,0.65);font-family:Arial,sans-serif;line-height:1.65;">
                ✅ La carte a été envoyée automatiquement à <strong style="color:#C9A96E;">${safeToEmail}</strong>.<br>
                Confirmation à envoyer à&nbsp;: <strong style="color:#C9A96E;">${safeSenderEmail}</strong>
              </p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="background:#3A1E14;padding:16px 40px;text-align:center;border-top:1px solid rgba(201,169,110,0.12);">
          <p style="margin:0;font-size:10px;color:rgba(245,237,227,0.30);letter-spacing:0.15em;font-family:Arial,sans-serif;">
            SKINES MED SPA · 19 Av. Shamrock, Montréal · info@skines.info
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const [recipientId, adminId] = await Promise.all([
      sendViaResend({ from: FROM, to: toEmail, replyTo: senderEmail, subject: `🎁 ${safeFromName} vous offre une carte cadeau Skines — ${safeAmount}`, html: recipientHtml }),
      sendViaResend({ from: FROM, to: ADMIN, subject: `🎁 Nouvelle commande carte cadeau ${safeAmount} — ${safeFromName} pour ${safeToName}`, html: adminHtml }),
    ]);
    console.log('[send-gift-card] recipient:', recipientId, '| admin:', adminId);
    return res.status(200).json({ success: true, recipientId, adminId });
  } catch (err) {
    console.error('[send-gift-card] failed:', err.message);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi. Réessayez.' });
  }
}
