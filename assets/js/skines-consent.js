/**
 * Skines Head Spa — Consent Manager (Quebec Law 25 / Google Consent Mode v2)
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
      title: 'Vos données, votre choix',
      body: 'Nous utilisons des cookies pour améliorer votre expérience, mesurer l’audience et personnaliser nos offres.',
      accept: 'Tout accepter',
      reject: 'Tout refuser',
      customize: 'Gérer les cookies',
      save: 'Enregistrer mes choix',
      necessary: 'Essentiels',
      necessaryDesc: 'Nécessaires au fonctionnement du site. Toujours actifs.',
      analytics: 'Mesure d’audience',
      analyticsDesc: 'Comprendre l’utilisation du site (Google Analytics, Microsoft Clarity).',
      ads: 'Marketing',
      adsDesc: 'Publicités personnalisées (Meta, TikTok).',
      policy: 'En savoir plus'
    },
    en: {
      title: 'Your data, your choice',
      body: 'We use cookies to improve your experience, measure audience and personalize our offers.',
      accept: 'Accept all',
      reject: 'Reject all',
      customize: 'Manage cookies',
      save: 'Save my choices',
      necessary: 'Essential',
      necessaryDesc: 'Required for the site to function. Always on.',
      analytics: 'Audience measurement',
      analyticsDesc: 'Understand how the site is used (Google Analytics, Microsoft Clarity).',
      ads: 'Marketing',
      adsDesc: 'Personalized ads (Meta, TikTok).',
      policy: 'Learn more'
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
      'background:#fff;color:#2a1c15;font-family:"DM Sans",system-ui,sans-serif;',
      'box-shadow:0 -14px 50px rgba(0,0,0,.25);border-radius:20px 20px 0 0;padding:22px 22px 18px;}',
      '.sk-consent *{box-sizing:border-box;}',
      '.sk-consent__wrap{max-width:560px;margin:0 auto;}',
      '.sk-consent__title{text-align:center;font-family:"Cormorant Garamond",Georgia,serif;',
      'font-weight:600;font-size:1.5rem;color:#4b2e26;margin:0 0 8px;}',
      '.sk-consent__body{text-align:center;font-size:.86rem;line-height:1.55;color:#5a4a43;margin:0 0 14px;}',
      '.sk-consent__body a{color:#684034;font-weight:600;text-decoration:underline;}',
      '.sk-consent__btn{cursor:pointer;display:block;width:100%;border:none;border-radius:999px;',
      'padding:15px;background:#684034;color:#F5EDE3;font-weight:700;font-size:.95rem;font-family:inherit;transition:background .2s;}',
      '.sk-consent__btn:hover{background:#56342a;}',
      '.sk-consent__link{display:block;width:100%;text-align:center;background:none;border:none;',
      'color:#a99a92;font-weight:400;font-size:.66rem;text-decoration:underline;text-underline-offset:2px;',
      'cursor:pointer;margin-top:11px;font-family:inherit;}',
      '.sk-consent__main.is-hidden{display:none;}',
      '.sk-consent__panel{display:none;}',
      '.sk-consent__panel.is-open{display:block;}',
      '.sk-consent__phead{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;}',
      '.sk-consent__phead span{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;font-size:1.25rem;color:#4b2e26;}',
      '.sk-consent__back{background:none;border:none;color:#684034;font-weight:600;font-size:.82rem;cursor:pointer;font-family:inherit;}',
      '.sk-consent__cat{padding:13px 0;border-top:1px solid #eee;}',
      '.sk-consent__cat label{display:flex;align-items:center;gap:9px;font-weight:700;font-size:.9rem;color:#2a1c15;cursor:pointer;}',
      '.sk-consent__cat p{margin:3px 0 0 27px;font-size:.76rem;color:#7a6a62;line-height:1.45;}',
      '.sk-consent__cat input{width:18px;height:18px;accent-color:#684034;flex:0 0 auto;}'
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
    var backLabel = lang() === 'en' ? 'Back' : 'Retour';
    root.innerHTML =
      '<div class="sk-consent__wrap">' +
        '<div class="sk-consent__main" data-sk="main">' +
          '<p class="sk-consent__title">' + t.title + '</p>' +
          '<p class="sk-consent__body">' + t.body + ' <a href="/cookie-policy">' + t.policy + '</a></p>' +
          '<button type="button" class="sk-consent__btn" data-sk="accept">' + t.accept + '</button>' +
          '<button type="button" class="sk-consent__link" data-sk="customize">' + t.customize + '</button>' +
        '</div>' +
        '<div class="sk-consent__panel" data-sk="panel">' +
          '<div class="sk-consent__phead"><span>' + t.customize + '</span>' +
            '<button type="button" class="sk-consent__back" data-sk="back">‹ ' + backLabel + '</button></div>' +
          '<div class="sk-consent__cat"><label><input type="checkbox" checked disabled> ' + t.necessary + '</label><p>' + t.necessaryDesc + '</p></div>' +
          cat('analytics', t.analytics, t.analyticsDesc) +
          cat('ads', t.ads, t.adsDesc) +
          '<button type="button" class="sk-consent__btn" style="margin-top:16px;" data-sk="save">' + t.save + '</button>' +
          '<button type="button" class="sk-consent__link" data-sk="reject">' + t.reject + '</button>' +
        '</div>' +
      '</div>';

    root.addEventListener('click', function (e) {
      var act = e.target.getAttribute && e.target.getAttribute('data-sk');
      if (act === 'accept')      finish({ analytics: true,  ads: true });
      else if (act === 'reject') finish({ analytics: false, ads: false });
      else if (act === 'customize') {
        root.querySelector('[data-sk="main"]').classList.add('is-hidden');
        root.querySelector('[data-sk="panel"]').classList.add('is-open');
      } else if (act === 'back') {
        root.querySelector('[data-sk="panel"]').classList.remove('is-open');
        root.querySelector('[data-sk="main"]').classList.remove('is-hidden');
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
    try {
      gtag('event', 'cookie_consent', {
        choice: (c.analytics && c.ads) ? 'accept' : (!c.analytics && !c.ads) ? 'reject' : 'custom',
        analytics_consent: c.analytics,
        ads_consent: c.ads
      });
    } catch (e) {}
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
