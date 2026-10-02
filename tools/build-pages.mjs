// 연휴 랜딩 페이지 생성기 — 엔진으로 「연차 0~N일이면 최장 며칠」 표를 계산해 public/<slug>/index.html 로 쓴다.
// 사용: node tools/build-pages.mjs   (공휴일 데이터를 고치면 다시 실행 → bump-version → push → indexnow)
// 결정 003: 날짜에 따라 결과가 바뀌지 않는 연휴만, 연차 개수별 페이지는 만들지 않음.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { buildCalendar, holidayClusters, bestAroundCluster, planLeave } from '../public/assets/planner.js';
import { HOLIDAYS, HOLIDAY_META } from '../public/assets/holidays.js';
import * as D from '../public/assets/dates.js';

const SITE = 'https://yeoncha.nangsoon.com';
const TAIL_DAYS = 10;

// period: 앱 기간 id(2027 = 2027년 전체, 2026r = 2026 남은 기간). clusters: 표에 쓸 휴일 덩어리의 아무 날짜
export const PAGES = [
  {
    slug: '2027/chuseok',
    period: '2027',
    ref: 'lp-chu27',
    name: '2027 추석',
    clusters: ['2027-09-15'],
    maxLeave: 4,
    star: 2,
    title: '2027 추석 연휴 연차 몇 개 쓰면 며칠 쉴까 — 연차 0~4일별 최장 날짜',
    description: '2027 추석 연휴(9/14~16)에 연차 1개면 6일, 2개면 9일(9/11~9/19). 연차 개수별로 언제 써야 가장 길게 쉬는지 날짜까지 정리했어요.',
    h1: '2027 추석 연휴, 연차 몇 개면 며칠 쉴까',
    intro: [
      '2027년 추석 연휴는 9월 14일(화)부터 16일(목)까지 사흘이에요. 연휴가 주 중간에 걸려 있어서 앞쪽 월요일과 뒤쪽 금요일만 메우면 주말 두 번이 그대로 붙어요.',
      '그래서 9월 13일(월)과 17일(금)에 연차 2개를 쓰면 9월 11일(토)부터 19일(일)까지 9일을 쉴 수 있어요.',
    ],
  },
  {
    slug: '2027/seol',
    period: '2027',
    ref: 'lp-seol27',
    name: '2027 설',
    clusters: ['2027-02-07'],
    maxLeave: 4,
    star: 3,
    title: '2027 설 연휴 연차 몇 개 쓰면 며칠 쉴까 — 연차 0~4일별 최장 날짜',
    description: '2027 설 연휴는 2/6(토)~2/9(화) 4일. 연휴 뒤 2/10~12 연차 3개면 2/6~2/14 9일을 쉬어요. 연차 개수별 날짜를 정리했어요.',
    h1: '2027 설 연휴, 연차 몇 개면 며칠 쉴까',
    intro: [
      '2027년 설 연휴는 2월 6일(토)부터 9일(화)까지 나흘이에요. 설날(2월 7일)이 일요일이라 2월 9일(화)이 대체공휴일이 됐어요.',
      '연휴 바로 뒤 수·목·금(2월 10~12일)에 연차 3개를 쓰면 2월 6일(토)부터 14일(일)까지 9일을 쉴 수 있어요.',
    ],
  },
  {
    slug: '2027/may',
    period: '2027',
    ref: 'lp-may27',
    name: '2027 5월',
    tableH2: '노동절·어린이날(5/1~5/5)에 붙이면',
    clusters: ['2027-05-01', '2027-05-05'],
    maxLeave: 4,
    star: 3,
    title: '2027 5월 황금연휴 연차 쓰기 좋은 날 — 노동절·어린이날 연차 0~4일별',
    description: '2027년 5월은 노동절 대체공휴일(5/3)과 어린이날(5/5) 사이 5/4 연차 하나면 5일, 5/4·6·7 연차 3개면 5/1~5/9 9일을 쉬어요.',
    h1: '2027 5월 황금연휴, 연차 몇 개면 며칠 쉴까',
    intro: [
      '2027년 5월은 노동절(5월 1일)이 토요일이라 5월 3일(월)이 대체공휴일이고, 이틀 뒤 5월 5일(수)이 어린이날이에요.',
      '5월 4일(화) 연차 하나면 5월 1일(토)부터 5일(수)까지 5일, 여기에 6·7일(목·금)을 더해 연차 3개면 5월 1일부터 9일(일)까지 9일을 쉬어요.',
    ],
    more: [{ h2: '부처님오신날(5/13, 목)에 붙이면', clusters: ['2027-05-13'], star: 1, intro: '부처님오신날은 목요일이에요. 다음 날 금요일(5/14)에 연차 하나를 쓰면 5월 13일부터 16일(일)까지 4일이에요.' }],
  },
  {
    slug: '2027/summer',
    period: '2027',
    ref: 'lp-sum27',
    name: '2027 여름',
    tableH2: '제헌절(7/17~7/19)에 붙이면',
    clusters: ['2027-07-17'],
    maxLeave: 4,
    star: 4,
    title: '2027 여름휴가 연차 계획 — 제헌절·광복절 대체공휴일에 연차 0~4일',
    description: '2027년 제헌절(7/17)·광복절(8/15)은 모두 주말이라 7/19·8/16(월)이 대체공휴일. 뒤이은 화~금 연차 4개면 각각 9일 여름휴가가 돼요.',
    h1: '2027 여름휴가, 제헌절·광복절에 연차 붙이면 며칠?',
    intro: [
      '2027년에는 제헌절(7월 17일)과 광복절(8월 15일)이 모두 주말에 걸려서 7월 19일(월)과 8월 16일(월)이 대체공휴일이에요. 그래서 토·일·월 사흘 연휴가 두 번 생겨요.',
      '각 연휴 바로 뒤 화~금 나흘에 연차 4개를 쓰면 9일짜리 여름휴가가 돼요. 아래 표는 제헌절, 그 아래는 광복절이에요.',
    ],
    more: [{ h2: '광복절(8/14~8/16)에 붙이면', clusters: ['2027-08-15'], star: 4 }],
  },
  {
    slug: '2027/october',
    period: '2027',
    ref: 'lp-oct27',
    name: '2027 10월',
    clusters: ['2027-10-03', '2027-10-09'],
    maxLeave: 4,
    star: 4,
    title: '2027 10월 연휴 연차 쓰기 좋은 날 — 개천절·한글날 연차 0~4일별',
    description: '2027년 개천절·한글날이 모두 주말이라 10/4·10/11(월)이 대체공휴일. 그 사이 10/5~8 연차 4개면 10/2~10/11 10일을 쉬어요.',
    h1: '2027 10월 연휴, 연차 몇 개면 며칠 쉴까',
    intro: [
      '2027년에는 개천절(10월 3일)과 한글날(10월 9일)이 모두 주말이라 10월 4일(월)과 11일(월)이 대체공휴일이에요.',
      '두 연휴 사이 화~금(10월 5~8일)에 연차 4개를 쓰면 10월 2일(토)부터 11일(월)까지 10일을 이어서 쉴 수 있어요.',
    ],
  },
  {
    slug: '2027/yearend',
    period: '2027',
    ref: 'lp-ye27',
    name: '2027 연말',
    clusters: ['2027-12-25'],
    maxLeave: 4,
    star: 4,
    title: '2027 연말 연차 쓰기 좋은 날 — 성탄절 대체공휴일·2028 신정까지',
    description: '2027 성탄절은 토요일이라 12/27(월)이 대체공휴일. 12/28~31 연차 4개면 2028 신정 주말까지 12/25~1/2 9일을 쉬어요.',
    h1: '2027 연말, 연차 몇 개면 며칠 쉴까',
    intro: [
      '2027년 성탄절(12월 25일)은 토요일이라 12월 27일(월)이 대체공휴일이에요. 2028년 신정(1월 1일)도 토요일이에요.',
      '그 사이 화~금(12월 28~31일)에 연차 4개를 쓰면 12월 25일(토)부터 2028년 1월 2일(일)까지 9일을 쉴 수 있어요.',
    ],
  },
  {
    slug: '2026/yearend',
    period: '2026r',
    ref: 'lp-ye26',
    name: '2026 연말',
    clusters: ['2026-12-25', '2027-01-01'],
    maxLeave: 4,
    star: 4,
    title: '2026 연말 연차 쓰기 좋은 날 — 성탄절·신정 연차 0~4일별 최장 연휴',
    description: '2026년 성탄절(12/25)과 신정(1/1)이 모두 금요일이라 12/28~31 연차 4개면 12/25~1/3 10일을 쉬어요. 연차 1~3개일 때 날짜도 정리했어요.',
    h1: '2026 연말, 남은 연차로 며칠 쉴 수 있을까',
    intro: [
      '2026년 성탄절(12월 25일)과 2027년 신정(1월 1일)이 둘 다 금요일이에요. 그 사이에 낀 평일은 12월 28일(월)부터 31일(목)까지 나흘뿐이에요.',
      '이 나흘에 연차 4개를 쓰면 12월 25일(금)부터 1월 3일(일)까지 10일을 이어서 쉴 수 있어요. 남은 연차가 1~3개라면 아래 표에서 가장 긴 날짜를 고르세요.',
    ],
  },
];

