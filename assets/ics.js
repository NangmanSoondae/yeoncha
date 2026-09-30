// 결과를 iCalendar(.ics) 파일로 — 구글·애플·아웃룩 캘린더에서 가져오기 가능
import { addDays } from './dates.js?v=202609301742';

const enc = new TextEncoder();

// RFC 5545: 한 줄 75옥텟 제한 → 멀티바이트 문자가 잘리지 않게 접기
function fold(line) {
  const out = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const ymd = (s) => s.replaceAll('-', '');

export function buildIcs(breaks, { url, md }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//yeoncha//yeoncha planner//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  for (const b of breaks) {
    const leaves = b.leaveDates.map(md).join(', ');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ymd(b.start)}-${ymd(b.end)}-${b.leaveCount}@nangmansoondae.github.io`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(b.start)}`,
      `DTEND;VALUE=DATE:${ymd(addDays(b.end, 1))}`,
      `SUMMARY:${esc(`휴가 ${b.length}일 (연차 ${b.leaveCount}일)`)}`,
      `DESCRIPTION:${esc(`연차 쓰는 날: ${leaves}\n연차각에서 계획함: ${url}`)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
