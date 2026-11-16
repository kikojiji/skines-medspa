/* Skines — fenêtre « Gagnez une expérience » : n'apparaît qu'en fin de page, jamais avec la fenêtre -50 % */
(function(){
  var orig=window.openPopup; if(typeof orig!=='function')return;
  var waiting=false;
  function atEnd(){var m=document.documentElement.scrollHeight-innerHeight;return m>0&&(window.scrollY||document.documentElement.scrollTop)/m>=0.88}
  function promoOpen(){return !!document.getElementById('skPromo')}
  function seen(v){try{v?localStorage.setItem('skines-gw-seen',''+Date.now()):localStorage.removeItem('skines-gw-seen')}catch(e){}}
  window.openPopup=function(e){
    if(e&&e.type==='click')return orig.apply(this,arguments);
    if(atEnd()&&!promoOpen()){seen(1);return orig.apply(this,arguments)}
    seen(0);
    if(waiting)return;waiting=true;
    var chk=function(){if(atEnd()&&!promoOpen()){window.removeEventListener('scroll',chk);waiting=false;seen(1);orig.call(window)}};
    window.addEventListener('scroll',chk,{passive:true});
  };
})();
