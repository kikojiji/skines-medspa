
/* ══ SITE SEARCH ENGINE ═══════════════════════════════════════════════════ */
(function() {
const BOOKING = "https://www.fresha.com/book-now/glowch-bod1k4s2/all-offer?share=true&pId=1273288";

const DB = [
  // ── HEAD SPA ──
  { icon:"🫧", cat:"Head Spa", name:"Solo 60 min – Focus Scalpcial", meta:"60 min · Soin du cuir chevelu", tag:"head spa scalpcial solo 60 min cuir chevelu massage détente", url:"/head-spa" },
  { icon:"🫧", cat:"Head Spa", name:"Solo 90 min – Signature Scalpcial", meta:"90 min · Rituel signature complet", tag:"head spa scalpcial solo 90 min signature rituel", url:"/head-spa" },
  { icon:"🫧", cat:"Head Spa", name:"Duo 60 min – Focus Scalpcial", meta:"60 min · Pour deux personnes", tag:"head spa scalpcial duo 60 min couple deux", url:"/head-spa" },
  { icon:"🫧", cat:"Head Spa", name:"Duo 90 min – Signature Scalpcial", meta:"90 min · Rituel duo signature", tag:"head spa scalpcial duo 90 min couple signature", url:"/head-spa" },
  { icon:"🫧", cat:"Head Spa", name:"Trio 60 min – Focus Scalpcial", meta:"60 min · Pour trois personnes", tag:"head spa scalpcial trio 60 min groupe trois", url:"/head-spa" },

  // ── FACIAL ──
  { icon:"✨", cat:"Soins Visage", name:"Facial", meta:"Soins avancés pour le visage", price:"", tag:"facial visage soin hydratation anti-age peau traitement", url:"/facial" },

  // ── LASER ──
  { icon:"⚡", cat:"Épilation Laser", name:"Lèvre Supérieure", meta:"Laser · 10 min", tag:"laser épilation lèvre supérieure visage poil upper lip", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Menton", meta:"Laser · 10 min", tag:"laser épilation menton visage chin", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Favoris", meta:"Laser · 10 min", tag:"laser épilation favoris sideburns visage", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Cou", meta:"Laser · 15 min", tag:"laser épilation cou neck", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Nuque", meta:"Laser · 10 min", tag:"laser épilation nuque nape", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Contour Barbe", meta:"Laser · 10 min", tag:"laser épilation barbe beard contour", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Demi-Visage", meta:"Laser · 15 min", tag:"laser épilation demi visage half face", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Demi-Visage + Cou", meta:"Laser · 20 min", tag:"laser épilation demi visage cou half face neck", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Visage Complet", meta:"Laser · 20 min", tag:"laser épilation visage complet full face", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Aisselles", meta:"Laser · 15 min", tag:"laser épilation aisselles underarms", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Ligne Bikini", meta:"Laser · 15 min", tag:"laser épilation bikini ligne line", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Maillot Intégral", meta:"Laser · 20 min", tag:"laser épilation maillot intégral full bikini", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Bras Complets", meta:"Laser · 30 min", tag:"laser épilation bras complets full arms", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Demi-Bras", meta:"Laser · 20 min", tag:"laser épilation demi bras half arms", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Poitrine", meta:"Laser · 20 min", tag:"laser épilation poitrine chest", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Épaules", meta:"Laser · 20 min", tag:"laser épilation épaules shoulders", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Ventre Complet", meta:"Laser · 20 min", tag:"laser épilation ventre abdomen full abdomen", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Dos Complet", meta:"Laser · 25 min", tag:"laser épilation dos complet full back", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Bas du Dos", meta:"Laser · 15 min", tag:"laser épilation bas du dos lower back", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Fesses", meta:"Laser · 15 min", tag:"laser épilation fesses buttocks", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Jambes Complètes", meta:"Laser · 35 min", tag:"laser épilation jambes complètes full legs", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Demi-Jambes", meta:"Laser · 20 min", tag:"laser épilation demi jambes half legs", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser", name:"Corps Complet", meta:"Laser · 1h 30 min", tag:"laser épilation corps complet full body", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser – Forfaits", name:"Visage + Aisselles", meta:"Forfait · 25 min", tag:"laser forfait visage aisselles bundle", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser – Forfaits", name:"Bikini + Aisselles", meta:"Forfait · 30 min", tag:"laser forfait bikini aisselles bundle", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser – Forfaits", name:"Bikini + Fesses", meta:"Forfait · 15 min", tag:"laser forfait bikini fesses bundle", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser – Forfaits", name:"Bikini + Visage + Aisselles", meta:"Forfait · 30 min", tag:"laser forfait bikini visage aisselles bundle", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser – Forfaits", name:"Bikini + Aisselles + Jambes Complètes", meta:"Forfait · 35 min", tag:"laser forfait bikini aisselles jambes bundle", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser – Forfaits", name:"Dos Complet + Poitrine", meta:"Forfait · 40 min", tag:"laser forfait dos poitrine bundle", url:"/laser" },
  { icon:"⚡", cat:"Épilation Laser – Forfaits", name:"Corps Complet", meta:"Forfait · 1h 30 min", tag:"laser forfait corps complet full body bundle", url:"/laser" },

  // ── INFO / FAQ ──
  { icon:"📍", cat:"Info", name:"Adresse – 19 Av. Shamrock, Montréal", meta:"Petite-Italie · Jean-Talon · H2S 1A3", price:"", tag:"adresse address localisation location shamrock montréal côte des neiges où direction", url:"/#contact" },
  { icon:"🗺️", cat:"Info", name:"Google Maps – Itinéraire", meta:"Ouvrir dans Maps", price:"", tag:"maps google plan itinéraire chemin où aller direction", url:"https://www.google.com/maps/place/Skines+Head+Spa+%26+wellness/@45.5344811,-73.6167675,17z" },
  { icon:"📞", cat:"Info", name:"Téléphone – +1 (438) 260-5660", meta:"Appeler Skines Head Spa", price:"", tag:"téléphone phone appel contact numéro 438", url:"tel:+14382605660" },
  { icon:"📧", cat:"Info", name:"Email – Info@skines.ca", meta:"Envoyer un email", price:"", tag:"email mail courriel contact info", url:"mailto:Info@skines.ca" },
  { icon:"🅿️", cat:"Info", name:"Parking privé", meta:"Parking gratuit à proximité", price:"Gratuit", tag:"stationnement parking gratuit voiture garer", url:"/#contact" },
  { icon:"🏥", cat:"Info", name:"Reçu d'assurance disponible", meta:"Valide pour remboursement", price:"", tag:"assurance insurance reçu remboursement couverture médecin", url:"/#contact" },
  { icon:"🎁", cat:"Info", name:"Cartes Cadeaux", meta:"Offrir une expérience Skines", price:"", tag:"carte cadeau gift card cadeau offrir ami anniversaire", url:"/#contact" },
  { icon:"⭐", cat:"Info", name:"Avis clients – 4.8★ sur Fresha", meta:"Voir tous les avis", price:"", tag:"avis review note 4.8 fresha google clients", url:"/reviews" },
  { icon:"📅", cat:"Réserver", name:"Réserver en ligne – Fresha", meta:"Disponibilités en temps réel", price:"", tag:"réserver booking réservation fresha appointment rendez-vous book", url:BOOKING },
  { icon:"📱", cat:"Réserver", name:"Instagram – @skines.ca", meta:"29K abonnés · Photos & updates", price:"", tag:"instagram social media réseaux sociaux skines", url:"https://instagram.com/skines.ca" },
  { icon:"🎵", cat:"Réserver", name:"TikTok – @skines.headspa", meta:"12K abonnés · Vidéos", price:"", tag:"tiktok social media vidéo", url:"https://tiktok.com/@skines.headspa" },
];

function normalize(s) {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ");
}

function search(q) {
  const terms = normalize(q).trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return DB.filter(item => {
    const haystack = normalize(item.name + " " + item.cat + " " + item.tag + " " + (item.meta||"") + " " + (item.price||""));
    return terms.every(t => haystack.includes(t));
  });
}

function groupBy(arr, key) {
  const map = {};
  arr.forEach(item => {
    (map[item[key]] = map[item[key]] || []).push(item);
  });
  return map;
}

function renderResults(results, query) {
  const container = document.getElementById("searchResults");
  if (!results.length) {
    var _pnq = normalize(query);
    if (/(prix|tarif|price|cout|cost|combien|montant|budget)/.test(_pnq)) {
      container.innerHTML = '<div class="search-group-label">Tarifs</div>' +
        '<a class="search-result-item" href="https://www.fresha.com/book-now/glowch-bod1k4s2/all-offer?share=true&pId=1273288" target="_blank" rel="noreferrer" style="color:inherit;text-decoration:none;">' +
          '<div class="search-result-icon" style="background:rgba(255,255,255,0.07);border-radius:10px;">&#127991;&#65039;</div>' +
          '<div class="search-result-body">' +
            '<span class="search-result-name" style="color:#ffffff;font-family:\'Cormorant Garamond\',Georgia,serif;font-size:1.05rem;font-weight:400;display:block;line-height:1.3;">Voir tous les tarifs</span>' +
            '<span class="search-result-meta" style="color:rgba(255,255,255,0.42);font-size:0.70rem;display:block;margin-top:0.15rem;">Prix d&eacute;taill&eacute;s par soin sur notre r&eacute;servation en ligne</span>' +
          '</div>' +
          '<span style="background:#F5EDE3;color:#684034;font-family:\'DM Sans\',sans-serif;font-size:0.62rem;letter-spacing:0.12em;text-transform:uppercase;font-weight:600;padding:0.5rem 0.85rem;border-radius:999px;white-space:nowrap;flex-shrink:0;">Voir les prix</span>' +
        '</a>';
      return;
    }
    container.innerHTML = '<div class="search-empty">Aucun résultat pour <strong>"' + query + '"</strong><br><span style="font-size:0.8rem;color:#B8A9A2">Essayez: head spa, laser, visage, adresse, réserver</span></div>';
    return;
  }
  const groups = groupBy(results, "cat");
  let html = "";
  for (const [cat, items] of Object.entries(groups)) {
    html += '<div class="search-group-label">' + cat + '</div>';
    items.forEach(item => {
      const href = item.url.startsWith("http") || item.url.startsWith("tel:") || item.url.startsWith("mailto:") ? item.url : item.url;
      const target = item.url.startsWith("http") ? ' target="_blank" rel="noreferrer"' : "";
      html += '<a class="search-result-item" href="' + href + '"' + target + '>' +
        '<div class="search-result-icon">' + item.icon + '</div>' +
        '<div class="search-result-body">' +
          '<span class="search-result-name">' + item.name + '</span>' +
          (item.meta ? '<span class="search-result-meta">' + item.meta + '</span>' : '') +
        '</div>' +
        (item.price ? '<div class="search-result-price">' + item.price + '</div>' : '') +
        '<span class="search-result-arrow">›</span>' +
      '</a>';
    });
  }
  container.innerHTML = html;
}

function renderSuggestions() {
  const container = document.getElementById("searchResults");
  container.innerHTML = "";
}

// Overlay open/close
function openSearch() {
  var overlay = document.getElementById("searchOverlay");
  var input   = document.getElementById("searchInput");
  if (!overlay) return;
  overlay.classList.add("open");
  document.body.style.overflow = "hidden";
  setTimeout(function() { if (input) input.focus(); }, 120);
}
function closeSearch() {
  var overlay  = document.getElementById("searchOverlay");
  var input    = document.getElementById("searchInput");
  var suggestBox = document.getElementById("searchSuggestions");
  if (!overlay) return;
  overlay.classList.remove("open");
  document.body.style.overflow = "";
  if (input) { input.value = ""; }
  var res = document.getElementById("searchResults");
  if (res) res.innerHTML = "";
  if (suggestBox) suggestBox.style.display = "";
}

// Wire all search interactions after DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  var closeBtn   = document.getElementById("searchClose");
  var input      = document.getElementById("searchInput");
  var suggestBox = document.getElementById("searchSuggestions");

  document.querySelectorAll("#searchBtn").forEach(function(btn) { btn.addEventListener("click", openSearch); });
  if (closeBtn) closeBtn.addEventListener("click", closeSearch);
  document.addEventListener("click", function(e) { var ov = document.getElementById("searchOverlay"); if (ov && e.target === ov) closeSearch(); });

  if (input) {
    var debounceTimer;
    input.addEventListener("input", function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        var q = input.value.trim();
        if (!q) {
          renderResults([], "");
          if (suggestBox) suggestBox.style.display = "";
          var res = document.getElementById("searchResults");
          if (res) res.innerHTML = "";
        } else {
          if (suggestBox) suggestBox.style.display = "none";
          renderResults(search(q), q);
        }
      }, 180);
    });
  }

  document.querySelectorAll(".search-pill").forEach(function(pill) {
    pill.addEventListener("click", function() {
      if (!input) return;
      input.value = pill.dataset.q;
      if (suggestBox) suggestBox.style.display = "none";
      renderResults(search(pill.dataset.q), pill.dataset.q);
    });
  });
});

