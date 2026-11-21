import * as THREE from 'three';
import { createEnvelopeFrontTexture } from './textures.js';

export const ENVELOPE_W = 3.6;
export const ENVELOPE_H = 2.36;
export const ENVELOPE_D = 0.07;

function createTriangleGeometry(p0, p1, p2) {
  const geo = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    p0[0], p0[1], p0[2],
    p1[0], p1[1], p1[2],
    p2[0], p2[1], p2[2],
  ]);
  const uvs = new Float32Array([0, 0, 1, 0, 0.5, 1]);
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.computeVertexNormals();
  return geo;
}

function createScallopedWaxDisc(radius = 0.29) {
  const shape = new THREE.Shape();
  const segments = 64;
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const wobble =
      1 +
      0.085 * Math.sin(angle * 5 + 0.4) +
      0.05 * Math.cos(angle * 9 - 0.8) +
      0.025 * Math.sin(angle * 13);
    const r = radius * wobble;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.016,
    bevelSegments: 4,
    curveSegments: 24,
  });
  geo.computeBoundingBox();
  // Keep glued base flush at z = 0 and extrude strictly into -Z (outward from back face)
  geo.translate(0, 0, -geo.boundingBox.max.z);
  return geo;
}

function createScallopedWaxHalf(isTop, radius = 0.29) {
  const shape = new THREE.Shape();
  const segments = 32;
  const startAngle = isTop ? 0 : Math.PI;
  const endAngle = isTop ? Math.PI : Math.PI * 2;

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * (endAngle - startAngle);
    const wobble =
      1 +
      0.085 * Math.sin(angle * 5 + 0.4) +
      0.05 * Math.cos(angle * 9 - 0.8) +
      0.025 * Math.sin(angle * 13);
    const r = radius * wobble;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  // Natural jagged crack line across y = 0
  const crackSteps = 9;
  for (let i = 1; i < crackSteps; i++) {
    const t = i / crackSteps;
    const x = isTop ? radius * (2 * t - 1) : radius * (1 - 2 * t);
    const y = Math.sin(t * Math.PI * 3.5) * 0.011;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.026,
    bevelEnabled: true,
    bevelThickness: 0.015,
    bevelSize: 0.014,
    bevelSegments: 4,
    curveSegments: 16,
  });
  geo.computeBoundingBox();
  // Flat glued base strictly at z = 0, extruding strictly into -Z (so it NEVER pokes through the flap!)
  const yAlign = isTop ? -geo.boundingBox.min.y : -geo.boundingBox.max.y;
  geo.translate(0, yAlign, -geo.boundingBox.max.z);
  return geo;
}

/**
 * Creates a sculpted 3D embossed botanical rose relief facing -Z (outward on wax seal).
 */
function createEmbossedRoseRelief(waxMat, reliefMat) {
  const g = new THREE.Group();

  // Raised circular stamp rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.017, 12, 36), reliefMat);
  rim.position.z = -0.052;
  g.add(rim);

  // Inner fine dotted ring (12 tiny embossed beads)
  const beadGeo = new THREE.SphereGeometry(0.01, 8, 8);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const bead = new THREE.Mesh(beadGeo, reliefMat);
    bead.position.set(Math.cos(a) * 0.16, Math.sin(a) * 0.16, -0.054);
    bead.scale.set(1, 1, 0.55);
    g.add(bead);
  }

  // Outer 5 sculpted rose petals
  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.bezierCurveTo(-0.048, 0.032, -0.056, 0.105, 0, 0.125);
  petalShape.bezierCurveTo(0.056, 0.105, 0.048, 0.032, 0, 0);

  const outerPetalGeo = new THREE.ExtrudeGeometry(petalShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.005,
    bevelSegments: 2,
  });
  outerPetalGeo.computeBoundingBox();
  outerPetalGeo.translate(0, 0, -outerPetalGeo.boundingBox.max.z);

  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.2;
    const petal = new THREE.Mesh(outerPetalGeo, reliefMat);
    petal.rotation.z = a;
    petal.position.set(Math.cos(a + Math.PI / 2) * 0.018, Math.sin(a + Math.PI / 2) * 0.018, -0.052);
    g.add(petal);
  }

  // Inner 5 smaller rotated petals
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.82;
    const petal = new THREE.Mesh(outerPetalGeo, waxMat);
    petal.rotation.z = a;
    petal.scale.setScalar(0.68);
    petal.position.set(Math.cos(a + Math.PI / 2) * 0.01, Math.sin(a + Math.PI / 2) * 0.01, -0.06);
    g.add(petal);
  }

  // Center rosebud swirl
  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 10), reliefMat);
  bud.scale.set(1, 1, 0.6);
  bud.position.z = -0.066;
  g.add(bud);

  const budRing = new THREE.Mesh(new THREE.TorusGeometry(0.038, 0.008, 8, 20), reliefMat);
  budRing.position.z = -0.064;
  g.add(budRing);

  return g;
}

