/* ============================================================
 * UI — HUD · 롤 흐름 · 드로어(가방/제작/상점/도감/업적/환생/설정) · 모달 · 알림
 * ============================================================ */

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const IC = {
  bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/>',
  craft: '<path d="M14.5 3.5l6 6-2.5 2.5-6-6z"/><path d="M12 6L3.5 14.5l3 3L15 9"/><path d="M5 19l-1.5 1.5"/>',
  shop: '<path d="M9 3h6"/><path d="M10 3v6.5L5.2 18.4A1.8 1.8 0 0 0 6.8 21h10.4a1.8 1.8 0 0 0 1.6-2.6L14 9.5V3"/><path d="M7.5 15h9"/>',
  codex: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5V5.5"/><path d="M12 7.5l1 2 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 9.8l2-.3z"/>',
  ach: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8"/>',
  pres: '<path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/><circle cx="12" cy="12" r="2"/>',
  set: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  fs: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  fsx: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  roll: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4l-5.4 3 1.3-6-4.5-4.1 6-.7z"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  snd: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  mute: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/>'
};
const icon = (k, cls) => `<svg class="ic ${cls || ''}" viewBox="0 0 24 24">${IC[k]}</svg>`;

const TABS = [
  { id: 'bag', n: '가방', ic: 'bag' },
  { id: 'craft', n: '제작', ic: 'craft' },
  { id: 'shop', n: '상점', ic: 'shop' },
  { id: 'codex', n: '도감', ic: 'codex' },
  { id: 'ach', n: '업적', ic: 'ach' },
  { id: 'pres', n: '환생', ic: 'pres' },
  { id: 'set', n: '설정', ic: 'set' }
];

