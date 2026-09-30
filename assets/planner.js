// 연차 황금연휴 플래너 — 추천 엔진
// 순수 ES 모듈: 의존성 0, DOM 접근 없음. 날짜는 전부 'YYYY-MM-DD' 문자열이고,
// 내부 계산은 1970-01-01 기준 "일 번호"(UTC)로 해서 로컬 타임존 영향을 받지 않는다.

/**
 * @typedef {{ name: string, type: 'public'|'substitute'|'temporary'|'labor'|'election' }} Holiday
 * @typedef {{ date: string, dow: number, off: boolean, reason: 'weekend'|'holiday'|'extra'|null, holidayName: string|null }} Day
 * @typedef {{ start: string, end: string, length: number, leaveDates: string[], leaveCount: number, holidayNames: string[] }} Break
 * @typedef {{ breaks: Break[], leaveUsed: number, totalOff: number }} Plan
 */

const DAY_MS = 86400000;
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MAX_RANGE_DAYS = 3700; // 약 10년. 잘못된 입력으로 무한히 도는 것을 막는 안전장치

const WORK_TYPES = new Set(['standard', 'small']);

// 점수는 정수(휴무 1일 = 2점)로 계산해 부동소수 동점 오차를 없앤다.
const STRATEGY_WEIGHT = {
  // 휴무일 총합 그대로.
  max: (len) => 2 * len,
  // 7일+ 구간의 하루를 1.5일로: 휴일 덕에 싸게 만들어지는 긴 휴가(예: 연차 3일로 9일)만 징검다리보다 앞선다.
  balanced: (len) => (len >= 7 ? 3 * len : 2 * len),
  // 7일+ 구간의 하루를 3일로: 연차만으로 만든 9일(연차 5일)도 최고 효율 징검다리 5번(4일×5=20일)보다 앞선다.
  long: (len) => (len >= 7 ? 6 * len : 2 * len),
};

const END = -2;
const SKIP = -1;

// ---------------------------------------------------------------------------
// 날짜 유틸 (UTC 일 번호)

function toDayNumber(value, label) {
  if (typeof value !== 'string') throw new TypeError(`${label}: 'YYYY-MM-DD' 문자열이어야 합니다 (받은 값: ${value})`);
  const m = ISO_RE.exec(value);
  if (!m) throw new TypeError(`${label}: 'YYYY-MM-DD' 형식이 아닙니다 (받은 값: ${value})`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
    throw new RangeError(`${label}: 존재하지 않는 날짜입니다 (받은 값: ${value})`);
  }
  return Math.round(ms / DAY_MS);
}

