import * as THREE from 'three';

function createHeartPetalGeo() {
  const s = 0.055;
  const shape = new THREE.Shape();
  shape.moveTo(0, -1.0 * s);
  shape.bezierCurveTo(-1.2 * s, -0.2 * s, -1.3 * s, 0.9 * s, -0.55 * s, 1.0 * s);
  shape.bezierCurveTo(-0.15 * s, 1.05 * s, 0, 0.72 * s, 0, 0.55 * s);
  shape.bezierCurveTo(0, 0.72 * s, 0.15 * s, 1.05 * s, 0.55 * s, 1.0 * s);
  shape.bezierCurveTo(1.3 * s, 0.9 * s, 1.2 * s, -0.2 * s, 0, -1.0 * s);
  return new THREE.ShapeGeometry(shape, 10);
}

function createBlossomPetalGeo() {
  const s = 0.062;
  const shape = new THREE.Shape();
  shape.moveTo(0, -1.0 * s);
  shape.bezierCurveTo(-0.8 * s, -0.4 * s, -0.7 * s, 0.8 * s, 0, 1.05 * s);
  shape.bezierCurveTo(0.7 * s, 0.8 * s, 0.8 * s, -0.4 * s, 0, -1.0 * s);
  return new THREE.ShapeGeometry(shape, 10);
}

export function createPetals(theme) {
  const group = new THREE.Group();
  const heartGeo = createHeartPetalGeo();
  const blossomGeo = createBlossomPetalGeo();

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(theme.petalColor || '#f2a5b6'),
    roughness: 0.7,
    metalness: 0.0,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });

  const particles = [];
  const count = 30;
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(i % 2 === 0 ? heartGeo : blossomGeo, mat);
    const scale = 0.7 + Math.random() * 1.1;
    mesh.scale.setScalar(scale);
    mesh.position.set(
      (Math.random() - 0.5) * 9.5,
      (Math.random() - 0.5) * 6.8,
      -0.8 + Math.random() * 2.4
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(mesh);

    particles.push({
      mesh,
      speedY: 0.18 + Math.random() * 0.24,
      swayAmp: 0.22 + Math.random() * 0.35,
      swayFreq: 0.5 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 0.9
      ),
      baseX: mesh.position.x,
    });
  }

  let currentOpacity = 0;

  function update(dt, elapsed, active) {
    const targetOpacity = active ? 0.72 : 0;
    currentOpacity += (targetOpacity - currentOpacity) * Math.min(1, dt * 2.2);
    mat.opacity = currentOpacity;
    group.visible = currentOpacity > 0.01;
    if (!group.visible) return;

    particles.forEach((p) => {
      p.mesh.position.y -= p.speedY * dt;
      p.mesh.position.x = p.baseX + Math.sin(elapsed * p.swayFreq + p.phase) * p.swayAmp;
      p.mesh.rotation.x += p.rotSpeed.x * dt;
      p.mesh.rotation.y += p.rotSpeed.y * dt;
      p.mesh.rotation.z += p.rotSpeed.z * dt;

      if (p.mesh.position.y < -3.8) {
        p.mesh.position.y = 3.8 + Math.random() * 0.8;
        p.baseX = (Math.random() - 0.5) * 9.5;
      }
    });
  }

  function updateTheme(newTheme) {
    mat.color.set(newTheme.petalColor || '#f2a5b6');
  }

  return { group, update, updateTheme };
}
