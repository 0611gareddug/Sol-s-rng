/* ============================================================
 * GRD'S RNG — 게임 데이터 (등급 · 오라 · 이벤트 · 포션 · 장비 · 업적 · 성핵 트리)
 * ============================================================ */

const TIERS = [
  null,
  { id: 1, name: '성진',   color: '#C9CFE0', glow: 0.15 },
  { id: 2, name: '혜성',   color: '#5FE3F0', glow: 0.25 },
  { id: 3, name: '성운',   color: '#A77BFF', glow: 0.35 },
  { id: 4, name: '항성',   color: '#FFD25E', glow: 0.45 },
  { id: 5, name: '초신성', color: '#FF6A3D', glow: 0.55 },
  { id: 6, name: '펄서',   color: '#3D8BFF', glow: 0.65 },
  { id: 7, name: '퀘이사', color: '#FF3DCB', glow: 0.75 },
  { id: 8, name: '특이점', color: '#FFFFFF', glow: 0.85 },
  { id: 9, name: '기원',   color: 'prism',   glow: 1.0 }
];

/* 오라 정의
 * id, n(이름), t(등급), c(확률 분모), d(설명), ev(이벤트 전용 id), c1/c2(색), fx(시각 효과 목록)
 * fx: [종류, 파라미터] — render.js 의 FX 함수가 그린다. 길이 단위 U = 더미 높이/4
 */
