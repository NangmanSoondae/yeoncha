import { HOLIDAYS, HOLIDAY_META } from './holidays.js';
import { buildCalendar, planLeave, summarizeLeave, topDeals } from './planner.js';
import { renderCard, canvasToBlob } from './card.js';
import { buildIcs } from './ics.js';
import * as D from './dates.js';

const SITE_URL = 'https://nangmansoondae.github.io/yeoncha/';
const MAX_BUDGET = 30;
const TAIL_DAYS = 10; // 기간 끝 뒤 휴일(예: 12/25~1/3)까지 연휴로 이어 계산
const $ = (id) => document.getElementById(id);

// ---------- 분석(쿠키 없는 도구 연결 전까지는 아무 일도 하지 않음) ----------
function track(name) {
  try {
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: `event/${name}`, title: name, event: true });
    }
  } catch {
    /* 분석 실패는 무시 */
  }
}

// ---------- 기간 선택지 ----------
function periodOptions() {
  const t = D.today();
  const y = Number(t.slice(0, 4));
  const years = HOLIDAY_META.years;
  const opts = [];
  if (years.includes(y)) opts.push({ id: `${y}r`, label: `${y}년 남은 기간`, short: `${y} 남은 연차`, start: t, end: `${y}-12-31` });
  if (years.includes(y + 1)) opts.push({ id: `${y + 1}`, label: `${y + 1}년 전체`, short: `${y + 1} 연차 계획`, start: `${y + 1}-01-01`, end: `${y + 1}-12-31` });
  if (!opts.length) {
    const last = years[years.length - 1];
    opts.push({ id: `${last}`, label: `${last}년 전체`, short: `${last} 연차 계획`, start: `${last}-01-01`, end: `${last}-12-31` });
  }
  return opts;
}
const PERIODS = periodOptions();

// ---------- 상태 ----------
const state = {
  period: PERIODS[0].id,
  budget: 5,
  workType: 'standard',
  strategy: 'long',
  extraOff: [],
  blocked: [],
  manual: null, // null이면 자동 추천, 배열이면 사용자가 고른 연차 날짜
  tapMode: 'leave',
};
let view = { days: [], plan: null, deals: [], dayMap: new Map() };

const period = () => PERIODS.find((p) => p.id === state.period) || PERIODS[0];

// ---------- URL <-> 상태 ----------
function readUrl() {
  const q = new URLSearchParams(location.search);
  if (PERIODS.some((p) => p.id === q.get('p'))) state.period = q.get('p');
  const n = Number(q.get('n'));
  if (Number.isInteger(n) && n >= 0 && n <= MAX_BUDGET && q.has('n')) state.budget = n;
  if (['standard', 'small'].includes(q.get('w'))) state.workType = q.get('w');
  if (['long', 'balanced', 'max'].includes(q.get('s'))) state.strategy = q.get('s');
  const list = (k) => (q.get(k) || '').split('.').map(D.unpack).filter(Boolean);
  state.extraOff = [...new Set(list('x'))].sort();
  state.blocked = [...new Set(list('b'))].sort();
  if (q.has('l')) state.manual = [...new Set(list('l'))].sort();
}
function buildQuery() {
  const q = new URLSearchParams();
  q.set('p', state.period);
  q.set('n', String(state.budget));
  if (state.workType !== 'standard') q.set('w', state.workType);
  q.set('s', state.strategy);
  if (state.extraOff.length) q.set('x', state.extraOff.map(D.pack).join('.'));
  if (state.blocked.length) q.set('b', state.blocked.map(D.pack).join('.'));
  if (state.manual) q.set('l', state.manual.map(D.pack).join('.'));
  return q.toString();
}
function shareUrl() {
  return `${SITE_URL}?${buildQuery()}&src=share`;
}
function syncUrl() {
  history.replaceState(null, '', `${location.pathname}?${buildQuery()}`);
}

// ---------- 계산 ----------
function compute() {
  const p = period();
  const days = buildCalendar({
    start: p.start,
    end: D.addDays(p.end, TAIL_DAYS),
    holidays: HOLIDAYS,
    workType: state.workType,
    extraOff: state.extraOff,
  });
  // 기간 밖 꼬리 구간: 휴일은 연휴 길이에 포함하되 연차는 쓸 수 없음
  const tailWork = days.filter((d) => d.date > p.end && !d.off).map((d) => d.date);
  const dayMap = new Map(days.filter((d) => d.date <= p.end).map((d) => [d.date, d]));
  // 범위 밖·쉬는 날로 바뀐 날짜는 정리
  state.blocked = state.blocked.filter((s) => dayMap.has(s) && !dayMap.get(s).off);
  if (state.manual) state.manual = state.manual.filter((s) => dayMap.has(s) && !dayMap.get(s).off && !state.blocked.includes(s));
  const plan = state.manual
    ? summarizeLeave({ days, leaveDates: state.manual })
    : planLeave({ days, budget: state.budget, strategy: state.strategy, blocked: [...state.blocked, ...tailWork] });
  const deals = topDeals({ days, maxLeave: 5, limit: 8, blocked: [...state.blocked, ...tailWork] });
  view = { days, plan, deals, dayMap };
}

