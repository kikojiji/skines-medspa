// Vercel Serverless Function — Tirage giveaway registration
// POST /api/send-tirage

import {
  escapeHtml, sanitizeText, validatePhone, validateEmail, validateRequired,
  isHoneypotTriggered, requireJson, setCorsHeaders,
  rateLimit, getClientIp, sendViaResend,
} from './_lib/security.js';

const FROM  = "Skines Med Spa <giftcards@skines.info>";
const ADMIN = 'info@skines.ca';
const LOGO  = 'https://skines.ca/assets/images/logo-officiel-cropped.PNG';

// ── In-memory duplicate guards (best-effort; per serverless instance) ─────────
const seenEmails    = new Set();
const seenPhones    = new Set();
const seenUsernames = new Set();

// ── Device fingerprint tracker: fp → { emails: Set, count: number } ──────────
const fpMap = new Map();

// ── Cloudflare Turnstile server-side verification ─────────────────────────────
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;   // not configured — skip (use test key phase)
  if (!token)  return true;   // missing token — allow (ad blocker graceful degradation)
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const d = await r.json();
    if (!d.success) {
      console.warn('[tirage] turnstile reject', { codes: d['error-codes'], ip: String(ip).slice(0, 8) + '***' });
    }
    return d.success === true;
  } catch (err) {
    console.error('[tirage] turnstile fetch error:', err.message);
    return true; // allow on Cloudflare network error — don't punish real users
  }
}

/* ── Helpers ── */
function getBrowser(ua) {
  if (/CriOS/i.test(ua))  return 'Chrome (iOS)';
  if (/FxiOS/i.test(ua))  return 'Firefox (iOS)';
  if (/EdgA|EdgIOS/i.test(ua)) return 'Edge (Mobile)';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edg/i.test(ua))    return 'Edge';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  return 'Unknown';
}

function getDevice(ua) {
  if (/iPad/i.test(ua))            return 'iPad';
  if (/iPhone/i.test(ua))          return 'iPhone';
  if (/Android.*Mobile/i.test(ua)) return 'Android Mobile';
  if (/Android/i.test(ua))         return 'Android Tablet';
  return 'Desktop';
}

function icon(path) {
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B66A5A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;">${path}</svg>`;
}

function cell(label, value) {
  if (!value || value === '—' || value === 'Unknown') return '<td width="50%" style="padding:10px 12px 10px 0;"></td>';
  return `<td width="50%" style="padding:12px 16px 12px 0;vertical-align:top;border-bottom:1px solid rgba(182,106,90,0.09);">
    <p style="margin:0 0 3px;font-size:7.5px;letter-spacing:0.22em;text-transform:uppercase;color:#B66A5A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${label}</p>
    <p style="margin:0;font-size:14px;color:#3A1E14;font-family:Georgia,'Times New Roman',serif;line-height:1.35;">${value}</p>
  </td>`;
}

