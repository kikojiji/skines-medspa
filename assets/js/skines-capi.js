/**
 * Skines Med Spa — Meta CAPI dispatcher (client trigger) — ADS-CONSENT GATED
 * ---------------------------------------------------------------------------
 * The SECOND Meta delivery channel. Listens to the same `sk:track` bus as the
 * browser Pixel and POSTs the SAME approved event to our server (/api/capi),
 * which forwards it to Meta's Conversions API. Meta deduplicates browser vs
 * server on `event_id`.
 *
 * This file only triggers the server; ALL Meta API work + secrets live server-
 * side in /api/capi.js. It uses the Pixel's own mapping (window.__skinesMetaMap)
 * so the event_name + custom_data are byte-identical across both channels.
 *
 * PRIVACY / CONSENT
 *   • Sends nothing until ADVERTISING consent is granted.
 *   • user_data carries only fbp/fbc cookies (no Advanced Matching, no PII).
 *   • No value/currency. No health/treatment/consultation/sensitive data.
 *   • booking_intent/gift_card_intent -> InitiateCheckout (intent only).
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/capi';

  function adsConsented() {
    try { var c = window.skinesConsent && window.skinesConsent.get(); return !!(c && c.ads); }
    catch (e) { return false; }
  }

  function cookie(name) {
    var m = document.cookie.match('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : '';
  }

  // fbp/fbc identify the browser to Meta for match/dedup. Not PII.
  function userData() {
    var ud = {};
    var fbp = cookie('_fbp'); if (fbp) ud.fbp = fbp;
    var fbc = cookie('_fbc');
    if (!fbc) {
      try { fbc = (window.skinesAttribution && window.skinesAttribution.getClickIds().fbc) || ''; } catch (e) {}
    }
    if (fbc) ud.fbc = fbc;
    return ud;
  }

  function postRaw(event_name, event_id, custom_data) {
    if (!adsConsented() || !event_name || !event_id) return;
    var payload = {
      event_name:       event_name,
      event_id:         event_id,                 // SAME id the Pixel used → dedup
      event_source_url: location.href,
      user_data:        userData(),
      custom_data:      custom_data || {}
    };
    try {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,           // survive the unload when navigating to Fresha
        credentials: 'omit'
      }).catch(function () { /* never block UX */ });
    } catch (e) {}
  }

  function send(detail) {
    var mapFn = window.__skinesMetaMap;
    if (typeof mapFn !== 'function') return;      // Pixel module owns the map
    var m = mapFn(detail.name, detail.params);
    if (!m) return;                                // not an approved Meta event
    var custom = {};
    for (var k in m.data) if (m.data.hasOwnProperty(k) && m.data[k] != null) custom[k] = m.data[k];
    postRaw(m.ev, detail.params && detail.params.event_id, custom);
  }

  document.addEventListener('sk:track', function (e) { send(e.detail); });
  // Deduplicated server PageView (id broadcast by the Pixel module)
  document.addEventListener('sk:meta-pageview', function (e) {
    postRaw('PageView', e.detail && e.detail.event_id, {});
  });
})();
