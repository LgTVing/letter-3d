import * as THREE from 'three';
import { createSamplePhotoDataUrl } from './textures.js';

export const POLAROID_W = 1.24;
export const POLAROID_H = 1.48;

function drawPolaroidFrontCanvas(img, paperColor = '#ebe5dc') {
  const w = 620;
  const h = 740;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Warm off-white textured Polaroid frame
  ctx.fillStyle = paperColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle frame grain
  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(80,68,58,0.045)';
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  // Inner photo square frame (thicker bottom border like real Polaroid)
  const pad = 42;
  const photoW = w - pad * 2;
  const photoH = photoW;

  // Inner inset shadow border
  ctx.fillStyle = 'rgba(40,30,30,0.12)';
  ctx.fillRect(pad - 2, pad - 2, photoW + 4, photoH + 4);

  if (img) {
    // Center-crop cover fit
    const aspectImg = img.width / img.height;
    let sx = 0;
    let sy = 0;
    let sw = img.width;
    let sh = img.height;
    if (aspectImg > 1) {
      sw = img.height;
      sx = (img.width - sw) / 2;
    } else if (aspectImg < 1) {
      sh = img.width;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, pad, pad, photoW, photoH);
  }

  // Subtle vintage warm film sheen over photo
  const sheen = ctx.createLinearGradient(pad, pad, pad + photoW, pad + photoH);
  sheen.addColorStop(0, 'rgba(255,250,245,0.08)');
  sheen.addColorStop(1, 'rgba(60,40,45,0.05)');
  ctx.fillStyle = sheen;
  ctx.fillRect(pad, pad, photoW, photoH);

  return canvas;
}

function drawPolaroidBackCanvas(caption, paperColor = '#ebe5dc', inkColor = '#3a3030') {
  const w = 620;
  const h = 740;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = paperColor;
  ctx.fillRect(0, 0, w, h);

  // Subtle shading & grain
  const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 40, w * 0.5, h * 0.5, w * 0.8);
  grad.addColorStop(0, 'rgba(255,255,255,0.16)');
  grad.addColorStop(1, 'rgba(110,95,85,0.12)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 2000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(80,68,58,0.045)';
    ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }

  // Centered cursive handwritten message on the back
  ctx.fillStyle = inkColor;
  ctx.font = '600 44px "Dancing Script", cursive';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxW = w - 120;
  const words = (caption || 'Kỉ niệm đáng nhớ...').trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const lh = 58;
  const startY = h * 0.48 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, idx) => {
    ctx.fillText(l, w / 2, startY + idx * lh);
  });

  return canvas;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export function createPolaroids(letter, theme, paperBump) {
  const group = new THREE.Group();
  const cards = [];

  const cardGeo = new THREE.BoxGeometry(POLAROID_W, POLAROID_H, 0.018);

  const targets = [
    { x: -2.28, y: 0.86, z: 0.14, rotZ: -0.018 },
    { x: -2.28, y: -0.82, z: 0.12, rotZ: -0.012 },
  ];

  for (let i = 0; i < 2; i++) {
    const cardGroup = new THREE.Group();
    const edgeMat = new THREE.MeshStandardMaterial({
      color: 0xe2dbd1,
      roughness: 0.9,
    });
    const frontMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      bumpMap: paperBump,
      bumpScale: 0.005,
      roughness: 0.42,
      metalness: 0.02,
    });
    const backMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      bumpMap: paperBump,
      bumpScale: 0.008,
      roughness: 0.88,
      metalness: 0.01,
    });

    // BoxGeometry material order: +x, -x, +y, -y, +z (front), -z (back)
    const mesh = new THREE.Mesh(cardGeo, [edgeMat, edgeMat, edgeMat, edgeMat, frontMat, backMat]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `polaroid-${i}`;
    mesh.userData.polaroidIndex = i;
    cardGroup.add(mesh);
    group.add(cardGroup);

    cards.push({
      index: i,
      group: cardGroup,
      mesh,
      frontMat,
      backMat,
      flipped: false,
      flipProgress: 0,
      hoverAmount: 0,
      target: targets[i],
    });
  }

  async function updatePhotos(newLetter, newTheme) {
    const photos = newLetter.photos || [];
    for (let i = 0; i < cards.length; i++) {
      const photoCfg = photos[i] || { preset: i === 0 ? 'sunset-walk' : 'starry-night', caption: '' };
      const dataUrl = photoCfg.src || createSamplePhotoDataUrl(photoCfg.preset || (i === 0 ? 'sunset-walk' : 'starry-night'));
      const img = await loadImage(dataUrl);

      const frontCanvas = drawPolaroidFrontCanvas(img, newTheme.paperColor);
      const frontTex = new THREE.CanvasTexture(frontCanvas);
      frontTex.colorSpace = THREE.SRGBColorSpace;
      frontTex.anisotropy = 8;

      if (cards[i].frontMat.map) cards[i].frontMat.map.dispose();
      cards[i].frontMat.map = frontTex;
      cards[i].frontMat.needsUpdate = true;

      const backCanvas = drawPolaroidBackCanvas(photoCfg.caption, newTheme.paperColor, newTheme.inkColor);
      const backTex = new THREE.CanvasTexture(backCanvas);
      backTex.colorSpace = THREE.SRGBColorSpace;
      backTex.anisotropy = 8;

      if (cards[i].backMat.map) cards[i].backMat.map.dispose();
      cards[i].backMat.map = backTex;
      cards[i].backMat.needsUpdate = true;
    }
  }

  function toggleFlip(index) {
    const card = cards[index];
    if (!card) return;
    card.flipped = !card.flipped;
  }

  function resetFlips() {
    cards.forEach((c) => {
      c.flipped = false;
      c.flipProgress = 0;
    });
  }

  function update(dt, revealProgress, hoveredIndex) {
    cards.forEach((card, idx) => {
      const targetFlip = card.flipped ? 1 : 0;
      card.flipProgress += (targetFlip - card.flipProgress) * Math.min(1, dt * 8.5);

      const targetHover = hoveredIndex === idx ? 1 : 0;
      card.hoverAmount += (targetHover - card.hoverAmount) * Math.min(1, dt * 10);

      // Smooth slide from behind envelope to left side of desk
      const ease = 1 - Math.pow(1 - Math.max(0, Math.min(1, revealProgress)), 3);
      const startX = -0.35 + idx * 0.15;
      const startY = -0.55 - idx * 0.18;
      const startZ = -0.22;

      const arcLift = Math.sin(card.flipProgress * Math.PI) * 0.34;
      const hoverLift = card.hoverAmount * 0.08;

      card.group.position.set(
        THREE.MathUtils.lerp(startX, card.target.x, ease),
        THREE.MathUtils.lerp(startY, card.target.y, ease) + hoverLift * 0.35,
        THREE.MathUtils.lerp(startZ, card.target.z, ease) + arcLift + hoverLift
      );

      card.group.rotation.y = card.flipProgress * Math.PI;
      card.group.rotation.z = THREE.MathUtils.lerp(0.14 - idx * 0.08, card.target.rotZ, ease);
      card.group.scale.setScalar(THREE.MathUtils.lerp(0.65, 1.0 + card.hoverAmount * 0.03, ease));
      card.group.visible = revealProgress > 0.02;
    });
  }

  updatePhotos(letter, theme);

  return {
    group,
    cards,
    updatePhotos,
    toggleFlip,
    resetFlips,
    update,
  };
}
