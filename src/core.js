/* ============================================================
 * 코어 로직 — 상태 · 저장 · 운/속도 계산 · 롤 · 이벤트 · 포션 · 제작 · 환생 · 업적
 * ============================================================ */

const SAVE_KEY = 'grdrng_save_v1';
const SAVE_SALT = 'GRD-0rb1t-$alt-7';
const SCHEMA = 1;

function defaultState() {
  return {
    v: SCHEMA,
    dust: 0,
    inv: {},
    eq: 1,
    title: null,
    gear: { glove: 0, neck: 0 },
    pot: {},
    eff: {},
    once: 0,
    codex: {},
    ach: {},
    achLuck: 0,
    core: 0,
    tree: {},
    ev: null,
    nextEv: 240,
    bless: 0,
    st: { total: 0, run: 0, best: 0, runBest: 0, ev: {}, crafted: 0, pres: 0, blessRare: 0, fateFail: 0, play: 0 },
    log: [],
    set: { mv: .8, bgm: .5, sfx: .8, mute: false, skip: 2, autoStop: 5, gfx: 'auto', calm: false, num: 'ko', autoEquip: true },
    auto: false,
    quick: false
  };
}

function deepMerge(base, src) {
  if (!src || typeof src !== 'object') return base;
  for (const k in base) {
    if (!(k in src)) continue;
    const b = base[k], v = src[k];
    if (b && typeof b === 'object' && !Array.isArray(b) && v && typeof v === 'object' && !Array.isArray(v)) {
      // 딕셔너리형(inv, codex 등)은 원본 키를 모두 보존
      if (Object.keys(b).length === 0) base[k] = v;
      else deepMerge(b, v);
    } else if (v !== undefined) base[k] = v;
  }
  return base;
}

