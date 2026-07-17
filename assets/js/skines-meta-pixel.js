/**
 * Skines Head Spa — Meta Pixel (browser) — ADS-CONSENT GATED
 * ---------------------------------------------------------------------------
 * Subscribes to the core layer's `sk:track` bus and forwards events to the
 * Meta Pixel. This is BROWSER PIXEL ONLY — no Conversions API here.
 *
 * PRIVACY / CONSENT (Quebec Law 25)
 *   • fbevents.js is NOT loaded and NO event fires until ADVERTISING consent
 *     is granted (window.skinesConsent). If consent is granted later in the
 *     session, the Pixel initializes then.
 *   • No advanced matching. NO PII is sent — no email/phone/name, and never
 *     any health, treatment, scalp, diagnosis, or insurance data.
 *   • No value/currency. booking_intent/gift_card_intent are INTENT only.
 *
 * DEDUPLICATION
 *   Every event is sent with { eventID: <event_id> } — the same id the core
 *   layer generated — so a future Conversions API commit can dedupe browser
 *   vs server on event_id. (CAPI is intentionally NOT in this file.)
 *
 * EVENT MAP
 *   service_view      -> ViewContent   (content_category = service_category)
 *   booking_intent    -> InitiateCheckout
 *   gift_card_intent  -> InitiateCheckout (content_category = 'gift_card')
 *   phone_click       -> Contact        (contact_method = 'phone')
 *   email_click       -> Contact        (contact_method = 'email')
 *   generate_lead     -> Lead
 *   (page load)       -> PageView       (fired once, after consent)
 */
(function () {
  'use strict';

  // ─── Meta Pixel ID (public value). Empty = module stays inert. ───
  var PIXEL_ID = '1824751787932125';
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

  // ─── Internal event -> Meta standard event (NO value/currency) ─────────────
  function mapEvent(name, p) {
    p = p || {};
    switch (name) {
      case 'service_view':
        return { ev: 'ViewContent',      data: { content_type: 'service', content_category: p.service_category } };
      case 'booking_intent':
        return { ev: 'InitiateCheckout', data: { content_type: 'booking',  content_category: p.service_category || 'booking' } };
      case 'gift_card_intent':
        return { ev: 'InitiateCheckout', data: { content_type: 'gift_card', content_category: 'gift_card' } };
      case 'phone_click':
        return { ev: 'Contact',          data: { contact_method: 'phone' } };
      case 'email_click':
        return { ev: 'Contact',          data: { contact_method: 'email' } };
      case 'generate_lead':
        return { ev: 'Lead',             data: { content_name: p.form_id } };
      default:
        return null;
    }
  }
  // Expose the single mapping so the CAPI channel (skines-capi.js) sends the
  // IDENTICAL event_name + custom_data — the basis for browser/server dedup.
  window.__skinesMetaMap = mapEvent;

  // ─── Pixel lifecycle ────────────────────────────────────────────────────────
  var ready = false;
  var pending = [];

  function loadPixel() {
    // Standard Meta base code — only reached after advertising consent.
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  }

  function initPixel() {
    if (ready) return;
    if (!PIXEL_ID) { if (DEV) console.warn('[Skines Meta] PIXEL_ID not set — Meta Pixel inert.'); return; }
    if (!adsConsented()) return;
    loadPixel();
    window.fbq('init', PIXEL_ID);
    var pvId = eventId();
    window.fbq('track', 'PageView', {}, { eventID: pvId });
    // Broadcast the PageView id so the CAPI channel can send a deduplicated
    // server PageView with the SAME event_id. Async so the CAPI listener
    // (loaded after this module) is attached before we dispatch.
    setTimeout(function () {
      try { document.dispatchEvent(new CustomEvent('sk:meta-pageview', { detail: { event_id: pvId } })); }
      catch (e) {}
    }, 0);
    ready = true;
    while (pending.length) forward(pending.shift());
    if (DEV) console.log('[Skines Meta] Pixel initialized', PIXEL_ID);
  }

  function forward(detail) {
    if (!adsConsented()) return;                 // re-check at fire time
    var m = mapEvent(detail.name, detail.params);
    if (!m) return;
    var data = {};
    for (var k in m.data) if (m.data.hasOwnProperty(k) && m.data[k] != null) data[k] = m.data[k];
    try {
      window.fbq('track', m.ev, data, { eventID: detail.params && detail.params.event_id });
      if (DEV) console.log('[Skines Meta] ' + detail.name + ' -> ' + m.ev, data, detail.params && detail.params.event_id);
    } catch (e) {}
  }

  // ─── Bus subscription (attached at eval, before tracker's DOMContentLoaded) ─
  document.addEventListener('sk:track', function (e) {
    var detail = e.detail;
    if (!adsConsented()) return;                 // nothing to Meta without ads consent
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
