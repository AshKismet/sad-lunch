// Generates Burnt Dad PWA icons (icon-192.png, icon-512.png) by rendering the
// site's Bella + Maxi pixel-art characters onto an orange (#FF8C00) background.
//
//   node scripts/make-icons.js
//
// drawBella / drawMaxi / px are copied verbatim from index.html so the icons
// match the characters on the site exactly.

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const ORANGE = '#FF8C00';
const OUT_DIR = path.join(__dirname, '..');

// ── Character drawing (verbatim from index.html) ───────────────────────────
function px(ctx, color, x, y, w = 1, h = 1) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); }

function drawBella(ctx) {
  ctx.clearRect(0,0,32,32);
  const K='#111111',W='#ffffff',HW='#f8f8f8',HB='#d0d0d0',HS='#f5c842';
  const FO='#FF8C42',FL='#FFB366',FD='#CC5500',FM='#FFD4A8';
  const NP='#FF5577',EY='#22CC44',EP='#FF99BB';
  px(ctx,HW,9,0,14,1);px(ctx,HW,7,1,18,1);px(ctx,HW,6,2,20,3);px(ctx,HW,7,5,18,1);px(ctx,HB,8,5,16,1);px(ctx,HS,7,6,18,2);
  px(ctx,FO,5,7,4,1);px(ctx,FO,4,8,5,1);px(ctx,FO,3,9,4,2);px(ctx,EP,5,8,2,1);px(ctx,EP,4,9,2,2);
  px(ctx,FO,23,7,4,1);px(ctx,FO,23,8,5,1);px(ctx,FO,25,9,4,2);px(ctx,EP,25,8,2,1);px(ctx,EP,26,9,2,2);
  px(ctx,FO,6,11,20,14);px(ctx,FL,8,11,16,4);px(ctx,FD,6,13,2,10);px(ctx,FD,24,13,2,10);px(ctx,FM,10,19,12,5);px(ctx,FM,9,20,14,3);
  px(ctx,K,6,11,1,14);px(ctx,K,25,11,1,14);px(ctx,K,7,10,18,1);px(ctx,K,7,25,18,1);
  px(ctx,W,9,14,5,4);px(ctx,EY,10,15,3,2);px(ctx,K,11,15,1,1);px(ctx,K,9,14,5,1);px(ctx,K,9,18,5,1);px(ctx,K,9,14,1,4);px(ctx,K,13,14,1,4);
  px(ctx,W,18,14,5,4);px(ctx,EY,19,15,3,2);px(ctx,K,20,15,1,1);px(ctx,K,18,14,5,1);px(ctx,K,18,18,5,1);px(ctx,K,18,14,1,4);px(ctx,K,22,14,1,4);
  px(ctx,W,12,15,1,1);px(ctx,W,21,15,1,1);
  px(ctx,NP,14,20,4,2);px(ctx,NP,15,19,2,1);px(ctx,K,14,20,4,1);px(ctx,K,14,20,1,2);px(ctx,K,17,20,1,2);px(ctx,K,14,22,4,1);
  px(ctx,K,16,22,1,2);px(ctx,K,13,23,3,1);px(ctx,K,17,23,3,1);
  px(ctx,K,3,21,6,1);px(ctx,K,23,21,6,1);px(ctx,K,3,23,6,1);px(ctx,K,23,23,6,1);
  px(ctx,FO,8,25,16,6);px(ctx,FL,10,25,12,2);px(ctx,FM,11,27,10,3);
  px(ctx,K,8,25,1,6);px(ctx,K,23,25,1,6);px(ctx,K,8,31,16,1);
  px(ctx,FO,7,30,4,2);px(ctx,FO,21,30,4,2);px(ctx,NP,8,31,1,1);px(ctx,NP,9,31,1,1);px(ctx,NP,22,31,1,1);px(ctx,NP,23,31,1,1);
}

