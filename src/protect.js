/* ============================================================
 * 소스 보호 — 우클릭 · 개발자도구 단축키 · 선택/드래그 차단 + 개발자도구 감지
 * (클라이언트 웹 특성상 완벽한 차단은 불가능하며, 분석을 어렵게 만드는 수준)
 * ============================================================ */
(function protect() {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return;
  const stop = e => { e.preventDefault(); e.stopPropagation(); return false; };
  document.addEventListener('contextmenu', stop, true);
  document.addEventListener('dragstart', stop, true);
  document.addEventListener('selectstart', e => { if (!e.target.closest || !e.target.closest('input')) stop(e); }, true);
  document.addEventListener('copy', stop, true);
  document.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase(), c = e.ctrlKey || e.metaKey;
    if (e.key === 'F12' ||
      (c && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||
      (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(k)) ||
      (c && ['u', 's', 'p'].includes(k))) {
      return stop(e);
    }
  }, true);
  // 개발자도구 도킹 감지 (창 크기 차이 기반, 터치 기기 제외)
  const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  if (touch) return;
  const guard = () => document.getElementById('guard');
  let base = null;
  const rebase = () => { base = { w: window.outerWidth - window.innerWidth, h: window.outerHeight - window.innerHeight, d: window.devicePixelRatio }; };
  rebase();
  setInterval(() => {
    if (window.devicePixelRatio !== base.d) rebase(); // 브라우저 확대/축소 시 오탐 방지
    const dw = window.outerWidth - window.innerWidth - base.w;
    const dh = window.outerHeight - window.innerHeight - base.h;
    const open = (dw > 160 || dh > 160) && document.hasFocus();
    const g = guard();
    if (g) g.classList.toggle('on', open);
  }, 1000);
})();
