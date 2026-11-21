import * as THREE from 'three';

/**
 * Generates a fine cotton-paper bump texture for realistic tactile grain on envelopes & stationery.
 */
export function createPaperBumpTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 28;
    const v = Math.max(0, Math.min(255, 128 + n));
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // Subtle horizontal fiber lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 120; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 10 + Math.random() * 32;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (Math.random() - 0.5) * 4);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/**
 * Renders the front of the envelope: cotton grain, sender, recipient, address lines,
 * circular botanical postmark, perforated heart postage stamp, and wavy cancellation lines.
 */
export function createEnvelopeFrontTexture(letter, theme) {
  const w = 1400;
  const h = 920;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Base dusty-rose paper
  ctx.fillStyle = theme.envelopeColor;
  ctx.fillRect(0, 0, w, h);

  // Soft cotton vignette + subtle noise speckles
  const grad = ctx.createRadialGradient(w * 0.45, h * 0.42, 80, w * 0.5, h * 0.5, w * 0.72);
  grad.addColorStop(0, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(90,50,50,0.10)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 4200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(60,30,30,0.045)';
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  // Top-left sender in Dancing Script
  ctx.save();
  ctx.fillStyle = theme.inkColor;
  ctx.font = '600 62px "Dancing Script", cursive';
  ctx.textBaseline = 'top';
  ctx.fillText(letter.sender || '', 84, 58);
  ctx.restore();

  // Center recipient name + 3 delicate horizontal lines
  ctx.save();
  ctx.fillStyle = theme.inkColor;
  ctx.font = '600 84px "Dancing Script", cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(letter.recipient || '', w * 0.47, 512);

  ctx.strokeStyle = 'rgba(70, 48, 48, 0.22)';
  ctx.lineWidth = 2.2;
  const lineStart = 390;
  const lineEnd = 1130;
  [615, 698, 780].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(lineStart, y);
    ctx.lineTo(lineEnd, y);
    ctx.stroke();
  });
  ctx.restore();

  // Perforated Postage Stamp (top-right)
  const sx = 1122;
  const sy = 62;
  const sw = 188;
  const sh = 224;
  ctx.save();
  // Soft shadow under stamp
  ctx.shadowColor = 'rgba(75, 42, 42, 0.16)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;

  // Scalloped stamp border path
  ctx.fillStyle = '#f8f2ec';
  ctx.beginPath();
  ctx.rect(sx, sy, sw, sh);
  ctx.fill();
  ctx.restore();

  // Punch semicircular perforations around stamp edges
  ctx.save();
  ctx.fillStyle = theme.envelopeColor;
  const step = 18;
  for (let x = sx + 9; x < sx + sw; x += step) {
    ctx.beginPath();
    ctx.arc(x, sy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, sy + sh, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let y = sy + 9; y < sy + sh; y += step) {
    ctx.beginPath();
    ctx.arc(sx, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sx + sw, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stamp inner blush rectangle
  ctx.fillStyle = '#f3cad1';
  ctx.fillRect(sx + 16, sy + 16, sw - 32, sh - 46);

  // Tiny floating hearts inside stamp
  const drawMiniHeart = (cx, cy, size, color) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.35);
    ctx.bezierCurveTo(-size, -size * 0.35, -size * 0.5, -size * 1.15, 0, -size * 0.45);
    ctx.bezierCurveTo(size * 0.5, -size * 1.15, size, -size * 0.35, 0, size * 0.35);
    ctx.fill();
    ctx.restore();
  };
  drawMiniHeart(sx + 48, sy + 48, 8, '#dc7b8c');
  drawMiniHeart(sx + 146, sy + 52, 6.5, '#dc7b8c');
  drawMiniHeart(sx + 52, sy + 150, 6, '#e18e9d');
  drawMiniHeart(sx + 140, sy + 146, 7, '#e18e9d');

  // Main crimson heart in center of stamp
  drawMiniHeart(sx + sw / 2, sy + 124, 46, '#c72a41');

  // "LOVE · POST" stamp caption
  ctx.fillStyle = '#5a4345';
  ctx.font = '600 13px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LOVE · POST', sx + sw / 2, sy + sh - 12);
  ctx.restore();

  // Circular Botanical Postmark to left of stamp
  const px = 998;
  const py = 216;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-0.14);
  ctx.strokeStyle = 'rgba(72, 48, 56, 0.65)';
  ctx.fillStyle = 'rgba(72, 48, 56, 0.72)';

  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 102, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 84, 0, Math.PI * 2);
  ctx.stroke();

  // Top curved label
  ctx.font = '600 17px "Be Vietnam Pro", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BOTANICAL POST', 0, -34);

  // Center date
  const postDate = extractShortDate(letter.date) || letter.postmarkDate || '19.11.2026';
  ctx.font = '600 26px "Playfair Display", Georgia, serif';
  ctx.fillText(postDate, 0, 10);

  // Tiny botanical leaf sprig at bottom of stamp
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-26, 44);
  ctx.quadraticCurveTo(0, 34, 26, 44);
  ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(i * 10, 41 + Math.abs(i) * 1.5, 6, 3, i * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Wavy cancellation lines overlapping stamp
  ctx.save();
  ctx.strokeStyle = 'rgba(65, 44, 52, 0.62)';
  ctx.lineWidth = 3;
  for (let row = 0; row < 4; row++) {
    const baseY = 122 + row * 34;
    ctx.beginPath();
    for (let x = 1098; x <= 1368; x += 6) {
      const y = baseY + Math.sin((x - 1098) * 0.055) * 9;
      if (x === 1098) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function extractShortDate(dateStr) {
  if (!dateStr) return null;
  const nums = dateStr.match(/\d+/g);
  if (nums && nums.length >= 3) {
    return `${nums[0].padStart(2, '0')}.${nums[1].padStart(2, '0')}.${nums[2]}`;
  }
  return null;
}

/**
 * Generates artistic illustrated Polaroid sample photos so default demo looks warm & romantic
 * without relying on external image URLs.
 */
export function createSamplePhotoDataUrl(preset = 'sunset-walk') {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  if (preset === 'sunset-walk') {
    // Dreamy pastel golden-hour coastal sky & silhouettes
    const sky = ctx.createLinearGradient(0, 0, 0, 640);
    sky.addColorStop(0, '#c8d7eb');
    sky.addColorStop(0.45, '#f2d3cf');
    sky.addColorStop(0.75, '#f4c7a9');
    sky.addColorStop(1, '#d2a29e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 640, 640);

    // Glowing setting sun
    const sun = ctx.createRadialGradient(320, 355, 10, 320, 355, 165);
    sun.addColorStop(0, 'rgba(255, 248, 228, 0.95)');
    sun.addColorStop(0.35, 'rgba(255, 224, 185, 0.55)');
    sun.addColorStop(1, 'rgba(255, 200, 175, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, 640, 640);

    // Distant mountain silhouettes
    ctx.fillStyle = 'rgba(138, 104, 122, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, 415);
    ctx.quadraticCurveTo(130, 335, 270, 390);
    ctx.quadraticCurveTo(430, 320, 640, 395);
    ctx.lineTo(640, 640);
    ctx.lineTo(0, 640);
    ctx.fill();

    // Calm reflective sea
    const sea = ctx.createLinearGradient(0, 410, 0, 640);
    sea.addColorStop(0, '#c99ba6');
    sea.addColorStop(0.5, '#b2879a');
    sea.addColorStop(1, '#84647a');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 412, 640, 228);

    // Sun shimmer on water
    ctx.fillStyle = 'rgba(255, 240, 215, 0.55)';
    for (let i = 0; i < 16; i++) {
      const y = 425 + i * 12;
      const w = Math.max(20, 140 - i * 6 + Math.sin(i * 2.1) * 18);
      ctx.fillRect(320 - w / 2, y, w, 3.5);
    }

    // Soft clouds
    ctx.fillStyle = 'rgba(255, 246, 242, 0.55)';
    const cloud = (cx, cy, r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.arc(cx + r * 0.9, cy + 6, r * 0.78, 0, Math.PI * 2);
      ctx.arc(cx - r * 0.8, cy + 8, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
    };
    cloud(160, 155, 42);
    cloud(475, 190, 36);

    // Warm couple holding hands silhouette on pier
    ctx.fillStyle = '#473445';
    ctx.fillRect(0, 560, 640, 80);
    // Person 1
    ctx.beginPath();
    ctx.arc(286, 468, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(262, 494, 48, 72, 16);
    ctx.fill();
    // Person 2
    ctx.beginPath();
    ctx.arc(348, 480, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(327, 504, 44, 62, 16);
    ctx.fill();
    // Little floating heart between them
    ctx.fillStyle = 'rgba(255, 225, 232, 0.85)';
    ctx.beginPath();
    ctx.moveTo(317, 456);
    ctx.bezierCurveTo(304, 444, 309, 431, 317, 441);
    ctx.bezierCurveTo(325, 431, 330, 444, 317, 456);
    ctx.fill();
  } else {
    // Cozy starry sakura evening memory
    const bg = ctx.createLinearGradient(0, 0, 0, 640);
    bg.addColorStop(0, '#2e3352');
    bg.addColorStop(0.55, '#594b72');
    bg.addColorStop(1, '#c78c9c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 640, 640);

    // Crescent moon
    ctx.fillStyle = '#fff5d8';
    ctx.beginPath();
    ctx.arc(485, 145, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#383a5c';
    ctx.beginPath();
    ctx.arc(504, 134, 42, 0, Math.PI * 2);
    ctx.fill();

    // Twinkling stars
    for (let i = 0; i < 65; i++) {
      const x = Math.random() * 640;
      const y = Math.random() * 380;
      const r = 1 + Math.random() * 2.2;
      ctx.fillStyle = `rgba(255, 248, 235, ${0.35 + Math.random() * 0.65})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft blossom branch silhouette in foreground top-left
    ctx.strokeStyle = '#2d2238';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, 120);
    ctx.quadraticCurveTo(140, 150, 290, 215);
    ctx.stroke();

    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(120, 154);
    ctx.quadraticCurveTo(180, 100, 240, 82);
    ctx.stroke();

    // Pink sakura clusters
    const blossoms = [
      [80, 130, 26], [135, 148, 30], [185, 120, 24],
      [230, 92, 26], [210, 185, 28], [275, 212, 24],
      [155, 178, 20], [52, 165, 22],
    ];
    blossoms.forEach(([bx, by, br]) => {
      const g = ctx.createRadialGradient(bx, by, 2, bx, by, br);
      g.addColorStop(0, '#ffd8e4');
      g.addColorStop(0.7, '#f2a2ba');
      g.addColorStop(1, 'rgba(242, 162, 186, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    });

    // Warm glowing lantern lights along bottom horizon
    ctx.fillStyle = '#2c233a';
    ctx.beginPath();
    ctx.moveTo(0, 500);
    ctx.quadraticCurveTo(220, 455, 420, 495);
    ctx.quadraticCurveTo(540, 470, 640, 490);
    ctx.lineTo(640, 640);
    ctx.lineTo(0, 640);
    ctx.fill();

    const lanterns = [
      [140, 435, 22], [240, 390, 18], [340, 415, 26], [450, 375, 16], [535, 425, 20],
    ];
    lanterns.forEach(([lx, ly, lr]) => {
      const glow = ctx.createRadialGradient(lx, ly, 2, lx, ly, lr * 2.2);
      glow.addColorStop(0, 'rgba(255, 232, 175, 0.95)');
      glow.addColorStop(0.4, 'rgba(255, 190, 125, 0.45)');
      glow.addColorStop(1, 'rgba(255, 160, 110, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, ly, lr * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffe7b3';
      ctx.beginPath();
      ctx.roundRect(lx - lr * 0.42, ly - lr * 0.52, lr * 0.84, lr * 1.04, 6);
      ctx.fill();
    });
  }

  // Soft vintage film grain
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(20,10,20,0.045)';
    ctx.fillRect(Math.random() * 640, Math.random() * 640, 2, 2);
  }

  return canvas.toDataURL('image/png');
}