function fullRow(label, value) {
  if (!value || value === '—' || value === 'Unknown') return '';
  return `<tr>
    <td colspan="2" style="padding:12px 0;vertical-align:top;border-bottom:1px solid rgba(182,106,90,0.09);">
      <p style="margin:0 0 3px;font-size:7.5px;letter-spacing:0.22em;text-transform:uppercase;color:#B66A5A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">${label}</p>
      <p style="margin:0;font-size:14px;color:#3A1E14;font-family:Georgia,'Times New Roman',serif;line-height:1.35;">${value}</p>
    </td>
  </tr>`;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const ct = requireJson(req);
  if (!ct.ok) return res.status(ct.status).json({ error: ct.error });

  const rl = rateLimit(getClientIp(req), { maxRequests: 3, windowMs: 60_000 });
  if (!rl.ok) return res.status(rl.status).json({ error: rl.error });

  if (isHoneypotTriggered(req.body)) return res.status(200).json({ success: true });

  // Turnstile server-side verification (skip when TURNSTILE_SECRET_KEY not set)
  const cfToken = sanitizeText(req.body.cfToken, 2048);
  const tsOk = await verifyTurnstile(cfToken, getClientIp(req));
  if (!tsOk) {
    return res.status(400).json({ error: 'Vérification de sécurité échouée. Veuillez recharger la page et réessayer.' });
  }

  const check = validateRequired(req.body, ['firstName', 'lastName', 'phone', 'email']);
  if (!check.ok) return res.status(check.status).json({ error: check.error });

  // Sanitize
  const firstName = sanitizeText(req.body.firstName, 80);
  const lastName  = sanitizeText(req.body.lastName, 80);
  const phone     = sanitizeText(req.body.phone, 30);
  const email     = sanitizeText(req.body.email, 254);
  const username  = sanitizeText(req.body.username, 100);
  const service   = sanitizeText(req.body.service, 120);

  // Validate
  if (!validatePhone(phone))  return res.status(400).json({ error: 'Numéro de téléphone invalide.' });
  if (!validateEmail(email))  return res.status(400).json({ error: 'Adresse email invalide.' });

  // ── Duplicate guards ──────────────────────────────────────────────────────
  const emailKey    = email.toLowerCase().trim();
  const phoneKey    = phone.replace(/\D/g, '');
  const usernameKey = username.toLowerCase().replace(/[@\s]/g, '');

  if (seenEmails.has(emailKey)) {
    return res.status(409).json({ error: 'Cette adresse email est déjà inscrite au tirage.' });
  }
  if (seenPhones.has(phoneKey)) {
    return res.status(409).json({ error: 'Ce numéro de téléphone est déjà inscrit au tirage.' });
  }
  if (usernameKey && seenUsernames.has(usernameKey)) {
    return res.status(409).json({ error: 'Ce pseudo Instagram/TikTok est déjà inscrit au tirage.' });
  }

  seenEmails.add(emailKey);
  seenPhones.add(phoneKey);
  if (usernameKey) seenUsernames.add(usernameKey);

  // ── Device fingerprint tracking ───────────────────────────────────────────
  const fp = sanitizeText(req.body.fp, 64);
  if (fp && fp.length >= 8) {
    const entry = fpMap.get(fp) || { emails: new Set(), count: 0 };
    const isNewEmail = !entry.emails.has(emailKey);
    if (isNewEmail && entry.emails.size >= 2) {
      // 3rd+ different email from same device — almost certainly abuse
      seenEmails.delete(emailKey);
      seenPhones.delete(phoneKey);
      seenUsernames.delete(usernameKey);
      console.warn('[tirage] fingerprint abuse blocked', {
        fp: fp.slice(0, 8) + '***',
        priorEmails: entry.emails.size,
        ip: getClientIp(req).slice(0, 10) + '***',
      });
      return res.status(429).json({ error: 'Trop de participations détectées depuis cet appareil.' });
    }
    if (isNewEmail && entry.emails.size === 1) {
      // 2nd different email from same device — log but allow
      console.warn('[tirage] suspicious: 2 emails same device', {
        fp: fp.slice(0, 8) + '***',
        ip: getClientIp(req).slice(0, 10) + '***',
      });
    }
    entry.emails.add(emailKey);
    entry.count++;
    fpMap.set(fp, entry);
  }

  // Photo (optional, compressed base64 from client)
  let photoAttachment = null;
  const rawPhoto     = req.body.photo;
  const rawPhotoType = req.body.photoType || 'image/jpeg';
  if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.length > 20) {
    if (rawPhoto.length > 9_000_000) {
      return res.status(413).json({ error: 'Photo trop volumineuse. Maximum 7 MB.' });
    }
    const ext = rawPhotoType.includes('png') ? 'png'
              : rawPhotoType.includes('heic') || rawPhotoType.includes('heif') ? 'heic'
              : 'jpg';
    photoAttachment = {
      filename:   `${firstName}_${lastName}.${ext}`,
      content:    rawPhoto,
      content_id: 'participant_photo',
    };
  }

  // Escape
  const safeFirst    = escapeHtml(firstName);
  const safeLast     = escapeHtml(lastName);
  const safePhone    = escapeHtml(phone);
  const safeEmail    = escapeHtml(email);
  const safeUsername = escapeHtml(username);
  const safeService  = escapeHtml(service);

  // Metadata
  const ua         = req.headers['user-agent'] || '';
  const deviceType = getDevice(ua);
  const browser    = getBrowser(ua);
  const ip         = getClientIp(req);
  const country    = req.headers['x-vercel-ip-country'] || '';
  const city       = req.headers['x-vercel-ip-city'] || '';
  const location   = [city, country].filter(Boolean).join(', ') || null;

  const _d = new Date();
  const _fmt = (opts) => _d.toLocaleString('en-CA', { timeZone: 'America/Toronto', ...opts });
  const submittedAt = _fmt({ month: 'short', day: 'numeric', year: 'numeric' })
    + ' · ' + _fmt({ hour: '2-digit', minute: '2-digit', hour12: false }) + ' EST';

  /* ── SVG icon paths ── */
  const I = {
    person: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    phone:  '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.9 9.69 19.79 19.79 0 01.87 6.05 2 2 0 012.86 3.87h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.09 11.1a16 16 0 006.29 6.29l1.51-1.51a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>',
    email:  '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
    insta:  '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="#B66A5A" stroke="none"/>',
    spa:    '<path d="M12 2s4 4 4 8-4 4-4 4-4 0-4-4 4-8 4-8z"/><path d="M12 14v6"/><line x1="9" y1="17" x2="15" y2="17"/>',
    cal:    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    device: '<rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
    globe:  '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20"/>',
    pin:    '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>',
    wifi:   '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  };

  // 2-column grid: pairs of cells per row
  const gridRows = [
    [cell('Full Name',          `${safeFirst} ${safeLast}`),
     cell('Phone Number',       safePhone)],
    [cell('Email Address',      safeEmail),
     cell('Instagram / TikTok', safeUsername)],
    [cell('Treatment Interest', safeService),
     cell('Submission Date &amp; Time', submittedAt)],
    [cell('Device Type',        deviceType),
     cell('IP Address',         ip)],
  ].map(([a, b]) => `<tr>${a}${b}</tr>`).join('');

  const locationRow = fullRow('Location', location);

  const photoBlock = photoAttachment
    ? `<table cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr><td align="center" style="border:3px solid #C9A97A;border-radius:20px;overflow:hidden;line-height:0;">
          <img src="cid:participant_photo" alt="Photo" width="260" style="width:260px;height:320px;object-fit:cover;display:block;">
        </td></tr>
       </table>`
    : `<table cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr><td align="center" style="width:260px;height:320px;border-radius:20px;border:2px solid rgba(182,106,90,0.22);background:#F5EDE3;text-align:center;vertical-align:middle;">
          <p style="margin:0;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#C9A090;font-family:Arial,sans-serif;">NO PHOTO</p>
        </td></tr>
       </table>`;

  /* ── LUXURY CARD — ADMIN EMAIL ── */
  const adminHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#EDE6DF;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EDE6DF;padding:36px 16px;">
<tr><td align="center">

<table width="600" cellpadding="0" cellspacing="0" style="max-width:100%;background:#FFFFFF;border-radius:24px;box-shadow:0 12px 64px rgba(90,50,30,0.14),0 2px 8px rgba(90,50,30,0.06);overflow:hidden;">

  <!-- ─── HEADER ─── -->
  <tr><td style="padding:40px 40px 28px;text-align:center;background:#FFFFFF;">
    <img src="${LOGO}" alt="Skines" width="52" style="width:52px;height:auto;display:block;margin:0 auto 14px;">
    <p style="margin:0 0 2px;font-size:10px;letter-spacing:0.30em;text-transform:uppercase;color:rgba(106,90,80,0.50);font-family:Arial,Helvetica,sans-serif;font-weight:700;">SKINES</p>
    <p style="margin:0 0 14px;font-size:8.5px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(106,90,80,0.35);font-family:Arial,Helvetica,sans-serif;">MED SPA &amp; WELLNESS</p>
    <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:0.14em;text-transform:uppercase;color:#3A1E14;font-weight:400;line-height:1.1;">New Giveaway Entry</h1>
    <table width="200" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;"><tr>
      <td style="height:1px;background:#D4B896;width:75px;"></td>
      <td style="padding:0 10px;text-align:center;color:#C9973A;font-size:13px;line-height:1;">✦</td>
      <td style="height:1px;background:#D4B896;width:75px;"></td>
    </tr></table>
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:#B66A5A;letter-spacing:0.06em;font-style:italic;">Skines Med Spa &amp; Wellness</p>
  </td></tr>

  <!-- ─── PHOTO (centered) ─── -->
  <tr><td style="padding:4px 40px 20px;text-align:center;background:#FFFFFF;">
    ${photoBlock}
  </td></tr>

  <!-- ─── INFO GRID ─── -->
  <tr><td style="padding:8px 36px 32px;background:#FFFFFF;">
    <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
      ${gridRows}
      ${locationRow}
    </table>
  </td></tr>

  <!-- ─── FOOTER ─── -->
  <tr><td style="padding:18px 40px 28px;text-align:center;background:#FDFAF7;border-top:1px solid rgba(182,106,90,0.10);">
    <p style="margin:0 0 3px;font-size:8.5px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(106,90,80,0.40);font-family:Arial,Helvetica,sans-serif;">Generated automatically from</p>
    <p style="margin:0 0 10px;font-size:8.5px;letter-spacing:0.22em;text-transform:uppercase;color:#B66A5A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">Skines Giveaway Page</p>
    <p style="margin:0;font-size:10px;letter-spacing:0.12em;color:rgba(106,90,80,0.40);font-family:Arial,Helvetica,sans-serif;">&#x1F4CD;&nbsp; Montreal, Canada</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  /* ── CONFIRMATION EMAIL TO PARTICIPANT ── */
  const confirmPhotoBlock = photoAttachment
    ? `<table cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr><td align="center" style="border:3px solid #C9A97A;border-radius:20px;overflow:hidden;line-height:0;">
          <img src="cid:participant_photo" alt="Photo" width="280" style="width:280px;height:340px;object-fit:cover;display:block;">
        </td></tr>
       </table>`
    : '';

  const confirmHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F2EBE1;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;padding:40px 16px 48px;">
<tr><td align="center">

<table width="540" cellpadding="0" cellspacing="0" style="max-width:100%;">

  <!-- ─── LOGO HEADER ─── -->
  <tr><td style="padding:0 0 28px;text-align:center;">
    <img src="${LOGO}" alt="Skines" width="48" style="width:48px;height:auto;display:block;margin:0 auto 10px;">
    <p style="margin:0;font-size:7.5px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(90,70,55,0.52);font-family:Arial,Helvetica,sans-serif;font-weight:700;">SKINES MED SPA &amp; WELLNESS</p>
  </td></tr>

  ${confirmPhotoBlock ? `<!-- ─── PHOTO ─── -->
  <tr><td style="padding:0 0 24px;text-align:center;">
    ${confirmPhotoBlock}
  </td></tr>` : ''}

  <!-- ─── MAIN CARD ─── -->
  <tr><td style="background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid rgba(182,106,90,0.13);">
    <table cellpadding="0" cellspacing="0" width="100%">

      <!-- Gold accent top bar -->
      <tr><td style="height:4px;background:linear-gradient(90deg,#D4B896,#C9973A,#D4B896);font-size:0;line-height:0;">&nbsp;</td></tr>

      <!-- Content -->
      <tr><td style="padding:44px 44px 40px;text-align:center;">

        <!-- Eyebrow -->
        <p style="margin:0 0 20px;font-size:7.5px;letter-spacing:0.32em;text-transform:uppercase;color:#C9973A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">&#10022;&nbsp; INSCRIPTION CONFIRM&Eacute;E &nbsp;&#10022;</p>

        <!-- Merci, Prénom -->
        <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:34px;color:#2C1810;line-height:1.15;font-weight:400;">
          Merci <span style="color:#B66A5A;font-style:italic;">${safeFirst}.</span>
        </p>

        <!-- Divider -->
        <table width="160" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr>
          <td style="height:1px;background:#D4B896;"></td>
          <td style="padding:0 10px;color:#C9973A;font-size:11px;line-height:1;white-space:nowrap;">✦</td>
          <td style="height:1px;background:#D4B896;"></td>
        </tr></table>

        <!-- Main message -->
        <p style="margin:0 0 10px;font-size:15px;color:#3A1E14;font-family:Georgia,'Times New Roman',serif;line-height:1.8;text-align:center;">
          Votre participation au <em>Tirage Exclusif</em><br>de <strong>Skine&rsquo;s Med Spa</strong> a bien &eacute;t&eacute; enregistr&eacute;e.
        </p>

        <p style="margin:0 0 32px;font-size:13px;color:rgba(90,70,55,0.60);font-family:Arial,Helvetica,sans-serif;line-height:1.7;text-align:center;">
          Le gagnant sera contact&eacute; personnellement.
        </p>

        <!-- CTA Button — single line, wider padding -->
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
          <td align="center" style="border-radius:8px;background:#B66A5A;mso-padding-alt:0;">
            <a href="https://skines.ca" style="display:inline-block;padding:15px 52px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#FEFAF7;text-decoration:none;white-space:nowrap;">D&Eacute;COUVRIR NOS SOINS</a>
          </td>
        </tr></table>

      </td></tr>

      <!-- Cream footer strip -->
      <tr><td style="padding:20px 44px 24px;text-align:center;background:#FAF6F0;border-top:1px solid rgba(182,106,90,0.09);">
        <p style="margin:0 0 5px;font-size:7.5px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(90,70,55,0.45);font-family:Arial,Helvetica,sans-serif;font-weight:700;">SKINES MED SPA &amp; WELLNESS</p>
        <p style="margin:0;font-size:11px;color:rgba(90,70,55,0.38);font-family:Arial,Helvetica,sans-serif;letter-spacing:0.05em;">
          Montr&eacute;al, Canada &nbsp;&middot;&nbsp; <a href="https://skines.ca" style="color:rgba(90,70,55,0.38);text-decoration:none;">skines.ca</a>
        </p>
      </td></tr>

    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  try {
    const adminAttachments   = [photoAttachment].filter(Boolean);
    const confirmAttachments = [photoAttachment].filter(Boolean);

    const [adminId, confirmId] = await Promise.all([
      sendViaResend({
        from: FROM,
        to:   ADMIN,
        subject: `New Giveaway Entry — ${firstName} ${lastName}`,
        html:    adminHtml,
        attachments: adminAttachments,
      }),
      sendViaResend({
        from:    FROM,
        to:      email,
        replyTo: ADMIN,
        subject: `✦ Votre inscription au Tirage Skines est confirmée`,
        html:    confirmHtml,
        attachments: confirmAttachments,
      }),
    ]);
    console.log('[send-tirage] admin:', adminId, 'confirm:', confirmId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[send-tirage] failed:', err.message);
    // Roll back all duplicate guards so the participant can retry
    seenEmails.delete(emailKey);
    seenPhones.delete(phoneKey);
    if (usernameKey) seenUsernames.delete(usernameKey);
    return res.status(500).json({ error: "Erreur lors de l'envoi. Réessayez." });
  }
}