const AURAS = [
  // ── 성진 ──
  { id: 1, n: '먼지별', t: 1, c: 1, d: '모든 별은 먼지에서 시작된다.', c1: '#C9CFE0', c2: '#8D95B8',
    fx: [['emit', { type: 'rise', rate: 4, size: 1.2, life: 3, spd: .25 }]] },
  { id: 2, n: '희미한 빛', t: 1, c: 2, d: '겨우 보일 만큼의 빛.', c1: '#FFFFFF', c2: '#C9D6FF',
    fx: [['glow', { r: 1.6, a: .28 }], ['emit', { type: 'rise', rate: 3, size: 1, life: 2.5, spd: .2 }]] },
  { id: 3, n: '새벽별', t: 1, c: 4, d: '밤과 아침 사이에서 깜빡인다.', c1: '#BFE4FF', c2: '#7FB8FF',
    fx: [['glow', { r: 1.4, a: .2 }], ['orbit', { n: 3, rx: .7, ry: .18, y: -1.95, spd: .8, size: 2.4, twinkle: 1 }]] },
  { id: 4, n: '별가루 바람', t: 1, c: 8, d: '우주에도 바람이 분다.', c1: '#E3E8F5', c2: '#9FB0D8',
    fx: [['emit', { type: 'drift', rate: 18, size: 1.3, life: 2.2, spd: 1.1 }]] },
  { id: 5, n: '은하수 조각', t: 1, c: 12, d: '하늘의 강에서 떨어져 나온 조각.', c1: '#D8DEFF', c2: '#8B8FD8',
    fx: [['glow', { r: 1.5, a: .18 }], ['band', { y: .25, rx: 1.15, ry: .3, w: .32, a: .35, dots: 40, spd: .35 }]] },
  { id: 6, n: '반딧성', t: 1, c: 18, d: '반딧불처럼 깜빡이는 작은 별.', c1: '#C8FF7A', c2: '#7BD94A',
    fx: [['glow', { r: 1.4, a: .15 }], ['emit', { type: 'firefly', rate: 10, size: 2.8, life: 3.5, spd: .25, spread: 1.6 }]] },
  { id: 7, n: '달무리', t: 1, c: 25, d: '달빛이 만든 둥근 테.', c1: '#E8ECF8', c2: '#9AA6C8',
    fx: [['halo', { r: .62, y: -1.55, w: 3, a: .8 }], ['glow', { r: 1, y: -1.5, a: .2 }]] },
  { id: 8, n: '차가운 운석', t: 1, c: 40, d: '손이 시릴 만큼 차갑다.', c1: '#9FD8FF', c2: '#4E8FCF',
    fx: [['glow', { r: 1.4, a: .16 }], ['orbit', { n: 3, rx: 1.15, ry: .35, y: 0, spd: .6, size: 4, shape: 'shard', tilt: -.2 }]] },
  { id: 9, n: '별똥', t: 1, c: 60, d: '소원을 빌 시간은 1초.', c1: '#FFFFFF', c2: '#FFE7A8',
    fx: [['emit', { type: 'fall', rate: 3.5, size: 1.8, life: .9, spd: 4.5, tail: 1 }], ['glow', { r: 1.3, a: .15 }]] },
  { id: 10, n: '첫 번째 궤도', t: 1, c: 85, d: '무언가가 처음으로 돌기 시작했다.', c1: '#FFFFFF', c2: '#AFC4FF',
    fx: [['ring', { rx: 1.2, ry: .32, y: .05, w: 1.2, a: .7, tilt: -.15 }], ['orbit', { n: 1, rx: 1.2, ry: .32, y: .05, spd: 1.1, size: 3, tilt: -.15, tail: 1 }]] },

  // ── 혜성 ──
  { id: 11, n: '푸른 혜성꼬리', t: 2, c: 120, d: '지나간 자리에 푸른 길이 남는다.', c1: '#5FE3F0', c2: '#2A8CFF',
    fx: [['glow', { r: 1.7, a: .25 }], ['orbit', { n: 1, rx: 1.45, ry: .55, y: -.2, spd: 1.2, size: 5, tail: 3, tilt: -.25 }], ['emit', { type: 'rise', rate: 5, size: 1.4, life: 2, spd: .3 }]] },
  { id: 12, n: '얼음 혜성', t: 2, c: 180, d: '태양에 닿기 전까진 녹지 않는다.', c1: '#D6F6FF', c2: '#6FCBFF',
    fx: [['glow', { r: 1.8, a: .3 }], ['emit', { type: 'crystal', rate: 7, size: 3, life: 2.6, spd: .35, spread: 1.4 }], ['orbit', { n: 1, rx: 1.3, ry: .4, y: -.4, spd: .9, size: 4.5, tail: 2, shape: 'shard' }]] },
  { id: 13, n: '소행성대', t: 2, c: 250, d: '부서진 행성의 잔해들.', c1: '#A89A8A', c2: '#6F6A66',
    fx: [['glow', { r: 1.5, a: .15 }], ['orbit', { n: 14, rx: 1.4, ry: .36, y: .15, spd: .35, size: 3.4, shape: 'rock', jitter: 1, tilt: .12 }]] },
  { id: 14, n: '오로라 커튼', t: 2, c: 333, d: '하늘이 춤추는 밤.', c1: '#5CFFB0', c2: '#3FD0FF',
    fx: [['curtain', { w: 3.2, h: 3.2, y: -.6, n: 3, a: .38, spd: .6 }], ['glow', { r: 1.6, a: .2 }]] },
  { id: 15, n: '태양풍', t: 2, c: 450, d: '별이 내쉬는 숨.', c1: '#FFE36B', c2: '#FF9F3D',
    fx: [['glow', { r: 1.6, a: .25 }], ['emit', { type: 'stream', rate: 40, size: 1.4, life: 1.4, spd: 2.6 }]] },
  { id: 16, n: '행성의 고리', t: 2, c: 600, d: '가장 우아한 장신구.', c1: '#E8D8B5', c2: '#A99A86',
    fx: [['glow', { r: 1.6, a: .2 }], ['ring', { rx: 1.5, ry: .36, y: .1, w: 5, a: .55, tilt: -.28 }], ['ring', { rx: 1.78, ry: .43, y: .1, w: 2.5, a: .4, tilt: -.28 }]] },
  { id: 17, n: '위성의 노래', t: 2, c: 750, d: '달들이 서로를 부른다.', c1: '#D5E2FF', c2: '#8FA8FF',
    fx: [['glow', { r: 1.6, a: .22 }], ['orbit', { n: 1, rx: 1.3, ry: .4, y: -.3, spd: .9, size: 6, moon: 1 }], ['orbit', { n: 1, rx: 1.1, ry: .3, y: .3, spd: -1.2, size: 4.5, moon: 1 }], ['shock', { period: 1.8, max: 2.2, w: 1.5, a: .35 }]] },
  { id: 18, n: '붉은 사막먼지', t: 2, c: 850, d: '붉은 행성의 모래폭풍.', c1: '#FF7A4D', c2: '#B8442A',
    fx: [['glow', { r: 1.7, a: .22 }], ['vortex', { r: 1.6, n: 70, spd: 1.4, size: 1.6, a: .8 }]] },
  { id: 19, n: '돌아온 혜성', t: 2, c: 999, d: '76년 만의 재회.', c1: '#9FF3FF', c2: '#FFFFFF',
    fx: [['glow', { r: 1.8, a: .28 }], ['orbit', { n: 1, rx: 3.2, ry: .9, y: -1.4, spd: .55, size: 7, tail: 5, tilt: -.1 }], ['emit', { type: 'rise', rate: 6, size: 1.4, life: 2, spd: .3 }]] },

  // ── 성운 ──
  { id: 20, n: '장미 성운', t: 3, c: 1200, d: '우주에 핀 꽃.', c1: '#FF7FB8', c2: '#C2407F',
    fx: [['glow', { r: 2, a: .35 }], ['petals', { n: 8, r: 1.6, spd: .15, a: .45, layers: 2 }], ['emit', { type: 'rise', rate: 6, size: 1.6, life: 2.5, spd: .3 }]] },
  { id: 21, n: '독수리의 날개', t: 3, c: 1800, d: '별을 낳는 기둥.', c1: '#C9A36B', c2: '#6B4E8F',
    fx: [['glow', { r: 1.9, a: .3 }], ['wings', { span: 2.4, h: 2.6, a: .55, spd: .9 }], ['emit', { type: 'spark', rate: 6, size: 1.6, life: 1.6, spd: .5, spread: 2.2 }]] },
  { id: 22, n: '보랏빛 가스구름', t: 3, c: 2500, d: '아직 이름 없는 별들의 재료.', c1: '#A77BFF', c2: '#5B3FD0',
    fx: [['cloud', { n: 9, r: 2.1, a: .2, spd: .3 }], ['glow', { r: 2, a: .3 }], ['emit', { type: 'spark', rate: 5, size: 1.4, life: 2, spd: .2, spread: 1.8 }]] },
  { id: 23, n: '오리온의 숨결', t: 3, c: 3300, d: '겨울 하늘의 사냥꾼이 숨을 고른다.', c1: '#9FC8FF', c2: '#FF9FD0',
    fx: [['glow', { r: 1.9, a: .3 }], ['const', { pts: [[-.55, -1.1], [.6, -1.05], [-.18, .02], [0, 0], [.18, -.02], [-.6, 1.2], [.65, 1.15], [-.1, .55]], lines: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [3, 7]], a: .9 }], ['cloud', { n: 4, r: 1.6, a: .12, spd: .2, y: .6 }]] },
  { id: 24, n: '쌍둥이 별', t: 3, c: 4500, d: '둘은 늘 함께 빛난다.', c1: '#FFE08A', c2: '#DCE6FF',
    fx: [['glow', { r: 1.9, a: .3 }], ['binary', { y: -2.1, r: .35, size: 5, spd: 2.2 }], ['emit', { type: 'rise', rate: 7, size: 1.4, life: 2, spd: .35 }]] },
  { id: 25, n: '별의 요람', t: 3, c: 6000, d: '새 별이 태어나는 곳.', c1: '#B98CFF', c2: '#FFB8F0',
    fx: [['glow', { r: 1.9, a: .3 }], ['disk', { y: 2.05, rx: 1.4, ry: .3, a: .55, spd: .6 }], ['emit', { type: 'rise', rate: 9, size: 2, life: 3, spd: .55, from: 'feet' }]] },
  { id: 26, n: '고양이눈', t: 3, c: 7777, d: '우주가 너를 보고 있다.', c1: '#5FFFD8', c2: '#FF6FB0',
    fx: [['glow', { r: 1.9, a: .32 }], ['rings', { n: 5, r: 1.8, a: .45, spd: .5, y: -.2 }], ['emit', { type: 'spark', rate: 5, size: 1.4, life: 1.8, spd: .3, spread: 1.5 }]] },
  { id: 27, n: '말머리 그림자', t: 3, c: 9500, d: '빛 속에 숨은 어둠.', c1: '#FF5A6E', c2: '#140A18',
    fx: [['glow', { r: 2.3, a: .45 }], ['silhouette', { a: .9 }], ['emit', { type: 'rise', rate: 6, size: 1.6, life: 2.4, spd: .3 }]] },

  // ── 항성 ──
  { id: 28, n: '적색 거성', t: 4, c: 12000, d: '늙었지만 가장 크다.', c1: '#FF5A3A', c2: '#FFB060',
    fx: [['sphere', { r: 1.75, y: -.3, a: .75, boil: 1 }], ['glow', { r: 2.6, a: .3 }], ['emit', { type: 'rise', rate: 8, size: 1.8, life: 2.2, spd: .4 }]] },
  { id: 29, n: '백색 왜성', t: 4, c: 20000, d: '작지만 꺼지지 않는다.', c1: '#FFFFFF', c2: '#B8D4FF',
    fx: [['glow', { r: 2, a: .3 }], ['core', { y: -.35, r: .2, rays: 8, len: 1.6, spd: .5 }], ['emit', { type: 'spark', rate: 10, size: 1.5, life: 1.2, spd: .9, from: 'core' }]] },
  { id: 30, n: '천랑의 빛', t: 4, c: 30000, d: '밤하늘에서 가장 밝은 별.', c1: '#D8ECFF', c2: '#7FB0FF',
    fx: [['glow', { r: 2.2, a: .35 }], ['cross', { y: -1.95, len: 2.6, w: 2, spd: 1.2 }], ['emit', { type: 'spark', rate: 8, size: 1.5, life: 1.5, spd: .4, spread: 2 }]] },
  { id: 31, n: '북극성', t: 4, c: 45000, d: '모든 것이 이 별을 중심으로 돈다.', c1: '#FFF4C8', c2: '#9FB8FF',
    fx: [['trails', { n: 34, r: 3.4, y: -2.3, spd: .25, a: .55 }], ['cross', { y: -2.3, len: 1.3, w: 1.5, spd: .4 }], ['glow', { r: 2, a: .25 }]] },
  { id: 32, n: '쌍성계 왈츠', t: 4, c: 60000, d: '중력으로 맺어진 춤.', c1: '#FF9A3D', c2: '#4FA3FF',
    fx: [['glow', { r: 2.1, a: .3 }], ['spiralpair', { r: 1.5, spd: 1.1, size: 9 }], ['emit', { type: 'spark', rate: 8, size: 1.5, life: 1.6, spd: .4, spread: 2 }]] },
  { id: 33, n: '황금 태양', t: 4, c: 77777, d: '따뜻함 그 자체.', c1: '#FFD25E', c2: '#FF8A2A',
    fx: [['rays', { n: 12, len: 3.2, w: .16, spd: .25, a: .38, y: -.3 }], ['sphere', { r: 1.1, y: -.3, a: .5, corona: 1 }], ['glow', { r: 2.5, a: .35 }], ['emit', { type: 'rise', rate: 10, size: 1.8, life: 2, spd: .45 }]] },
  { id: 34, n: '별자리 수호자', t: 4, c: 95000, d: '하늘의 지도를 지키는 자.', c1: '#FFE9A8', c2: '#8FB0FF',
    fx: [['glow', { r: 2.2, a: .3 }], ['zodiac', { n: 12, r: 2.35, spd: .12, a: .85 }], ['emit', { type: 'spark', rate: 6, size: 1.4, life: 2, spd: .25, spread: 2.2 }]] },

  // ── 초신성 ──
  { id: 35, n: '초신성 잔해', t: 5, c: 120000, d: '폭발은 끝이 아니었다.', c1: '#FF6A3D', c2: '#FFD07A',
    fx: [['glow', { r: 2.4, a: .38 }], ['shock', { period: 2.2, max: 3.4, w: 3, a: .7, debris: 1 }], ['shock', { period: 2.2, max: 2.6, w: 1.5, a: .5, off: .25 }], ['emit', { type: 'rise', rate: 12, size: 1.8, life: 2, spd: .5 }]] },
  { id: 36, n: '감마선 폭발', t: 5, c: 200000, d: '우주에서 가장 밝은 1초.', c1: '#E8FFE0', c2: '#6BFFB0',
    fx: [['jets', { len: 5.5, w: .14, a: .85, flick: 1 }], ['glow', { r: 2.2, a: .35 }], ['core', { y: 0, r: .18, rays: 0, len: 0, spd: 0 }], ['emit', { type: 'spark', rate: 14, size: 1.5, life: 1, spd: 1.4, from: 'core' }]] },
  { id: 37, n: '별의 최후', t: 5, c: 333333, d: '모든 별은 이렇게 끝난다.', c1: '#FFB04A', c2: '#FF3A2A',
    fx: [['collapse', { period: 3.2, r: 2.6 }], ['glow', { r: 2.3, a: .3 }]] },
  { id: 38, n: '게 성운', t: 5, c: 500000, d: '천 년 전의 폭발이 아직 퍼진다.', c1: '#FF9A4A', c2: '#5FB8FF',
    fx: [['filament', { n: 26, r: 2.4, a: .55, spd: .3 }], ['pulse', { y: 0, r: .25, period: .9, a: .9 }], ['glow', { r: 2.2, a: .3 }]] },
  { id: 39, n: '불타는 코로나', t: 5, c: 700000, d: '태양의 왕관이 불탄다.', c1: '#FF8A2A', c2: '#FFE36B',
    fx: [['glow', { r: 2.3, a: .4 }], ['flare', { n: 7, r: 1.5, a: .8, spd: 1 }], ['emit', { type: 'flame', rate: 30, size: 3, life: 1, spd: .8, spread: 1 }]] },
  { id: 40, n: '우주의 불꽃놀이', t: 5, c: 900000, d: '축제는 우주적 규모로.', c1: '#FF5AA8', c2: '#5AE8FF',
    fx: [['glow', { r: 2.2, a: .3 }], ['fireworks', { rate: 1.6, r: 2.6, size: 1.8 }], ['emit', { type: 'rise', rate: 8, size: 1.5, life: 2, spd: .4, col: 'mix' }]] },

  // ── 펄서 ──
  { id: 41, n: '맥동하는 심장', t: 6, c: 1200000, d: '우주의 심장 박동.', c1: '#3D8BFF', c2: '#B8E0FF',
    fx: [['glow', { r: 2.4, a: .4, beat: .8 }], ['pulse', { y: -.35, r: .3, period: .8, a: 1, ring: 1 }], ['shock', { period: .8, max: 2.8, w: 2.5, a: .55 }], ['emit', { type: 'spark', rate: 14, size: 1.6, life: 1.2, spd: 1, from: 'core' }]] },
  { id: 42, n: '자기장 폭풍', t: 6, c: 2000000, d: '지구를 1천 번 감을 자기장.', c1: '#6FB0FF', c2: '#E8F4FF',
    fx: [['glow', { r: 2.4, a: .35 }], ['field', { n: 7, r: 2.4, a: .55, spd: 1 }], ['bolts', { n: 2, r: 1.8, rate: 2.5 }], ['emit', { type: 'spark', rate: 10, size: 1.4, life: 1, spd: 1, spread: 1.6 }]] },
  { id: 43, n: '중성자 폭풍', t: 6, c: 3500000, d: '한 숟가락이 산 하나의 무게.', c1: '#9FC8FF', c2: '#3D5BFF',
    fx: [['glow', { r: 2.4, a: .38 }], ['vortex', { r: 2.2, n: 140, spd: 2.4, size: 1.6, a: .85 }], ['bolts', { n: 3, r: 2, rate: 3 }]] },
  { id: 44, n: '등대별', t: 6, c: 5555555, d: '길 잃은 자를 위한 빛.', c1: '#CFE4FF', c2: '#3D8BFF',
    fx: [['sweep', { n: 2, len: 9, spd: .9, a: .3, y: -1.55 }], ['core', { y: -1.55, r: .16, rays: 4, len: .9, spd: .9 }], ['glow', { r: 2.2, a: .3 }], ['emit', { type: 'spark', rate: 8, size: 1.4, life: 1.5, spd: .3, spread: 2 }]] },
  { id: 45, n: '시간의 박동', t: 6, c: 8000000, d: '우주의 가장 정확한 시계.', c1: '#7FD0FF', c2: '#FFE9A8',
    fx: [['glow', { r: 2.3, a: .35 }], ['clock', { r: 2.2, y: -.2, a: .75 }], ['emit', { type: 'spark', rate: 8, size: 1.4, life: 1.6, spd: .3, spread: 2 }]] },

  // ── 퀘이사 ──
  { id: 46, n: '은하핵', t: 7, c: 12000000, d: '수천억 개 별의 중심.', c1: '#FFCFF2', c2: '#8F6BFF',
    fx: [['galaxy', { arms: 4, r: 3.4, n: 420, spd: .22, y: -.2, a: .85 }], ['glow', { r: 2.6, a: .4 }], ['core', { y: -.2, r: .25, rays: 6, len: 1.4, spd: .3 }]] },
  { id: 47, n: '상대론적 제트', t: 7, c: 25000000, d: '빛의 속도에 가깝게.', c1: '#FF3DCB', c2: '#8FD8FF',
    fx: [['disk', { y: 0, rx: 1.9, ry: .42, a: .8, spd: 1.6, hot: 1 }], ['jets', { len: 7, w: .3, a: .8, knots: 1 }], ['glow', { r: 2.6, a: .4 }], ['emit', { type: 'jet', rate: 40, size: 1.8, life: 1.2, spd: 6 }]] },
  { id: 48, n: '블레이자', t: 7, c: 50000000, d: '정면으로 마주한 우주의 등불.', c1: '#FF3DCB', c2: '#FFFFFF',
    fx: [['blazar', { period: 3.5, a: .22 }], ['rays', { n: 16, len: 4.5, w: .1, spd: .5, a: .35, y: -.2 }], ['glow', { r: 2.8, a: .45, beat: 3.5 }], ['core', { y: -.2, r: .32, rays: 8, len: 2.4, spd: .2 }], ['emit', { type: 'spark', rate: 16, size: 1.8, life: 1.3, spd: 1.2, from: 'core' }]] },
  { id: 49, n: '우주 거미줄', t: 7, c: 77777777, d: '우주의 뼈대.', c1: '#FF8FE0', c2: '#8FB8FF',
    fx: [['web', { n: 46, a: .5, spd: .08 }], ['glow', { r: 2.5, a: .4 }], ['emit', { type: 'spark', rate: 10, size: 1.5, life: 2, spd: .3, spread: 2.5 }]] },

  // ── 특이점 ──
  { id: 50, n: '사건의 지평선', t: 8, c: 150000000, d: '여기서부터는 빛도 돌아오지 못한다.', c1: '#FFC27A', c2: '#FF6A2A',
    fx: [['hole', { r: 1.25, y: -.25, disk: 3.1, spd: 1 }], ['emit', { type: 'suck', rate: 50, size: 1.6, life: 1.6, spd: 1, r: 4.2 }]] },
  { id: 51, n: '화이트홀', t: 8, c: 500000000, d: '존재할 수 없는 것이 존재한다.', c1: '#FFFFFF', c2: '#BFD0FF',
    fx: [['whitehole', { r: 3.4 }], ['rays', { n: 24, len: 6, w: .07, spd: .3, a: .5, y: -.2, dark: 1 }], ['emit', { type: 'burstout', rate: 50, size: 1.8, life: 1.4, spd: 3, dark: 1 }]] },

  // ── 기원 ──
  { id: 52, n: '태초의 GRD', t: 9, c: 1000000000, d: '모든 것이 시작되기 전, 이미 그것이 있었다.', c1: 'prism', c2: '#FFFFFF', prism: 1,
    fx: [['rays', { n: 20, len: 7, w: .12, spd: .18, a: .4, y: -.2 }], ['mandala', { n: 3, r: 2.6, y: -.2, a: .75, spd: .2 }], ['bang', { period: 4.5 }], ['glow', { r: 3.2, a: .5 }], ['grd', { y: -2.75, a: 1 }], ['emit', { type: 'rise', rate: 26, size: 2, life: 2.4, spd: .6, col: 'rainbow' }], ['emit', { type: 'spark', rate: 14, size: 1.6, life: 1.6, spd: .8, spread: 2.4, col: 'rainbow' }]] },

  // ── 이벤트 전용 ──
  { id: 53, n: '유성의 낙인', t: 3, c: 5000, ev: 'meteor', d: '하늘에서 떨어진 별이 너를 골랐다.', c1: '#FFE9A8', c2: '#FF8A4D',
    fx: [['glow', { r: 1.9, a: .3 }], ['brand', { y: -.3, a: .9 }], ['emit', { type: 'fall', rate: 5, size: 1.8, life: 1, spd: 5, tail: 1 }]] },
  { id: 54, n: '별비의 왕관', t: 5, c: 250000, ev: 'meteor', d: '왕관에서 별비가 멈추지 않는다.', c1: '#FFE36B', c2: '#FFFFFF',
    fx: [['glow', { r: 2.3, a: .38 }], ['crown', { y: -2.35, n: 7, a: 1 }], ['emit', { type: 'rain', rate: 34, size: 1.6, life: 1.4, spd: 3 }]] },
  { id: 55, n: '폭풍의 눈', t: 3, c: 8000, ev: 'storm', d: '폭풍 한가운데는 고요하다.', c1: '#C08FFF', c2: '#FF7FD0',
    fx: [['cloud', { n: 6, r: 2.2, a: .14, spd: 1.2 }], ['vortex', { r: 2.4, n: 170, spd: 1.8, size: 2, a: .85, hollow: 1 }], ['rings', { n: 3, r: 2.3, a: .3, spd: 1.5, y: -.2 }], ['glow', { r: 1.4, a: .35 }]] },
  { id: 56, n: '성운 군주', t: 7, c: 20000000, ev: 'storm', d: '모든 성운이 그 앞에 고개를 숙인다.', c1: '#C08FFF', c2: '#5FE3F0',
    fx: [['cloud', { n: 12, r: 2.8, a: .22, spd: .4, rainbow: 1 }], ['cape', { a: .7 }], ['pillars', { n: 2, a: .5 }], ['glow', { r: 2.6, a: .42 }], ['emit', { type: 'rise', rate: 16, size: 1.8, life: 2.4, spd: .5, col: 'mix' }]] },
  { id: 57, n: '검은 태양', t: 4, c: 40000, ev: 'eclipse', d: '빛을 삼킨 태양.', c1: '#FFF4D8', c2: '#000000',
    fx: [['eclipse', { r: 1.05, y: -1.0, a: 1 }], ['emit', { type: 'spark', rate: 8, size: 1.4, life: 1.6, spd: .4, from: 'eclipse' }]] },
  { id: 58, n: '코로나의 눈', t: 6, c: 3000000, ev: 'eclipse', d: '어둠 속에서 눈을 뜬다.', c1: '#FFF4D8', c2: '#FFB04A',
    fx: [['eye', { r: 2, y: -.6, a: 1 }], ['glow', { r: 2.4, a: .3 }], ['emit', { type: 'spark', rate: 10, size: 1.4, life: 1.6, spd: .6, spread: 2 }]] },
  { id: 59, n: '일곱 행성의 문', t: 5, c: 600000, ev: 'align', d: '일곱이 줄지어 설 때 문이 열린다.', c1: '#FFD25E', c2: '#8FB8FF',
    fx: [['gate', { a: .9 }], ['planets', { n: 7, y: -2.55, w: 4.4 }], ['glow', { r: 2.3, a: .35 }], ['emit', { type: 'rise', rate: 12, size: 1.6, life: 2, spd: .4 }]] },
  { id: 60, n: '천구의 화음', t: 8, c: 300000000, ev: 'align', d: '천구들이 서로 다른 노래로 하나의 화음을 만든다.', c1: '#FFFFFF', c2: '#FFD25E',
    fx: [['spheres', { n: 6, r: 2.8, y: -.2, a: .6 }], ['shock', { period: 1.6, max: 3.6, w: 1.5, a: .4 }], ['glow', { r: 3, a: .45 }], ['emit', { type: 'spark', rate: 18, size: 1.6, life: 1.8, spd: .5, spread: 2.6, col: 'mix' }]] }
];

