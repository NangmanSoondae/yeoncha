// IndexNow 색인 통보 — 빙 등 참여 검색엔진(api.indexnow.org)과 네이버(자체 엔드포인트)에 URL 변경을 알린다.
// 사용: node tools/indexnow.mjs            → 사이트맵의 모든 URL
//       node tools/indexnow.mjs <URL...>   → 지정한 URL만
// 키 파일은 사이트 루트의 2986ea67b940125b2cb34a7d2926fa39.txt (같은 호스트에 있어야 함)
const HOST = 'yeoncha.nangsoon.com';
const KEY = '2986ea67b940125b2cb34a7d2926fa39';
const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow'];

let urlList = process.argv.slice(2);
if (!urlList.length) {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}
const body = JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList });
console.log(`IndexNow: ${urlList.length}개 URL`);
for (const endpoint of ENDPOINTS) {
  try {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body });
    console.log(`  ${res.ok ? 'OK' : 'NG'} ${endpoint} → ${res.status}`);
  } catch (e) {
    console.log(`  NG ${endpoint} → ${e.message}`);
  }
}
