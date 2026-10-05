// Vercel Serverless Function — Tirage admin (liste des participants + enregistrement du gagnant)
// GET  /api/tirage-admin?month=YYYY-MM   -> participants du mois + gagnant déjà tiré (si existe)
// POST /api/tirage-admin                 -> enregistre le gagnant { month, email }
//
// Protégé par un mot de passe : header `x-admin-key` comparé à la variable d'environnement
// TIRAGE_ADMIN_KEY (à créer dans Vercel). Sans cette variable, l'API répond 503 et ne fait rien.
// Les données personnelles ne sont JAMAIS exposées sans ce mot de passe.

import crypto from 'node:crypto';
import { rateLimit, getClientIp } from './_lib/security.js';

const _url   = process.env.UPSTASH_REDIS_REST_URL;
const _token = process.env.UPSTASH_REDIS_REST_TOKEN;
const redisEnabled = !!(_url && _token);

async function redis(path) {
  const r = await fetch(`${_url}/${path}`, { headers: { Authorization: `Bearer ${_token}` } });
  return r.json();
}

function sha(s) { return crypto.createHash('sha256').update(String(s)).digest(); }
function safeEqual(a, b) { return crypto.timingSafeEqual(sha(a), sha(b)); }

function currentMonthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
function lastMonths(n) {
  const out = []; const d = new Date(); d.setUTCDate(1);
  for (let i = 0; i < n; i++) {
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return out;
}
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const SOURCES = { promo: 'promo', tirage: 'tirage' };   // /offre (-50%) ou ancien /tirage

async function readEntries(month, src) {
  const d = await redis(`lrange/${encodeURIComponent(src + ':entries:' + month)}/0/-1`);
  const raw = Array.isArray(d.result) ? d.result : [];
  const seen = new Set(); const out = [];
  for (const s of raw.reverse()) {            // LPUSH met le plus récent en premier -> on remet l'ordre chronologique
    try {
      const o = JSON.parse(s);
      const email = String(o.email || '').toLowerCase();
      if (!email || seen.has(email)) continue;  // un seul ticket par e-mail
      seen.add(email);
      out.push({ name: o.name || '', email, phone: o.phone || '', instagram: o.instagram || '', at: o.at || '' });
    } catch { /* ligne illisible : ignorée */ }
  }
  return out;
}

async function readWinner(month, src) {
  const d = await redis(`get/${encodeURIComponent(src + ':winner:' + month)}`);
  if (!d.result) return null;
  try { return JSON.parse(d.result); } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const key = process.env.TIRAGE_ADMIN_KEY;
  if (!key) return res.status(503).json({ error: 'Non configuré : ajoutez TIRAGE_ADMIN_KEY dans les variables Vercel.' });
  if (!redisEnabled) return res.status(503).json({ error: 'Base de données non configurée.' });

  if (!rateLimit(getClientIp(req), { maxRequests: 30, windowMs: 60_000 }).ok) {
    return res.status(429).json({ error: 'Trop de tentatives, réessayez dans une minute.' });
  }
  if (!safeEqual(req.headers['x-admin-key'] || '', key)) {
    await new Promise(r => setTimeout(r, 500));  // ralentit les essais de mots de passe
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }

  try {
    if (req.method === 'GET') {
      const month = String((req.query && req.query.month) || currentMonthKey());
      if (!MONTH_RE.test(month)) return res.status(400).json({ error: 'Mois invalide.' });
      const src = SOURCES[String((req.query && req.query.source) || 'promo')] || 'promo';
      const [entries, winner] = await Promise.all([readEntries(month, src), readWinner(month, src)]);
      return res.status(200).json({ month, source: src, months: lastMonths(6), entries, winner });
    }

    if (req.method === 'POST') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const month = String(body.month || '');
      const email = String(body.email || '').toLowerCase();
      if (!MONTH_RE.test(month) || !email) return res.status(400).json({ error: 'Requête invalide.' });
      const src = SOURCES[String(body.source || 'promo')] || 'promo';
      const entries = await readEntries(month, src);
      const w = entries.find(e => e.email === email);
      if (!w) return res.status(404).json({ error: "Ce participant n'est pas dans la liste du mois." });
      const record = { ...w, month, drawnAt: new Date().toISOString(), poolSize: Number(body.poolSize) || entries.length };
      const json = encodeURIComponent(JSON.stringify(record));
      await redis(`set/${encodeURIComponent(src + ':winner:' + month)}/${json}`);
      await redis(`lpush/${encodeURIComponent(src + ':draws:' + month)}/${json}`);   // historique de tous les tirages
      return res.status(200).json({ ok: true, winner: record });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[tirage-admin] error:', e.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}