const AURA_BY_ID = {};
AURAS.forEach(a => { AURA_BY_ID[a.id] = a; });

/* ── 우주 이벤트 ── */
const EVENTS = {
  meteor:  { id: 'meteor',  name: '유성우',     w: 40, luck: 1.2, speed: 1,   dust: 1.5, boost: { 2: 2 },          col: '#FFE9A8', desc: '운 ×1.2 · 별가루 ×1.5 · 혜성 등급 확률 ×2' },
  storm:   { id: 'storm',   name: '성운 폭풍',  w: 35, luck: 1,   speed: 1.3, dust: 1,   boost: { 3: 3 },          col: '#C08FFF', desc: '속도 ×1.3 · 성운 등급 확률 ×3' },
  eclipse: { id: 'eclipse', name: '일식',       w: 20, luck: 1.5, speed: 1,   dust: 1,   boost: { 4: 1.5, 6: 1.5 }, col: '#FFB04A', desc: '운 ×1.5 · 항성·펄서 등급 확률 ×1.5' },
  align:   { id: 'align',   name: '행성 정렬',  w: 5,  luck: 3,   speed: 1,   dust: 1,   boost: {},                col: '#FFD25E', desc: '운 ×3' }
};

/* ── 포션 ── */
const POTIONS = [
  { id: 'luck1', n: '운 포션 I',   kind: 'luck',  mult: 1.5, dur: 180, price: 200,  desc: '운 ×1.5 · 3분' },
  { id: 'luck2', n: '운 포션 II',  kind: 'luck',  mult: 2,   dur: 300, price: 1500, desc: '운 ×2 · 5분' },
  { id: 'luck3', n: '운 포션 III', kind: 'luck',  mult: 3,   dur: 300, recipe: { tier: 3, count: 3, dust: 5000 }, desc: '운 ×3 · 5분' },
  { id: 'spd1',  n: '속도 포션 I', kind: 'speed', mult: 1.25, dur: 180, price: 150, desc: '속도 ×1.25 · 3분' },
  { id: 'spd2',  n: '속도 포션 II', kind: 'speed', mult: 1.5, dur: 300, price: 1200, desc: '속도 ×1.5 · 5분' },
  { id: 'ess',   n: '천체의 정수', kind: 'once', mult: 10,  recipe: { tier: 4, count: 1, dust: 20000 }, desc: '다음 1회 운 ×10' },
  { id: 'fate',  n: '운명의 별',   kind: 'once', mult: 100, recipe: { tiers: [5, 6], dust: 200000 }, desc: '다음 1회 운 ×100' }
];
const POTION_BY_ID = {};
POTIONS.forEach(p => { POTION_BY_ID[p.id] = p; });

