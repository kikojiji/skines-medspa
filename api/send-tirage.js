// Vercel Serverless Function — Tirage giveaway registration
// POST /api/send-tirage

import {
  escapeHtml, sanitizeText, validatePhone, validateEmail, validateRequired,
  isHoneypotTriggered, requireJson, setCorsHeaders,
  rateLimit, getClientIp, sendViaResend,
} from './_lib/security.js';

const FROM       = "Skines Head Spa <noreply@skines.ca>";
const FROM_ADMIN = "Skines Head Spa <Info@skines.ca>";
const ADMIN = 'skinesca@gmail.com';
const LOGO  = 'https://skines.ca/assets/images/logo-officiel-cropped.PNG';

// ── In-memory duplicate guards (best-effort; per serverless instance) ─────────
const seenEmails    = new Set();
const seenPhones    = new Set();
const seenUsernames = new Set();

// ── Sequential IDs via Upstash Redis REST ────────────────────────────────────
// Required env vars: UPSTASH_REDIS_REST_URL  UPSTASH_REDIS_REST_TOKEN
// Customer IDs: key tirage:seq:customer, initialized to 65  → first real ID = SK-0066
// Admin IDs:    key tirage:seq:admin,    initialized to 19  → first real ID = SK-0020
async function nextSeqId(type) {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const key   = `tirage:seq:${type}`;
  const start = type === 'customer' ? 65 : 19;
  const h     = { Authorization: `Bearer ${token}` };
  try {
    // SETNX: set the seed only if key doesn't exist yet (idempotent)
    await fetch(`${url}/setnx/${encodeURIComponent(key)}/${start}`, { headers: h });
    // INCR: atomic increment — returns new value
    const r = await fetch(`${url}/incr/${encodeURIComponent(key)}`, { headers: h });
    const d = await r.json();
    return typeof d.result === 'number' ? d.result : null;
  } catch (e) {
    console.error('[tirage] redis seq error:', e.message);
    return null;
  }
}
let _fallback = 0; // used when Redis is not configured

// ── Device fingerprint tracker: fp → { emails: Set, count: number } ──────────
const fpMap = new Map();

// ── Persistent duplicate guard via Upstash Redis ─────────────────────────────
// In-memory Sets don't survive across serverless instances, so the same email
// could slip through on a different/cold instance. Claim each identifier in
// Redis atomically (SETNX) so a duplicate is caught no matter which instance
// handles the request. Falls back to the in-memory Sets when Redis isn't set.
const _redisUrl    = process.env.UPSTASH_REDIS_REST_URL;
const _redisToken  = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisEnabled = !!(_redisUrl && _redisToken);
const _memSets = { email: seenEmails, phone: seenPhones, username: seenUsernames };

async function claimGuard(kind, key) {
  // true  = value was free and is now claimed (allow)
  // false = value already registered (duplicate → block)
  if (redisEnabled) {
    try {
      const r = await fetch(`${_redisUrl}/setnx/${encodeURIComponent(`tirage:${kind}:${key}`)}/1`,
        { headers: { Authorization: `Bearer ${_redisToken}` } });
      const d = await r.json();
      return d.result === 1;          // 1 = newly claimed, 0 = already existed
    } catch (e) {
      console.error('[tirage] redis claim error:', e.message);
      return true;                    // fail-open: never block real users on a Redis outage
    }
  }
  const set = _memSets[kind];
  if (set.has(key)) return false;
  set.add(key);
  return true;
}

async function releaseGuard(kind, key) {
  if (!key) return;
  if (redisEnabled) {
    try {
      await fetch(`${_redisUrl}/del/${encodeURIComponent(`tirage:${kind}:${key}`)}`,
        { headers: { Authorization: `Bearer ${_redisToken}` } });
    } catch (_) { /* best-effort rollback */ }
    return;
  }
  _memSets[kind].delete(key);
}

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

/* ── Field icons — emoji (render reliably in Gmail/Outlook, unlike inline SVG) ── */
const ICONS = {
  phone: '\u{1F4DE}',           // 📞
  email: '\u{2709}\u{FE0F}',    // ✉️
  insta: '\u{1F4F8}',           // 📸
  cal:   '\u{1F4C5}',           // 📅
};