const UI = {
  rolling: false, rollT: 0, rollDur: 1, rollRes: null, slotT: 0, slotIdx: 0,
  tab: null, sub: { bag: 'aura', craft: 'gear' }, bagFilter: 0, bagSort: 'rare', hudT: 0, dirty: false,
  revealTimer: 0, autoWait: 0, autoRoll: false,

  fmt(n) { return G.s.set.num === 'en' ? fmtEn(n) : fmtKo(n); },
  mult(x) { return 'x' + (x >= 100 ? Math.round(x).toLocaleString() : x >= 10 ? x.toFixed(1) : x.toFixed(2)); },
  isMobile() { return window.innerWidth <= 760; },

  init() {
    $('btnFs').innerHTML = icon('fs');
    $('btnSet').innerHTML = icon('set');
    $('drClose').innerHTML = icon('close');
    this.updateMuteIcon();
    // PC 메뉴
    $('menu').className = 'glass';
    $('menu').innerHTML = TABS.filter(t => t.id !== 'set').map(t => `<button data-tab="${t.id}">${icon(t.ic)}<span>${t.n}</span></button>`).join('');
    // 모바일 탭
    $('tabs').innerHTML = [
      `<button data-tab="roll" class="on">${icon('roll')}<span>롤</span></button>`,
      `<button data-tab="bag">${icon('bag')}<span>가방</span></button>`,
      `<button data-tab="craft">${icon('craft')}<span>제작</span></button>`,
      `<button data-tab="codex">${icon('codex')}<span>도감</span></button>`,
      `<button data-tab="more">${icon('more')}<span>더보기</span></button>`
    ].join('');
    const onTab = e => {
      const b = e.target.closest('button[data-tab]');
      if (!b) return;
      AU.click();
      const id = b.dataset.tab;
      if (id === 'roll') this.closeDrawer();
      else if (id === 'more') this.openMore();
      else if (this.tab === id) this.closeDrawer();
      else this.openDrawer(id);
    };
    $('menu').addEventListener('click', onTab);
    $('tabs').addEventListener('click', onTab);
    $('btnSet').onclick = () => { AU.click(); this.openDrawer('set'); };
    $('drClose').onclick = () => this.closeDrawer();
    $('dim').onclick = () => this.closeDrawer();
    $('btnRoll').onclick = () => this.roll();
    $('btnAuto').onclick = () => this.toggleAuto();
    $('btnQuick').onclick = () => this.toggleQuick();
    $('btnFs').onclick = () => this.toggleFs();
    $('btnMute').onclick = () => { G.s.set.mute = !G.s.set.mute; AU.applyVolume(); this.updateMuteIcon(); };
    $('skipBtn').onclick = () => Cut.skip();
    $('modal').addEventListener('click', e => { if (e.target.id === 'modal') this.closeModal(); });
    document.addEventListener('fullscreenchange', () => this.updateFsIcon());
    document.addEventListener('webkitfullscreenchange', () => this.updateFsIcon());
    // 드로어 스와이프 닫기 (모바일)
    let sy = null;
    const dr = $('drawer');
    dr.querySelector('header').addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
    dr.querySelector('.handle').addEventListener('touchstart', e => { sy = e.touches[0].clientY; }, { passive: true });
    dr.addEventListener('touchmove', e => {
      if (sy == null) return;
      const d = e.touches[0].clientY - sy;
      if (d > 0) dr.style.transform = `translateY(${d}px)`;
    }, { passive: true });
    dr.addEventListener('touchend', e => {
      if (sy == null) return;
      const d = e.changedTouches[0].clientY - sy;
      dr.style.transform = '';
      sy = null;
      if (d > 90) this.closeDrawer();
    });
    // 키보드
    document.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); if (!$('start').classList.contains('out')) return; this.roll(); }
      else if (e.code === 'KeyA') this.toggleAuto();
      else if (e.code === 'KeyQ') this.toggleQuick();
      else if (e.code === 'Escape') { if ($('modal').classList.contains('on')) this.closeModal(); else this.closeDrawer(); }
    });
    // 이벤트 구독
    G.on('change', () => this.markDirty());
    G.on('equip', () => { R.main.setAura(AURA_BY_ID[G.s.eq]); this.updatePlate(); this.markDirty(); });
    G.on('ach', a => { AU.achieve(); this.toast(`<i>🏆</i><span>업적 달성 · <b>${esc(a.n)}</b>${a.r.title ? `<br><small>칭호 「${esc(a.r.title)}」 획득</small>` : ''}</span>`, 'ach', 3600); this.markDirty(); });
    G.on('eventSoon', () => { AU.alarm(); this.banner('우주에 이상 징후가 감지됩니다…', '잠시 후 이벤트가 시작됩니다', '#8AB4FF'); });
    G.on('eventStart', id => {
      const e = EVENTS[id];
      AU.setEventTone(id);
      this.banner(`✦ ${e.name} 시작 ✦`, e.desc, e.col);
      this.markDirty();
    });
    G.on('eventEnd', id => { AU.setEventTone(null); this.toast(`<i>🌌</i><span>${EVENTS[id].name}이(가) 끝났습니다</span>`); this.markDirty(); });
    G.on('potionEnd', id => this.toast(`<i>⌛</i><span>${POTION_BY_ID[id].n} 효과 종료</span>`));
    this.layoutHUD();
    this.updatePlate();
    this.updateToggles();
    this.renderLog();
    this.hud(true);
  },

  /* ── 이름표/슬롯 위치 (캔버스 레이아웃 기준) ── */
  layoutHUD() {
    const v = R.main, d = v.dpr || 1;
    const np = $('nameplate'), sl = $('slot');
    np.style.left = (v.cx / d) + 'px';
    np.style.top = ((v.cy - 2.2 * v.U) / d) + 'px';
    sl.style.left = (v.cx / d) + 'px';
    let slotY = (v.cy + 2.35 * v.U) / d;
    const ctl = $('controls').getBoundingClientRect();
    if (ctl.top && slotY > ctl.top - 52) slotY = ctl.top - 52;
    sl.style.top = slotY + 'px';
  },
  updatePlate() {
    const a = AURA_BY_ID[G.s.eq];
    $('npTitle').textContent = G.s.title || '';
    const n = $('npName');
    n.textContent = a.n;
    this.colorize(n, a);
  },
  colorize(el, a) {
    const c = TIERS[a.t].color === 'prism' || a.prism ? null : (a.t >= 8 ? '#FFFFFF' : TIERS[a.t].color);
    el.classList.toggle('prism', !c);
    el.style.color = c || '';
  },
  auraCss(a) { return a.t === 9 ? '#ff9ff0' : a.t === 8 ? '#FFFFFF' : TIERS[a.t].color; },

  /* ── 롤 ── */
  roll() {
    if (this.rolling || Cut.on) return;
    AU.init();
    this.hideReveal();
    const res = G.roll();
    this.rolling = true;
    this.resolving = false;
    this.rollRes = res;
    this.rollT = 0;
    this.rollDur = G.rollTime();
    this.slotT = 0;
    this.quickNow = G.s.quick && G.quickUnlocked();
    AU.rollStart(res.blessed);
    $('btnRoll').classList.add('busy');
    const sl = $('slot');
    sl.classList.remove('pop');
    if (!this.quickNow) sl.classList.add('spin');
  },
  slotName() {
    // 흔한 오라 위주 + 가끔 희귀한 이름으로 긴장감
    const r = Math.random();
    let pool;
    if (r < .82) pool = AURAS.filter(a => a.t <= 2 && !a.ev);
    else if (r < .96) pool = AURAS.filter(a => a.t >= 3 && a.t <= 5 && !a.ev);
    else pool = AURAS.filter(a => a.t >= 6 && !a.ev);
    return pool[Math.floor(Math.random() * pool.length)];
  },
  frameRoll(dt) {
    if (!this.rolling || this.resolving) return;
    this.rollT += dt;
    const p = Math.min(1, this.rollT / this.rollDur);
    $('rollPrg').style.strokeDashoffset = 289 * (1 - p);
    if (!this.quickNow) {
      // 감속하는 슬롯
      this.slotT -= dt;
      if (this.slotT <= 0 && p < .97) {
        const a = this.slotName();
        const el = $('slotText');
        el.textContent = a.n;
        this.colorize(el, a);
        this.slotT = .035 + p * p * .16;
        AU.tick(1 - p);
      }
    }
    if (p >= 1) this.finishRoll();
  },
  finishRoll() {
    this.resolving = true; // 컷신이 끝날 때까지 재진입 방지
    const r = this.rollRes, a = r.a;
    const first = G.applyRoll(r, this.autoRoll);
    const el = $('slotText'), sl = $('slot');
    sl.classList.remove('spin');
    el.textContent = a.n;
    this.colorize(el, a);
    void sl.offsetWidth;
    sl.classList.add('pop');
    $('rollPrg').style.strokeDashoffset = 289;
    const cur = AURA_BY_ID[G.s.eq];
    const better = a.c > cur.c;
    const doEquip = () => { if (better && G.s.set.autoEquip !== false) G.equip(a.id); };
    const playCut = a.t >= 6 || a.t > G.s.set.skip;
    this.renderLog();
    if (playCut && a.t >= 3) {
      if (a.t >= 6) setTimeout(() => { if (Cut.on) $('skipBtn').classList.add('on'); }, 3000);
      Cut.start(a, () => {
        $('skipBtn').classList.remove('on');
        AU.result(a.t);
        doEquip();
        this.showReveal(r, first);
        if (a.t >= 4) this.banner(`${TIERS[a.t].name} 등급 획득!`, `${a.n} · ${fmtChance(a.c)}`, this.auraCss(a));
        this.endRoll(a);
      });
    } else {
      AU.result(a.t);
      doEquip();
      if (a.t >= 3) this.showReveal(r, first, true);
      else if (first) this.toast(`<i>✦</i><span>새 오라 · <b style="color:${this.auraCss(a)}">${esc(a.n)}</b></span>`);
      this.endRoll(a);
    }
  },
  endRoll(a) {
    this.rolling = false;
    this.resolving = false;
    $('btnRoll').classList.remove('busy');
    if (this.autoRoll && a.t >= G.s.set.autoStop) {
      this.setAuto(false);
      this.toast(`<i>⏸</i><span>희귀 오라 획득으로 자동 롤 정지</span>`);
    }
    this.autoWait = a.t >= 3 ? 1.2 : .08;
    this.hud(true);
  },

  /* ── 결과 카드 ── */
  showReveal(r, first, short) {
    const a = r.a, c = this.auraCss(a);
    const el = $('reveal');
    el.innerHTML = `<div class="rv" style="--c:${c}">
      <div class="tier">${TIERS[a.t].name}${a.ev ? ' · ' + EVENTS[a.ev].name : ''}</div>
      <h1 class="${a.t === 9 ? 'prism' : ''}">${esc(a.n)}</h1>
      <div class="ch">${fmtChance(a.c)}</div>
      <div class="badges">${first ? '<span class="nb">첫 획득!</span>' : ''}${r.blessed ? '<span class="nb bl">별의 축복</span>' : ''}</div>
      <p class="ds">${esc(a.d)}</p>
      <div class="acts">${G.s.eq === a.id ? '<button class="btn sub sm" disabled>장착 중</button>' : `<button class="btn sm" id="rvEq">장착</button>`}<button class="btn sub sm" id="rvOk">확인</button></div>
    </div>`;
    el.classList.add('on');
    const eq = $('rvEq');
    if (eq) eq.onclick = () => { G.equip(a.id); this.hideReveal(); };
    $('rvOk').onclick = () => this.hideReveal();
    clearTimeout(this.revealTimer);
    this.revealTimer = setTimeout(() => this.hideReveal(), short ? 1800 : (this.autoRoll ? 2600 : 4200));
  },
  hideReveal() { $('reveal').classList.remove('on'); clearTimeout(this.revealTimer); },

  /* ── 자동 / 빠른 ── */
  toggleAuto() {
    AU.init();
    if (!G.autoUnlocked()) { AU.error(); this.toast(`<i>🔒</i><span>자동 롤은 총 100회 롤 후 해금됩니다 (${G.s.st.total}/100)</span>`); return; }
    this.setAuto(!this.autoRoll);
  },
  setAuto(on) {
    this.autoRoll = on;
    G.s.auto = on;
    this.updateToggles();
    if (on && !this.rolling && !Cut.on) this.autoWait = 0;
  },
  toggleQuick() {
    AU.init();
    if (!G.quickUnlocked()) { AU.error(); this.toast(`<i>🔒</i><span>빠른 롤은 총 1,000회 롤 후 해금됩니다 (${this.fmt(G.s.st.total)}/1,000)</span>`); return; }
    G.s.quick = !G.s.quick;
    AU.click();
    this.updateToggles();
  },
  updateToggles() {
    const au = $('btnAuto'), qu = $('btnQuick');
    au.classList.toggle('on', this.autoRoll);
    au.classList.toggle('lock', !G.autoUnlocked());
    qu.classList.toggle('on', G.s.quick && G.quickUnlocked());
    qu.classList.toggle('lock', !G.quickUnlocked());
  },

  /* ── 전체화면 ── */
  toggleFs() {
    const d = document, el = d.documentElement;
    const isFs = d.fullscreenElement || d.webkitFullscreenElement;
    if (isFs) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => this.fsHelp());
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else this.fsHelp();
  },
  fsHelp() { this.modal('전체화면', '<p>이 브라우저는 전체화면을 지원하지 않습니다.<br>iPhone/iPad: 공유 버튼 → <b>홈 화면에 추가</b>로 설치하면 전체화면으로 실행됩니다.</p>', [['확인', 'sub']]); },
  updateFsIcon() { $('btnFs').innerHTML = icon((document.fullscreenElement || document.webkitFullscreenElement) ? 'fsx' : 'fs'); setTimeout(() => { R.resize(); this.layoutHUD(); }, 120); },
  updateMuteIcon() { $('btnMute').innerHTML = icon(G.s.set.mute ? 'mute' : 'snd'); },

  /* ── 프레임 ── */
  frame(dt) {
    this.frameRoll(dt);
    if (this.autoRoll && !this.rolling && !Cut.on) {
      this.autoWait -= dt;
      if (this.autoWait <= 0) this.roll();
    }
    this.hudT -= dt;
    if (this.hudT <= 0) { this.hudT = .1; this.hud(); }
    if (this.dirty) { this.dirty = false; this.renderDrawer(true); }
  },
  markDirty() { this.dirty = true; },

  /* ── HUD 갱신 (초당 10회) ── */
  _set(id, txt) { const el = $(id); if (el && el.textContent !== txt) el.textContent = txt; },
  hud(force) {
    const s = G.s;
    const luck = G.luck(false), spd = G.speed();
    this._set('dustV', this.fmt(s.dust));
    this._set('sLuck', this.mult(luck));
    this._set('sSpd', this.mult(spd));
    this._set('sTime', G.rollTime().toFixed(2) + '초');
    this._set('sTotal', this.fmt(s.st.total));
    this._set('sRun', this.fmt(s.st.run));
    this._set('sPres', String(s.st.pres));
    this._set('mLuck', this.mult(luck));
    this._set('mSpd', this.mult(spd));
    this._set('mRolls', this.fmt(s.st.total));
    const per = G.blessPeriod(), left = per - s.bless - 1;
    const ready = G.nextBlessed();
    this._set('sBless', ready ? '다음 롤!' : left + '회 후');
    this._set('mBless', ready ? '다음!' : String(left));
    $('mBless').classList.toggle('gold', ready);
    $('sBlessBar').style.width = ((s.bless + (ready ? 1 : 0)) / (per - 1) * 100) + '%';
    $('sBless').parentElement.parentElement.classList.toggle('ready', ready);
    $('btnRoll').classList.toggle('bless', ready);
    this._set('sOnce', s.once ? `✦ 다음 롤 운 x${s.once} 대기 중` : '');
    // 활성 효과
    const effs = [];
    for (const id in s.eff) {
      const p = POTION_BY_ID[id];
      const pct = Math.max(0, s.eff[id] / Math.max(p.dur, s.eff[id]) * 100);
      effs.push(`<div class="eff" style="--c:${p.kind === 'luck' ? '#6BFFB0' : '#5FE3F0'};--p:${pct}"><div class="ring"><b>${p.kind === 'luck' ? '운' : '속'}</b></div><span>${p.n.replace(' 포션', '')}</span><small>${this.time(s.eff[id])}</small></div>`);
    }
    if (s.once) effs.push(`<div class="eff" style="--c:#FFD25E;--p:100"><div class="ring"><b>✦</b></div><span>다음 롤 x${s.once}</span></div>`);
    const effHtml = effs.join('');
    if (effHtml !== this._effHtml) { this._effHtml = effHtml; $('effects').innerHTML = effHtml; }
    // 이벤트
    const ev = G.event();
    let evc, evm = '';
    if (ev) {
      const pr = s.ev.rem / s.ev.dur * 100;
      evc = `<div class="evc" style="--c:${ev.col}"><div class="t"><b>✦ ${ev.name}</b><small>${this.time(s.ev.rem)}</small></div><p>${ev.desc}</p><div class="bar"><i style="width:${pr}%"></i></div></div>`;
      evm = `<div class="evm" style="--c:${ev.col}"><b>✦ ${ev.name}</b><small>${this.time(s.ev.rem)}</small></div>`;
    } else {
      evc = `<div class="evc idle"><div class="t"><b>우주 관측 중</b><small>${this.time(Math.max(0, s.nextEv))}</small></div><p>다음 우주 이벤트까지</p></div>`;
    }
    if (evc !== this._evc) { this._evc = evc; $('evCard').innerHTML = evc; }
    if (evm !== this._evm) { this._evm = evm; $('evMini').innerHTML = evm; }
    if (force) this.updateToggles();
    // 알림 점: 제작 가능 / 환생 가능
    const craftable = G.canCraftGear('glove') || G.canCraftGear('neck');
    const presOk = G.prestigeReq().ok;
    if (craftable !== this._craftDot || presOk !== this._presDot || force) {
      this._craftDot = craftable; this._presDot = presOk;
      document.querySelectorAll('[data-tab="craft"]').forEach(b => this.dot(b, craftable));
      document.querySelectorAll('[data-tab="pres"]').forEach(b => this.dot(b, presOk));
      document.querySelectorAll('[data-tab="more"]').forEach(b => this.dot(b, presOk));
    }
  },
  dot(b, on) {
    let d = b.querySelector('.dot');
    if (on && !d) { d = document.createElement('i'); d.className = 'dot'; b.appendChild(d); }
    else if (!on && d) d.remove();
  },
  time(sec) {
    sec = Math.ceil(sec);
    const m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  },
  renderLog() {
    const now = Date.now();
    $('log').innerHTML = G.s.log.slice(0, 10).map(l => {
      const a = AURA_BY_ID[l.id];
      const ago = Math.floor((now - l.ts) / 1000);
      return `<li style="color:${this.auraCss(a)}"><i></i><span style="color:${this.auraCss(a)}">${esc(a.n)}</span>${l.b ? '<em class="bl">축복</em>' : ''}<small>${a.c >= 1000 ? '1/' + this.fmt(a.c) : '1/' + a.c}</small></li>`;
    }).join('') || '<li style="color:var(--sub)"><span>아직 기록이 없습니다</span></li>';
  },

  /* ── 알림 ── */
  toast(html, cls, ms) {
    const el = document.createElement('div');
    el.className = 'toast ' + (cls || '');
    el.innerHTML = html;
    const box = $('toasts');
    box.appendChild(el);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, ms || 2600);
  },
  banner(title, sub, col) {
    const b = $('banner');
    b.style.setProperty('--c', col || '#8AB4FF');
    b.innerHTML = `<b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}`;
    b.classList.add('on');
    clearTimeout(this._bt);
    this._bt = setTimeout(() => b.classList.remove('on'), 3600);
  },

  /* ── 모달 ── */
  modal(title, body, actions, onRender) {
    const m = $('modal');
    m.innerHTML = `<div class="mb">${title ? `<h3>${title}</h3>` : ''}${body}<div class="acts">${(actions || []).map((a, i) => `<button class="btn ${a[1] || ''}" data-i="${i}">${a[0]}</button>`).join('')}</div></div>`;
    m.classList.add('on');
    m.querySelectorAll('.acts .btn').forEach(b => {
      b.onclick = () => {
        AU.click();
        const a = actions[+b.dataset.i];
        const keep = a[2] && a[2]() === false;
        if (!keep) this.closeModal();
      };
    });
    if (onRender) onRender(m);
  },
  closeModal() {
    $('modal').classList.remove('on');
    R.setPreview(null);
  },
  confirm(title, msg, okLabel, cls, fn) { this.modal(title, `<p>${msg}</p>`, [['취소', 'sub'], [okLabel, cls, fn]]); },

  /* ── 오라 상세 (도감/가방 공용) ── */
  auraDetail(id) {
    const a = AURA_BY_ID[id], s = G.s, cd = s.codex[id];
    if (!cd) return;
    const c = this.auraCss(a), have = s.inv[id] || 0;
    const date = new Date(cd.f);
    const ds = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    const canEq = (have > 0 || id === 1) && s.eq !== id;
    const dis = Math.max(0, have - 1);
    const body = `<canvas class="pv" id="pv"></canvas>
      <div class="dt-h" style="--c:${c}"><h3 class="${a.t === 9 ? 'prism' : ''}">${esc(a.n)}</h3><span class="tag">${TIERS[a.t].name}${a.ev ? ' · ' + EVENTS[a.ev].name + ' 전용' : ''}</span></div>
      <p>${esc(a.d)}</p>
      <div class="kv"><span>확률</span><b>${fmtChance(a.c)}</b><span>보유</span><b>${have}개</b><span>누적 획득</span><b>${cd.n.toLocaleString()}회</b><span>첫 획득</span><b>${ds}</b>
      <span>분해 가치</span><b class="k"><span class="price"><i class="sd"></i>${this.fmt(G.dismantleValue(a))} / 개</span></b></div>`;
    const acts = [];
    if (canEq) acts.push(['장착', '', () => { G.equip(id); AU.click(); }]);
    else acts.push([s.eq === id ? '장착 중' : '미보유', 'sub']);
    if (dis > 0) acts.push([`분해 ${dis > 1 ? '(중복 ' + dis + ')' : ''}`, 'sub', () => {
      const go = () => { const g = G.dismantle(id, dis); this.toast(`<i>✦</i><span>${esc(a.n)} ${dis}개 분해 · 별가루 +${this.fmt(g)}</span>`); };
      if (a.t >= 4) { setTimeout(() => this.confirm('분해 확인', `<b style="color:${c}">${esc(a.n)}</b> ${dis}개를 분해할까요?<br>(1개는 남습니다)`, '분해', 'danger', go), 10); }
      else go();
    }]);
    acts.push(['닫기', 'sub']);
    this.modal('', body, acts, () => {
      const cv = $('pv');
      R.setPreview(cv, a);
    });
  },

  /* ── 드로어 ── */
  openDrawer(id) {
    this.tab = id;
    const t = TABS.find(x => x.id === id);
    $('drTitle').textContent = t.n;
    $('drawer').classList.add('on');
    $('drawer').setAttribute('aria-hidden', 'false');
    if (!this.isMobile()) $('dim').classList.remove('on');
    document.querySelectorAll('#menu button, #tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === id || (b.dataset.tab === 'more' && ['shop', 'ach', 'pres', 'set'].includes(id))));
    $('drBody').scrollTop = 0;
    this.renderDrawer();
  },
  closeDrawer() {
    this.tab = null;
    $('drawer').classList.remove('on');
    $('drawer').setAttribute('aria-hidden', 'true');
    $('dim').classList.remove('on');
    document.querySelectorAll('#menu button, #tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === 'roll'));
  },
  openMore() {
    const items = [['shop', '상점', '포션 구매 · 사용'], ['ach', '업적', '업적 · 칭호'], ['pres', '환생', '성핵 · 영구 보너스'], ['set', '설정', '사운드 · 그래픽 · 데이터']];
    this.modal('더보기', `<div style="display:flex;flex-direction:column;gap:8px">${items.map(([id, n, d]) => `<button class="card" data-go="${id}" style="text-align:left;margin:0;display:flex;align-items:center;gap:12px">${icon(TABS.find(t => t.id === id).ic)}<span><b style="font-size:15px">${n}</b><br><small style="color:var(--sub)">${d}</small></span>${id === 'pres' && G.prestigeReq().ok ? '<span class="tag" style="margin-left:auto;color:var(--gold)">가능</span>' : ''}</button>`).join('')}</div>`, [['닫기', 'sub']], m => {
      m.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { AU.click(); this.closeModal(); this.openDrawer(b.dataset.go); });
    });
  },
  renderDrawer(soft) {
    if (!this.tab) return;
    if (soft && this.tab === 'set') return;
    const body = $('drBody'), st = body.scrollTop;
    const fn = this['tab_' + this.tab];
    body.innerHTML = fn.call(this);
    const bind = this['bind_' + this.tab];
    if (bind) bind.call(this, body);
    if (soft) body.scrollTop = st;
  },

  /* 가방 */
  tab_bag() {
    const s = G.s, sub = this.sub.bag;
    let h = `<div class="seg"><button data-sub="aura" class="${sub === 'aura' ? 'on' : ''}">오라</button><button data-sub="pot" class="${sub === 'pot' ? 'on' : ''}">포션</button></div>`;
    if (sub === 'pot') {
      const owned = POTIONS.filter(p => s.pot[p.id]);
      if (!owned.length) return h + '<div class="empty">보유한 포션이 없습니다<br><small>상점에서 구매하거나 제작하세요</small></div>';
      return h + owned.map(p => `<div class="card"><div class="gear-h"><h4>${p.n} <span class="tag">${s.pot[p.id]}개</span></h4><button class="btn sm" data-use="${p.id}" ${p.kind === 'once' && s.once >= p.mult ? 'disabled' : ''}>사용</button></div><p>${p.desc}${s.eff[p.id] ? ` · 남은 시간 ${this.time(s.eff[p.id])}` : ''}</p></div>`).join('');
    }
    const tiers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    h += `<div class="chips">${tiers.map(t => `<button class="chip ${this.bagFilter === t ? 'on' : ''}" data-f="${t}">${t ? TIERS[t].name : '전체'}</button>`).join('')}</div>`;
    h += `<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center"><select id="bagSort"><option value="rare">희귀도순</option><option value="count">보유량순</option><option value="new">최근 획득순</option></select><span style="flex:1"></span><button class="btn sub sm" id="bulkDis">성진·혜성 중복 분해</button></div>`;
    let list = AURAS.filter(a => s.inv[a.id] > 0 && (!this.bagFilter || a.t === this.bagFilter));
    if (this.bagSort === 'rare') list.sort((x, y) => y.c - x.c);
    else if (this.bagSort === 'count') list.sort((x, y) => s.inv[y.id] - s.inv[x.id]);
    else list.sort((x, y) => (s.codex[y.id] ? s.codex[y.id].f : 0) - (s.codex[x.id] ? s.codex[x.id].f : 0));
    if (!list.length) return h + '<div class="empty">해당하는 오라가 없습니다</div>';
    h += `<div class="grid">${list.map(a => this.auraCard(a, true)).join('')}</div>`;
    return h;
  },
  auraCard(a, showCount) {
    const s = G.s, c = this.auraCss(a);
    return `<button class="ac ${s.eq === a.id ? 'eq' : ''}" data-a="${a.id}" style="--c:${c}"><b class="${a.t === 9 ? 'prism' : ''}">${esc(a.n)}</b><small>1/${this.fmt(a.c)}</small>${showCount ? `<span class="cnt">x${this.fmt(s.inv[a.id])}</span>` : ''}${a.ev && s.eq !== a.id ? '<span class="ev">✦</span>' : ''}</button>`;
  },
  bind_bag(b) {
    b.querySelectorAll('[data-sub]').forEach(x => x.onclick = () => { this.sub.bag = x.dataset.sub; AU.click(); this.renderDrawer(); });
    b.querySelectorAll('[data-f]').forEach(x => x.onclick = () => { this.bagFilter = +x.dataset.f; AU.click(); this.renderDrawer(true); });
    b.querySelectorAll('[data-a]').forEach(x => x.onclick = () => { AU.click(); this.auraDetail(+x.dataset.a); });
    b.querySelectorAll('[data-use]').forEach(x => x.onclick = () => {
      if (G.usePotion(x.dataset.use)) { AU.craft(); this.toast(`<i>🧪</i><span>${POTION_BY_ID[x.dataset.use].n} 사용</span>`); } else AU.error();
    });
    const so = $('bagSort');
    if (so) { so.value = this.bagSort; so.onchange = () => { this.bagSort = so.value; this.renderDrawer(true); }; }
    const bd = $('bulkDis');
    if (bd) bd.onclick = () => {
      let n = 0, val = 0;
      AURAS.forEach(a => { if (a.t <= 2 && G.s.inv[a.id] > 1) { n += G.s.inv[a.id] - 1; val += (G.s.inv[a.id] - 1) * G.dismantleValue(a); } });
      if (!n) { this.toast('<i>✦</i><span>분해할 중복 오라가 없습니다</span>'); return; }
      this.confirm('일괄 분해', `성진·혜성 등급 중복 오라 <b>${this.fmt(n)}개</b>를 분해합니다.<br>각 오라는 1개씩 남고, 별가루 <b style="color:var(--gold)">+${this.fmt(val)}</b>을 얻습니다.<br><small>※ 장비 제작 재료로 쓰일 수 있습니다.</small>`, '분해', 'danger', () => {
        const g = G.dismantleTiers(2);
        AU.craft();
        this.toast(`<i>✦</i><span>별가루 +${this.fmt(g)}</span>`);
      });
    };
  },

  /* 제작 */
  tab_craft() {
    const s = G.s, sub = this.sub.craft;
    let h = `<div class="seg"><button data-sub="gear" class="${sub === 'gear' ? 'on' : ''}">장비</button><button data-sub="pot" class="${sub === 'pot' ? 'on' : ''}">포션</button></div>`;
    if (sub === 'gear') {
      for (const slot of ['glove', 'neck']) {
        const def = GEAR[slot], cur = s.gear[slot], next = G.gearNext(slot);
        const curT = cur ? def.tiers[cur] : null;
        h += `<div class="card"><div class="gear-h"><h4 style="color:${cur ? GEAR_TIER_COLOR[cur] : 'var(--sub)'}">${curT ? curT.n : def.name + ' 없음'}</h4><div class="gear-lv">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= cur ? 'on' : ''}" style="--c:${GEAR_TIER_COLOR[i]}"></i>`).join('')}</div></div>`;
        if (curT) h += `<div class="statline">${this.gearStatText(curT)}</div>${curT.perk ? `<div class="perk">✦ ${curT.perk}</div>` : ''}`;
        if (next) {
          h += `<div class="sec" style="margin:14px 0 8px">다음 · <span style="color:${GEAR_TIER_COLOR[cur + 1]}">${next.n}</span></div><p style="color:var(--green);font-size:13px">${this.gearStatText(next)}${next.perk ? ` · <span style="color:var(--gold)">${next.perk}</span>` : ''}</p><div class="mats">`;
          for (const id in next.mats) {
            const a = AURA_BY_ID[id], have = G.spare(+id), need = next.mats[id];
            const known = !!s.codex[id];
            h += `<div class="mat ${have >= need ? 'ok' : 'no'}" style="--c:${known ? this.auraCss(a) : 'var(--sub)'}"><span>${known ? esc(a.n) : '??? (' + TIERS[a.t].name + ')'}</span><b>${this.fmt(have)} / ${need}</b></div>`;
          }
          h += `<div class="mat ${s.dust >= next.dust ? 'ok' : 'no'}"><span>별가루</span><b>${this.fmt(s.dust)} / ${this.fmt(next.dust)}</b></div></div>`;
          h += `<button class="btn full" data-craft="${slot}" ${G.canCraftGear(slot) ? '' : 'disabled'}>${cur ? '강화' : '제작'}</button>`;
        } else h += '<p style="margin-top:8px;color:var(--gold)">✦ 최고 티어 달성</p>';
        h += '</div>';
      }
      h += '<p style="font-size:12px;color:var(--sub);margin-top:6px">※ 장착 중인 오라 1개는 재료로 쓰이지 않습니다.</p>';
    } else {
      for (const p of POTIONS.filter(p => p.recipe)) {
        const r = p.recipe;
        let need;
        if (r.tier) need = `${TIERS[r.tier].name} 등급 오라 ${r.count}개`;
        else need = r.tiers.map(t => `${TIERS[t].name} 등급 오라 1개`).join(' + ');
        h += `<div class="card"><div class="gear-h"><h4>${p.n}${s.pot[p.id] ? ` <span class="tag">보유 ${s.pot[p.id]}</span>` : ''}</h4><span class="price ${s.dust >= r.dust ? '' : 'no'}"><i class="sd"></i>${this.fmt(r.dust)}</span></div><p>${p.desc}</p><p style="font-size:12px;margin-top:6px">재료: ${need} <small>(흔한 것부터 자동 선택)</small></p><button class="btn full" style="margin-top:10px" data-cp="${p.id}" ${G.canCraftPotion(p.id) ? '' : 'disabled'}>제작</button></div>`;
      }
    }
    return h;
  },
  gearStatText(g) {
    const t = [];
    if (g.luck) t.push(`운 +${g.luck}`);
    if (g.speed) t.push(`속도 +${Math.round(g.speed * 100)}%`);
    return t.join(' · ');
  },
  bind_craft(b) {
    b.querySelectorAll('[data-sub]').forEach(x => x.onclick = () => { this.sub.craft = x.dataset.sub; AU.click(); this.renderDrawer(); });
    b.querySelectorAll('[data-craft]').forEach(x => x.onclick = () => {
      const slot = x.dataset.craft;
      if (G.craftGear(slot)) {
        AU.craft();
        const g = GEAR[slot].tiers[G.s.gear[slot]];
        this.banner(`${g.n} 완성!`, this.gearStatText(g), GEAR_TIER_COLOR[G.s.gear[slot]]);
      } else AU.error();
    });
    b.querySelectorAll('[data-cp]').forEach(x => x.onclick = () => {
      if (G.craftPotion(x.dataset.cp)) { AU.craft(); this.toast(`<i>🧪</i><span>${POTION_BY_ID[x.dataset.cp].n} 제작 완료</span>`); } else AU.error();
    });
  },

  /* 상점 */
  tab_shop() {
    const s = G.s;
    let h = `<p style="font-size:13px;color:var(--sub);margin-bottom:14px">별가루로 포션을 구매합니다. 같은 포션은 시간이 누적되고(최대 60분), 운·속도 포션은 각각 가장 높은 효과 하나만 적용됩니다.</p>`;
    for (const p of POTIONS.filter(p => p.price)) {
      const can = s.dust >= p.price;
      h += `<div class="card"><div class="gear-h"><h4>${p.n}${s.pot[p.id] ? ` <span class="tag">보유 ${s.pot[p.id]}</span>` : ''}</h4><span class="price ${can ? '' : 'no'}"><i class="sd"></i>${this.fmt(p.price)}</span></div><p>${p.desc}${s.eff[p.id] ? ` · <span style="color:var(--green)">적용 중 ${this.time(s.eff[p.id])}</span>` : ''}</p>
        <div style="display:flex;gap:8px;margin-top:10px"><button class="btn sm" style="flex:1" data-buy="${p.id}" ${can ? '' : 'disabled'}>구매</button><button class="btn sub sm" style="flex:1" data-use="${p.id}" ${s.pot[p.id] ? '' : 'disabled'}>사용</button></div></div>`;
    }
    h += `<div class="sec">제작 전용</div><p style="font-size:13px;color:var(--sub)">운 포션 III · 천체의 정수 · 운명의 별은 <b>제작 → 포션</b>에서 만들 수 있습니다.</p>`;
    return h;
  },
  bind_shop(b) {
    b.querySelectorAll('[data-buy]').forEach(x => x.onclick = () => { if (G.buyPotion(x.dataset.buy)) AU.click(); else AU.error(); });
    b.querySelectorAll('[data-use]').forEach(x => x.onclick = () => {
      if (G.usePotion(x.dataset.use)) { AU.craft(); this.toast(`<i>🧪</i><span>${POTION_BY_ID[x.dataset.use].n} 사용</span>`); } else AU.error();
    });
  },

  /* 도감 */
  tab_codex() {
    const s = G.s, n = codexCount(s);
    let h = `<div class="prog"><span>완성도</span><div class="bar"><i style="width:${n / 60 * 100}%"></i></div><b>${n}/60</b></div>`;
    for (let t = 1; t <= 9; t++) {
      const list = AURAS.filter(a => a.t === t && !a.ev);
      const got = list.filter(a => s.codex[a.id]).length;
      h += `<div class="sec" style="color:${t === 9 ? '#ff9ff0' : TIERS[t].color}">${TIERS[t].name} · ${got}/${list.length}</div><div class="grid">${list.map(a => this.codexCard(a)).join('')}</div>`;
    }
    const evl = AURAS.filter(a => a.ev);
    h += `<div class="sec" style="color:var(--gold)">이벤트 전용 · ${evl.filter(a => s.codex[a.id]).length}/8</div><div class="grid">${evl.map(a => this.codexCard(a)).join('')}</div>`;
    return h;
  },
  codexCard(a) {
    const s = G.s;
    if (!s.codex[a.id]) {
      return `<div class="ac lock" style="--c:${this.auraCss(a)};border-color:color-mix(in srgb, ${this.auraCss(a)} 25%, transparent)"><b>???</b><small>1/???</small>${a.ev ? `<span class="ev" style="color:${EVENTS[a.ev].col}">${EVENTS[a.ev].name}</span>` : ''}</div>`;
    }
    return this.auraCard(a, false);
  },
  bind_codex(b) { b.querySelectorAll('[data-a]').forEach(x => x.onclick = () => { AU.click(); this.auraDetail(+x.dataset.a); }); },

  /* 업적 */
  tab_ach() {
    const s = G.s, titles = G.titles();
    const done = ACHS.filter(a => s.ach[a.id]).length;
    let h = `<div class="prog"><span>달성</span><div class="bar"><i style="width:${done / ACHS.length * 100}%"></i></div><b>${done}/${ACHS.length}</b></div>`;
    h += `<div class="set" style="border:0;padding-top:0"><span>칭호<small>이름표 위에 표시됩니다</small></span><select id="titleSel"><option value="">없음</option>${titles.map(t => `<option ${s.title === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
    h += `<div class="row" style="margin-bottom:10px"><span>업적 보너스 운</span><b style="color:var(--green)">+${s.achLuck.toFixed(2)}</b></div>`;
    for (const a of ACHS) {
      const ok = !!s.ach[a.id];
      const r = a.r, rw = [];
      if (r.dust) rw.push('✦ ' + this.fmt(r.dust));
      if (r.luck) rw.push('운 +' + r.luck);
      if (r.core) rw.push('성핵 +' + r.core);
      if (r.title) rw.push('「' + r.title + '」');
      h += `<div class="ach ${ok ? 'done' : ''}"><div class="ico">${ok ? '★' : '☆'}</div><div class="bd"><b>${esc(a.n)}</b><small>${ok && a.hd ? a.hd : a.d}</small></div><div class="rw">${ok || !a.hd ? rw.join('<br>') : '???'}</div></div>`;
    }
    return h;
  },
  bind_ach() {
    const sel = $('titleSel');
    if (sel) sel.onchange = () => { G.s.title = sel.value || null; this.updatePlate(); };
  },

  /* 환생 */
  tab_pres() {
    const s = G.s, req = G.prestigeReq(), gain = G.prestigeGain();
    let h = `<div class="card core-big"><b>${s.core}</b><small>보유 성핵</small></div>`;
    h += `<div class="card"><h4>환생 조건</h4>
      <div class="req ${req.rolls ? 'ok' : 'no'}">${req.rolls ? '✔' : '○'} 이번 회차 롤 10,000회 <span style="margin-left:auto;font-family:var(--num);font-size:12px">${this.fmt(s.st.run)}/10,000</span></div>
      <div class="req ${req.rare ? 'ok' : 'no'}">${req.rare ? '✔' : '○'} 항성 등급 이상 오라 보유</div>
      <div class="sep"></div>
      <p>예상 획득 성핵: <b style="color:#ff9ff0;font-family:var(--num)">+${gain}</b></p>
      <p style="font-size:12px;margin-top:6px">초기화: 별가루 · 인벤토리 · 장비${G.treeLv('keep') ? '(1티어 유지)' : ''} · 포션 · 회차 롤<br>유지: 도감 · 업적 · 칭호 · 성핵 트리 · 설정</p>
      <button class="btn gold full" style="margin-top:12px" id="doPres" ${req.ok ? '' : 'disabled'}>환생하기</button></div>`;
    h += `<div class="sec">성핵 트리</div>`;
    for (const n of TREE) {
      const lv = G.treeLv(n.id), max = lv >= n.max, cost = max ? 0 : n.cost(lv);
      h += `<div class="card node"><div class="bd"><h4>${n.n} <span class="tag">Lv ${lv}/${n.max}</span></h4><p>${n.desc(lv)}${!max && n.max > 1 ? ` → <span style="color:var(--green)">${n.desc(lv + 1)}</span>` : ''}</p><div class="pips">${Array.from({ length: n.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>
        ${max ? '<span class="tag" style="color:var(--gold)">MAX</span>' : `<button class="btn sm" data-tree="${n.id}" ${s.core >= cost ? '' : 'disabled'}>✧ ${cost}</button>`}</div>`;
    }
    return h;
  },
  bind_pres(b) {
    const dp = $('doPres');
    if (dp) dp.onclick = () => this.confirm('환생', `정말 환생할까요?<br>성핵 <b style="color:#ff9ff0">+${G.prestigeGain()}</b>을 얻고 진행 상황 일부가 초기화됩니다.`, '환생', 'gold', () => this.doPrestige());
    b.querySelectorAll('[data-tree]').forEach(x => x.onclick = () => { if (G.buyTree(x.dataset.tree)) AU.craft(); else AU.error(); });
  },
  doPrestige() {
    this.setAuto(false);
    const gain = G.prestige();
    if (gain === false) return;
    R.main.setAura(AURA_BY_ID[1]);
    this.updatePlate();
    this.renderLog();
    $('slotText').textContent = '';
    AU.boom(.4); AU.shimmer(.3);
    Cut.start({ t: 5, c1: '#ff9ff0', c2: '#ffffff', fx: [], n: '' }, () => {
      this.banner('환생 완료', `성핵 +${gain}`, '#ff9ff0');
    });
    G.save();
    this.markDirty();
  },

  /* 설정 */
  tab_set() {
    const st = G.s.set;
    const sl = (k, l) => `<div class="set"><span>${l}</span><input type="range" min="0" max="100" value="${Math.round(st[k] * 100)}" data-vol="${k}"></div>`;
    const tierOpts = (sel, from, to) => { let o = ''; for (let t = from; t <= to; t++) o += `<option value="${t}" ${sel === t ? 'selected' : ''}>${TIERS[t].name}</option>`; return o; };
    return `<div class="sec">사운드</div>${sl('mv', '전체 음량')}${sl('bgm', '배경음악')}${sl('sfx', '효과음')}
      <div class="set"><span>음소거</span><button class="tog ${st.mute ? 'on' : ''}" data-tog="mute"></button></div>
      <div class="sec">플레이</div>
      <div class="set"><span>컷신 생략 기준<small>선택한 등급 이하 컷신 생략 · 펄서 이상은 항상 재생</small></span><select data-sel="skip">${tierOpts(st.skip, 2, 5)}</select></div>
      <div class="set"><span>자동 롤 정지 기준<small>이 등급 이상 획득 시 자동 롤 정지</small></span><select data-sel="autoStop">${tierOpts(st.autoStop, 3, 9)}</select></div>
      <div class="set"><span>더 희귀한 오라 자동 장착</span><button class="tog ${st.autoEquip !== false ? 'on' : ''}" data-tog="autoEquip"></button></div>
      <div class="set"><span>숫자 표기</span><select data-sel="num"><option value="ko" ${st.num === 'ko' ? 'selected' : ''}>120만</option><option value="en" ${st.num === 'en' ? 'selected' : ''}>1.2M</option></select></div>
      <div class="sec">그래픽</div>
      <div class="set"><span>그래픽 품질<small>현재: ${{ high: '높음', mid: '중간', low: '낮음' }[R.level]}</small></span><select data-sel="gfx"><option value="auto" ${st.gfx === 'auto' ? 'selected' : ''}>자동</option><option value="high" ${st.gfx === 'high' ? 'selected' : ''}>높음</option><option value="mid" ${st.gfx === 'mid' ? 'selected' : ''}>중간</option><option value="low" ${st.gfx === 'low' ? 'selected' : ''}>낮음</option></select></div>
      <div class="set"><span>깜빡임 줄이기<small>섬광 효과를 약하게 표시합니다</small></span><button class="tog ${st.calm ? 'on' : ''}" data-tog="calm"></button></div>
      <div class="sec">데이터</div>
      <div class="row"><span>플레이 시간</span><b>${Math.floor(G.s.st.play / 3600)}시간 ${Math.floor(G.s.st.play % 3600 / 60)}분</b></div>
      <p style="font-size:12px;color:var(--sub);margin:8px 0 12px">진행 상황은 이 브라우저에 자동 저장됩니다 (10초마다).</p>
      <button class="btn danger full" id="wipe">데이터 초기화</button>
      <p style="text-align:center;font-size:11px;color:var(--sub);margin-top:24px;font-family:var(--num)">GRD'S RNG v1.0</p>`;
  },
  bind_set(b) {
    b.querySelectorAll('[data-vol]').forEach(x => x.oninput = () => { G.s.set[x.dataset.vol] = x.value / 100; AU.applyVolume(); });
    b.querySelectorAll('[data-tog]').forEach(x => x.onclick = () => {
      const k = x.dataset.tog;
      G.s.set[k] = k === 'autoEquip' ? G.s.set[k] === false : !G.s.set[k];
      x.classList.toggle('on', k === 'autoEquip' ? G.s.set[k] !== false : G.s.set[k]);
      AU.click();
      if (k === 'mute') { AU.applyVolume(); this.updateMuteIcon(); }
    });
    b.querySelectorAll('[data-sel]').forEach(x => x.onchange = () => {
      const k = x.dataset.sel;
      G.s.set[k] = (k === 'num' || k === 'gfx') ? x.value : +x.value;
      if (k === 'gfx') { R.applyQuality(); this.layoutHUD(); this.renderDrawer(true); }
      if (k === 'num') this.hud(true);
    });
    $('wipe').onclick = () => {
      this.modal('데이터 초기화', '<p>모든 진행 상황(도감·업적·성핵 포함)이 영구 삭제됩니다.<br>계속하려면 아래에 <b>초기화</b>를 입력하세요.</p><input type="text" id="wipeIn" placeholder="초기화" autocomplete="off">', [['취소', 'sub'], ['삭제', 'danger', () => {
        if ($('wipeIn').value.trim() !== '초기화') { AU.error(); return false; }
        G.wipe();
        location.reload();
      }]]);
    };
  }
};
