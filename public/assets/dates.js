// 날짜 유틸 — 모든 날짜는 'YYYY-MM-DD' 문자열, 계산은 UTC 기준(타임존 영향 없음)
export const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n) => String(n).padStart(2, '0');

export function parse(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function format(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
export function addDays(s, n) {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return format(d);
}
export function dow(s) {
  return parse(s).getUTCDay();
}
// 사용자의 현지 날짜(오늘)
export function today() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}
// 10/3(토)
export function md(s) {
  const d = parse(s);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${DOW[d.getUTCDay()]})`;
}
// 10.03
export function mdDot(s) {
  const d = parse(s);
  return `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
}
export function range(a, b) {
  return a === b ? md(a) : `${md(a)} ~ ${md(b)}`;
}
export function isValid(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && format(parse(s)) === s;
}
// URL용 압축: 2026-10-06 → 261006
export function pack(s) {
  return s.slice(2).replaceAll('-', '');
}
export function unpack(t) {
  if (!/^\d{6}$/.test(t)) return null;
  const s = `20${t.slice(0, 2)}-${t.slice(2, 4)}-${t.slice(4, 6)}`;
  return isValid(s) ? s : null;
}
