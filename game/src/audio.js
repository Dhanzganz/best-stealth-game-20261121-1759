// The Lantern Thief — all sound is synthesized with WebAudio: no audio
// files, no network. Footsteps, a pickup chime, an alarm sting, a win
// arpeggio, and a quiet night drone underneath it all.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.drone = null;
    this.enabled = true;
  }

  // Browsers only let audio start after a user gesture: call this from the
  // first keypress or click, then every sound is allowed.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.startDrone();
  }

  startDrone() {
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.035;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    lfo.start();
    this.drone = { osc, lfo };
  }

  tone(freq, dur, type, vol, when = 0) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // A short burst of filtered noise: a footstep on stone.
  footstep(running) {
    if (!this.ctx || !this.enabled) return;
    const dur = 0.07;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = running ? 900 : 420;
    const gain = this.ctx.createGain();
    gain.gain.value = running ? 0.16 : 0.05;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start();
  }

  pickup() {
    this.tone(880, 0.16, 'sine', 0.22);
    this.tone(1318, 0.28, 'sine', 0.2, 0.09);
  }

  // Rising two-note sting when a guard's meter fills.
  alarm() {
    this.tone(196, 0.22, 'sawtooth', 0.16);
    this.tone(262, 0.3, 'sawtooth', 0.16, 0.16);
  }

  // Harsh buzz when the thief is caught.
  caught() {
    this.tone(110, 0.5, 'square', 0.2);
    this.tone(104, 0.5, 'square', 0.2, 0.05);
  }

  levelClear() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.2, i * 0.11));
  }

  win() {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.42, 'triangle', 0.2, i * 0.13));
  }
}
