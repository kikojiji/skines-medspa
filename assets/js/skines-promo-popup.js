/* Skines — Popup tirage -50% (Head Spa / Laser / Facial)
   Apparaît après 6 s OU à 35% de défilement, une seule fois par visiteur.
   Invite à participer au tirage du mois -> redirige vers /offre (formulaire complet). */
(function () {
  'use strict';
  var KEY = 'sk_promo_seen_v2';
  try { if (localStorage.getItem(KEY)) return; } catch (e) {}

  var EN = false;
  try { EN = (localStorage.getItem('skines-lang') || document.documentElement.lang) === 'en'; } catch (e) {}
  var T = EN ? {
    eyebrow: 'Tirage du mois', off: '-50%', title: 'à gagner sur une séance',
    sub: 'Participez gratuitement au tirage du mois et tentez de gagner <b>-50% sur une séance</b>. Un(e) gagnant(e) chaque mois.',
    cta: 'JE PARTICIPE', no: 'No thanks'
  } : {
    eyebrow: 'Tirage du mois', off: '-50%', title: 'à gagner sur une séance',
    sub: 'Participez gratuitement au tirage du mois et tentez de gagner <b>-50% sur une séance</b>. Un(e) gagnant(e) chaque mois.',
    cta: 'JE PARTICIPE', no: 'Non merci'
  };

  var css = ''
    + '#skPromo{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;'
    + 'background:rgba(28,18,14,.62);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;transition:opacity .35s ease;}'
    + '#skPromo.sk-show{opacity:1;}'
    + '#skPromo *{box-sizing:border-box;font-family:"DM Sans",-apple-system,Segoe UI,Roboto,Arial,sans-serif;}'
    + '.sk-pm-card{position:relative;width:100%;max-width:400px;background:#F7F0E6;border-radius:22px;padding:34px 28px 26px;'
    + 'text-align:center;box-shadow:0 30px 80px rgba(0,0,0,.45);transform:translateY(16px) scale(.98);transition:transform .4s cubic-bezier(.2,.7,.2,1);}'
    + '#skPromo.sk-show .sk-pm-card{transform:none;}'
    + '.sk-pm-x{position:absolute;top:14px;right:16px;width:30px;height:30px;border:none;background:rgba(104,64,52,.08);border-radius:50%;'
    + 'color:#684034;font-size:17px;cursor:pointer;line-height:1;}'
    + '.sk-pm-eyebrow{font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#b98a3e;font-weight:700;}'
    + '.sk-pm-off{font-family:"Cormorant Garamond",Georgia,serif;font-weight:600;color:#4b2e26;font-size:64px;line-height:.95;margin:6px 0 2px;}'
    + '.sk-pm-title{font-family:"Cormorant Garamond",Georgia,serif;font-style:italic;color:#684034;font-size:24px;line-height:1.1;margin:0 0 14px;}'
    + '.sk-pm-sub{color:#6b5048;font-size:14px;line-height:1.55;margin:0 auto 20px;max-width:320px;}'
    + '.sk-pm-sub b{color:#4b2e26;}'
    + '.sk-pm-cta{display:block;width:100%;border:none;border-radius:999px;padding:16px;background:#684034;color:#F5EDE3;'
    + 'font-weight:700;letter-spacing:.08em;font-size:14px;cursor:pointer;text-decoration:none;transition:background .2s,transform .2s;}'
    + '.sk-pm-cta:hover{background:#56342a;transform:translateY(-1px);}'
    + '.sk-pm-no{display:inline-block;margin-top:14px;background:none;border:none;color:#9e8c84;font-size:12px;text-decoration:underline;'
    + 'text-underline-offset:2px;cursor:pointer;letter-spacing:.02em;}'
    + '@media(max-width:600px){.sk-pm-off{font-size:54px;}.sk-pm-card{padding:30px 22px 22px;}}';

  function h(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  function build() {
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    var ov = h('<div id="skPromo" role="dialog" aria-modal="true" aria-label="Tirage -50%">'
      + '<div class="sk-pm-card">'
      + '<button class="sk-pm-x" aria-label="Fermer">&times;</button>'
      + '<div class="sk-pm-eyebrow">' + T.eyebrow + '</div>'
      + '<div class="sk-pm-off">' + T.off + '</div>'
      + '<div class="sk-pm-title">' + T.title + '</div>'
      + '<p class="sk-pm-sub">' + T.sub + '</p>'
      + '<a class="sk-pm-cta" href="/offre">' + T.cta + '</a>'
      + '<button type="button" class="sk-pm-no">' + T.no + '</button>'
      + '</div></div>');
    document.body.appendChild(ov);
    requestAnimationFrame(function () { ov.classList.add('sk-show'); });

    function seen() { try { localStorage.setItem(KEY, '1'); } catch (e) {} }
    function close() { seen(); ov.classList.remove('sk-show'); setTimeout(function () { ov.remove(); }, 350); }

    ov.querySelector('.sk-pm-x').addEventListener('click', close);
    ov.querySelector('.sk-pm-no').addEventListener('click', close);
    ov.querySelector('.sk-pm-cta').addEventListener('click', seen); // marque vu avant de partir vers /offre
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
