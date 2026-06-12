// Vercel Serverless Function — Resend email for Tirage Popup submissions
// POST /api/send-tirage

import {
  escapeHtml, sanitizeText, validatePhone, validateRequired,
  isHoneypotTriggered, requireJson, setCorsHeaders,
  rateLimit, getClientIp, sendViaResend,
} from './_lib/security.js';

const FROM  = 'Skines Med Spa <giftcards@skines.info>';
const ADMIN = 'skinesca@gmail.com';

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Content-Type guard
  const ct = requireJson(req);
  if (!ct.ok) return res.status(ct.status).json({ error: ct.error });

  // Rate limit: 5 submissions per minute per IP
  const rl = rateLimit(getClientIp(req), { maxRequests: 5, windowMs: 60_000 });
  if (!rl.ok) return res.status(rl.status).json({ error: rl.error });

  // Honeypot — silently accept but don't send
  if (isHoneypotTriggered(req.body)) {
    return res.status(200).json({ success: true });
  }

  // Validate required fields
  const check = validateRequired(req.body, ['firstName', 'lastName', 'phone']);
  if (!check.ok) return res.status(check.status).json({ error: check.error });

  // Sanitize
  const firstName = sanitizeText(req.body.firstName, 80);
  const lastName  = sanitizeText(req.body.lastName, 80);
  const phone     = sanitizeText(req.body.phone, 30);
  const service   = sanitizeText(req.body.service, 120);

  // Validate phone format
  if (!validatePhone(phone)) {
    return res.status(400).json({ error: 'Numéro de téléphone invalide.' });
  }

  // Escape for HTML injection
  const safeFirst   = escapeHtml(firstName);
  const safeLast    = escapeHtml(lastName);
  const safePhone   = escapeHtml(phone);
  const safeService = escapeHtml(service) || '—';

  const submittedAt = new Date().toLocaleString('fr-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const adminHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Nouvelle participation — Tirage Skine's</title>
</head>
<body style="margin:0;padding:0;background:#F2EBE3;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#F2EBE3;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation"
             style="max-width:100%;background:#FDFAF7;border-radius:12px;
                    border:1px solid rgba(182,106,90,0.18);
                    box-shadow:0 8px 40px rgba(58,30,20,0.10);overflow:hidden;">

        <tr>
          <td style="background:#3A1E14;padding:28px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;letter-spacing:0.38em;color:rgba(245,237,227,0.55);text-transform:uppercase;font-family:Arial,sans-serif;">S K I N E S</p>
            <p style="margin:4px 0 0;font-size:10px;letter-spacing:0.26em;color:rgba(245,237,227,0.35);text-transform:uppercase;font-family:Arial,sans-serif;">MED SPA · MONTRÉAL</p>
          </td>
        </tr>

        <tr>
          <td style="background:linear-gradient(135deg,#B66A5A,#9A4A3A);padding:18px 40px;text-align:center;">
            <p style="margin:0;font-size:12px;letter-spacing:0.22em;color:#FDF8F5;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">
              ✦ Nouvelle participation au Tirage Exclusif
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 40px 28px;">
            <h1 style="margin:0 0 6px;font-size:24px;color:#3A1E14;font-family:Georgia,serif;font-weight:400;line-height:1.3;">Nouvelle soumission</h1>
            <p style="margin:0 0 28px;font-size:13px;color:rgba(106,90,80,0.75);font-family:Arial,sans-serif;line-height:1.6;">Une nouvelle cliente a participé au tirage exclusif Skine's.</p>

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                   style="background:#F8F4F0;border:1px solid rgba(182,106,90,0.15);border-radius:10px;overflow:hidden;margin-bottom:28px;">
              <tr>
                <td style="padding:14px 20px;border-bottom:1px solid rgba(182,106,90,0.12);">
                  <p style="margin:0;font-size:9.5px;letter-spacing:0.22em;text-transform:uppercase;color:#B66A5A;font-family:Arial,sans-serif;font-weight:700;">Détails du lead</p>
                </td>
              </tr>
              <tr>
                <td style="padding:14px 20px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <tr>
                      <td width="40%" style="padding:9px 0;border-bottom:1px solid rgba(182,106,90,0.08);vertical-align:top;">
                        <p style="margin:0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(106,90,80,0.55);font-family:Arial,sans-serif;">Prénom</p>
                      </td>
                      <td style="padding:9px 0 9px 12px;border-bottom:1px solid rgba(182,106,90,0.08);vertical-align:top;">
                        <p style="margin:0;font-size:14px;color:#3A1E14;font-family:Georgia,serif;">${safeFirst}</p>
                      </td>
                    </tr>
                    <tr>
                      <td width="40%" style="padding:9px 0;border-bottom:1px solid rgba(182,106,90,0.08);vertical-align:top;">
                        <p style="margin:0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(106,90,80,0.55);font-family:Arial,sans-serif;">Nom</p>
                      </td>
                      <td style="padding:9px 0 9px 12px;border-bottom:1px solid rgba(182,106,90,0.08);vertical-align:top;">
                        <p style="margin:0;font-size:14px;color:#3A1E14;font-family:Georgia,serif;">${safeLast}</p>
                      </td>
                    </tr>
                    <tr>
                      <td width="40%" style="padding:9px 0;border-bottom:1px solid rgba(182,106,90,0.08);vertical-align:top;">
                        <p style="margin:0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(106,90,80,0.55);font-family:Arial,sans-serif;">Téléphone</p>
                      </td>
                      <td style="padding:9px 0 9px 12px;border-bottom:1px solid rgba(182,106,90,0.08);vertical-align:top;">
                        <p style="margin:0;font-size:14px;color:#3A1E14;font-family:Georgia,serif;">${safePhone}</p>
                      </td>
                    </tr>
                    <tr>
                      <td width="40%" style="padding:9px 0;border-bottom:1px solid rgba(182,106,90,0.08);vertical-align:top;">
                        <p style="margin:0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(106,90,80,0.55);font-family:Arial,sans-serif;">Soin</p>
                      </td>
                      <td style="padding:9px 0 9px 12px;border-bottom:1px solid rgba(182,106,90,0.08);vertical-align:top;">
                        <p style="margin:0;font-size:14px;color:#3A1E14;font-family:Georgia,serif;">${safeService}</p>
                      </td>
                    </tr>
                    <tr>
                      <td width="40%" style="padding:9px 0;border-bottom:1px solid rgba(182,106,90,0.08);vertical-align:top;">
                        <p style="margin:0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(106,90,80,0.55);font-family:Arial,sans-serif;">Date</p>
                      </td>
                      <td style="padding:9px 0 9px 12px;border-bottom:1px solid rgba(182,106,90,0.08);vertical-align:top;">
                        <p style="margin:0;font-size:13px;color:#3A1E14;font-family:Arial,sans-serif;">${submittedAt}</p>
                      </td>
                    </tr>
                    <tr>
                      <td width="40%" style="padding:9px 0 14px;vertical-align:top;">
                        <p style="margin:0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(106,90,80,0.55);font-family:Arial,sans-serif;">Source</p>
                      </td>
                      <td style="padding:9px 0 14px 12px;vertical-align:top;">
                        <span style="display:inline-block;background:rgba(182,106,90,0.12);color:#B66A5A;font-size:10.5px;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;padding:4px 10px;border-radius:20px;">Tirage Popup</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background:rgba(182,106,90,0.07);border-left:3px solid #B66A5A;padding:14px 18px;border-radius:0 6px 6px 0;">
                  <p style="margin:0;font-size:12.5px;color:rgba(58,30,20,0.75);font-family:Arial,sans-serif;line-height:1.65;">
                    Contactez <strong style="color:#3A1E14;">${safeFirst} ${safeLast}</strong>
                    au <strong style="color:#3A1E14;">${safePhone}</strong> pour confirmer sa participation.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="background:#F8F4F0;padding:18px 40px;text-align:center;border-top:1px solid rgba(182,106,90,0.10);">
            <p style="margin:0;font-size:10px;color:rgba(106,90,80,0.45);letter-spacing:0.14em;font-family:Arial,sans-serif;">
              SKINES MED SPA &nbsp;·&nbsp; 19 Av. Shamrock, Montréal &nbsp;·&nbsp; info@skines.info
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const id = await sendViaResend({
      from: FROM,
      to: ADMIN,
      subject: `✦ Nouveau Tirage — ${safeFirst} ${safeLast} · Skine's Med Spa`,
      html: adminHtml,
    });
    console.log('[send-tirage] sent:', id);
    return res.status(200).json({ success: true, id });
  } catch (err) {
    // err.message is generic — no Resend internals exposed to client
    console.error('[send-tirage] failed:', err.message);
    return res.status(500).json({ error: 'Erreur lors de l\'envoi. Réessayez.' });
  }
}
