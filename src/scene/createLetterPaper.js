import * as THREE from 'three';

export const PAPER_W = 2.68;
export const PAPER_H = 3.74;

/**
 * Creates a smooth 3D crimson heart sticker mesh.
 */
function createHeartSticker() {
  const s = 0.095;
  const shape = new THREE.Shape();
  shape.moveTo(0, -1.05 * s);
  shape.bezierCurveTo(-1.35 * s, -0.15 * s, -1.55 * s, 1.05 * s, -0.68 * s, 1.18 * s);
  shape.bezierCurveTo(-0.22 * s, 1.24 * s, 0, 0.86 * s, 0, 0.64 * s);
  shape.bezierCurveTo(0, 0.86 * s, 0.22 * s, 1.24 * s, 0.68 * s, 1.18 * s);
  shape.bezierCurveTo(1.55 * s, 1.05 * s, 1.35 * s, -0.15 * s, 0, -1.05 * s);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.025,
    bevelEnabled: true,
    bevelThickness: 0.024,
    bevelSize: 0.018,
    bevelSegments: 5,
    curveSegments: 24,
  });
  geo.center();

  const mat = new THREE.MeshPhysicalMaterial({
    color: 0xc21e38,
    emissive: 0x3b050e,
    emissiveIntensity: 0.22,
    roughness: 0.2,
    metalness: 0.04,
    clearcoat: 0.95,
    clearcoatRoughness: 0.14,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

/**
 * Creates a plane half-sheet with subtle deckle (hand-torn) outer edges.
 */
function createHalfSheetGeometry(isTop) {
  const w = PAPER_W;
  const h = PAPER_H / 2;
  const segX = 28;
  const segY = 20;
  const geo = new THREE.PlaneGeometry(w, h, segX, segY);

  // Shift so hinge lies cleanly at y = 0
  geo.translate(0, isTop ? h / 2 : -h / 2, 0);

  // Adjust UV v-range: top half gets [0.5, 1.0], bottom half gets [0.0, 0.5]
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const v = uv.getY(i);
    uv.setY(i, isTop ? 0.5 + v * 0.5 : v * 0.5);
  }

  // Subtle organic deckle edge displacement on outer borders
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const onLeftRight = Math.abs(Math.abs(x) - w / 2) < 0.002;
    const onOuterY = isTop ? Math.abs(y - h) < 0.002 : Math.abs(y + h) < 0.002;
    if (onLeftRight) {
      const jitter = Math.sin(y * 19.3 + x * 7.1) * 0.012 + Math.cos(y * 37.7) * 0.007;
      pos.setX(i, x + jitter);
    }
    if (onOuterY) {
      const jitter = Math.sin(x * 23.1 + y * 5.3) * 0.011 + Math.cos(x * 41.2) * 0.006;
      pos.setY(i, y + jitter);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

export function createLetterPaper(letter, theme, paperBump) {
  const root = new THREE.Group();

  const canvasW = 1024;
  const canvasH = 1430;
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');

  // Pre-rendered blank paper background layer (for blazing fast handwriting redraws)
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = canvasW;
  bgCanvas.height = canvasH;
  const bgCtx = bgCanvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const paperFrontMat = new THREE.MeshStandardMaterial({
    map: texture,
    bumpMap: paperBump,
    bumpScale: 0.012,
    roughness: 0.9,
    metalness: 0.01,
  });

  const paperBackMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(theme.paperColor),
    bumpMap: paperBump,
    bumpScale: 0.012,
    roughness: 0.92,
    metalness: 0.01,
  });

  // Top half (fixed at y = 0..+H/2)
  const topGroup = new THREE.Group();
  const topGeo = createHalfSheetGeometry(true);
  const topFront = new THREE.Mesh(topGeo, paperFrontMat);
  topFront.castShadow = true;
  topFront.receiveShadow = true;
  topFront.name = 'letter-paper';
  topGroup.add(topFront);

  const topBack = new THREE.Mesh(topGeo, paperBackMat);
  topBack.rotation.y = Math.PI;
  topBack.position.z = -0.003;
  topBack.name = 'letter-paper';
  topGroup.add(topBack);
  root.add(topGroup);

  // Bottom half pivoted at horizontal fold crease y = 0
  const bottomPivot = new THREE.Group();
  const bottomGeo = createHalfSheetGeometry(false);
  const bottomFront = new THREE.Mesh(bottomGeo, paperFrontMat);
  bottomFront.castShadow = true;
  bottomFront.receiveShadow = true;
  bottomFront.name = 'letter-paper';
  bottomPivot.add(bottomFront);

  const bottomBack = new THREE.Mesh(bottomGeo, paperBackMat);
  bottomBack.rotation.y = Math.PI;
  bottomBack.position.z = -0.003;
  bottomBack.name = 'letter-paper';
  bottomPivot.add(bottomBack);
  root.add(bottomPivot);

  // 3D Glossy Crimson Heart Sticker beneath the sign-off
  const heartSticker = createHeartSticker();
  heartSticker.position.set(0.62, -1.42, 0.028);
  heartSticker.scale.setScalar(0.0001);
  heartSticker.visible = false;
  bottomPivot.add(heartSticker);

  // Internal layout state for handwriting progress
  let layoutLines = [];
  let totalCharLength = 1;
  let currentTheme = theme;
  let currentLetter = letter;
  let lastProgress = -1;

  function renderPaperBackground() {
    bgCtx.fillStyle = currentTheme.paperColor;
    bgCtx.fillRect(0, 0, canvasW, canvasH);

    // Subtle warm paper shading around edges
    const grad = bgCtx.createRadialGradient(
      canvasW * 0.5,
      canvasH * 0.45,
      120,
      canvasW * 0.5,
      canvasH * 0.5,
      canvasW * 0.85
    );
    grad.addColorStop(0, 'rgba(255,255,255,0.22)');
    grad.addColorStop(1, 'rgba(130,108,96,0.12)');
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, canvasW, canvasH);

    // Paper fiber speckles
    for (let i = 0; i < 4800; i++) {
      bgCtx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(95,78,68,0.048)';
      bgCtx.fillRect(Math.random() * canvasW, Math.random() * canvasH, 2, 2);
    }

    // Subtle horizontal fold crease across middle (y = canvasH / 2)
    const midY = canvasH / 2;
    const creaseGrad = bgCtx.createLinearGradient(0, midY - 22, 0, midY + 22);
    creaseGrad.addColorStop(0, 'rgba(110,90,82,0)');
    creaseGrad.addColorStop(0.45, 'rgba(110,90,82,0.085)');
    creaseGrad.addColorStop(0.52, 'rgba(255,255,255,0.24)');
    creaseGrad.addColorStop(1, 'rgba(110,90,82,0)');
    bgCtx.fillStyle = creaseGrad;
    bgCtx.fillRect(0, midY - 22, canvasW, 44);
  }

  function computeTextLayout() {
    layoutLines = [];
    const marginX = 82;
    const maxWidth = canvasW - marginX * 2;

    // 1. Date (top-right)
    const dateFont = '600 33px "Dancing Script", cursive';
    ctx.font = dateFont;
    const dateText = currentLetter.date || '';
    const dateW = ctx.measureText(dateText).width;
    layoutLines.push({
      text: dateText,
      x: canvasW - marginX - dateW,
      y: 104,
      width: dateW,
      font: dateFont,
      height: 44,
      weight: Math.max(10, dateText.length * 1.15),
    });

    // 2. Salutation
    const salFont = '700 50px "Dancing Script", cursive';
    ctx.font = salFont;
    const salText = currentLetter.salutation || '';
    const salW = ctx.measureText(salText).width;
    layoutLines.push({
      text: salText,
      x: marginX,
      y: 196,
      width: salW,
      font: salFont,
      height: 58,
      weight: Math.max(14, salText.length * 1.35),
    });

    // 3. Wrapped body paragraphs (+10% larger auto-fit body font while fitting cleanly above signature!)
    const rawBody = (currentLetter.body || '').trim();
    const paragraphs = rawBody.split(/\n+/);
    let bodyFontSize = 44;
    let lineHeight = Math.round(bodyFontSize * 1.38);
    let wrapped = [];

    for (let attempt = 0; attempt < 9; attempt++) {
      const fontStr = `600 ${bodyFontSize}px "Dancing Script", cursive`;
      ctx.font = fontStr;
      wrapped = [];
      let cursorY = 258;

      paragraphs.forEach((para, pIdx) => {
        const words = para.trim().split(/\s+/);
        let line = '';
        for (let i = 0; i < words.length; i++) {
          const test = line ? `${line} ${words[i]}` : words[i];
          if (ctx.measureText(test).width > maxWidth && line) {
            wrapped.push({
              text: line,
              x: marginX,
              y: cursorY,
              width: ctx.measureText(line).width,
              font: fontStr,
              height: lineHeight,
              weight: Math.max(8, line.length),
            });
            cursorY += lineHeight;
            line = words[i];
          } else {
            line = test;
          }
        }
        if (line) {
          wrapped.push({
            text: line,
            x: marginX,
            y: cursorY,
            width: ctx.measureText(line).width,
            font: fontStr,
            height: lineHeight,
            weight: Math.max(8, line.length),
          });
          cursorY += lineHeight;
        }
        if (pIdx < paragraphs.length - 1) {
          cursorY += Math.round(lineHeight * 0.24);
        }
      });

      if (cursorY <= 1185) break;
      bodyFontSize -= 2;
      lineHeight = Math.round(bodyFontSize * 1.38);
    }

    layoutLines.push(...wrapped);

    // 4. Sign-off (bottom-right, above heart sticker)
    const signFont = '700 52px "Dancing Script", cursive';
    ctx.font = signFont;
    const signText = currentLetter.sender || '';
    const signW = ctx.measureText(signText).width;
    const lastLineY = wrapped.length ? wrapped[wrapped.length - 1].y : 420;
    const signY = Math.min(1250, Math.max(lastLineY + 62, 1040));
    const signX = canvasW - marginX - Math.max(signW, 180) + (Math.max(signW, 180) - signW) / 2;

    // Brief natural glide/pause as the pen moves down to sign at the bottom
    layoutLines.push({
      isPause: true,
      text: '',
      x: signX,
      y: signY,
      width: 0,
      font: signFont,
      height: 62,
      weight: 22,
    });

    // Deliberate, graceful signature stroke weighting
    layoutLines.push({
      isSignature: true,
      text: signText,
      x: signX,
      y: signY,
      width: signW,
      font: signFont,
      height: 62,
      weight: Math.max(54, signText.length * 4.8),
    });

    // Position 3D heart sticker right beneath sign-off
    const heartCanvasX = signX + signW / 2;
    const heartCanvasY = Math.min(1355, signY + 94);
    heartSticker.position.set(
      (heartCanvasX / canvasW - 0.5) * PAPER_W,
      (0.5 - heartCanvasY / canvasH) * PAPER_H,
      0.028
    );

    totalCharLength = Math.max(
      1,
      layoutLines.reduce((acc, l) => acc + (l.weight || 8), 0)
    );
  }

  /**
   * Draws progressive ink up to `progress` (0..1) and returns active nib local (x, y) & state on paper.
   */
  function setWriteProgress(progress, force = false) {
    const p = Math.max(0, Math.min(1, progress));
    if (!force && Math.abs(p - lastProgress) < 0.0004) {
      return null;
    }
    lastProgress = p;

    ctx.drawImage(bgCanvas, 0, 0);
    ctx.fillStyle = currentTheme.inkColor;
    ctx.textBaseline = 'alphabetic';

    let remaining = p * totalCharLength;
    let penCanvasX = canvasW * 0.5;
    let penCanvasY = 200;
    let steadyLineY = 200;
    let isPause = false;
    let isSignature = false;

    for (let i = 0; i < layoutLines.length; i++) {
      const line = layoutLines[i];
      const len = line.weight || Math.max(4, line.text.length);
      if (remaining <= 0) break;

      if (line.isPause) {
        if (remaining >= len) {
          penCanvasX = line.x;
          penCanvasY = line.y - line.height * 0.14;
          steadyLineY = penCanvasY;
          remaining -= len;
          continue;
        } else {
          const ratio = remaining / len;
          const prev = layoutLines[i - 1];
          const fromX = prev ? prev.x + prev.width : canvasW * 0.3;
          const fromY = prev ? prev.y - prev.height * 0.12 : line.y - 120;
          penCanvasX = THREE.MathUtils.lerp(fromX, line.x, ratio);
          penCanvasY = THREE.MathUtils.lerp(fromY, line.y - line.height * 0.14, ratio);
          steadyLineY = penCanvasY;
          isPause = true;
          remaining = 0;
          break;
        }
      }

      ctx.font = line.font;
      if (remaining >= len) {
        ctx.fillText(line.text, line.x, line.y);
        penCanvasX = line.x + line.width;
        penCanvasY = line.y - line.height * 0.12;
        steadyLineY = penCanvasY;
        if (line.isSignature) isSignature = true;
        remaining -= len;
      } else {
        const ratio = remaining / len;
        const clipW = line.width * ratio;
        ctx.save();
        ctx.beginPath();
        ctx.rect(line.x - 16, line.y - line.height * 1.15, clipW + 20, line.height * 1.65);
        ctx.clip();
        ctx.fillText(line.text, line.x, line.y);
        ctx.restore();

        const waveAmp = line.isSignature ? 7 : 4;
        penCanvasX = line.x + clipW;
        steadyLineY = line.y - line.height * 0.14;
        penCanvasY = steadyLineY + Math.sin(ratio * Math.PI * 16) * waveAmp;
        isSignature = Boolean(line.isSignature);
        remaining = 0;
        break;
      }
    }

    texture.needsUpdate = true;

    return {
      x: (penCanvasX / canvasW - 0.5) * PAPER_W,
      y: (0.5 - penCanvasY / canvasH) * PAPER_H,
      lineY: (0.5 - steadyLineY / canvasH) * PAPER_H,
      isPause,
      isSignature,
    };
  }

  function setFold(foldAmount) {
    // foldAmount: 1 = folded closed flat in half; 0 = completely flat open
    bottomPivot.rotation.x = foldAmount * Math.PI * 0.996;
  }

  function setHeartScale(scale) {
    if (scale <= 0.005) {
      heartSticker.visible = false;
      heartSticker.scale.setScalar(0.0001);
    } else {
      heartSticker.visible = true;
      heartSticker.scale.setScalar(scale);
    }
  }

  function updateContent(newLetter, newTheme, preserveProgress = null) {
    currentLetter = newLetter;
    currentTheme = newTheme;
    paperBackMat.color.set(newTheme.paperColor);
    renderPaperBackground();
    computeTextLayout();
    const prog = preserveProgress !== null ? preserveProgress : Math.max(0, lastProgress);
    setWriteProgress(prog, true);
  }

  // Initial setup
  renderPaperBackground();
  computeTextLayout();
  setWriteProgress(0, true);

  return {
    root,
    bottomPivot,
    heartSticker,
    setFold,
    setWriteProgress,
    setHeartScale,
    updateContent,
  };
}