const yearOf = (p) => Number(p.period.slice(0, 4));

/** 페이지의 표: 연차 c일마다 덩어리들 중 가장 긴 연휴(같으면 이른 날짜) */
export function pageRows(page, clusterDates = page.clusters) {
  const y = yearOf(page);
  const start = page.period.endsWith('r') ? `${y}-10-02` : `${y}-01-01`;
  const days = buildCalendar({ start, end: D.addDays(`${y}-12-31`, TAIL_DAYS), holidays: HOLIDAYS });
  const tail = days.filter((d) => d.date > `${y}-12-31` && !d.off).map((d) => d.date);
  const all = holidayClusters({ days });
  const picked = clusterDates.map((date) => {
    const c = all.find((k) => k.start <= date && date <= k.end);
    if (!c) throw new Error(`${page.slug}: ${date}이(가) 휴일 덩어리에 없음`);
    return c;
  });
  const tables = picked.map((c) => bestAroundCluster({ days, start: c.start, end: c.end, maxLeave: page.maxLeave, blocked: tail }));
  const rows = tables[0].map((_, k) => tables.map((t) => t[k]).sort((a, b) => b.length - a.length || (a.start < b.start ? -1 : 1))[0]);
  return { days, clusters: picked, rows };
}

export function appLink(page, k, row) {
  const q = new URLSearchParams({ p: page.period, n: String(k), s: 'long' });
  let hash = q.toString();
  if (row.leaveDates.length) hash += `&l=${row.leaveDates.map(D.pack).join('.')}`;
  return `/?ref=${page.ref}#${hash}`;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const range = (a, b) => `${D.md(a)} ~ ${D.md(b)}`;

/** 추천 행(star)의 연휴를 주 단위 미니 달력으로: 휴일 빨강, 연차 진한 초록, 연휴 연한 초록 */
function calendarHtml(days, row) {
  const map = new Map(days.map((d) => [d.date, d]));
  const leave = new Set(row.leaveDates);
  let s = D.addDays(row.start, -D.dow(row.start));
  const last = D.addDays(row.end, 6 - D.dow(row.end));
  const cells = ['일', '월', '화', '수', '목', '금', '토'].map((w) => `<span class="w">${w}</span>`);
  let month = '';
  for (; s <= last; s = D.addDays(s, 1)) {
    if (D.dow(s) === 0 && s.slice(0, 7) !== month) {
      month = s.slice(0, 7);
      cells.push(`<span class="m">${Number(month.slice(0, 4))}년 ${Number(month.slice(5))}월</span>`);
    }
    const d = map.get(s);
    const cls = ['d'];
    if (D.dow(s) === 0) cls.push('sun');
    if (D.dow(s) === 6) cls.push('sat');
    if (d && d.reason === 'holiday') cls.push('hol');
    const inBreak = s >= row.start && s <= row.end;
    if (leave.has(s)) cls.push('lv');
    else if (inBreak) cls.push('br');
    else cls.push('out');
    const label = leave.has(s) ? '연차' : d && d.holidayName ? d.holidayName.replace(/^대체공휴일.*/, '대체') : '';
    cells.push(`<span class="${cls.join(' ')}">${Number(s.slice(8))}${label ? `<small>${esc(label)}</small>` : ''}</span>`);
  }
  return `<div class="cal" role="img" aria-label="${esc(range(row.start, row.end))} ${row.length}일 연휴 달력">${cells.join('')}</div>`;
}

function tableHtml(page, rows, star = page.star, tag = '') {
  const body = rows
    .map((r, k) => {
      const when = r.leaveDates.length ? r.leaveDates.map(D.md).join(', ') : '연차 없이';
      return `<tr${k === star ? ' class="star"' : ''}><td class="n">${k}일</td><td class="len">${r.length}일</td><td>${esc(range(r.start, r.end))}<br><span class="note">${esc(when)}</span></td><td>${k ? `<a href="${esc(appLink(page, k, r))}" data-goatcounter-click="${page.ref}${tag}-row${k}">달력 보기</a>` : ''}</td></tr>`;
    })
    .join('\n');
  return `<div class="card"><table>\n<thead><tr><th>연차</th><th>쉬는 날</th><th>기간 · 연차 쓸 날</th><th></th></tr></thead>\n<tbody>\n${body}\n</tbody></table></div>`;
}

const GC = '<script data-goatcounter="https://yeoncha.goatcounter.com/count" async src="https://gc.zgo.at/count.v5.js" crossorigin="anonymous" integrity="sha384-atnOLvQb9t+jTSipvd75X2yginT4PjVbqDdlJAmxMm+wYElFmeR6EmLP5bYeoRVQ"></script>';
const FONT = '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" integrity="sha384-GIdEBaqGN9mNkDkMkzMHW8EKUqtpPIe/sLj1X7DIrnc9uPtLROJgmuDlh+3rBw0j" crossorigin="anonymous">';

const others = (current) =>
  [`<li><a href="/${HUB.slug}/"${current === `${SITE}/${HUB.slug}/` ? ' aria-current="page"' : ''}>2027 연차 계획</a></li>`, ...PAGES.map((p) => `<li><a href="/${p.slug}/"${current === `${SITE}/${p.slug}/` ? ' aria-current="page"' : ''}>${esc(p.name)} 연휴</a></li>`)].join('');

function renderShell({ url, title, description, h1, crumb, body }) {
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(title)} | 연차각</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:locale" content="ko_KR">
<meta property="og:site_name" content="연차각">
<meta property="og:title" content="${esc(h1)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0f8a5f">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<script src="/assets/host.js?v=0"></script>
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
${FONT}
<link rel="stylesheet" href="/assets/page.css?v=0">
</head>
<body>
<div class="wrap">
<header class="top"><a href="/">연차<span>각</span></a></header>
<main>
<p class="crumb"><a href="/">연차각</a> › ${esc(crumb)}</p>
<h1>${esc(h1)}</h1>
${body}
<h2>다른 연휴</h2>
<ul class="links">${others(url)}</ul>
</main>
<footer>
<p>공휴일 데이터: 월력요항·정부 발표 기준(기준일 ${HOLIDAY_META.updated}). 임시공휴일이 발표되면 갱신해요. 회사마다 휴무 규정이 다를 수 있으니 연차를 쓰기 전에 회사 규정을 확인하세요.</p>
<p><a href="/">연차각 계산기</a> · <a href="/privacy">개인정보 처리방침</a> · <a href="mailto:contact@nangsoon.com">문의 contact@nangsoon.com</a></p>
</footer>
</div>
${GC}
</body>
</html>
`;
}

export function renderPage(page) {
  const { days, rows } = pageRows(page);
  const star = rows[page.star];
  const url = `${SITE}/${page.slug}/`;
  const cta = `/?ref=${page.ref}#p=${page.period}&n=${page.star}&s=long`;
  return renderShell({
    url, title: page.title, description: page.description, h1: page.h1, crumb: `${page.name} 연휴`,
    body: `${page.intro.map((t, i) => `<p${i === 0 ? ' class="lead"' : ''}>${esc(t)}</p>`).join('\n')}
<p class="answer">연차 ${page.star}개 → ${esc(range(star.start, star.end))}, ${star.length}일 연휴</p>
<h2>${esc(page.tableH2 || '연차 개수별 가장 긴 연휴')}</h2>
${tableHtml(page, rows)}
<p class="note">주 5일·빨간 날 쉬는 회사 기준이에요. 같은 길이면 이른 날짜를 보여줘요. 「달력 보기」를 누르면 그 조합이 계산기에 바로 열려요.</p>
<h2>연차 ${page.star}개일 때 달력</h2>
<div class="card">${calendarHtml(days, star)}</div>
${(page.more || []).map((m, i) => { const r = pageRows(page, m.clusters).rows; return `<h2>${esc(m.h2)}</h2>\n${m.intro ? `<p>${esc(m.intro)}</p>\n` : ''}${tableHtml(page, r, m.star, `-s${i + 1}`)}`; }).join('\n')}
<a class="cta" href="${esc(cta)}" data-goatcounter-click="${page.ref}-cta">내 남은 연차로 계산하기 →</a>
<p class="note">빨간 날에도 출근하는 회사라면 이 표가 맞지 않아요. 계산기에서 「공휴일에도 출근해요」를 고르면 다시 계산해요.</p>`,
  });
}

