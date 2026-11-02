/* Skines interactive map: MapLibre GL + OpenFreeMap vector tiles, recolored to the site palette.
   Loads only when the map scrolls into view. Static SVG stays underneath as a fallback. */
(function () {
  var el = document.getElementById('skMap');
  if (!el) return;

  var SHOP = [-73.6167675, 45.5344811];
  var METRO = [
    { name: 'De Castelnau', lines: 'ligne bleue', linesEn: 'Blue line', pos: [-73.6201056, 45.5352621], img: 'assets/images/visit-us/metro-castelnau-thumb.webp' }
  ];
  var METRO_FAR = { name: 'Jean-Talon', pos: [-73.61342, 45.53918], img: 'assets/images/visit-us/metro-jean-talon-thumb.webp' };
  // Parking: six bays side by side in a row north-west of the shop (artist's rendering, owner confirmed direction and count)
  var BEARING = 307.5 * Math.PI / 180;           // direction of the row, clockwise from north
  var M_LAT = 111320, M_LON = 111320 * Math.cos(SHOP[1] * Math.PI / 180);
  function along(d, lateral) {
    var ue = Math.sin(BEARING), un = Math.cos(BEARING);   // along the row
    var ve = Math.cos(BEARING), vn = -Math.sin(BEARING);  // across the row (to the right)
    return [SHOP[0] + (d * ue + (lateral || 0) * ve) / M_LON, SHOP[1] + (d * un + (lateral || 0) * vn) / M_LAT];
  }
  // six angled bays (parking at ~25 degrees), each long across the row
  var BAY_L = 2.5, BAY_W = 5.4, BAY_GAP = 0.2, FIRST = 15, SLANT = Math.tan(25 * Math.PI / 180) * BAY_W;
  var BAY_TURN = 37.5 - 25;                       // bearing of the long axis of a bay (degrees), used to turn the painted P
  var BAYS = [];
  for (var i = 0; i < 6; i++) {
    var c = FIRST + i * (BAY_L + BAY_GAP);
    BAYS.push({
      center: along(c + SLANT / 2, 0),
      ring: [along(c - BAY_L / 2, -BAY_W / 2), along(c + BAY_L / 2, -BAY_W / 2), along(c + BAY_L / 2 + SLANT, BAY_W / 2), along(c - BAY_L / 2 + SLANT, BAY_W / 2), along(c - BAY_L / 2, -BAY_W / 2)]
    });
  }
  // Access to the parking: the two arrows the owner drew (metres east/north of the shop), redrawn as smooth curves
  function fromXY(e, n) { return [SHOP[0] + e / M_LON, SHOP[1] + n / M_LAT]; }
  function smooth(pts, per) {              // Catmull-Rom spline through the owner's points
    var out = [], P = [pts[0]].concat(pts, [pts[pts.length - 1]]);
    for (var i = 1; i < P.length - 2; i++) {
      for (var k = 0; k < per; k++) {
        var t = k / per, t2 = t * t, t3 = t2 * t;
        var x = 0.5 * ((2 * P[i][0]) + (-P[i - 1][0] + P[i + 1][0]) * t + (2 * P[i - 1][0] - 5 * P[i][0] + 4 * P[i + 1][0] - P[i + 2][0]) * t2 + (-P[i - 1][0] + 3 * P[i][0] - 3 * P[i + 1][0] + P[i + 2][0]) * t3);
        var y = 0.5 * ((2 * P[i][1]) + (-P[i - 1][1] + P[i + 1][1]) * t + (2 * P[i - 1][1] - 5 * P[i][1] + 4 * P[i + 1][1] - P[i + 2][1]) * t2 + (-P[i - 1][1] + 3 * P[i][1] - 3 * P[i + 1][1] + P[i + 2][1]) * t3);
        out.push([x, y]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // Arrow A: down the real private alley (from Rue Saint-Dominique), then a right-angle turn straight at the end of the parking row.
  var ARROW_A = [[-7.1, 61.3], [-11.8, 54.1], [-16.8, 46.4], [-31.0, 24.4], [-24.3, 20.1]];
  // Arrow B: along the real Avenue Shamrock, then right-angle turns (parallel / perpendicular to that road) up to the first bay.
  var ARROW_B = [[36.8, 11.4], [15.0, -22.0], [-18.35, -0.2], [-12.1, 9.3]];
  function round(pts, R) {                 // rounds every interior corner with a small circular-like fillet
    var out = [pts[0]];
    for (var i = 1; i < pts.length - 1; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      var l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      var r = Math.min(R, l1 / 2.2, l2 / 2.2);
      var a1 = [p1[0] + (p0[0] - p1[0]) * r / l1, p1[1] + (p0[1] - p1[1]) * r / l1];
      var a2 = [p1[0] + (p2[0] - p1[0]) * r / l2, p1[1] + (p2[1] - p1[1]) * r / l2];
      for (var k = 0; k <= 8; k++) { var t = k / 8, u = 1 - t; out.push([u * u * a1[0] + 2 * u * t * p1[0] + t * t * a2[0], u * u * a1[1] + 2 * u * t * p1[1] + t * t * a2[1]]); }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  function bearing(pts) { var a = pts[pts.length - 2], b = pts[pts.length - 1]; return Math.atan2(b[0] - a[0], b[1] - a[1]) * 180 / Math.PI; }
  var LA = round(ARROW_A, 4), LB = round(ARROW_B, 4);
  var ROUTE_A = LA.map(function (q) { return fromXY(q[0], q[1]); });
  var ROUTE_B = LB.map(function (q) { return fromXY(q[0], q[1]); });
  var HEAD_A = bearing(LA), HEAD_B = bearing(LB);
  var PSIGN = along(FIRST + 6 * (BAY_L + BAY_GAP) + SLANT / 2 + 3.2, 0);   // the signboard stands at the open end of the row, in front of the bays

  var CSS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
  var JS = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js';
  var STYLE = 'https://tiles.openfreemap.org/styles/positron';
  var en = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;

  function loadCss(href) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l);
  }
  function loadJs(src, cb) {
    var s = document.createElement('script');
    s.src = src; s.async = true; s.onload = cb; document.head.appendChild(s);
  }

  function recolor(style) {
    var BG = '#F6E9E2', PARK = '#E3E7D6', WATER = '#E3D9D5';
    style.layers.forEach(function (l) {
      var id = l.id, p = (l.paint = l.paint || {});
      if (l.type === 'background') p['background-color'] = BG;
      else if (/^park$|landcover_wood/.test(id)) { p['fill-color'] = PARK; p['fill-opacity'] = 1; }
      else if (id === 'landuse_residential') { p['fill-color'] = '#F3E3DB'; p['fill-opacity'] = 0.7; }
      else if (id === 'water') p['fill-color'] = WATER;
      else if (id === 'waterway') p['line-color'] = WATER;
      else if (id === 'building') { p['fill-color'] = '#EBD3C8'; p['fill-opacity'] = 0.55; p['fill-outline-color'] = '#E4C7BA'; }
      else if (id === 'highway_minor') p['line-color'] = '#FFFFFF';
      else if (id === 'highway_path') p['line-color'] = '#FFF6F1';
      else if (id === 'highway_major_casing') p['line-color'] = '#DDAF9B';
      else if (id === 'highway_major_inner' || id === 'highway_major_subtle') p['line-color'] = '#F7D9CB';
      else if (/motorway_casing/.test(id)) p['line-color'] = '#DDAF9B';
      else if (/motorway_inner|motorway_subtle/.test(id)) p['line-color'] = '#F1C9B7';
      else if (/^railway/.test(id)) p['line-color'] = '#C9A99B';
      else if (l.type === 'symbol') {
        var minor = /name-minor|name-path/.test(id);
        p['text-color'] = minor ? '#8A5A48' : '#684034';
        p['text-halo-color'] = BG; p['text-halo-width'] = 1.6;
      }
      if (/boundary|shield|airport|country|label_state/.test(id)) l.layout = Object.assign(l.layout || {}, { visibility: 'none' });
    });
    return style;
  }

  function badge(txt, cls, label, sub, img) {
    var d = document.createElement('div');
    d.className = 'skm-poi ' + cls + (img ? ' skm-has-photo' : '');
    var dot = img ? '<span class="skm-poi-dot skm-photo"><img src="' + img + '" alt="" width="220" height="220" loading="lazy"></span>' : '<span class="skm-poi-dot">' + txt + '</span>';
    d.innerHTML = dot + '<span class="skm-poi-tag"><b>' + label + '</b>' + (sub ? '<i>' + sub + '</i>' : '') + '</span>';
    return d;
  }

  function init() {
    fetch(STYLE).then(function (r) { return r.json(); }).then(function (style) {
      var map = new maplibregl.Map({
        container: el,
        style: recolor(style),
        center: SHOP,
        zoom: 15.4,
        minZoom: 13.2,
        maxZoom: 18.5,
        attributionControl: { compact: true },
        cooperativeGestures: true,
        locale: {
          'CooperativeGesturesHandler.WindowsHelpText': en ? 'Use Ctrl + scroll to zoom the map' : 'Utilisez Ctrl + molette pour zoomer la carte',
          'CooperativeGesturesHandler.MacHelpText': en ? 'Use ⌘ + scroll to zoom the map' : 'Utilisez ⌘ + molette pour zoomer la carte',
          'CooperativeGesturesHandler.MobileHelpText': en ? 'Use two fingers to move the map' : 'Utilisez deux doigts pour déplacer la carte'
        }
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      el._map = map;
      // the "+" button always zooms toward Skines and keeps it in the middle
      var grp = el.querySelector('.maplibregl-ctrl-group');
      if (grp) grp.addEventListener('click', function (ev) {
        var btn = ev.target.closest && ev.target.closest('.maplibregl-ctrl-zoom-in');
        if (!btn) return;
        ev.stopImmediatePropagation(); ev.preventDefault();
        map.easeTo({ center: SHOP, zoom: Math.min(map.getMaxZoom(), map.getZoom() + 1), duration: 600 });
      }, true);

      // shop: a ring exactly on the sign, a thin leader line, and the storefront card set apart (south-east, away from the parking bays)
      var shop = document.createElement('div');
      shop.className = 'skm-shop';
      shop.innerHTML = '<span class="skm-pulse"></span><span class="skm-pulse skm-pulse2"></span><span class="skm-ring"></span>' +
        '<span class="skm-card"><span class="skm-shop-photo"><img src="assets/skines-aerial.jpg" alt="Façade de Skines Head Spa &amp; Wellness" width="760" height="408"></span>' +
        '<span class="skm-shop-name"><b>SKINES</b><i>Head Spa &amp; Wellness</i></span></span>';
      shop.style.zIndex = 5;
      new maplibregl.Marker({ element: shop, anchor: 'top-left' }).setLngLat(SHOP).addTo(map);

      METRO.forEach(function (m) {
        new maplibregl.Marker({ element: badge('M', 'skm-metro', (en ? 'Metro ' : 'Métro ') + m.name, '', m.img), anchor: 'center' })
          .setLngLat(m.pos).addTo(map);
      });

      // Jean-Talon only appears when the visitor zooms out; the P sign only when zoomed in
      var farEl = badge('M', 'skm-metro', (en ? 'Metro ' : 'Métro ') + METRO_FAR.name, '', METRO_FAR.img);
      new maplibregl.Marker({ element: farEl, anchor: 'center' }).setLngLat(METRO_FAR.pos).addTo(map);
      var pEl = document.createElement('div'); pEl.className = 'skm-pwrap'; pEl.innerHTML = '<span class="skm-psign"><b>P</b><u>PARKING</u></span><span class="skm-ppost"></span>';
      new maplibregl.Marker({ element: pEl, anchor: 'bottom' }).setLngLat(PSIGN).addTo(map);
      function syncMarkers() {
        var z = map.getZoom();
        farEl.classList.toggle('skm-hide', z >= (el.clientWidth < 600 ? 13.9 : 15.4));
        pEl.classList.toggle('skm-hide', z < 17.2);   // the signboard appears only when the visitor zooms in close, together with the painted P's on the bays
      }
      map.on('zoom', syncMarkers); map.on('load', syncMarkers);

      // opening view: Skines exactly in the centre; the frame is symmetrical around it so the nearest metro stays visible
      var r = Math.max(Math.abs(METRO[0].pos[0] - SHOP[0]), Math.abs(METRO[0].pos[1] - SHOP[1]) * 1.4) * (el.clientWidth < 600 ? 1.55 : 1.02);
      var b = new maplibregl.LngLatBounds([SHOP[0] - r, SHOP[1] - r * 0.62], [SHOP[0] + r, SHOP[1] + r * 0.62]);
      function frame() { map.resize(); map.fitBounds(b, { padding: 22, maxZoom: 16.6, duration: 0 }); if (el.clientWidth < 600) { map.jumpTo({ center: [SHOP[0] - 0.00133, SHOP[1] + 0.000144], zoom: 15.23 }); }   // phones: the opening view the owner approved
        else { map.jumpTo({ center: SHOP }); } }
      frame();
      map.once('load', function () { frame(); setTimeout(frame, 350); });

      map.on('load', function () {
        var font = ['Noto Sans Regular'];
        try { var ref = map.getStyle().layers.filter(function (l) { return l.id === 'highway-name-major'; })[0]; if (ref && ref.layout && ref.layout['text-font']) font = ref.layout['text-font']; } catch (e) {}
        map.addSource('bays', { type: 'geojson', data: {
          type: 'FeatureCollection',
          features: BAYS.map(function (b, i) {
            return { type: 'Feature', properties: { n: String(i + 1) }, geometry: { type: 'Polygon', coordinates: [b.ring] } };
          }) } });
        var firstSymbol = (map.getStyle().layers.filter(function (l) { return l.type === 'symbol'; })[0] || {}).id;
        map.addLayer({ id: 'bays-fill', type: 'fill', source: 'bays', minzoom: 16.2, paint: { 'fill-color': '#E9BCA7', 'fill-opacity': 0.96 } }, firstSymbol);
        map.addLayer({ id: 'bays-line', type: 'line', source: 'bays', minzoom: 16.2, paint: { 'line-color': '#FFFFFF', 'line-width': 1.3 } }, firstSymbol);
        map.addSource('bay-p', { type: 'geojson', data: { type: 'FeatureCollection', features: BAYS.map(function (b) { return { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: b.center } }; }) } });
        map.addLayer({ id: 'bays-p', type: 'symbol', source: 'bay-p', minzoom: 17.2, layout: { 'text-field': 'P', 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 17.2, 11, 19, 21], 'text-rotation-alignment': 'map', 'text-pitch-alignment': 'map', 'text-rotate': BAY_TURN, 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { 'text-color': '#684034', 'text-opacity': 0.9 } });
        // give the Skines building its own colour (found from the map data under the entrance)
        map.once('idle', function () {
          try {
            var pt = map.project(SHOP);
            var feats = map.queryRenderedFeatures([[pt.x - 90, pt.y - 90], [pt.x + 90, pt.y + 90]], { layers: ['building'] });
            function dseg(p, a, b) {
              var px = p[0] * M_LON, py = p[1] * M_LAT, ax = a[0] * M_LON, ay = a[1] * M_LAT, bx = b[0] * M_LON, by = b[1] * M_LAT;
              var dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
              return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
            }
            function inside(p, ring) {
              var c = false;
              for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
                var xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
                if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) c = !c;
              }
              return c;
            }
            var best = null;
            feats.forEach(function (f) {
              var g = f.geometry, polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
              polys.forEach(function (poly) {
                var ring = poly[0], md = 1e9;
                for (var i = 0; i < ring.length - 1; i++) md = Math.min(md, dseg(SHOP, ring[i], ring[i + 1]));
                var score = inside(SHOP, ring) ? -1 : md;
                if (!best || score < best.score) best = { score: score, ring: ring };
              });
            });
            if (best) {
              map.addSource('skines-bldg', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [best.ring] } } });
              map.addLayer({ id: 'skines-bldg-fill', type: 'fill', source: 'skines-bldg', paint: { 'fill-color': '#C98A6D', 'fill-opacity': 0.9 } }, 'bays-fill');
              map.addLayer({ id: 'skines-bldg-line', type: 'line', source: 'skines-bldg', paint: { 'line-color': '#684034', 'line-width': 1.4 } }, 'bays-fill');
            }
          } catch (e) {}
        });
        el.classList.add('is-ready');
        setTimeout(function () { var at = el.querySelector('.maplibregl-ctrl-attrib'); if (at) { at.classList.remove('maplibregl-compact-show'); at.removeAttribute('open'); } }, 400);
      });
    }).catch(function () { /* keep the static SVG map */ });
  }

  function start() {
    loadCss(CSS);
    loadJs(JS, init);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); start(); }
    }, { rootMargin: '300px' });
    io.observe(el);
  } else {
    start();
  }
})();