/* ── 장비 ── */
const GEAR = {
  glove: {
    name: '장갑', slot: 'glove',
    tiers: [
      null,
      { n: '별빛 장갑',   luck: .1,  speed: 0,   mats: { 1: 50, 3: 20 }, dust: 500 },
      { n: '혜성 장갑',   luck: .25, speed: .05, mats: { 11: 5, 13: 3 }, dust: 2000 },
      { n: '성운 장갑',   luck: .5,  speed: .1,  mats: { 20: 2, 23: 1 }, dust: 10000 },
      { n: '항성 장갑',   luck: 1,   speed: .15, mats: { 28: 1, 31: 1 }, dust: 50000 },
      { n: '초신성 장갑', luck: 2,   speed: .2,  mats: { 35: 1, 36: 1 }, dust: 250000, perk: '별의 축복 배율 ×2 → ×3' }
    ]
  },
  neck: {
    name: '목걸이', slot: 'neck',
    tiers: [
      null,
      { n: '궤도 목걸이', luck: 0,   speed: .1,  mats: { 2: 40, 5: 15 }, dust: 400 },
      { n: '위성 목걸이', luck: .05, speed: .2,  mats: { 17: 3, 15: 5 }, dust: 1800 },
      { n: '성운 목걸이', luck: .1,  speed: .35, mats: { 22: 2, 24: 1 }, dust: 9000 },
      { n: '펄스 목걸이', luck: .2,  speed: .5,  mats: { 29: 1, 32: 1 }, dust: 45000 },
      { n: '시간의 목걸이', luck: .4, speed: .75, mats: { 39: 1, 41: 1 }, dust: 300000, perk: '자동 롤 중 별가루 +25%' }
    ]
  }
};
const GEAR_TIER_COLOR = [null, '#C9CFE0', '#5FE3F0', '#A77BFF', '#FFD25E', '#FF6A3D'];

