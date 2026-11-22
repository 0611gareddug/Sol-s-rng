# GRD'S RNG

우주·별자리 테마의 오리지널 오라 수집 RNG 웹게임.
롤을 돌려 **60종의 천체 오라**를 모으고, 포션·장비·우주 이벤트·환생으로 운을 키워 **1/10억 「태초의 GRD」**에 도전하세요.

- PC / 모바일 완전 지원 (모바일 전체화면 버튼, 하단 탭, 바텀 시트)
- 외부 음원 없이 Web Audio로 합성한 효과음·BGM
- 브라우저 자동 저장 (10초마다 + 탭 전환/종료 시)

## 플레이 주소
GitHub Pages 배포 후: `https://0611gareddug.github.io/Sol-s-rng/`

## 파일 구조
```
/
├── index.html            ← 배포용 페이지 (빌드 결과물)
├── assets/
│   ├── game.min.js       ← 난독화된 게임 코드 (빌드 결과물)
│   └── style.min.css     ← 압축된 스타일 (빌드 결과물)
├── .nojekyll
├── src/                  ← 원본 코드 (유지보수는 여기서)
│   ├── index.html        ← HTML 템플릿
│   ├── style.css         ← 스타일
│   ├── data.js           ← 등급·오라 60종·이벤트·포션·장비·업적·성핵 트리 데이터
│   ├── core.js           ← 롤/운 계산, 저장, 이벤트, 제작, 환생, 업적 로직
│   ├── audio.js          ← Web Audio 합성 (효과음·BGM)
│   ├── render.js         ← 캔버스 렌더러 (배경·더미·오라 FX·파티클·컷신)
│   ├── ui.js             ← HUD, 드로어, 모달, 알림
│   ├── protect.js        ← 우클릭·개발자도구 차단
│   └── main.js           ← 진입점, 메인 루프
├── build.js              ← 빌드 스크립트 (번들 + 난독화)
├── package.json
└── docs/기획서.md
```

## 수정 후 다시 빌드하기
```bash
npm install          # 최초 1회
npm run build        # src/ → index.html + assets/ (난독화)
npm run dev          # src/ → .dev/ (난독화 없음, 테스트용 · 보호 기능 꺼짐)
```

## GitHub Pages 배포
1. 저장소 **Settings → Pages**
2. **Source: Deploy from a branch**, Branch는 배포할 브랜치(예: `main`), 폴더는 `/ (root)` 선택 후 Save
3. 1~2분 뒤 `https://0611gareddug.github.io/Sol-s-rng/` 에서 플레이

## 조작
| 입력 | 동작 |
|------|------|
| `Space` / ROLL 버튼 | 롤 |
| `A` | 자동 롤 (총 100회 후 해금) |
| `Q` | 빠른 롤 (총 1,000회 후 해금) |
| `Esc` | 창 닫기 |
