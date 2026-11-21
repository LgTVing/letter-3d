// Procedural Web Audio sound engine: wax seal crack, paper rustle, polaroid flip, and fountain pen on paper.

export class LetterAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.8;
    this.muted = false;
    this.noiseBuffer = null;
    this.penNode = null;
    this.penGain = null;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this._createNoiseBuffer(2.5);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  _createNoiseBuffer(seconds) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * seconds);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Soft pink-ish paper texture noise
      data[i] = (lastOut + 0.14 * white) / 1.14;
      lastOut = data[i];
    }
    return buffer;
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
  }

  setMuted(m) {
    this.muted = Boolean(m);
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
    }
  }

  playWaxCrack() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Crisp brittle wax snap burst
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(1900, now);
    bandpass.frequency.exponentialRampToValueAtTime(620, now + 0.16);
    bandpass.Q.value = 2.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.55, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    src.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 0.5, 0.25);

    // Subtle secondary crumble crackle
    const src2 = ctx.createBufferSource();
    src2.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2200;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.001, now + 0.07);
    g2.gain.linearRampToValueAtTime(0.22, now + 0.09);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    src2.connect(hp);
    hp.connect(g2);
    g2.connect(this.masterGain);
    src2.start(now + 0.06, Math.random() * 0.8, 0.24);
  }

  playPaperRustle(duration = 0.42, pitch = 950) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(pitch, now);
    filter.frequency.linearRampToValueAtTime(pitch * 1.35, now + duration * 0.5);
    filter.frequency.linearRampToValueAtTime(pitch * 0.8, now + duration);
    filter.Q.value = 1.4;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.24, now + duration * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 1.0, duration + 0.05);
  }

  playCardFlip() {
    this.playPaperRustle(0.22, 1350);
  }

  startPenScratch() {
    const ctx = this.ensureContext();
    if (!ctx || this.penNode) return;
    const now = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2600;
    filter.Q.value = 3.6;

    // Gentle LFO to modulate nib stroke rhythm
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 8.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.045;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.075, now + 0.15);

    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    src.start(now);
    lfo.start(now);

    this.penNode = { src, lfo, filter };
    this.penGain = gain;
  }

  stopPenScratch() {
    if (!this.penNode || !this.ctx) return;
    const now = this.ctx.currentTime;
    const { src, lfo } = this.penNode;
    const gain = this.penGain;
    this.penNode = null;
    this.penGain = null;
    try {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0.0001, now, 0.05);
      setTimeout(() => {
        try {
          src.stop();
          lfo.stop();
        } catch {
          // ignore
        }
      }, 220);
    } catch {
      // ignore
    }
  }
}