function iconField(emoji, label, value) {
  if (!value || value === '—' || value === 'Unknown' || value === null) {
    return `<td width="50%" style="padding:0 0 26px;vertical-align:top;"></td>`;
  }
  return `<td width="50%" style="padding:0 0 26px;vertical-align:top;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td width="42" valign="top" style="padding-right:12px;">
      <table role="presentation" cellpadding="0" cellspacing="0"
             bgcolor="#2A1B0E" style="background:#2A1B0E;width:38px;height:38px;
             border-radius:19px;border:1px solid rgba(201,151,58,0.30);"><tr>
        <td align="center" valign="middle" width="38" height="38"
            style="font-size:18px;line-height:38px;">${emoji}</td>
      </tr></table>
    </td>
    <td valign="top">
      <p style="margin:0 0 5px;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;
                color:rgba(201,167,122,0.80);font-family:Arial,Helvetica,sans-serif;font-weight:700;">${label}</p>
      <p style="margin:0;font-size:15px;color:#F0E8DF;font-family:Georgia,'Times New Roman',serif;
                line-height:1.45;word-break:break-all;overflow-wrap:anywhere;">${value}</p>
    </td>
  </tr></table>
</td>`;
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

  // Atomic claims (persistent across serverless instances). Roll back earlier
  // claims if a later one turns out to be a duplicate.
  if (!(await claimGuard('email', emailKey))) {
    return res.status(409).json({ error: 'Cette adresse email est déjà inscrite au tirage.' });
  }
  if (!(await claimGuard('phone', phoneKey))) {
    await releaseGuard('email', emailKey);
    return res.status(409).json({ error: 'Ce numéro de téléphone est déjà inscrit au tirage.' });
  }
  if (usernameKey && !(await claimGuard('username', usernameKey))) {
    await releaseGuard('email', emailKey);
    await releaseGuard('phone', phoneKey);
    return res.status(409).json({ error: 'Ce pseudo Instagram/TikTok est déjà inscrit au tirage.' });
  }

  // ── Device fingerprint tracking ───────────────────────────────────────────
  const fp = sanitizeText(req.body.fp, 64);
  if (fp && fp.length >= 8) {
    const entry = fpMap.get(fp) || { emails: new Set(), count: 0 };
    const isNewEmail = !entry.emails.has(emailKey);
    if (isNewEmail && entry.emails.size >= 2) {
      // 3rd+ different email from same device — almost certainly abuse
      await releaseGuard('email', emailKey);
      await releaseGuard('phone', phoneKey);
      if (usernameKey) await releaseGuard('username', usernameKey);
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
  const _frMonths = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  const _mIdx  = parseInt(_fmt({ month: 'numeric' }), 10) - 1;
  const _day   = _fmt({ day: 'numeric' });
  const _year  = _fmt({ year: 'numeric' });
  const _hm    = _fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'h');
  const submittedAt = `${_day} ${_frMonths[_mIdx]} ${_year} à ${_hm}`;

  _fallback++;
  const [_custSeq, _adminSeq] = await Promise.all([
    nextSeqId('customer'),
    nextSeqId('admin'),
  ]);
  const customerEntryId = `SK-${String(_custSeq  ?? (65 + _fallback)).padStart(4, '0')}`;
  const adminEntryId    = `SK-${String(_adminSeq ?? (19 + _fallback)).padStart(4, '0')}`;

  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();

  /* ── ADMIN NOTIFICATION EMAIL ── */
  const adminHtml = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
</head>
<body style="margin:0;padding:0;background:#EAE0D5;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAE0D5" style="background:#EAE0D5;">
<tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:100%;">

  <!-- ─── BRAND WORDMARK ─── -->
  <tr><td bgcolor="#EAE0D5" style="background:#EAE0D5;padding:44px 36px 30px;text-align:center;">
    <p style="margin:0 0 7px;font-size:23px;letter-spacing:0.52em;color:#2C1810;font-family:Georgia,'Times New Roman',serif;font-weight:400;">SKINES</p>
    <p style="margin:0 0 20px;font-size:7px;letter-spacing:0.30em;text-transform:uppercase;color:rgba(90,60,40,0.40);font-family:Arial,Helvetica,sans-serif;font-weight:700;">HEAD SPA &nbsp;&middot;&nbsp; MONTR&Eacute;AL</p>
    <table role="presentation" width="130" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;"><tr>
      <td style="height:1px;background:rgba(182,106,90,0.22);font-size:0;line-height:0;">&nbsp;</td>
      <td style="padding:0 11px;color:rgba(182,106,90,0.55);font-size:10px;line-height:1;white-space:nowrap;font-family:Arial;">&#10022;</td>
      <td style="height:1px;background:rgba(182,106,90,0.22);font-size:0;line-height:0;">&nbsp;</td>
    </tr></table>
    <p style="margin:0;font-size:8px;letter-spacing:0.30em;text-transform:uppercase;color:#B66A5A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">Nouvelle Inscription &nbsp;&middot;&nbsp; Tirage</p>
  </td></tr>

  <!-- ─── LUXURY DARK CARD ─── -->
  <tr><td style="padding:0 0 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         bgcolor="#180E07" style="background:#180E07;border-radius:20px;overflow:hidden;
         border:1px solid rgba(201,151,58,0.20);">

    <!-- Gold shimmer line at top -->
    <tr><td style="height:1px;background:linear-gradient(90deg,rgba(201,151,58,0),rgba(201,151,58,0.60),rgba(201,151,58,0));font-size:0;line-height:0;">&nbsp;</td></tr>

    <!-- ─── REGISTRATION ID ─── -->
    <tr><td style="padding:28px 36px 0;">
      <p style="margin:0 0 5px;font-size:7px;letter-spacing:0.34em;text-transform:uppercase;color:rgba(201,167,122,0.35);font-family:Arial,Helvetica,sans-serif;font-weight:700;">Registration ID</p>
      <p style="margin:0;font-size:27px;letter-spacing:0.08em;color:#C9A77A;font-family:Georgia,'Times New Roman',serif;font-weight:400;">${adminEntryId}</p>
    </td></tr>

    <!-- Hairline separator -->
    <tr><td style="padding:18px 36px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="height:1px;background:rgba(201,151,58,0.12);font-size:0;line-height:0;">&nbsp;</td>
      </tr></table>
    </td></tr>

    <!-- ─── PARTICIPANT ─── -->
    <tr><td style="padding:0 36px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>

        <!-- Initials circle -->
        <td width="68" valign="middle">
          <table role="presentation" cellpadding="0" cellspacing="0"
                 bgcolor="#B66A5A" style="background:#B66A5A;width:56px;height:56px;
                 border-radius:28px;border:1px solid rgba(201,151,58,0.28);"><tr>
            <td align="center" valign="middle" width="56" height="56">
              <p style="margin:0;font-size:17px;font-weight:700;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;line-height:1;">${initials}</p>
            </td>
          </tr></table>
        </td>

        <!-- Name + badge -->
        <td valign="middle" style="padding-left:16px;">
          <p style="margin:0 0 5px;font-size:7.5px;letter-spacing:0.20em;color:rgba(201,167,122,0.42);font-family:Arial,Helvetica,sans-serif;">Participant &nbsp;&middot;&nbsp; ${adminEntryId}</p>
          <p style="margin:0 0 12px;font-size:21px;color:#F0E8DF;font-family:Georgia,'Times New Roman',serif;letter-spacing:0.01em;">${safeFirst} ${safeLast}</p>
          ${safeService ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="border:1px solid rgba(201,151,58,0.30);border-radius:40px;padding:5px 14px;">
              <p style="margin:0;font-size:8.5px;letter-spacing:0.16em;text-transform:uppercase;color:#C9973A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">&#10022;&nbsp; ${safeService}</p>
            </td>
          </tr></table>` : ''}
        </td>

      </tr></table>
    </td></tr>

    <!-- ─── ORNAMENTAL DIVIDER ─── -->
    <tr><td style="padding:0 36px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="height:1px;background:linear-gradient(90deg,rgba(201,151,58,0),rgba(201,151,58,0.20));font-size:0;">&nbsp;</td>
        <td style="padding:0 13px;font-size:10px;color:rgba(201,151,58,0.35);line-height:1;white-space:nowrap;font-family:Arial;">&#10022;</td>
        <td style="height:1px;background:linear-gradient(90deg,rgba(201,151,58,0.20),rgba(201,151,58,0));font-size:0;">&nbsp;</td>
      </tr></table>
    </td></tr>

    <!-- ─── FIELDS 2-COL ─── -->
    <tr><td style="padding:0 36px 4px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          ${iconField(ICONS.phone, 'T&eacute;l&eacute;phone',        safePhone)}
          ${iconField(ICONS.email, 'Courriel',                       safeEmail)}
        </tr>
        <tr>
          ${iconField(ICONS.insta, 'Instagram &nbsp;/&nbsp; TikTok', safeUsername || null)}
          ${iconField(ICONS.cal,   'Date d\'inscription',             submittedAt)}
        </tr>
      </table>
    </td></tr>

    <!-- ─── META STRIP ─── -->
    <tr><td style="padding:14px 36px 18px;border-top:1px solid rgba(201,151,58,0.08);">
      <p style="margin:0;font-size:9px;color:rgba(201,167,122,0.28);font-family:Arial,Helvetica,sans-serif;letter-spacing:0.06em;">
        ${deviceType}${browser && browser !== 'Unknown' ? ` &nbsp;&middot;&nbsp; ${browser}` : ''}${location ? ` &nbsp;&middot;&nbsp; ${location}` : ''}
      </p>
    </td></tr>

  </table>
  </td></tr>

  <!-- ─── FOOTER ─── -->
  <tr><td align="center" bgcolor="#EAE0D5" style="background:#EAE0D5;padding:22px 0 48px;">
    <table role="presentation" width="180" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;"><tr>
      <td style="height:1px;background:rgba(182,106,90,0.14);font-size:0;">&nbsp;</td>
      <td style="padding:0 11px;color:rgba(182,106,90,0.22);font-size:9px;line-height:1;white-space:nowrap;font-family:Arial;">&#10022;</td>
      <td style="height:1px;background:rgba(182,106,90,0.14);font-size:0;">&nbsp;</td>
    </tr></table>
    <p style="margin:0;font-size:7.5px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(90,60,40,0.22);font-family:Arial,Helvetica,sans-serif;">Skines Head Spa &nbsp;&mdash;&nbsp; Syst&egrave;me automatique</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  /* ── CONFIRMATION EMAIL TO PARTICIPANT ── */
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
    <p style="margin:0;font-size:7.5px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(90,70,55,0.52);font-family:Arial,Helvetica,sans-serif;font-weight:700;">SKINES HEAD SPA &amp; WELLNESS</p>
  </td></tr>

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
          Votre participation au <em>Tirage Exclusif</em><br>de <strong>Skines Head Spa</strong> a bien &eacute;t&eacute; enregistr&eacute;e.
        </p>

        <p style="margin:0 0 28px;font-size:13px;color:rgba(90,70,55,0.60);font-family:Arial,Helvetica,sans-serif;line-height:1.7;text-align:center;">
          Le gagnant sera contact&eacute; personnellement.
        </p>

        <!-- Reference ID -->
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;border:1px solid rgba(182,106,90,0.18);border-radius:8px;"><tr>
          <td align="center" style="padding:11px 28px;">
            <p style="margin:0 0 3px;font-size:7px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(90,70,55,0.38);font-family:Arial,Helvetica,sans-serif;">R&eacute;f&eacute;rence</p>
            <p style="margin:0;font-size:15px;letter-spacing:0.12em;color:#3A1E14;font-family:Georgia,'Times New Roman',serif;">${customerEntryId}</p>
          </td>
        </tr></table>

        <!-- CTA Button — single line, wider padding -->
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
          <td align="center" style="border-radius:8px;background:#B66A5A;mso-padding-alt:0;">
            <a href="https://skines.ca" style="display:inline-block;padding:15px 52px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#FEFAF7;text-decoration:none;white-space:nowrap;">D&Eacute;COUVRIR NOS SOINS</a>
          </td>
        </tr></table>

      </td></tr>

      <!-- Cream footer strip -->
      <tr><td style="padding:20px 44px 24px;text-align:center;background:#FAF6F0;border-top:1px solid rgba(182,106,90,0.09);">
        <p style="margin:0 0 5px;font-size:7.5px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(90,70,55,0.45);font-family:Arial,Helvetica,sans-serif;font-weight:700;">SKINES HEAD SPA &amp; WELLNESS</p>
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
    const [adminId, confirmId] = await Promise.all([
      sendViaResend({
        from: FROM_ADMIN,
        to:   ADMIN,
        subject: `✦ ${firstName} ${lastName} — Tirage Skines`,
        html:    adminHtml,
      }),
      sendViaResend({
        from:    FROM,
        to:      email,
        replyTo: ADMIN,
        subject: `✦ Votre inscription au Tirage Skines est confirmée`,
        html:    confirmHtml,
      }),
    ]);
    console.log('[send-tirage] admin:', adminId, 'confirm:', confirmId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[send-tirage] failed:', err.message);
    // Roll back all duplicate guards so the participant can retry
    await releaseGuard('email', emailKey);
    await releaseGuard('phone', phoneKey);
    if (usernameKey) await releaseGuard('username', usernameKey);
    return res.status(500).json({ error: "Erreur lors de l'envoi. Réessayez." });
  }
}
