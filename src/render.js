/* ============================================================
 * 렌더러 — 배경 · 회색 더미 · 오라 FX · 파티클 · 컷신
 * ============================================================ */

const TAU = Math.PI * 2;
const sr = i => { const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const ease = p => p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
const easeOut = p => 1 - Math.pow(1 - p, 3);

/* ── 색 유틸 ── */
const _rgb = {};
function hex2rgb(h) {
  let c = _rgb[h];
  if (c) return c;
  const n = parseInt(h.slice(1), 16);
  c = _rgb[h] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return c;
}
function rgba(h, a) { const c = hex2rgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function hsl2hex(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return '#' + [f(0), f(8), f(4)].map(x => x.toString(16).padStart(2, '0')).join('');
}
const PRISM = [];
for (let i = 0; i < 36; i++) PRISM.push(hsl2hex(i * 10, 100, 68));
function prismAt(h) { return PRISM[(((Math.floor(h / 10)) % 36) + 36) % 36]; }
function auraCol(a, which, t, off) {
  const c = which === 2 ? a.c2 : a.c1;
  if (c === 'prism' || (a.prism && which === 1)) return prismAt(t * 70 + (off || 0));
  return c;
}
function tierCol(tier, t) {
  const c = TIERS[tier].color;
  return c === 'prism' ? prismAt(t * 90) : c;
}
function mixHex(a, b, p) {
  const x = hex2rgb(a), y = hex2rgb(b);
  return '#' + [0, 1, 2].map(i => Math.round(x[i] + (y[i] - x[i]) * p).toString(16).padStart(2, '0')).join('');
}

/* ── 발광 스프라이트 캐시 (shadowBlur 대신 사용 → 빠름) ── */
const _spr = {};
function sprite(color, kind) {
  const key = (kind || 'g') + color;
  let c = _spr[key];
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  if (kind === 's') {
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(.18, rgba(color, 1));
    g.addColorStop(.45, rgba(color, .35));
    g.addColorStop(1, rgba(color, 0));
  } else if (kind === 'd') {
    g.addColorStop(0, rgba(color, 1));
    g.addColorStop(.5, rgba(color, .6));
    g.addColorStop(1, rgba(color, 0));
  } else {
    g.addColorStop(0, rgba(color, 1));
    g.addColorStop(.3, rgba(color, .45));
    g.addColorStop(.65, rgba(color, .12));
    g.addColorStop(1, rgba(color, 0));
  }
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  _spr[key] = c;
  return c;
}
/* 광선 스프라이트: 꼭짓점에서 퍼지는 쐐기 + 끝으로 갈수록 투명 */
function raySprite(color) {
  const key = 'r' + color;
  let c = _spr[key];
  if (c) return c;
  c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, rgba(color, 1)); g.addColorStop(.35, rgba(color, .55)); g.addColorStop(1, rgba(color, 0));
  x.fillStyle = g;
  x.beginPath(); x.moveTo(0, 32); x.lineTo(256, 0); x.lineTo(256, 64); x.closePath(); x.fill();
  _spr[key] = c;
  return c;
}
function blob(ctx, x, y, r, color, a, kind) {
  if (a <= 0 || r <= 0) return;
  ctx.globalAlpha = a > 1 ? 1 : a;
  ctx.drawImage(sprite(color, kind), x - r, y - r, r * 2, r * 2);
}

/* ── 파티클 풀 ── */
function Pool(max) {
  this.max = max;
  this.items = [];
  this.free = [];
  for (let i = 0; i < max; i++) {
    this.items.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, ax: 0, ay: 0, life: 0, max: 1, size: 1, col: '#fff', col2: null, kind: 0, front: true, rot: 0, vr: 0, tx: 0, ty: 0, drag: 0 });
    this.free.push(max - 1 - i);
  }
  this.limit = max;
}
Pool.prototype.spawn = function () {
  if (!this.free.length || (this.max - this.free.length) >= this.limit) return null;
  const p = this.items[this.free.pop()];
  p.on = true; p.ax = 0; p.ay = 0; p.rot = 0; p.vr = 0; p.drag = 0; p.col2 = null; p.front = true; p.kind = 0;
  return p;
};
Pool.prototype.update = function (dt) {
  const it = this.items;
  for (let i = 0; i < it.length; i++) {
    const p = it[i];
    if (!p.on) continue;
    p.life -= dt;
    if (p.life <= 0) { p.on = false; this.free.push(i); continue; }
    if (p.kind === K_SUCK) {
      // 중심으로 빨려 들어가는 소용돌이 (vr = 기준 속도)
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy) || 1;
      const sp = p.vr * (.6 + (1 - p.life / p.max) * 3.2);
      p.vx = (dx / d - dy / d * .55) * sp;
      p.vy = (dy / d + dx / d * .55) * sp;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (d < p.vr * .12) { p.on = false; this.free.push(i); }
      continue;
    }
    p.vx += p.ax * dt; p.vy += p.ay * dt;
    if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.vr * dt;
  }
};
Pool.prototype.clear = function () {
  this.free.length = 0;
  for (let i = 0; i < this.items.length; i++) { this.items[i].on = false; this.free.push(i); }
};
const K_DOT = 0, K_STREAK = 1, K_CRYSTAL = 2, K_FLAME = 3, K_BLINK = 4, K_SUCK = 5, K_DARK = 6, K_SPARK = 7;

function drawParticles(ctx, pool, front, k) {
  const it = pool.items;
  for (let i = 0; i < it.length; i++) {
    const p = it[i];
    if (!p.on || p.front !== front) continue;
    const lf = p.life / p.max;
    let a = lf < .3 ? lf / .3 : (lf > .85 ? (1 - lf) / .15 : 1);
    const s = p.size * k;
    switch (p.kind) {
      case K_STREAK:
      case K_SUCK: {
        const sp = Math.hypot(p.vx, p.vy) || 1;
        const len = Math.min(60 * k, sp * .06);
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.col;
        ctx.lineWidth = s;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx / sp * len, p.y - p.vy / sp * len);
        ctx.stroke();
        blob(ctx, p.x, p.y, s * 3, p.col, a, 's');
        break;
      }
      case K_CRYSTAL: {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = a * .9;
        ctx.fillStyle = p.col;
        ctx.beginPath();
        ctx.moveTo(0, -s * 2.2); ctx.lineTo(s * .8, 0); ctx.lineTo(0, s * 2.2); ctx.lineTo(-s * .8, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        blob(ctx, p.x, p.y, s * 3, p.col, a * .5);
        break;
      }
      case K_FLAME: {
        const c = p.col2 ? mixHex(p.col2, p.col, lf) : p.col;
        blob(ctx, p.x, p.y, s * (1.2 + lf * 2.2), c, a * .8);
        break;
      }
      case K_BLINK:
        a *= .5 + .5 * Math.sin(p.rot * 6);
        blob(ctx, p.x, p.y, s * 3.5, p.col, a, 's');
        break;
      case K_DARK:
        ctx.globalCompositeOperation = 'source-over';
        blob(ctx, p.x, p.y, s * 2.4, '#000000', a * .85, 'd');
        ctx.globalCompositeOperation = 'lighter';
        break;
      case K_SPARK:
        blob(ctx, p.x, p.y, s * 2.6, p.col, a, 's');
        break;
      default:
        blob(ctx, p.x, p.y, s * 3, p.col, a * .9, 's');
    }
  }
  ctx.globalAlpha = 1;
}

/* ============================================================
 * View — 하나의 캔버스(메인 화면 또는 도감 미리보기)
 * ============================================================ */
function View(canvas, opt) {
  this.cv = canvas;
  this.ctx = canvas.getContext('2d', { alpha: !!opt.preview });
  this.preview = !!opt.preview;
  this.pool = new Pool(opt.max || 700);
  this.acc = [];
  this.st = {};      // FX 개별 상태 (번개, 폭죽 등)
  this.aura = AURA_BY_ID[1];
  this.t = 0;
  this.w = this.h = 1;
  this.dpr = 1;
  this.shake = 0;
  this.zoom = 1;
  this.hidden = false;
}
View.prototype.setAura = function (a) {
  if (this.aura === a) return;
  this.aura = a;
  this.acc = [];
  this.st = {};
  this.pool.clear();
};
View.prototype.resize = function (dprCap) {
  const r = this.cv.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (w !== this.cv.width || h !== this.cv.height) { this.cv.width = w; this.cv.height = h; }
  this.w = w; this.h = h; this.dpr = dpr;
  this.layout();
};
View.prototype.layout = function () {
  const w = this.w, h = this.h;
  if (this.preview) {
    this.U = Math.min(h * .17, w * .14);
    this.cx = w / 2; this.cy = h * .54;
  } else {
    const mobile = w / this.dpr < 760;
    this.U = mobile ? Math.min(h * .075, w * .12) : Math.min(h * .085, w * .07);
    this.cx = w / 2;
    this.cy = mobile ? h * .42 : h * .45;
  }
  this.k = this.U / 50;
};

/* ============================================================
 * 배경
 * ============================================================ */
