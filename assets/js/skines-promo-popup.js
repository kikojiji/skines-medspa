/* Skines — Popup tirage du mois -50% (Head Spa / Laser / Facial)
   Même langage visuel que la fenêtre de l'accueil : carte crème, photo, bouton terre cuite.
   Apparaît après 6 s OU à 35% de défilement. Invite à participer -> /offre.
   Mémoire (v3) : a cliqué « JE PARTICIPE » -> 30 jours ; a fermé -> 3 jours. */
(function () {
  'use strict';
  var KEY = 'sk_promo_seen_v3';
  var DAY = 86400000;
  try {
    var st = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (st && st.t && (Date.now() - st.t) < (st.k === 'join' ? 30 : 3) * DAY) return;
  } catch (e) {}
  if (window.__skPromoArmed) return; window.__skPromoArmed = true;

  var EN = false;
  try { EN = (localStorage.getItem('skines-lang') || document.documentElement.lang) === 'en'; } catch (e) {}
  var T = EN ? {
    eyebrow: 'Monthly draw', off: '-50%', title: 'on a session of your choice',
    sub: 'Enter the monthly draw for free and try to win <b>50% off a session</b>. One winner every month.',
    cta: 'ENTER THE DRAW', no: 'No thanks'
  } : {
    eyebrow: 'Tirage du mois', off: '-50%', title: 'sur une séance de votre choix',
    sub: 'Participez gratuitement au tirage du mois et tentez de gagner <b>-50% sur une séance</b>. Un(e) gagnant(e) chaque mois.',
    cta: 'JE PARTICIPE', no: 'Non merci'
  };

  var css = ''
    + 'html body #skPromo{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;'
    + 'background:rgba(58,36,30,.5);opacity:0;transition:opacity .35s ease;font-family:"DM Sans",-apple-system,Segoe UI,Roboto,Arial,sans-serif}'
    + 'html body #skPromo.sk-show{opacity:1}'
    + '#skPromo *{box-sizing:border-box}'
    + 'html body #skPromo .sk-pm-card{position:relative;display:flex;flex-direction:row-reverse;width:min(820px,100%);max-height:calc(100dvh - 40px);'
    + 'background:#FAF1EC;border-radius:14px;overflow:hidden;box-shadow:0 24px 70px rgba(40,22,17,.35);transform:translateY(14px);'
    + 'transition:transform .45s cubic-bezier(.2,.7,.2,1)}'
    + 'html body #skPromo.sk-show .sk-pm-card{transform:none}'
    + 'html body #skPromo .sk-pm-img{flex:0 0 44%;padding:12px;min-height:400px}'
    + 'html body #skPromo .sk-pm-img img{display:block;width:100%;height:100%;object-fit:cover;object-position:38% 50%;border-radius:10px}'
    + 'html body #skPromo .sk-pm-body{flex:1 1 56%;padding:44px 38px 30px;display:flex;flex-direction:column;justify-content:center;color:#684034;text-align:left}'
    + 'html body #skPromo .sk-pm-eyebrow{font-size:11px;letter-spacing:.26em;text-transform:uppercase;color:#B66A5A;font-weight:700;margin:0 0 10px}'
    + 'html body #skPromo .sk-pm-off{font-family:"DM Sans",sans-serif;font-weight:300;color:#684034;font-size:84px;line-height:.9;letter-spacing:-.02em;margin:0 0 8px}'
    + 'html body #skPromo .sk-pm-title{font-family:"DM Sans",sans-serif;font-weight:400;color:#684034;font-size:1.45rem;line-height:1.2;margin:0 0 14px}'
    + 'html body #skPromo .sk-pm-sub{color:#684034;opacity:.85;font-size:.95rem;line-height:1.55;margin:0 0 22px;max-width:340px}'
    + 'html body #skPromo .sk-pm-sub b{font-weight:700}'
    + 'html body #skPromo a.sk-pm-cta,html body #skPromo a.sk-pm-cta:visited,html body #skPromo a.sk-pm-cta:hover{display:block;width:100%;max-width:340px;'
    + 'height:50px;line-height:50px;text-align:center;border:none;border-radius:6px;background:#B66A5A;color:#FFF9F5 !important;-webkit-text-fill-color:#FFF9F5 !important;'
    + 'font-weight:700;letter-spacing:.12em;font-size:.82rem;text-decoration:none !important;text-shadow:none !important;transition:background .2s,transform .2s}'
    + 'html body #skPromo a.sk-pm-cta:hover{background:#A65B4B;transform:translateY(-1px)}'
    + 'html body #skPromo .sk-pm-no{align-self:flex-start;margin-top:14px;padding:6px 0;background:none;border:none;color:#684034;opacity:.6;font:400 .8rem "DM Sans",sans-serif;'
    + 'text-decoration:underline;text-underline-offset:3px;cursor:pointer}'
    + 'html body #skPromo .sk-pm-x{position:absolute;top:12px;left:12px;z-index:2;width:34px;height:34px;border:none;border-radius:50%;background:rgba(250,241,236,.92);'
    + 'color:#684034;font-size:20px;line-height:1;cursor:pointer}'
    + '@media(max-width:700px){'
    + 'html body #skPromo{padding:14px}'
    + 'html body #skPromo .sk-pm-card{flex-direction:column;width:min(400px,100%)}'
    + 'html body #skPromo .sk-pm-img{flex:0 0 auto;min-height:0;padding:10px 10px 0}'
    + 'html body #skPromo .sk-pm-img img{height:150px;object-position:50% 40%}'
    + 'html body #skPromo .sk-pm-body{padding:18px 22px 20px;text-align:center;align-items:center}'
    + 'html body #skPromo .sk-pm-off{font-size:64px}'
    + 'html body #skPromo .sk-pm-title{font-size:1.2rem;margin-bottom:10px}'
    + 'html body #skPromo .sk-pm-sub{font-size:.88rem;margin-bottom:16px}'
    + 'html body #skPromo .sk-pm-no{align-self:center;margin-top:8px}'
    + '}';

  function h(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  function build() {
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    var ov = h('<div id="skPromo" role="dialog" aria-modal="true" aria-label="Tirage -50%">'
      + '<div class="sk-pm-card">'
      + '<button type="button" class="sk-pm-x" aria-label="Fermer">&times;</button>'
      + '<div class="sk-pm-img"><picture>'
      + '<source media="(max-width:700px)" srcset="/assets/images/tirage-popup-portrait.webp?v=1">'
      + '<source srcset="/assets/images/tirage-popup-bowl-s.webp?v=3">'
      + '<img src="/assets/images/tirage-popup-bowl-m.webp?v=1" alt="" width="738" height="575" decoding="async">'
      + '</picture></div>'
      + '<div class="sk-pm-body">'
      + '<div class="sk-pm-eyebrow">' + T.eyebrow + '</div>'
      + '<div class="sk-pm-off">' + T.off + '</div>'
      + '<div class="sk-pm-title">' + T.title + '</div>'
      + '<p class="sk-pm-sub">' + T.sub + '</p>'
      + '<a class="sk-pm-cta" href="/offre">' + T.cta + '</a>'
      + '<button type="button" class="sk-pm-no">' + T.no + '</button>'
      + '</div></div></div>');
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('sk-show'); });

    function seen(k) { try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), k: k || 'close' })); } catch (e) {} }
    function close() { seen('close'); ov.classList.remove('sk-show'); setTimeout(function () { ov.remove(); }, 350); }

    ov.querySelector('.sk-pm-x').addEventListener('click', close);
    ov.querySelector('.sk-pm-no').addEventListener('click', close);
    ov.querySelector('.sk-pm-cta').addEventListener('click', function () { seen('join'); });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });
  }

  var fired = false;
  function trigger() { if (fired) return; fired = true; window.removeEventListener('scroll', onScroll); build(); }
  function onScroll() {
    var sc = window.scrollY || document.documentElement.scrollTop;
    var max = (document.documentElement.scrollHeight - window.innerHeight) || 1;
    if (sc / max > 0.35) trigger();
  }
  function arm() { setTimeout(trigger, 6000); window.addEventListener('scroll', onScroll, { passive: true }); }
  if (document.readyState === 'complete' || document.readyState === 'interactive') arm();
  else window.addEventListener('DOMContentLoaded', arm);
})();
