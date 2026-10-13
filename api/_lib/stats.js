// First-party aggregate counters (Upstash hash per day). No personal data, no IDs, no cookies:
// only counts like "ev:booking_intent", "src:instagram", "pv:/facial". Read by /api/stats-admin.
const url = process.env.UPSTASH_REDIS_REST_URL;
const tok = process.env.UPSTASH_REDIS_REST_TOKEN;
export const statsEnabled = !!(url && tok);

const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' });   // YYYY-MM-DD (Montréal)
export const dayKey = (d = new Date()) => 'stats:' + fmt.format(d);

export async function pipeline(cmds) {
  const r = await fetch(url + '/pipeline', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  return r.json();
}

export async function bump(fields) {
  if (!statsEnabled) return;
  const list = fields.filter(Boolean).slice(0, 12);
  if (!list.length) return;
  const key = dayKey();
  const cmds = list.map(f => ['HINCRBY', key, String(f), 1]);
  cmds.push(['EXPIRE', key, 60 * 60 * 24 * 400]);
  try { await pipeline(cmds); } catch { /* jamais bloquant */ }
}

export async function readDays(n) {
  const days = [];
  const d = new Date();
  for (let i = 0; i < n; i++) { days.push(fmt.format(d)); d.setUTCDate(d.getUTCDate() - 1); }
  const res = await pipeline(days.map(x => ['HGETALL', 'stats:' + x]));
  return days.map((date, i) => {
    const flat = (res[i] && res[i].result) || [];
    const f = {};
    for (let j = 0; j < flat.length; j += 2) f[flat[j]] = Number(flat[j + 1]) || 0;
    return { date, f };
  }).reverse();
}