function fromDayNumber(n) {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

function dateSet(list, label) {
  if (list == null) return new Set();
  if (typeof list === 'string' || typeof list[Symbol.iterator] !== 'function') {
    throw new TypeError(`${label}: 날짜 문자열 배열이어야 합니다`);
  }
  const out = new Set();
  for (const v of list) {
    toDayNumber(v, label);
    out.add(v);
  }
  return out;
}

function assertInt(value, label, min) {
  if (!Number.isInteger(value) || value < min) {
    throw new RangeError(`${label}: ${min} 이상의 정수여야 합니다 (받은 값: ${value})`);
  }
}

function assertDays(days) {
  if (!Array.isArray(days)) throw new TypeError('days: buildCalendar() 결과 배열이어야 합니다');
}

// ---------------------------------------------------------------------------
// 1. 달력

/**
 * 기간 내 모든 날짜의 휴무 여부를 계산한다.
 * 우선순위: extraWork(근무) > 휴무로 인정되는 공휴일 > 주말 > extraOff(회사 지정 휴무).
 * holidayName은 휴무 인정 여부와 관계없이 공휴일이면 채운다(5인 미만 모드에서 "근무" 표시용).
 * @returns {Day[]}
 */
export function buildCalendar({
  start,
  end,
  holidays = {},
  workType = 'standard',
  extraOff = [],
  extraWork = [],
} = {}) {
  const s = toDayNumber(start, 'start');
  const e = toDayNumber(end, 'end');
  if (e < s) throw new RangeError(`end(${end})가 start(${start})보다 빠릅니다`);
  if (e - s + 1 > MAX_RANGE_DAYS) throw new RangeError(`기간이 너무 깁니다 (최대 ${MAX_RANGE_DAYS}일)`);
  if (!WORK_TYPES.has(workType)) throw new RangeError(`workType은 'standard' 또는 'small'이어야 합니다 (받은 값: ${workType})`);
  if (holidays == null || typeof holidays !== 'object') throw new TypeError('holidays: 객체여야 합니다');
  const offSet = dateSet(extraOff, 'extraOff');
  const workSet = dateSet(extraWork, 'extraWork');

  const days = [];
  for (let n = s; n <= e; n++) {
    const date = fromDayNumber(n);
    const dow = (((n + 4) % 7) + 7) % 7; // 1970-01-01 = 목요일(4)
    const h = Object.hasOwn(holidays, date) ? holidays[date] : null;
    const holidayName = h && typeof h.name === 'string' ? h.name : null;
    const holidayOff = Boolean(h) && (workType === 'standard' || h.type === 'labor');

    let off = false;
    let reason = null;
    if (workSet.has(date)) {
      off = false;
    } else if (holidayOff) {
      off = true;
      reason = 'holiday';
    } else if (dow === 0 || dow === 6) {
      off = true;
      reason = 'weekend';
    } else if (offSet.has(date)) {
      off = true;
      reason = 'extra';
    }
    days.push({ date, dow, off, reason, holidayName });
  }
  return days;
}

// ---------------------------------------------------------------------------
// 공통: 후보 구간 열거와 Break 생성

/**
 * 연차로 만들 수 있는 "완결된" 휴무 구간 [s, e]를 모두 찾는다.
 * - 구간 안의 근무일은 전부 연차(cost = 근무일 수, 1 이상), blocked 근무일은 포함 불가
 * - 양끝 바깥은 근무일이거나 범위 경계(휴무일이 이어지면 구간이 더 길어져야 하므로 제외)
 * byStart[s]는 e 오름차순이라 len·cost도 오름차순이다.
 */
function enumerateIntervals(days, maxCost, maxLen, blockedSet) {
  const n = days.length;
  const all = [];
  const byStart = new Array(n);
  for (let s = 0; s < n; s++) {
    byStart[s] = [];
    if (s > 0 && days[s - 1].off) continue;
    let cost = 0;
    for (let e = s; e < n && e - s + 1 <= maxLen; e++) {
      const d = days[e];
      if (!d.off) {
        if (blockedSet.has(d.date)) break;
        cost++;
        if (cost > maxCost) break;
      }
      if (cost >= 1 && (e === n - 1 || !days[e + 1].off)) {
        byStart[s].push(all.length);
        all.push({ s, e, len: e - s + 1, cost });
      }
    }
  }
  return { all, byStart };
}

function makeBreak(days, from, to, isLeave) {
  const leaveDates = [];
  const holidayNames = [];
  for (let i = from; i <= to; i++) {
    const d = days[i];
    if (isLeave[i]) leaveDates.push(d.date);
    else if (d.holidayName && !holidayNames.includes(d.holidayName)) holidayNames.push(d.holidayName);
  }
  return {
    start: days[from].date,
    end: days[to].date,
    length: to - from + 1,
    leaveDates,
    leaveCount: leaveDates.length,
    holidayNames,
  };
}

/** 휴무·연차가 이어지는 최대 구간 중 연차가 1일 이상 든 것을 Plan으로 묶는다. */
function planFromLeaveMask(days, isLeave) {
  const breaks = [];
  const n = days.length;
  let i = 0;
  while (i < n) {
    if (!days[i].off && !isLeave[i]) {
      i++;
      continue;
    }
    let j = i;
    let hasLeave = false;
    while (j < n && (days[j].off || isLeave[j])) {
      if (isLeave[j]) hasLeave = true;
      j++;
    }
    if (hasLeave) breaks.push(makeBreak(days, i, j - 1, isLeave));
    i = j;
  }
  let leaveUsed = 0;
  let totalOff = 0;
  for (const b of breaks) {
    leaveUsed += b.leaveCount;
    totalOff += b.length;
  }
  return { breaks, leaveUsed, totalOff };
}

// ---------------------------------------------------------------------------
// 2. 자동 추천

/**
 * 예산 제약 가중 구간 스케줄링 DP (오른쪽 → 왼쪽).
 * 상태 (i, b, req): 인덱스 i 이후만 사용, 연차 b일 이하, req=1이면 길이 M 구간을 반드시 포함.
 * 비교 순서: 점수 큰 쪽 → 연차 적게 쓴 쪽 → 첫 구간이 이른 쪽(같은 시작이면 짧은 쪽).
 * 뒤에서부터 채우므로 "이른 날짜 우선"이 상태마다 국소적으로 정확히 결정된다.
 */
function runDP(all, byStart, n, budget, M, weight) {
  const W = budget + 1;
  const size = (n + 1) * W;
  const s0 = new Int32Array(size);
  const c0 = new Int32Array(size);
  const k0 = new Int32Array(size);
  const s1 = new Int32Array(size).fill(-1);
  const c1 = new Int32Array(size);
  const k1 = new Int32Array(size);
  for (let b = 0; b < W; b++) {
    k0[n * W + b] = END;
    k1[n * W + b] = END;
  }

  for (let i = n - 1; i >= 0; i--) {
    const list = byStart[i];
    const skipBase = (i + 1) * W;
    for (let b = 0; b < W; b++) {
      let bs0 = -1, bc0 = 0, bk0 = END;
      let bs1 = -1, bc1 = 0, bk1 = END;

      for (let t = 0; t < list.length; t++) {
        const k = list[t];
        const iv = all[k];
        if (iv.len > M || iv.cost > b) break; // byStart는 len·cost 오름차순
        const r = Math.min(iv.e + 2, n) * W + (b - iv.cost); // 다음 구간과 근무일 1일 이상 간격
        const w = weight[iv.len];

        const sc = w + s0[r];
        const cc = iv.cost + c0[r];
        if (sc > bs0 || (sc === bs0 && cc < bc0)) {
          bs0 = sc; bc0 = cc; bk0 = k;
        }

        let sc1 = -1, cc1 = 0;
        if (iv.len === M) {
          sc1 = sc; cc1 = cc;
        } else if (s1[r] >= 0) {
          sc1 = w + s1[r]; cc1 = iv.cost + c1[r];
        }
        if (sc1 >= 0 && (sc1 > bs1 || (sc1 === bs1 && cc1 < bc1))) {
          bs1 = sc1; bc1 = cc1; bk1 = k;
        }
      }

      // 건너뛰기는 "엄격히 더 좋을 때만" → 동점이면 지금 시작하는(더 이른) 구간이 이긴다.
      const r = skipBase + b;
      if (s0[r] > bs0 || (s0[r] === bs0 && c0[r] < bc0)) {
        bs0 = s0[r]; bc0 = c0[r]; bk0 = SKIP;
      }
      if (s1[r] >= 0 && (s1[r] > bs1 || (s1[r] === bs1 && c1[r] < bc1))) {
        bs1 = s1[r]; bc1 = c1[r]; bk1 = SKIP;
      }

      const idx = i * W + b;
      s0[idx] = bs0; c0[idx] = bc0; k0[idx] = bk0;
      s1[idx] = bs1; c1[idx] = bc1; k1[idx] = bk1;
    }
  }
  return { W, s0, k0, s1, k1 };
}

function reconstruct(dp, all, n, budget, M, startReq) {
  const chosen = [];
  let i = 0;
  let b = budget;
  let req = startReq;
  while (i < n) {
    const idx = i * dp.W + b;
    const k = req === 1 ? dp.k1[idx] : dp.k0[idx];
    if (k === END) break;
    if (k === SKIP) {
      i++;
      continue;
    }
    const iv = all[k];
    chosen.push(iv);
    if (req === 1 && iv.len === M) req = 0;
    b -= iv.cost;
    i = Math.min(iv.e + 2, n);
  }
  return chosen;
}

/**
 * 남은 연차(budget)로 휴무를 최대화하는 연차 조합을 추천한다.
 * 동점 처리: 점수 → 가장 긴 Break가 긴 쪽 → 연차를 적게 쓴 쪽 → 이른 날짜. 결과는 항상 같다.
 * @returns {Plan}
 */
export function planLeave({ days, budget, strategy = 'max', maxBreakLength = 16, blocked = [] } = {}) {
  assertDays(days);
  assertInt(budget, 'budget', 0);
  assertInt(maxBreakLength, 'maxBreakLength', 1);
  if (!Object.hasOwn(STRATEGY_WEIGHT, strategy)) {
    throw new RangeError(`strategy는 'max' | 'long' | 'balanced' 중 하나여야 합니다 (받은 값: ${strategy})`);
  }
  const weightFn = STRATEGY_WEIGHT[strategy];
  const blockedSet = dateSet(blocked, 'blocked');
  const n = days.length;
  const empty = { breaks: [], leaveUsed: 0, totalOff: 0 };
  if (n === 0 || budget === 0) return empty;

  const { all, byStart } = enumerateIntervals(days, budget, maxBreakLength, blockedSet);
  if (all.length === 0) return empty;

  let maxLen = 0;
  const lengths = new Set();
  for (const iv of all) {
    lengths.add(iv.len);
    if (iv.len > maxLen) maxLen = iv.len;
  }
  const weight = new Int32Array(maxLen + 1);
  for (let len = 1; len <= maxLen; len++) weight[len] = weightFn(len);

  // 가장 긴 구간 길이 M을 큰 값부터 시도: "최고 점수이면서 길이 M 구간을 포함"하는 첫 M이 정답.
  let best = -1;
  let chosen = [];
  for (let M = maxLen; M >= 1; M--) {
    if (!lengths.has(M)) continue;
    const dp = runDP(all, byStart, n, budget, M, weight);
    if (best < 0) best = dp.s0[budget]; // 첫 시도(M = 최대 길이)의 제약 없는 최적값 = 전역 최적
    if (dp.s1[budget] === best) {
      chosen = reconstruct(dp, all, n, budget, M, 1);
      break;
    }
  }

  const isLeave = new Uint8Array(n);
  for (const iv of chosen) {
    for (let i = iv.s; i <= iv.e; i++) if (!days[i].off) isLeave[i] = 1;
  }
  return planFromLeaveMask(days, isLeave);
}

// ---------------------------------------------------------------------------
// 3. 수동 모드

/**
 * 사용자가 고른 연차로 Break를 계산한다. 범위 밖 날짜와 원래 쉬는 날은 무시한다.
 * @returns {Plan}
 */
export function summarizeLeave({ days, leaveDates = [] } = {}) {
  assertDays(days);
  const picked = dateSet(leaveDates, 'leaveDates');
  const isLeave = new Uint8Array(days.length);
  for (let i = 0; i < days.length; i++) {
    if (!days[i].off && picked.has(days[i].date)) isLeave[i] = 1;
  }
  return planFromLeaveMask(days, isLeave);
}

// ---------------------------------------------------------------------------
// 4. 가성비 구간 목록

/**
 * 연차 1~maxLeave일로 만들 수 있는 구간을 효율(length/leaveCount) → length 내림차순으로 돌려준다.
 * - 공휴일·회사 지정 휴무가 하나도 없는 구간(평범한 주말 + 연차)은 "딜"이 아니므로 제외
 * - 같은 휴일 덩어리(공휴일/지정휴무를 포함한 연속 휴무 묶음) 조합을 공유하는 구간은 효율 최고 1개만 남김
 * @returns {Break[]}
 */
export function topDeals({ days, maxLeave = 5, limit = 12, blocked = [] } = {}) {
  assertDays(days);
  assertInt(maxLeave, 'maxLeave', 1);
  assertInt(limit, 'limit', 0);
  const blockedSet = dateSet(blocked, 'blocked');
  const n = days.length;
  if (n === 0 || limit === 0) return [];

  // 휴일 덩어리 id: 공휴일/지정휴무가 들어 있는 연속 휴무 구간의 시작 인덱스
  const cluster = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; ) {
    if (!days[i].off) {
      i++;
      continue;
    }
    let j = i;
    let special = false;
    while (j < n && days[j].off) {
      if (days[j].reason === 'holiday' || days[j].reason === 'extra') special = true;
      j++;
    }
    if (special) for (let t = i; t < j; t++) cluster[t] = i;
    i = j;
  }

  const { all } = enumerateIntervals(days, maxLeave, Infinity, blockedSet);
  const candidates = [];
  for (const iv of all) {
    const ids = [];
    for (let i = iv.s; i <= iv.e; i++) {
      const c = cluster[i];
      if (c >= 0 && ids[ids.length - 1] !== c) ids.push(c);
    }
    if (ids.length === 0) continue;
    candidates.push({ ...iv, key: ids.join(',') });
  }

  candidates.sort(
    (a, b) => b.len * a.cost - a.len * b.cost || b.len - a.len || a.s - b.s || a.e - b.e,
  );

  const seen = new Set();
  const out = [];
  for (const c of candidates) {
    if (seen.has(c.key)) continue;
    seen.add(c.key);
    const isLeave = new Uint8Array(n);
    for (let i = c.s; i <= c.e; i++) if (!days[i].off) isLeave[i] = 1;
    out.push(makeBreak(days, c.s, c.e, isLeave));
    if (out.length >= limit) break;
  }
  return out;
}
