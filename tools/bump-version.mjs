// 정적 파일 캐시 무효화: index.html·privacy.html의 assets 링크와 app.js의 import에 ?v=버전을 붙인다.
// 사용: node tools/bump-version.mjs   (버전 = 현재 시각 YYYYMMDDHHmm)
import { readFileSync, writeFileSync } from 'node:fs';

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const v = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
const files = ['index.html', 'privacy.html', 'assets/app.js', 'assets/card.js', 'assets/ics.js'];
const re = /((?:assets\/|\.\/)[\w-]+\.(?:js|css))(?:\?v=\d+)?(?=["'])/g;

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const out = src.replace(re, `$1?v=${v}`);
  if (out !== src) writeFileSync(f, out);
}
console.log(`version ${v}`);
