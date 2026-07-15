/**
 * Meta Conversions API — server-side helpers for /api/capi.
 * ---------------------------------------------------------------------------
 * Builds and sends Meta CAPI events that MIRROR the browser Pixel, deduplicated
 * on `event_id`. Server-side only; the access token never leaves the server.
 *
 * HARD RULES (enforced here, defense-in-depth):
 *   • Only the five approved events + PageView are accepted. No Purchase.
 *   • No value / currency ever.
 *   • custom_data is whitelisted to non-sensitive keys — NO health, treatment,
 *     consultation, diagnosis, insurance, or PII of any kind.
 *   • No Advanced Matching: user_data carries only fbp/fbc (+ ip/ua added by
 *     the handler). No email/phone/name hashing.
 */

const GRAPH_VERSION = 'v21.0';

// Approved Meta events (must match the browser Pixel mapping exactly for dedup)
export const ALLOWED_META_EVENTS = new Set([
  'PageView', 'ViewContent', 'InitiateCheckout', 'Contact', 'Lead',
]);

// The ONLY custom_data keys allowed out. Everything else is dropped.
const ALLOWED_CUSTOM_KEYS = new Set([
  'content_type', 'content_category', 'contact_method', 'content_name',
]);

// Keys that must NEVER be forwarded, even if a client tries to inject them.
const FORBIDDEN_KEYS = new Set([
  'value', 'currency', 'email', 'em', 'phone', 'ph', 'fn', 'ln',
  'first_name', 'last_name', 'name', 'address', 'condition', 'diagnosis',
  'treatment', 'consultation', 'health', 'insurance', 'scalp', 'skin',
]);

function cleanScalar(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  const s = String(v).replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 100);
  return s || undefined;
}

/** Whitelist custom_data: keep only approved keys, drop forbidden/unknown ones. */
export function sanitizeCustomData(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(input)) {
    const k = String(key).toLowerCase();
    if (FORBIDDEN_KEYS.has(k)) continue;
    if (!ALLOWED_CUSTOM_KEYS.has(k)) continue;
    const val = cleanScalar(input[key]);
    if (val !== undefined) out[k] = val;
  }
  return out;
}

/** Build one validated Meta CAPI event. Returns null if not permitted. */
export function buildEvent({ event_name, event_id, event_source_url, user_data, custom_data, ip, ua }) {
  if (!ALLOWED_META_EVENTS.has(event_name)) return null;   // no Purchase, no unknown events
  if (!event_id || typeof event_id !== 'string') return null;

  const ud = { client_ip_address: ip, client_user_agent: ua };
  if (user_data && typeof user_data === 'object') {
    if (user_data.fbp) ud.fbp = cleanScalar(user_data.fbp);
    if (user_data.fbc) ud.fbc = cleanScalar(user_data.fbc);
  }

  const ev = {
    event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: cleanScalar(event_id),
    action_source: 'website',
    user_data: ud,
    custom_data: sanitizeCustomData(custom_data),
  };
  const src = cleanScalar(event_source_url);
  if (src && /^https?:\/\//i.test(src)) ev.event_source_url = src;
  return ev;
}

/** POST events to the Graph API. Token stays server-side; never logged. */
export async function sendEvents({ pixelId, token, events, testCode }) {
  if (!pixelId || !token) throw new Error('CAPI not configured');
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`;
  const body = { data: events, access_token: token };
  if (testCode) body.test_event_code = testCode;

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, data };
}
