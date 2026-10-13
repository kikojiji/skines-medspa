// Whitelisted first-party attribution saved with a giveaway entry (no personal data).
const clean = (v, n = 120) => String(v ?? '').replace(/[\x00-\x1F\x7F<>]/g, '').trim().slice(0, n);

export function cleanAttribution(src) {
  const s = src && typeof src === 'object' ? src : {};
  const o = {};
  for (const k of ['source', 'medium', 'campaign', 'content', 'first_source', 'first_campaign', 'landing_page', 'device']) {
    const v = clean(s[k]);
    if (v) o[k] = v;
  }
  return Object.keys(o).length ? o : null;
}
