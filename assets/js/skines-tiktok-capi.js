/**
 * Skines Head Spa — TikTok Events API dispatcher (client trigger) — ADS-CONSENT GATED
 * ---------------------------------------------------------------------------
 * The SECOND TikTok delivery channel. Listens to the same `sk:track` bus as
 * the browser Pixel and POSTs the SAME approved event to our server
 * (/api/tiktok-events), which forwards it to the TikTok Events API. TikTok
 * deduplicates browser vs server on `event_id`. Modeled on skines-capi.js.
 *
 * This file only triggers the server; ALL TikTok API work + secrets live
 * server-side in /api/tiktok-events.js. It uses the Pixel's own mapping
 * (window.__skinesTiktokMap) so the event + properties are identical across
 * both channels.
 *
 * PRIVACY / CONSENT
 *   • Sends nothing until ADVERTISING consent is granted.
 *   • user carries only ttp/ttclid cookies (no Advanced Matching, no PII).
 *   • No value/currency. No health/treatment/consultation/sensitive data.
 *   • Pageview is NOT sent server-side (no shared event_id to dedup on).
 */
(function () {
  'use strict';

  var ENDPOINT = '/api/tiktok-events';

  function adsConsented() {
    try { var c = window.skinesConsent && window.skinesConsent.get(); return !!(c && c.ads); }
    catch (e) { return false; }
  }

  function cookie(name) {
    var m = document.cookie.match('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : '';
  }

  function param(name) {
    try { return new URLSearchParams(location.search).get(name) || ''; } catch (e) { return ''; }
  }

  // ttp/ttclid identify the browser to TikTok for match/dedup. Not PII.
  function userData() {
    var ud = {};
    var ttp = cookie('_ttp'); if (ttp) ud.ttp = ttp;
    var ttclid = param('ttclid') || cookie('ttclid');
    if (ttclid) ud.ttclid = ttclid;
    return ud;
  }

  function postRaw(event_name, event_id, custom_data) {
    if (!adsConsented() || !event_name || !event_id) return;
    if (event_name === 'Pageview') return;         // no shared id to dedup → skip server PageView
    var payload = {
      event_name:       event_name,
      event_id:         event_id,                  // SAME id the Pixel used → dedup
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
    var mapFn = window.__skinesTiktokMap;
    if (typeof mapFn !== 'function') return;       // Pixel module owns the map
    var m = mapFn(detail.name, detail.params);
    if (!m) return;                                 // not an approved TikTok event
    var custom = {};
    for (var k in m.data) if (m.data.hasOwnProperty(k) && m.data[k] != null) custom[k] = m.data[k];
    postRaw(m.ev, detail.params && detail.params.event_id, custom);
  }

  document.addEventListener('sk:track', function (e) { send(e.detail); });
})();
