// 스레드 답글·게시물용 계산기: 앱(compute)과 같은 규칙으로 추천 조합과 결과 링크를 뽑는다.
// 사용: node tools/calc.mjs --n 5 [--p 2026r|2027] [--s long|balanced|max] [--w standard|small] [--from 2026-10-02] [--ref th4]
import { buildCalendar, planLeave, topDeals } from '../public/assets/planner.js';
import { HOLIDAYS } from '../public/assets/holidays.js';
import * as D from '../public/assets/dates.js';

const TAIL_DAYS = 10;
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
);
const n = Number(args.n ?? 5);
const s = args.s ?? 'long';
const w = args.w ?? 'standard';
const t = D.today();
const y = Number(t.slice(0, 4));
const p = args.p ?? `${y}r`;
const start = p.endsWith('r') ? args.from ?? D.addDays(t, 1) : `${p}-01-01`;
const end = `${p.replace('r', '')}-12-31`;

const days = buildCalendar({ start, end: D.addDays(end, TAIL_DAYS), holidays: HOLIDAYS, workType: w, extraOff: [] });
const tailWork = days.filter((d) => d.date > end && !d.off).map((d) => d.date);
const plan = planLeave({ days, budget: n, strategy: s, blocked: tailWork });
const fmt = D.md; // 예: 10/2(금)

console.log(`기간 ${start}~${end} · 연차 ${n}일 · ${s} · ${w}`);
for (const b of plan.breaks) {
  console.log(`- ${fmt(b.start)}~${fmt(b.end)} ${b.length}일 | 연차 ${b.leaveCount}: ${b.leaveDates.map(D.md).join(', ')} | ${b.holidayNames.join(', ')}`);
}
console.log(`연차 ${plan.leaveUsed}일 → 연휴 합계 ${plan.breaks.reduce((a, b) => a + b.length, 0)}일`);
const q = new URLSearchParams({ p, n: String(n) });
if (w !== 'standard') q.set('w', w);
q.set('s', s);
console.log(`https://yeoncha.nangsoon.com/${args.ref ? `?ref=${args.ref}` : ''}#${q}`);
if (args.deals) {
  console.log('가성비:');
  for (const d of topDeals({ days, maxLeave: 5, limit: 8, blocked: tailWork })) console.log(`  ${fmt(d.start)}~${fmt(d.end)} ${d.length}일 / 연차 ${d.leaveCount}: ${d.leaveDates.map(D.md).join(', ')}`);
}
