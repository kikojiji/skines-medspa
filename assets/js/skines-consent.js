/**
 * Skines Med Spa — Consent Manager (Quebec Law 25 / Google Consent Mode v2)
 * ---------------------------------------------------------------------------
 * Single source of truth for user consent. Loaded `defer` on every page.
 *
 * RESPONSIBILITIES
 *   1. Render a 3-category cookie banner (Necessary / Analytics / Advertising).
 *   2. Persist the choice in first-party localStorage ('sk_consent').
 *   3. Push Consent Mode v2 `update` signals to gtag.
 *   4. Load Microsoft Clarity ONLY after Analytics consent is granted.
 *   5. Broadcast a `sk:consent` DOM event so other modules
 *      (skines-tracker, Meta Pixel, TikTok) can react — advertising tags
 *      must NOT fire before Advertising consent is granted.
 *
 * CONTRACT WITH <head>
 *   The page <head> sets `gtag('consent','default', {... denied})` BEFORE
 *   `gtag('config', …)`. This file only ever sends `consent','update'`.
 *
 * PUBLIC API (window.skinesConsent)
 *   .get()                       -> { necessary:true, analytics:bool, ads:bool, ts }
 *   .set({analytics, ads})       -> persist + apply + close banner
 *   .open()                      -> re-open the banner (e.g. "Manage cookies" link)
 *   .onChange(fn)                -> subscribe; fn receives the consent object
 *   .STORAGE_KEY                 -> 'sk_consent'
 *
 * NO PII is ever stored or transmitted by this module.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'sk_consent';
  var VERSION = 1;                 // bump to force re-consent if categories change
  var CLARITY_ID = 'xabkor1h4j';

  // ── gtag safety shim (head defines the real one; guard just in case) ──────
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  // ── Language (site toggles FR/EN client-side; read current <html lang>) ───
  function lang() {
    var l = (document.documentElement.getAttribute('lang') || 'fr').toLowerCase();
    return l.indexOf('en') === 0 ? 'en' : 'fr';
  }

  var T = {
    fr: {
      title: 'Votre vie privée',
      body: 'Nous utilisons des témoins (cookies) pour mesurer l’audience et améliorer votre expérience. Vous pouvez accepter, refuser ou personnaliser. Les témoins essentiels sont toujours actifs.',
      accept: 'Tout accepter',
      reject: 'Refuser le non-essentiel',
      customize: 'Personnaliser',
      save: 'Enregistrer mes choix',
      necessary: 'Essentiels (toujours actifs)',
      necessaryDesc: 'Nécessaires au fonctionnement du site.',
      analytics: 'Analytique',
      analyticsDesc: 'Mesure d’audience (Google Analytics, Microsoft Clarity).',
      ads: 'Publicité',
      adsDesc: 'Mesure des campagnes publicitaires (Meta, TikTok).',
      policy: 'Politique de témoins'
    },
    en: {
      title: 'Your privacy',
      body: 'We use cookies to measure audience and improve your experience. You can accept, decline, or customize. Essential cookies are always on.',
      accept: 'Accept all',
      reject: 'Reject non-essential',
      customize: 'Customize',
      save: 'Save my choices',
      necessary: 'Essential (always on)',
      necessaryDesc: 'Required for the site to function.',
      analytics: 'Analytics',
      analyticsDesc: 'Audience measurement (Google Analytics, Microsoft Clarity).',
      ads: 'Advertising',
      adsDesc: 'Ad-campaign measurement (Meta, TikTok).',
      policy: 'Cookie policy'
    }
  };

  // ── Storage ───────────────────────────────────────────────────────────────
  function read() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || c.v !== VERSION) return null;   // stale schema -> re-ask
      return c;
    } catch (e) { return null; }
  }

  function write(c) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch (e) {}
  }

  // ── Apply consent: gtag update + Clarity gate + broadcast ─────────────────
  var subscribers = [];
  function apply(c) {
    gtag('consent', 'update', {
      analytics_storage:   c.analytics ? 'granted' : 'denied',
      ad_storage:          c.ads ? 'granted' : 'denied',
      ad_user_data:        c.ads ? 'granted' : 'denied',
      ad_personalization:  c.ads ? 'granted' : 'denied'
    });

    if (c.analytics) loadClarity();

    window.skinesConsentState = c;
    try {
      document.dispatchEvent(new CustomEvent('sk:consent', { detail: c }));
    } catch (e) {
      // Older Safari CustomEvent fallback
      var ev = document.createEvent('CustomEvent');
      ev.initCustomEvent('sk:consent', false, false, c);
      document.dispatchEvent(ev);
    }
    for (var i = 0; i < subscribers.length; i++) {
      try { subscribers[i](c); } catch (e) {}
    }
  }

  // ── Microsoft Clarity — loaded ONLY on analytics consent ──────────────────
  var clarityLoaded = false;
  function loadClarity() {
    if (clarityLoaded) return;
    clarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }

  // ── Banner UI ─────────────────────────────────────────────────────────────
  var el = null;   // banner root

  function injectStyle() {
    if (document.getElementById('sk-consent-style')) return;
    var s = document.createElement('style');
    s.id = 'sk-consent-style';
    s.textContent = [
      '.sk-consent{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;',
      'background:#F5EDE3;color:#3A1E14;font-family:"DM Sans",system-ui,sans-serif;',
      'box-shadow:0 -4px 14px rgba(58,30,20,.13);padding:8px 14px;}',
      '.sk-consent *{box-sizing:border-box;}',
      '.sk-consent__wrap{max-width:1100px;margin:0 auto;display:flex;gap:12px;',
      'align-items:center;flex-wrap:wrap;}',
      '.sk-consent__txt{flex:1 1 300px;min-width:240px;}',
      '.sk-consent__title{font-weight:600;font-size:.82rem;margin:0 0 1px;}',
      '.sk-consent__body{font-size:.7rem;line-height:1.35;margin:0;opacity:.85;}',
      '.sk-consent__body a{color:#3A1E14;text-decoration:underline;}',
      '.sk-consent__actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}',
      '.sk-consent__btn{cursor:pointer;border-radius:999px;padding:9px 16px;',
      'font-size:.82rem;font-weight:500;border:1.5px solid #3A1E14;background:#3A1E14;',
      'color:#F5EDE3;transition:opacity .2s;}',
      '.sk-consent__btn:hover{opacity:.85;}',
      '.sk-consent__btn--ghost{background:transparent;color:#3A1E14;}',
      '.sk-consent__btn--big{padding:14px 44px;font-size:1.06rem;font-weight:800;letter-spacing:.01em;}',
      '.sk-consent__btn--sm{padding:3px 9px;font-size:.6rem;font-weight:400;border-width:1px;opacity:.78;}',
      '.sk-consent__secondary{display:flex;flex-direction:column;gap:5px;}',
      '.sk-consent__secondary .sk-consent__btn{width:100%;text-align:center;}',
      '.sk-consent__panel{flex-basis:100%;margin-top:8px;display:none;gap:14px;flex-wrap:wrap;}',
      '.sk-consent__panel.is-open{display:flex;}',
      '.sk-consent__cat{flex:1 1 220px;min-width:200px;border:1px solid rgba(58,30,20,.25);',
      'border-radius:12px;padding:12px 14px;}',
      '.sk-consent__cat label{display:flex;align-items:center;gap:8px;font-weight:600;',
      'font-size:.9rem;cursor:pointer;}',
      '.sk-consent__cat p{margin:6px 0 0;font-size:.78rem;opacity:.85;line-height:1.4;}',
      '.sk-consent__cat input{width:16px;height:16px;accent-color:#3A1E14;}',
      '@media(max-width:640px){.sk-consent__actions{width:100%;}',
      '.sk-consent__btn{flex:1 1 auto;text-align:center;}}'
    ].join('');
    document.head.appendChild(s);
  }

  function build() {
    injectStyle();
    var t = T[lang()];
    var root = document.createElement('div');
    root.className = 'sk-consent';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', t.title);
    root.innerHTML =
      '<div class="sk-consent__wrap">' +
        '<div class="sk-consent__txt">' +
          '<p class="sk-consent__title">' + t.title + '</p>' +
          '<p class="sk-consent__body">' + t.body +
            ' <a href="/cookie-policy">' + t.policy + '</a></p>' +
        '</div>' +
        '<div class="sk-consent__actions">' +
          '<div class="sk-consent__secondary">' +
            '<button type="button" class="sk-consent__btn sk-consent__btn--ghost sk-consent__btn--sm" data-sk="reject">' + t.reject + '</button>' +
            '<button type="button" class="sk-consent__btn sk-consent__btn--ghost sk-consent__btn--sm" data-sk="customize">' + t.customize + '</button>' +
          '</div>' +
          '<button type="button" class="sk-consent__btn sk-consent__btn--big" data-sk="accept">' + t.accept + '</button>' +
        '</div>' +
        '<div class="sk-consent__panel" data-sk="panel">' +
          cat('analytics', t.analytics, t.analyticsDesc) +
          cat('ads', t.ads, t.adsDesc) +
          '<div class="sk-consent__cat">' +
            '<label><input type="checkbox" checked disabled> ' + t.necessary + '</label>' +
            '<p>' + t.necessaryDesc + '</p>' +
          '</div>' +
          '<div style="flex-basis:100%;text-align:right;">' +
            '<button type="button" class="sk-consent__btn" data-sk="save">' + t.save + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    root.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-sk');
      if (act === 'accept')    finish({ analytics: true,  ads: true });
      else if (act === 'reject') finish({ analytics: false, ads: false });
      else if (act === 'customize') {
        root.querySelector('[data-sk="panel"]').classList.toggle('is-open');
      } else if (act === 'save') {
        finish({
          analytics: !!root.querySelector('#sk-c-analytics').checked,
          ads:       !!root.querySelector('#sk-c-ads').checked
        });
      }
    });
    return root;
  }

  function cat(key, title, desc) {
    return '<div class="sk-consent__cat">' +
      '<label><input type="checkbox" id="sk-c-' + key + '"> ' + title + '</label>' +
      '<p>' + desc + '</p>' +
    '</div>';
  }

  function show() {
    if (el && el.isConnected) { el.style.display = ''; return; }
    el = build();                       // (re)build with current language
    document.body.appendChild(el);
  }
  function hide() { if (el) el.style.display = 'none'; }

  function finish(choice) {
    var c = {
      v: VERSION, necessary: true,
      analytics: !!choice.analytics, ads: !!choice.ads,
      ts: new Date().toISOString()
    };
    write(c);
    apply(c);
    hide();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.skinesConsent = {
    STORAGE_KEY: STORAGE_KEY,
    get: function () { return window.skinesConsentState || read(); },
    set: function (choice) { finish(choice || {}); },
    open: function () { show(); },
    onChange: function (fn) { if (typeof fn === 'function') subscribers.push(fn); }
  };

  // Reveal the banner only after the visitor scrolls past the hero video
  // (so it never covers the landing view). Fallback: if they don't scroll,
  // show it after 12s so consent can still be given. Consent stays denied
  // until then, so nothing non-essential fires in the meantime.
  function showDeferred() {
    var shown = false;
    function trigger() {
      if (shown) return; shown = true;
      window.removeEventListener('scroll', onScroll);
      show();
    }
    function onScroll() {
      if (window.pageYOffset > (window.innerHeight * 0.7)) trigger();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    setTimeout(trigger, 12000);
    onScroll(); // in case the page is already scrolled (reload mid-page)
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    var stored = read();
    if (stored) {
      apply(stored);          // silently re-apply, no banner
    } else {
      apply({ v: VERSION, necessary: true, analytics: false, ads: false, ts: null }); // stay denied
      showDeferred();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
