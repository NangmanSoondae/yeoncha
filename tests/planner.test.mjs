// 추천 엔진 테스트 — 실행: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCalendar, planLeave, summarizeLeave, topDeals } from '../public/assets/planner.js';

// 자체 fixture (실제 데이터 assets/holidays.js와 독립)
const HOLIDAYS = {
  '2026-05-01': { name: '노동절', type: 'labor' },
  '2026-10-03': { name: '개천절', type: 'public' },
  '2026-10-05': { name: '대체공휴일', type: 'substitute' },
  '2026-10-09': { name: '한글날', type: 'public' },
  '2026-12-25': { name: '성탄절', type: 'public' },
  '2027-01-01': { name: '신정', type: 'public' },
};

const Q4 = { start: '2026-10-01', end: '2026-12-31', holidays: HOLIDAYS };
const STRATEGIES = ['max', 'long', 'balanced'];

function addDays(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const dayAt = (days, date) => days.find((d) => d.date === date);
const shape = (plan) => plan.breaks.map((b) => [b.start, b.end, b.length, b.leaveDates.join(',')]);
const longest = (plan) => plan.breaks.reduce((m, b) => Math.max(m, b.length), 0);

// 모든 Plan이 지켜야 하는 불변식
function assertValidPlan(days, plan, { budget, maxBreakLength = Infinity, blocked = [] }) {
  const idx = new Map(days.map((d, i) => [d.date, i]));
  const blockedSet = new Set(blocked);
  const leaveSet = new Set(plan.breaks.flatMap((b) => b.leaveDates));
  assert.ok(plan.leaveUsed <= budget, `연차 ${plan.leaveUsed}일 > 예산 ${budget}일`);
  assert.equal(plan.leaveUsed, leaveSet.size);
  assert.equal(plan.totalOff, plan.breaks.reduce((sum, b) => sum + b.length, 0));
  let prevEnd = -2;
  for (const b of plan.breaks) {
    const s = idx.get(b.start);
    const e = idx.get(b.end);
    assert.equal(b.length, e - s + 1);
    assert.equal(b.leaveCount, b.leaveDates.length);
    assert.ok(b.leaveCount >= 1, 'Break에는 연차가 1일 이상');
    assert.ok(b.length <= maxBreakLength, `Break ${b.length}일 > ${maxBreakLength}일`);
    assert.ok(s >= prevEnd + 2, '서로 다른 Break 사이에 근무일이 없음');
    for (let i = s; i <= e; i++) assert.ok(days[i].off || leaveSet.has(days[i].date));
    for (const d of b.leaveDates) {
      assert.equal(days[idx.get(d)].off, false, `${d}는 원래 쉬는 날`);
      assert.ok(!blockedSet.has(d), `${d}는 blocked`);
    }
    if (s > 0) assert.ok(!days[s - 1].off && !leaveSet.has(days[s - 1].date), '시작 앞이 근무일이 아님');
    if (e < days.length - 1) assert.ok(!days[e + 1].off && !leaveSet.has(days[e + 1].date), '끝 뒤가 근무일이 아님');
    prevEnd = e;
  }
  // 같은 연차를 수동 모드로 계산해도 결과가 같아야 한다
  assert.deepEqual(summarizeLeave({ days, leaveDates: [...leaveSet] }), plan);
}

// 'max' 전략 정답 검증용 전수 탐색: 휴무 총합 최대 → 최장 연휴 최대
function bruteForceMax(days, budget, maxBreakLength) {
  const work = days.filter((d) => !d.off).map((d) => d.date);
  let best = { totalOff: 0, longest: 0 };
  const pick = [];
  const visit = (from) => {
    const p = summarizeLeave({ days, leaveDates: pick });
    if (p.breaks.every((b) => b.length <= maxBreakLength)) {
      const lg = longest(p);
      if (p.totalOff > best.totalOff || (p.totalOff === best.totalOff && lg > best.longest)) {
        best = { totalOff: p.totalOff, longest: lg };
      }
    }
    if (pick.length === budget) return;
    for (let k = from; k < work.length; k++) {
      pick.push(work[k]);
      visit(k + 1);
      pick.pop();
    }
  };
  visit(0);
  return best;
}

test('buildCalendar: 요일·휴무 사유 (standard)', () => {
  const days = buildCalendar(Q4);
  assert.equal(days.length, 92);
  assert.deepEqual(dayAt(days, '2026-10-01'), { date: '2026-10-01', dow: 4, off: false, reason: null, holidayName: null });
  assert.deepEqual(dayAt(days, '2026-10-03'), { date: '2026-10-03', dow: 6, off: true, reason: 'holiday', holidayName: '개천절' });
  assert.deepEqual(dayAt(days, '2026-10-04'), { date: '2026-10-04', dow: 0, off: true, reason: 'weekend', holidayName: null });
  assert.deepEqual(dayAt(days, '2026-10-05'), { date: '2026-10-05', dow: 1, off: true, reason: 'holiday', holidayName: '대체공휴일' });
  assert.equal(dayAt(days, '2026-10-09').off, true);
  assert.equal(dayAt(days, '2026-12-25').reason, 'holiday');
});

test('buildCalendar: 5인 미만(small)은 노동절만 공휴일 휴무', () => {
  const days = buildCalendar({ ...Q4, workType: 'small' });
  // 2026년 개천절은 토요일이라 주말로 쉰다(공휴일 사유 아님)
  assert.deepEqual(dayAt(days, '2026-10-03'), { date: '2026-10-03', dow: 6, off: true, reason: 'weekend', holidayName: '개천절' });
  assert.deepEqual(dayAt(days, '2026-10-05'), { date: '2026-10-05', dow: 1, off: false, reason: null, holidayName: '대체공휴일' });
  assert.deepEqual(dayAt(days, '2026-10-09'), { date: '2026-10-09', dow: 5, off: false, reason: null, holidayName: '한글날' });
  assert.equal(dayAt(days, '2026-12-25').off, false);

  const may = buildCalendar({ start: '2026-04-30', end: '2026-05-04', holidays: HOLIDAYS, workType: 'small' });
  assert.deepEqual(may.map((d) => d.off), [false, true, true, true, false]);
  assert.equal(may[1].reason, 'holiday');
  assert.equal(may[1].holidayName, '노동절');
});

test('buildCalendar: extraOff·extraWork', () => {
  const days = buildCalendar({ ...Q4, extraOff: ['2026-10-02'], extraWork: ['2026-10-09', '2026-10-10'] });
  assert.deepEqual(dayAt(days, '2026-10-02'), { date: '2026-10-02', dow: 5, off: true, reason: 'extra', holidayName: null });
  assert.deepEqual(dayAt(days, '2026-10-09'), { date: '2026-10-09', dow: 5, off: false, reason: null, holidayName: '한글날' });
  assert.equal(dayAt(days, '2026-10-10').off, false);
});

test('buildCalendar: 잘못된 입력은 예외', () => {
  assert.throws(() => buildCalendar({ ...Q4, start: '2026-02-30' }), RangeError);
  assert.throws(() => buildCalendar({ ...Q4, start: '2026/10/01' }), TypeError);
  assert.throws(() => buildCalendar({ ...Q4, end: '2026-09-30' }), RangeError);
  assert.throws(() => buildCalendar({ ...Q4, workType: 'shift' }), RangeError);
  assert.throws(() => buildCalendar({ ...Q4, extraOff: ['10/02'] }), TypeError);
});

test("planLeave 'long' 예산 3 → 10/3~10/11 9일 (연차 10/6·7·8)", () => {
  const days = buildCalendar(Q4);
  const plan = planLeave({ days, budget: 3, strategy: 'long' });
  assert.deepEqual(plan, {
    breaks: [
      {
        start: '2026-10-03',
        end: '2026-10-11',
        length: 9,
        leaveDates: ['2026-10-06', '2026-10-07', '2026-10-08'],
        leaveCount: 3,
        holidayNames: ['개천절', '대체공휴일', '한글날'],
      },
    ],
    leaveUsed: 3,
    totalOff: 9,
  });
  assertValidPlan(days, plan, { budget: 3 });
});

test("planLeave 'max'는 휴무 총합이 'long' 이상, 동점이면 이른 날짜", () => {
  const days = buildCalendar(Q4);
  const max = planLeave({ days, budget: 3, strategy: 'max' });
  const long = planLeave({ days, budget: 3, strategy: 'long' });
  assert.ok(max.totalOff >= long.totalOff);
  // 10/2~5와 10/3~6은 동점 → 이른 10/2~5, 12/24~27과 12/25~28도 동점 → 이른 12/24~27
  assert.deepEqual(shape(max), [
    ['2026-10-02', '2026-10-05', 4, '2026-10-02'],
    ['2026-10-08', '2026-10-11', 4, '2026-10-08'],
    ['2026-12-24', '2026-12-27', 4, '2026-12-24'],
  ]);
  assert.equal(max.totalOff, 12);
  assertValidPlan(days, max, { budget: 3 });
  assert.deepEqual(planLeave({ days, budget: 3, strategy: 'max' }), max, '결정적이어야 함');
});

test('planLeave: blocked 날짜는 연차로 쓰지 않음', () => {
  const days = buildCalendar(Q4);
  const blocked = ['2026-10-07'];
  const plan = planLeave({ days, budget: 3, strategy: 'long', blocked });
  assert.ok(plan.breaks.every((b) => !b.leaveDates.includes('2026-10-07')));
  assert.deepEqual(shape(plan), [
    ['2026-10-02', '2026-10-05', 4, '2026-10-02'],
    ['2026-10-08', '2026-10-11', 4, '2026-10-08'],
    ['2026-12-24', '2026-12-27', 4, '2026-12-24'],
  ]);
  assertValidPlan(days, plan, { budget: 3, blocked });
});

test('planLeave: 예산 0이면 빈 결과, 잘못된 인자는 예외', () => {
  const days = buildCalendar(Q4);
  for (const strategy of STRATEGIES) {
    assert.deepEqual(planLeave({ days, budget: 0, strategy }), { breaks: [], leaveUsed: 0, totalOff: 0 });
  }
  assert.throws(() => planLeave({ days, budget: -1 }), RangeError);
  assert.throws(() => planLeave({ days, budget: 1.5 }), RangeError);
  assert.throws(() => planLeave({ days, budget: 3, strategy: 'random' }), RangeError);
  assert.throws(() => planLeave({ days, budget: 3, maxBreakLength: 0 }), RangeError);
});

test('planLeave: 전략·예산·제약 조합 전반의 불변식', () => {
  const days = buildCalendar(Q4);
  const blocked = ['2026-10-07', '2026-12-24'];
  for (const strategy of STRATEGIES) {
    for (const budget of [0, 1, 2, 3, 5, 8, 15]) {
      for (const maxBreakLength of [4, 8, 16]) {
        const plan = planLeave({ days, budget, strategy, maxBreakLength, blocked });
        assertValidPlan(days, plan, { budget, maxBreakLength, blocked });
      }
    }
  }
});

test("planLeave 'max'는 전수 탐색과 같은 최적값(휴무 총합·최장 연휴)", () => {
  const cases = [
    ['2026-10-01', '2026-10-31', 3, 16],
    ['2026-09-20', '2026-10-20', 4, 6],
    ['2026-12-01', '2026-12-31', 3, 16],
    ['2026-10-01', '2026-10-25', 5, 9],
  ];
  for (const [start, end, budget, maxBreakLength] of cases) {
    const days = buildCalendar({ start, end, holidays: HOLIDAYS });
    const plan = planLeave({ days, budget, maxBreakLength });
    const best = bruteForceMax(days, budget, maxBreakLength);
    assert.deepEqual({ totalOff: plan.totalOff, longest: longest(plan) }, best, `${start}~${end} 예산 ${budget}`);
    assertValidPlan(days, plan, { budget, maxBreakLength });
  }
});

test('summarizeLeave: 수동 선택 계산, 쉬는 날·범위 밖 날짜는 무시', () => {
  const days = buildCalendar(Q4);
  const plan = summarizeLeave({
    days,
    leaveDates: ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-10', '2026-12-24', '2027-01-04'],
  });
  assert.deepEqual(plan, {
    breaks: [
      {
        start: '2026-10-03',
        end: '2026-10-11',
        length: 9,
        leaveDates: ['2026-10-06', '2026-10-07', '2026-10-08'],
        leaveCount: 3,
        holidayNames: ['개천절', '대체공휴일', '한글날'],
      },
      {
        start: '2026-12-24',
        end: '2026-12-27',
        length: 4,
        leaveDates: ['2026-12-24'],
        leaveCount: 1,
        holidayNames: ['성탄절'],
      },
    ],
    leaveUsed: 4,
    totalOff: 13,
  });
  assert.deepEqual(shape(summarizeLeave({ days, leaveDates: ['2026-11-11'] })), [
    ['2026-11-11', '2026-11-11', 1, '2026-11-11'],
  ]);
  assert.deepEqual(summarizeLeave({ days, leaveDates: [] }), { breaks: [], leaveUsed: 0, totalOff: 0 });
});

test('topDeals: 효율→길이 정렬, 같은 휴일 덩어리 중복 제거, 공휴일 없는 구간 제외', () => {
  const days = buildCalendar(Q4);
  const deals = topDeals({ days });
  // 10/3~6(10/2~5와 같은 덩어리), 12/25~28(12/24~27과 같은 덩어리)은 중복 제거
  assert.deepEqual(
    deals.map((b) => [b.start, b.end, b.length, b.leaveCount]),
    [
      ['2026-10-02', '2026-10-05', 4, 1],
      ['2026-10-08', '2026-10-11', 4, 1],
      ['2026-12-24', '2026-12-27', 4, 1],
      ['2026-10-03', '2026-10-11', 9, 3],
    ],
  );
  for (let i = 1; i < deals.length; i++) {
    const a = deals[i - 1];
    const b = deals[i];
    const ea = a.length / a.leaveCount;
    const eb = b.length / b.leaveCount;
    assert.ok(ea > eb || (ea === eb && a.length >= b.length), '정렬 순서');
  }
  assert.ok(deals.every((b) => b.holidayNames.length > 0), '평범한 주말+연차 구간은 제외');
  assert.equal(topDeals({ days, limit: 2 }).length, 2);
  assert.ok(topDeals({ days, maxLeave: 1 }).every((b) => b.leaveCount === 1));

  const blocked = ['2026-10-02', '2026-10-08'];
  const blockedDeals = topDeals({ days, blocked });
  assert.ok(blockedDeals.every((b) => b.leaveDates.every((d) => !blocked.includes(d))));
  assert.ok(blockedDeals.some((b) => b.start === '2026-10-03' && b.end === '2026-10-06'), '막히면 같은 덩어리의 다음 후보');
});

test('기간 끝 뒤 꼬리 구간: 휴일은 Break에 포함되고 근무일은 연차로 안 씀', () => {
  // UI 방식: 12/31 뒤 10일을 달력에 이어 붙이고, 그 구간의 근무일을 blocked로 넘긴다
  const end = '2026-12-31';
  const days = buildCalendar({ start: '2026-12-01', end: addDays(end, 10), holidays: HOLIDAYS });
  const blocked = days.filter((d) => d.date > end && !d.off).map((d) => d.date);
  assert.deepEqual(blocked, ['2027-01-04', '2027-01-05', '2027-01-06', '2027-01-07', '2027-01-08']);

  const plan = planLeave({ days, budget: 4, strategy: 'long', blocked });
  assert.deepEqual(plan.breaks, [
    {
      start: '2026-12-25',
      end: '2027-01-03',
      length: 10,
      leaveDates: ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31'],
      leaveCount: 4,
      holidayNames: ['성탄절', '신정'],
    },
  ]);
  assertValidPlan(days, plan, { budget: 4, blocked });

  for (const strategy of STRATEGIES) {
    for (const budget of [1, 5, 10, 20]) {
      const p = planLeave({ days, budget, strategy, blocked });
      assertValidPlan(days, p, { budget, maxBreakLength: 16, blocked });
      assert.ok(p.breaks.every((b) => b.leaveDates.every((d) => d <= end)), `${strategy}/${budget}: 꼬리 근무일 사용`);
    }
  }

  const deals = topDeals({ days, blocked });
  assert.ok(deals.every((b) => b.leaveDates.every((d) => d <= end)));
  assert.ok(deals.some((b) => b.start === '2026-12-25' && b.end === '2027-01-03'));
  assert.ok(deals.some((b) => b.end === '2027-01-03' && b.leaveDates.join() === '2026-12-31'));
});

test('입력 days를 변경하지 않음', () => {
  const days = buildCalendar(Q4);
  const snapshot = structuredClone(days);
  planLeave({ days, budget: 5, strategy: 'long', blocked: ['2026-10-07'] });
  topDeals({ days });
  summarizeLeave({ days, leaveDates: ['2026-10-06'] });
  assert.deepEqual(days, snapshot);
});

test('성능: 460일 · 예산 25/30에서 전략별 50ms 이내', () => {
  const days = buildCalendar({ start: '2026-10-01', end: addDays('2026-10-01', 459), holidays: HOLIDAYS });
  assert.equal(days.length, 460);
  planLeave({ days, budget: 25 }); // JIT 워밍업
  for (const budget of [25, 30]) {
    for (const strategy of STRATEGIES) {
      const t0 = performance.now();
      const plan = planLeave({ days, budget, strategy });
      const ms = performance.now() - t0;
      assert.ok(ms < 50, `${strategy}/예산 ${budget}: ${ms.toFixed(1)}ms`);
      assertValidPlan(days, plan, { budget, maxBreakLength: 16 });
    }
  }
});

test('topDeals: 주말에 걸린 공휴일만 있는 덩어리는 딜이 아님 (5인 미만 2027 노동절 토요일)', () => {
  const H = { '2027-05-01': { name: '노동절', type: 'labor' }, '2027-05-03': { name: '대체공휴일(노동절)', type: 'substitute' } };
  const small = buildCalendar({ start: '2027-04-26', end: '2027-05-09', holidays: H, workType: 'small' });
  assert.equal(topDeals({ days: small }).length, 0, '5/1(토)~5/2(일)는 평범한 주말');
  const std = buildCalendar({ start: '2027-04-26', end: '2027-05-09', holidays: H });
  assert.ok(topDeals({ days: std }).some((b) => b.start === '2027-04-30' && b.end === '2027-05-03'), '대체공휴일이 있으면 딜');
});
