export class RiderAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.speed = 0;
    this._started = false;
  }

  ensure() {
    if (this._started) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    this._started = true;
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.8 : 0;
    this.master.connect(ctx.destination);

    const noiseLen = ctx.sampleRate * 2;
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = noiseBuf;

    const wind = ctx.createBufferSource();
    wind.buffer = noiseBuf;
    wind.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 380;
    this.windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.master);
    wind.start();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(on ? 0.8 : 0, this.ctx.currentTime, 0.05);
  }

  setSpeed(s) {
    this.speed = s;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(Math.min(s, 2) * 0.10, t, 0.15);
    this.windFilter.frequency.setTargetAtTime(320 + Math.min(s, 2) * 480, t, 0.15);
  }

  chainTick() {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 1.5;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400 + Math.random() * 600;
    bp.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.055 * Math.min(this.speed, 1.4), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + 0.07);
  }

  bell() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    for (let strike = 0; strike < 2; strike++) {
      const t = ctx.currentTime + strike * 0.14;
      for (const [freq, amp, dur] of [[2093, 0.16, 1.1], [2637, 0.09, 0.8], [3520, 0.045, 0.5]]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq * (1 + (Math.random() - 0.5) * 0.004);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(amp, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g).connect(this.master);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      }
    }
  }
}