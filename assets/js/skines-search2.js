/* Skines — recherche du site (v2) : une seule version pour toutes les pages */
(function () {
  if (window.__skSearch2) return; window.__skSearch2 = 1;
  var BOOK = "https://www.fresha.com/book-now/glowch-bod1k4s2/all-offer?share=true&pId=1273288";
  var I = {
    spa: '<path d="M12 3c3 3.5 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5.500 5-9z"/>',
    face: '<circle cx="12" cy="12" r="8.500"/><path d="M8.500 13.500c1 1.600 2 2.300 3.500 2.300s2.500-.7 3.500-2.300M9 9.800h.01M15 9.800h.01"/>',
    laser: '<path d="M13 3L5.500 13.500H12L11 21l7.500-10.500H12z"/>',
    gift: '<rect x="4" y="10" width="16" height="10" rx="1.500"/><rect x="3" y="7" width="18" height="3.500" rx="1"/><path d="M12 7v13M12 7c-1.500-3.500-5-3-5-1.200S10.500 8 12 7zM12 7c1.500-3.500 5-3 5-1.200S13.500 8 12 7z"/>',
    pin: '<path d="M12 21s-6.500-5.500-6.500-11A6.500 6.500 0 0 1 18.500 10C18.500 15.500 12 21 12 21z"/><circle cx="12" cy="10" r="2.300"/>',
    car: '<path d="M5 16V11l1.800-4.500h10.400L19 11v5M5 16h14M5 16v2.500M19 16v2.500M8 13h.01M16 13h.01"/>',
    clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7.500V12l3 2"/>',
    doc: '<path d="M7 3.500h7.500L19 8v12.500H7z"/><path d="M14 3.500V8h5M10 13h6M10 16.500h6"/>',
    q: '<circle cx="12" cy="12" r="8.500"/><path d="M9.500 9.600A2.600 2.600 0 0 1 12 8a2.500 2.500 0 0 1 .8 4.900c-.6.300-.8.700-.8 1.300M12 16.500h.01"/>',
    star: '<path d="M12 3.500l2.600 5.400 5.900.8-4.300 4.100 1 5.800L12 16.800l-5.200 2.800 1-5.800L3.500 9.700l5.900-.8z"/>',
    book: '<rect x="4" y="5.500" width="16" height="14.500" rx="2.500"/><path d="M4 10.500h16M9 3.500v4M15 3.500v4M9.500 15.500l2 2 3.500-4"/>',
    phone: '<path d="M6 4h3l1.500 4-2 1.300a11 11 0 0 0 5.200 5.200L15.000 12.500l4 1.500v3a2 2 0 0 1-2 2A13 13 0 0 1 4 6a2 2 0 0 1 2-2z"/>',
    mail: '<rect x="3.500" y="6" width="17" height="12.500" rx="2"/><path d="M4 7.500l8 6 8-6"/>',
    team: '<circle cx="9" cy="9" r="3"/><path d="M3.500 19c.5-3 2.800-4.800 5.500-4.800s5 1.800 5.500 4.800M16 8.500a2.600 2.600 0 1 1 0 5.200M17 14.500c2 .4 3.200 1.800 3.500 4"/>',
    heart: '<path d="M12 20s-7.500-4.700-7.500-10.200A4.200 4.200 0 0 1 12 7.600a4.200 4.200 0 0 1 7.500 2.200C19.500 15.300 12 20 12 20z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3A4 4 0 0 0 11 18.700l1-1"/>'
  };
  var G = { s: ["Soins", "Treatments"], i: ["Infos pratiques", "Practical info"], p: ["Le salon", "The spa"], t: ["Témoignages", "Testimonials"], c: ["Contact", "Contact"] };
  /* g = groupe, i = icône, f/e = titre FR/EN, df/de = description FR/EN, k = mots-clés, u = lien */
  var DB = [
    { g: "s", i: "spa", m: 1, f: "Head Spa japonais", e: "Japanese Head Spa", df: "Rituel du cuir chevelu, solo, duo ou trio", de: "Scalp ritual, solo, duo or trio", k: "head spa scalp scalpcial cuir chevelu massage japonais solo duo trio signature focus rituel detente relaxation shampoing cheveux", u: "/head-spa" },
    { g: "s", i: "spa", f: "Le rituel Head Spa", e: "The Head Spa ritual", df: "Le déroulement d'un soin, étape par étape", de: "How a session unfolds, step by step", k: "rituel deroulement etapes seance head spa", u: "/head-spa-rituel" },
    { g: "s", i: "face", m: 1, f: "Soins du visage", e: "Facials", df: "Éclat, hydratation et soins avancés", de: "Glow, hydration and advanced care", k: "facial visage soin hydratation eclat peau bela md anti age nettoyage", u: "/facial" },
    { g: "s", i: "laser", m: 1, f: "Épilation laser", e: "Laser hair removal", df: "Technologie Clarity II, toutes zones", de: "Clarity II technology, all areas", k: "laser epilation poil poils clarity bikini maillot aisselles jambes dos visage homme femme definitive", u: "/laser" },
    { g: "s", i: "laser", f: "Épilation laser maillot", e: "Bikini laser hair removal", df: "Maillot et bikini à Montréal", de: "Bikini area in Montréal", k: "maillot bikini integral laser epilation", u: "/epilation-laser-maillot-montreal" },
    { g: "s", i: "gift", m: 1, f: "Cartes-cadeaux", e: "Gift cards", df: "Offrir une expérience Skines", de: "Give a Skines experience", k: "carte cadeau cadeaux gift offrir anniversaire noel fete", u: "/cartes-cadeaux" },
    { g: "i", i: "car", m: 1, f: "Stationnement privé", e: "Private parking", df: "Gratuit, juste derrière le bâtiment", de: "Free, right behind the building", k: "stationnement parking gratuit voiture garer stationner auto", u: "/parking" },
    { g: "i", i: "pin", m: 1, f: "Nous trouver", e: "Find us", df: "19 av. Shamrock, Petite-Italie", de: "19 Shamrock Ave, Little Italy", k: "adresse localisation ou trouver shamrock petite italie jean talon metro itineraire acces plan", u: "/visit-us" },
    { g: "i", i: "clock", m: 1, f: "Horaires", e: "Opening hours", df: "7 jours sur 7 · 9 h – 22 h 30", de: "7 days a week · 9 am – 10:30 pm", k: "horaires heures ouverture ouvert fermer fermeture jours heure", u: "/visit-us" },
    { g: "i", i: "book", f: "Préparer votre visite", e: "Prepare your visit", df: "Avant, pendant et après votre soin", de: "Before, during and after your session", k: "visite preparer arrivee quoi apporter retard premiere fois", u: "/your-visit" },
    { g: "i", i: "q", f: "Questions fréquentes", e: "FAQ", df: "Les réponses aux questions courantes", de: "Answers to common questions", k: "faq questions frequentes aide reponses probleme", u: "/faq" },
    { g: "i", i: "doc", m: 1, f: "Formulaires", e: "Forms", df: "Santé, Head Spa et soins du visage", de: "Health, Head Spa and facial forms", k: "formulaire formulaires sante consentement remplir avant questionnaire", u: "/formulaires" },
    { g: "i", i: "doc", f: "Reçus d'assurance", e: "Insurance receipts", df: "Reçus pour remboursement", de: "Receipts for reimbursement", k: "assurance recu recus remboursement couverture", u: "/insurance" },
    { g: "i", i: "book", m: 1, f: "Guides", e: "Guides", df: "Conseils Head Spa, visage et laser", de: "Head Spa, facial and laser advice", k: "guide guides conseils articles blog apprendre", u: "/guides" },
    { g: "p", i: "star", m: 1, f: "Avis clients", e: "Client reviews", df: "4,8 sur Fresha · 4,7 sur Google · 1 750+ avis", de: "4.8 on Fresha · 4.7 on Google · 1,750+ reviews", k: "avis reviews notes etoiles clients temoignage temoignages video fresha google", u: "/reviews" },
    { g: "p", i: "heart", f: "Notre histoire", e: "Our story", df: "De la rue Fleury à la Petite-Italie", de: "From Fleury Street to Little Italy", k: "histoire equipe fondatrice qui sommes nous a propos about story", u: "/notre-histoire" },
    { g: "p", i: "team", m: 1, f: "Nous recrutons", e: "Jobs", df: "Rejoindre l'équipe Skines", de: "Join the Skines team", k: "emploi emplois job jobs carriere carrieres recrutement recrute travailler travail embauche postuler candidature cv", u: "/carrieres" },
    { g: "p", i: "gift", f: "Tirage du mois", e: "Monthly draw", df: "Participez et tentez de gagner", de: "Enter for a chance to win", k: "tirage concours gagner giveaway", u: "/tirage" },
    { g: "s", i: "spa", f: "Head Spa Solo", e: "Head Spa Solo", df: "Pour une personne · 60 ou 90 min", de: "For one person · 60 or 90 min", k: "solo seul seule une personne individuel 60 90 minutes head spa", u: "/head-spa#menu-head-spa" },
    { g: "s", i: "spa", f: "Head Spa Duo", e: "Head Spa Duo", df: "Pour deux personnes · en couple ou entre amis", de: "For two people · as a couple or with a friend", k: "duo deux personnes couple ami amie ensemble head spa", u: "/head-spa#menu-head-spa" },
    { g: "s", i: "spa", f: "Head Spa Trio", e: "Head Spa Trio", df: "Pour trois personnes · entre amis ou en famille", de: "For three people · friends or family", k: "trio trois personnes groupe famille amis head spa", u: "/head-spa#menu-head-spa" },
    { g: "s", i: "spa", f: "Head Spa Focus · 60 min", e: "Head Spa Focus · 60 min", df: "Le soin ciblé du cuir chevelu", de: "The focused scalp session", k: "focus 60 minutes scalpcial soin cible head spa", u: "/head-spa#menu-head-spa" },
    { g: "s", i: "spa", f: "Head Spa Signature · 90 min", e: "Head Spa Signature · 90 min", df: "Le rituel complet", de: "The full ritual", k: "signature 90 minutes rituel complet scalpcial head spa", u: "/head-spa#menu-head-spa" },
    { g: "i", i: "doc", f: "Formulaire de santé", e: "Health form", df: "À remplir avant votre première visite", de: "To complete before your first visit", k: "formulaire sante fiche medical allergie questionnaire consentement", u: "/formulaire-sante" },
    { g: "i", i: "doc", f: "Fiche de consultation Head Spa", e: "Head Spa consultation form", df: "Vos préférences avant le soin", de: "Your preferences before the session", k: "formulaire fiche consultation head spa preferences cuir chevelu", u: "/formulaire-headspa" },
    { g: "i", i: "doc", f: "Fiche de consultation Facial", e: "Facial consultation form", df: "Votre peau et vos objectifs", de: "Your skin and your goals", k: "formulaire fiche consultation facial visage peau", u: "/formulaire-facial" },
    { g: "i", i: "book", f: "Guide Head Spa", e: "Head Spa guide", df: "Qu'est-ce qu'un Head Spa japonais ?", de: "What is a Japanese Head Spa?", k: "guide head spa japonais qu est ce que comprendre", u: "/head-spa-guide" },
    { g: "i", i: "book", f: "Guide soins du visage", e: "Facial guide", df: "Facial, hydrodermabrasion, peeling", de: "Facial, hydrodermabrasion, peeling", k: "guide facial visage hydradermabrasion peeling soin", u: "/facial-guide" },
    { g: "i", i: "book", f: "Guide épilation laser", e: "Laser hair removal guide", df: "Zones, fonctionnement et questions", de: "Areas, how it works and questions", k: "guide laser epilation zones clarity questions", u: "/laser-guide" },
    { g: "s", i: "laser", f: "Laser · Visage", e: "Laser · Face", df: "Lèvre, menton, favoris, visage complet", de: "Lip, chin, sideburns, full face", k: "laser visage levre superieure menton favoris barbe", u: "/laser" },
    { g: "s", i: "laser", f: "Laser · Aisselles", e: "Laser · Underarms", df: "Zone rapide, résultats durables", de: "Quick area, lasting results", k: "laser aisselles aisselle underarms", u: "/laser" },
    { g: "s", i: "laser", f: "Laser · Maillot et bikini", e: "Laser · Bikini", df: "Ligne bikini et maillot intégral", de: "Bikini line and full bikini", k: "laser maillot bikini integral ligne", u: "/laser" },
    { g: "s", i: "laser", f: "Laser · Jambes", e: "Laser · Legs", df: "Demi-jambes ou jambes complètes", de: "Half or full legs", k: "laser jambes demi complete", u: "/laser" },
    { g: "s", i: "laser", f: "Laser · Bras, dos et corps", e: "Laser · Arms, back and body", df: "Bras, dos, poitrine, corps complet", de: "Arms, back, chest, full body", k: "laser bras dos poitrine ventre epaules fesses corps complet", u: "/laser" },
    { g: "p", i: "gift", f: "Concours Head Spa Trio · Élé Lagacé", e: "Head Spa Trio giveaway · Élé Lagacé", df: "En collaboration avec Skines", de: "In collaboration with Skines", k: "concours ele lagace collaboration trio gagner", u: "/collaboration-ele-lagace" },
    { g: "t", i: "star", f: "Témoignage · Alex Marsolais", e: "Testimonial · Alex Marsolais", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience alex marsolais head spa", u: "/temoignage-alex-marsolais" },
    { g: "t", i: "star", f: "Témoignage · Angela", e: "Testimonial · Angela", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience angela head spa", u: "/temoignage-angela" },
    { g: "t", i: "star", f: "Témoignage · Anna", e: "Testimonial · Anna", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience anna head spa", u: "/temoignage-anna" },
    { g: "t", i: "star", f: "Témoignage · Cécé", e: "Testimonial · Cécé", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience cécé head spa", u: "/temoignage-celia-in-montreal" },
    { g: "t", i: "star", f: "Témoignage · Cyrine", e: "Testimonial · Cyrine", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience cyrine head spa", u: "/temoignage-cyrine" },
    { g: "t", i: "star", f: "Témoignage · Danika", e: "Testimonial · Danika", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience danika head spa", u: "/temoignage-danika" },
    { g: "t", i: "star", f: "Témoignage · Fanny", e: "Testimonial · Fanny", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience fanny head spa", u: "/temoignage-fanny" },
    { g: "t", i: "star", f: "Témoignage · Farah", e: "Testimonial · Farah", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience farah head spa", u: "/temoignage-farah" },
    { g: "t", i: "star", f: "Témoignage · Farzy Fine Dines", e: "Testimonial · Farzy Fine Dines", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience farzy fine dines head spa", u: "/temoignage-farzy" },
    { g: "t", i: "star", f: "Témoignage · Theo · Girl in Montreal", e: "Testimonial · Theo · Girl in Montreal", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience theo · girl in montreal head spa", u: "/temoignage-girl-in-mtl" },
    { g: "t", i: "star", f: "Témoignage · Javeria", e: "Testimonial · Javeria", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience javeria head spa", u: "/temoignage-javeria" },
    { g: "t", i: "star", f: "Témoignage · Jules", e: "Testimonial · Jules", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience jules head spa", u: "/temoignage-jules" },
    { g: "t", i: "star", f: "Témoignage · Justine Ledoux", e: "Testimonial · Justine Ledoux", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience justine ledoux head spa", u: "/temoignage-justine-ledoux" },
    { g: "t", i: "star", f: "Témoignage · Margot", e: "Testimonial · Margot", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience margot head spa", u: "/temoignage-margot" },
    { g: "t", i: "star", f: "Témoignage · Montréal Bites", e: "Testimonial · Montréal Bites", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience montréal bites head spa", u: "/temoignage-montreal-bites" },
    { g: "t", i: "star", f: "Témoignage · Oumayma", e: "Testimonial · Oumayma", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience oumayma head spa", u: "/temoignage-oumymn" },
    { g: "t", i: "star", f: "Témoignage · Ruslana", e: "Testimonial · Ruslana", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience ruslana head spa", u: "/temoignage-ruslana" },
    { g: "t", i: "star", f: "Témoignage · Ruzie", e: "Testimonial · Ruzie", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience ruzie head spa", u: "/temoignage-ruzie" },
    { g: "t", i: "star", f: "Témoignage · Yasmine", e: "Testimonial · Yasmine", df: "Son expérience Head Spa chez Skines", de: "Their Head Spa experience at Skines", k: "temoignage temoignages video avis experience yasmine head spa", u: "/temoignage-yasmine" },
    { g: "c", i: "book", f: "Réserver en ligne", e: "Book online", df: "Disponibilités en temps réel", de: "Real-time availability", k: "reserver reservation rendez vous rdv booking book fresha disponibilite", u: BOOK, x: 1 },
    { g: "c", i: "phone", f: "Appeler · +1 (438) 260-5660", e: "Call · +1 (438) 260-5660", df: "Parler à l'équipe", de: "Speak to the team", k: "telephone appeler appel numero contact joindre", u: "tel:+14382605660" },
    { g: "c", i: "mail", f: "Écrire · info@skines.ca", e: "Email · info@skines.ca", df: "Nous répondons rapidement", de: "We reply quickly", k: "courriel email mail ecrire contact message", u: "mailto:info@skines.ca" },
    { g: "c", i: "pin", f: "Itinéraire Google Maps", e: "Directions on Google Maps", df: "19 av. Shamrock, Montréal", de: "19 Shamrock Ave, Montréal", k: "maps google itineraire direction gps route", u: "https://www.google.com/maps/search/?api=1&query=19+Av+Shamrock+Montr%C3%A9al+QC+H2S+1A3", x: 1 },
    { g: "c", i: "link", f: "Instagram · @skines.ca", e: "Instagram · @skines.ca", df: "Photos et nouveautés", de: "Photos and news", k: "instagram insta reseaux sociaux social", u: "https://www.instagram.com/skines.ca/", x: 1 },
    { g: "c", i: "link", f: "TikTok · @skines.headspa", e: "TikTok · @skines.headspa", df: "Nos vidéos", de: "Our videos", k: "tiktok video videos reseaux sociaux social", u: "https://www.tiktok.com/@skines.headspa", x: 1 }
  ];
  var SUG = [["Head Spa", "Head Spa"], ["Laser", "Laser"], ["Soins du visage", "Facials"], ["Cartes-cadeaux", "Gift cards"], ["Stationnement", "Parking"], ["Horaires", "Hours"], ["Nous recrutons", "Jobs"]];

  function lang() { try { return localStorage.getItem("skines-lang") === "en" ? 1 : 0; } catch (e) { return 0; } }
  function nz(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim(); }
  function lev1(a, b) { if (Math.abs(a.length - b.length) > 1) return false; var i = 0, j = 0, d = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue } if (++d > 1) return false; if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++ } } return d + (a.length - i) + (b.length - j) <= 1; }
  DB.forEach(function (d) { d.t = nz(d.f + " " + d.e); d.h = nz(d.f + " " + d.e + " " + d.k + " " + d.df + " " + d.de); d.w = d.h.split(" "); });
  function search(q) {
    var T = nz(q).split(" ").filter(Boolean); if (!T.length) return [];
    var out = [];
    DB.forEach(function (d) {
      var sc = 0, ok = true;
      T.forEach(function (t) {
        if (d.t.indexOf(t) === 0) sc += 6; else if (d.t.indexOf(" " + t) > -1) sc += 5; else if (d.t.indexOf(t) > -1) sc += 4;
        else if (d.h.indexOf(t) > -1) sc += 2;
        else if (t.length >= 4 && d.w.some(function (w) { return w.length >= 4 && lev1(t, w); })) sc += 1;
        else ok = false;
      });
      if (ok) out.push([sc + (d.m && sc >= 4 ? 3 : 0), d]);
    });
    out.sort(function (a, b) { return b[0] - a[0]; });
    return out.map(function (x) { return x[1]; });
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] }); }
  function svg(n) { return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[n] + "</svg>"; }

  var P = "html body #sksr#sksr";
  var css = P + "{position:fixed;inset:0;z-index:2147483000;display:none;background:rgba(46,25,19,.94);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);overflow-y:auto;overscroll-behavior:contain;font-family:'DM Sans',system-ui,sans-serif}" +
    P + ".on{display:block}" +
    P + " .sk-w{max-width:680px;margin:0 auto;padding:max(28px,env(safe-area-inset-top)) 20px 48px}" +
    P + " .sk-bar{display:flex;align-items:center;gap:14px;border-bottom:1px solid rgba(245,237,227,.35);padding:10px 0 14px}" +
    P + " .sk-bar svg{flex:0 0 auto;color:#F5EDE3 !important}" +
    P + " input{flex:1;min-width:0;background:transparent !important;border:0 !important;outline:0 !important;box-shadow:none !important;color:#F5EDE3 !important;font:400 22px/1.3 'DM Sans',sans-serif !important;padding:6px 0 !important;margin:0 !important;border-radius:0 !important;-webkit-appearance:none}" +
    P + " input::-webkit-search-cancel-button,"+P+" input::-webkit-search-decoration{display:none !important;-webkit-appearance:none}" +
    P + " input::placeholder{color:rgba(245,237,227,.55) !important}" +
    P + " .sk-x{flex:0 0 auto;width:40px;height:40px;border-radius:50%;border:1px solid rgba(245,237,227,.45);background:transparent;color:#F5EDE3 !important;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}" +
    P + " .sk-x:hover{background:rgba(245,237,227,.12)}" +
    P + " .sk-lab{margin:26px 0 10px;font:500 11px/1 'DM Sans',sans-serif;letter-spacing:.24em;text-transform:uppercase;color:rgba(235,201,188,.85) !important}" +
    P + " .sk-chips{display:flex;flex-wrap:wrap;gap:10px}" +
    P + " .sk-chip{border:1px solid rgba(245,237,227,.5);background:transparent;color:#F5EDE3 !important;border-radius:999px;padding:10px 18px;font:400 14px 'DM Sans',sans-serif;letter-spacing:.04em;cursor:pointer}" +
    P + " .sk-chip:hover{background:rgba(245,237,227,.14)}" +
    P + " .sk-it{display:flex;align-items:center;gap:16px;padding:14px 12px;margin:0 -12px;border-radius:12px;text-decoration:none;color:#F5EDE3 !important}" +
    P + " .sk-it:hover,.sk-it.on{background:rgba(245,237,227,.1)}" +
    P + " .sk-ic{flex:0 0 auto;width:42px;height:42px;border-radius:50%;border:1px solid rgba(245,237,227,.35);display:flex;align-items:center;justify-content:center;color:#EBC9BC !important}" +
    P + " .sk-tx{flex:1;min-width:0}" +
    P + " .sk-t{display:block;font:400 17px/1.3 'DM Sans',sans-serif;color:#F5EDE3 !important}" +
    P + " .sk-t mark{background:none;color:#EBC9BC !important;text-decoration:underline;text-underline-offset:3px}" +
    P + " .sk-d{display:block;margin-top:3px;font:400 13px/1.4 'DM Sans',sans-serif;color:rgba(245,237,227,.62) !important}" +
    P + " .sk-ar{flex:0 0 auto;color:rgba(245,237,227,.45) !important;font-size:20px}" +
    P + " .sk-none{padding:36px 0 8px;color:#F5EDE3 !important;font:400 17px/1.5 'DM Sans',sans-serif}" +
    P + " .sk-none small{display:block;margin-top:8px;color:rgba(245,237,227,.62) !important;font-size:14px}" +
    "@media(max-width:520px){" + P + " input{font-size:19px !important}}";
  var st = document.createElement("style"); st.id = "sk-search2-css"; st.textContent = css + "#searchOverlay{display:none !important}"; document.head.appendChild(st);

  var root, inp, box, items = [], cur = -1, lastFocus;
  function build() {
    if (root) return;
    root = document.createElement("div"); root.id = "sksr"; root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
    root.innerHTML = '<div class="sk-w"><div class="sk-bar">' + svg("link").replace(I.link, '<circle cx="11" cy="11" r="7.500"/><path d="M21 21l-4.700-4.700"/>').replace('width="20" height="20"', 'width="26" height="26"') +
      '<input type="search" autocomplete="off" spellcheck="false" enterkeyhint="search"><button type="button" class="sk-x"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div><div class="sk-body" aria-live="polite"></div></div>';
    document.body.appendChild(root);
    inp = root.querySelector("input"); box = root.querySelector(".sk-body");
    root.querySelector(".sk-x").addEventListener("click", close);
    root.addEventListener("click", function (e) { if (e.target === root || e.target.classList.contains("sk-w")) close(); });
    inp.addEventListener("input", function () { render(inp.value); });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!items.length) return; cur = (cur + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; mark(); }
      else if (e.key === "Enter") { var t = items[cur >= 0 ? cur : 0]; if (t) { e.preventDefault(); t.click(); } }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("on")) close(); });
  }
  function mark() { items.forEach(function (a, i) { a.classList.toggle("on", i === cur); }); if (items[cur]) items[cur].scrollIntoView({ block: "nearest" }); }
  function hl(s, q) { var T = nz(q).split(" ").filter(Boolean), r = esc(s); T.forEach(function (t) { var n = nz(s); var i = n.indexOf(t); if (i > -1 && n.length === s.length) { r = esc(s.slice(0, i)) + "<mark>" + esc(s.slice(i, i + t.length)) + "</mark>" + esc(s.slice(i + t.length)); } }); return T.length === 1 ? r : esc(s); }
  function row(d, q, L) { return '<a class="sk-it" href="' + d.u + '"' + (d.x ? ' target="_blank" rel="noopener noreferrer"' : "") + '><span class="sk-ic">' + svg(d.i) + '</span><span class="sk-tx"><span class="sk-t">' + hl(L ? d.e : d.f, q) + '</span><span class="sk-d">' + esc(L ? d.de : d.df) + '</span></span><span class="sk-ar">›</span></a>'; }
  function render(q) {
    var L = lang(), h = "";
    if (!nz(q)) {
      h += '<div class="sk-lab">' + (L ? "Popular searches" : "Recherches populaires") + '</div><div class="sk-chips">' + SUG.map(function (s) { return '<button type="button" class="sk-chip" data-q="' + esc(s[L]) + '">' + esc(s[L]) + "</button>"; }).join("") + "</div>";
      h += '<div class="sk-lab">' + (L ? "Quick links" : "Accès rapides") + "</div>" + ["/head-spa", "/laser", "/facial", "/cartes-cadeaux", "/parking", "/carrieres"].map(function (u) { return DB.filter(function (d) { return d.u === u })[0]; }).filter(Boolean).map(function (d) { return row(d, "", L); }).join("");
    } else {
      var r = search(q);
      if (!r.length) h = '<div class="sk-none">' + (L ? "No result for" : "Aucun résultat pour") + " « " + esc(q) + " »<small>" + (L ? "Try: Head Spa, laser, parking, hours, gift cards." : "Essayez : Head Spa, laser, stationnement, horaires, cartes-cadeaux.") + '</small></div><div class="sk-lab">' + (L ? "Contact us" : "Nous joindre") + "</div>" + DB.filter(function (d) { return d.g === "c" }).slice(0, 3).map(function (d) { return row(d, "", L); }).join("");
      else { var gs = {}; r.forEach(function (d) { (gs[d.g] = gs[d.g] || []).push(d); }); ["s", "i", "p", "t", "c"].forEach(function (g) { if (gs[g]) h += '<div class="sk-lab">' + G[g][L] + "</div>" + gs[g].slice(0, g === "t" ? 4 : 6).map(function (d) { return row(d, q, L); }).join(""); }); }
    }
    box.innerHTML = h; items = [].slice.call(box.querySelectorAll(".sk-it")); cur = nz(q) && items.length ? 0 : -1; mark();
    [].forEach.call(box.querySelectorAll(".sk-chip"), function (c) { c.addEventListener("click", function () { inp.value = c.getAttribute("data-q"); render(inp.value); inp.focus(); }); });
  }
  function open() {
    build(); lastFocus = document.activeElement; var L = lang(); inp.placeholder = L ? "Search a treatment, hours, parking…" : "Rechercher un soin, les horaires, le stationnement…"; root.querySelector(".sk-x").setAttribute("aria-label", L ? "Close" : "Fermer"); root.setAttribute("aria-label", L ? "Search" : "Recherche");
    inp.value = ""; render(""); root.classList.add("on"); document.documentElement.style.overflow = "hidden"; document.body.style.overflow = "hidden"; setTimeout(function () { inp.focus(); }, 60);
  }
  function close() { if (!root) return; root.classList.remove("on"); document.documentElement.style.overflow = ""; document.body.style.overflow = ""; if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) { } }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("#searchBtn,#skAwhSearch,.nav-search-btn,[data-sk-search]"); if (!b) return;
    e.preventDefault(); e.stopImmediatePropagation(); open();
  }, true);
  window.skOpenSearch = open;
})();