// ---------- 렌더링 ----------
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function setPressed(groupId, value) {
  for (const b of $(groupId).querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === value));
}

function renderControls() {
  $('period').innerHTML = PERIODS.map((p) => `<button type="button" data-v="${p.id}">${esc(p.label)}</button>`).join('');
  setPressed('period', state.period);
  setPressed('work', state.workType);
  setPressed('strategy', state.strategy);
  setPressed('tapmode', state.tapMode);
  $('budget').innerHTML = `${state.budget}<span>일</span>`;
  $('dec').disabled = state.budget <= 0;
  $('inc').disabled = state.budget >= MAX_BUDGET;
  $('adv-summary').textContent = `· ${state.workType === 'small' ? '공휴일에도 출근' : '공휴일에 쉼'}${state.extraOff.length ? ` · 휴무일 ${state.extraOff.length}개` : ''}`;
  $('work-help').textContent =
    state.workType === 'small'
      ? '빨간 날에도 출근하는 회사(주로 5인 미만)는 주말과 노동절만 쉬는 날로 계산해요.'
      : '주말과 법정 공휴일·대체공휴일을 쉬는 날로 계산해요.';
  $('extra-list').innerHTML = state.extraOff
    .map((s) => `<span class="chip">${esc(D.md(s))}<button type="button" data-rm="${s}" aria-label="${esc(D.md(s))} 휴무일 삭제">×</button></span>`)
    .join('');
}

function renderResult() {
  const { plan } = view;
  const p = period();
  const { breaks, leaveUsed, totalOff } = plan;
  const longest = breaks.reduce((m, b) => Math.max(m, b.length), 0);
  if (!breaks.length) {
    $('headline').innerHTML = state.budget === 0 && !state.manual ? '연차를 1일 이상 넣어 보세요' : '이 조건으로는 만들 수 있는 연휴가 없어요';
    $('subline').textContent = `${p.label} 기준`;
  } else {
    $('headline').innerHTML = `연차 <b>${leaveUsed}일</b>로 <b>${totalOff}일</b> 쉬어요`;
    const parts = [`${p.label} 기준`, `가장 긴 휴가 ${longest}일`, `${breaks.length}번에 나눠서`];
    const left = state.budget - leaveUsed;
    if (!state.manual && left > 0) parts.push(`남는 연차 ${left}일`);
    $('subline').textContent = parts.join(' · ');
  }
  $('manual-note').hidden = !state.manual;
  if (state.manual) {
    const over = leaveUsed - state.budget;
    $('manual-text').textContent =
      over > 0
        ? `직접 고른 연차 ${leaveUsed}일 — 가진 연차보다 ${over}일 많아요.`
        : `달력에서 직접 고른 연차 ${leaveUsed}일로 계산 중이에요.`;
  }
  $('breaks').innerHTML = breaks
    .map((b) => {
      const hol = b.holidayNames.length ? ` · ${esc([...new Set(b.holidayNames)].join(', '))}` : '';
      const chips = b.leaveDates.map((s) => `<span class="leave-chip">${esc(D.md(s))}</span>`).join('');
      return `<li class="break">
        <div class="break-top"><span class="break-range">${esc(D.range(b.start, b.end))}</span><span class="break-len">${b.length}일 연속</span></div>
        <div class="break-meta">연차 ${b.leaveCount}일${hol}</div>
        <div class="leave-chips" aria-label="연차 쓰는 날">${chips}</div>
      </li>`;
    })
    .join('');
  const disabled = !breaks.length;
  for (const id of ['share', 'save-img', 'ics']) $(id).disabled = disabled;
}

function renderDeals() {
  const leaveSet = new Set(view.plan.breaks.flatMap((b) => b.leaveDates));
  $('deals').innerHTML =
    view.deals
      .map((d, i) => {
        const used = d.leaveDates.every((s) => leaveSet.has(s));
        const eff = (d.length / d.leaveCount).toFixed(1).replace(/\.0$/, '');
        return `<li class="deal${used ? ' used' : ''}">
          <div class="deal-main">
            <div class="deal-title">연차 ${d.leaveCount}일 → ${d.length}일 휴가<span class="deal-eff">×${eff}</span></div>
            <div class="deal-sub">${esc(D.range(d.start, d.end))}${d.holidayNames.length ? ` · ${esc([...new Set(d.holidayNames)].join(', '))}` : ''}</div>
          </div>
          <button type="button" class="btn small" data-deal="${i}" ${used ? 'disabled' : ''}>${used ? '포함됨' : '넣기'}</button>
        </li>`;
      })
      .join('') || '<li class="empty">이 기간에는 추천할 연휴가 없어요.</li>';
}