export function createEnvelope(letter, theme, paperBump) {
  const root = new THREE.Group();
  const hw = ENVELOPE_W / 2;
  const hh = ENVELOPE_H / 2;
  const hd = ENVELOPE_D / 2;

  // Front face (+Z) with custom canvas texture
  let frontTex = createEnvelopeFrontTexture(letter, theme);
  const frontMat = new THREE.MeshStandardMaterial({
    map: frontTex,
    bumpMap: paperBump,
    bumpScale: 0.008,
    roughness: 0.86,
    metalness: 0.02,
  });

  const basePaperMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(theme.envelopeColor),
    bumpMap: paperBump,
    bumpScale: 0.01,
    roughness: 0.86,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const innerPaperMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(theme.envelopeInner),
    bumpMap: paperBump,
    bumpScale: 0.009,
    roughness: 0.9,
    metalness: 0.01,
    side: THREE.DoubleSide,
  });

  const shadeFlapMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(theme.envelopeShade),
    bumpMap: paperBump,
    bumpScale: 0.01,
    roughness: 0.88,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  // Front board (facing +Z)
  const frontMesh = new THREE.Mesh(new THREE.PlaneGeometry(ENVELOPE_W, ENVELOPE_H), frontMat);
  frontMesh.position.z = hd;
  frontMesh.castShadow = true;
  frontMesh.receiveShadow = true;
  frontMesh.name = 'envelope-body';
  root.add(frontMesh);

  // Inner backing board (inside pocket, facing -Z)
  const innerBack = new THREE.Mesh(new THREE.PlaneGeometry(ENVELOPE_W - 0.02, ENVELOPE_H - 0.02), innerPaperMat);
  innerBack.position.z = hd - 0.004;
  innerBack.rotation.y = Math.PI;
  innerBack.receiveShadow = true;
  root.add(innerBack);

  // Thin edge rims (left, right, bottom) to give authentic paper envelope thickness
  const sideEdgeGeo = new THREE.BoxGeometry(0.025, ENVELOPE_H, ENVELOPE_D);
  const leftEdge = new THREE.Mesh(sideEdgeGeo, shadeFlapMat);
  leftEdge.position.set(-hw + 0.01, 0, 0);
  root.add(leftEdge);

  const rightEdge = new THREE.Mesh(sideEdgeGeo, shadeFlapMat);
  rightEdge.position.set(hw - 0.01, 0, 0);
  root.add(rightEdge);

  const bottomEdge = new THREE.Mesh(new THREE.BoxGeometry(ENVELOPE_W, 0.025, ENVELOPE_D), shadeFlapMat);
  bottomEdge.position.set(0, -hh + 0.01, 0);
  root.add(bottomEdge);

  // Back side (-Z) folded triangular flaps
  // Left flap
  const leftFlapGeo = createTriangleGeometry([-hw, hh, 0], [-hw, -hh, 0], [0.18, 0, 0]);
  const leftFlap = new THREE.Mesh(leftFlapGeo, basePaperMat);
  leftFlap.position.z = -hd + 0.006;
  leftFlap.receiveShadow = true;
  leftFlap.name = 'envelope-body';
  root.add(leftFlap);

  // Right flap
  const rightFlapGeo = createTriangleGeometry([hw, -hh, 0], [hw, hh, 0], [-0.18, 0, 0]);
  const rightFlap = new THREE.Mesh(rightFlapGeo, basePaperMat);
  rightFlap.position.z = -hd + 0.004;
  rightFlap.receiveShadow = true;
  rightFlap.name = 'envelope-body';
  root.add(rightFlap);

  // Bottom flap (overlaps left & right slightly)
  const bottomFlapGeo = createTriangleGeometry([-hw, -hh, 0], [hw, -hh, 0], [0, 0.2, 0]);
  const bottomFlap = new THREE.Mesh(bottomFlapGeo, basePaperMat);
  bottomFlap.position.z = -hd - 0.003;
  bottomFlap.receiveShadow = true;
  bottomFlap.name = 'envelope-body';
  root.add(bottomFlap);

  // Delicate diagonal seam lines on back flaps for crisp paper fold contrast
  const creaseMat = new THREE.LineBasicMaterial({
    color: 0x6e4f4f,
    transparent: true,
    opacity: 0.26,
  });
  const bottomCreasePts = [
    new THREE.Vector3(-hw, -hh, -hd - 0.005),
    new THREE.Vector3(0, 0.2, -hd - 0.005),
    new THREE.Vector3(hw, -hh, -hd - 0.005),
  ];
  root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(bottomCreasePts), creaseMat));

  // Hinged Top Triangular Flap pivoted at (0, +hh, -hd)
  const topFlapPivot = new THREE.Group();
  topFlapPivot.position.set(0, hh, -hd - 0.008);
  root.add(topFlapPivot);

  const flapDrop = ENVELOPE_H * 0.57;
  const topFlapGeo = createTriangleGeometry([-hw, 0, 0], [hw, 0, 0], [0, -flapDrop, 0]);
  const topFlapMesh = new THREE.Mesh(topFlapGeo, basePaperMat);
  topFlapMesh.castShadow = true;
  topFlapMesh.receiveShadow = true;
  topFlapMesh.name = 'envelope-flap';
  topFlapPivot.add(topFlapMesh);

  // Top flap fold seam border
  const topCreasePts = [
    new THREE.Vector3(-hw, 0, -0.004),
    new THREE.Vector3(0, -flapDrop, -0.004),
    new THREE.Vector3(hw, 0, -0.004),
  ];
  topFlapPivot.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(topCreasePts), creaseMat));

  // 3D Glossy Wax Seal:
  // 1) Intact seamless floral rose wax seal (shown while sealed before breaking)
  // 2) Split upper half (strictly on outer -Z face of topFlapPivot so when flap opens it sits BEHIND the flap!)
  // 3) Split lower half (on lower back flap)
  const waxMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(theme.waxColor),
    emissive: new THREE.Color(theme.waxEmissive),
    emissiveIntensity: 0.22,
    roughness: 0.24,
    metalness: 0.04,
    clearcoat: 0.92,
    clearcoatRoughness: 0.15,
  });

  const waxReliefMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(theme.waxColor).offsetHSL(0, 0.03, 0.05),
    emissive: new THREE.Color(theme.waxEmissive),
    emissiveIntensity: 0.18,
    roughness: 0.2,
    metalness: 0.06,
    clearcoat: 0.95,
    clearcoatRoughness: 0.14,
  });

  const waxY = hh - flapDrop + 0.12;

  // Intact single-piece floral wax seal (mounted at flap tip, visible when uncracked)
  const waxIntactGroup = new THREE.Group();
  waxIntactGroup.position.set(0, -flapDrop + 0.12, -0.004);
  const intactDisc = new THREE.Mesh(createScallopedWaxDisc(0.29), waxMat);
  intactDisc.castShadow = true;
  waxIntactGroup.add(intactDisc);
  const roseRelief = createEmbossedRoseRelief(waxMat, waxReliefMat);
  waxIntactGroup.add(roseRelief);
  topFlapPivot.add(waxIntactGroup);

  // Split upper wax half (strictly on outer -Z face of topFlapMesh, z <= -0.004 -> sits BEHIND flap once opened!)
  const waxTopGroup = new THREE.Group();
  waxTopGroup.position.set(0, -flapDrop + 0.12, -0.004);
  waxTopGroup.visible = false;
  const waxTopMesh = new THREE.Mesh(createScallopedWaxHalf(true, 0.29), waxMat);
  waxTopMesh.castShadow = true;
  waxTopGroup.add(waxTopMesh);

  const halfRimGeo = new THREE.TorusGeometry(0.185, 0.016, 10, 24, Math.PI);
  const topRing = new THREE.Mesh(halfRimGeo, waxReliefMat);
  topRing.position.set(0, 0.01, -0.052);
  waxTopGroup.add(topRing);
  topFlapPivot.add(waxTopGroup);

  // Split lower wax half (stays on the lower back flap)
  const waxBottomGroup = new THREE.Group();
  waxBottomGroup.position.set(0, waxY, -hd - 0.008);
  waxBottomGroup.visible = false;
  const waxBottomMesh = new THREE.Mesh(createScallopedWaxHalf(false, 0.29), waxMat);
  waxBottomMesh.castShadow = true;
  waxBottomGroup.add(waxBottomMesh);

  const botRing = new THREE.Mesh(halfRimGeo, waxReliefMat);
  botRing.rotation.z = Math.PI;
  botRing.position.set(0, -0.01, -0.052);
  waxBottomGroup.add(botRing);

  // Small embossed lower flower petals remaining on bottom broken half
  const lowerPetalGeo = new THREE.SphereGeometry(0.036, 10, 8);
  [-0.06, 0, 0.06].forEach((px, idx) => {
    const p = new THREE.Mesh(lowerPetalGeo, waxReliefMat);
    p.scale.set(1.05, 0.72, 0.35);
    p.position.set(px, -0.075 - (idx === 1 ? 0.018 : 0), -0.054);
    waxBottomGroup.add(p);
  });
  root.add(waxBottomGroup);

  // Wax Crumb Particle Pool (bursts when wax seal breaks)
  const crumbGroup = new THREE.Group();
  root.add(crumbGroup);
  const crumbs = [];
  const crumbGeo = new THREE.DodecahedronGeometry(0.024, 0);
  for (let i = 0; i < 20; i++) {
    const m = new THREE.Mesh(crumbGeo, waxMat);
    m.visible = false;
    crumbGroup.add(m);
    crumbs.push({
      mesh: m,
      vel: new THREE.Vector3(),
      rot: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
    });
  }

  function triggerWaxBurst() {
    crumbs.forEach((c) => {
      c.mesh.visible = true;
      const scale = 0.55 + Math.random() * 1.1;
      c.mesh.scale.setScalar(scale);
      c.mesh.position.set(
        (Math.random() - 0.5) * 0.45,
        waxY + (Math.random() - 0.5) * 0.14,
        -hd - 0.06 - Math.random() * 0.04
      );
      c.vel.set(
        (Math.random() - 0.5) * 1.5,
        -0.3 - Math.random() * 1.1,
        -0.35 - Math.random() * 0.6
      );
      c.rot.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );
      c.life = 0;
      c.maxLife = 0.85 + Math.random() * 0.65;
    });
  }

  function updateCrumbs(dt) {
    crumbs.forEach((c) => {
      if (!c.mesh.visible) return;
      c.life += dt;
      if (c.life >= c.maxLife) {
        c.mesh.visible = false;
        return;
      }
      c.vel.y -= 2.9 * dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      c.mesh.rotation.x += c.rot.x * dt;
      c.mesh.rotation.y += c.rot.y * dt;
      const fade = 1 - c.life / c.maxLife;
      c.mesh.scale.setScalar(Math.max(0.01, fade * 0.95));
    });
  }

  function setSealCrack(crackAmount) {
    // crackAmount <= 0.05: single seamless intact floral wax seal
    // crackAmount > 0.05: broken into two halves (upper half stays strictly on outer side of top flap -> hidden behind opened flap)
    const isBroken = crackAmount > 0.05;
    waxIntactGroup.visible = !isBroken;
    waxTopGroup.visible = isBroken;
    waxBottomGroup.visible = isBroken;

    if (isBroken) {
      waxTopGroup.position.y = -flapDrop + 0.12 + crackAmount * 0.04;
      waxBottomGroup.position.y = waxY - crackAmount * 0.05;
      waxBottomGroup.rotation.z = crackAmount * 0.05;
    } else {
      waxBottomGroup.position.y = waxY;
      waxBottomGroup.rotation.z = 0;
    }
  }

  function setFlapOpen(openAmount) {
    // openAmount: 0 (closed on top of back flaps) -> 1 (opened slightly behind pocket so peeking paper sits cleanly in front)
    const t = Math.max(0, Math.min(1, openAmount));
    topFlapPivot.rotation.x = t * Math.PI * 1.05;
    // Shift hinge across envelope thickness while flap is perpendicular (~0.25..0.65)
    const hingeShift = Math.max(0, Math.min(1, (t - 0.25) / 0.4));
    topFlapPivot.position.z = THREE.MathUtils.lerp(-hd - 0.008, hd + 0.002, hingeShift);
    // Keep upper broken wax half tucked cleanly behind the opened flap (invisible on inner face)
    if (waxTopGroup.visible) {
      waxTopGroup.position.y = -flapDrop + 0.16 + t * 0.14;
    }
  }

  function updateThemeAndLetter(newLetter, newTheme) {
    const nextFrontTex = createEnvelopeFrontTexture(newLetter, newTheme);
    frontMat.map = nextFrontTex;
    frontMat.needsUpdate = true;
    if (frontTex) frontTex.dispose();
    frontTex = nextFrontTex;

    basePaperMat.color.set(newTheme.envelopeColor);
    innerPaperMat.color.set(newTheme.envelopeInner);
    shadeFlapMat.color.set(newTheme.envelopeShade);
    waxMat.color.set(newTheme.waxColor);
    waxMat.emissive.set(newTheme.waxEmissive);
    waxReliefMat.color.set(newTheme.waxColor).offsetHSL(0, 0.03, 0.05);
    waxReliefMat.emissive.set(newTheme.waxEmissive);
  }

  return {
    root,
    topFlapPivot,
    waxTopGroup,
    waxBottomGroup,
    triggerWaxBurst,
    updateCrumbs,
    setSealCrack,
    setFlapOpen,
    updateThemeAndLetter,
  };
}
