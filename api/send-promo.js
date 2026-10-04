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

const FROM  = 'Skines Head Spa <noreply@mail.skines.ca>';
const ADMIN = 'skinesca@gmail.com';
const LOGO  = 'https://skines.ca/assets/images/logo-officiel-cropped.PNG';

const _redisUrl   = process.env.UPSTASH_REDIS_REST_URL;
const _redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisEnabled = !!(_redisUrl && _redisToken);

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

function customerEmailHtml(name) {
  const hi = name ? `Bonjour ${escapeHtml(name)},` : 'Bonjour,';
  return `
  <div style="margin:0;padding:0;background:#efe6dd;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <div style="text-align:center;margin-bottom:24px;">
        <img src="${LOGO}" alt="Skines" width="150" style="max-width:150px;height:auto;">
      </div>
      <div style="background:#684034;border-radius:20px;padding:36px 28px;text-align:center;color:#F5EDE3;">
        <div style="font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#e8bd5c;">Tirage du mois</div>
        <div style="font-family:Georgia,serif;font-size:40px;line-height:1.05;margin:10px 0 4px;">Gagnez -50%</div>
        <div style="font-family:Georgia,serif;font-style:italic;font-size:22px;color:#efe3d4;">sur une séance</div>
        <p style="color:rgba(245,237,227,.9);font-size:15px;margin:20px 0 0;">${hi}<br>Votre participation au tirage du mois est bien enregistrée. 🎉</p>
        <p style="color:rgba(245,237,227,.8);font-size:14px;margin:14px 0 0;">Un(e) gagnant(e) est tiré(e) au sort chaque mois et remporte <b>-50% sur une séance</b>. Le résultat est annoncé sur notre story Instagram
        <a href="https://instagram.com/skines.spa" style="color:#e8bd5c;">@skines.spa</a> — suivez-nous pour ne pas le manquer&nbsp;!</p>
      </div>
      <p style="text-align:center;color:#9e8c84;font-size:12px;margin-top:20px;">Skines Head Spa &amp; Wellness · 19 Av. Shamrock, Montréal · skines.ca</p>
    </div>
  </div>`;
}

function adminEmailHtml(lead) {
  const ig = lead.instagram ? `<a href="https://instagram.com/${escapeHtml(lead.instagram.replace(/^@/, ''))}">@${escapeHtml(lead.instagram.replace(/^@/, ''))}</a>` : '—';
  return `<div style="font-family:system-ui,Arial,sans-serif;font-size:14px;color:#222;">
    <h3 style="margin:0 0 8px;">Nouvelle participation au tirage -50%</h3>
    <p style="margin:4px 0;"><strong>Prénom :</strong> ${escapeHtml(lead.name || '—')}</p>
    <p style="margin:4px 0;"><strong>E-mail :</strong> ${escapeHtml(lead.email)}</p>
    <p style="margin:4px 0;"><strong>Téléphone :</strong> ${escapeHtml(lead.phone || '—')}</p>
    <p style="margin:4px 0;"><strong>Instagram :</strong> ${ig}</p>
    <p style="margin:4px 0;"><strong>Tirage :</strong> ${monthKey()}</p>
  </div>`;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIp(req);
  if (!rateLimit(ip, { maxRequests: 5, windowMs: 60_000 }).allowed) {
    return res.status(429).json({ error: 'Trop de tentatives, réessayez plus tard.' });
  }

  let body;
  try { body = await requireJson(req); }
  catch { return res.status(400).json({ error: 'Invalid request' }); }

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

  try {
    await sendViaResend({
      from: FROM, to: email,
      subject: '🎉 Vous participez au tirage -50% chez Skines',
      html: customerEmailHtml(lead.name),
    });
  } catch (e) {
    console.error('[promo] customer email error:', e.message);
    return res.status(500).json({ error: "Impossible d'envoyer l'e-mail. Réessayez." });
  }

  try {
    await sendViaResend({
      from: FROM, to: ADMIN, replyTo: email,
      subject: `Tirage -50% · nouvelle participation · ${email}`,
      html: adminEmailHtml(lead),
    });
  } catch (e) { console.error('[promo] admin email error:', e.message); }

  return res.status(200).json({ ok: true });
}
