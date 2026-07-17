/**
 * Skines Head Spa — First-Party Attribution Engine
 * ---------------------------------------------------------------------------
 * Captures and persists marketing attribution on skines.ca itself, so the
 * business OWNS its acquisition data independently of any ad platform.
 * Loaded `defer` on every page, AFTER skines-consent.js.
 *
 * WHAT IT CAPTURES (all first-party, NO PII)
 *   • visitor_id   — anonymous, stable pseudonymous id
 *   • session      — id + sliding 30-min timeout
 *   • first_touch  — source/medium/campaign/content/term/landing/referrer/click_ids/ts
 *                    (written ONCE, never overwritten)
 *   • last_touch   — same shape, refreshed every qualifying visit
 *   • click_ids    — fbclid / ttclid / gclid  (+ derived fbc for future Meta use)
 *
 * STORAGE / CONSENT POLICY
 *   Capture happens in-memory immediately on load (so an ad landing is never
 *   lost). Durable localStorage writes happen ONLY once consent.analytics OR
 *   consent.ads is granted; before that, state is mirrored to sessionStorage
 *   (cleared when the tab closes). On consent grant, in-memory state is
 *   promoted to durable storage. Nothing is ever transmitted here — the
 *   consented tracker (next commit) owns transmission.
 *
 * PUBLIC API (window.skinesAttribution)
 *   .getVisitorId()   .getSession()   .getFirstTouch()   .getLastTouch()
 *   .getClickIds()    .newEventId()   .snapshot()        .ready(fn)
 *
 * snapshot() returns the flat object the tracker attaches to every event.
 */
