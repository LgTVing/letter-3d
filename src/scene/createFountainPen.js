import * as THREE from 'three';

/**
 * Procedural 3D burgundy-and-gold fountain pen.
 * The origin (0, 0, 0) is placed precisely at the tip of the golden nib
 * so moving the pen root directly tracks the handwriting ink stroke on the letter paper.
 */
export function createFountainPen(theme) {
  const root = new THREE.Group();
  const penBody = new THREE.Group();
  root.add(penBody);

  const barrelMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(theme.penBarrel || '#7c1a2d'),
    roughness: 0.16,
    metalness: 0.1,
    clearcoat: 0.95,
    clearcoatRoughness: 0.1,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd9b366,
    roughness: 0.25,
    metalness: 0.88,
  });

  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x1c191a,
    roughness: 0.35,
    metalness: 0.15,
  });

  // 1. Golden Nib (y: 0 -> 0.28)
  const nibGeo = new THREE.ConeGeometry(0.036, 0.28, 12);
  nibGeo.rotateX(Math.PI); // tip points to y = 0
  nibGeo.scale(1, 1, 0.45); // flattened nib profile
  const nib = new THREE.Mesh(nibGeo, goldMat);
  nib.position.y = 0.14;
  nib.castShadow = true;
  penBody.add(nib);

  // Dark ink slit accent on nib
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.14, 0.022), gripMat);
  slit.position.y = 0.11;
  penBody.add(slit);

  // 2. Black Grip Section (y: 0.26 -> 0.56)
  const gripGeo = new THREE.CylinderGeometry(0.056, 0.036, 0.32, 20);
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.y = 0.42;
  grip.castShadow = true;
  penBody.add(grip);

  // Thin gold collar ring above grip
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.058, 0.035, 20), goldMat);
  collar.position.y = 0.59;
  penBody.add(collar);

  // 3. Lower Burgundy Barrel (y: 0.60 -> 1.56)
  const lowerBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.058, 0.96, 24), barrelMat);
  lowerBarrel.position.y = 1.08;
  lowerBarrel.castShadow = true;
  penBody.add(lowerBarrel);

  // 4. Center Metallic Gold Band (y: 1.56 -> 1.66)
  const centerBand = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.076, 0.1, 24), goldMat);
  centerBand.position.y = 1.61;
  centerBand.castShadow = true;
  penBody.add(centerBand);

  // 5. Posted Upper Cap (y: 1.66 -> 2.34)
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.076, 0.68, 24), barrelMat);
  cap.position.y = 2.0;
  cap.castShadow = true;
  penBody.add(cap);

  // Rounded finial tip
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 12), barrelMat);
  finial.position.y = 2.34;
  finial.scale.set(1, 0.65, 1);
  penBody.add(finial);

  const finialRing = new THREE.Mesh(new THREE.CylinderGeometry(0.069, 0.07, 0.025, 20), goldMat);
  finialRing.position.y = 2.31;
  penBody.add(finialRing);

  // 6. Slender Golden Pocket Clip
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.52, 0.016), goldMat);
  clip.position.set(0.076, 2.04, 0);
  penBody.add(clip);

  function updateTheme(newTheme) {
    barrelMat.color.set(newTheme.penBarrel || '#7c1a2d');
  }

  return {
    root,
    penBody,
    updateTheme,
  };
}
