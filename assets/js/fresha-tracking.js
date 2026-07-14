/**
 * Skines Med Spa — Fresha Booking-Intent Detector
 * ---------------------------------------------------------------------------
 * Detects clicks on Fresha links and reports them through the core tracking
 * layer (window.skinesTrack) as an INTENT signal — never a completed booking.
 *
 *   booking_intent    — click toward a Fresha booking URL
 *   gift_card_intent  — click toward a Fresha gift-card URL
 *
 * Does NOT block navigation. Does NOT modify any link. No revenue/value is
 * attached. Attribution snapshot + event_id are added by the core layer.
 * (Previous versions fired "booking_button_click" directly and carried an
 * inert fbq hook; both are retired here — see docs.)
 */
(function () {
  'use strict';

  function classifyURL(href) {
    return href.indexOf('gift-cards') !== -1 ? 'gift_card' : 'booking';
  }

  // Fallback region detector if the core layer isn't available for any reason.
  function fallbackLocation(el) {
    var cur = el;
    while (cur && cur !== document.body) {
      var s = ((cur.id || '') + ' ' + (typeof cur.className === 'string' ? cur.className : '')).toLowerCase();
      if (/hero/.test(s)) return 'hero';
      if (/mobile[-_]?nav/.test(s)) return 'mobile_nav';
      if (/nav|navbar|header/.test(s)) return 'navigation';
      if (/footer/.test(s)) return 'footer';
      if (/service/.test(s)) return 'services_section';
      cur = cur.parentElement;
    }
    return 'page';
  }

  document.addEventListener('click', function (e) {
    // Walk up to a Fresha <a>
    var cur = e.target, link = null;
    while (cur && cur !== document.body) {
      if (cur.tagName === 'A' && (cur.href || '').indexOf('fresha.com') !== -1) { link = cur; break; }
      cur = cur.parentElement;
    }
    if (!link) return;

    var href    = link.href || '';
    var urlType = classifyURL(href);
    var name    = urlType === 'gift_card' ? 'gift_card_intent' : 'booking_intent';
    var locFn   = (window.skinesTrack && window.skinesTrack.locationOf) || fallbackLocation;

    var params = {
      button_text:     (link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 120),
      button_location: locFn(link),
      destination_url: href,
      url_type:        urlType
    };

    if (typeof window.skinesTrack === 'function') {
      window.skinesTrack(name, params);
    } else if (typeof window.gtag === 'function') {
      // Degraded fallback: core layer missing — still record intent in GA4.
      params.transport_type = 'beacon';
      window.gtag('event', name, params);
    }
    // Navigation is NOT blocked.
  }, true);
})();
