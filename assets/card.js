// 공유용 결과 카드(1080×1350 PNG) — 캔버스로 직접 그림, 외부 라이브러리 없음
import { parse, DOW } from './dates.js?v=202609301933';

const W = 1080;
const H = 1350;
const FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const pad = (n) => String(n).padStart(2, '0');

function dotDate(s) {
  const d = parse(s);
  return `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())} (${DOW[d.getUTCDay()]})`;
}

// 카드에서는 「대체공휴일(개천절)」을 「대체공휴일」로 줄이고 중복 제거
function shortHolidays(names) {
  return [...new Set(names.map((n) => (n.startsWith('대체공휴일') ? '대체공휴일' : n)))];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitText(ctx, text, maxWidth, weight, size) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (ctx.measureText(text).width > maxWidth && s > 20) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  return s;
}

// 동적 서브셋 웹폰트는 쓰는 글자가 속한 조각만 내려받으므로, 카드에 들어갈 글자를 미리 요청
async function ensureFonts(sample) {
  if (!document.fonts || !document.fonts.load) return;
  try {
    await Promise.all([
      document.fonts.load(`800 64px "Pretendard Variable"`, sample),
      document.fonts.load(`600 32px "Pretendard Variable"`, sample),
    ]);
  } catch {
    /* 폰트 실패 시 시스템 폰트로 그림 */
  }
}

export async function renderCard({ periodLabel, leaveUsed, totalOff, breaks, siteUrl }) {
  const rows = breaks.length > 5 ? breaks.slice(0, 4) : breaks;
  const longest = breaks.reduce((m, b) => Math.max(m, b.length), 0);
  const ratio = leaveUsed ? (totalOff / leaveUsed).toFixed(1).replace(/[.]0$/, '') : '0';
  const stats = [`연휴 ${breaks.length}번`, `가장 긴 연휴 ${longest}일`, `연차 1일당 ${ratio}일 휴가`];
  const texts = [
    periodLabel, `연차 ${leaveUsed}일로`, `${totalOff}일 쉰다`, siteUrl, '연차각 내 연차로 계산해 보기 →개 더일', ...stats,
    ...rows.map((b) => `${dotDate(b.start)} – ${dotDate(b.end)} ${b.length}일 연차 ${b.leaveCount}일 ${b.holidayNames.join('·')}`),
  ].join(' ');
  await ensureFonts(texts);

  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#12a06f');
  g.addColorStop(1, '#0a6446');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.arc(W - 90, 150, 230, 0, Math.PI * 2);
  ctx.fill();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(`연차각 · ${periodLabel}`, 80, 120);

  ctx.fillStyle = '#ffffff';
  fitText(ctx, `연차 ${leaveUsed}일로`, W - 160, 800, 92);
  ctx.fillText(`연차 ${leaveUsed}일로`, 80, 250);
  ctx.fillStyle = '#d9ffe9';
  fitText(ctx, `${totalOff}일 쉰다`, W - 160, 800, 150);
  ctx.fillText(`${totalOff}일 쉰다`, 80, 405);

  const px = 60;
  const py = 470;
  const pw = W - px * 2;
  const rowH = 128;
  const ph = Math.max(rows.length, 1) * rowH + (breaks.length > rows.length ? 60 : 0) + 40;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, px, py, pw, ph, 36);
  ctx.fill();

  let y = py + 20;
  rows.forEach((b, i) => {
    if (i > 0) {
      ctx.fillStyle = '#e6ebe7';
      ctx.fillRect(px + 40, y, pw - 80, 2);
    }
    const range = `${dotDate(b.start)} – ${dotDate(b.end)}`;
    ctx.fillStyle = '#1c211d';
    fitText(ctx, range, pw - 280, 800, 44);
    ctx.fillText(range, px + 40, y + 62);
    ctx.fillStyle = '#0f8a5f';
    ctx.font = `800 52px ${FONT}`;
    const len = `${b.length}일`;
    ctx.fillText(len, px + pw - 40 - ctx.measureText(len).width, y + 66);
    const meta = [`연차 ${b.leaveCount}일`, shortHolidays(b.holidayNames).slice(0, 3).join('·')].filter(Boolean).join('  ·  ');
    ctx.fillStyle = '#5d665f';
    fitText(ctx, meta, pw - 80, 600, 30);
    ctx.fillText(meta, px + 40, y + 106);
    y += rowH;
  });
  if (!rows.length) {
    ctx.fillStyle = '#5d665f';
    ctx.font = `600 36px ${FONT}`;
    ctx.fillText('연차를 넣고 다시 계산해 보세요', px + 40, y + 80);
  }
  if (breaks.length > rows.length) {
    ctx.fillStyle = '#5d665f';
    ctx.font = `700 30px ${FONT}`;
    ctx.fillText(`+ ${breaks.length - rows.length}개 더`, px + 40, y + 40);
  }

  // 패널 아래 여백이 넉넉하면 요약 수치를 알약 모양으로 채움
  const panelBottom = py + ph;
  const footTop = H - 190;
  if (breaks.length && footTop - panelBottom >= 150) {
    ctx.font = `700 32px ${FONT}`;
    const padX = 26;
    const gap = 14;
    const pillH = 64;
    let items = stats;
    const width = (list) => list.reduce((w, t) => w + ctx.measureText(t).width + padX * 2, 0) + gap * (list.length - 1);
    if (width(items) > W - 160) items = [stats[0], stats[2]];
    const top = panelBottom + (footTop - panelBottom - pillH) / 2;
    let x = 80;
    for (const t of items) {
      const w = ctx.measureText(t).width + padX * 2;
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      roundRect(ctx, x, top, w, pillH, pillH / 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(t, x + padX, top + 43);
      x += w + gap;
    }
  }

  ctx.fillStyle = '#ffffff';
  ctx.font = `800 40px ${FONT}`;
  ctx.fillText('내 연차로 계산해 보기 →', 80, H - 130);
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  fitText(ctx, siteUrl, W - 160, 600, 32);
  ctx.fillText(siteUrl, 80, H - 80);

  return c;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