document.addEventListener("keydown", function(e) { var ov = document.getElementById("searchOverlay"); if (e.key === "Escape" && ov && ov.classList.contains("open")) closeSearch(); });
})();

  // Laser view toggle (grid / list)
  document.querySelectorAll('.laser-view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.laserView;
      // Update active state for both toggle rows
      document.querySelectorAll('.laser-view-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.laserView === view);
      });
      // Apply to both grids
      document.querySelectorAll('.price-cards-grid').forEach(grid => {
        grid.classList.toggle('list-view', view === 'list');
      });
    });
  });

/* ── LASER FULLSCREEN SLIDER ── */
(function() {
  const slider  = document.querySelector('.laser-fullslider');
  const track   = document.getElementById('lfsTrack');
  const count   = document.getElementById('lfsCount');
  const prev    = document.getElementById('lfsPrev');
  const next    = document.getElementById('lfsNext');
  if (!track) return;

  // Seamless infinite loop: clone the first slide to the end and the
  // last slide to the start, so advancing past the real last slide
  // (or back past the real first) animates into a clone, then jumps
  // instantly (no transition) to the matching real slide — the eye
  // never sees a "rewind" or a stop.
  const realSlides = Array.from(track.querySelectorAll('.lfs-slide'));
  const total       = realSlides.length;
  const firstClone  = realSlides[0].cloneNode(true);
  const lastClone   = realSlides[total - 1].cloneNode(true);
  firstClone.setAttribute('aria-hidden', 'true');
  lastClone.setAttribute('aria-hidden', 'true');
  track.appendChild(firstClone);
  track.insertBefore(lastClone, realSlides[0]);
  const slides = track.querySelectorAll('.lfs-slide'); // total + 2, includes clones

  // Desktop starts on "Corps complet" as requested — now at index 6
  // after interleaving the new laser-slider-* photos with the
  // originals so no two visually-similar shots sit next to each
  // other. Mobile's single-full-bleed-slide layout keeps its own start.
  // +1 offset because index 0 is now the prepended last-slide clone.
  let current   = (window.innerWidth >= 981 ? 6 : 1) + 1;
  let dragging  = false;
  let startX    = 0;
  let startY    = 0;
  let diffX     = 0;
  let locked    = null; // 'h' | 'v'

  function render(animated) {
    track.style.transition = animated
      ? 'transform 0.45s cubic-bezier(0.25,0.46,0.45,0.94)'
      : 'none';
    // All breakpoints now show a row of several equal-width slides at
    // once (see CSS above) — percentage-of-track translateX only maps
    // to "one slide" in a single-full-bleed layout, so measure the
    // actual rendered slide+gap width instead, everywhere.
    var gap = parseFloat(getComputedStyle(track).gap) || 0;
    var step = slides[0].offsetWidth + gap;
    track.style.transform = 'translateX(-' + (current * step) + 'px)';
    var realIndex = ((current - 1) + total) % total;
    count.textContent = (realIndex + 1) + ' / ' + total;
  }

  function goTo(i, animated = true) {
    current = i;
    render(animated);
  }

  // After the clone-slide transition finishes, snap silently back to
  // the matching real slide so the next click continues the loop.
  track.addEventListener('transitionend', () => {
    if (current === 0) { current = total; render(false); }
    else if (current === total + 1) { current = 1; render(false); }
  });

  goTo(current, false);
  window.addEventListener('resize', () => render(false));

  /* ── Autoplay: loops forever, pauses on interaction/offscreen ── */
  var AUTOPLAY_MS = 3200;
  var autoplayTimer = null;
  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(() => goTo(current + 1), AUTOPLAY_MS);
  }
  function stopAutoplay() {
    if (autoplayTimer) { clearInterval(autoplayTimer); autoplayTimer = null; }
  }
  var autoplayObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => entry.isIntersecting ? startAutoplay() : stopAutoplay());
  }, { threshold: 0.2 });
  autoplayObserver.observe(slider);

  prev.addEventListener('click', () => { stopAutoplay(); goTo(current - 1); startAutoplay(); });
  next.addEventListener('click', () => { stopAutoplay(); goTo(current + 1); startAutoplay(); });
  slider.addEventListener('mouseenter', stopAutoplay);
  slider.addEventListener('mouseleave', startAutoplay);

  /* ── Touch swipe (drag-aware, prevents page scroll during horizontal drag) ── */
  slider.addEventListener('touchstart', e => {
    stopAutoplay();
    startX  = e.touches[0].clientX;
    startY  = e.touches[0].clientY;
    diffX   = 0;
    locked  = null;
    dragging = true;
  }, { passive: true });

  slider.addEventListener('touchmove', e => {
    if (!dragging) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!locked) {
      locked = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (locked === 'h') {
      e.preventDefault(); // block vertical scroll while swiping photos
      diffX = dx;
      track.style.transition = 'none';
      track.style.transform = 'translateX(calc(-' + (current * 100) + '% + ' + diffX + 'px))';
    }
  }, { passive: false });

  slider.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    if (locked === 'h') {
      if (diffX < -60)      goTo(current + 1);
      else if (diffX > 60)  goTo(current - 1);
      else                  goTo(current); // snap back
    }
    locked = null;
    diffX  = 0;
    startAutoplay();
  });
})();

// Mobile menu active highlight
(function() {
  var mobileLinks = document.querySelectorAll('.mobile-nav-links a');
  mobileLinks.forEach(function(link) {
    link.addEventListener('click', function() {
      mobileLinks.forEach(function(l) { l.classList.remove('menu-active'); });
      this.classList.add('menu-active');
    });
  });
  // Auto-highlight current page
  var path = window.location.pathname.replace(/\/+$/, '') || '/';
  mobileLinks.forEach(function(link) {
    var href = (link.getAttribute('href') || '').replace(/\/+$/, '') || '/';
    if (href === path) {
      link.classList.add('menu-active');
    }
  });
})();