const BG = {
  layers: [], w: 0, h: 0, twinkles: [], meteors: [], evBlend: 0, evId: null, nebT: 0,
  build(w, h, q) {
    this.w = w; this.h = h;
    // 정적 레이어(그라데이션 + 성운 + 먼 별)를 한 장에 미리 그려 매 프레임 1회만 복사 → 저사양 최적화
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const x = c.getContext('2d', { alpha: false });
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#04050c'); g.addColorStop(.55, '#070a1a'); g.addColorStop(1, '#0b0820');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'lighter';
    const m = Math.max(w, h);
    blob(x, w * .2, h * .25, m * .55, '#3a2a8a', .22);
    blob(x, w * .85, h * .7, m * .5, '#1a3a7a', .22);
    blob(x, w * .55, h * .95, m * .45, '#5a1a6a', .16);
    x.globalCompositeOperation = 'source-over';
    const far = Math.round(w * h / 2600 * q), sc = Math.max(1, w / 1600);
    for (let i = 0; i < far; i++) {
      const t = Math.random();
      x.fillStyle = t < .15 ? '#ffd9b0' : t < .3 ? '#b8ccff' : '#ffffff';
      x.globalAlpha = .2 + Math.random() * .55;
      const s = (.4 + Math.random() * .6) * sc;
      x.fillRect(Math.random() * w, Math.random() * h, s, s);
    }
    this.base = c;
    // 움직이는 별 (시차) — 개별 점으로 그려 전체 화면 복사 비용 제거
    this.stars = [];
    const near = Math.round(w * h / 7000 * q);
    for (let i = 0; i < near; i++) {
      const L = Math.random() < .75 ? 1 : 2, t = Math.random();
      this.stars.push({ x: Math.random() * w, y: Math.random() * h, s: (L * .9 + Math.random()) * sc, a: .3 + Math.random() * .6, sp: L === 1 ? 6 : 13, c: t < .15 ? '#ffd9b0' : t < .3 ? '#b8ccff' : '#ffffff' });
    }
    this.twinkles = [];
    for (let i = 0; i < 26; i++) this.twinkles.push({ x: Math.random(), y: Math.random(), s: 1 + Math.random() * 2, ph: Math.random() * TAU, sp: .5 + Math.random() * 1.5 });
  },
  draw(v, dt) {
    const ctx = v.ctx, w = v.w, h = v.h, t = v.t;
    if (this.w !== w || this.h !== h) this.build(w, h, R.q);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.drawImage(this.base, 0, 0);
    this.nebT += dt;
    for (const s of this.stars) {
      let x = (s.x - t * s.sp * v.dpr) % w;
      if (x < 0) x += w;
      ctx.globalAlpha = s.a;
      ctx.fillStyle = s.c;
      ctx.fillRect(x, s.y, s.s, s.s);
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.twinkles) {
      const a = .4 + .6 * Math.max(0, Math.sin(t * s.sp + s.ph));
      blob(ctx, s.x * w, s.y * h, s.s * 5 * v.dpr, '#dfe8ff', a * .8, 's');
    }
    // 이벤트 배경
    const ev = G.s.ev;
    const target = ev ? 1 : 0;
    if (ev) this.evId = ev.id;
    this.evBlend += (target - this.evBlend) * Math.min(1, dt * .8);
    if (this.evBlend > .01 && this.evId) this.drawEvent(v, dt, this.evId, this.evBlend);
    ctx.globalAlpha = 1;
  },
  drawEvent(v, dt, id, b) {
    const ctx = v.ctx, w = v.w, h = v.h, t = v.t, d = v.dpr;
    if (id === 'meteor') {
      if (Math.random() < dt * 5 * R.q) this.meteors.push({ x: Math.random() * w * 1.2, y: -20, sp: (700 + Math.random() * 600) * d, l: 0, max: .8 + Math.random() * .6 });
      ctx.lineCap = 'round';
      for (let i = this.meteors.length - 1; i >= 0; i--) {
        const m = this.meteors[i];
        m.l += dt;
        if (m.l > m.max) { this.meteors.splice(i, 1); continue; }
        m.x -= m.sp * .55 * dt; m.y += m.sp * dt;
        const a = b * Math.sin(m.l / m.max * Math.PI);
        const gr = ctx.createLinearGradient(m.x, m.y, m.x + 90 * d, m.y - 160 * d);
        gr.addColorStop(0, `rgba(255,240,200,${a})`);
        gr.addColorStop(1, 'rgba(255,200,120,0)');
        ctx.strokeStyle = gr;
        ctx.lineWidth = 2 * d;
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x + 90 * d, m.y - 160 * d); ctx.stroke();
        blob(ctx, m.x, m.y, 7 * d, '#fff2c8', a, 's');
      }
    } else if (id === 'storm') {
      for (let i = 0; i < 7; i++) {
        const x = ((sr(i) * w + t * (40 + i * 12) * d) % (w * 1.4)) - w * .2;
        const y = h * (.15 + sr(i + 9) * .7) + Math.sin(t * .4 + i) * 30 * d;
        blob(ctx, x, y, Math.max(w, h) * (.18 + sr(i + 3) * .14), i % 2 ? '#8a3aff' : '#ff4ab8', .16 * b);
      }
    } else if (id === 'eclipse') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = .45 * b;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const ex = w * .82, ey = h * .16, er = Math.min(w, h) * .06;
      blob(ctx, ex, ey, er * 4, '#ffdca0', .45 * b);
      for (let i = 0; i < 10; i++) {
        const an = i / 10 * TAU + t * .05;
        blob(ctx, ex + Math.cos(an) * er * 1.4, ey + Math.sin(an) * er * 1.4, er * 1.2, '#fff4d8', .2 * b);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = b;
      ctx.fillStyle = '#020204';
      ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
    } else if (id === 'align') {
      const ev = G.s.ev;
      const prog = ev ? clamp(1 - ev.rem / ev.dur, 0, 1) : 1;
      const al = easeOut(clamp(prog * 4, 0, 1));
      const y0 = h * .14;
      ctx.globalAlpha = .25 * b * al;
      const gr = ctx.createLinearGradient(0, y0 - 30 * d, 0, y0 + 30 * d);
      gr.addColorStop(0, 'rgba(255,210,94,0)'); gr.addColorStop(.5, 'rgba(255,210,94,.6)'); gr.addColorStop(1, 'rgba(255,210,94,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, y0 - 30 * d, w, 60 * d);
      const cols = ['#c9b38a', '#e8c98a', '#6fa8ff', '#ff7a4d', '#e8d8b5', '#ffd9a0', '#8fd8ff'];
      for (let i = 0; i < 7; i++) {
        const tx = w * (.12 + i * .127), sx = w * sr(i + 20), sy = h * (.05 + sr(i + 30) * .3);
        const x = sx + (tx - sx) * al, y = sy + (y0 - sy) * al;
        const r = (5 + sr(i + 40) * 9) * d;
        blob(ctx, x, y, r * 4, cols[i], .5 * b);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = b;
        ctx.fillStyle = cols[i];
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
      }
    }
    ctx.globalAlpha = 1;
  }
};

/* ============================================================
 * 회색 더미
 * ============================================================ */
