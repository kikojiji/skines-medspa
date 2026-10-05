/**
 * Skines Head Spa — Core Tracking Layer
 * ---------------------------------------------------------------------------
 * ONE internal entry point for every website event. Loaded `defer` on every
 * page, AFTER skines-consent.js and skines-attribution.js.
 *
 * WHY
 *   Before this, events were fired ad-hoc (gtag directly in fresha-tracking.js
 *   and lead-tracking.js). This layer unifies them: every event gets the
 *   attribution snapshot + a unique event_id + page context, and is routed
 *   through a single, consent-aware dispatcher.
 *
 * INTERNAL BUSINESS EVENTS (names are contractual — do not rename)
 *   service_view · booking_intent · gift_card_intent · phone_click ·
 *   email_click · generate_lead
 *   ("booking_intent" replaces the former "booking_button_click".)
 *
 * HONESTY RULE
 *   booking_intent / gift_card_intent are INTENT signals (a qualified click
 *   toward Fresha). They are NOT a completed booking and carry NO revenue /
 *   value / currency. CompletedBooking & Purchase remain unimplemented.
 *
 * CONSENT
 *   GA4 receives events always; Google Consent Mode v2 governs cookie/identifier
 *   storage. The pseudonymous visitor_id / session_id are attached ONLY when
 *   Analytics consent is granted. No ad-platform tags are fired here.
 *
 * EXTENSION POINT (future, decoupled)
 *   Every event also dispatches a `sk:track` DOM event carrying the full
 *   attribution snapshot, so a future Meta/TikTok module can subscribe and
 *   forward — each such sink MUST check Advertising consent itself.
 *
 * PUBLIC API
 *   window.skinesTrack(name, params, opts)   -> event_id
 *   window.skinesTrackLead(formKey)          -> generate_lead (once per key)
 */
