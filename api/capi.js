// Vercel Serverless Function — Meta Conversions API (server-side)
// POST /api/capi
//
// Receives one approved event from the browser (same event_id the Pixel used)
// and forwards it to Meta CAPI, deduplicated on event_id. This is the SERVER
// side of the "two delivery channels" design: browser Pixel + server CAPI send
// the SAME approved events; Meta collapses them by event_id.
//
// Secrets (server env only — never in the repo, never sent to the client):
//   META_PIXEL_ID          public pixel id (also used by the browser Pixel)
//   META_CAPI_TOKEN        secret Conversions API access token
//   META_TEST_EVENT_CODE   optional — set ONLY while validating in Test Events
//
// Guarantees: no Purchase, no value/currency, no health/PII (enforced in
// _lib/meta-capi.js). Advertising consent is enforced client-side before this
// endpoint is ever called.

import { requireJson, setCorsHeaders, rateLimit, getClientIp } from './_lib/security.js';
import { buildEvent, sendEvents, ALLOWED_META_EVENTS } from './_lib/meta-capi.js';

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

  const ct = requireJson(req);
  if (!ct.ok) return res.status(ct.status).json({ error: ct.error });

  const ip = getClientIp(req);
  const rl = rateLimit(ip, { maxRequests: 60, windowMs: 60_000 }); // generous: many events/session
  if (!rl.ok) return res.status(rl.status).json({ error: rl.error });

  const body = req.body || {};
  const event_name = String(body.event_name || '');
  if (!ALLOWED_META_EVENTS.has(event_name)) {
    return res.status(400).json({ error: 'Unsupported event' });      // rejects Purchase/unknown
  }

  const ua = req.headers['user-agent'] || '';
  const event = buildEvent({
    event_name,
    event_id:         body.event_id,
    event_source_url: body.event_source_url,
    user_data:        body.user_data,      // { fbp, fbc } only
    custom_data:      body.custom_data,    // whitelisted server-side
    ip, ua,
  });
  if (!event) return res.status(400).json({ error: 'Invalid event' });

  const pixelId  = process.env.META_PIXEL_ID;
  const token    = process.env.META_CAPI_TOKEN;
  const testCode = process.env.META_TEST_EVENT_CODE || undefined;

  if (!pixelId || !token) {
    console.error('[capi] missing META_PIXEL_ID / META_CAPI_TOKEN env');
    return res.status(500).json({ error: 'CAPI not configured' });     // generic — no secret leak
  }

  try {
    const result = await sendEvents({ pixelId, token, events: [event], testCode });
    if (!result.ok) {
      // Log full Graph error server-side only; return a generic message.
      console.error('[capi] graph error:', result.status, JSON.stringify(result.data));
      return res.status(502).json({ error: 'Upstream rejected event' });
    }
    return res.status(200).json({
      success: true,
      event_name,
      events_received: result.data && result.data.events_received,
      fbtrace_id: result.data && result.data.fbtrace_id,
    });
  } catch (e) {
    console.error('[capi] send failed:', e.message);
    return res.status(500).json({ error: 'CAPI delivery failed' });
  }
}
