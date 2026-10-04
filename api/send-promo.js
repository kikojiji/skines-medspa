// Vercel Serverless Function — Tirage mensuel -50%
// POST /api/send-promo
// Body: { name, email, phone?, instagram?, website (honeypot), turnstileToken? }
//
// - Inscrit la personne au tirage du mois (prix : -50% sur une séance).
// - Envoie un e-mail de confirmation au participant (via Resend).
// - Envoie une notification à l'admin (skinesca@gmail.com) avec Instagram pour le tag.
// - Enregistre l'inscription dans Upstash (liste du mois).
//
// Env requis : RESEND_API_KEY
// Env optionnels : UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, TURNSTILE_SECRET_KEY

import {
  escapeHtml, sanitizeText, validateEmail, isHoneypotTriggered, requireJson,
  setCorsHeaders, rateLimit, getClientIp, sendViaResend,
} from './_lib/security.js';

const FROM  = 'Tirage · Skines <noreply@mail.skines.ca>';
const ADMIN = 'skinesca@gmail.com';
const LOGO  = 'https://skines.ca/assets/images/logo-officiel-cropped.PNG';

const _redisUrl   = process.env.UPSTASH_REDIS_REST_URL;
const _redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisEnabled = !!(_redisUrl && _redisToken);


// ── Numéro d'inscription séquentiel (même compteur que le tirage existant) ───
async function nextSeqId(type) {
  if (!redisEnabled) return null;
  const key   = `tirage:seq:${type}`;
  const start = type === 'customer' ? 65 : 19;
  try {
    await redis(`setnx/${encodeURIComponent(key)}/${start}`);
    const d = await redis(`incr/${encodeURIComponent(key)}`);
    return typeof d.result === 'number' ? d.result : null;
  } catch { return null; }
}
let _fallback = 0;

function getBrowser(ua) {
  if (/CriOS/i.test(ua)) return 'Chrome (iOS)';
  if (/FxiOS/i.test(ua)) return 'Firefox (iOS)';
  if (/EdgA|EdgIOS/i.test(ua)) return 'Edge (Mobile)';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edg/i.test(ua)) return 'Edge';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua)) return 'Safari';
  return '';
}
function getDevice(ua) {
  if (/iPad/i.test(ua)) return 'iPad';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/Android.*Mobile/i.test(ua)) return 'Android Mobile';
  if (/Android/i.test(ua)) return 'Android Tablet';
  return 'Desktop';
}
function safeDecode(v) { try { return decodeURIComponent(v || ''); } catch { return v || ''; } }

const ICONS = { phone: '\u{1F4DE}', email: '\u{2709}\u{FE0F}', insta: '\u{1F4F8}', cal: '\u{1F4C5}' };
function iconField(emoji, label, value) {
  if (!value) return `<td width="50%" style="padding:0 0 26px;vertical-align:top;"></td>`;
  return `<td width="50%" style="padding:0 0 26px;vertical-align:top;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td width="42" valign="top" style="padding-right:12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" bgcolor="#2A1B0E" style="background:#2A1B0E;width:38px;height:38px;border-radius:19px;border:1px solid rgba(201,151,58,0.30);"><tr>
        <td align="center" valign="middle" width="38" height="38" style="font-size:18px;line-height:38px;">${emoji}</td>
      </tr></table>
    </td>
    <td valign="top">
      <p style="margin:0 0 5px;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(201,167,122,0.80);font-family:Arial,Helvetica,sans-serif;font-weight:700;">${label}</p>
      <p style="margin:0;font-size:15px;color:#F0E8DF;font-family:Georgia,'Times New Roman',serif;line-height:1.45;word-break:break-all;overflow-wrap:anywhere;">${value}</p>
    </td>
  </tr></table>
</td>`;
}
function submittedAtFr() {
  const d = new Date();
  const f = (o) => d.toLocaleString('en-CA', { timeZone: 'America/Toronto', ...o });
  const M = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  return `${f({ day: 'numeric' })} ${M[parseInt(f({ month: 'numeric' }), 10) - 1]} ${f({ year: 'numeric' })} à ${f({ hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', 'h')}`;
}

function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

async function redis(path) {
  const r = await fetch(`${_redisUrl}/${path}`, { headers: { Authorization: `Bearer ${_redisToken}` } });
  return r.json();
}

