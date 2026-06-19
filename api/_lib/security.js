/**
 * Shared security utilities for all Skines email form handlers.
 * Import this into every /api/send-*.js file.
 */

// ── HTML escape ─────────────────────────────────────────────────────────────
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, ch => HTML_ESCAPES[ch]);
}

// ── Text sanitization ────────────────────────────────────────────────────────
export function sanitizeText(value, maxLength = 200) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
    .trim()
    .slice(0, maxLength);
}

// ── Phone validation ─────────────────────────────────────────────────────────
const PHONE_RE = /^[+\d][\d\s\-().]{5,19}$/;

export function validatePhone(value) {
  if (!value) return false;
  const digits = String(value).replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15 && PHONE_RE.test(String(value).trim());
}

// ── Email validation ─────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,253}\.[^\s@]{2,}$/;

export function validateEmail(value) {
  if (!value) return false;
  return EMAIL_RE.test(String(value).trim()) && String(value).length <= 254;
}

// ── Payload validator ────────────────────────────────────────────────────────
export function validateRequired(body, fields) {
  if (!body || typeof body !== 'object') {
    return { ok: false, status: 400, error: 'Corps de requête invalide.' };
  }
  for (const field of fields) {
    const v = body[field];
    if (!v || !String(v).trim()) {
      return { ok: false, status: 400, error: 'Champs obligatoires manquants.' };
    }
  }
  return { ok: true };
}

// ── Honeypot check ───────────────────────────────────────────────────────────
// Frontend forms include a hidden field named "website" left empty.
// Bots fill every field — if it's non-empty, silently accept but don't send.
export function isHoneypotTriggered(body) {
  const hp = body?.website ?? body?.hp ?? '';
  return String(hp).trim().length > 0;
}

// ── Content-Type guard ───────────────────────────────────────────────────────
export function requireJson(req) {
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/json')) {
    return { ok: false, status: 415, error: 'Content-Type must be application/json.' };
  }
  return { ok: true };
}

// ── CORS headers ─────────────────────────────────────────────────────────────
// Restrict to skines.info. Falls back to allow in local/preview environments.
const ALLOWED_ORIGINS = [
  'https://www.skines.info',
  'https://skines.info',
  'https://skines.ca',
  'https://www.skines.ca',
];

export function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) ||
    origin.endsWith('.vercel.app') || // Vercel preview deployments
    !origin; // server-to-server / curl
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? (origin || '*') : 'https://www.skines.ca');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
}

// ── In-memory rate limiter ───────────────────────────────────────────────────
// Per-instance (Vercel serverless). Provides meaningful bot protection on a
// single instance. For cross-instance rate limiting, add Upstash Redis.
const rateLimitStore = new Map();

export function rateLimit(ip, { maxRequests = 5, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const key = String(ip || 'unknown');

  // Purge stale entries to prevent memory leak on long-lived instances
  if (rateLimitStore.size > 500) {
    for (const [k, v] of rateLimitStore) {
      if (now - v.windowStart > windowMs) rateLimitStore.delete(k);
    }
  }

  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    rateLimitStore.set(key, { count: 1, windowStart: now });
    return { ok: true };
  }
  entry.count += 1;
  if (entry.count > maxRequests) {
    return { ok: false, status: 429, error: 'Trop de requêtes. Réessayez dans une minute.' };
  }
  return { ok: true };
}

// ── Extract client IP ────────────────────────────────────────────────────────
export function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

// ── Safe Resend caller ───────────────────────────────────────────────────────
// Reads API key from env var. Throws with a generic message (no key leakage).
export async function sendViaResend({ from, to, replyTo, subject, html, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not configured');

  const body = { from, to: Array.isArray(to) ? to : [to], subject, html };
  if (replyTo) body.reply_to = replyTo;
  if (attachments?.length) body.attachments = attachments;

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await r.json();
  if (!r.ok) {
    // Log the full Resend error server-side only, never expose to client
    console.error('[resend] error:', JSON.stringify(data));
    throw new Error('Resend delivery failed');
  }
  return data.id;
}