function monthsBetween(start, end) {
  const out = [];
  let y = Number(start.slice(0, 4));
  let m = Number(start.slice(5, 7));
  const ey = Number(end.slice(0, 4));
  const em = Number(end.slice(5, 7));
  while (y < ey || (y === ey && m <= em)) {
    out.push([y, m]);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function renderCalendar() {
  const p = period();
  const t = D.today();
  const leaveSet = new Set(view.plan.breaks.flatMap((b) => b.leaveDates));
  const breakOf = new Map();
  for (const b of view.plan.breaks) {
    for (let s = b.start; s <= b.end; s = D.addDays(s, 1)) breakOf.set(s, b);
  }
  const blocked = new Set(state.blocked);
  // 연휴가 기간 끝을 넘어가면(예: 1/1 신정까지) 그 달도 보여줌
  const calEnd = view.plan.breaks.reduce((m, b) => (b.end > m ? b.end : m), p.end);
  const html = monthsBetween(p.start, calEnd).map(([y, m]) => {
    const first = `${y}-${String(m).padStart(2, '0')}-01`;
    const lead = D.dow(first);
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<span class="day pad" aria-hidden="true"></span>');
    for (let s = first; Number(s.slice(5, 7)) === m && s.startsWith(String(y)); s = D.addDays(s, 1)) {
      const day = view.dayMap.get(s);
      const w = D.dow(s);
      const hol = HOLIDAYS[s];
      const cls = ['day'];
      if (w === 0) cls.push('sun');
      if (w === 6) cls.push('sat');
      if (hol && (!day || day.reason === 'holiday')) cls.push('hol');
      if (day && day.reason === 'extra') cls.push('extra');
      if (!day) cls.push('out');
      if (breakOf.has(s)) cls.push('in-break');
      if (leaveSet.has(s)) cls.push('leave');
      if (blocked.has(s)) cls.push('blocked');
      if (s === t) cls.push('today');
      const tappable = day && !day.off;
      if (tappable) cls.push('tappable');
      const labelParts = [D.md(s)];
      if (hol) labelParts.push(hol.name);
      if (day && day.reason === 'extra') labelParts.push('회사 휴무');
      if (leaveSet.has(s)) labelParts.push('연차');
      if (blocked.has(s)) labelParts.push('못 쉬는 날');
      const label = labelParts.join(' ');
      const dnum = Number(s.slice(8));
      cells.push(
        tappable
          ? `<button type="button" class="${cls.join(' ')}" data-date="${s}" aria-label="${esc(label)}" title="${esc(label)}">${dnum}</button>`
          : `<span class="${cls.join(' ')}" title="${esc(label)}" aria-label="${esc(label)}">${dnum}</span>`,
      );
    }
    const dows = D.DOW.map((d, i) => `<span class="dow${i === 0 ? ' sun' : i === 6 ? ' sat' : ''}">${d}</span>`).join('');
    return `<div class="month"><h3>${y}년 ${m}월</h3><div class="grid">${dows}${cells.join('')}</div></div>`;
  });
  $('months').innerHTML = html.join('');
}

function render() {
  compute();
  renderControls();
  renderResult();
  renderDeals();
  renderCalendar();
  syncUrl();
}

// ---------- 공유·내보내기 ----------
let toastTimer;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

function shareText() {
  const { breaks, leaveUsed, totalOff } = view.plan;
  const lines = breaks.slice(0, 3).map((b) => `· ${D.range(b.start, b.end)} ${b.length}일 (연차 ${b.leaveCount})`);
  return [`연차 ${leaveUsed}일 쓰면 ${totalOff}일 쉰다 🏖`, ...lines, '네 남은 연차로도 계산해 봐 👇'].join('\n');
}

async function makeCard() {
  const { breaks, leaveUsed, totalOff } = view.plan;
  const canvas = await renderCard({
    periodLabel: period().short,
    leaveUsed,
    totalOff,
    breaks,
    siteUrl: SITE_URL.replace(/^https:\/\//, '').replace(/\/$/, ''),
  });
  return canvasToBlob(canvas);
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function onShare() {
  track('share-native');
  const url = shareUrl();
  const text = shareText();
  try {
    if (navigator.share) {
      let files;
      try {
        const file = new File([await makeCard()], 'yeoncha-plan.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) files = [file];
      } catch {
        files = undefined;
      }
      await navigator.share(files ? { files, title: '연차각', text: `${text}\n${url}` } : { title: '연차각', text, url });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  track('share-copy');
  if (await copyText(`${text}\n${url}`)) toast('공유 문구와 링크를 복사했어요. 단톡방에 붙여넣으세요!');
}

async function onSaveImage() {
  track('card-save');
  try {
    download(await makeCard(), 'yeoncha-plan.png');
    toast('이미지를 저장했어요');
  } catch {
    toast('이미지를 만들지 못했어요. 다시 시도해 주세요.');
  }
}

async function onCopyLink() {
  track('copy-link');
  if (await copyText(shareUrl())) toast('링크를 복사했어요. 열면 같은 결과가 보여요.');
  else toast('복사하지 못했어요. 주소창의 링크를 직접 복사해 주세요.');
}

function onIcs() {
  track('ics');
  const ics = buildIcs(view.plan.breaks, { url: shareUrl(), md: D.md });
  download(new Blob([ics], { type: 'text/calendar;charset=utf-8' }), 'yeoncha-plan.ics');
  toast('캘린더 파일을 받았어요. 열어서 캘린더에 추가하세요.');
}

// ---------- 입력 ----------
function ensureManual() {
  if (!state.manual) state.manual = view.plan.breaks.flatMap((b) => b.leaveDates);
}

function onSeg(groupId, key, after) {
  $(groupId).addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b || state[key] === b.dataset.v) return;
    state[key] = b.dataset.v;
    if (after) after();
    render();
  });
}

function bind() {
  onSeg('period', 'period', () => {
    state.manual = null;
    track('period');
  });
  onSeg('work', 'workType', () => {
    state.manual = null;
  });
  onSeg('strategy', 'strategy', () => {
    state.manual = null;
    track(`strategy-${state.strategy}`);
  });
  $('tapmode').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    state.tapMode = b.dataset.v;
    setPressed('tapmode', state.tapMode);
  });
  const step = (d) => {
    const n = Math.min(MAX_BUDGET, Math.max(0, state.budget + d));
    if (n === state.budget) return;
    state.budget = n;
    state.manual = null;
    render();
  };
  $('dec').addEventListener('click', () => step(-1));
  $('inc').addEventListener('click', () => step(1));

  $('extra-add').addEventListener('click', () => {
    const v = $('extra-date').value;
    const p = period();
    if (!D.isValid(v)) return toast('날짜를 골라 주세요');
    if (v < p.start || v > p.end) return toast(`${p.label} 안의 날짜만 넣을 수 있어요`);
    if (!state.extraOff.includes(v)) state.extraOff = [...state.extraOff, v].sort();
    $('extra-date').value = '';
    render();
  });
  $('extra-list').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-rm]');
    if (!b) return;
    state.extraOff = state.extraOff.filter((s) => s !== b.dataset.rm);
    render();
  });

  $('months').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-date]');
    if (!b) return;
    const s = b.dataset.date;
    if (state.tapMode === 'block') {
      const on = state.blocked.includes(s);
      state.blocked = on ? state.blocked.filter((x) => x !== s) : [...state.blocked, s].sort();
      if (state.manual) state.manual = state.manual.filter((x) => x !== s);
      track('block');
    } else {
      if (state.blocked.includes(s)) return toast('못 쉬는 날로 지정된 날이에요. 「못 쉬는 날 지정」에서 풀어 주세요.');
      ensureManual();
      state.manual = state.manual.includes(s) ? state.manual.filter((x) => x !== s) : [...state.manual, s].sort();
      track('manual');
    }
    render();
  });

  $('deals').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-deal]');
    if (!b) return;
    const d = view.deals[Number(b.dataset.deal)];
    if (!d) return;
    ensureManual();
    state.manual = [...new Set([...state.manual, ...d.leaveDates])].sort();
    track('deal-add');
    render();
    toast(`${D.range(d.start, d.end)} 연휴를 넣었어요`);
  });
  $('reset-auto').addEventListener('click', () => {
    state.manual = null;
    render();
  });

  $('share').addEventListener('click', onShare);
  $('save-img').addEventListener('click', onSaveImage);
  $('copy-link').addEventListener('click', onCopyLink);
  $('ics').addEventListener('click', onIcs);
}

// 유입 경로 측정: 공유 링크(src=share)·채널 링크(ref=) — 입력값은 보내지 않음
function trackLanding() {
  const q = new URLSearchParams(location.search);
  if (q.get('src') === 'share') track('landing-shared');
  const ref = (q.get('ref') || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 20);
  if (ref) track(`landing-ref-${ref}`);
}

function init() {
  trackLanding();
  readUrl();
  const d = HOLIDAY_META.updated;
  $('data-note').textContent = `공휴일 데이터 기준일: ${d} (${HOLIDAY_META.years.join('·')}년, 월력요항·정부 발표 기준). 임시공휴일은 발표되면 반영해요.`;
  bind();
  render();
  track(`plan/${state.period}/${state.strategy}`);
}

init();