function drawDummy(v, cx, cy, mode, rim) {
  const ctx = v.ctx, U = v.U;
  const X = u => cx + u * U, Y = u => cy + u * U;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  let fill;
  if (mode === 'dark') fill = '#050507';
  else {
    fill = ctx.createLinearGradient(X(-.8), 0, X(.8), 0);
    fill.addColorStop(0, '#a3a8b4');
    fill.addColorStop(.45, '#80858f');
    fill.addColorStop(1, '#4d525d');
  }
  ctx.fillStyle = fill;
  // 다리
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(X(s * .06), Y(.42));
    ctx.lineTo(X(s * .36), Y(.42));
    ctx.quadraticCurveTo(X(s * .34), Y(1.2), X(s * .28), Y(1.95));
    ctx.quadraticCurveTo(X(s * .27), Y(2.06), X(s * .17), Y(2.06));
    ctx.lineTo(X(s * .1), Y(2.06));
    ctx.quadraticCurveTo(X(s * .06), Y(1.2), X(s * .06), Y(.42));
    ctx.fill();
  }
  // 팔
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(X(s * .5), Y(-1.02));
    ctx.quadraticCurveTo(X(s * .7), Y(-1.0), X(s * .72), Y(-.75));
    ctx.quadraticCurveTo(X(s * .8), Y(-.1), X(s * .82), Y(.38));
    ctx.quadraticCurveTo(X(s * .78), Y(.5), X(s * .7), Y(.42));
    ctx.quadraticCurveTo(X(s * .62), Y(-.1), X(s * .5), Y(-.6));
    ctx.fill();
  }
  // 몸통
  ctx.beginPath();
  ctx.moveTo(X(-.56), Y(-1.0));
  ctx.quadraticCurveTo(X(0), Y(-1.14), X(.56), Y(-1.0));
  ctx.quadraticCurveTo(X(.5), Y(-.4), X(.32), Y(.1));
  ctx.quadraticCurveTo(X(.42), Y(.3), X(.38), Y(.5));
  ctx.quadraticCurveTo(X(0), Y(.58), X(-.38), Y(.5));
  ctx.quadraticCurveTo(X(-.42), Y(.3), X(-.32), Y(.1));
  ctx.quadraticCurveTo(X(-.5), Y(-.4), X(-.56), Y(-1.0));
  ctx.fill();
  // 목 · 머리
  ctx.fillRect(X(-.11), Y(-1.28), .22 * U, .3 * U);
  ctx.beginPath();
  ctx.ellipse(X(0), Y(-1.58), .31 * U, .37 * U, 0, 0, TAU);
  ctx.fill();
  if (mode !== 'dark') {
    // 관절선 · 음영
    ctx.strokeStyle = 'rgba(30,32,40,.35)';
    ctx.lineWidth = Math.max(1, U * .02);
    ctx.beginPath();
    ctx.moveTo(X(-.33), Y(.12)); ctx.quadraticCurveTo(X(0), Y(.2), X(.33), Y(.12));
    for (const s of [-1, 1]) {
      ctx.moveTo(X(s * .62), Y(-.92)); ctx.quadraticCurveTo(X(s * .55), Y(-.8), X(s * .6), Y(-.68));
      ctx.moveTo(X(s * .69), Y(-.2)); ctx.lineTo(X(s * .8), Y(-.22));
      ctx.moveTo(X(s * .1), Y(1.22)); ctx.lineTo(X(s * .33), Y(1.2));
    }
    ctx.stroke();
    // 하이라이트
    ctx.globalCompositeOperation = 'lighter';
    blob(ctx, X(-.12), Y(-1.68), U * .28, '#ffffff', .12);
    blob(ctx, X(-.2), Y(-.6), U * .45, '#ffffff', .06);
    // 오라 색 림라이트
    if (rim) {
      ctx.globalAlpha = .22;
      ctx.strokeStyle = rim;
      ctx.lineWidth = Math.max(1, U * .03);
      ctx.beginPath();
      ctx.ellipse(X(0), Y(-1.58), .31 * U, .37 * U, 0, Math.PI * .95, Math.PI * 1.55);
      ctx.stroke();
      ctx.globalAlpha = .12;
      ctx.beginPath();
      ctx.moveTo(X(-.56), Y(-1.0)); ctx.quadraticCurveTo(X(0), Y(-1.14), X(.56), Y(-1.0));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  // 장비 장식
  if (!v.preview || v.showGear) {
    ctx.globalCompositeOperation = 'lighter';
    const gl = G.s.gear.glove, nk = G.s.gear.neck;
    if (gl) {
      const c = GEAR_TIER_COLOR[gl];
      for (const s of [-1, 1]) {
        ctx.globalAlpha = .9;
        ctx.strokeStyle = c;
        ctx.lineWidth = U * .06;
        ctx.beginPath(); ctx.moveTo(X(s * .7), Y(.28)); ctx.lineTo(X(s * .83), Y(.26)); ctx.stroke();
        blob(ctx, X(s * .77), Y(.3), U * (.18 + gl * .04), c, .5 + .1 * Math.sin(v.t * 3));
      }
    }
    if (nk) {
      const c = GEAR_TIER_COLOR[nk];
      ctx.globalAlpha = .9;
      ctx.strokeStyle = c;
      ctx.lineWidth = U * .04;
      ctx.beginPath(); ctx.ellipse(X(0), Y(-1.08), .2 * U, .07 * U, 0, 0, Math.PI); ctx.stroke();
      blob(ctx, X(0), Y(-1.0), U * (.12 + nk * .03), c, .7 + .2 * Math.sin(v.t * 4));
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 1;
}

/* ============================================================
 * 오라 FX 라이브러리
 * 각 함수: (v, p, a, t, L, cx, cy) — L: 'b'(더미 뒤) | 'f'(더미 앞) | 'u'(업데이트, dt=t)
 * ============================================================ */
function pickCol(v, a, p, t) {
  if (p.col === 'rainbow') return prismAt(Math.random() * 360);
  if (p.col === 'mix') return Math.random() < .5 ? auraCol(a, 1, t) : auraCol(a, 2, t);
  return Math.random() < .7 ? auraCol(a, 1, t) : auraCol(a, 2, t);
}

function emitOne(v, p, a, cx, cy) {
  const P = v.pool.spawn();
  if (!P) return;
  const U = v.U, t = v.t, r = Math.random;
  const sp = (p.spd || .3) * U;
  P.size = (p.size || 1.4) * (.7 + r() * .6);
  P.max = P.life = (p.life || 2) * (.7 + r() * .6);
  P.col = pickCol(v, a, p, t);
  P.front = r() < .55;
  let ox = cx, oy = cy;
  if (p.from === 'core') { ox = cx; oy = cy - .35 * U; }
  else if (p.from === 'feet') { ox = cx + (r() - .5) * 2.4 * U; oy = cy + 2.05 * U; }
  else if (p.from === 'eclipse') { const an = r() * TAU; ox = cx + Math.cos(an) * 1.1 * U; oy = cy - U + Math.sin(an) * 1.1 * U; }
  switch (p.type) {
    case 'rise':
      P.x = ox + (r() + r() - 1) * .95 * U; P.y = (p.from ? oy : cy + (r() * 3.8 - 1.9) * U);
      P.vx = (r() - .5) * .2 * U; P.vy = -sp * (.6 + r() * .8);
      break;
    case 'drift':
      P.x = cx - 2.4 * U + r() * .5 * U; P.y = cy + (r() * 4 - 2) * U;
      P.vx = sp * (.7 + r() * .6); P.vy = (r() - .5) * .3 * U; P.kind = K_SPARK;
      break;
    case 'firefly':
      P.x = cx + (r() - .5) * 2 * p.spread * U; P.y = cy + (r() - .5) * 3.6 * U;
      P.vx = (r() - .5) * sp; P.vy = (r() - .5) * sp; P.kind = K_BLINK; P.vr = 1 + r() * 2;
      break;
    case 'fall':
      P.x = cx + (r() * 4 - 1.5) * U; P.y = cy - 3.2 * U;
      P.vx = -sp * .45; P.vy = sp; P.kind = K_STREAK; P.size *= .8;
      break;
    case 'rain':
      P.x = cx + (r() - .5) * 2.6 * U; P.y = cy - 2.3 * U;
      P.vx = -sp * .1; P.vy = sp * (.8 + r() * .4); P.kind = K_STREAK; P.size *= .7;
      break;
    case 'crystal':
      P.x = cx + (r() - .5) * 2 * p.spread * U; P.y = cy + (r() - .5) * 3.6 * U;
      P.vx = (r() - .5) * .2 * U; P.vy = sp * (r() - .3); P.kind = K_CRYSTAL; P.vr = (r() - .5) * 3; P.rot = r() * TAU;
      break;
    case 'stream':
      P.x = cx - 2.6 * U; P.y = cy + (r() * 4 - 2.1) * U;
      P.vx = sp * (.8 + r() * .5); P.vy = (r() - .5) * .3 * U; P.kind = K_STREAK; P.size *= .7;
      break;
    case 'spark': {
      if (p.from) { P.x = ox; P.y = oy; const an = r() * TAU; P.vx = Math.cos(an) * sp * (.4 + r()); P.vy = Math.sin(an) * sp * (.4 + r()); }
      else { P.x = cx + (r() - .5) * 2 * (p.spread || 1.5) * U; P.y = cy - .2 * U + (r() - .5) * 2 * (p.spread || 1.5) * U; P.vx = (r() - .5) * sp; P.vy = (r() - .5) * sp - sp * .3; }
      P.kind = K_SPARK; P.drag = 1.2;
      break;
    }
    case 'jet': {
      const up = r() < .5 ? -1 : 1;
      P.x = cx + (r() - .5) * .15 * U; P.y = cy + up * .3 * U;
      P.vx = (r() - .5) * .2 * U; P.vy = up * sp * (.6 + r() * .6); P.kind = K_STREAK; P.front = false;
      break;
    }
    case 'suck': {
      const an = r() * TAU, rad = (p.r || 4) * U * (.8 + r() * .4);
      P.tx = cx; P.ty = cy - .25 * U;
      P.x = P.tx + Math.cos(an) * rad; P.y = P.ty + Math.sin(an) * rad * .6;
      P.vx = 0; P.vy = 0; P.vr = U * (p.spd || 1); P.kind = K_SUCK; P.front = false; P.size *= 1.2; P.max = P.life = 3;
      break;
    }
    case 'burstout': {
      const an = r() * TAU;
      P.x = cx; P.y = cy - .2 * U;
      P.vx = Math.cos(an) * sp * (.5 + r()); P.vy = Math.sin(an) * sp * (.5 + r());
      P.kind = p.dark && r() < .6 ? K_DARK : K_STREAK; P.front = false;
      break;
    }
    case 'flame': {
      const s = r() < .5 ? -1 : 1, yy = r() * 3.4 - 1.9;
      const wd = yy < -1.1 ? .35 : yy < .5 ? .6 : .35;
      P.x = cx + s * wd * U * (.8 + r() * .4); P.y = cy + yy * U;
      P.vx = s * .1 * U; P.vy = -sp * (.6 + r() * .8); P.kind = K_FLAME;
      P.col = auraCol(a, 2, t); P.col2 = auraCol(a, 1, t);
      break;
    }
    default:
      P.x = cx; P.y = cy; P.vx = 0; P.vy = 0;
  }
}

const FX = {
  emit(v, p, a, t, L, cx, cy, i) {
    if (L !== 'u') return;
    const rate = (p.rate || 5) * R.q * (v.preview ? .6 : 1);
    v.acc[i] = (v.acc[i] || 0) + rate * t;
    let n = 0;
    while (v.acc[i] >= 1 && n < 30) { v.acc[i] -= 1; emitOne(v, p, a, cx, cy); n++; }
  },
  glow(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    let al = p.a;
    if (p.beat) { const ph = (v.t % p.beat) / p.beat; al *= .7 + .6 * Math.exp(-ph * 5); }
    blob(v.ctx, cx, cy + (p.y || 0) * v.U, p.r * v.U * 1.6, auraCol(a, 1, v.t), al);
  },
  orbit(v, p, a, t, L, cx, cy) {
    if (L === 'u') return;
    const ctx = v.ctx, U = v.U, k = v.k, T = v.t;
    const tilt = p.tilt || 0, ct = Math.cos(tilt), st = Math.sin(tilt);
    const oy = cy + (p.y || 0) * U;
    const pos = an => {
      const x = Math.cos(an) * p.rx * U, y = Math.sin(an) * p.ry * U;
      return [cx + x * ct - y * st, oy + x * st + y * ct, Math.sin(an)];
    };
    for (let i = 0; i < p.n; i++) {
      const j = p.jitter ? sr(i + 3) * .6 : 0;
      const an = T * p.spd * (p.jitter ? (.8 + sr(i) * .4) : 1) + i * TAU / p.n + j;
      const [x, y, z] = pos(an);
      if ((z > 0) !== (L === 'f')) continue;
      const col = i % 2 && p.n > 1 ? auraCol(a, 2, T, i * 40) : auraCol(a, 1, T, i * 40);
      const size = p.size * k * (p.jitter ? .6 + sr(i + 7) * .8 : 1) * (1 + z * .15);
      if (p.tail) {
        for (let s = 1; s <= 14; s++) {
          const [tx, ty] = pos(an - s * .045 * Math.sign(p.spd) * p.tail / 2);
          blob(ctx, tx, ty, size * (2.4 - s * .14), col, .5 * (1 - s / 15));
        }
      }
      if (p.shape === 'rock') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = .95;
        ctx.fillStyle = mixHex(a.c1, '#000000', .2 + sr(i) * .3);
        ctx.beginPath();
        for (let q = 0; q < 6; q++) {
          const aa = q / 6 * TAU + T * .5 + i, rr = size * (.7 + sr(i * 6 + q) * .5);
          q ? ctx.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr) : ctx.moveTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr);
        }
        ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
      } else if (p.shape === 'shard') {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(T * 1.5 + i);
        ctx.globalAlpha = .9; ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(0, -size * 1.6); ctx.lineTo(size * .6, 0); ctx.lineTo(0, size * 1.6); ctx.lineTo(-size * .6, 0); ctx.fill();
        ctx.restore();
        blob(ctx, x, y, size * 3, col, .5);
      } else if (p.moon) {
        blob(ctx, x, y, size * 3, col, .5);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        const g = ctx.createRadialGradient(x - size * .4, y - size * .4, 0, x, y, size);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, mixHex(col, '#000000', .5));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
      } else {
        const tw = p.twinkle ? .6 + .4 * Math.sin(T * 5 + i * 2) : 1;
        blob(ctx, x, y, size * 3, col, tw, 's');
      }
    }
  },
  band(v, p, a, t, L, cx, cy) {
    if (L === 'u') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U;
    ctx.globalAlpha = p.a;
    ctx.strokeStyle = rgba(auraCol(a, 2, T), .5);
    ctx.lineWidth = p.w * U;
    ctx.beginPath();
    ctx.ellipse(cx, y, p.rx * U, p.ry * U, -.1, L === 'b' ? Math.PI : 0, L === 'b' ? TAU : Math.PI);
    ctx.stroke();
    for (let i = 0; i < p.dots; i++) {
      const an = T * p.spd + i / p.dots * TAU, z = Math.sin(an);
      if ((z > 0) !== (L === 'f')) continue;
      const rr = 1 + (sr(i) - .5) * .25;
      const x = cx + Math.cos(an) * p.rx * U * rr, yy = y + Math.sin(an) * p.ry * U * rr + (sr(i + 5) - .5) * p.w * U;
      blob(ctx, x, yy, v.k * 4 * (.5 + sr(i + 2)), auraCol(a, 1, T), .7, 's');
    }
    ctx.globalAlpha = 1;
  },
  halo(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, y = cy + p.y * U;
    ctx.globalAlpha = p.a;
    ctx.strokeStyle = auraCol(a, 1, v.t);
    ctx.lineWidth = p.w * v.k;
    ctx.beginPath(); ctx.arc(cx, y, p.r * U, 0, TAU); ctx.stroke();
    ctx.lineWidth = p.w * v.k * 3;
    ctx.globalAlpha = p.a * .2;
    ctx.beginPath(); ctx.arc(cx, y, p.r * U, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1;
  },
  ring(v, p, a, t, L, cx, cy) {
    if (L === 'u') return;
    const ctx = v.ctx, U = v.U;
    ctx.globalAlpha = p.a * (L === 'f' ? 1 : .75);
    ctx.strokeStyle = auraCol(a, 1, v.t);
    ctx.lineWidth = p.w * v.k;
    ctx.beginPath();
    ctx.ellipse(cx, cy + (p.y || 0) * U, p.rx * U, p.ry * U, p.tilt || 0, L === 'b' ? Math.PI : 0, L === 'b' ? TAU : Math.PI);
    ctx.stroke();
    ctx.globalAlpha = 1;
  },
  curtain(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t;
    for (let i = 0; i < p.n; i++) {
      const top = cy + p.y * U - p.h * U / 2 + i * .25 * U;
      const g = ctx.createLinearGradient(0, top, 0, top + p.h * U);
      const c = i % 2 ? auraCol(a, 2, T) : auraCol(a, 1, T);
      g.addColorStop(0, rgba(c, 0)); g.addColorStop(.25, rgba(c, p.a)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      const N = 24, half = p.w * U / 2;
      for (let s = 0; s <= N; s++) {
        const x = cx - half + s / N * half * 2;
        const y = top + (Math.sin(s * .5 + T * p.spd + i * 1.7) * .25 * U + Math.sin(s * .21 - T * .3) * .2 * U) + (1 - Math.sin(s / N * Math.PI)) * p.h * U * .25;
        s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      for (let s = N; s >= 0; s--) {
        const x = cx - half + s / N * half * 2;
        const tap = Math.pow(Math.sin(s / N * Math.PI), .8);
        ctx.lineTo(x, top + .25 * U * (1 - tap) + p.h * U * tap * (.7 + .3 * Math.sin(s * .4 + T * .5 + i)));
      }
      ctx.fill();
    }
  },
  shock(v, p, a, t, L, cx, cy) {
    if (L !== 'f') return;
    const ctx = v.ctx, U = v.U;
    const ph = ((v.t / p.period) + (p.off || 0)) % 1;
    const r = easeOut(ph) * p.max * U, al = p.a * (1 - ph);
    ctx.globalAlpha = al;
    ctx.strokeStyle = auraCol(a, ph < .5 ? 2 : 1, v.t);
    ctx.lineWidth = p.w * v.k * (1 - ph * .6);
    ctx.beginPath(); ctx.ellipse(cx, cy - .2 * U, r, r * .9, 0, 0, TAU); ctx.stroke();
    if (p.debris) {
      for (let i = 0; i < 14; i++) {
        const an = sr(i) * TAU;
        blob(ctx, cx + Math.cos(an) * r * (.9 + sr(i + 4) * .2), cy - .2 * U + Math.sin(an) * r * .9, v.k * 4, auraCol(a, 1, v.t), al, 's');
      }
    }
    ctx.globalAlpha = 1;
  },
  vortex(v, p, a, t, L, cx, cy) {
    if (L === 'u') return;
    const ctx = v.ctx, U = v.U, T = v.t, n = Math.round(p.n * (v.preview ? .6 : R.q));
    for (let i = 0; i < n; i++) {
      const s = sr(i), rr = (p.hollow ? .45 + s * .55 : .15 + s * .85) * p.r * U;
      const an = T * p.spd * (1.6 - s) + i * 2.399;
      const z = Math.sin(an);
      if ((z > 0) !== (L === 'f')) continue;
      const hy = (sr(i + 11) - .5) * 3.6 * U;
      const x = cx + Math.cos(an) * rr * (1 - Math.abs(hy) / (5 * U)), y = cy + hy + z * rr * .25;
      blob(ctx, x, y, p.size * v.k * 2.6, i % 3 ? auraCol(a, 1, T) : auraCol(a, 2, T), p.a * (.5 + .5 * Math.abs(z)), 's');
    }
  },
  petals(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, oy = cy - .3 * U;
    for (let l = 0; l < (p.layers || 1); l++) {
      const len = p.r * U * (1 - l * .3), rot = T * p.spd * (l ? -1 : 1) + l * Math.PI / p.n;
      const c = l ? auraCol(a, 1, T) : auraCol(a, 2, T);
      for (let i = 0; i < p.n; i++) {
        const an = rot + i * TAU / p.n;
        ctx.save();
        ctx.translate(cx, oy); ctx.rotate(an);
        const g = ctx.createLinearGradient(0, 0, len, 0);
        g.addColorStop(0, rgba(c, 0)); g.addColorStop(.5, rgba(c, p.a)); g.addColorStop(1, rgba(c, 0));
        ctx.fillStyle = g; ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(len * .5, -len * .32, len, 0);
        ctx.quadraticCurveTo(len * .5, len * .32, 0, 0);
        ctx.fill();
        ctx.restore();
      }
    }
  },
  wings(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, flap = Math.sin(T * p.spd) * .08;
    for (const s of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const ang = -1.25 + i * .32 + flap * s * 0, len = p.span * U * (1 - i * .09);
        const bx = cx + s * .35 * U, by = cy - .85 * U;
        const ex = bx + s * Math.cos(ang + flap) * len, ey = by + Math.sin(ang + flap) * len * (p.h / p.span);
        const g = ctx.createLinearGradient(bx, by, ex, ey);
        const c = i % 2 ? auraCol(a, 2, T) : auraCol(a, 1, T);
        g.addColorStop(0, rgba(c, p.a)); g.addColorStop(1, rgba(c, 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = U * (.32 - i * .03);
        ctx.lineCap = 'round';
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + s * len * .4, by - len * .35, ex, ey);
        ctx.stroke();
      }
    }
  },
  cloud(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t;
    for (let i = 0; i < p.n; i++) {
      const an = sr(i) * TAU + T * p.spd * (sr(i + 1) - .5);
      const rr = (.3 + sr(i + 2) * .7) * p.r * U;
      const c = p.rainbow ? prismAt(i * 40 + T * 20) : (i % 2 ? auraCol(a, 2, T) : auraCol(a, 1, T));
      blob(ctx, cx + Math.cos(an) * rr, cy + (p.y || 0) * U + Math.sin(an) * rr * .9, U * (1 + sr(i + 5) * .9), c, p.a * 1.6);
    }
  },
  const(v, p, a, t, L, cx, cy) {
    if (L !== 'f') return;
    const ctx = v.ctx, U = v.U, T = v.t;
    ctx.globalAlpha = .45 * p.a;
    ctx.strokeStyle = auraCol(a, 1, T);
    ctx.lineWidth = v.k * 1.2;
    ctx.beginPath();
    for (const [i, j] of p.lines) {
      ctx.moveTo(cx + p.pts[i][0] * U, cy + p.pts[i][1] * U);
      ctx.lineTo(cx + p.pts[j][0] * U, cy + p.pts[j][1] * U);
    }
    ctx.stroke();
    p.pts.forEach((pt, i) => blob(ctx, cx + pt[0] * U, cy + pt[1] * U, v.k * (6 + 3 * Math.sin(T * 3 + i)), i % 3 ? auraCol(a, 1, T) : auraCol(a, 2, T), p.a, 's'));
    ctx.globalAlpha = 1;
  },
  binary(v, p, a, t, L, cx, cy) {
    if (L === 'u') return;
    const U = v.U, T = v.t, oy = cy + p.y * U;
    for (let i = 0; i < 2; i++) {
      const an = T * p.spd + i * Math.PI, z = Math.sin(an);
      if ((z > 0) !== (L === 'f')) continue;
      const x = cx + Math.cos(an) * p.r * U, y = oy + z * p.r * U * .3;
      blob(v.ctx, x, y, p.size * v.k * 4, auraCol(a, i + 1, T), 1, 's');
      blob(v.ctx, x, y, p.size * v.k * 9, auraCol(a, i + 1, T), .25);
    }
  },
  disk(v, p, a, t, L, cx, cy) {
    if (L === 'u') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U;
    if (L === 'b') {
      blob(ctx, cx, y, p.rx * U * 1.1, auraCol(a, 1, T), p.a * .4);
      ctx.save(); ctx.translate(cx, y); ctx.scale(1, p.ry / p.rx);
      const g = ctx.createRadialGradient(0, 0, p.rx * U * .15, 0, 0, p.rx * U);
      g.addColorStop(0, rgba(p.hot ? '#ffffff' : auraCol(a, 1, T), p.a));
      g.addColorStop(.4, rgba(auraCol(a, 1, T), p.a * .6));
      g.addColorStop(1, rgba(auraCol(a, 2, T), 0));
      ctx.fillStyle = g; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(0, 0, p.rx * U, Math.PI, TAU); ctx.fill();
      ctx.restore();
    } else {
      ctx.save(); ctx.translate(cx, y); ctx.scale(1, p.ry / p.rx);
      const g = ctx.createRadialGradient(0, 0, p.rx * U * .15, 0, 0, p.rx * U);
      g.addColorStop(0, rgba(p.hot ? '#ffffff' : auraCol(a, 1, T), p.a * .7));
      g.addColorStop(.4, rgba(auraCol(a, 1, T), p.a * .4));
      g.addColorStop(1, rgba(auraCol(a, 2, T), 0));
      ctx.fillStyle = g; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(0, 0, p.rx * U, 0, Math.PI); ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 30; i++) {
      const an = T * p.spd * (1.5 - sr(i)) + i * 2.4, z = Math.sin(an);
      if ((z > 0) !== (L === 'f')) continue;
      const rr = (.25 + sr(i + 3) * .75);
      blob(ctx, cx + Math.cos(an) * p.rx * U * rr, y + z * p.ry * U * rr, v.k * 3.5, auraCol(a, i % 2 + 1, T), .8, 's');
    }
  },
  rings(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U;
    for (let i = 0; i < p.n; i++) {
      const r = p.r * U * (i + 1) / p.n * (1 + .05 * Math.sin(T * p.spd + i));
      ctx.globalAlpha = p.a * (1 - i / p.n * .5);
      ctx.strokeStyle = i % 2 ? auraCol(a, 2, T) : auraCol(a, 1, T);
      ctx.lineWidth = v.k * (3 - i * .3);
      ctx.beginPath(); ctx.ellipse(cx, y, r, r * .7, .4 + i * .3 + T * .05 * (i % 2 ? 1 : -1), 0, TAU); ctx.stroke();
    }
    blob(ctx, cx, y, U * .9, auraCol(a, 1, T), .4);
    ctx.globalAlpha = 1;
  },
  silhouette(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t;
    blob(ctx, cx, cy - .4 * U, U * 3.4, auraCol(a, 1, T), .4);
    ctx.globalCompositeOperation = 'source-over';
    const pts = [[.2, -2.6, 1.3], [.9, -2.1, 1.1], [1.1, -1.2, 1], [.7, -.5, 1.1], [-.6, -1.8, 1.1], [-1, -.8, 1], [0, .4, 1.2]];
    pts.forEach(([x, y, r], i) => blob(ctx, cx + x * U, cy + (y + Math.sin(T * .4 + i) * .05) * U, r * U * 1.4, '#0a0510', p.a * .9, 'd'));
    ctx.globalCompositeOperation = 'lighter';
    blob(ctx, cx + .3 * U, cy - 2.7 * U, U * 1.2, auraCol(a, 1, T), .25);
  },
  sphere(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U, r = p.r * U;
    blob(ctx, cx, y, r * 2.2, auraCol(a, 1, T), p.a * .5);
    const g = ctx.createRadialGradient(cx, y, 0, cx, y, r);
    g.addColorStop(0, rgba(auraCol(a, 2, T), p.a));
    g.addColorStop(.7, rgba(auraCol(a, 1, T), p.a * .85));
    g.addColorStop(1, rgba(auraCol(a, 1, T), 0));
    ctx.fillStyle = g; ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.arc(cx, y, r, 0, TAU); ctx.fill();
    if (p.boil) for (let i = 0; i < 10; i++) {
      const an = sr(i) * TAU + T * .1 * (sr(i + 1) - .5), rr = sr(i + 2) * r * .75;
      blob(ctx, cx + Math.cos(an) * rr, y + Math.sin(an) * rr, r * (.2 + .1 * Math.sin(T * 1.5 + i)), auraCol(a, 2, T), .35);
    }
    if (p.corona) blob(ctx, cx, y, r * 3, auraCol(a, 2, T), .25);
  },
  core(v, p, a, t, L, cx, cy) {
    if (L !== 'f') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U;
    blob(ctx, cx, y, p.r * U * 3, auraCol(a, 1, T), .9, 's');
    blob(ctx, cx, y, p.r * U * 7, auraCol(a, 2, T), .35);
    for (let i = 0; i < p.rays; i++) {
      const an = i / p.rays * TAU + T * p.spd, len = p.len * U * (i % 2 ? .6 : 1);
      ctx.save();
      ctx.translate(cx, y); ctx.rotate(an);
      const g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, rgba('#ffffff', .8)); g.addColorStop(1, rgba(auraCol(a, 1, T), 0));
      ctx.fillStyle = g; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(0, -v.k * 2); ctx.lineTo(len, 0); ctx.lineTo(0, v.k * 2); ctx.fill();
      ctx.restore();
    }
  },
  cross(v, p, a, t, L, cx, cy) {
    if (L !== 'f') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U, s = .85 + .15 * Math.sin(T * p.spd * 3);
    blob(ctx, cx, y, U * .5, '#ffffff', .9, 's');
    blob(ctx, cx, y, U * 1.4, auraCol(a, 1, T), .4);
    for (let i = 0; i < 4; i++) {
      const an = i * Math.PI / 2 + (i > 1 ? 0 : 0), len = p.len * U * s * (i % 2 ? .75 : 1);
      ctx.save(); ctx.translate(cx, y); ctx.rotate(an + .02 * Math.sin(T));
      const g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, rgba(auraCol(a, 2, T), 0));
      ctx.fillStyle = g; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(0, -p.w * v.k); ctx.lineTo(len, 0); ctx.lineTo(0, p.w * v.k); ctx.fill();
      ctx.restore();
    }
    for (let i = 0; i < 4; i++) {
      const an = Math.PI / 4 + i * Math.PI / 2, len = p.len * U * .3 * s;
      ctx.save(); ctx.translate(cx, y); ctx.rotate(an);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.moveTo(0, -v.k); ctx.lineTo(len, 0); ctx.lineTo(0, v.k); ctx.fill();
      ctx.restore();
    }
  },
  trails(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U;
    ctx.lineCap = 'round';
    for (let i = 0; i < p.n; i++) {
      const r = p.r * U * (i + 1) / p.n, a0 = sr(i) * TAU + T * p.spd, len = .5 + sr(i + 4) * .9;
      ctx.globalAlpha = p.a * (.4 + sr(i + 8) * .6);
      ctx.strokeStyle = i % 3 ? auraCol(a, 1, T) : auraCol(a, 2, T);
      ctx.lineWidth = v.k * (1 + sr(i + 2) * 1.2);
      ctx.beginPath(); ctx.arc(cx, y, r, a0, a0 + len); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  spiralpair(v, p, a, t, L, cx, cy) {
    if (L === 'u') return;
    const U = v.U, T = v.t, oy = cy - .3 * U;
    for (let i = 0; i < 2; i++) {
      for (let s = 0; s < 16; s++) {
        const an = T * p.spd + i * Math.PI - s * .07, z = Math.sin(an);
        if ((z > 0) !== (L === 'f')) continue;
        const rr = p.r * U * (1 + .15 * Math.sin(T * .7));
        const x = cx + Math.cos(an) * rr, y = oy + z * rr * .35 + Math.cos(an * 2) * .2 * U;
        const sz = s ? p.size * v.k * (1.6 - s * .09) : p.size * v.k * 3.2;
        blob(v.ctx, x, y, sz, auraCol(a, i + 1, T), s ? .5 * (1 - s / 16) : 1, s ? 'g' : 's');
      }
    }
  },
  rays(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + (p.y || 0) * U, len = p.len * U;
    const hw = Math.tan(p.w / 2) * len; // 끝단 반폭
    if (p.dark) ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = p.a;
    ctx.save();
    ctx.translate(cx, y);
    ctx.rotate(T * p.spd);
    const step = TAU / p.n;
    for (let i = 0; i < p.n; i++) {
      const c = p.dark ? '#000000' : auraCol(a, i % 2 + 1, T, i * 18);
      ctx.drawImage(raySprite(c), 0, -hw, len, hw * 2);
      ctx.rotate(step);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
  },
  zodiac(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, oy = cy - .3 * U;
    ctx.globalAlpha = .18;
    ctx.strokeStyle = auraCol(a, 1, T);
    ctx.lineWidth = v.k;
    ctx.beginPath(); ctx.arc(cx, oy, p.r * U, 0, TAU); ctx.stroke();
    for (let i = 0; i < p.n; i++) {
      const an = i / p.n * TAU + T * p.spd;
      const gx = cx + Math.cos(an) * p.r * U, gy = oy + Math.sin(an) * p.r * U;
      const m = 3 + Math.floor(sr(i) * 3), pts = [];
      for (let j = 0; j < m; j++) pts.push([gx + (sr(i * 7 + j) - .5) * U * .7, gy + (sr(i * 7 + j + 3) - .5) * U * .7]);
      ctx.globalAlpha = .5 * p.a;
      ctx.strokeStyle = auraCol(a, 2, T);
      ctx.beginPath();
      pts.forEach((q, j) => j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
      ctx.stroke();
      pts.forEach((q, j) => blob(ctx, q[0], q[1], v.k * (4 + 2 * Math.sin(T * 2 + i + j)), auraCol(a, 1, T), p.a, 's'));
    }
    ctx.globalAlpha = 1;
  },
  jets(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t;
    const fl = p.flick ? .75 + .25 * Math.sin(T * 23) * Math.sin(T * 7) : 1;
    for (const s of [-1, 1]) {
      const len = p.len * U;
      const g = ctx.createLinearGradient(cx, cy, cx, cy + s * len);
      g.addColorStop(0, rgba('#ffffff', p.a * fl)); g.addColorStop(.3, rgba(auraCol(a, 1, T), p.a * .7 * fl)); g.addColorStop(1, rgba(auraCol(a, 2, T), 0));
      ctx.fillStyle = g; ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(cx - p.w * U * .3, cy);
      ctx.lineTo(cx - p.w * U, cy + s * len);
      ctx.lineTo(cx + p.w * U, cy + s * len);
      ctx.lineTo(cx + p.w * U * .3, cy);
      ctx.fill();
      if (p.knots) for (let i = 0; i < 4; i++) {
        const ph = (T * .6 + i / 4) % 1;
        blob(ctx, cx, cy + s * ph * len, U * (.35 + ph * .3), auraCol(a, 1, T), (1 - ph) * .8, 's');
      }
    }
  },
  collapse(v, p, a, t, L, cx, cy) {
    if (L !== 'f') return;
    const ctx = v.ctx, U = v.U, T = v.t, ph = (T % p.period) / p.period, oy = cy - .3 * U;
    if (ph < .7) {
      const q = ph / .7, r = p.r * U * (1 - easeOut(q) * .92);
      for (let i = 0; i < 24; i++) {
        const an = i / 24 * TAU + q * 2;
        blob(ctx, cx + Math.cos(an) * r, oy + Math.sin(an) * r, v.k * 5, auraCol(a, 1, T), .4 + q * .6, 's');
      }
      blob(ctx, cx, oy, U * (.3 + q * .6), auraCol(a, 1, T), .3 + q * .6, 's');
    } else {
      const q = (ph - .7) / .3;
      blob(ctx, cx, oy, U * 3 * (1 - q), '#ffffff', (1 - q) * .8);
      ctx.globalAlpha = 1 - q;
      ctx.strokeStyle = auraCol(a, 2, T);
      ctx.lineWidth = v.k * 4 * (1 - q);
      ctx.beginPath(); ctx.arc(cx, oy, easeOut(q) * p.r * U * 1.2, 0, TAU); ctx.stroke();
      for (let i = 0; i < 18; i++) {
        const an = sr(i) * TAU, r = easeOut(q) * p.r * U * (.6 + sr(i + 1) * .7);
        blob(ctx, cx + Math.cos(an) * r, oy + Math.sin(an) * r, v.k * 4, auraCol(a, 2, T), 1 - q, 's');
      }
      ctx.globalAlpha = 1;
    }
  },
  filament(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, oy = cy - .1 * U;
    ctx.lineWidth = v.k * 1.6;
    for (let i = 0; i < p.n; i++) {
      const an = sr(i) * TAU, len = p.r * U * (.6 + sr(i + 1) * .5);
      ctx.globalAlpha = p.a * (.5 + sr(i + 2) * .5);
      ctx.strokeStyle = i % 2 ? auraCol(a, 2, T) : auraCol(a, 1, T);
      ctx.beginPath();
      for (let s = 0; s <= 10; s++) {
        const d = s / 10 * len * (.92 + .08 * Math.sin(T * p.spd + i));
        const wob = Math.sin(s * 1.3 + i + T * p.spd) * U * .12;
        const x = cx + Math.cos(an) * d - Math.sin(an) * wob, y = oy + Math.sin(an) * d + Math.cos(an) * wob;
        s ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  pulse(v, p, a, t, L, cx, cy) {
    if (L !== 'f') return;
    const ctx = v.ctx, U = v.U, T = v.t, ph = (T % p.period) / p.period, e = Math.exp(-ph * 6);
    const y = cy + p.y * U;
    blob(ctx, cx, y, p.r * U * (2.5 + e * 2), auraCol(a, 1, T), p.a * (.6 + e * .4), 's');
    blob(ctx, cx, y, p.r * U * 8, auraCol(a, 2, T), .2 + e * .25);
    if (p.ring) {
      ctx.globalAlpha = (1 - ph) * .8;
      ctx.strokeStyle = auraCol(a, 2, T);
      ctx.lineWidth = v.k * 2;
      ctx.beginPath(); ctx.arc(cx, y, p.r * U * (1 + ph * 3), 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  },
  flare(v, p, a, t, L, cx, cy) {
    if (L === 'u') return;
    const ctx = v.ctx, U = v.U, T = v.t;
    ctx.lineCap = 'round';
    for (let i = 0; i < p.n; i++) {
      const side = i % 2 ? 1 : -1, front = i % 3 === 0;
      if (front !== (L === 'f')) continue;
      const fy = -1.75 + (i / (p.n - 1)) * 3.4;
      const wd = fy < -1.15 ? .34 : fy < .45 ? .62 : .32;
      const bx = cx + side * wd * U, by = cy + fy * U;
      const h = U * (.35 + .25 * Math.sin(T * p.spd + i * 2.1));
      const g = ctx.createLinearGradient(bx, by, bx + side * h, by);
      g.addColorStop(0, rgba(auraCol(a, 2, T), p.a)); g.addColorStop(1, rgba(auraCol(a, 1, T), p.a * .25));
      ctx.strokeStyle = g;
      ctx.globalAlpha = 1;
      ctx.lineWidth = v.k * 3.5;
      ctx.beginPath();
      ctx.moveTo(bx, by - .2 * U);
      ctx.bezierCurveTo(bx + side * h * 1.4, by - .45 * U, bx + side * h * 1.4, by + .45 * U, bx, by + .2 * U);
      ctx.stroke();
      blob(ctx, bx + side * h, by, U * .35, auraCol(a, 1, T), .35);
    }
  },
  fireworks(v, p, a, t, L, cx, cy, i) {
    if (L !== 'u') return;
    v.acc[i] = (v.acc[i] || 0) + p.rate * t;
    while (v.acc[i] >= 1) {
      v.acc[i] -= 1;
      const ox = cx + (Math.random() - .5) * 2 * p.r * v.U, oy = cy - .5 * v.U + (Math.random() - .6) * 2 * p.r * v.U;
      const col = [auraCol(a, 1, v.t), auraCol(a, 2, v.t), prismAt(Math.random() * 360)][Math.floor(Math.random() * 3)];
      const n = Math.round(26 * (v.preview ? .6 : R.q));
      for (let k = 0; k < n; k++) {
        const P = v.pool.spawn();
        if (!P) break;
        const an = k / n * TAU, sp = v.U * (1.2 + Math.random() * .4);
        P.x = ox; P.y = oy; P.vx = Math.cos(an) * sp; P.vy = Math.sin(an) * sp;
        P.ay = v.U * .8; P.drag = 1.6; P.max = P.life = 1.3; P.size = p.size; P.col = col; P.kind = K_SPARK; P.front = Math.random() < .5;
      }
    }
  },
  field(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, oy = cy - .3 * U;
    ctx.lineWidth = v.k * 1.5;
    ctx.setLineDash([v.k * 8, v.k * 6]);
    ctx.lineDashOffset = -T * p.spd * 30 * v.k;
    for (let i = 1; i <= p.n; i++) {
      const rx = i / p.n * p.r * U * .6;
      for (const s of [-1, 1]) {
        ctx.globalAlpha = p.a * (1 - i / p.n * .6);
        ctx.strokeStyle = i % 2 ? auraCol(a, 1, T) : auraCol(a, 2, T);
        ctx.beginPath(); ctx.ellipse(cx + s * rx, oy, rx, rx * 2.1 + U * .3, 0, 0, TAU); ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  },
  bolts(v, p, a, t, L, cx, cy, i) {
    const st = v.st[i] || (v.st[i] = { list: [], acc: 0 });
    if (L === 'u') {
      st.acc += p.rate * t * (G.s.set.calm ? .3 : 1);
      while (st.acc >= 1) {
        st.acc -= 1;
        const an = Math.random() * TAU, pts = [];
        let x = cx + Math.cos(an) * .4 * v.U, y = cy - .3 * v.U + Math.sin(an) * .8 * v.U;
        for (let s = 0; s < 7; s++) {
          pts.push([x, y]);
          x += Math.cos(an) * p.r * v.U / 6 + (Math.random() - .5) * v.U * .35;
          y += Math.sin(an) * p.r * v.U / 6 + (Math.random() - .5) * v.U * .35;
        }
        st.list.push({ pts, life: .14 });
      }
      for (let k = st.list.length - 1; k >= 0; k--) { st.list[k].life -= t; if (st.list[k].life <= 0) st.list.splice(k, 1); }
      return;
    }
    if (L !== 'f') return;
    const ctx = v.ctx;
    for (const b of st.list) {
      ctx.globalAlpha = b.life / .14;
      for (const [w, c] of [[v.k * 5, auraCol(a, 1, v.t)], [v.k * 1.5, '#ffffff']]) {
        ctx.strokeStyle = c; ctx.lineWidth = w;
        ctx.beginPath();
        b.pts.forEach((q, j) => j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  },
  sweep(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U, len = p.len * U;
    for (let i = 0; i < p.n; i++) {
      const an = T * p.spd + i * Math.PI;
      const sx = Math.cos(an);
      const g = ctx.createLinearGradient(cx, y, cx + sx * len, y);
      const c = auraCol(a, 1, T);
      const vis = .4 + .6 * Math.abs(Math.sin(an));
      g.addColorStop(0, rgba(c, p.a * 2 * vis)); g.addColorStop(1, rgba(c, 0));
      ctx.fillStyle = g; ctx.globalAlpha = 1;
      const wd = U * (.25 + .9 * (1 - Math.abs(sx)));
      ctx.beginPath(); ctx.moveTo(cx, y - U * .06); ctx.lineTo(cx + sx * len, y - wd); ctx.lineTo(cx + sx * len, y + wd); ctx.lineTo(cx, y + U * .06); ctx.fill();
    }
  },
  clock(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U, r = p.r * U;
    ctx.globalAlpha = p.a * .6;
    ctx.strokeStyle = auraCol(a, 1, T);
    ctx.lineWidth = v.k * 2;
    ctx.beginPath(); ctx.arc(cx, y, r, 0, TAU); ctx.stroke();
    ctx.globalAlpha = p.a * .3;
    ctx.beginPath(); ctx.arc(cx, y, r * .88, 0, TAU); ctx.stroke();
    const tickN = Math.floor(T / .8), tp = (T % .8) / .8;
    for (let i = 0; i < 60; i++) {
      const an = i / 60 * TAU - Math.PI / 2, big = i % 5 === 0;
      const lit = i === tickN % 60;
      ctx.globalAlpha = lit ? 1 : p.a * (big ? .9 : .4);
      ctx.strokeStyle = lit ? '#ffffff' : auraCol(a, big ? 2 : 1, T);
      ctx.lineWidth = v.k * (big ? 3 : 1.4);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(an) * r * (big ? .86 : .92), y + Math.sin(an) * r * (big ? .86 : .92));
      ctx.lineTo(cx + Math.cos(an) * r, y + Math.sin(an) * r);
      ctx.stroke();
    }
    const secA = (tickN + easeOut(clamp(tp * 4, 0, 1))) / 60 * TAU - Math.PI / 2;
    const minA = T / 60 * TAU - Math.PI / 2;
    for (const [an, len, w, c] of [[secA, r * .95, 1.5, '#ffffff'], [minA, r * .7, 3, auraCol(a, 2, T)]]) {
      ctx.globalAlpha = p.a;
      ctx.strokeStyle = c; ctx.lineWidth = v.k * w;
      ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + Math.cos(an) * len, y + Math.sin(an) * len); ctx.stroke();
      blob(ctx, cx + Math.cos(an) * len, y + Math.sin(an) * len, v.k * 8, c, .9, 's');
    }
    if (tp < .2) blob(ctx, cx, y, r * 1.1, auraCol(a, 1, T), .15 * (1 - tp / .2));
    ctx.globalAlpha = 1;
  },
  galaxy(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, oy = cy + p.y * U;
    const key = 'gal' + a.id;
    let pts = v.st[key];
    if (!pts) {
      pts = v.st[key] = [];
      for (let i = 0; i < p.n; i++) {
        const s = Math.pow(Math.random(), .7), arm = i % p.arms;
        pts.push({ r: s, an: arm / p.arms * TAU + s * 3.2 + (Math.random() - .5) * .5, z: Math.random() });
      }
    }
    const rot = T * p.spd, cr = Math.cos(-.35), sn = Math.sin(-.35), R0 = p.r * U;
    const c1 = auraCol(a, 1, T), c2 = auraCol(a, 2, T);
    blob(ctx, cx, oy, R0 * .9, c2, .25);
    const n = Math.round(pts.length * (v.preview ? .5 : R.q));
    for (let i = 0; i < n; i++) {
      const q = pts[i], an = q.an + rot;
      const x = Math.cos(an) * q.r * R0, y = Math.sin(an) * q.r * R0 * .42;
      const px = cx + x * cr - y * sn, py = oy + x * sn + y * cr;
      ctx.globalAlpha = p.a * (1 - q.r * .6);
      ctx.fillStyle = q.r < .35 ? c1 : (q.z < .5 ? c2 : '#ffffff');
      const s = v.k * (1.2 + (1 - q.r) * 1.5);
      ctx.fillRect(px - s / 2, py - s / 2, s, s);
    }
    blob(ctx, cx, oy, U * 1.2, c1, .8, 's');
    ctx.globalAlpha = 1;
  },
  blazar(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ph = (v.t % p.period) / p.period, e = Math.pow(Math.sin(ph * Math.PI), 4) * (G.s.set.calm ? .5 : 1);
    v.ctx.globalAlpha = p.a * e;
    v.ctx.fillStyle = auraCol(a, 1, v.t);
    v.ctx.fillRect(0, 0, v.w, v.h);
    v.ctx.globalAlpha = 1;
  },
  web(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, T = v.t;
    const key = 'web' + a.id;
    let nodes = v.st[key];
    if (!nodes) {
      nodes = v.st[key] = [];
      for (let i = 0; i < p.n; i++) nodes.push({ x: Math.random(), y: Math.random(), ph: Math.random() * TAU });
    }
    const w = v.w, h = v.h, P = [], maxD = Math.min(w, h) * .2;
    for (const nd of nodes) P.push([(nd.x + Math.sin(T * p.spd + nd.ph) * .03) * w, (nd.y + Math.cos(T * p.spd * 1.3 + nd.ph) * .03) * h]);
    ctx.lineWidth = v.k * 1.2;
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const d = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]);
      if (d > maxD) continue;
      ctx.globalAlpha = p.a * (1 - d / maxD);
      ctx.strokeStyle = (i + j) % 2 ? auraCol(a, 1, T) : auraCol(a, 2, T);
      ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[j][0], P[j][1]); ctx.stroke();
    }
    P.forEach((q, i) => blob(ctx, q[0], q[1], v.k * (7 + 3 * Math.sin(T * 2 + i)), i % 2 ? auraCol(a, 1, T) : auraCol(a, 2, T), .8, 's'));
    // 몸 쪽으로 이어지는 실
    ctx.globalAlpha = p.a * .5;
    ctx.strokeStyle = auraCol(a, 1, T);
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx, cy - .3 * v.U); ctx.lineTo(P[i][0], P[i][1]); ctx.stroke(); }
    ctx.globalAlpha = 1;
  },
  hole(v, p, a, t, L, cx, cy) {
    if (L === 'u') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U, r = p.r * U, D = p.disk * U;
    const drawDisk = (front) => {
      ctx.save(); ctx.translate(cx, y); ctx.rotate(-.12); ctx.scale(1, .22);
      const g = ctx.createRadialGradient(0, 0, r * 1.05, 0, 0, D);
      g.addColorStop(0, rgba('#fff4e0', front ? .7 : .95)); g.addColorStop(.25, rgba(auraCol(a, 1, T), front ? .55 : .8));
      g.addColorStop(.6, rgba(auraCol(a, 2, T), front ? .3 : .45)); g.addColorStop(1, rgba(auraCol(a, 2, T), 0));
      ctx.fillStyle = g; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(0, 0, D, front ? 0 : Math.PI, front ? Math.PI : TAU); ctx.arc(0, 0, r * 1.05, front ? Math.PI : TAU, front ? 0 : Math.PI, true); ctx.fill();
      // 회전 줄무늬
      for (let i = 0; i < 40; i++) {
        const an = T * p.spd * (2 - sr(i)) + i * 2.4, z = Math.sin(an);
        if ((z > 0) !== front) continue;
        const rr = r * 1.1 + sr(i + 1) * (D - r * 1.1);
        blob(ctx, Math.cos(an) * rr, z * rr, U * .1, '#fff0d0', .7, 's');
      }
      ctx.restore();
    };
    if (L === 'b') {
      blob(ctx, cx, y, D * 1.1, auraCol(a, 2, T), .25);
      drawDisk(false);
      // 렌즈 효과: 원반 빛이 블랙홀 위로 휘어진 고리
      ctx.globalAlpha = .85;
      const lg = ctx.createLinearGradient(cx - r * 1.6, 0, cx + r * 1.6, 0);
      lg.addColorStop(0, rgba(auraCol(a, 2, T), 0)); lg.addColorStop(.5, rgba('#fff4e0', .9)); lg.addColorStop(1, rgba(auraCol(a, 2, T), 0));
      ctx.strokeStyle = lg; ctx.lineWidth = r * .22;
      ctx.beginPath(); ctx.ellipse(cx, y, r * 1.35, r * 1.25, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, y, r * 1.25, r * 1.18, 0, Math.PI * .1, Math.PI * .9); ctx.globalAlpha = .4; ctx.stroke();
      // 사건의 지평선
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000000';
      ctx.beginPath(); ctx.arc(cx, y, r, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba('#fff4e0', .9); ctx.lineWidth = v.k * 2;
      ctx.beginPath(); ctx.arc(cx, y, r * 1.02, 0, TAU); ctx.stroke();
    } else drawDisk(true);
  },
  whitehole(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t;
    const g = ctx.createRadialGradient(cx, cy - .2 * U, 0, cx, cy - .2 * U, p.r * U * 1.4);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(235,240,255,.95)'); g.addColorStop(.7, rgba(auraCol(a, 2, T), .5)); g.addColorStop(1, 'rgba(190,208,255,0)');
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = .92 + .08 * Math.sin(T * 2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, v.w, v.h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 1;
  },
  mandala(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U;
    for (let l = 0; l < p.n; l++) {
      const k = 6 + l * 3, r = p.r * U * (1 - l * .22), rot = T * p.spd * (l % 2 ? -1 : 1);
      ctx.globalAlpha = p.a * (1 - l * .15);
      ctx.strokeStyle = prismAt(T * 60 + l * 90);
      ctx.lineWidth = v.k * 1.5;
      ctx.beginPath();
      for (let i = 0; i <= k; i++) {
        const an = rot + i / k * TAU, an2 = rot + (i + .5) / k * TAU;
        const x1 = cx + Math.cos(an) * r, y1 = y + Math.sin(an) * r;
        const x2 = cx + Math.cos(an2) * r * .55, y2 = y + Math.sin(an2) * r * .55;
        i ? ctx.lineTo(x1, y1) : ctx.moveTo(x1, y1);
        if (i < k) ctx.lineTo(x2, y2);
      }
      ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, y, r * 1.05, 0, TAU); ctx.stroke();
      for (let i = 0; i < k; i++) {
        const an = rot + i / k * TAU;
        blob(ctx, cx + Math.cos(an) * r, y + Math.sin(an) * r, v.k * 6, prismAt(T * 80 + i * 30), .9, 's');
      }
    }
    ctx.globalAlpha = 1;
  },
  bang(v, p, a, t, L, cx, cy) {
    if (L !== 'f') return;
    const ctx = v.ctx, U = v.U, T = v.t, ph = (T % p.period) / p.period, oy = cy - .2 * U;
    if (ph < .12) blob(ctx, cx, oy, U * (.5 + ph / .12 * 2.5), '#ffffff', (1 - ph / .12) * (G.s.set.calm ? .4 : .8));
    const r = easeOut(ph) * 4 * U;
    for (let i = 0; i < 40; i++) {
      const an = sr(i) * TAU, rr = r * (.7 + sr(i + 1) * .3);
      blob(ctx, cx + Math.cos(an) * rr, oy + Math.sin(an) * rr * .9, v.k * 4, prismAt(i * 9 + T * 40), (1 - ph) * .9, 's');
    }
  },
  grd(v, p, a, t, L, cx, cy) {
    if (L !== 'f') return;
    const ctx = v.ctx, U = v.U, T = v.t, y0 = cy + p.y * U, s = U * .16;
    // 3x5 격자 글자
    const L3 = {
      G: [[2, 0], [1, 0], [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [2, 3], [2, 2], [1, 2]],
      R: [[0, 4], [0, 3], [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [1, 2], [2, 3], [2, 4]],
      D: [[0, 0], [1, 0], [2, 1], [2, 2], [2, 3], [1, 4], [0, 4], [0, 3], [0, 2], [0, 1], [0, 0]]
    };
    const word = ['G', 'R', 'D'];
    word.forEach((ch, wi) => {
      const ox = cx + (wi - 1) * s * 4.2 - s;
      const pts = L3[ch].map(q => [ox + q[0] * s, y0 + (q[1] - 2) * s]);
      ctx.globalAlpha = .6 * p.a;
      ctx.strokeStyle = prismAt(T * 60 + wi * 100);
      ctx.lineWidth = v.k * 1.4;
      ctx.beginPath();
      pts.forEach((q, j) => j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
      ctx.stroke();
      pts.forEach((q, j) => { if (j % 2 === 0) blob(ctx, q[0], q[1], v.k * (5 + 2 * Math.sin(T * 4 + j + wi)), prismAt(T * 80 + j * 25), p.a, 's'); });
    });
    ctx.globalAlpha = 1;
  },
  brand(v, p, a, t, L, cx, cy) {
    if (L !== 'f') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U, r = U * .22, pul = .8 + .2 * Math.sin(T * 3);
    ctx.globalAlpha = p.a * pul;
    ctx.fillStyle = auraCol(a, 1, T);
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const an = -Math.PI / 2 + i / 10 * TAU, rr = i % 2 ? r * .42 : r;
      i ? ctx.lineTo(cx + Math.cos(an) * rr, y + Math.sin(an) * rr) : ctx.moveTo(cx + Math.cos(an) * rr, y + Math.sin(an) * rr);
    }
    ctx.fill();
    ctx.strokeStyle = auraCol(a, 2, T);
    ctx.lineWidth = v.k * 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(cx + r * .6, y - r * .3 + i * r * .3); ctx.lineTo(cx + r * (1.8 + i * .3), y - r * (1.4 - i * .3)); ctx.stroke();
    }
    blob(ctx, cx, y, r * 3, auraCol(a, 2, T), .5 * pul);
    ctx.globalAlpha = 1;
  },
  crown(v, p, a, t, L, cx, cy) {
    if (L !== 'f') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U;
    ctx.globalAlpha = p.a;
    ctx.strokeStyle = auraCol(a, 1, T);
    ctx.lineWidth = v.k * 2.5;
    ctx.beginPath(); ctx.ellipse(cx, y + .25 * U, .38 * U, .09 * U, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < p.n; i++) {
      const f = i / (p.n - 1) - .5, bx = cx + f * .7 * U, h = (.45 - Math.abs(f) * .35) * U;
      ctx.beginPath(); ctx.moveTo(bx, y + .22 * U); ctx.lineTo(bx, y + .22 * U - h); ctx.stroke();
      blob(ctx, bx, y + .22 * U - h, v.k * (7 + 2 * Math.sin(T * 4 + i)), i % 2 ? auraCol(a, 2, T) : auraCol(a, 1, T), 1, 's');
    }
    blob(ctx, cx, y, U * .8, auraCol(a, 1, T), .3);
    ctx.globalAlpha = 1;
  },
  cape(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t;
    const g = ctx.createLinearGradient(0, cy - U, 0, cy + 2.4 * U);
    g.addColorStop(0, rgba(auraCol(a, 1, T), p.a)); g.addColorStop(.6, rgba(prismAt(T * 30), p.a * .6)); g.addColorStop(1, rgba(auraCol(a, 2, T), 0));
    ctx.fillStyle = g; ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(cx - .55 * U, cy - 1.0 * U);
    ctx.quadraticCurveTo(cx - 1.4 * U, cy + .6 * U, cx - 1.5 * U + Math.sin(T * 1.2) * .1 * U, cy + 2.3 * U);
    for (let i = 0; i <= 8; i++) ctx.lineTo(cx - 1.5 * U + i / 8 * 3 * U, cy + 2.3 * U + Math.sin(T * 2 + i * .9) * .12 * U);
    ctx.quadraticCurveTo(cx + 1.4 * U, cy + .6 * U, cx + .55 * U, cy - 1.0 * U);
    ctx.fill();
  },
  pillars(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t;
    for (const s of [-1, 1]) for (let i = 0; i < 9; i++) {
      const y = cy + 2.2 * U - i * .6 * U, x = cx + s * (1.7 + Math.sin(i * .8 + T * .5) * .12) * U;
      blob(ctx, x, y, U * (.8 - i * .04), i % 2 ? auraCol(a, 2, T) : auraCol(a, 1, T), p.a * .6);
    }
  },
  eclipse(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U, r = p.r * U;
    blob(ctx, cx, y, r * 3.2, auraCol(a, 1, T), .45);
    for (let i = 0; i < 18; i++) {
      const an = i / 18 * TAU + T * .05, len = r * (1.6 + sr(i) * 1.4 + .2 * Math.sin(T + i));
      ctx.save(); ctx.translate(cx, y); ctx.rotate(an);
      const g = ctx.createLinearGradient(r, 0, len, 0);
      g.addColorStop(0, rgba(auraCol(a, 1, T), .7)); g.addColorStop(1, rgba(auraCol(a, 1, T), 0));
      ctx.fillStyle = g; ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(r * .9, -r * .12); ctx.lineTo(len, 0); ctx.lineTo(r * .9, r * .12); ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#020203';
    ctx.beginPath(); ctx.arc(cx, y, r, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,250,235,.9)'; ctx.lineWidth = v.k * 2.5;
    ctx.beginPath(); ctx.arc(cx, y, r, 0, TAU); ctx.stroke();
    blob(ctx, cx + Math.cos(T * .3) * r, y + Math.sin(T * .3) * r, v.k * 10, '#ffffff', .9, 's');
  },
  eye(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U, r = p.r * U;
    const cyc = T % 6, open = cyc > 5.6 ? Math.abs(cyc - 5.8) / .2 : 1;
    const h = r * .55 * Math.max(.05, open);
    blob(ctx, cx, y, r * 1.6, auraCol(a, 2, T), .3);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.3, y);
    ctx.quadraticCurveTo(cx, y - h * 2, cx + r * 1.3, y);
    ctx.quadraticCurveTo(cx, y + h * 2, cx - r * 1.3, y);
    ctx.closePath();
    ctx.globalAlpha = .9;
    ctx.strokeStyle = auraCol(a, 1, T); ctx.lineWidth = v.k * 3;
    ctx.stroke();
    ctx.clip();
    blob(ctx, cx, y, r * 1.1, auraCol(a, 2, T), .6);
    FX.eclipse(v, { r: r / U * .5, y: p.y }, a, t, 'b', cx, cy);
    ctx.restore();
  },
  gate(v, p, a, t, L, cx, cy) {
    if (L !== 'b') return;
    const ctx = v.ctx, U = v.U, T = v.t, w = 1.3 * U, top = cy - 2.6 * U, bot = cy + 2.2 * U;
    const op = .75 + .25 * Math.sin(T * 1.2);
    const g = ctx.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, rgba(auraCol(a, 1, T), .55 * op)); g.addColorStop(1, rgba(auraCol(a, 2, T), .1));
    ctx.fillStyle = g; ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(cx - w, bot); ctx.lineTo(cx - w, top + w); ctx.arc(cx, top + w, w, Math.PI, TAU); ctx.lineTo(cx + w, bot);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = auraCol(a, 1, T); ctx.lineWidth = v.k * 3; ctx.globalAlpha = p.a;
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const x = cx + (sr(i) - .5) * w * 1.6, ph = (T * .4 + sr(i + 3)) % 1;
      blob(ctx, x, bot - ph * (bot - top), v.k * 5, '#ffffff', (1 - ph) * .8, 's');
    }
    ctx.globalAlpha = 1;
  },
  planets(v, p, a, t, L, cx, cy) {
    if (L !== 'f') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U, w = p.w * U;
    const cols = ['#c9b38a', '#e8c98a', '#6fa8ff', '#ff7a4d', '#e8d8b5', '#ffd9a0', '#8fd8ff'];
    ctx.globalAlpha = .5;
    ctx.strokeStyle = auraCol(a, 1, T); ctx.lineWidth = v.k * 1.2;
    ctx.beginPath(); ctx.moveTo(cx - w / 2, y); ctx.lineTo(cx + w / 2, y); ctx.stroke();
    for (let i = 0; i < p.n; i++) {
      const x = cx - w / 2 + i / (p.n - 1) * w, yy = y + Math.sin(T * 1.5 + i) * .05 * U, r = U * (.09 + sr(i + 50) * .09);
      blob(ctx, x, yy, r * 3, cols[i], .5);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      const g = ctx.createRadialGradient(x - r * .4, yy - r * .4, 0, x, yy, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(.4, cols[i]); g.addColorStop(1, mixHex(cols[i], '#000000', .6));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, yy, r, 0, TAU); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
    }
    ctx.globalAlpha = 1;
  },
  spheres(v, p, a, t, L, cx, cy) {
    if (L === 'u') return;
    const ctx = v.ctx, U = v.U, T = v.t, y = cy + p.y * U;
    for (let i = 0; i < p.n; i++) {
      const rx = p.r * U * (1 - i * .08), ry = rx * Math.abs(Math.cos(T * (.3 + i * .12) + i));
      const rot = i * Math.PI / p.n + T * .05;
      ctx.globalAlpha = p.a * (L === 'f' ? 1 : .6);
      ctx.strokeStyle = i % 2 ? auraCol(a, 2, T) : auraCol(a, 1, T);
      ctx.lineWidth = v.k * 1.6;
      ctx.beginPath(); ctx.ellipse(cx, y, rx, Math.max(1, ry), rot, L === 'b' ? Math.PI : 0, L === 'b' ? TAU : Math.PI); ctx.stroke();
      const an = T * (.8 + i * .2) * (i % 2 ? 1 : -1);
      const z = Math.sin(an);
      if ((z > 0) === (L === 'f')) {
        const ex = Math.cos(an) * rx, ey = Math.sin(an) * ry;
        blob(ctx, cx + ex * Math.cos(rot) - ey * Math.sin(rot), y + ex * Math.sin(rot) + ey * Math.cos(rot), v.k * 7, '#ffffff', .9, 's');
      }
    }
    ctx.globalAlpha = 1;
  }
};

/* ============================================================
 * 오라 + 더미 그리기
 * ============================================================ */
function drawAuraScene(v, dt) {
  const ctx = v.ctx, a = v.aura, U = v.U;
  const bob = Math.sin(v.t * 1.57) * .06 * U;
  const cx = v.cx, cy = v.cy + bob;
  ctx.globalCompositeOperation = 'lighter';
  // 업데이트
  const fx = a.fx;
  for (let i = 0; i < fx.length; i++) { const f = FX[fx[i][0]]; if (f) f(v, fx[i][1], a, dt, 'u', cx, cy, i); }
  v.pool.update(dt);
  // 등급 기본 발광
  const tc = tierCol(a.t, v.t);
  blob(ctx, cx, cy - .2 * U, U * 2.4, tc === '#FFFFFF' ? auraCol(a, 1, v.t) : tc, TIERS[a.t].glow * .25);
  // 뒤 레이어
  for (let i = 0; i < fx.length; i++) { const f = FX[fx[i][0]]; if (f) f(v, fx[i][1], a, dt, 'b', cx, cy, i); }
  drawParticles(ctx, v.pool, false, v.k);
  // 더미
  const dark = a.fx.some(f => f[0] === 'whitehole');
  drawDummy(v, cx, cy, dark ? 'dark' : null, auraCol(a, 1, v.t));
  // 앞 레이어
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < fx.length; i++) { const f = FX[fx[i][0]]; if (f) f(v, fx[i][1], a, dt, 'f', cx, cy, i); }
  drawParticles(ctx, v.pool, true, v.k);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

/* ============================================================
 * 컷신
 * ============================================================ */
const CUT_DUR = [0, 0, 0, .8, 1.5, 2.5, 3.5, 5, 7, 10];
const Cut = {
  on: false, a: null, t: 0, dur: 1, done: null, fired: {}, parts: null,
  start(a, done) {
    this.on = true; this.a = a; this.t = 0; this.dur = CUT_DUR[a.t]; this.done = done; this.fired = {};
    if (!this.parts) this.parts = new Pool(500);
    this.parts.clear();
    this.sound(a.t);
  },
  skip() { if (this.on) this.t = this.dur; },
  sound(tier) {
    AU.duck(true);
    if (tier === 3) { AU.shimmer(); }
    else if (tier === 4) { AU.riser(.9, .12); }
    else if (tier === 5) { AU.riser(.7, .15); setTimeout(() => AU.boom(.4), 700); }
    else if (tier === 6) { [0, 1, 2, 3].forEach(i => setTimeout(() => AU.beat(i), (.15 + i * .15) * 3500)); setTimeout(() => AU.riser(.6, .15), 2100); }
    else if (tier === 7) { AU.riser(2.5, .14); setTimeout(() => AU.boom(.45), 2500); setTimeout(() => AU.choir([220, 277, 330, 440], 2.5), 2600); }
    else if (tier === 8) { AU.riser(3.6, .16); setTimeout(() => { AU.boom(.6); AU.shimmer(); }, 4900); }
    else if (tier === 9) {
      AU.riser(3.4, .15);
      setTimeout(() => { AU.boom(.75); AU.shimmer(); AU.choir([261.6, 329.6, 392, 523.2], 5, 0); }, 4500);
      setTimeout(() => AU.choir([349.2, 440, 523.2, 698.4], 4, 0), 7000);
    }
  },
  fire(key, at, fn) { if (!this.fired[key] && this.t >= at * this.dur) { this.fired[key] = 1; fn(); } },
  burst(v, n, col, sp, x, y) {
    const ps = this.parts;
    for (let i = 0; i < n; i++) {
      const P = ps.spawn(); if (!P) break;
      const an = Math.random() * TAU, s = sp * v.U * (.4 + Math.random());
      P.x = x == null ? v.cx : x; P.y = y == null ? v.cy - .3 * v.U : y;
      P.vx = Math.cos(an) * s; P.vy = Math.sin(an) * s; P.drag = 1.4;
      P.max = P.life = 1 + Math.random() * 1.2; P.size = 1.4 + Math.random() * 1.6;
      P.col = col === 'prism' ? prismAt(Math.random() * 360) : col; P.kind = K_SPARK;
    }
  },
  /* 메인 장면 위에 그림. 반환: 장면 줌/흔들림 */
  draw(v, dt) {
    if (!this.on) return;
    this.t += dt;
    const ctx = v.ctx, w = v.w, h = v.h, U = v.U, a = this.a, tier = a.t;
    const p = clamp(this.t / this.dur, 0, 1), cx = v.cx, cy = v.cy - .3 * U;
    const calm = G.s.set.calm, col = tierCol(tier, v.t), ac = auraCol(a, 1, v.t);
    const flash = (al, c) => { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = calm ? al * .35 : al; ctx.fillStyle = c; ctx.fillRect(0, 0, w, h); };
    const dim = al => { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = al; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); };
    ctx.save();
    if (tier === 3) {
      flash(.55 * (1 - p), col);
      this.fire('b', 0, () => this.burst(v, 40, col, 2));
    } else if (tier === 4) {
      if (p < .6) {
        dim(.55 * (p / .6));
        ctx.globalCompositeOperation = 'lighter';
        const q = p / .6;
        for (let i = 0; i < 30; i++) {
          const an = sr(i) * TAU + q, r = (1 - easeOut(q)) * Math.max(w, h) * .6 * (.6 + sr(i + 1) * .4);
          blob(ctx, cx + Math.cos(an) * r, cy + Math.sin(an) * r, v.k * 6, col, q, 's');
        }
        blob(ctx, cx, cy, U * (.3 + q), col, q, 's');
      } else {
        const q = (p - .6) / .4;
        dim(.55 * (1 - q));
        flash(.7 * (1 - q), '#fff2c8');
        this.fire('b', .6, () => this.burst(v, 80, col, 3));
      }
    } else if (tier === 5) {
      v.shake = p < .3 ? p / .3 * 8 : p < .5 ? 14 * (1 - (p - .3) / .2) + 2 : Math.max(0, 2 * (1 - p));
      dim(.45 * Math.sin(p * Math.PI));
      ctx.globalCompositeOperation = 'lighter';
      for (const [st, k] of [[.28, 1], [.42, .7]]) if (p > st) {
        const q = clamp((p - st) / .5, 0, 1);
        ctx.globalAlpha = (1 - q) * .9;
        ctx.strokeStyle = col; ctx.lineWidth = v.k * 10 * (1 - q) * k + 1;
        ctx.beginPath(); ctx.arc(cx, cy, easeOut(q) * Math.max(w, h) * .8 * k, 0, TAU); ctx.stroke();
      }
      if (p > .28 && p < .4) flash(.6 * (1 - (p - .28) / .12), col);
      this.fire('b', .28, () => this.burst(v, 120, col, 4));
    } else if (tier === 6) {
      dim(.6 * Math.sin(p * Math.PI));
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const st = .15 + i * .15;
        if (p > st) {
          const q = clamp((p - st) / .3, 0, 1);
          ctx.globalAlpha = (1 - q) * .9;
          ctx.strokeStyle = col; ctx.lineWidth = v.k * 6;
          ctx.beginPath(); ctx.arc(cx, cy, easeOut(q) * U * 6, 0, TAU); ctx.stroke();
          if (q < .25) blob(ctx, cx, cy, U * 3, col, (1 - q / .25) * (calm ? .3 : .7));
        }
      }
      if (p > .72) {
        const q = clamp((p - .72) / .2, 0, 1), x = -w * .2 + q * w * 1.4;
        const g = ctx.createLinearGradient(x - w * .15, 0, x + w * .15, 0);
        g.addColorStop(0, rgba(col, 0)); g.addColorStop(.5, rgba('#ffffff', .8)); g.addColorStop(1, rgba(col, 0));
        ctx.globalAlpha = calm ? .4 : 1; ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      }
      this.fire('b', .75, () => this.burst(v, 140, col, 4));
    } else if (tier === 7) {
      if (p < .5) {
        const q = p / .5;
        dim(.8 * q);
        ctx.globalCompositeOperation = 'lighter';
        const sc = .3 + q * 3;
        for (let i = 0; i < 260; i++) {
          const arm = i % 3, s = sr(i), an = arm / 3 * TAU + s * 3 + q * 2;
          const r = s * U * 2.6 * sc;
          blob(ctx, cx + Math.cos(an) * r, cy + Math.sin(an) * r * .5, v.k * (2 + s * 3), s < .3 ? '#ffffff' : col, (1 - s * .6) * Math.min(1, q * 2), 's');
        }
      } else if (p < .82) {
        const q = (p - .5) / .32;
        dim(.8);
        ctx.globalCompositeOperation = 'lighter';
        for (const s of [-1, 1]) {
          const len = easeOut(Math.min(1, q * 2)) * h;
          const g = ctx.createLinearGradient(cx, cy, cx, cy + s * len);
          g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.4, rgba(col, .9)); g.addColorStop(1, rgba(col, 0));
          ctx.fillStyle = g; ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.moveTo(cx - U * .2, cy); ctx.lineTo(cx - U * .8, cy + s * len); ctx.lineTo(cx + U * .8, cy + s * len); ctx.lineTo(cx + U * .2, cy); ctx.fill();
        }
        blob(ctx, cx, cy, U * 2.5, col, .8, 's');
        v.shake = 6 * (1 - q);
        this.fire('b', .5, () => this.burst(v, 160, col, 5));
      } else {
        const q = (p - .82) / .18;
        dim(.8 * (1 - q));
        flash(.6 * (1 - q), col);
      }
    } else if (tier === 8) {
      if (p < .55) {
        const q = p / .55;
        dim(q * .95);
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 90; i++) {
          const an = sr(i) * TAU + q * 4 * (1 + sr(i + 2)), r = (1 - easeOut(q)) * Math.max(w, h) * .7 * (.4 + sr(i + 1) * .6);
          blob(ctx, cx + Math.cos(an) * r, cy + Math.sin(an) * r, v.k * 5, '#ffffff', .8, 's');
        }
        v.shake = q * 5;
      } else if (p < .7) {
        dim(1);
        v.shake = 0;
        ctx.globalCompositeOperation = 'lighter';
        blob(ctx, cx, cy, v.k * 4, '#ffffff', .8, 's');
      } else {
        const q = (p - .7) / .3;
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = (1 - q) * (calm ? .6 : 1);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.globalAlpha = 1 - q;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = v.k * 14 * (1 - q);
        ctx.beginPath(); ctx.arc(cx, cy, easeOut(q) * Math.max(w, h) * .7, 0, TAU); ctx.stroke();
        this.fire('b', .7, () => this.burst(v, 180, ac, 5));
      }
    } else if (tier === 9) {
      if (p < .35) {
        const q = p / .35;
        v.zoom = 1 - easeOut(q) * .85;
        dim(q * .9);
        v.shake = q * 4;
      } else if (p < .45) {
        v.zoom = .15; v.shake = 0;
        dim(1);
        ctx.globalCompositeOperation = 'lighter';
        blob(ctx, cx, cy, v.k * (3 + Math.sin(this.t * 20) * 1), '#ffffff', 1, 's');
      } else {
        const q = (p - .45) / .55;
        v.zoom = .15 + easeOut(Math.min(1, q * 2)) * .85;
        dim(Math.max(0, 1 - q * 1.6));
        ctx.globalCompositeOperation = 'lighter';
        if (q < .2) flash(1 - q / .2, '#ffffff');
        // 프리즘 광선
        ctx.save(); ctx.translate(cx, cy);
        for (let i = 0; i < 24; i++) {
          const an = i / 24 * TAU + this.t * .3, len = Math.max(w, h) * easeOut(Math.min(1, q * 3));
          const g = ctx.createLinearGradient(0, 0, Math.cos(an) * len, Math.sin(an) * len);
          const c = prismAt(i * 15 + this.t * 60);
          g.addColorStop(0, rgba(c, .7 * (1 - q * .7))); g.addColorStop(1, rgba(c, 0));
          ctx.fillStyle = g; ctx.globalAlpha = 1;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, len, an - .04, an + .04); ctx.fill();
        }
        ctx.restore();
        this.fire('b1', .45, () => { this.burst(v, 250, 'prism', 7); v.shake = 18; });
        this.fire('b2', .6, () => this.burst(v, 150, 'prism', 4));
        if (q > .1) v.shake = Math.max(0, v.shake - dt * 20);
      }
    }
    ctx.restore();
    // 컷신 파티클
    ctx.globalCompositeOperation = 'lighter';
    this.parts.update(dt);
    drawParticles(ctx, this.parts, true, v.k);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    if (this.t >= this.dur) {
      this.on = false;
      v.shake = 0; v.zoom = 1;
      AU.duck(false);
      const d = this.done; this.done = null;
      if (d) d();
    }
  },
  /* 컷신 종료 후에도 남은 파티클 그리기 */
  drawTail(v, dt) {
    if (this.on || !this.parts) return;
    this.parts.update(dt);
    v.ctx.globalCompositeOperation = 'lighter';
    drawParticles(v.ctx, this.parts, true, v.k);
    v.ctx.globalCompositeOperation = 'source-over';
  }
};

/* ============================================================
 * 렌더 매니저
 * ============================================================ */
const R = {
  main: null, prev: null, q: 1, level: 'high', fpsAcc: 0, fpsN: 0, fpsT: 0, lowStreak: 0,
  init(canvas) {
    this.main = new View(canvas, { max: 700 });
    this.applyQuality();
  },
  dprCap() { return { high: 2, mid: 1.5, low: 1 }[this.level]; },
  applyQuality() {
    const set = G.s.set.gfx;
    if (set !== 'auto') this.level = set;
    else if (!this._autoInit) { this._autoInit = 1; this.level = (window.innerWidth < 760 || (navigator.hardwareConcurrency || 4) <= 4) ? 'mid' : 'high'; }
    this.q = { high: 1, mid: .65, low: .38 }[this.level];
    this.main.pool.limit = Math.round(700 * this.q);
    this.resize();
  },
  resize() {
    this.main.resize(this.dprCap());
    BG.w = 0;
    if (this.prev) this.prev.resize(2);
  },
  setPreview(canvas, aura) {
    if (!canvas) { this.prev = null; return; }
    this.prev = new View(canvas, { preview: true, max: 260 });
    this.prev.showGear = false;
    this.prev.setAura(aura);
    this.prev.resize(2);
  },
  frame(dt) {
    const v = this.main;
    v.t += dt;
    // 자동 품질 조절
    if (G.s.set.gfx === 'auto') {
      this.fpsAcc += dt; this.fpsN++;
      if (this.fpsAcc >= 2) {
        const fps = this.fpsN / this.fpsAcc;
        this.fpsAcc = 0; this.fpsN = 0;
        if (fps < 48) {
          this.lowStreak++;
          if (this.lowStreak >= 2 && this.level !== 'low') { this.level = this.level === 'high' ? 'mid' : 'low'; this.lowStreak = 0; this.q = { high: 1, mid: .65, low: .38 }[this.level]; this.main.pool.limit = Math.round(700 * this.q); this.resize(); }
        } else this.lowStreak = 0;
      }
    }
    const ctx = v.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    BG.draw(v, dt);
    ctx.save();
    if (v.shake > .1) ctx.translate((Math.random() - .5) * v.shake * v.dpr, (Math.random() - .5) * v.shake * v.dpr);
    if (v.zoom !== 1) { ctx.translate(v.cx, v.cy); ctx.scale(v.zoom, v.zoom); ctx.translate(-v.cx, -v.cy); }
    drawAuraScene(v, dt);
    ctx.restore();
    if (Cut.on) Cut.draw(v, dt); else Cut.drawTail(v, dt);
    // 도감 미리보기
    if (this.prev) {
      const p = this.prev;
      p.t += dt;
      p.ctx.setTransform(1, 0, 0, 1, 0, 0);
      p.ctx.clearRect(0, 0, p.w, p.h);
      drawAuraScene(p, dt);
    }
  }
};