(function () {
  'use strict';

  var K = {
    vid:   'sk_vid',
    first: 'sk_first',
    last:  'sk_last',
    sess:  'sk_session'
  };
  var SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  var CLICK_PARAMS = ['fbclid', 'ttclid', 'gclid', 'msclkid', 'li_fat_id'];
  var UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  // ── UUID (crypto when available) ──────────────────────────────────────────
  function uuid() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      if (window.crypto && crypto.getRandomValues) {
        var b = crypto.getRandomValues(new Uint8Array(16));
        b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
        var h = []; for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
        return h.slice(0,4).join('')+'-'+h.slice(4,6).join('')+'-'+h.slice(6,8).join('')+
               '-'+h.slice(8,10).join('')+'-'+h.slice(10,16).join('');
      }
    } catch (e) {}
    return 'x' + Date.now().toString(16) + Math.random().toString(16).slice(2, 10);
  }

  // ── Consent-aware storage tier ────────────────────────────────────────────
  function consentAllowsDurable() {
    try {
      var c = window.skinesConsent && window.skinesConsent.get();
      return !!(c && (c.analytics || c.ads));
    } catch (e) { return false; }
  }
  function put(key, val) {
    var s = JSON.stringify(val);
    try {
      if (consentAllowsDurable()) { localStorage.setItem(key, s); sessionStorage.removeItem(key); }
      else { sessionStorage.setItem(key, s); }
    } catch (e) {}
  }
  function get(key) {
    try {
      var raw = localStorage.getItem(key);
      if (raw == null) raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // ── URL params ────────────────────────────────────────────────────────────
  function params() {
    var out = {};
    try {
      var sp = new URLSearchParams(location.search);
      sp.forEach(function (v, k) { out[k.toLowerCase()] = v; });
    } catch (e) {}
    return out;
  }

  // ── Channel derivation (UTM > click-id > referrer > direct) ───────────────
  function referrerHost() {
    try {
      if (!document.referrer) return '';
      var h = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (h === location.hostname.replace(/^www\./, '')) return '';   // internal
      return h;
    } catch (e) { return ''; }
  }

  function deriveChannel(p) {
    var host = referrerHost();
    // 1) Explicit UTM wins
    if (p.utm_source || p.utm_medium) {
      return { source: p.utm_source || '(not set)', medium: p.utm_medium || '(not set)' };
    }
    // 2) Click IDs imply paid channel
    if (p.gclid || p.msclkid) return { source: p.gclid ? 'google' : 'bing', medium: 'cpc' };
    if (p.fbclid) return { source: 'facebook', medium: 'paid_social' };
    if (p.ttclid) return { source: 'tiktok', medium: 'paid_social' };
    // 3) Referrer classification
    if (host) {
      if (/(google|bing|yahoo|duckduckgo|ecosia)\./.test(host)) return { source: host, medium: 'organic' };
      if (/(instagram|facebook|tiktok|youtube|pinterest|linkedin|t\.co|twitter|x\.com)/.test(host))
        return { source: host, medium: 'social' };
      return { source: host, medium: 'referral' };
    }
    // 4) Nothing → direct
    return { source: '(direct)', medium: '(none)' };
  }

  function collectClickIds(p) {
    var ids = {};
    for (var i = 0; i < CLICK_PARAMS.length; i++) {
      if (p[CLICK_PARAMS[i]]) ids[CLICK_PARAMS[i]] = p[CLICK_PARAMS[i]];
    }
    // Derive Meta `fbc` from fbclid for later CAPI use (format: fb.1.<ts>.<fbclid>)
    if (ids.fbclid) ids.fbc = 'fb.1.' + Date.now() + '.' + ids.fbclid;
    return ids;
  }

  function buildTouch(p, channel) {
    var t = {
      source:   channel.source,
      medium:   channel.medium,
      campaign: p.utm_campaign || '(not set)',
      content:  p.utm_content  || '(not set)',
      term:     p.utm_term     || '(not set)',
      landing:  location.pathname + location.search,
      referrer: document.referrer || '(none)',
      click_ids: collectClickIds(p),
      ts: new Date().toISOString()
    };
    return t;
  }

  // ── Session (sliding 30 min) ──────────────────────────────────────────────
  function touchSession() {
    var now = Date.now();
    var s = get(K.sess);
    if (!s || !s.last || (now - s.last) > SESSION_TIMEOUT_MS) {
      s = { id: uuid(), start: now, last: now };
    } else {
      s.last = now;
    }
    put(K.sess, s);
    return s;
  }

  // ── State ─────────────────────────────────────────────────────────────────
  var state = { visitor_id: null, session: null, first: null, last: null };

  function boot() {
    var p = params();
    var channel = deriveChannel(p);

    // visitor id
    state.visitor_id = get(K.vid);
    if (!state.visitor_id) { state.visitor_id = uuid(); put(K.vid, state.visitor_id); }

    // session
    state.session = touchSession();

    // first touch — write once, never overwrite
    state.first = get(K.first);
    if (!state.first) { state.first = buildTouch(p, channel); put(K.first, state.first); }

    // last touch — refresh only when this visit carries attribution signal
    // (a UTM, a click id, or an external referrer). Internal navigation keeps prior last-touch.
    var hasSignal = !!(p.utm_source || p.utm_medium || referrerHost() ||
                       p.gclid || p.fbclid || p.ttclid || p.msclkid);
    state.last = get(K.last);
    if (!state.last || hasSignal) { state.last = buildTouch(p, channel); put(K.last, state.last); }

    readyFlag = true;
    flushReady();
  }

  // On consent change → promote in-memory state to durable storage.
  try {
    if (window.skinesConsent && window.skinesConsent.onChange) {
      window.skinesConsent.onChange(function () {
        if (consentAllowsDurable()) {
          put(K.vid, state.visitor_id);
          put(K.sess, state.session);
          put(K.first, state.first);
          put(K.last, state.last);
        }
      });
    }
  } catch (e) {}

  // ── ready() queue ─────────────────────────────────────────────────────────
  var readyFlag = false, readyQ = [];
  function flushReady() { while (readyQ.length) { try { readyQ.shift()(api); } catch (e) {} } }

  // ── Public API ────────────────────────────────────────────────────────────
  var api = {
    getVisitorId: function () { return state.visitor_id; },
    getSession:   function () { return state.session; },
    getFirstTouch:function () { return state.first; },
    getLastTouch: function () { return state.last; },
    getClickIds:  function () { return (state.last && state.last.click_ids) || {}; },
    newEventId:   uuid,
    ready: function (fn) { if (typeof fn === 'function') { if (readyFlag) fn(api); else readyQ.push(fn); } },
    snapshot: function () {
      var f = state.first || {}, l = state.last || {}, ci = api.getClickIds();
      return {
        visitor_id: state.visitor_id,
        session_id: state.session && state.session.id,
        // last-touch (current)
        source: l.source, medium: l.medium, campaign: l.campaign,
        content: l.content, term: l.term,
        landing_page: l.landing, referrer: l.referrer,
        // first-touch
        first_source: f.source, first_medium: f.medium, first_campaign: f.campaign,
        first_landing: f.landing, first_referrer: f.referrer, first_ts: f.ts,
        // click ids
        fbclid: ci.fbclid, ttclid: ci.ttclid, gclid: ci.gclid, fbc: ci.fbc
      };
    }
  };
  window.skinesAttribution = api;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