// true = e-mail libre (on l'enregistre), false = déjà inscrit ce mois-ci
async function claimEmail(email) {
  if (!redisEnabled) return true;
  try {
    const d = await redis(`setnx/${encodeURIComponent('promo:' + monthKey() + ':email:' + email)}/1`);
    return d.result === 1;
  } catch { return true; }
}

async function storeEntry(lead) {
  if (!redisEnabled) return;
  try {
    const payload = encodeURIComponent(JSON.stringify({ ...lead, at: new Date().toISOString() }));
    await redis(`lpush/${encodeURIComponent('promo:entries:' + monthKey())}/${payload}`);
  } catch (e) { console.error('[promo] redis store error:', e.message); }
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;           // non configuré → on passe
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
    });
    const d = await r.json();
    return !!d.success;
  } catch { return false; }
}

function adminEmailHtml(lead, ctx) {
  const e = escapeHtml;
  const initials = ((lead.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('') || '?').toUpperCase();
  const insta = lead.instagram ? `@${e(lead.instagram)}` : null;
  const meta = [ctx.device, ctx.browser, ctx.location].filter(Boolean).map(e).join(' &nbsp;&middot;&nbsp; ');
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background:#EAE0D5;font-family:Georgia,'Times New Roman',serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#EAE0D5" style="background:#EAE0D5;"><tr><td align="center">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:100%;">
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
  <tr><td style="padding:0 0 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#180E07" style="background:#180E07;border-radius:20px;overflow:hidden;border:1px solid rgba(201,151,58,0.20);">
    <tr><td style="height:1px;background:linear-gradient(90deg,rgba(201,151,58,0),rgba(201,151,58,0.60),rgba(201,151,58,0));font-size:0;line-height:0;">&nbsp;</td></tr>
    <tr><td style="padding:28px 36px 0;">
      <p style="margin:0 0 5px;font-size:7px;letter-spacing:0.34em;text-transform:uppercase;color:rgba(201,167,122,0.35);font-family:Arial,Helvetica,sans-serif;font-weight:700;">Registration ID</p>
      <p style="margin:0;font-size:27px;letter-spacing:0.08em;color:#C9A77A;font-family:Georgia,'Times New Roman',serif;font-weight:400;">${e(ctx.adminId)}</p>
    </td></tr>
    <tr><td style="padding:18px 36px 20px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="height:1px;background:rgba(201,151,58,0.12);font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
    <tr><td style="padding:0 36px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td width="68" valign="middle">
          <table role="presentation" cellpadding="0" cellspacing="0" bgcolor="#B66A5A" style="background:#B66A5A;width:56px;height:56px;border-radius:28px;border:1px solid rgba(201,151,58,0.28);"><tr>
            <td align="center" valign="middle" width="56" height="56"><p style="margin:0;font-size:17px;font-weight:700;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;line-height:1;">${e(initials)}</p></td>
          </tr></table>
        </td>
        <td valign="middle" style="padding-left:16px;">
          <p style="margin:0 0 5px;font-size:7.5px;letter-spacing:0.20em;color:rgba(201,167,122,0.42);font-family:Arial,Helvetica,sans-serif;">Participant &nbsp;&middot;&nbsp; ${e(ctx.adminId)}</p>
          <p style="margin:0 0 12px;font-size:21px;color:#F0E8DF;font-family:Georgia,'Times New Roman',serif;letter-spacing:0.01em;">${e(lead.name || '—')}</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="border:1px solid rgba(201,151,58,0.30);border-radius:40px;padding:5px 14px;">
              <p style="margin:0;font-size:8.5px;letter-spacing:0.16em;text-transform:uppercase;color:#C9973A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">&#10022;&nbsp; TIRAGE &nbsp;-50% &nbsp;&middot;&nbsp; ${e(ctx.month)}</p>
            </td>
          </tr></table>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:0 36px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="height:1px;background:linear-gradient(90deg,rgba(201,151,58,0),rgba(201,151,58,0.20));font-size:0;">&nbsp;</td>
      <td style="padding:0 13px;font-size:10px;color:rgba(201,151,58,0.35);line-height:1;white-space:nowrap;font-family:Arial;">&#10022;</td>
      <td style="height:1px;background:linear-gradient(90deg,rgba(201,151,58,0.20),rgba(201,151,58,0));font-size:0;">&nbsp;</td>
    </tr></table></td></tr>
    <tr><td style="padding:0 36px 4px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>${iconField(ICONS.phone, 'T&eacute;l&eacute;phone', lead.phone ? e(lead.phone) : null)}${iconField(ICONS.email, 'Courriel', e(lead.email))}</tr>
      <tr>${iconField(ICONS.insta, 'Instagram', insta)}${iconField(ICONS.cal, 'Date d\'inscription', e(ctx.submittedAt))}</tr>
    </table></td></tr>
    <tr><td style="padding:14px 36px 18px;border-top:1px solid rgba(201,151,58,0.08);">
      <p style="margin:0;font-size:9px;color:rgba(201,167,122,0.28);font-family:Arial,Helvetica,sans-serif;letter-spacing:0.06em;">${meta}</p>
    </td></tr>
  </table>
  </td></tr>
  <tr><td align="center" bgcolor="#EAE0D5" style="background:#EAE0D5;padding:22px 0 48px;">
    <table role="presentation" width="180" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;"><tr>
      <td style="height:1px;background:rgba(182,106,90,0.14);font-size:0;">&nbsp;</td>
      <td style="padding:0 11px;color:rgba(182,106,90,0.22);font-size:9px;line-height:1;white-space:nowrap;font-family:Arial;">&#10022;</td>
      <td style="height:1px;background:rgba(182,106,90,0.14);font-size:0;">&nbsp;</td>
    </tr></table>
    <p style="margin:0;font-size:7.5px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(90,60,40,0.22);font-family:Arial,Helvetica,sans-serif;">Skines Head Spa &nbsp;&mdash;&nbsp; Syst&egrave;me automatique</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function customerEmailHtml(lead, ctx) {
  const e = escapeHtml;
  const first = e((lead.name || '').trim().split(/\s+/)[0] || '');
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F2EBE1;font-family:Georgia,'Times New Roman',serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBE1;padding:40px 16px 48px;"><tr><td align="center">
<table width="540" cellpadding="0" cellspacing="0" style="max-width:100%;">
  <tr><td style="padding:0 0 28px;text-align:center;">
    <img src="${LOGO}" alt="Skines" width="48" style="width:48px;height:auto;display:block;margin:0 auto 10px;">
    <p style="margin:0;font-size:7.5px;letter-spacing:0.32em;text-transform:uppercase;color:rgba(90,70,55,0.52);font-family:Arial,Helvetica,sans-serif;font-weight:700;">SKINES HEAD SPA &amp; WELLNESS</p>
  </td></tr>
  <tr><td style="background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid rgba(182,106,90,0.13);">
    <table cellpadding="0" cellspacing="0" width="100%">
      <tr><td style="height:4px;background:linear-gradient(90deg,#D4B896,#C9973A,#D4B896);font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:44px 44px 40px;text-align:center;">
        <p style="margin:0 0 20px;font-size:7.5px;letter-spacing:0.32em;text-transform:uppercase;color:#C9973A;font-family:Arial,Helvetica,sans-serif;font-weight:700;">&#10022;&nbsp; INSCRIPTION CONFIRM&Eacute;E &nbsp;&#10022;</p>
        <p style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:34px;color:#2C1810;line-height:1.15;font-weight:400;">Merci${first ? ` <span style="color:#B66A5A;font-style:italic;">${first}.</span>` : '.'}</p>
        <table width="160" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;"><tr>
          <td style="height:1px;background:#D4B896;"></td><td style="padding:0 10px;color:#C9973A;font-size:11px;line-height:1;white-space:nowrap;">&#10022;</td><td style="height:1px;background:#D4B896;"></td>
        </tr></table>
        <p style="margin:0 0 10px;font-size:15px;color:#3A1E14;font-family:Georgia,'Times New Roman',serif;line-height:1.8;text-align:center;">
          Votre participation au <em>Tirage du mois</em><br>de <strong>Skines Head Spa</strong> a bien &eacute;t&eacute; enregistr&eacute;e.<br>
          <strong>-50% sur une s&eacute;ance</strong> &agrave; gagner.
        </p>
        <p style="margin:0 0 28px;font-size:13px;color:rgba(90,70,55,0.60);font-family:Arial,Helvetica,sans-serif;line-height:1.7;text-align:center;">
          Le gagnant ou la gagnante est annonc&eacute;(e) sur notre story Instagram <a href="https://instagram.com/skines.spa" style="color:#B66A5A;text-decoration:none;">@skines.spa</a>.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;border:1px solid rgba(182,106,90,0.18);border-radius:8px;"><tr>
          <td align="center" style="padding:11px 28px;">
            <p style="margin:0 0 3px;font-size:7px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(90,70,55,0.38);font-family:Arial,Helvetica,sans-serif;">R&eacute;f&eacute;rence</p>
            <p style="margin:0;font-size:15px;letter-spacing:0.12em;color:#3A1E14;font-family:Georgia,'Times New Roman',serif;">${e(ctx.customerId)}</p>
          </td>
        </tr></table>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
          <td align="center" style="border-radius:8px;background:#B66A5A;mso-padding-alt:0;">
            <a href="https://skines.ca" style="display:inline-block;padding:15px 52px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#FEFAF7;text-decoration:none;white-space:nowrap;">D&Eacute;COUVRIR NOS SOINS</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:20px 44px 24px;text-align:center;background:#FAF6F0;border-top:1px solid rgba(182,106,90,0.09);">
        <p style="margin:0 0 5px;font-size:7.5px;letter-spacing:0.28em;text-transform:uppercase;color:rgba(90,70,55,0.45);font-family:Arial,Helvetica,sans-serif;font-weight:700;">SKINES HEAD SPA &amp; WELLNESS</p>
        <p style="margin:0;font-size:11px;color:rgba(90,70,55,0.38);font-family:Arial,Helvetica,sans-serif;letter-spacing:0.05em;">Montr&eacute;al, Canada &nbsp;&middot;&nbsp; <a href="https://skines.ca" style="color:rgba(90,70,55,0.38);text-decoration:none;">skines.ca</a></p>
      </td></tr>
    </table>
  </td></tr>
</table></td></tr></table></body></html>`;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  if (!rateLimit(ip, { maxRequests: 5, windowMs: 60_000 }).ok) {
    return res.status(429).json({ error: 'Trop de tentatives, réessayez plus tard.' });
  }

  const ct = requireJson(req);
  if (!ct.ok) return res.status(ct.status || 415).json({ error: ct.error });
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  if (isHoneypotTriggered(body)) return res.status(200).json({ ok: true }); // piège à bots

  const email = (body.email || '').trim().toLowerCase();
  if (!validateEmail(email)) return res.status(400).json({ error: 'Adresse e-mail invalide.' });

  const lead = {
    email,
    name:      sanitizeText(body.name || '', 60),
    phone:     sanitizeText(body.phone || '', 30),
    instagram: sanitizeText((body.instagram || '').replace(/^@+/, ''), 40),
  };

  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return res.status(400).json({ error: 'Vérification anti-robot échouée.' });
  }

  // Déjà inscrit ce mois-ci ? Succès « doux » (pas de doublon, pas de spam).
  const fresh = await claimEmail(email);
  if (!fresh) {
    return res.status(200).json({ ok: true, already: true });
  }

  await storeEntry(lead);

  const ua = req.headers['user-agent'] || '';
  _fallback++;
  const [custSeq, adminSeq] = await Promise.all([nextSeqId('customer'), nextSeqId('admin')]);
  const ctx = {
    customerId: `SK-${String(custSeq ?? (65 + _fallback)).padStart(4, '0')}`,
    adminId:    `SK-${String(adminSeq ?? (19 + _fallback)).padStart(4, '0')}`,
    month: monthKey(),
    submittedAt: submittedAtFr(),
    device: getDevice(ua),
    browser: getBrowser(ua),
    location: [safeDecode(req.headers['x-vercel-ip-city']), req.headers['x-vercel-ip-country'] || ''].filter(Boolean).join(', '),
  };

  try {
    await sendViaResend({
      from: FROM, to: email,
      subject: '✦ Votre inscription au Tirage Skines est confirmée',
      html: customerEmailHtml(lead, ctx),
    });
  } catch (e) {
    console.error('[promo] customer email error:', e.message);
    return res.status(500).json({ error: "Impossible d'envoyer l'e-mail. Réessayez." });
  }

  try {
    await sendViaResend({
      from: FROM, to: ADMIN, replyTo: email,
      subject: `✦ ${lead.name || email} — Tirage Skines`,
      html: adminEmailHtml(lead, ctx),
    });
  } catch (e) { console.error('[promo] admin email error:', e.message); }

  return res.status(200).json({ ok: true });
}
