/**
 * Skines Head Spa — TikTok Pixel (browser) — ADS-CONSENT GATED
 * ---------------------------------------------------------------------------
 * Mirrors skines-meta-pixel.js: subscribes to the core layer's `sk:track` bus
 * and forwards events to the TikTok Pixel. Browser pixel only (no Events API).
 *
 * PRIVACY / CONSENT (Quebec Law 25)
 *   • events.js is NOT loaded and NO event fires until ADVERTISING consent is
 *     granted (window.skinesConsent). If consent is granted later in the
 *     session, the Pixel initializes then.
 *   • No advanced matching / identify. NO PII is sent — no email/phone/name,
 *     and never any health, treatment, scalp, diagnosis, or insurance data.
 *   • No value/currency. booking_intent/gift_card_intent are INTENT only.
 *
 * DEDUPLICATION
 *   Every event is sent with { event_id: <event_id> } — the same id the core
 *   layer generated — so a future Events API commit can dedupe browser vs
 *   server on event_id.
 *
 * EVENT MAP
 *   service_view      -> ViewContent
 *   booking_intent    -> InitiateCheckout
 *   gift_card_intent  -> InitiateCheckout
 *   phone_click       -> Contact
 *   email_click       -> Contact
 *   generate_lead     -> SubmitForm
 *   (page load)       -> page() (fired once, after consent)
 */
(function () {
  'use strict';

  // ─── TikTok Pixel ID (public value). Empty = module stays inert. ───
  var PIXEL_ID = 'DADNG2RC77UDHLL3H8P0';
  // ───────────────────────────────────────────────────────────────────────────

  var DEV = (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname === '');

  function adsConsented() {
    try { var c = window.skinesConsent && window.skinesConsent.get(); return !!(c && c.ads); }
    catch (e) { return false; }
  }
  function eventId() {
    try { return window.skinesAttribution ? window.skinesAttribution.newEventId() : ('e' + Date.now()); }
    catch (e) { return 'e' + Date.now(); }
  }

  // ─── Internal event -> TikTok standard event (NO value/currency) ───────────
  function mapEvent(name, p) {
    p = p || {};
    switch (name) {
      case 'service_view':
        return { ev: 'ViewContent',      data: { content_type: 'product', content_category: p.service_category } };
      case 'booking_intent':
        return { ev: 'InitiateCheckout', data: { content_type: 'product', content_category: p.service_category || 'booking' } };
      case 'gift_card_intent':
        return { ev: 'InitiateCheckout', data: { content_type: 'product', content_category: 'gift_card' } };
      case 'phone_click':
        return { ev: 'Contact',          data: { contact_method: 'phone' } };
      case 'email_click':
        return { ev: 'Contact',          data: { contact_method: 'email' } };
      case 'generate_lead':
        return { ev: 'SubmitForm',       data: { content_name: p.form_id } };
      default:
        return null;
    }
  }

  // ─── Pixel lifecycle ────────────────────────────────────────────────────────
  var ready = false;
  var pending = [];

  function loadPixel() {
    // Standard TikTok base code — only reached after advertising consent.
    !function (w, d, t) {
      w.TiktokAnalyticsObject = t;
      var ttq = w[t] = w[t] || [];
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
      ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
      ttq.load = function (e, n) {
        var r = "https://analytics.tiktok.com/i18n/pixel/events.js", o = n && n.partner;
        ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r;
        ttq._t = ttq._t || {}; ttq._t[e] = +new Date;
        ttq._o = ttq._o || {}; ttq._o[e] = n || {};
        n = document.createElement("script"); n.type = "text/javascript"; n.async = !0; n.src = r + "?sdkid=" + e + "&lib=" + t;
        e = document.getElementsByTagName("script")[0]; e.parentNode.insertBefore(n, e);
      };
    }(window, document, 'ttq');
  }

  function initPixel() {
    if (ready) return;
    if (!PIXEL_ID) { if (DEV) console.warn('[Skines TikTok] PIXEL_ID not set — TikTok Pixel inert.'); return; }
    if (!adsConsented()) return;
    loadPixel();
    window.ttq.load(PIXEL_ID);
    window.ttq.page();
    ready = true;
    while (pending.length) forward(pending.shift());
    if (DEV) console.log('[Skines TikTok] Pixel initialized', PIXEL_ID);
  }

  function forward(detail) {
    if (!adsConsented()) return;                 // re-check at fire time
    var m = mapEvent(detail.name, detail.params);
    if (!m) return;
    var data = {};
    for (var k in m.data) if (m.data.hasOwnProperty(k) && m.data[k] != null) data[k] = m.data[k];
    try {
      window.ttq.track(m.ev, data, { event_id: detail.params && detail.params.event_id });
      if (DEV) console.log('[Skines TikTok] ' + detail.name + ' -> ' + m.ev, data, detail.params && detail.params.event_id);
    } catch (e) {}
  }

  // ─── Bus subscription (attached at eval, before tracker's DOMContentLoaded) ─
  document.addEventListener('sk:track', function (e) {
    var detail = e.detail;
    if (!adsConsented()) return;                 // nothing to TikTok without ads consent
    if (!ready) { pending.push(detail); initPixel(); return; }
    forward(detail);
  });

  // Initialize now if already consented; otherwise wait for the consent change.
  initPixel();
  try {
    if (window.skinesConsent && window.skinesConsent.onChange) {
      window.skinesConsent.onChange(function () { initPixel(); });
    }
  } catch (e) {}
})();