/* ── 성핵 트리 ── */
const TREE = [
  { id: 'luck',   n: '별의 은총',   max: 10, cost: l => 1 + l,      desc: l => `운 +${l * 5}%` },
  { id: 'speed',  n: '가속 궤도',   max: 10, cost: l => 1 + l,      desc: l => `속도 +${l * 5}%` },
  { id: 'dust',   n: '별가루 연금', max: 10, cost: l => 1 + l,      desc: l => `별가루 +${l * 10}%` },
  { id: 'bless',  n: '축복 주기',   max: 4,  cost: l => 3 + l * 2,  desc: l => `축복 주기 ${10 - l}회` },
  { id: 'keep',   n: '기억된 손',   max: 1,  cost: () => 12,        desc: l => l ? '환생 시 장비 1티어 유지' : '환생 시 장비 1티어 유지 (미습득)' },
  { id: 'unlock', n: '즉시 해금',   max: 1,  cost: () => 4,         desc: l => l ? '자동·빠른 롤 즉시 해금' : '자동·빠른 롤 즉시 해금 (미습득)' },
  { id: 'magnet', n: '이벤트 자석', max: 3,  cost: l => 4 + l * 3,  desc: l => `이벤트 간격 −${l * 10}%` }
];

/* ── 업적 (30) ──
 * chk(s): 달성 여부 · r: 보상 {dust, luck, core, title}
 */
