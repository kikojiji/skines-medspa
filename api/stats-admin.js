// GET /api/stats-admin?days=30 — compteurs agrégés (mot de passe TIRAGE_ADMIN_KEY, header x-admin-key).
import crypto from 'node:crypto';
import { rateLimit, getClientIp } from './_lib/security.js';
import { readDays, statsEnabled } from './_lib/stats.js';

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const key = process.env.TIRAGE_ADMIN_KEY;
  if (!key) return res.status(503).json({ error: 'Non configuré.' });
  if (!statsEnabled) return res.status(503).json({ error: 'Base de données non configurée.' });
  if (!rateLimit(getClientIp(req), { maxRequests: 30, windowMs: 60_000 }).ok) return res.status(429).json({ error: 'Trop de tentatives.' });
  if (!safeEqual(req.headers['x-admin-key'] || '', key)) {
    await new Promise(r => setTimeout(r, 500));
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }
  const days = Math.min(90, Math.max(1, parseInt(req.query && req.query.days, 10) || 30));
  try { return res.status(200).json({ days: await readDays(days) }); }
  catch (e) { console.error('[stats-admin]', e.message); return res.status(500).json({ error: 'Erreur serveur.' }); }
}
