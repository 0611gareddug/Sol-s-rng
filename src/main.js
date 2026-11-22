/* ============================================================
 * 진입점 — 초기화 · 메인 루프 · 자동 저장 · 탭 비활성 처리
 * ============================================================ */

(function boot() {
  G.load();
  R.init($('cv'));
  R.main.setAura(AURA_BY_ID[G.s.eq] || AURA_BY_ID[1]);
  UI.init();
  // 자동 롤 상태는 새로고침 시 꺼짐 (의도치 않은 진행 방지)
  G.s.auto = false;

  let last = performance.now(), saveT = 0, hiddenAt = 0;
  function loop(now) {
    const dt = Math.min(.1, Math.max(0, (now - last) / 1000));
    last = now;
    G.tick(dt);
    AU.update(dt);
    UI.frame(dt);
    R.frame(dt);
    saveT += dt;
    if (saveT >= 10) { saveT = 0; G.save(); }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(t => { last = t; requestAnimationFrame(loop); });

  // 화면 크기 변경
  let rz = 0;
  const onResize = () => { cancelAnimationFrame(rz); rz = requestAnimationFrame(() => { R.resize(); UI.layoutHUD(); }); };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', () => setTimeout(onResize, 200));

  // 탭 숨김: 저장 → 복귀 시 자동 롤 최대 1분치 일괄 처리
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
      G.save();
      if (AU.ctx && AU.ctx.state === 'running') AU.ctx.suspend();
      return;
    }
    if (AU.ctx && AU.ctx.state === 'suspended' && $('start').classList.contains('out')) AU.ctx.resume();
    last = performance.now();
    if (!hiddenAt) return;
    const away = Math.min(60, (Date.now() - hiddenAt) / 1000);
    hiddenAt = 0;
    if (!UI.autoRoll || UI.rolling || Cut.on || away < 2) return;
    const n = Math.floor(away / G.rollTime());
    if (n <= 0) return;
    let best = null, dust = G.s.dust, stopped = false;
    for (let i = 0; i < n; i++) {
      const r = G.roll();
      G.applyRoll(r, true);
      if (!best || r.a.c > best.c) best = r.a;
      if (r.a.t >= G.s.set.autoStop) { stopped = true; break; }
    }
    G.tick(away);
    UI.renderLog();
    if (best && best.c > AURA_BY_ID[G.s.eq].c && G.s.set.autoEquip !== false) G.equip(best.id);
    if (stopped) UI.setAuto(false);
    UI.toast(`<i>🌙</i><span>자리를 비운 동안 롤 진행<br><small>최고: <b style="color:${UI.auraCss(best)}">${esc(best.n)}</b> · 별가루 +${UI.fmt(G.s.dust - dust)}</small></span>`, '', 4500);
    UI.markDirty();
  });
  window.addEventListener('pagehide', () => G.save());
  window.addEventListener('beforeunload', () => G.save());

  // 시작 화면 (오디오 시작은 사용자 입력이 필요)
  const start = $('start');
  const go = e => {
    if (start.classList.contains('out')) return;
    if (e) e.preventDefault();
    AU.init();
    start.classList.add('out');
    setTimeout(() => start.remove && start.style.setProperty('display', 'none'), 900);
    UI.banner('GRD\'S RNG에 오신 것을 환영합니다', G.s.st.total ? `총 ${UI.fmt(G.s.st.total)}회 롤 · 도감 ${codexCount(G.s)}/60` : 'ROLL 버튼을 눌러 첫 오라를 뽑아보세요', '#8AB4FF');
  };
  start.addEventListener('pointerdown', go);
  document.addEventListener('keydown', e => { if (!start.classList.contains('out') && (e.code === 'Space' || e.code === 'Enter')) go(e); });

  // 더블탭 확대 방지 (iOS)
  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouch < 300 && e.target.closest && !e.target.closest('input,select')) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());

  if (typeof __DEV__ !== 'undefined' && __DEV__) window.__grd = { G, R, UI, Cut, AURA_BY_ID, AU };
})();
