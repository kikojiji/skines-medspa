/**
 * Skines i18n — centralized translation engine
 * Supports: data-i18n, data-i18n-html, data-i18n-placeholder,
 *           data-i18n-aria, data-i18n-title
 * Backward-compatible with: data-fr / data-en
 */
(function (global) {
  'use strict';

  /* ── Inline translations (mirrors /locales/*.json) ── */
  var TRANSLATIONS = {
    fr: {
      nav: { headSpa: 'Head Spa', laser: 'Épilation Laser', facial: 'Facial', giftCards: 'Cartes Cadeaux', reviews: 'Avis Clients', contact: 'Contact & Adresse', parking: 'Stationnement', insurance: 'Reçus Assurance', yourVisit: 'Votre Visite' },
      common: { reserve: 'RÉSERVER', bookNow: 'RÉSERVER', learnMore: 'En savoir plus', seeAll: 'Voir tout', close: 'Fermer', call: 'Appeler', email: 'Courriel', address: 'Adresse', copy: "Copier l'adresse", copied: 'Copié ✓', exclusive: 'EXPÉRIENCE EXCLUSIVE', exclusiveSubtitle: "Jusqu'à 50% · Places limitées", hours: 'Tous les jours · À partir de 09h00', openMaps: 'Ouvrir dans Google Maps' },
      footer: { services: 'Services', yourVisit: 'Votre Visite', exclusive: 'Exclusif', headSpa: 'Head Spa', facials: 'Soins du Visage', laser: 'Épilation Laser', giftCards: 'Cartes Cadeaux', reviews: 'Avis Clients', visitUs: 'Nous Rendre Visite', parking: 'Stationnement Privé', insurance: "Reçus d'Assurance", giveaway: 'Tirage Exclusif', copyright: '© 2026 Skines Head Spa', privacy: 'Confidentialité', terms: 'Conditions', cookies: 'Témoins' },
      home: { heroTitle: "L'art de prendre soin.", heroSubtitle: 'Head Spa · Épilation Laser · Facial', heroTagline: 'Montréal, QC — Ouvert 7 jours', treatmentsTitle: 'Un sanctuaire pensé pour vous.', treatmentsTitleHtml: 'Un sanctuaire<br><em>pensé pour vous.</em>', treatmentsSubtitle: 'Une invitation à ralentir et à repartir pleinement soi-même.', belaTitle: 'Soins<br>Facial<br><em>Avancés</em>', reviewsHeading: 'Parce que chaque expérience<br>raconte une histoire.', ctaTitle: 'Réservez votre pause Skines.', giveawayEyebrow: 'Tirage Exclusif', giveawayTitle: 'Gagnez une<br><em>expérience Skines</em>', giveawaySubtitle: 'Places limitées — participez maintenant.', giveawayBtn: 'Participer au tirage →', giveawayDecline: 'Non merci', journeyTitle: 'Commencez votre voyage.', journeyTitleHtml: 'Commencez votre <em>voyage</em>.' },
      headSpa: { heroTitle: 'HEAD SPA', heroSubtitle: 'Un soin rituel complet pour le cuir chevelu, les cheveux et l\'esprit.', combineTitle: 'Combinez. Profitez pleinement.', familyTitle: 'Une expérience bien-être<br><em>en famille.</em>', reserveBtn: 'RÉSERVER MON SOIN', viewGrid: 'Grille', viewList: 'Liste', from: 'À partir de', bookService: 'Réserver ce soin' },
      facial: { heroTitle: 'FACIAL', heroSubtitle: 'Des soins adaptés à chaque type de peau.', chooseTitle: 'Choisissez votre expérience.', combineTitle: 'Combinez. Économisez.', philosophy: 'Un soin posé, pas pressé.', skinTitle: 'Ce que nous utilisons<br><em>sur votre peau.</em>', reserveBtn: 'RÉSERVER MON FACIAL' },
      laser: { heroTitle: 'ÉPILATION LASER', heroSubtitle: "Une technologie d'exception. Pensée pour toutes les peaux.", promoTitle: 'Corps Complet — Première Séance', promoTitleHtml: 'Corps Complet —<br><em>Première Séance</em>', techTitleHtml: "Une technologie d'exception.<br>Pensée pour toutes les peaux.", promoSubtitle: '50 % de réduction · Première séance', tabBundles: 'Paquets', tabZones: 'Zones', reserveBtn: 'RÉSERVER MA SÉANCE' },
      giftCards: { heroTitle: 'CARTES CADEAUX', heroSubtitle: 'Offrez une expérience inoubliable.', buyBtn: 'Acheter une carte cadeau', pageTitleHtml: 'Le Parfait Cadeau<br><em>de Bien-être.</em>' },
      visitUs: { heroTitle: 'Directions & Accessibilité', heroSubtitle: "Tout ce dont vous avez besoin pour arriver confortablement — en voiture, en métro ou à pied.", locationTitle: 'Notre Emplacement', metroJeanTalonTitle: 'En métro ?', metroJeanTalonDesc: 'À quelques minutes à pied de la station Jean-Talon.', metroCastelnauTitle: 'En métro ?', metroCastelnauDesc: 'À deux pas de Skines Head Spa & Wellness.', parkingTitle: 'En voiture ?', parkingDesc: 'Un espace gratuit réservé exclusivement pour vous.', helpTitle: 'Besoin d\'aide ?', helpDesc: "Appelez-nous à votre arrivée et nous vous guiderons avec plaisir.", openMaps: 'Ouvrir dans Google Maps', copyAddress: "Copier l'adresse", copied: 'Copié ✓', callUs: 'Appeler Skines' },
      reviews: { heroTitle: 'Parce que chaque expérience raconte une histoire.', vcTitle: 'Ce que disent<br>nos <em>clientes</em>.', seeFresha: 'Voir tous les avis sur Fresha', seeGoogle: 'Voir tous les avis sur Google' },
      parking: { heroTitle: 'Stationnement privé.', heroTitleHtml: 'Stationnement<br><em>privé.</em>', heroSubtitle: 'Un espace calme, gratuit, réservé exclusivement pour vous.', infoEyebrow: 'Ce que vous devez savoir', infoTitle: 'Simple, gratuit, sans stress.', infoTitleHtml: 'Simple, gratuit, <em>sans stress.</em>', landmarksTitleHtml: 'Bientôt : photos<br><em>de repérage.</em>', fact2Title: 'Disponible pendant votre soin', fact3Title: 'Première visite ?', helpTitle: 'On vous guide.', helpTitleHtml: 'On vous<br><em>guide.</em>' },
      insurance: { heroTitle: "Reçus d'assurance.", heroTitleHtml: "Reçus<br><em>d'assurance.</em>", heroSubtitle: "Certains de nos soins donnent droit à des reçus reconnus par de nombreux assureurs privés.", howTitle: 'Comment ça fonctionne', howSubtitle: 'Simple, en 3 étapes.', howSubtitleHtml: 'Simple, <em>en 3 étapes.</em>', step1Title: 'Vérifiez votre couverture', step2Title: 'Demandez votre reçu', step3Title: 'Soumettez à votre assureur', noteTitle: 'À noter avant votre rendez-vous', faqTitle: 'Tout ce que vous voulez savoir.', faqTitleHtml: 'Tout ce que vous<br><em>voulez savoir.</em>', ctaTitle: 'Ne laissez rien sur la table.', ctaTitleHtml: 'Ne laissez rien<br><em>sur la table.</em>', ctaBtn: 'RÉSERVER ET OBTENIR MON REÇU' },
      yourVisit: { heroTitle: 'Votre expérience.', heroTitleHtml: 'Votre<br><em>expérience.</em>', heroSubtitle: "De votre arrivée jusqu'à votre départ, chaque détail est pensé pour votre confort.", heroBtn: 'RÉSERVER UN SOIN', heroScroll: 'Explorer', timelineTitle: 'Ce qui vous attend.', timelineTitleHtml: 'Ce qui vous<br><em>attend.</em>', step1Title: 'À votre arrivée', step2Title: 'Préparation & confort', step3Title: 'Pendant le soin', step4Title: 'Après le soin', faqTitle: 'Tout ce que vous souhaitez savoir.', faqTitleHtml: 'Tout ce que vous<br>souhaitez savoir.' },
      giveaway: { heroTitle: 'Gagnez une expérience bien‑être', heroSubtitle: 'Places limitées — participez maintenant.', enterBtn: 'PARTICIPER AU TIRAGE →', declineBtn: 'Non merci', badge: 'Tirage EXCLUSIF', formTitle: 'Participer au Tirage', namePlaceholder: 'Votre prénom', emailPlaceholder: 'Votre courriel', phonePlaceholder: 'Votre téléphone (optionnel)', submitBtn: 'PARTICIPER MAINTENANT →', successTitle: 'Merci ! Vous participez.', errorMsg: 'Une erreur est survenue. Veuillez réessayer.' }
    },
    en: {
      nav: { headSpa: 'Head Spa', laser: 'Laser Hair Removal', facial: 'Facial', giftCards: 'Gift Cards', reviews: 'Client Reviews', contact: 'Contact & Address', parking: 'Private Parking', insurance: 'Insurance Receipts', yourVisit: 'Your Visit' },
      common: { reserve: 'BOOK NOW', bookNow: 'BOOK NOW', learnMore: 'Learn more', seeAll: 'See all', close: 'Close', call: 'Call', email: 'Email', address: 'Address', copy: 'Copy Address', copied: 'Copied ✓', exclusive: 'EXCLUSIVE EXPERIENCE', exclusiveSubtitle: 'Up to 50% off · Limited Spots', hours: 'Every day · From 9:00 AM', openMaps: 'Open in Google Maps' },
      footer: { services: 'Services', yourVisit: 'Your Visit', exclusive: 'Exclusive', headSpa: 'Head Spa', facials: 'Facials', laser: 'Laser Hair Removal', giftCards: 'Gift Cards', reviews: 'Client Reviews', visitUs: 'Visit Us', parking: 'Private Parking', insurance: 'Insurance Receipts', giveaway: 'Giveaway / Exclusive Draw', copyright: '© 2026 Skines Head Spa', privacy: 'Privacy', terms: 'Terms', cookies: 'Cookies' },
      home: { heroTitle: 'The Art of Care.', heroSubtitle: 'Head Spa · Laser Hair Removal · Facial', heroTagline: 'Montréal, QC — Open 7 days', treatmentsTitle: 'A Sanctuary Crafted for You.', treatmentsTitleHtml: 'A Sanctuary<br><em>Crafted for You.</em>', treatmentsSubtitle: 'An invitation to slow down and leave feeling like yourself again.', belaTitle: 'Advanced<br>Facial<br><em>Treatments</em>', reviewsHeading: 'Because every experience<br>tells a story.', ctaTitle: 'Book your Skines moment.', giveawayEyebrow: 'Exclusive Giveaway', giveawayTitle: 'Win a<br><em>Skines Experience</em>', giveawaySubtitle: 'Limited spots — enter now.', giveawayBtn: 'Enter the giveaway →', giveawayDecline: 'No thanks', journeyTitle: 'Start your journey.', journeyTitleHtml: 'Start your <em>journey</em>.' },
      headSpa: { heroTitle: 'HEAD SPA', heroSubtitle: 'A complete ritual treatment for the scalp, hair and mind.', combineTitle: 'Combine. Enjoy Fully.', familyTitle: 'A Full Family<br><em>Wellness Experience</em>', reserveBtn: 'BOOK MY TREATMENT', viewGrid: 'Grid', viewList: 'List', from: 'From', bookService: 'Book this service' },
      facial: { heroTitle: 'FACIAL', heroSubtitle: 'Treatments tailored to every skin type.', chooseTitle: 'Choose your experience.', combineTitle: 'Combine. Save.', philosophy: 'Unhurried. Intentional. Precise.', skinTitle: 'What we use<br><em>on your skin.</em>', reserveBtn: 'BOOK MY FACIAL' },
      laser: { heroTitle: 'LASER HAIR REMOVAL', heroSubtitle: 'Exceptional technology. Designed for all skin types.', promoTitle: 'Full Body — First Session', promoTitleHtml: 'Full Body —<br><em>First Session</em>', techTitleHtml: "Exceptional technology.<br>Designed for all skin types.", promoSubtitle: '50% off · First session', tabBundles: 'Bundles', tabZones: 'Areas', reserveBtn: 'BOOK MY SESSION' },
      giftCards: { heroTitle: 'GIFT CARDS', heroSubtitle: 'Give an unforgettable experience.', buyBtn: 'Buy a gift card', pageTitleHtml: 'The Perfect<br><em>Wellness Gift.</em>' },
      visitUs: { heroTitle: 'Directions & Accessibility', heroSubtitle: 'Everything you need to arrive in comfort — by car, metro, or on foot.', locationTitle: 'Our Location', metroJeanTalonTitle: 'Coming by Metro?', metroJeanTalonDesc: 'A short walk from Jean-Talon Station.', metroCastelnauTitle: 'Coming by Metro?', metroCastelnauDesc: 'Just a short walk from Skines Head Spa & Wellness.', parkingTitle: 'Driving to Skines?', parkingDesc: 'A complimentary space reserved exclusively for you.', helpTitle: 'Need Assistance?', helpDesc: "Call us when you arrive and we'll gladly guide you.", openMaps: 'Open in Google Maps', copyAddress: 'Copy Address', copied: 'Copied ✓', callUs: 'Call Skines' },
      reviews: { heroTitle: 'Because every experience tells a story.', vcTitle: 'What our clients<br><em>are saying.</em>', seeFresha: 'See all reviews on Fresha', seeGoogle: 'See all reviews on Google' },
      parking: { heroTitle: 'Private parking.', heroTitleHtml: 'Private<br><em>parking.</em>', heroSubtitle: 'A quiet, complimentary space reserved exclusively for you.', infoEyebrow: 'What you need to know', infoTitle: 'Simple, free, stress-free.', infoTitleHtml: 'Simple, free, <em>stress-free.</em>', landmarksTitleHtml: 'Coming soon:<br><em>landmark photos.</em>', fact2Title: 'Available during your treatment', fact3Title: 'First visit?', helpTitle: "We'll guide you.", helpTitleHtml: "We'll<br><em>guide you.</em>" },
      insurance: { heroTitle: 'Insurance receipts.', heroTitleHtml: 'Insurance<br><em>receipts.</em>', heroSubtitle: 'Some of our treatments are eligible for receipts recognized by many private insurers.', howTitle: 'How it works', howSubtitle: 'Simple, in 3 steps.', howSubtitleHtml: 'Simple, <em>in 3 steps.</em>', step1Title: 'Check your coverage', step2Title: 'Request your receipt', step3Title: 'Submit to your insurer', noteTitle: 'Important before your appointment', faqTitle: 'Everything you want to know.', faqTitleHtml: 'Everything<br><em>you want to know.</em>', ctaTitle: "Don't leave money on the table.", ctaTitleHtml: "Don't leave money<br><em>on the table.</em>", ctaBtn: 'BOOK AND GET MY RECEIPT' },
      yourVisit: { heroTitle: 'Your experience.', heroTitleHtml: 'Your<br><em>experience.</em>', heroSubtitle: 'From your arrival to your departure, every detail is designed for your comfort.', heroBtn: 'BOOK A TREATMENT', heroScroll: 'Explore', timelineTitle: 'What awaits you.', timelineTitleHtml: 'What<br><em>awaits you.</em>', step1Title: 'Upon arrival', step2Title: 'Preparation & comfort', step3Title: 'During your treatment', step4Title: 'After your treatment', faqTitle: 'Everything you want to know.', faqTitleHtml: 'Everything<br>you want to know.' },
      giveaway: { heroTitle: 'Win a wellness experience', heroSubtitle: 'Limited spots — enter now.', enterBtn: 'ENTER THE GIVEAWAY →', declineBtn: 'No thanks', badge: 'EXCLUSIVE Giveaway', formTitle: 'Enter the Giveaway', namePlaceholder: 'Your first name', emailPlaceholder: 'Your email', phonePlaceholder: 'Your phone (optional)', submitBtn: 'ENTER NOW →', successTitle: "Thank you! You're entered.", errorMsg: 'An error occurred. Please try again.' }
    }
  };

  /* ── Key resolver: 'footer.services' → value ── */
  function t(key, lang) {
    var parts = key.split('.');
    var obj = TRANSLATIONS[lang] || TRANSLATIONS['fr'];
    for (var i = 0; i < parts.length; i++) {
      if (obj == null) return key;
      obj = obj[parts[i]];
    }
    return (obj != null && obj !== '') ? String(obj) : key;
  }

  /* ── Apply translation to the DOM ── */
  function applyLang(lang) {
    if (lang !== 'fr' && lang !== 'en') lang = 'fr';

    /* 1. data-i18n → textContent */
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n'), lang);
      if (val) el.textContent = val;
    });

    /* 2. data-i18n-html → innerHTML */
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n-html'), lang);
      if (val) el.innerHTML = val;
    });

    /* 3. data-i18n-placeholder → placeholder */
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n-placeholder'), lang);
      if (val) el.placeholder = val;
    });

    /* 4. data-i18n-aria → aria-label */
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n-aria'), lang);
      if (val) el.setAttribute('aria-label', val);
    });

    /* 5. data-i18n-title → title attribute */
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var val = t(el.getAttribute('data-i18n-title'), lang);
      if (val) el.setAttribute('title', val);
    });

    /* 6. Backward compat: data-fr / data-en */
    document.querySelectorAll('[data-fr]').forEach(function (el) {
      var val = lang === 'fr' ? el.getAttribute('data-fr') : (el.getAttribute('data-en') || el.getAttribute('data-fr'));
      if (/<[a-z]/i.test(val)) { el.innerHTML = val; } else { el.textContent = val; }
    });

    /* 7. Active state on all lang buttons */
    document.querySelectorAll('.lang-btn, .mobile-lang-btn, .nav-lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    /* 8. html[lang] attribute */
    document.documentElement.setAttribute('lang', lang === 'fr' ? 'fr-CA' : 'en-CA');

    /* 9. Persist */
    try { sessionStorage.setItem('skines-lang', lang); } catch (e) {}

    /* 10. Dispatch event for other scripts that may need to react */
    document.dispatchEvent(new CustomEvent('langChange', { detail: { lang: lang } }));
  }

  /* ── Wire up click handlers ── */
  function initHandlers() {
    document.querySelectorAll('.lang-btn, .mobile-lang-btn, .nav-lang-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLang(btn.getAttribute('data-lang'));
      });
    });
  }

  /* ── Auto-load saved language ── */
  function init() {
    initHandlers();
    var saved = 'fr';
    try { saved = sessionStorage.getItem('skines-lang') || 'fr'; } catch (e) {}
    applyLang(saved);
  }

  /* ── Public API ── */
  global.SkinesI18n = { t: t, apply: applyLang, init: init };

  /* ── Auto-init on DOM ready ── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}(window));
