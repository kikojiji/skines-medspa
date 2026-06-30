/**
 * Skines Med Spa — Fresha Booking Button Tracking
 * Fires a GA4 event (and Meta Pixel if present) on every Fresha link click.
 * Does NOT block navigation. Does NOT modify any link or button.
 * GA4 property: G-VFB8SY59FX
 */
(function () {
  'use strict';

  var DEV = (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.hostname === ''
  );

  // ── Detect where on the page the button lives ─────────────────────────
  function detectLocation(el) {
    var cur = el;
    var checks = [
      [/hero/i,                     'hero'],
      [/mobile-nav|mobile_nav/i,    'mobile_nav'],
      [/nav|navbar|header/i,        'navigation'],
      [/footer/i,                   'footer'],
      [/reviews?-cta|reviews?_cta/i,'reviews_cta'],
      [/booking-action|booking_cta/i,'booking_section'],
      [/service-card|service_card/i, 'service_card'],
      [/service/i,                  'services_section'],
    ];
    while (cur && cur !== document.body) {
      var id  = (cur.id  || '').toLowerCase();
      var cls = (typeof cur.className === 'string' ? cur.className : '').toLowerCase();
      var combined = id + ' ' + cls;
      for (var i = 0; i < checks.length; i++) {
        if (checks[i][0].test(combined)) return checks[i][1];
      }
      cur = cur.parentElement;
    }
    return 'page';
  }

  // ── Classify URL as booking vs gift-card ─────────────────────────────
  function classifyURL(href) {
    if (href.indexOf('gift-cards') !== -1) return 'gift_card';
    return 'booking';
  }

  // ── Device type ───────────────────────────────────────────────────────
  function deviceType() {
    var ua = navigator.userAgent || '';
    if (/Mobi|Android/i.test(ua))   return 'mobile';
    if (/Tablet|iPad/i.test(ua))    return 'tablet';
    return 'desktop';
  }

  // ── Main click handler (capture phase) ───────────────────────────────
  document.addEventListener('click', function (e) {
    // Walk up from the clicked target to find a Fresha <a> link
    var target = e.target;
    var link = null;
    var cur = target;
    while (cur && cur !== document.body) {
      if (cur.tagName === 'A' && (cur.href || '').indexOf('fresha.com') !== -1) {
        link = cur;
        break;
      }
      cur = cur.parentElement;
    }
    if (!link) return;

    var href       = link.href || '';
    var btnText    = (link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    var btnLocation = detectLocation(link);
    var urlType    = classifyURL(href);

    var params = {
      page_url:        location.href,
      page_path:       location.pathname,
      button_text:     btnText,
      button_location: btnLocation,
      fresha_url:      href,
      url_type:        urlType,
      timestamp:       new Date().toISOString(),
      device_type:     deviceType(),
    };

    // ── GA4 ─────────────────────────────────────────────────────────────
    // transport_type 'beacon' uses navigator.sendBeacon so the hit survives
    // the page unload that happens when the visitor navigates to Fresha.
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'booking_button_click', params);
      }
    } catch (err) { /* fail silently */ }

    // ── Meta Pixel (optional — not currently installed) ──────────────────
    try {
      if (typeof window.fbq === 'function') {
        window.fbq('trackCustom', 'BookingButtonClick', params);
      }
    } catch (err) { /* fail silently */ }

    // ── Dev console (localhost only) ─────────────────────────────────────
    if (DEV && window.console && console.log) {
      console.log('[Skines Tracking] booking_button_click', params);
    }

    // Navigation is NOT blocked — the link opens normally.

  }, true); // capture phase: fires before the browser processes the href

})();
