/* GRD'S RNG 빌드 스크립트
 *  node build.js        → 배포용 (난독화) : index.html, assets/
 *  node build.js --dev  → 개발용 (원본)   : .dev/
 */
const fs = require('fs');
const path = require('path');
const dev = process.argv.includes('--dev');
const ROOT = __dirname, SRC = path.join(ROOT, 'src');
const ORDER = ['protect.js', 'data.js', 'core.js', 'audio.js', 'render.js', 'ui.js', 'main.js'];

const body = ORDER.map(f => `/* ${f} */\n` + fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n');
const bundle = `(function(){'use strict';\nvar __DEV__=${dev};\n${body}\n})();`;
const css = fs.readFileSync(path.join(SRC, 'style.css'), 'utf8');
const html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

if (dev) {
  const out = path.join(ROOT, '.dev');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'game.js'), bundle);
  fs.writeFileSync(path.join(out, 'style.css'), css);
  fs.writeFileSync(path.join(out, 'index.html'), html.replace('%CSS%', 'style.css').replace('%JS%', 'game.js'));
  console.log('dev build → .dev/');
  return;
}

const JO = require('javascript-obfuscator');
const CleanCSS = require('clean-css');
const ob = JO.obfuscate(bundle, {
  compact: true,
  target: 'browser',
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersType: 'function',
  splitStrings: true,
  splitStringsChunkLength: 8,
  // 렌더 루프 성능을 위해 제어 흐름 평탄화/데드코드는 사용하지 않음
  controlFlowFlattening: false,
  deadCodeInjection: false,
  numbersToExpressions: false,
  selfDefending: true,
  disableConsoleOutput: true,
  debugProtection: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false
}).getObfuscatedCode();

const minCss = new CleanCSS({ level: 1 }).minify(css).styles;
const ver = Date.now().toString(36);
fs.mkdirSync(path.join(ROOT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'assets', 'game.min.js'), ob);
fs.writeFileSync(path.join(ROOT, 'assets', 'style.min.css'), minCss);
fs.writeFileSync(path.join(ROOT, 'index.html'),
  html.replace('%CSS%', 'assets/style.min.css?v=' + ver).replace('%JS%', 'assets/game.min.js?v=' + ver)
    .replace(/\n\s*/g, '\n'));
fs.writeFileSync(path.join(ROOT, '.nojekyll'), '');
console.log(`build ok · js ${(ob.length / 1024).toFixed(0)}KB · css ${(minCss.length / 1024).toFixed(0)}KB`);
