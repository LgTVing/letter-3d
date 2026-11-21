import * as THREE from 'three';
import { createPaperBumpTexture } from './textures.js';
import { createEnvelope } from './createEnvelope.js';
import { createLetterPaper } from './createLetterPaper.js';
import { createFountainPen } from './createFountainPen.js';
import { createPolaroids } from './createPolaroids.js';
import { createPetals } from './createPetals.js';
import { THEMES } from '../config/defaultLetter.js';

export const STATES = {
  SEALED: 'SEALED',
  HOLDING: 'HOLDING',
  OPENED_PEEK: 'OPENED_PEEK',
  UNFOLDING: 'UNFOLDING',
  WRITING: 'WRITING',
  COMPLETE: 'COMPLETE',
  PUTTING_AWAY: 'PUTTING_AWAY',
};

function easeOutCubic(t) {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 3);
}

function easeInOutCubic(t) {
  const c = Math.max(0, Math.min(1, t));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function easeOutBack(t) {
  const c = Math.max(0, Math.min(1, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(c - 1, 3) + c1 * Math.pow(c - 1, 2);
}

export class LetterScene {
  constructor(mountEl, letter, audio, callbacks = {}) {
    this.mountEl = mountEl;
    this.letter = letter;
    this.theme = THEMES[letter.theme] || THEMES.love;
    this.audio = audio;
    this.callbacks = callbacks;

    this.state = STATES.SEALED;
    this.clock = new THREE.Clock();
    this.elapsed = 0;

    // Animation progress tracks
    this.holdProgress = 0;
    this.flapProgress = 0;
    this.unfoldProgress = 0;
    this.writeProgress = 0;
    this.writeSpeedMultiplier = 1;
    this.heartProgress = 0;
    this.polaroidReveal = 0;
    this.putAwayProgress = 0;

    // Envelope user rotation (sealed state)
    this.envRotX = 0.04;
    this.envRotY = -0.1;
    this.targetEnvRotX = 0.04;
    this.targetEnvRotY = -0.1;

    // Camera navigation (opened state)
    this.zoomLevel = 1.0; // 0.65 (zoomed out) -> 1.75 (zoomed in)
    this.targetZoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.targetPanX = 0;
    this.targetPanY = 0;

    // Pointer tracking
    this.pointerDown = false;
    this.pointerMoved = false;
    this.suppressNextTap = false;
    this.pointerDownPos = { x: 0, y: 0 };
    this.lastPointerPos = { x: 0, y: 0 };
    this.pointerNDC = new THREE.Vector2();
    this.hoveredPolaroid = -1;
    this.raycaster = new THREE.Raycaster();

    // Active pen tracking
    this.penTipLocal = new THREE.Vector2(0, 0.9);
    this.steadyLineY = 0.9;
    this.smoothCamFollowY = 0.45;
    this.penIsPaused = false;
    this.penIsSigning = false;
    this.postSignDelay = 0;
    this.penVisibility = 0;

    this._initRendererAndScene();
    this._initObjects();
    this._bindEvents();
    this._handleResize();

    this.running = true;
    this._animate();
  }

  _initRendererAndScene() {
    this.scene = new THREE.Scene();

    const width = this.mountEl.clientWidth || window.innerWidth;
    const height = this.mountEl.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60);
    this.camera.position.set(0, 0.08, 6.4);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.mountEl.appendChild(this.renderer.domElement);

    // Warm studio lighting
    const hemi = new THREE.HemisphereLight(0xfffaf6, 0xddc9c4, 1.35);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7f0, 1.25);
    keyLight.position.set(3.2, 4.8, 6.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -5.5;
    keyLight.shadow.camera.right = 5.5;
    keyLight.shadow.camera.top = 5.5;
    keyLight.shadow.camera.bottom = -5.5;
    keyLight.shadow.bias = -0.0008;
    keyLight.shadow.radius = 4;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfbe2e7, 0.55);
    fillLight.position.set(-4.0, -1.8, 3.8);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffeedd, 0.45, 16);
    rimLight.position.set(0, 2.5, 4.5);
    this.scene.add(rimLight);
  }

  _initObjects() {
    this.paperBump = createPaperBumpTexture(512);

    this.envelope = createEnvelope(this.letter, this.theme, this.paperBump);
    this.scene.add(this.envelope.root);

    this.letterPaper = createLetterPaper(this.letter, this.theme, this.paperBump);
    this.letterPaper.root.visible = false;
    this.letterPaper.setFold(1);
    this.scene.add(this.letterPaper.root);

    this.fountainPen = createFountainPen(this.theme);
    this.fountainPen.root.visible = false;
    this.scene.add(this.fountainPen.root);

    this.polaroids = createPolaroids(this.letter, this.theme, this.paperBump);
    this.scene.add(this.polaroids.group);

    this.petals = createPetals(this.theme);
    this.scene.add(this.petals.group);
  }

  _setState(nextState) {
    if (this.state === nextState) return;
    this.state = nextState;
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange(nextState);
    }
  }

  _getResponsiveCameraZ(baseZ) {
    const aspect = this.camera.aspect || 1.3;
    if (aspect < 0.85) return baseZ * 1.48;
    if (aspect < 1.15) return baseZ * 1.22;
    return baseZ;
  }

  _bindEvents() {
    const dom = this.renderer.domElement;

    this._onResize = () => this._handleResize();
    window.addEventListener('resize', this._onResize);

    this._onPointerDown = (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      this.audio.ensureContext();
      this.pointerDown = true;
      this.pointerMoved = false;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
      this._updateNDC(e);

      if (this.state === STATES.SEALED) {
        // Begin potential hold-to-open (drag cancels hold)
        this._setState(STATES.HOLDING);
      }
    };

    this._onPointerMove = (e) => {
      this._updateNDC(e);
      const dx = e.clientX - this.lastPointerPos.x;
      const dy = e.clientY - this.lastPointerPos.y;
      const totalDist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);

      if (this.pointerDown && totalDist > 9) {
        this.pointerMoved = true;
      }

      if (this.pointerDown) {
        if (this.state === STATES.HOLDING && totalDist > 12) {
          // User intended to drag-rotate envelope instead of holding to open
          this._setState(STATES.SEALED);
          this.holdProgress = 0;
          if (this.callbacks.onHoldProgress) this.callbacks.onHoldProgress(0);
        }

        if (this.state === STATES.SEALED) {
          this.targetEnvRotY += dx * 0.0085;
          this.targetEnvRotX = THREE.MathUtils.clamp(this.targetEnvRotX + dy * 0.006, -0.58, 0.58);
        } else if (this.state === STATES.COMPLETE) {
          const panScale = 0.0065 / this.zoomLevel;
          this.targetPanX = THREE.MathUtils.clamp(this.targetPanX - dx * panScale, -2.6, 2.2);
          this.targetPanY = THREE.MathUtils.clamp(this.targetPanY + dy * panScale, -1.8, 1.8);
        }
      } else if (this.state === STATES.COMPLETE) {
        // Hover detection for polaroids
        this.raycaster.setFromCamera(this.pointerNDC, this.camera);
        const hits = this.raycaster.intersectObjects(this.polaroids.cards.map((c) => c.mesh), false);
        this.hoveredPolaroid = hits.length > 0 ? hits[0].object.userData.polaroidIndex : -1;
        dom.style.cursor = this.hoveredPolaroid >= 0 ? 'pointer' : 'grab';
      } else if (this.state === STATES.OPENED_PEEK || this.state === STATES.WRITING) {
        dom.style.cursor = 'pointer';
      } else {
        dom.style.cursor = 'grab';
      }

      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    };

    this._onPointerUp = (e) => {
      if (!this.pointerDown) return;
      this.pointerDown = false;
      this._updateNDC(e);

      if (this.suppressNextTap) {
        this.suppressNextTap = false;
        return;
      }

      if (this.state === STATES.HOLDING) {
        // Released before full wax crack
        this._setState(STATES.SEALED);
        if (this.callbacks.onHoldProgress) this.callbacks.onHoldProgress(0);
        return;
      }

      // Tap interactions (when user didn't drag)
      if (!this.pointerMoved) {
        if (this.state === STATES.OPENED_PEEK) {
          this.startUnfolding();
        } else if (this.state === STATES.WRITING) {
          this.speedUpWriting();
        } else if (this.state === STATES.COMPLETE) {
          this.raycaster.setFromCamera(this.pointerNDC, this.camera);
          const hits = this.raycaster.intersectObjects(this.polaroids.cards.map((c) => c.mesh), false);
          if (hits.length > 0) {
            const idx = hits[0].object.userData.polaroidIndex;
            this.polaroids.toggleFlip(idx);
            this.audio.playCardFlip();
          }
        }
      }
    };

    this._onWheel = (e) => {
      if (this.state !== STATES.COMPLETE) return;
      e.preventDefault();
      const delta = -Math.sign(e.deltaY) * 0.12;
      this.setZoomDelta(delta);
    };

    dom.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
    dom.addEventListener('wheel', this._onWheel, { passive: false });
  }

  _updateNDC(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  _handleResize() {
    const width = this.mountEl.clientWidth || window.innerWidth;
    const height = this.mountEl.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // --- Public Controls ---

  startUnfolding() {
    if (this.state !== STATES.OPENED_PEEK) return;
    this.unfoldProgress = 0;
    this.writeProgress = 0;
    this.writeSpeedMultiplier = 1;
    this.postSignDelay = 0;
    this.steadyLineY = 0.85;
    this.smoothCamFollowY = 0.62;
    this.penIsPaused = false;
    this.penIsSigning = false;
    this.heartProgress = 0;
    this.letterPaper.setWriteProgress(0, true);
    this.letterPaper.setHeartScale(0);
    this.audio.playPaperRustle(0.55, 860);
    this._setState(STATES.UNFOLDING);
  }

  speedUpWriting() {
    if (this.state !== STATES.WRITING) return;
    if (this.writeSpeedMultiplier < 2.8) {
      this.writeSpeedMultiplier = 3.2;
    } else {
      // Second tap completes immediately
      this.writeProgress = 1;
      this.letterPaper.setWriteProgress(1, true);
      this.audio.stopPenScratch();
      this._setState(STATES.COMPLETE);
    }
  }

  seeAll() {
    this.audio.ensureContext();
    this.audio.stopPenScratch();
    this.audio.playPaperRustle(0.4, 1050);

    this.holdProgress = 0;
    if (this.callbacks.onHoldProgress) this.callbacks.onHoldProgress(0);

    this.flapProgress = 1;
    this.unfoldProgress = 1;
    this.writeProgress = 1;
    this.heartProgress = 1;
    this.polaroidReveal = 1;
    this.penVisibility = 1;

    this.envelope.setSealCrack(1);
    this.envelope.setFlapOpen(1);
    this.letterPaper.root.visible = true;
    this.letterPaper.setFold(0);
    this.letterPaper.setWriteProgress(1, true);
    this.letterPaper.setHeartScale(1);
    this.fountainPen.root.visible = true;

    this.resetView();
    this._setState(STATES.COMPLETE);
  }

  replayWriting() {
    this.audio.ensureContext();
    this.polaroids.resetFlips();
    this.polaroidReveal = 0;
    this.writeProgress = 0;
    this.writeSpeedMultiplier = 1;
    this.postSignDelay = 0;
    this.steadyLineY = 0.85;
    this.smoothCamFollowY = 0.62;
    this.penIsPaused = false;
    this.penIsSigning = false;
    this.heartProgress = 0;
    this.unfoldProgress = 1;
    this.letterPaper.root.visible = true;
    this.letterPaper.setFold(0);
    this.letterPaper.setWriteProgress(0, true);
    this.letterPaper.setHeartScale(0);
    this.fountainPen.root.visible = true;
    this.resetView();
    this.audio.startPenScratch();
    this._setState(STATES.WRITING);
  }

  putAway() {
    if (this.state === STATES.SEALED || this.state === STATES.PUTTING_AWAY) return;
    this.audio.stopPenScratch();
    this.audio.playPaperRustle(0.55, 760);
    this.polaroids.resetFlips();
    this.putAwayProgress = 0;
    this.resetView();
    this._setState(STATES.PUTTING_AWAY);
  }

  setZoomDelta(delta) {
    this.targetZoomLevel = THREE.MathUtils.clamp(this.targetZoomLevel + delta, 0.68, 1.75);
  }

  resetView() {
    this.targetZoomLevel = 1.0;
    this.targetPanX = 0;
    this.targetPanY = 0;
  }

  async updateLetter(newLetter, resetToSealed = true) {
    this.letter = newLetter;
    this.theme = THEMES[newLetter.theme] || THEMES.love;

    this.envelope.updateThemeAndLetter(newLetter, this.theme);
    this.fountainPen.updateTheme(this.theme);
    this.petals.updateTheme(this.theme);
    await this.polaroids.updatePhotos(newLetter, this.theme);

    if (resetToSealed) {
      this.audio.stopPenScratch();
      this.polaroids.resetFlips();
      this.holdProgress = 0;
      this.flapProgress = 0;
      this.unfoldProgress = 0;
      this.writeProgress = 0;
      this.heartProgress = 0;
      this.polaroidReveal = 0;
      this.penVisibility = 0;

      this.envelope.setSealCrack(0);
      this.envelope.setFlapOpen(0);
      this.letterPaper.root.visible = false;
      this.letterPaper.setFold(1);
      this.letterPaper.updateContent(newLetter, this.theme, 0);
      this.letterPaper.setHeartScale(0);
      this.fountainPen.root.visible = false;

      this.targetEnvRotX = 0.04;
      this.targetEnvRotY = -0.1;
      this.resetView();
      this._setState(STATES.SEALED);
    } else {
      this.letterPaper.updateContent(newLetter, this.theme);
    }
  }

  // --- Main Render Loop ---

  _animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this._animate());

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;

    this._updateStateMachine(dt);
    this._updateCamera(dt);
    this.envelope.updateCrumbs(dt);

    const petalsActive =
      this.state === STATES.UNFOLDING ||
      this.state === STATES.WRITING ||
      this.state === STATES.COMPLETE;
    this.petals.update(dt, this.elapsed, petalsActive);
    this.polaroids.update(dt, this.polaroidReveal, this.state === STATES.COMPLETE ? this.hoveredPolaroid : -1);

    this.renderer.render(this.scene, this.camera);
  }

  _updateStateMachine(dt) {
    const smooth = Math.min(1, dt * 6.5);

    if (this.state === STATES.SEALED) {
      // Recover hold progress smoothly if released early
      this.holdProgress = Math.max(0, this.holdProgress - dt * 2.5);
      this.flapProgress = Math.max(0, this.flapProgress - dt * 3.0);
      this.envelope.setSealCrack(0);
      this.envelope.setFlapOpen(0);

      // Gentle floating motion
      this.envRotX += (this.targetEnvRotX - this.envRotX) * smooth;
      this.envRotY += (this.targetEnvRotY - this.envRotY) * smooth;

      this.envelope.root.position.lerp(
        new THREE.Vector3(0.06, -0.14 + Math.sin(this.elapsed * 1.45) * 0.045, 0),
        smooth
      );
      this.envelope.root.rotation.set(
        this.envRotX + Math.sin(this.elapsed * 0.9) * 0.018,
        this.envRotY + Math.cos(this.elapsed * 0.7) * 0.025,
        Math.sin(this.elapsed * 0.6) * 0.012
      );
      this.envelope.root.scale.lerp(new THREE.Vector3(1, 1, 1), smooth);
      this.letterPaper.root.visible = false;
      this.fountainPen.root.visible = false;
      this.polaroidReveal = Math.max(0, this.polaroidReveal - dt * 4);
    } else if (this.state === STATES.HOLDING) {
      // Rotate smoothly to the nearest back-facing wax-seal orientation (odd multiple of PI)
      const nearestBackY = Math.round((this.targetEnvRotY - Math.PI) / (Math.PI * 2)) * Math.PI * 2 + Math.PI;
      this.targetEnvRotY = nearestBackY;
      this.targetEnvRotX = 0;
      this.envRotX += (0 - this.envRotX) * Math.min(1, dt * 7.5);
      this.envRotY += (nearestBackY - this.envRotY) * Math.min(1, dt * 7.5);

      // Advance hold timer (~1.55 seconds to crack)
      this.holdProgress = Math.min(1, this.holdProgress + dt / 1.55);
      if (this.callbacks.onHoldProgress) {
        this.callbacks.onHoldProgress(this.holdProgress);
      }

      // Subtle tension vibration as wax nears cracking
      const tremor = this.holdProgress > 0.55 ? (this.holdProgress - 0.55) * 0.028 : 0;
      this.envelope.root.position.set(
        Math.sin(this.elapsed * 65) * tremor,
        Math.cos(this.elapsed * 58) * tremor,
        0
      );
      this.envelope.root.rotation.set(this.envRotX, this.envRotY, 0);
      // Keep wax seal completely intact until full hold completes
      this.envelope.setSealCrack(0);

      if (this.holdProgress >= 1) {
        this.holdProgress = 0;
        this.suppressNextTap = true;
        if (this.callbacks.onHoldProgress) this.callbacks.onHoldProgress(0);
        this.audio.playWaxCrack();
        this.envelope.triggerWaxBurst();
        this.envelope.setSealCrack(1);
        this.flapProgress = 0;
        this.letterPaper.root.visible = true;
        this.letterPaper.setFold(1);
        this.letterPaper.setWriteProgress(0, true);
        this.letterPaper.setHeartScale(0);
        this._setState(STATES.OPENED_PEEK);
      }
    } else if (this.state === STATES.OPENED_PEEK) {
      this.flapProgress = Math.min(1, this.flapProgress + dt * 1.75);
      const flapEase = easeOutCubic(this.flapProgress);

      this.envelope.root.position.lerp(new THREE.Vector3(0, -0.32, 0), smooth);
      this.envelope.root.rotation.set(0, Math.PI, 0);
      this.envelope.setFlapOpen(flapEase);
      this.envelope.setSealCrack(1);

      // Folded cream letter sits cleanly inside the pocket (IN FRONT of opened top flap, BEHIND lower pocket flaps)
      this.letterPaper.root.visible = true;
      this.letterPaper.setFold(1);
      const peekRise = easeOutCubic(Math.max(0, Math.min(1, (this.flapProgress - 0.32) / 0.68)));
      const peekY = THREE.MathUtils.lerp(-0.36, 0.04, peekRise) + Math.sin(this.elapsed * 2.4) * 0.016;
      this.letterPaper.root.position.set(0, peekY, 0.012);
      this.letterPaper.root.rotation.set(0, 0, 0);
      this.letterPaper.root.scale.setScalar(0.88);
      this.fountainPen.root.visible = false;
    } else if (this.state === STATES.UNFOLDING) {
      this.unfoldProgress = Math.min(1, this.unfoldProgress + dt / 1.15);
      const e = easeInOutCubic(this.unfoldProgress);

      // Envelope settles angled behind/beneath the bottom of the letter
      this.envelope.root.position.set(
        THREE.MathUtils.lerp(0, 0.16, e),
        THREE.MathUtils.lerp(-0.32, -1.36, e),
        THREE.MathUtils.lerp(0, -0.34, e)
      );
      this.envelope.root.rotation.set(0, Math.PI, THREE.MathUtils.lerp(0, -0.15, e));
      this.envelope.root.scale.setScalar(THREE.MathUtils.lerp(1, 0.88, e));
      this.envelope.setFlapOpen(1);

      // Letter pulls up, moves forward, and unfolds vertically
      this.letterPaper.root.visible = true;
      this.letterPaper.setFold(1 - e);
      this.letterPaper.root.position.set(
        THREE.MathUtils.lerp(0, 0.08, e),
        THREE.MathUtils.lerp(0.04, 0.12, e) + Math.sin(e * Math.PI) * 0.32,
        THREE.MathUtils.lerp(0.012, 0.12, e)
      );
      this.letterPaper.root.scale.setScalar(THREE.MathUtils.lerp(0.88, 1.0, e));

      if (this.unfoldProgress >= 1) {
        this.fountainPen.root.visible = true;
        this.penVisibility = 0;
        this.postSignDelay = 0;
        this.audio.startPenScratch();
        this._setState(STATES.WRITING);
      }
    } else if (this.state === STATES.WRITING) {
      // Slower, calm handwriting cadence (~16s full letter including deliberate signature at the bottom)
      const baseDuration = 16.0;
      if (this.writeProgress < 1) {
        this.writeProgress = Math.min(1, this.writeProgress + (dt / baseDuration) * this.writeSpeedMultiplier);
        const penState = this.letterPaper.setWriteProgress(this.writeProgress);
        if (penState) {
          this.penTipLocal.set(penState.x, penState.y);
          this.steadyLineY = penState.lineY;
          this.penIsPaused = penState.isPause;
          this.penIsSigning = penState.isSignature;
        }
      } else {
        this.postSignDelay += dt * this.writeSpeedMultiplier;
      }

      this.envelope.root.position.set(0.16, -1.36, -0.34);
      this.envelope.root.rotation.set(0, Math.PI, -0.15);
      this.envelope.root.scale.setScalar(0.88);
      this.envelope.setFlapOpen(1);

      // Keep the letter sheet rock-steady while writing (zero wobble)
      this.letterPaper.root.position.set(0.08, 0.12, 0.12);
      this.letterPaper.root.rotation.set(0, 0, 0);
      this.letterPaper.setFold(0);

      // Position fountain pen nib right at active ink stroke (lifting slightly during glide down to signature)
      this.fountainPen.root.visible = true;
      this.penVisibility = Math.min(1, this.penVisibility + dt * 3.5);
      const liftZ = this.penIsPaused ? 0.16 : this.writeProgress >= 1 ? 0.22 : 0.03;
      const targetPenPos = new THREE.Vector3(
        this.letterPaper.root.position.x + this.penTipLocal.x,
        this.letterPaper.root.position.y + this.penTipLocal.y,
        this.letterPaper.root.position.z + liftZ + (1 - this.penVisibility) * 0.6
      );
      this.fountainPen.root.position.lerp(targetPenPos, Math.min(1, dt * 14));
      const wiggleAmp = this.penIsPaused || this.writeProgress >= 1 ? 0.008 : this.penIsSigning ? 0.06 : 0.04;
      this.fountainPen.root.rotation.set(
        0.52 + Math.sin(this.elapsed * 16) * wiggleAmp * 0.7,
        -0.12,
        -0.36 + Math.cos(this.elapsed * 13) * wiggleAmp
      );

      if (this.writeProgress >= 1) {
        this.audio.stopPenScratch();
        if (this.postSignDelay >= 0.45) {
          this._setState(STATES.COMPLETE);
        }
      }
    } else if (this.state === STATES.COMPLETE) {
      // Envelope tucked gracefully underneath letter
      this.envelope.root.position.lerp(new THREE.Vector3(0.16, -1.36, -0.34), smooth);
      this.envelope.root.rotation.set(0, Math.PI, -0.15);
      this.envelope.root.scale.lerp(new THREE.Vector3(0.88, 0.88, 0.88), smooth);
      this.envelope.setFlapOpen(1);

      this.letterPaper.root.visible = true;
      this.letterPaper.root.position.lerp(new THREE.Vector3(0.08, 0.12, 0.12), smooth);
      this.letterPaper.root.scale.lerp(new THREE.Vector3(1, 1, 1), smooth);
      this.letterPaper.setFold(0);

      // Bounce in 3D crimson heart sticker
      this.heartProgress = Math.min(1, this.heartProgress + dt * 2.2);
      this.letterPaper.setHeartScale(easeOutBack(this.heartProgress));

      // Glide Polaroids out to the left side
      this.polaroidReveal = Math.min(1, this.polaroidReveal + dt * 1.45);

      // Fountain pen glides smoothly to rest neatly to the right of the letter
      this.fountainPen.root.visible = true;
      const restPos = new THREE.Vector3(1.94, -0.62, 0.24);
      this.fountainPen.root.position.lerp(restPos, Math.min(1, dt * 4.2));
      this.fountainPen.root.rotation.x += (0.08 - this.fountainPen.root.rotation.x) * Math.min(1, dt * 4.5);
      this.fountainPen.root.rotation.y += (0.04 - this.fountainPen.root.rotation.y) * Math.min(1, dt * 4.5);
      this.fountainPen.root.rotation.z += (0.14 - this.fountainPen.root.rotation.z) * Math.min(1, dt * 4.5);
    } else if (this.state === STATES.PUTTING_AWAY) {
      this.putAwayProgress = Math.min(1, this.putAwayProgress + dt / 1.45);
      const p = this.putAwayProgress;

      // 0..0.35: hide polaroids, pen & heart
      const hideT = Math.min(1, p / 0.35);
      this.polaroidReveal = Math.max(0, 1 - hideT * 1.4);
      this.letterPaper.setHeartScale(Math.max(0, 1 - hideT * 1.8));
      this.fountainPen.root.position.x += dt * 2.6;
      if (hideT > 0.7) this.fountainPen.root.visible = false;

      // 0.15..0.65: fold paper & slide back into envelope
      const foldT = easeInOutCubic(Math.max(0, Math.min(1, (p - 0.15) / 0.5)));
      this.letterPaper.setFold(foldT);
      this.letterPaper.root.position.set(
        THREE.MathUtils.lerp(0.08, 0, foldT),
        THREE.MathUtils.lerp(0.12, -0.25, foldT),
        THREE.MathUtils.lerp(0.12, 0.01, foldT)
      );
      this.letterPaper.root.scale.setScalar(THREE.MathUtils.lerp(1, 0.85, foldT));
      if (p > 0.65) this.letterPaper.root.visible = false;

      // 0.2..0.75: return envelope to center & close top flap
      const envT = easeInOutCubic(Math.max(0, Math.min(1, (p - 0.2) / 0.55)));
      this.envelope.root.position.set(
        THREE.MathUtils.lerp(0.16, 0, envT),
        THREE.MathUtils.lerp(-1.36, 0, envT),
        THREE.MathUtils.lerp(-0.34, 0, envT)
      );
      this.envelope.root.scale.setScalar(THREE.MathUtils.lerp(0.88, 1, envT));
      const closeFlapT = easeInOutCubic(Math.max(0, Math.min(1, (p - 0.5) / 0.28)));
      this.envelope.setFlapOpen(1 - closeFlapT);
      this.envelope.setSealCrack(1 - closeFlapT);

      // 0.72..1.0: turn envelope back to Front address side
      const turnT = easeInOutCubic(Math.max(0, Math.min(1, (p - 0.72) / 0.28)));
      this.envelope.root.rotation.set(
        THREE.MathUtils.lerp(0, 0.04, turnT),
        THREE.MathUtils.lerp(Math.PI, -0.1, turnT),
        THREE.MathUtils.lerp(-0.15, 0, envT)
      );

      if (p >= 1) {
        this.targetEnvRotX = 0.04;
        this.targetEnvRotY = -0.1;
        this.envRotX = 0.04;
        this.envRotY = -0.1;
        this.writeProgress = 0;
        this.heartProgress = 0;
        this.letterPaper.setWriteProgress(0, true);
        this._setState(STATES.SEALED);
      }
    }
  }

  _updateCamera(dt) {
    const smooth = Math.min(1, dt * 5.2);
    this.zoomLevel += (this.targetZoomLevel - this.zoomLevel) * smooth;
    this.panX += (this.targetPanX - this.panX) * smooth;
    this.panY += (this.targetPanY - this.panY) * smooth;

    let targetCamPos = new THREE.Vector3(0, 0.06, this._getResponsiveCameraZ(6.65));
    let lookTarget = new THREE.Vector3(0, 0, 0);

    if (this.state === STATES.HOLDING) {
      const z = THREE.MathUtils.lerp(this._getResponsiveCameraZ(6.2), this._getResponsiveCameraZ(4.05), easeOutCubic(this.holdProgress));
      targetCamPos.set(0, 0.02, z);
    } else if (this.state === STATES.OPENED_PEEK) {
      targetCamPos.set(0, 0.3, this._getResponsiveCameraZ(5.6));
      lookTarget.set(0, 0.2, 0);
    } else if (this.state === STATES.UNFOLDING) {
      targetCamPos.set(0.05, 0.15, this._getResponsiveCameraZ(6.0));
    } else if (this.state === STATES.WRITING) {
      // Smooth, heavily damped vertical camera glide following steadyLineY (zero letter wobble!)
      const desiredY = THREE.MathUtils.clamp(this.steadyLineY * 0.72 + 0.08, -1.15, 0.75);
      this.smoothCamFollowY += (desiredY - this.smoothCamFollowY) * Math.min(1, dt * 2.1);
      const followX = this.penIsSigning ? 0.24 : 0.08;
      const camZ = this._getResponsiveCameraZ(5.25);
      targetCamPos.set(followX, this.smoothCamFollowY, camZ);
      lookTarget.set(followX, this.smoothCamFollowY, 0.12);
    } else if (this.state === STATES.COMPLETE) {
      const baseZ = this._getResponsiveCameraZ(7.15) / this.zoomLevel;
      targetCamPos.set(-0.22 + this.panX, 0.02 + this.panY, baseZ);
      lookTarget.set(-0.22 + this.panX * 0.88, 0.02 + this.panY * 0.88, 0);
    } else if (this.state === STATES.PUTTING_AWAY) {
      targetCamPos.set(0, 0.06, this._getResponsiveCameraZ(6.2));
    }

    this.camera.position.lerp(targetCamPos, smooth);
    this.camera.lookAt(lookTarget);
  }

  dispose() {
    this.running = false;
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerUp);
    this.renderer.dispose();
  }
}
