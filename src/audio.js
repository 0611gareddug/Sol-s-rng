/* ============================================================
 * 오디오 — Web Audio 합성 (외부 음원 없음)
 * ============================================================ */

const AU = {
  ctx: null, master: null, bgmBus: null, sfxBus: null, verb: null, noiseBuf: null,
  bgmNodes: null, chordIdx: 0, chordTimer: 0, ready: false,

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.bgmBus = c.createGain();
    this.sfxBus = c.createGain();
    // 리버브 (생성 임펄스)
    this.verb = c.createConvolver();
    this.verb.buffer = this.makeImpulse(2.8, 2.6);
    const verbGain = c.createGain();
    verbGain.gain.value = .35;
    this.verb.connect(verbGain).connect(this.master);
    this.bgmBus.connect(this.master);
    this.bgmBus.connect(this.verb);
    this.sfxBus.connect(this.master);
    this.sfxBus.connect(this.verb);
    // 노이즈 버퍼
    const len = c.sampleRate * 2;
    this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolume();
    this.ready = true;
    this.startBgm();
  },
  makeImpulse(sec, decay) {
    const c = this.ctx, len = Math.floor(c.sampleRate * sec);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  },
  applyVolume() {
    if (!this.ctx) return;
    const st = G.s.set, t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(st.mute ? 0 : st.mv, t, .05);
    this.bgmBus.gain.setTargetAtTime(st.bgm * .55, t, .05);
    this.sfxBus.gain.setTargetAtTime(st.sfx, t, .05);
  },

  /* ── 기본 음원 ── */
  tone(freq, dur, opt) {
    if (!this.ready) return;
    opt = opt || {};
    const c = this.ctx, t = c.currentTime + (opt.delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = opt.type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opt.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opt.slide), t + dur);
    if (opt.detune) o.detune.value = opt.detune;
    const v = opt.vol == null ? .2 : opt.vol;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + (opt.atk || .005));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(opt.bus || this.sfxBus);
    o.start(t);
    o.stop(t + dur + .05);
  },
  noise(dur, opt) {
    if (!this.ready) return;
    opt = opt || {};
    const c = this.ctx, t = c.currentTime + (opt.delay || 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = opt.ftype || 'lowpass';
    f.frequency.setValueAtTime(opt.f0 || 2000, t);
    if (opt.f1) f.frequency.exponentialRampToValueAtTime(opt.f1, t + dur);
    f.Q.value = opt.q || .7;
    const g = c.createGain();
    const v = opt.vol == null ? .3 : opt.vol;
    if (opt.rise) {
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + dur * .95);
      g.gain.linearRampToValueAtTime(0, t + dur);
    } else {
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    }
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t);
    src.stop(t + dur + .05);
  },

  /* ── 효과음 ── */
  click() { this.tone(880, .06, { vol: .08, type: 'triangle' }); },
  tick(p) { this.tone(600 + p * 900, .04, { vol: .05, type: 'sine' }); },
  rollStart(blessed) {
    this.tone(blessed ? 660 : 440, .18, { vol: .1, type: 'triangle', slide: 1.5 });
    if (blessed) this.tone(990, .3, { vol: .06, delay: .05, slide: 1.3 });
  },
  result(tier) {
    const base = [0, 523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.66][tier];
    if (tier <= 1) { this.tone(base, .25, { vol: .1, type: 'triangle' }); return; }
    const chord = [1, 1.25, 1.5, 2, 2.5, 3];
    const n = Math.min(chord.length, tier + 1);
    for (let i = 0; i < n; i++) {
      this.tone(base * chord[i], .6 + tier * .25, { vol: .1 / Math.sqrt(n) * 1.6, type: i % 2 ? 'sine' : 'triangle', delay: tier >= 3 ? i * .06 : 0 });
    }
    if (tier >= 4) this.tone(base / 4, 1.2 + tier * .2, { vol: .22, type: 'sine' });
    if (tier >= 5) this.noise(1.2, { f0: 6000, f1: 800, vol: .08, ftype: 'bandpass' });
  },
  riser(dur, vol) {
    this.noise(dur, { f0: 300, f1: 9000, rise: 1, vol: vol || .18, ftype: 'bandpass', q: 1.5 });
    this.tone(110, dur, { vol: .08, type: 'sawtooth', slide: 4, atk: dur * .8 });
  },
  boom(vol) {
    vol = vol || .5;
    this.tone(90, 1.6, { vol, type: 'sine', slide: .3 });
    this.tone(45, 2.2, { vol: vol * .8, type: 'sine', slide: .5 });
    this.noise(1.2, { f0: 3000, f1: 100, vol: vol * .5 });
  },
  beat(i) {
    this.tone(70, .35, { vol: .45, type: 'sine', slide: .5 });
    this.tone(1400 + i * 200, .12, { vol: .05, type: 'square' });
  },
  shimmer(d) {
    for (let i = 0; i < 8; i++) this.tone(1200 + Math.random() * 2400, .5, { vol: .03, delay: (d || 0) + i * .07 });
  },
  choir(freqs, dur, delay) {
    for (const f of freqs) {
      this.tone(f, dur, { vol: .06, type: 'sawtooth', atk: dur * .3, delay, detune: -6 });
      this.tone(f, dur, { vol: .06, type: 'sawtooth', atk: dur * .3, delay, detune: 6 });
    }
  },
  alarm() {
    for (let i = 0; i < 3; i++) this.tone(740, .18, { vol: .07, type: 'triangle', delay: i * .25 });
    this.tone(1110, .5, { vol: .06, delay: .75 });
  },
  craft() {
    this.tone(523, .15, { vol: .1, type: 'triangle' });
    this.tone(784, .2, { vol: .1, type: 'triangle', delay: .1 });
    this.tone(1046, .5, { vol: .1, type: 'sine', delay: .2 });
    this.shimmer(.25);
  },
  achieve() {
    [659, 784, 988, 1318].forEach((f, i) => this.tone(f, .4, { vol: .08, type: 'triangle', delay: i * .08 }));
  },
  error() { this.tone(200, .15, { vol: .1, type: 'square', slide: .7 }); },

  /* ── BGM: 느리게 변하는 앰비언트 패드 + 바람 ── */
  CHORDS: [
    [130.81, 196, 246.94, 329.63],  // Cmaj7
    [110, 164.81, 220, 261.63],     // Am7
    [87.31, 130.81, 174.61, 220],   // Fmaj7
    [98, 146.83, 196, 246.94]       // G6
  ],
  startBgm() {
    const c = this.ctx;
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = .5;
    const lfo = c.createOscillator(), lfoG = c.createGain();
    lfo.frequency.value = .05;
    lfoG.gain.value = 350;
    lfo.connect(lfoG).connect(filter.frequency);
    lfo.start();
    const padGain = c.createGain();
    padGain.gain.value = .07;
    filter.connect(padGain).connect(this.bgmBus);
    const voices = [];
    for (let i = 0; i < 4; i++) {
      for (const det of [-7, 7]) {
        const o = c.createOscillator();
        o.type = i === 0 ? 'triangle' : 'sawtooth';
        o.detune.value = det;
        o.frequency.value = this.CHORDS[0][i];
        const g = c.createGain();
        g.gain.value = i === 0 ? .5 : .22;
        o.connect(g).connect(filter);
        o.start();
        voices.push({ o, i });
      }
    }
    // 바람 노이즈
    const wind = c.createBufferSource();
    wind.buffer = this.noiseBuf;
    wind.loop = true;
    const wf = c.createBiquadFilter();
    wf.type = 'bandpass';
    wf.frequency.value = 500;
    wf.Q.value = 2;
    const wl = c.createOscillator(), wlg = c.createGain();
    wl.frequency.value = .08;
    wlg.gain.value = 300;
    wl.connect(wlg).connect(wf.frequency);
    wl.start();
    const wg = c.createGain();
    wg.gain.value = .025;
    wind.connect(wf).connect(wg).connect(this.bgmBus);
    wind.start();
    this.bgmNodes = { voices, filter, wf, padGain };
    this.chordTimer = 0;
  },
  /* 메인 루프에서 호출 */
  update(dt) {
    if (!this.bgmNodes) return;
    this.chordTimer += dt;
    if (this.chordTimer >= 9) {
      this.chordTimer = 0;
      this.chordIdx = (this.chordIdx + 1) % this.CHORDS.length;
      const ch = this.CHORDS[this.chordIdx], t = this.ctx.currentTime;
      for (const v of this.bgmNodes.voices) v.o.frequency.setTargetAtTime(ch[v.i], t, 1.5);
      // 저음 종소리
      this.tone(ch[0] * 4, 3, { vol: .025, bus: this.bgmBus, atk: .02 });
    }
  },
  setEventTone(id) {
    if (!this.bgmNodes) return;
    const t = this.ctx.currentTime;
    const f = { meteor: 1400, storm: 650, eclipse: 420, align: 1800 }[id] || 900;
    this.bgmNodes.filter.frequency.setTargetAtTime(f, t, 2);
  },
  duck(on) {
    if (!this.bgmNodes) return;
    this.bgmNodes.padGain.gain.setTargetAtTime(on ? .015 : .07, this.ctx.currentTime, on ? .2 : 1.2);
  }
};