(function () {
  'use strict';

  var DEV = (location.hostname === 'localhost' ||
             location.hostname === '127.0.0.1' ||
             location.hostname === '');

  // ── Context helpers ────────────────────────────────────────────────────────
  function device() {
    var ua = navigator.userAgent || '';
    if (/Mobi|Android/i.test(ua)) return 'mobile';
    if (/Tablet|iPad/i.test(ua))  return 'tablet';
    return 'desktop';
  }
  function lang() {
    var l = (document.documentElement.getAttribute('lang') || 'fr').toLowerCase();
    return l.indexOf('en') === 0 ? 'en' : 'fr';
  }
  function analyticsConsented() {
    try { var c = window.skinesConsent && window.skinesConsent.get(); return !!(c && c.analytics); }
    catch (e) { return false; }
  }
  function snapshot() {
    try { return window.skinesAttribution ? window.skinesAttribution.snapshot() : {}; }
    catch (e) { return {}; }
  }
  function newEventId() {
    try { return window.skinesAttribution ? window.skinesAttribution.newEventId() : ('e' + Date.now() + Math.random().toString(16).slice(2, 8)); }
    catch (e) { return 'e' + Date.now(); }
  }

  // Map a page path to a service category (used by service_view + booking_intent).
  function serviceCategory() {
    var p = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
    if (/^\/head-spa(-guide)?$/.test(p)) return 'head_spa';
    if (/^\/facial(-guide)?$/.test(p))   return 'facial';
    if (/^\/laser(-guide)?$/.test(p))    return 'laser';
    if (/^\/cartes-cadeaux$/.test(p))    return 'gift_card';
    return null;
  }

  // ── GA4 payload projection (curated — stays under GA4's 25-param limit) ────
  function ga4Payload(name, params) {
    var s = snapshot();
    var out = {
      event_id:      params.event_id,
      page_path:     location.pathname,
      language:      lang(),
      device_type:   device(),
      // last-touch attribution (non-identifying)
      source:        s.source,
      medium:        s.medium,
      campaign:      s.campaign,
      content:       s.content,
      first_source:  s.first_source,
      first_campaign:s.first_campaign,
      landing_page:  s.landing_page,
      // GA4 transport: survive the unload when navigating to Fresha (fixes M-08)
      transport_type: 'beacon'
    };
    // Pseudonymous identifiers only with Analytics consent
    if (analyticsConsented()) {
      out.visitor_id = s.visitor_id;
      out.session_id = s.session_id;
    }
    // Merge caller params (button_location, service_category, destination_url, …)
    for (var k in params) {
      if (params.hasOwnProperty(k) && k !== 'event_id') out[k] = params[k];
    }
    return out;
  }

  // ── Core dispatcher ────────────────────────────────────────────────────────
  var firedOnce = {};
  function track(name, params, opts) {
    params = params || {}; opts = opts || {};
    if (opts.dedupeKey) {
      if (firedOnce[opts.dedupeKey]) return null;
      firedOnce[opts.dedupeKey] = true;
    }
    if (!params.event_id) params.event_id = newEventId();

    var payload = ga4Payload(name, params);

    // GA4 (Consent Mode governs storage)
    try { if (typeof window.gtag === 'function') window.gtag('event', name, payload); }
    catch (e) {}

    // Decoupled extension point for future consented ad sinks
    try {
      var detail = { name: name, params: params, payload: payload, snapshot: snapshot() };
      document.dispatchEvent(new CustomEvent('sk:track', { detail: detail }));
    } catch (e) {}

    if (DEV && window.console) console.log('[Skines Track]', name, payload);
    return params.event_id;
  }
  window.skinesTrack = track;

  // ── generate_lead (replaces standalone lead-tracking.js behaviour) ─────────
  window.skinesTrackLead = function (formKey, eventId, extra) {
    formKey = formKey || 'default';
    var prm = { form_id: formKey, service_category: serviceCategory(), event_id: eventId };
    if (extra) for (var k in extra) prm[k] = extra[k];
    return track('generate_lead', prm,
      { dedupeKey: 'lead:' + formKey });
  };

  // ── Auto-instrumentation ───────────────────────────────────────────────────
  function autoInit() {
    // service_view — once per page load on service/guide pages
    var cat = serviceCategory();
    if (cat) track('service_view', { service_category: cat }, { dedupeKey: 'service_view' });

    // phone_click / email_click — delegated, capture phase (navigation not blocked)
    document.addEventListener('click', function (e) {
      var a = e.target;
      while (a && a !== document.body && a.tagName !== 'A') a = a.parentElement;
      if (!a || a.tagName !== 'A') return;
      var href = (a.getAttribute('href') || '');
      if (href.indexOf('tel:') === 0) {
        track('phone_click', { link_url: href, button_location: locationOf(a) });
      } else if (href.indexOf('mailto:') === 0) {
        track('email_click', { link_url: href, button_location: locationOf(a) });
      }
    }, true);
  }

  // Lightweight location detector shared with fresha-tracking (page region).
  function locationOf(el) {
    var cur = el, checks = [
      [/hero/i, 'hero'], [/mobile-nav|mobile_nav/i, 'mobile_nav'],
      [/nav|navbar|header/i, 'navigation'], [/footer/i, 'footer'],
      [/service/i, 'services_section']
    ];
    while (cur && cur !== document.body) {
      var s = ((cur.id || '') + ' ' + (typeof cur.className === 'string' ? cur.className : '')).toLowerCase();
      for (var i = 0; i < checks.length; i++) if (checks[i][0].test(s)) return checks[i][1];
      cur = cur.parentElement;
    }
    return 'page';
  }
  window.skinesTrack.locationOf = locationOf;   // reused by fresha-tracking.js

  // ── Deeper behaviour events (no personal data) ─────────────────────────────
  function deeperInit() {
    // whatsapp_click / social_click — delegated on links
    document.addEventListener('click', function (e) {
      var a = e.target;
      while (a && a !== document.body && a.tagName !== 'A') a = a.parentElement;
      if (!a || a.tagName !== 'A') return;
      var href = (a.getAttribute('href') || '').toLowerCase();
      if (/^(https?:)?\/\/(wa\.me|api\.whatsapp\.com)|^whatsapp:/.test(href)) {
        track('whatsapp_click', { link_url: href, button_location: locationOf(a) });
      } else {
        var m = href.match(/(instagram|tiktok|facebook|youtube)\.com/);
        if (m) track('social_click', { network: m[1], button_location: locationOf(a) });
      }
    }, true);

    // scroll_depth — 25 / 50 / 75 / 90 %, once each per page view
    var marks = [25, 50, 75, 90], ticking = false;
    function onScroll() {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var d = document.documentElement, max = (d.scrollHeight - window.innerHeight);
        if (max <= 0) return;
        var pct = Math.round((window.scrollY / max) * 100);
        for (var i = 0; i < marks.length; i++) {
          if (pct >= marks[i]) track('scroll_depth', { percent: marks[i] }, { dedupeKey: 'scroll:' + marks[i] });
        }
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // engaged_time — seconds with the tab visible: 30 s and 60 s
    var secs = 0;
    setInterval(function () {
      if (document.visibilityState !== 'visible') return;
      secs++;
      if (secs === 30) track('engaged_30s', { seconds: 30 }, { dedupeKey: 'eng30' });
      if (secs === 60) track('engaged_60s', { seconds: 60 }, { dedupeKey: 'eng60' });
    }, 1000);
  }

  function readCookie(n) {
    var m = document.cookie.match('(?:^|; )' + n.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + '=([^;]*)');
    return m ? decodeURIComponent(m[1]) : '';
  }
  function realAdsConsent() {
    try { var c = window.skinesConsent && window.skinesConsent.get(); return !!(c && c.ads); } catch (e) { return false; }
  }

  // Context a form sends with its submission (first-party; no personal data).
  window.skinesLeadContext = function () {
    var s = snapshot(), ids = {};
    try { ids = window.skinesAttribution.getClickIds() || {}; } catch (e) {}
    return {
      attribution: {
        source: s.source, medium: s.medium, campaign: s.campaign, content: s.content,
        first_source: s.first_source, first_campaign: s.first_campaign,
        landing_page: s.landing_page, device: device()
      },
      click_ids: { fbclid: !!ids.fbclid, ttclid: !!ids.ttclid, gclid: !!ids.gclid },
      // Server-side Lead (hashed e-mail/phone) — ONLY if the visitor really accepted advertising
      // on the cookie banner (reads the stored choice, NOT the temporary bypass).
      ads: {
        consent: realAdsConsent(),
        event_id: newEventId(),
        fbp: readCookie('_fbp'), fbc: readCookie('_fbc') || ids.fbc || '',
        ttp: readCookie('_ttp'), ttclid: ids.ttclid_value || readCookie('ttclid') || ''
      }
    };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', deeperInit); } else { deeperInit(); }
})();
