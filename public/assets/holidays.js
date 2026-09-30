// 한국 공휴일 데이터 (2026–2027) — 리서치 리드 검증 2026-09-30
// type: public(관공서 공휴일) · substitute(대체공휴일) · temporary(임시공휴일) · labor(노동절: 5인 미만도 유급휴일) · election(선거일)
export const HOLIDAYS = {
  '2026-01-01': { name: '신정', type: 'public' }, // 목
  '2026-02-16': { name: '설날 연휴', type: 'public' }, // 월
  '2026-02-17': { name: '설날', type: 'public' }, // 화
  '2026-02-18': { name: '설날 연휴', type: 'public' }, // 수
  '2026-03-01': { name: '삼일절', type: 'public' }, // 일
  '2026-03-02': { name: '대체공휴일(삼일절)', type: 'substitute' }, // 월
  '2026-05-01': { name: '노동절', type: 'labor' }, // 금
  '2026-05-05': { name: '어린이날', type: 'public' }, // 화
  '2026-05-24': { name: '부처님오신날', type: 'public' }, // 일
  '2026-05-25': { name: '대체공휴일(부처님오신날)', type: 'substitute' }, // 월
  '2026-06-03': { name: '제9회 전국동시지방선거', type: 'election' }, // 수
  '2026-06-06': { name: '현충일', type: 'public' }, // 토, 대체 없음
  '2026-07-17': { name: '제헌절', type: 'public' }, // 금
  '2026-08-15': { name: '광복절', type: 'public' }, // 토
  '2026-08-17': { name: '대체공휴일(광복절)', type: 'substitute' }, // 월
  '2026-09-24': { name: '추석 연휴', type: 'public' }, // 목
  '2026-09-25': { name: '추석', type: 'public' }, // 금
  '2026-09-26': { name: '추석 연휴', type: 'public' }, // 토, 대체 없음
  '2026-10-03': { name: '개천절', type: 'public' }, // 토
  '2026-10-05': { name: '대체공휴일(개천절)', type: 'substitute' }, // 월
  '2026-10-09': { name: '한글날', type: 'public' }, // 금
  '2026-12-25': { name: '성탄절', type: 'public' }, // 금
  '2027-01-01': { name: '신정', type: 'public' }, // 금
  '2027-02-06': { name: '설날 연휴', type: 'public' }, // 토
  '2027-02-07': { name: '설날', type: 'public' }, // 일
  '2027-02-08': { name: '설날 연휴', type: 'public' }, // 월
  '2027-02-09': { name: '대체공휴일(설날)', type: 'substitute' }, // 화
  '2027-03-01': { name: '삼일절', type: 'public' }, // 월
  '2027-05-01': { name: '노동절', type: 'labor' }, // 토
  '2027-05-03': { name: '대체공휴일(노동절)', type: 'substitute' }, // 월
  '2027-05-05': { name: '어린이날', type: 'public' }, // 수
  '2027-05-13': { name: '부처님오신날', type: 'public' }, // 목
  '2027-06-06': { name: '현충일', type: 'public' }, // 일, 대체 없음
  '2027-07-17': { name: '제헌절', type: 'public' }, // 토
  '2027-07-19': { name: '대체공휴일(제헌절)', type: 'substitute' }, // 월
  '2027-08-15': { name: '광복절', type: 'public' }, // 일
  '2027-08-16': { name: '대체공휴일(광복절)', type: 'substitute' }, // 월
  '2027-09-14': { name: '추석 연휴', type: 'public' }, // 화
  '2027-09-15': { name: '추석', type: 'public' }, // 수
  '2027-09-16': { name: '추석 연휴', type: 'public' }, // 목
  '2027-10-03': { name: '개천절', type: 'public' }, // 일
  '2027-10-04': { name: '대체공휴일(개천절)', type: 'substitute' }, // 월
  '2027-10-09': { name: '한글날', type: 'public' }, // 토
  '2027-10-11': { name: '대체공휴일(한글날)', type: 'substitute' }, // 월
  '2027-12-25': { name: '성탄절', type: 'public' }, // 토
  '2027-12-27': { name: '대체공휴일(성탄절)', type: 'substitute' }, // 월
  // 2027년 연말 연휴가 해를 넘길 때 계산용(신정은 매년 1/1 고정)
  '2028-01-01': { name: '신정', type: 'public' }, // 토
};

export const HOLIDAY_META = {
  updated: '2026-09-30',
  years: [2026, 2027],
  note: '임시공휴일은 발표 시 갱신. 2027년은 우주항공청 2027 월력요항(2026-06-29) 기준.',
  sources: [
    { title: '뉴시스: 관공서 공휴일 규정 개정 의결(2026-04-28)', url: 'https://mobile.newsis.com/view/NISX20260428_0003608893' },
    { title: '머니투데이: 노동절·제헌절 공휴일(2026-04-28)', url: 'https://www.mt.co.kr/policy/2026/04/28/2026042808250174216' },
    { title: '한국경제: 5월 1일 공무원도 쉰다(2026-04-06)', url: 'https://www.hankyung.com/article/2026040625351' },
    { title: '헤럴드경제: 2027년 휴일 119일(2026-06-28)', url: 'https://www.heraldk.com/article/2026062816450881349' },
    { title: '시프티: 2027년 연휴 총정리', url: 'https://shiftee.io/ko/blog/article/2027-public-holiday-calendar-holiday-pay-guide' },
    { title: '시프티: 2026년 공휴일 정리', url: 'https://shiftee.io/ko/blog/article/2026-public-holidays-annual-leave-hr' },
    { title: '위키트리: 9월 28일 임시공휴일 불발(2026-09-24)', url: 'https://www.wikitree.co.kr/articles/1161815' },
    { title: '헤럴드경제: 노동절 유급휴일(2026-04-15)', url: 'https://www.heraldk.com/article/2026041513460749370' },
    { title: 'YTN: 5인 미만 대체공휴일 적용 제외', url: 'https://www.ytn.co.kr/_ln/0103_202106291727361744' },
  ],
};