function hashStr(str) {
  let h1 = 0xdeadbeef ^ str.length, h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function encodeSave(s) {
  const json = JSON.stringify(s);
  const b = btoa(unescape(encodeURIComponent(json)));
  return b + '.' + hashStr(SAVE_SALT + json);
}
function decodeSave(raw) {
  if (!raw) return null;
  const i = raw.lastIndexOf('.');
  if (i < 0) return null;
  try {
    const json = decodeURIComponent(escape(atob(raw.slice(0, i))));
    if (hashStr(SAVE_SALT + json) !== raw.slice(i + 1)) return null;
    return JSON.parse(json);
  } catch (e) { return null; }
}

const G = {
  s: defaultState(),
  listeners: {},
  on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
  emit(ev, data) { const l = this.listeners[ev]; if (l) for (const f of l) f(data); },

  /* ── 저장 ── */
  load() {
    let data = null;
    try { data = decodeSave(localStorage.getItem(SAVE_KEY)); } catch (e) {}
    if (!data) { try { data = decodeSave(localStorage.getItem(SAVE_KEY + '_bak')); } catch (e) {} }
    this.s = deepMerge(defaultState(), data || {});
    this.s.v = SCHEMA;
    if (!this.s.inv[this.s.eq] && this.s.eq !== 1) this.s.eq = 1;
  },
  save() {
    try {
      const enc = encodeSave(this.s);
      const prev = localStorage.getItem(SAVE_KEY);
      if (prev) localStorage.setItem(SAVE_KEY + '_bak', prev);
      localStorage.setItem(SAVE_KEY, enc);
    } catch (e) {}
  },
  wipe() {
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(SAVE_KEY + '_bak'); } catch (e) {}
    this.s = defaultState();
  },

  /* ── 수치 계산 ── */
  treeLv(id) { return this.s.tree[id] || 0; },
  gearStat(key) {
    let v = 0;
    for (const slot of ['glove', 'neck']) {
      const t = this.s.gear[slot];
      if (t) v += GEAR[slot].tiers[t][key];
    }
    return v;
  },
  blessPeriod() { return 10 - this.treeLv('bless'); },
  blessMult() { return this.s.gear.glove >= 5 ? 3 : 2; },
  nextBlessed() { return this.s.bless + 1 >= this.blessPeriod(); },
  potMult(kind) {
    let m = 1;
    for (const id in this.s.eff) {
      const p = POTION_BY_ID[id];
      if (p && p.kind === kind && this.s.eff[id] > 0) m = Math.max(m, p.mult);
    }
    return m;
  },
  event() { return this.s.ev ? EVENTS[this.s.ev.id] : null; },
  baseLuck() { return 1 + this.gearStat('luck') + this.s.achLuck + this.treeLv('luck') * .05; },
  luck(forRoll) {
    const ev = this.event();
    let l = this.baseLuck() * this.potMult('luck') * (ev ? ev.luck : 1);
    if (forRoll) {
      if (this.nextBlessed()) l *= this.blessMult();
      if (this.s.once) l *= this.s.once;
    }
    return l;
  },
  speed() {
    const ev = this.event();
    return (1 + this.gearStat('speed') + this.treeLv('speed') * .05) * this.potMult('speed') * (ev ? ev.speed : 1);
  },
  rollTime() {
    let t = Math.max(.15, 1.2 / this.speed());
    if (this.s.quick && this.quickUnlocked()) t = Math.max(.15, t * .6);
    return t;
  },
  autoUnlocked() { return this.s.st.total >= 100 || this.treeLv('unlock') > 0; },
  quickUnlocked() { return this.s.st.total >= 1000 || this.treeLv('unlock') > 0; },
  dustFor(a, auto) {
    const ev = this.event();
    let d = Math.max(1, Math.floor(Math.log2(a.c)));
    d *= (1 + this.treeLv('dust') * .1) * (ev ? ev.dust : 1);
    if (auto && this.s.gear.neck >= 5) d *= 1.25;
    return Math.max(1, Math.floor(d));
  },

  /* ── 롤 ── */
  rand() {
    const b = new Uint32Array(2);
    crypto.getRandomValues(b);
    return (b[0] * 2097152 + (b[1] >>> 11)) / 9007199254740992; // 53비트 균등 난수
  },
  pool() {
    const ev = this.event();
    const list = [];
    for (const a of AURAS) {
      if (a.ev && (!ev || ev.id !== a.ev)) continue;
      let denom = a.c;
      if (ev && ev.boost[a.t]) denom = Math.max(1, denom / ev.boost[a.t]);
      list.push({ a, denom });
    }
    list.sort((x, y) => y.denom - x.denom);
    return list;
  },
  /* 결과만 계산 (상태 반영은 applyRoll) */
  roll() {
    const blessed = this.nextBlessed();
    const once = this.s.once;
    const luck = this.luck(true);
    const pool = this.pool();
    let res = AURA_BY_ID[1];
    for (const { a, denom } of pool) {
      if (this.rand() < Math.min(1, luck / denom)) { res = a; break; }
    }
    // 축복 카운터 · 1회용 포션 소모는 즉시
    this.s.bless = blessed ? 0 : this.s.bless + 1;
    this.s.once = 0;
    return { a: res, blessed, once, luck };
  },
  applyRoll(r, auto) {
    const s = this.s, a = r.a;
    s.inv[a.id] = (s.inv[a.id] || 0) + 1;
    const first = !s.codex[a.id];
    if (first) s.codex[a.id] = { f: Date.now(), n: 0 };
    s.codex[a.id].n++;
    s.st.total++;
    s.st.run++;
    if (a.t > s.st.best) s.st.best = a.t;
    if (a.t > s.st.runBest) s.st.runBest = a.t;
    if (r.blessed && a.t >= 4) s.st.blessRare++;
    if (r.once >= 100 && a.id === 1) s.st.fateFail++;
    const dust = this.dustFor(a, auto);
    s.dust += dust;
    s.log.unshift({ id: a.id, ts: Date.now(), b: r.blessed ? 1 : 0 });
    if (s.log.length > 12) s.log.length = 12;
    this.checkAch();
    this.emit('rolled', { r, first, dust });
    return first;
  },

  /* ── 시간 경과 ── */
  tick(dt) {
    const s = this.s;
    s.st.play += dt;
    for (const id in s.eff) {
      s.eff[id] -= dt;
      if (s.eff[id] <= 0) { delete s.eff[id]; this.emit('potionEnd', id); }
    }
    if (s.ev) {
      s.ev.rem -= dt;
      if (s.ev.rem <= 0) {
        const id = s.ev.id;
        s.ev = null;
        s.nextEv = this.nextEventDelay();
        this.emit('eventEnd', id);
      }
    } else {
      const before = s.nextEv;
      s.nextEv -= dt;
      if (before > 3 && s.nextEv <= 3) this.emit('eventSoon', null);
      if (s.nextEv <= 0) this.startEvent();
    }
  },
  nextEventDelay() {
    return (300 + this.rand() * 300) * (1 - this.treeLv('magnet') * .1);
  },
  startEvent(forceId) {
    let id = forceId;
    if (!id) {
      let total = 0;
      for (const k in EVENTS) total += EVENTS[k].w;
      let r = this.rand() * total;
      for (const k in EVENTS) { r -= EVENTS[k].w; if (r <= 0) { id = k; break; } }
      id = id || 'meteor';
    }
    this.s.ev = { id, rem: 120 + this.rand() * 120, dur: 0 };
    this.s.ev.dur = this.s.ev.rem;
    this.s.st.ev[id] = (this.s.st.ev[id] || 0) + 1;
    this.checkAch();
    this.emit('eventStart', id);
  },

  /* ── 인벤토리 ── */
  spare(id) { return Math.max(0, (this.s.inv[id] || 0) - (id === this.s.eq ? 1 : 0)); },
  equip(id) {
    if (id !== 1 && !this.s.inv[id]) return false;
    this.s.eq = id;
    this.emit('equip', id);
    return true;
  },
  removeAura(id, n) {
    this.s.inv[id] -= n;
    if (this.s.inv[id] <= 0) delete this.s.inv[id];
    if (this.s.eq === id && !this.s.inv[id]) this.s.eq = 1;
  },
  dismantleValue(a) { return Math.max(1, Math.floor(Math.log2(a.c))) * 3; },
  dismantle(id, n) {
    const have = (this.s.inv[id] || 0) - 1; // 1개는 항상 남김
    n = Math.min(n, have);
    if (n <= 0) return 0;
    const a = AURA_BY_ID[id];
    const gain = this.dismantleValue(a) * n;
    this.removeAura(id, n);
    this.s.dust += gain;
    this.emit('change');
    return gain;
  },
  dismantleTiers(maxTier) {
    let gain = 0;
    for (const a of AURAS) if (a.t <= maxTier && this.s.inv[a.id] > 1) gain += this.dismantle(a.id, this.s.inv[a.id] - 1);
    return gain;
  },

  /* ── 포션 ── */
  buyPotion(id) {
    const p = POTION_BY_ID[id];
    if (!p.price || this.s.dust < p.price) return false;
    this.s.dust -= p.price;
    this.s.pot[id] = (this.s.pot[id] || 0) + 1;
    this.emit('change');
    return true;
  },
  /* 재료 선택: 해당 등급에서 흔한 것부터 여분 소모 */
  pickTier(tier, count, exclude) {
    const picks = [];
    let need = count;
    const list = AURAS.filter(a => a.t === tier).sort((x, y) => x.c - y.c);
    for (const a of list) {
      if (need <= 0) break;
      let avail = this.spare(a.id) - ((exclude && exclude[a.id]) || 0);
      if (avail <= 0) continue;
      const take = Math.min(avail, need);
      picks.push([a.id, take]);
      need -= take;
    }
    return need > 0 ? null : picks;
  },
  potionRecipePicks(p) {
    const r = p.recipe;
    if (!r) return null;
    if (r.tier) return this.pickTier(r.tier, r.count);
    if (r.tiers) {
      const all = [];
      const used = {};
      for (const t of r.tiers) {
        const pk = this.pickTier(t, 1, used);
        if (!pk) return null;
        pk.forEach(([id, n]) => { used[id] = (used[id] || 0) + n; all.push([id, n]); });
      }
      return all;
    }
    return null;
  },
  canCraftPotion(id) {
    const p = POTION_BY_ID[id];
    return !!p.recipe && this.s.dust >= p.recipe.dust && !!this.potionRecipePicks(p);
  },
  craftPotion(id) {
    const p = POTION_BY_ID[id];
    if (!this.canCraftPotion(id)) return false;
    const picks = this.potionRecipePicks(p);
    picks.forEach(([aid, n]) => this.removeAura(aid, n));
    this.s.dust -= p.recipe.dust;
    this.s.pot[id] = (this.s.pot[id] || 0) + 1;
    this.emit('change');
    return true;
  },
  usePotion(id) {
    const p = POTION_BY_ID[id];
    if (!this.s.pot[id]) return false;
    if (p.kind === 'once') {
      if (this.s.once >= p.mult) return false;
      this.s.once = p.mult;
    } else {
      this.s.eff[id] = Math.min(3600, (this.s.eff[id] || 0) + p.dur);
    }
    this.s.pot[id]--;
    if (!this.s.pot[id]) delete this.s.pot[id];
    this.emit('change');
    return true;
  },

  /* ── 장비 ── */
  gearNext(slot) {
    const t = this.s.gear[slot] + 1;
    return t <= 5 ? GEAR[slot].tiers[t] : null;
  },
  canCraftGear(slot) {
    const g = this.gearNext(slot);
    if (!g || this.s.dust < g.dust) return false;
    for (const id in g.mats) if (this.spare(+id) < g.mats[id]) return false;
    return true;
  },
  craftGear(slot) {
    if (!this.canCraftGear(slot)) return false;
    const g = this.gearNext(slot);
    for (const id in g.mats) this.removeAura(+id, g.mats[id]);
    this.s.dust -= g.dust;
    this.s.gear[slot]++;
    this.s.st.crafted++;
    this.checkAch();
    this.emit('change');
    return true;
  },

  /* ── 환생 ── */
  prestigeReq() {
    const rare = AURAS.some(a => a.t >= 4 && this.s.inv[a.id] > 0);
    return { rolls: this.s.st.run >= 10000, rare, ok: this.s.st.run >= 10000 && rare };
  },
  prestigeGain() {
    const bonus = [0, 0, 0, 0, 1, 2, 4, 7, 12, 25];
    return Math.floor(Math.sqrt(this.s.st.run / 1000)) + bonus[this.s.st.runBest];
  },
  prestige() {
    if (!this.prestigeReq().ok) return false;
    const s = this.s;
    const gain = this.prestigeGain();
    s.core += gain;
    s.st.pres++;
    const keep = this.treeLv('keep') > 0;
    s.dust = 0;
    s.inv = {};
    s.eq = 1;
    s.gear = { glove: keep ? Math.min(1, s.gear.glove) : 0, neck: keep ? Math.min(1, s.gear.neck) : 0 };
    s.pot = {};
    s.eff = {};
    s.once = 0;
    s.bless = 0;
    s.st.run = 0;
    s.st.runBest = 0;
    s.log = [];
    this.checkAch();
    this.emit('prestige', gain);
    return gain;
  },
  buyTree(id) {
    const node = TREE.find(n => n.id === id);
    const lv = this.treeLv(id);
    if (lv >= node.max) return false;
    const cost = node.cost(lv);
    if (this.s.core < cost) return false;
    this.s.core -= cost;
    this.s.tree[id] = lv + 1;
    if (id === 'magnet' && !this.s.ev) this.s.nextEv = Math.min(this.s.nextEv, this.nextEventDelay());
    this.emit('change');
    return true;
  },

  /* ── 업적 ── */
  checkAch() {
    for (const a of ACHS) {
      if (this.s.ach[a.id]) continue;
      if (!a.chk(this.s)) continue;
      this.s.ach[a.id] = Date.now();
      const r = a.r;
      if (r.dust) this.s.dust += r.dust;
      if (r.luck) this.s.achLuck += r.luck;
      if (r.core) this.s.core += r.core;
      this.emit('ach', a);
    }
  },
  titles() {
    return ACHS.filter(a => this.s.ach[a.id] && a.r.title).map(a => a.r.title);
  }
};