// 2027 허브: 연차 개수별 「긴 휴가 한 번」 추천(앱과 같은 planLeave)
export const HUB = {
  slug: '2027',
  ref: 'lp-hub27',
  budgets: [1, 2, 3, 4, 5, 6, 8, 10, 12, 15],
  title: '2027 연차 계획 — 연차 1~15개별 가장 길게 쉬는 날짜 총정리',
  description: '2027년 연차 1개면 추석 6일, 2개면 9일, 12개면 설·5월·추석·10월 연휴로 37일. 연차 개수별 추천 날짜와 연휴별 정리를 한 페이지에 모았어요.',
  h1: '2027 연차 계획, 연차 개수별로 언제 쓰면 제일 길게 쉴까',
};

export function renderHub() {
  const days = buildCalendar({ start: '2027-01-01', end: D.addDays('2027-12-31', TAIL_DAYS), holidays: HOLIDAYS });
  const tail = days.filter((d) => d.date > '2027-12-31' && !d.off).map((d) => d.date);
  const rows = HUB.budgets
    .map((n) => {
      const plan = planLeave({ days, budget: n, strategy: 'long', blocked: tail });
      const items = plan.breaks.map((b) => `${esc(range(b.start, b.end))} <b>${b.length}일</b> <span class="note">(연차 ${b.leaveCount})</span>`).join('<br>');
      const total = plan.breaks.reduce((a, b) => a + b.length, 0);
      return `<tr${n === 12 ? ' class="star"' : ''}><td class="n">${n}개</td><td>${items}</td><td class="len">${total}일</td><td><a href="/?ref=${HUB.ref}#p=2027&amp;n=${n}&amp;s=long" data-goatcounter-click="${HUB.ref}-n${n}">달력 보기</a></td></tr>`;
    })
    .join('\n');
  const links = PAGES.filter((p) => p.period === '2027').map((p) => `<li><a href="/${p.slug}/">${esc(p.name)} 연휴</a></li>`).join('');
  const url = `${SITE}/${HUB.slug}/`;
  return renderShell({
    url, title: HUB.title, description: HUB.description, h1: HUB.h1, crumb: '2027 연차 계획',
    body: `<p class="lead">2027년은 주 5일 근무 기준으로 쉬는 날이 119일이고, 대체공휴일이 7개예요. 대체공휴일 대부분이 월요일에 붙어서 연차를 조금만 써도 긴 연휴를 만들기 좋은 해예요.</p>
<p class="answer">연차 12개 → 설·5월·추석·10월 연휴로 37일</p>
<h2>연차 개수별 추천 연휴</h2>
<div class="card"><table>
<thead><tr><th>연차</th><th>추천 연휴</th><th>합계</th><th></th></tr></thead>
<tbody>
${rows}
</tbody></table></div>
<p class="note">긴 연휴를 먼저 만드는 「긴 휴가 한 번」 기준이에요. 그래서 연차를 더 써도 합계가 줄어드는 칸이 있어요(짧은 연휴 여러 번 대신 9일짜리를 고르기 때문). 짧은 연휴를 여러 번 원하면 계산기에서 전략을 바꿔 보세요.</p>
<a class="cta" href="/?ref=${HUB.ref}#p=2027&amp;n=12&amp;s=long" data-goatcounter-click="${HUB.ref}-cta">내 연차 개수로 계산하기 →</a>
<h2>2027 연휴별 정리</h2>
<ul class="links">${links}</ul>`,
  });
}

function writeSitemap() {
  const today = D.today();
  const urls = ['/', '/privacy', `/${HUB.slug}/`, ...PAGES.map((p) => `/${p.slug}/`)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`;
  writeFileSync('public/sitemap.xml', xml);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('build-pages.mjs')) {
  for (const page of PAGES) {
    mkdirSync(`public/${page.slug}`, { recursive: true });
    writeFileSync(`public/${page.slug}/index.html`, renderPage(page));
    const { rows } = pageRows(page);
    console.log(`/${page.slug}/  ` + rows.map((r, k) => `${k}:${r.length}일`).join(' '));
  }
  mkdirSync(`public/${HUB.slug}`, { recursive: true });
  writeFileSync(`public/${HUB.slug}/index.html`, renderHub());
  console.log(`/${HUB.slug}/  허브(연차 ${HUB.budgets.join('·')}개)`);
  writeSitemap();
  console.log(`sitemap: ${PAGES.length + 3} URL`);
}