const ACHS = [
  { id: 'r100',   n: '첫걸음',         d: '총 100회 롤',        chk: s => s.st.total >= 100,      r: { dust: 300 } },
  { id: 'r1k',    n: '별 헤는 자',     d: '총 1,000회 롤',      chk: s => s.st.total >= 1000,     r: { dust: 2000, title: '별 헤는 자' } },
  { id: 'r10k',   n: '끈기의 궤도',    d: '총 10,000회 롤',     chk: s => s.st.total >= 1e4,      r: { dust: 20000, title: '끈기의 궤도' } },
  { id: 'r100k',  n: '무한 회전',      d: '총 100,000회 롤',    chk: s => s.st.total >= 1e5,      r: { dust: 200000, title: '무한 회전' } },
  { id: 'r1m',    n: '우주의 톱니',    d: '총 1,000,000회 롤',  chk: s => s.st.total >= 1e6,      r: { dust: 2e6, title: '우주의 톱니' } },
  { id: 't2',     n: '꼬리를 잡다',    d: '혜성 등급 첫 획득',  chk: s => s.st.best >= 2, r: { dust: 200 } },
  { id: 't3',     n: '가스 속으로',    d: '성운 등급 첫 획득',  chk: s => s.st.best >= 3, r: { dust: 1000, title: '성운 탐험가' } },
  { id: 't4',     n: '별이 되다',      d: '항성 등급 첫 획득',  chk: s => s.st.best >= 4, r: { dust: 5000, title: '항성의 아이' } },
  { id: 't5',     n: '폭발적 행운',    d: '초신성 등급 첫 획득', chk: s => s.st.best >= 5, r: { dust: 30000, title: '초신성' } },
  { id: 't6',     n: '심장 박동',      d: '펄서 등급 첫 획득',  chk: s => s.st.best >= 6, r: { dust: 150000, title: '맥동하는 자' } },
  { id: 't7',     n: '은하의 중심',    d: '퀘이사 등급 첫 획득', chk: s => s.st.best >= 7, r: { dust: 800000, title: '퀘이사' } },
  { id: 't8',     n: '돌아올 수 없는', d: '특이점 등급 첫 획득', chk: s => s.st.best >= 8, r: { dust: 4e6, title: '특이점' } },
  { id: 't9',     n: '태초',           d: '기원 등급 획득',     chk: s => s.st.best >= 9, r: { dust: 2e7, title: '태초의 목격자' } },
  { id: 'c10',    n: '수집가',         d: '도감 10종',          chk: s => codexCount(s) >= 10, r: { luck: .05 } },
  { id: 'c25',    n: '천체 도감',      d: '도감 25종',          chk: s => codexCount(s) >= 25, r: { luck: .1, title: '수집가' } },
  { id: 'c40',    n: '하늘의 지도',    d: '도감 40종',          chk: s => codexCount(s) >= 40, r: { luck: .15, title: '지도 제작자' } },
  { id: 'c52',    n: '일반 도감 완성', d: '일반 오라 52종 모두', chk: s => AURAS.every(a => a.ev || s.codex[a.id]), r: { luck: .2, title: '완벽주의자' } },
  { id: 'c60',    n: '모든 별',        d: '도감 60종 완성',     chk: s => codexCount(s) >= 60, r: { luck: .25, title: '모든 별의 주인' } },
  { id: 'e1',     n: '별비 아래',      d: '유성우 경험',        chk: s => (s.st.ev.meteor || 0) > 0,  r: { dust: 500 } },
  { id: 'e2',     n: '폭풍 관측',      d: '성운 폭풍 경험',     chk: s => (s.st.ev.storm || 0) > 0,   r: { dust: 500 } },
  { id: 'e3',     n: '그림자 아래',    d: '일식 경험',          chk: s => (s.st.ev.eclipse || 0) > 0, r: { dust: 1500 } },
  { id: 'e4',     n: '일곱의 정렬',    d: '행성 정렬 경험',     chk: s => (s.st.ev.align || 0) > 0,   r: { dust: 5000, title: '정렬의 목격자' } },
  { id: 'e8',     n: '천문학자',       d: '이벤트 오라 8종 모두', chk: s => AURAS.every(a => !a.ev || s.codex[a.id]), r: { luck: .1, title: '천문학자' } },
  { id: 'g1',     n: '대장장이 별',    d: '첫 장비 제작',       chk: s => s.st.crafted > 0, r: { dust: 500 } },
  { id: 'g5',     n: '완전 무장',      d: 'T5 장비 2종 장착',   chk: s => s.gear.glove >= 5 && s.gear.neck >= 5, r: { dust: 500000, title: '별의 기사' } },
  { id: 'p1',     n: '다시 태어나다',  d: '첫 환생',            chk: s => s.st.pres >= 1,  r: { core: 1, title: '환생자' } },
  { id: 'p5',     n: '윤회의 별',      d: '환생 5회',           chk: s => s.st.pres >= 5,  r: { core: 3 } },
  { id: 'p10',    n: '영원 회귀',      d: '환생 10회',          chk: s => s.st.pres >= 10, r: { core: 6, title: '영원 회귀' } },
  { id: 'hb',     n: '축복받은 손',    d: '???', hd: '축복 롤로 항성 이상 획득', chk: s => s.st.blessRare > 0, r: { dust: 20000, title: '축복받은 손' } },
  { id: 'hf',     n: '운명의 장난',    d: '???', hd: '운명의 별을 쓰고 먼지별 획득', chk: s => s.st.fateFail > 0, r: { dust: 50000, title: '운명의 장난감' } }
];

function codexCount(s) { let n = 0; for (const k in s.codex) n++; return n; }

/* 숫자 표기 */
function fmtKo(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('ko-KR');
  const units = [[1e12, '조'], [1e8, '억'], [1e4, '만']];
  for (const [v, u] of units) if (n >= v) {
    const x = n / v;
    return (x >= 100 ? Math.floor(x) : Math.floor(x * 10) / 10).toLocaleString('ko-KR') + u;
  }
  return String(n);
}
function fmtEn(n) {
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('en-US');
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [v, u] of units) if (n >= v) {
    const x = n / v;
    return (x >= 100 ? Math.floor(x) : Math.floor(x * 10) / 10) + u;
  }
  return String(n);
}
function fmtChance(c) { return '1 / ' + c.toLocaleString('ko-KR'); }