function drawMaxi(ctx) {
  ctx.clearRect(0,0,32,32);
  const K='#111111',W='#ffffff',HW='#f8f8f8',HS='#f5c842';
  const FG='#C8860A',FL='#F0B030',FD='#8B5E00',FC='#FDE8A0';
  const NB='#222222',EY='#7A3B00',TG='#FF4444';
  px(ctx,HW,9,0,14,1);px(ctx,HW,7,1,18,1);px(ctx,HW,6,2,20,3);px(ctx,HW,7,5,18,1);px(ctx,HS,7,6,18,2);
  px(ctx,FL,3,8,5,1);px(ctx,FG,2,9,6,2);px(ctx,FG,2,11,5,3);px(ctx,FD,3,9,1,5);
  px(ctx,FL,24,8,5,1);px(ctx,FG,24,9,6,2);px(ctx,FG,25,11,5,3);px(ctx,FD,28,9,1,5);
  px(ctx,FG,6,10,20,15);px(ctx,FL,8,10,16,5);px(ctx,FD,6,12,2,11);px(ctx,FD,24,12,2,11);
  px(ctx,FC,9,19,14,5);px(ctx,FC,8,20,16,3);
  px(ctx,K,6,10,1,15);px(ctx,K,25,10,1,15);px(ctx,K,7,9,18,1);px(ctx,K,7,25,18,1);
  px(ctx,W,9,13,5,4);px(ctx,EY,10,14,3,2);px(ctx,K,11,14,1,1);px(ctx,K,9,13,5,1);px(ctx,K,9,17,5,1);px(ctx,K,9,13,1,4);px(ctx,K,13,13,1,4);px(ctx,W,12,14,1,1);
  px(ctx,W,18,13,5,4);px(ctx,EY,19,14,3,2);px(ctx,K,20,14,1,1);px(ctx,K,18,13,5,1);px(ctx,K,18,17,5,1);px(ctx,K,18,13,1,4);px(ctx,K,22,13,1,4);px(ctx,W,21,14,1,1);
  px(ctx,NB,13,19,6,3);px(ctx,NB,12,20,8,2);px(ctx,W,14,20,2,1);
  px(ctx,K,16,22,1,2);px(ctx,K,12,23,4,1);px(ctx,K,17,23,4,1);
  px(ctx,TG,14,24,4,2);px(ctx,TG,13,23,6,2);
  px(ctx,FG,8,25,16,6);px(ctx,FL,10,25,12,2);px(ctx,FC,11,27,10,3);
  px(ctx,K,8,25,1,6);px(ctx,K,23,25,1,6);px(ctx,K,8,31,16,1);
  px(ctx,FG,7,29,5,3);px(ctx,FG,20,29,5,3);px(ctx,FC,8,30,3,2);px(ctx,FC,21,30,3,2);
}

// Render one character (32x32) onto its own transparent canvas.
function charCanvas(drawFn) {
  const c = createCanvas(32, 32);
  drawFn(c.getContext('2d'));
  return c;
}

// Compose the full icon at the given size.
function makeIcon(size) {
  const GAP = 4;          // gap between characters, in character units
  const LAYOUT_W = 32 + GAP + 32;
  // Largest integer scale that keeps the pair within ~90% of the icon width.
  const scale = Math.max(1, Math.floor((size * 0.9) / LAYOUT_W));

  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;   // crisp pixel-art scaling

  // Orange background.
  ctx.fillStyle = ORANGE;
  ctx.fillRect(0, 0, size, size);

  const bella = charCanvas(drawBella);
  const maxi = charCanvas(drawMaxi);

  const drawnW = LAYOUT_W * scale;
  const drawnH = 32 * scale;
  const offX = Math.round((size - drawnW) / 2);
  const offY = Math.round((size - drawnH) / 2);

  ctx.drawImage(bella, 0, 0, 32, 32, offX, offY, 32 * scale, 32 * scale);
  ctx.drawImage(maxi, 0, 0, 32, 32, offX + (32 + GAP) * scale, offY, 32 * scale, 32 * scale);

  return canvas.toBuffer('image/png');
}

for (const size of [192, 512]) {
  const buf = makeIcon(size);
  const file = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(file, buf);
  console.log(`wrote ${file} (${size}x${size}, ${buf.length} bytes)`);
}
