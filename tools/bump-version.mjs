// 정적 파일 캐시 무효화: public/ 의 HTML이 거는 assets 링크와 JS import에 ?v=버전을 붙인다.
// 사용: node tools/bump-version.mjs   (버전 = 현재 시각 YYYYMMDDHHmm)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { sep } from 'node:path';

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const v = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
// public/ 아래 모든 HTML(연휴 랜딩 페이지 포함) + 다른 모듈을 import하는 JS
const html = readdirSync('public', { recursive: true }).filter((f) => f.endsWith('.html')).map((f) => `public/${f.split(sep).join('/')}`);
const files = [...html, 'public/assets/app.js', 'public/assets/card.js', 'public/assets/ics.js'];
const re = /((?:\/?assets\/|\.\/)[\w-]+\.(?:js|css))(?:\?v=\d+)?(?=["'])/g;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const out = src.replace(re, `$1?v=${v}`);
  if (out !== src) writeFileSync(f, out);
}
console.log(`version ${v}`);
