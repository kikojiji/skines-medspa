/**
 * Lead events (server -> Meta CAPI + TikTok Events API) with hashed Advanced Matching.
 * ---------------------------------------------------------------------------
 * Used ONLY by the two giveaway forms (/offre -> send-promo, /tirage -> send-tirage),
 * where the visitor knowingly gives their e-mail/phone to take part in a draw.
 * The generic /api/capi + /api/tiktok-events routes stay strictly PII-free.
 *
 * CONSENT: nothing is sent unless the browser reports `ads.consent === true`, and the
 * browser computes that from the visitor's REAL choice on the cookie banner
 * ("Tout accepter" / Publicité activée) — never from the temporary tracking bypass.
 *
 * Everything is SHA-256 hashed and normalised (Meta/TikTok spec). The event_id is
 * shared with the browser Pixel so the platforms deduplicate. Best-effort: never
 * throws, never delays the form for more than ~3.5 s.
 */
import crypto from 'node:crypto';
import { sendEvents as sendMeta } from './meta-capi.js';
import { sendEvents as sendTikTok } from './tiktok-events.js';

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const clean = (v, n = 120) => String(v ?? '').replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, n);

const normEmail = (e) => clean(e, 254).toLowerCase();
function normPhone(p) {
  const d = clean(p, 30).replace(/\D/g, '');
  if (d.length === 10) return '1' + d;          // Québec / Canada
  return d.length >= 8 ? d : '';
}
const normName = (n) => clean(n, 60).toLowerCase().replace(/[^\p{L}\p{N}\s'-]/gu, '').trim();

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

/**
 * @param {object} a { ip, ua, url, formId, ads, email, phone, firstName, lastName }
 *   ads = { consent, event_id, fbp, fbc, ttp, ttclid } (from the browser)
 */
export async function sendLeadToAds(a) {
  const ads = a.ads && typeof a.ads === 'object' ? a.ads : {};
  if (ads.consent !== true) return { skipped: 'no-consent' };
  const eventId = clean(ads.event_id, 80);
  if (!eventId) return { skipped: 'no-event-id' };

  const em = normEmail(a.email), ph = normPhone(a.phone);
  const fn = normName(a.firstName), ln = normName(a.lastName);
  const url = /^https?:\/\//i.test(a.url || '') ? a.url : undefined;
  const t = Math.floor(Date.now() / 1000);
  const out = {};
  const jobs = [];

  const pixelId = process.env.META_PIXEL_ID;
  const metaToken = process.env.META_CAPI_TOKEN;
  if (pixelId && metaToken) {
    const ud = { client_ip_address: a.ip, client_user_agent: a.ua, country: [sha('ca')] };
    if (em) ud.em = [sha(em)];
    if (ph) ud.ph = [sha(ph)];
    if (fn) ud.fn = [sha(fn)];
    if (ln) ud.ln = [sha(ln)];
    if (ads.fbp) ud.fbp = clean(ads.fbp, 100);
    if (ads.fbc) ud.fbc = clean(ads.fbc, 200);
    const ev = { event_name: 'Lead', event_time: t, event_id: eventId, action_source: 'website',
      user_data: ud, custom_data: { content_name: clean(a.formId, 40) } };
    if (url) ev.event_source_url = url;
    jobs.push(withTimeout(sendMeta({ pixelId, token: metaToken, events: [ev], testCode: process.env.META_TEST_EVENT_CODE || undefined }), 3500)
      .then(r => { out.meta = r.ok ? 'ok' : 'rejected:' + r.status; if (!r.ok) console.error('[lead-events] meta', r.status, JSON.stringify(r.data)); })
      .catch(e => { out.meta = 'error'; console.error('[lead-events] meta', e.message); }));
  }

  const ttToken = process.env.TIKTOK_ACCESS_TOKEN;
  const ttPixel = process.env.TIKTOK_PIXEL_ID || 'DAEC8GJC77UDHLL3IQ8G';
  if (ttToken) {
    const user = { ip: a.ip, user_agent: a.ua };
    if (em) user.email = sha(em);
    if (ph) user.phone = sha('+' + ph);
    if (ads.ttp) user.ttp = clean(ads.ttp, 100);
    if (ads.ttclid) user.ttclid = clean(ads.ttclid, 200);
    const ev = { event: 'SubmitForm', event_time: t, event_id: eventId, user,
      properties: { content_name: clean(a.formId, 40) } };
    if (url) ev.page = { url };
    jobs.push(withTimeout(sendTikTok({ pixelId: ttPixel, token: ttToken, events: [ev], testCode: process.env.TIKTOK_TEST_EVENT_CODE || undefined }), 3500)
      .then(r => { out.tiktok = r.ok ? 'ok' : 'rejected:' + r.status; if (!r.ok) console.error('[lead-events] tiktok', r.status, JSON.stringify(r.data)); })
      .catch(e => { out.tiktok = 'error'; console.error('[lead-events] tiktok', e.message); }));
  }

  await Promise.allSettled(jobs);
  return out;
}
