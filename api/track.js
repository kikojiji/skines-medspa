// POST /api/track — first-party, cookie-less aggregate counters (no personal data).
// Body (JSON): { e: event, p: path, src, med, camp, dev, pct, form, lang }
import { rateLimit, getClientIp } from './_lib/security.js';
import { bump, statsEnabled } from './_lib/stats.js';

const EVENTS = new Set(['page_view', 'session_start', 'service_view', 'booking_intent', 'gift_card_intent',
  'phone_click', 'email_click', 'whatsapp_click', 'social_click', 'scroll_depth', 'engaged_30s', 'engaged_60s', 'generate_lead']);

const tok = (v, n = 40) => String(v ?? '').toLowerCase().replace(/[^a-z0-9_.\-\/() ]/g, '').trim().slice(0, n);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  if (!statsEnabled) return res.status(204).end();
  if (!rateLimit(getClientIp(req), { maxRequests: 120, windowMs: 60_000 }).ok) return res.status(429).end();

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b && typeof b === 'object' ? b : {};

  const e = tok(b.e, 30);
  if (!EVENTS.has(e)) return res.status(400).end();
  const path = '/' + tok(b.p, 60).replace(/^\/+/, '').replace(/\.html$/, '');
  const src = tok(b.src) || '(direct)', camp = tok(b.camp), dev = tok(b.dev, 10), form = tok(b.form, 20);
  const country = tok(req.headers['x-vercel-ip-country'], 3);

  const f = [`ev:${e}`];
  if (e === 'page_view') f.push(`pv:${path}`);
  if (e === 'session_start') {
    f.push(`src:${src}`, `dev:${dev || '?'}`);
    if (camp && camp !== '(not set)') f.push(`camp:${camp}`);
    if (country) f.push(`co:${country}`);
    f.push(`land:${path}`);
  }
  if (e === 'scroll_depth') f.push(`ev:scroll_depth:${Number(b.pct) || 0}`);
  if (e === 'generate_lead') f.push(`lead:${form || '?'}`, `leadsrc:${form || '?'}:${src}`);
  if (['booking_intent', 'whatsapp_click', 'phone_click', 'gift_card_intent'].includes(e)) f.push(`${e}@${path}`);
  await bump(f);
  return res.status(204).end();
}
