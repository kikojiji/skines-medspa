// Server-side luxury participant card generator.
// Portrait layout (800×1100). Fonts bundled as TTF files for Vercel Linux.

import sharp from 'sharp';
import { FONT_SANS_B64, FONT_BOLD_B64 } from './fonts.js';

// ── Logo cache (fetched once per warm instance) ───────────────────────────────
let _logoPromise = null;
function cachedLogoB64() {
  if (_logoPromise) return _logoPromise;
  _logoPromise = fetch('https://skines.ca/assets/images/logo-officiel-cropped.PNG')
    .then(r => r.arrayBuffer())
    .then(buf => Buffer.from(buf).toString('base64'))
    .catch(() => null);
  return _logoPromise;
}

// ── XML escape ─────────────────────────────────────────────────────────────────
function x(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── SVG card builder — PORTRAIT 800×1100 ──────────────────────────────────────
function buildSvg({ logoB64, photoB64, photoMime, rows }) {
  const fontSansB64  = FONT_SANS_B64;
  const fontSerifB64 = FONT_BOLD_B64;
  const W = 800, H = 1100;
  const PAD = 18;
  const CX = PAD, CY = PAD;
  const CW = W - PAD * 2;   // 764
  const CH = H - PAD * 2;   // 1064
  const R  = 20;
  const CTR = W / 2;        // 400

  // Header
  const LOGO_W = 52, LOGO_H = 52;
  const LOGO_X = CTR - LOGO_W / 2;
  const LOGO_Y = CY + 26;

  const TITLE_Y  = CY + 106;
  const ORN_Y    = CY + 130;
  const SUB_Y    = CY + 162;
  const HEAD_SEP = CY + 182;

  // Photo
  const PHOTO_W  = 280, PHOTO_H = 350;
  const PHOTO_X  = CTR - PHOTO_W / 2;
  const PHOTO_Y  = HEAD_SEP + 24;

  // Badge
  const BADGE_R  = 24;
  const BADGE_CX = CTR;
  const BADGE_CY = PHOTO_Y + PHOTO_H;

  // Info rows
  const INFO_X   = CX + 52;
  const INFO_X2  = CX + 98;  // text after icon
  const INFO_Y   = BADGE_CY + BADGE_R + 20;
  const ROW_H    = 52;
  const ICON_R   = 17;

  // Footer
  const FOOTER_H   = 42;
  const FOOTER_SEP = CY + CH - FOOTER_H;
  const FOOTER_MID = FOOTER_SEP + 26;

  // ── Font face defs ───────────────────────────────────────────────────────────
  const fontFaces = `
    @font-face { font-family: 'CardSans'; font-weight: 400;
      src: url('data:font/truetype;base64,${fontSansB64}') format('truetype'); }
    @font-face { font-family: 'CardSans'; font-weight: 700;
      src: url('data:font/truetype;base64,${fontSerifB64}') format('truetype'); }`;

  // ── Info rows SVG ────────────────────────────────────────────────────────────
  const rowSvg = rows.map(([label, value], i) => {
    const ry   = INFO_Y + i * ROW_H;
    const icx  = CX + 36;
    const icy  = ry + ROW_H / 2;
    const sepY = ry + ROW_H - 1;
    return `
  <circle cx="${icx}" cy="${icy}" r="${ICON_R}"
          fill="rgba(182,106,90,0.07)" stroke="rgba(182,106,90,0.22)" stroke-width="1"/>
  <line x1="${INFO_X}" y1="${sepY}" x2="${CX + CW - 36}" y2="${sepY}"
        stroke="rgba(182,106,90,0.09)" stroke-width="1"/>
  <text x="${INFO_X2}" y="${ry + 18}" class="lbl">${x(label.toUpperCase())}</text>
  <text x="${INFO_X2}" y="${ry + 38}" class="val">${x(value)}</text>`;
  }).join('');

  // ── Ornament ─────────────────────────────────────────────────────────────────
  const ORN_HALF = 58;

  // ── Logo / photo ─────────────────────────────────────────────────────────────
  const logoSvg = logoB64
    ? `<image href="data:image/png;base64,${logoB64}"
         x="${LOGO_X}" y="${LOGO_Y}" width="${LOGO_W}" height="${LOGO_H}"
         preserveAspectRatio="xMidYMid meet"/>`
    : `<text x="${CTR}" y="${LOGO_Y + 38}" class="logo-fallback">SKINES</text>`;

  const photoSvg = photoB64
    ? `<image href="data:${photoMime || 'image/jpeg'};base64,${photoB64}"
         x="${PHOTO_X}" y="${PHOTO_Y}" width="${PHOTO_W}" height="${PHOTO_H}"
         preserveAspectRatio="xMidYMid slice"
         clip-path="url(#photoClip)"/>`
    : `<rect x="${PHOTO_X}" y="${PHOTO_Y}" width="${PHOTO_W}" height="${PHOTO_H}"
             rx="14" ry="14" fill="#F5EDE3"/>
       <text x="${CTR}" y="${PHOTO_Y + PHOTO_H / 2 + 5}"
             class="no-photo">NO PHOTO</text>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
<defs>
  <clipPath id="cardClip">
    <rect x="${CX}" y="${CY}" width="${CW}" height="${CH}" rx="${R}" ry="${R}"/>
  </clipPath>
  <clipPath id="photoClip">
    <rect x="${PHOTO_X}" y="${PHOTO_Y}" width="${PHOTO_W}" height="${PHOTO_H}"
          rx="14" ry="14"/>
  </clipPath>
  <style>
    ${fontFaces}
    .lbl  { font-family: 'CardSans', sans-serif; font-size: 8px; font-weight: 700;
            letter-spacing: 2px; fill: rgba(106,90,80,0.44); }
    .val  { font-family: 'CardSans', sans-serif; font-size: 15px; font-weight: 400; fill: #3A1E14; }
    .title { font-family: 'CardSans', sans-serif; font-size: 20px; font-weight: 700;
             letter-spacing: 4px; fill: #3A1E14; text-anchor: middle; }
    .sub  { font-family: 'CardSans', sans-serif; font-size: 9px; font-weight: 400;
             letter-spacing: 2px; fill: #B66A5A; text-anchor: middle; }
    .footer-txt { font-family: 'CardSans', sans-serif; font-size: 8px; font-weight: 400;
                  letter-spacing: 2px; fill: rgba(106,90,80,0.38); text-anchor: middle; }
    .no-photo { font-family: 'CardSans', sans-serif; font-size: 9px; font-weight: 400;
                letter-spacing: 3px; fill: #C9A090; text-anchor: middle; }
    .logo-fallback { font-family: 'CardSans', sans-serif; font-size: 16px; font-weight: 700;
                     letter-spacing: 6px; fill: #3A1E14; text-anchor: middle; }
  </style>
</defs>

<!-- Cream background -->
<rect width="${W}" height="${H}" fill="#EDE6DF"/>

<!-- White card -->
<rect x="${CX}" y="${CY}" width="${CW}" height="${CH}"
      rx="${R}" ry="${R}" fill="#FFFFFF"/>

<g clip-path="url(#cardClip)">

  <!-- ── HEADER ── -->
  ${logoSvg}
  <text x="${CTR}" y="${TITLE_Y}" class="title">NEW GIVEAWAY ENTRY</text>
  <line x1="${CTR - ORN_HALF}" y1="${ORN_Y}" x2="${CTR - 9}" y2="${ORN_Y}"
        stroke="#D4B896" stroke-width="1"/>
  <rect x="${CTR - 4}" y="${ORN_Y - 4}" width="8" height="8" fill="#C9973A"
        transform="rotate(45 ${CTR} ${ORN_Y})"/>
  <line x1="${CTR + 9}" y1="${ORN_Y}" x2="${CTR + ORN_HALF}" y2="${ORN_Y}"
        stroke="#D4B896" stroke-width="1"/>
  <text x="${CTR}" y="${SUB_Y}" class="sub">SKINE'S MED SPA &amp; WELLNESS</text>
  <line x1="${CX + 40}" y1="${HEAD_SEP}" x2="${CX + CW - 40}" y2="${HEAD_SEP}"
        stroke="rgba(182,106,90,0.11)" stroke-width="1"/>

  <!-- ── PHOTO ── -->
  ${photoSvg}
  <rect x="${PHOTO_X}" y="${PHOTO_Y}" width="${PHOTO_W}" height="${PHOTO_H}"
        rx="14" ry="14" fill="none" stroke="#C9A97A" stroke-width="2"/>

  <!-- Badge circle -->
  <circle cx="${BADGE_CX}" cy="${BADGE_CY}" r="${BADGE_R}"
          fill="#FFFFFF" stroke="rgba(182,106,90,0.28)" stroke-width="1.5"/>
  ${logoB64 ? `<image href="data:image/png;base64,${logoB64}"
       x="${BADGE_CX - 14}" y="${BADGE_CY - 14}" width="28" height="28"
       preserveAspectRatio="xMidYMid meet"/>` : ''}

  <!-- ── INFO ROWS ── -->
  ${rowSvg}

  <!-- ── FOOTER ── -->
  <rect x="${CX}" y="${FOOTER_SEP}" width="${CW}" height="${FOOTER_H}" fill="#FDFAF7"/>
  <line x1="${CX}" y1="${FOOTER_SEP}" x2="${CX + CW}" y2="${FOOTER_SEP}"
        stroke="rgba(182,106,90,0.09)" stroke-width="1"/>
  <text x="${CTR}" y="${FOOTER_MID}" class="footer-txt">
    GENERATED AUTOMATICALLY · SKINE'S GIVEAWAY · MONTREAL, CANADA
  </text>

</g>
</svg>`;
}

// ── Public API ─────────────────────────────────────────────────────────────────
export async function generateCard({
  firstName, lastName, phone, email, username, service,
  submittedAt, deviceType, browser, ip, location,
  photoBase64, photoType,
}) {
  const logoB64 = await cachedLogoB64();

  const deviceStr = [deviceType, browser].filter(Boolean).join('  ·  ') || null;
  const ipClean   = ip && ip !== 'unknown' ? ip : null;

  const rawRows = [
    ['Full Name',          `${firstName || ''} ${lastName || ''}`.trim()],
    ['Phone Number',       phone || null],
    ['Email Address',      email || null],
    ['Instagram / TikTok', username || null],
    ['Treatment Interest', service || null],
    ['Submitted',          submittedAt || null],
    ['Device',             deviceStr],
    ['Location',           location || null],
    ['IP Address',         ipClean],
  ].filter(([, v]) => v);

  const svg = buildSvg({
    logoB64,
    photoB64:  photoBase64 || null,
    photoMime: photoType || 'image/jpeg',
    rows:      rawRows,
  });

  return sharp(Buffer.from(svg))
    .png({ compressionLevel: 6 })
    .toBuffer();
}
