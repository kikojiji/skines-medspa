/**
 * TikTok Events API — server-side helpers for /api/tiktok-events.
 * ---------------------------------------------------------------------------
 * Builds and sends TikTok Events API events that MIRROR the browser Pixel,
 * deduplicated on `event_id`. Server-side only; the access token never leaves
 * the server. Modeled 1:1 on _lib/meta-capi.js.
 *
 * HARD RULES (enforced here, defense-in-depth):
 *   • Only the approved events are accepted. No Purchase / PlaceAnOrder.
 *   • No value / currency ever.
 *   • properties are whitelisted to non-sensitive keys — NO health, treatment,
 *     consultation, diagnosis, insurance, or PII of any kind.
 *   • No email/phone/name. user carries only ip/ua + ttp/ttclid cookies.
 */

const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

// Approved TikTok events (must match the browser Pixel mapping for dedup).
export const ALLOWED_TIKTOK_EVENTS = new Set([
  'Pageview', 'ViewContent', 'InitiateCheckout', 'Contact', 'SubmitForm',
]);

// The ONLY property keys allowed out. Everything else is dropped.
const ALLOWED_PROP_KEYS = new Set([
  'content_type', 'content_category', 'content_id', 'content_name', 'contact_method',
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

/** Whitelist properties: keep only approved keys, drop forbidden/unknown ones. */
export function sanitizeProps(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const key of Object.keys(input)) {
    const k = String(key).toLowerCase();
    if (FORBIDDEN_KEYS.has(k)) continue;
    if (!ALLOWED_PROP_KEYS.has(k)) continue;
    const val = cleanScalar(input[key]);
    if (val !== undefined) out[k] = val;
  }
  return out;
}

/** Build one validated TikTok Events API event. Returns null if not permitted. */
export function buildEvent({ event_name, event_id, event_source_url, user_data, custom_data, ip, ua }) {
  if (!ALLOWED_TIKTOK_EVENTS.has(event_name)) return null;   // no Purchase, no unknown events
  if (!event_id || typeof event_id !== 'string') return null;

  const user = {};
  if (ip) user.ip = ip;
  if (ua) user.user_agent = ua;
  if (user_data && typeof user_data === 'object') {
    if (user_data.ttp)    user.ttp    = cleanScalar(user_data.ttp);
    if (user_data.ttclid) user.ttclid = cleanScalar(user_data.ttclid);
  }

  const props = sanitizeProps(custom_data);
  // TikTok prefers a `contents` array carrying content_id/name.
  if (props.content_id) {
    props.contents = [{
      content_id: props.content_id,
      content_name: props.content_name,
      content_category: props.content_category,
    }];
  }

  const ev = {
    event: event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: cleanScalar(event_id),
    user,
    properties: props,
  };
  const src = cleanScalar(event_source_url);
  if (src && /^https?:\/\//i.test(src)) ev.page = { url: src };
  return ev;
}

/** POST events to the TikTok Events API. Token stays server-side; never logged. */
export async function sendEvents({ pixelId, token, events, testCode }) {
  if (!pixelId || !token) throw new Error('TikTok Events API not configured');
  const body = {
    event_source: 'web',
    event_source_id: pixelId,
    data: events,
  };
  if (testCode) body.test_event_code = testCode;

  const r = await fetch(TIKTOK_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Token': token },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  // TikTok returns HTTP 200 with a body { code: 0, message: 'OK', ... } on
  // success; a non-zero `code` means the API rejected the payload.
  const ok = r.ok && data && (data.code === 0 || data.code === undefined);
  return { ok, status: r.status, data };
}
