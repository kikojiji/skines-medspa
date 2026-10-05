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

import { cleanAttribution } from './_lib/attribution.js';
import { sendLeadToAds } from './_lib/lead-events.js';
import { bump } from './_lib/stats.js';
const adsStats = (r) => !r || r.skipped ? ['leadads:noconsent'] : ['leadads:sent', r.meta && `leadads:meta:${String(r.meta).split(':')[0]}`, r.tiktok && `leadads:tiktok:${String(r.tiktok).split(':')[0]}`];
import {
  escapeHtml, sanitizeText, validateEmail, isHoneypotTriggered, requireJson,
  setCorsHeaders, rateLimit, getClientIp, sendViaResend,
} from './_lib/security.js';

const FROM  = 'Tirage du mois <tirage@mail.skines.ca>';
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

const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
function monthLabelFr(key) { const [y, m] = key.split('-'); return `${MONTHS_FR[parseInt(m, 10) - 1]} ${y}`; }
// Pseudo code-barres décoratif, déterministe à partir du numéro de ticket.
function barcodeHtml(seed) {
  let n = 0; for (const ch of String(seed)) n = (n * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { n = (n * 1664525 + 1013904223) >>> 0; return n; };
  let cells = '';
  for (let i = 0; i < 34; i++) {
    const bar = 1 + (rnd() % 3), gap = 1 + (rnd() % 2);
    cells += `<td width="${bar}" bgcolor="#3a241c" style="width:${bar}px;height:38px;background:#3a241c;font-size:0;line-height:0;">&nbsp;</td><td width="${gap}" style="width:${gap}px;font-size:0;line-height:0;">&nbsp;</td>`;
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>`;
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

// Retourne le nombre de participants du mois (LPUSH renvoie la nouvelle longueur de la liste), ou null.
async function storeEntry(lead) {
  if (!redisEnabled) return null;
  try {
    const payload = encodeURIComponent(JSON.stringify({ ...lead, at: new Date().toISOString() }));
    const d = await redis(`lpush/${encodeURIComponent('promo:entries:' + monthKey())}/${payload}`);
    return typeof d.result === 'number' ? d.result : null;
  } catch (e) { console.error('[promo] redis store error:', e.message); return null; }
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

// ═════════ E-MAIL PARTICIPANT — « Ticket » doré ═════════
function customerEmailHtml(lead, ctx) {
  const e = escapeHtml;
  const first = e((lead.name || '').trim().split(/\s+/)[0] || '');
  const MAROON = '#684034', CREAM = '#F7F0E6', GOLD = '#C9973A', INK = '#3a241c';
  const notch = (side) => `<td width="16" height="32" bgcolor="${MAROON}" style="width:16px;height:32px;background:${MAROON};border-radius:${side === 'l' ? '0 16px 16px 0' : '16px 0 0 16px'};font-size:0;line-height:0;">&nbsp;</td>`;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>Votre ticket Skines</title></head>
<body style="margin:0;padding:0;background:${MAROON};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${MAROON};font-size:1px;line-height:1px;">Votre ticket ${e(ctx.customerId)} est validé : -50% à gagner sur une séance Skines.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${MAROON}" style="background:${MAROON};"><tr><td align="center" style="padding:34px 14px 40px;">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;">

  <tr><td align="center" style="padding:0 0 26px;">
    <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;letter-spacing:.55em;color:${CREAM};padding-left:.55em;">SKINES</p>
    <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:9px;letter-spacing:.34em;color:#e8bd5c;text-transform:uppercase;">Head Spa &middot; Montr&eacute;al</p>
  </td></tr>

  <tr><td>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CREAM}" style="background:${CREAM};border-radius:20px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.30);">
    <tr><td style="height:6px;background:${GOLD};font-size:0;line-height:0;">&nbsp;</td></tr>

    <tr><td align="center" style="padding:36px 30px 26px;">
      <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.32em;color:${GOLD};text-transform:uppercase;">Tirage du mois &middot; ${e(ctx.monthLabel)}</p>
      <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:96px;line-height:1;color:${INK};letter-spacing:-.02em;">&minus;50<span style="font-size:52px;vertical-align:top;line-height:1.15;">%</span></p>
      <p style="margin:2px 0 18px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:24px;color:${MAROON};">&agrave; gagner sur une s&eacute;ance</p>
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#6b5048;">${first ? `Bravo ${first}, v` : 'V'}otre participation est confirm&eacute;e.<br>Gardez ce ticket : il vous donne une chance de gagner.</p>
    </td></tr>

    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        ${notch('l')}
        <td valign="middle" style="font-size:0;line-height:0;"><div style="border-top:2px dashed #d8c7ae;height:0;font-size:0;line-height:0;">&nbsp;</div></td>
        ${notch('r')}
      </tr></table>
    </td></tr>

    <tr><td style="padding:24px 30px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td valign="top">
          <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:9px;font-weight:700;letter-spacing:.3em;color:#a8957f;text-transform:uppercase;">Ticket n&deg;</p>
          <p style="margin:0 0 14px;font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:700;letter-spacing:.08em;color:${INK};">${e(ctx.customerId)}</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b5048;">Participant(e) &middot; <strong style="color:${INK};">${e(lead.name || '')}</strong><br>Tirage &middot; <strong style="color:${INK};">${e(ctx.monthLabel)}</strong></p>
        </td>
        <td valign="bottom" align="right" style="padding-left:12px;">${barcodeHtml(ctx.customerId)}</td>
      </tr></table>
    </td></tr>
  </table>
  </td></tr>

  <tr><td style="padding:28px 6px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="33%" valign="top" align="center" style="padding:0 6px;">
          <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:22px;color:#e8bd5c;">01</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:${CREAM};">Inscription<br>valid&eacute;e &#10003;</p>
        </td>
        <td width="33%" valign="top" align="center" style="padding:0 6px;border-left:1px solid rgba(247,240,230,.22);border-right:1px solid rgba(247,240,230,.22);">
          <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:22px;color:#e8bd5c;">02</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:${CREAM};">Suivez<br>@skines.ca</p>
        </td>
        <td width="33%" valign="top" align="center" style="padding:0 6px;">
          <p style="margin:0 0 6px;font-family:Georgia,serif;font-size:22px;color:#e8bd5c;">03</p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:${CREAM};">Gagnant(e) annonc&eacute;(e)<br>en story</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <tr><td align="center" style="padding:28px 0 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td bgcolor="#e8bd5c" style="background:#e8bd5c;border-radius:999px;">
        <a href="https://instagram.com/skines.ca" style="display:inline-block;padding:15px 38px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:${INK};text-decoration:none;">Suivre @skines.ca</a>
      </td>
    </tr></table>
  </td></tr>

  <tr><td align="center" style="padding:18px 18px 0;">
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:1.6;color:rgba(247,240,230,.78);">Ce message est dans &laquo;&nbsp;Promotions&nbsp;&raquo; ? Glissez-le dans <strong style="color:#e8bd5c;">Principal</strong> pour ne pas manquer l'annonce du r&eacute;sultat.</p>
  </td></tr>

  <tr><td align="center" style="padding:22px 10px 0;">
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7;color:rgba(247,240,230,.62);">Skines Head Spa &amp; Wellness &middot; 19 Av. Shamrock, Montr&eacute;al<br><a href="https://skines.ca" style="color:rgba(247,240,230,.62);">skines.ca</a></p>
  </td></tr>

</table>
</td></tr></table></body></html>`;
}


// Version texte brut (aide la délivrabilité et l'affichage dans les clients mail)
function customerEmailText(lead, ctx) {
  return [
    `Bonjour ${lead.name || ''},`.trim(),
    '',
    `Votre participation au tirage du mois (${ctx.monthLabel}) est confirmée.`,
    `Votre ticket : ${ctx.customerId}`,
    '',
    'Le prix : -50 % sur une séance chez Skines Head Spa & Wellness.',
    'Le/la gagnant(e) sera annoncé(e) dans notre story Instagram @skines.ca (https://instagram.com/skines.ca).',
    '',
    "Ce message est dans « Promotions » ? Glissez-le dans « Principal » pour ne pas manquer l'annonce.",
    '',
    'Skines Head Spa & Wellness — 19 Av. Shamrock, Montréal — https://skines.ca',
  ].join('\n');
}

// ═════════ E-MAIL ADMIN — Fiche d'action en un clic ═════════
function adminEmailHtml(lead, ctx) {
  const e = escapeHtml;
  const MAROON = '#684034', GOLD = '#C9973A', INK = '#3a241c';
  const initials = ((lead.name || '?').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('') || '?').toUpperCase();
  const digits = (lead.phone || '').replace(/\D/g, '');
  const wa = digits ? `https://wa.me/${digits.length === 10 ? '1' + digits : digits}` : '';
  const ig = lead.instagram ? `https://instagram.com/${encodeURIComponent(lead.instagram)}` : '';
  const meta = [ctx.device, ctx.browser, ctx.location].filter(Boolean).map(e).join(' &middot; ');
  const btn = (href, label, bg, fg) => href ? `<td style="padding:0 6px 10px 0;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="${bg}" style="background:${bg};border-radius:12px;"><a href="${href}" style="display:inline-block;padding:12px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:${fg};text-decoration:none;">${label}</a></td></tr></table></td>` : '';
  const row = (label, value) => value ? `<tr><td style="padding:10px 0;border-bottom:1px solid #efe6da;"><p style="margin:0 0 2px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:.18em;color:#a8957f;text-transform:uppercase;">${label}</p><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:${INK};word-break:break-all;">${value}</p></td></tr>` : '';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>Nouvelle participation</title></head>
<body style="margin:0;padding:0;background:#f1e9df;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;">${e(lead.name || lead.email)} participe au tirage -50% (${e(ctx.monthLabel)}).</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f1e9df" style="background:#f1e9df;"><tr><td align="center" style="padding:28px 12px 36px;">
<table role="presentation" width="540" cellpadding="0" cellspacing="0" style="width:540px;max-width:100%;border-radius:22px;overflow:hidden;box-shadow:0 10px 30px rgba(104,64,52,.18);">

  <tr><td bgcolor="${MAROON}" style="background:${MAROON};padding:26px 30px 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td valign="middle">
        <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:.3em;color:#e8bd5c;text-transform:uppercase;">Tirage &minus;50% &middot; ${e(ctx.monthLabel)}</p>
        <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#F7F0E6;">Nouvelle participation</p>
      </td>
      <td valign="middle" align="right">${ctx.count ? `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#e8bd5c" style="background:#e8bd5c;border-radius:16px;padding:10px 18px;"><p style="margin:0;font-family:Georgia,serif;font-size:30px;line-height:1;color:${INK};">${ctx.count}</p><p style="margin:3px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:8px;font-weight:700;letter-spacing:.16em;color:${INK};text-transform:uppercase;">ce mois-ci</p></td></tr></table>` : ''}</td>
    </tr></table>
  </td></tr>

  <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:26px 30px 8px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
      <td width="64" valign="middle"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" valign="middle" width="54" height="54" bgcolor="${GOLD}" style="width:54px;height:54px;background:${GOLD};border-radius:27px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:#fff;">${e(initials)}</td></tr></table></td>
      <td valign="middle" style="padding-left:14px;"><p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${INK};">${e(lead.name || '—')}</p><p style="margin:3px 0 0;font-family:'Courier New',Courier,monospace;font-size:12px;letter-spacing:.1em;color:#a8957f;">${e(ctx.adminId)} &middot; ${e(ctx.submittedAt)}</p></td>
    </tr></table>
  </td></tr>

  <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:6px 30px 6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${row('Courriel', `<a href="mailto:${e(lead.email)}" style="color:${INK};text-decoration:none;">${e(lead.email)}</a>`)}
      ${row('T&eacute;l&eacute;phone', lead.phone ? `<a href="tel:${e(lead.phone)}" style="color:${INK};text-decoration:none;">${e(lead.phone)}</a>` : '')}
      ${row('Instagram (&agrave; taguer si gagnant)', lead.instagram ? `<a href="${ig}" style="color:${MAROON};font-weight:700;text-decoration:none;">@${e(lead.instagram)}</a>` : '')}
    </table>
  </td></tr>

  <tr><td bgcolor="#ffffff" style="background:#ffffff;padding:18px 30px 26px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      ${btn(ig, 'Voir sur Instagram', MAROON, '#F7F0E6')}
      ${btn(lead.phone ? 'tel:' + e(lead.phone) : '', 'Appeler', '#F1E3CF', INK)}
      ${btn(wa, 'WhatsApp', '#1f9d55', '#ffffff')}
    </tr></table>
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>${btn('mailto:' + e(lead.email), 'R&eacute;pondre par e-mail', '#F1E3CF', INK)}</tr></table>
  </td></tr>

  <tr><td bgcolor="#faf5ee" style="background:#faf5ee;padding:12px 30px;border-top:1px solid #efe6da;">
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:.06em;color:#b7a791;">${meta}</p>
  </td></tr>

</table>
</td></tr></table></body></html>`;
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
  const src = cleanAttribution(body.ctx && body.ctx.attribution);

  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return res.status(400).json({ error: 'Vérification anti-robot échouée.' });
  }

  // Déjà inscrit ce mois-ci ? Succès « doux » (pas de doublon, pas de spam).
  const fresh = await claimEmail(email);
  if (!fresh) {
    return res.status(200).json({ ok: true, already: true });
  }

  const count = await storeEntry({ ...lead, src, pledge: body.pledge === true });

  const ua = req.headers['user-agent'] || '';
  _fallback++;
  const [custSeq, adminSeq] = await Promise.all([nextSeqId('customer'), nextSeqId('admin')]);
  const ctx = {
    customerId: `SK-${String(custSeq ?? (65 + _fallback)).padStart(4, '0')}`,
    adminId:    `SK-${String(adminSeq ?? (19 + _fallback)).padStart(4, '0')}`,
    month: monthKey(),
    monthLabel: monthLabelFr(monthKey()),
    count,
    submittedAt: submittedAtFr(),
    device: getDevice(ua),
    browser: getBrowser(ua),
    location: [safeDecode(req.headers['x-vercel-ip-city']), req.headers['x-vercel-ip-country'] || ''].filter(Boolean).join(', '),
  };

  try {
    await sendViaResend({
      from: FROM, to: email, replyTo: ADMIN,
      subject: `Votre participation au tirage du mois est confirmée · ${ctx.customerId}`,
      html: customerEmailHtml(lead, ctx),
      text: customerEmailText(lead, ctx),
    });
  } catch (e) {
    console.error('[promo] customer email error:', e.message);
    return res.status(500).json({ error: "Impossible d'envoyer l'e-mail. Réessayez." });
  }

  try {
    await sendViaResend({
      from: FROM, to: ADMIN, replyTo: email,
      subject: `🎟️ ${ctx.count ? 'N°' + ctx.count + ' · ' : ''}${lead.name || email} — Tirage -50%`,
      html: adminEmailHtml(lead, ctx),
    });
  } catch (e) { console.error('[promo] admin email error:', e.message); }

  // Lead côté serveur vers Meta/TikTok (haché) — seulement si le visiteur a accepté la publicité.
  try {
    const lr = await sendLeadToAds({
      ip, ua, url: 'https://skines.ca/offre', formId: 'offre',
      ads: body.ctx && body.ctx.ads, email, phone: lead.phone, firstName: lead.name,
    });
    await bump(adsStats(lr));
  } catch (e) { console.error('[promo] lead-events error:', e.message); }

  return res.status(200).json({ ok: true });
}
