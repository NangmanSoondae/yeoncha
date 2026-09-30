# 연차각 — 남은 연차로 최장 연휴 계산

남은 연차 일수만 넣으면 주말·공휴일·대체공휴일과 이어 붙여 가장 길게 쉬는 연차 조합을 찾아주는 무료 웹 도구입니다.

- 라이브: https://nangmansoondae.github.io/yeoncha/
- 서버·DB 없음. 모든 계산은 브라우저 안에서 하고, 입력값은 저장하지 않습니다(공유 링크 주소에만 담김).

## 기능
- 기간: 올해 남은 기간 / 내년 전체 (현재 데이터: 2026–2027)
- 근무 형태: 공휴일에 쉼 / 공휴일에도 출근(5인 미만 등 — 노동절만 휴무)
- 전략: 긴 휴가 한 번 / 적당히 골고루 / 쉬는 날 최대로
- 가성비 좋은 연휴 목록, 달력에서 직접 연차·못 쉬는 날 지정
- 공유 카드 이미지(PNG), 결과 재현 링크, 캘린더(.ics) 내보내기

## 구조
| 파일 | 역할 |
|---|---|
| `assets/planner.js` | 추천 엔진 — 예산 제약 가중 구간 스케줄링 DP (의존성 0) |
| `assets/holidays.js` | 2026–2027 공휴일 데이터 (월력요항·정부 발표 기준, 출처 포함) |
| `assets/app.js` | UI 상태·렌더링·URL 공유 |
| `assets/card.js` / `assets/ics.js` | 공유 카드 PNG / iCalendar 내보내기 |
| `tests/planner.test.mjs` | 엔진 테스트 (전수 탐색 대조 포함) |

## 개발
```bash
python -m http.server 8123   # http://localhost:8123
npm test                     # node --test
```

## 공휴일 데이터 갱신
임시공휴일이 지정되면 `assets/holidays.js`에 `type: 'temporary'`로 추가하고 `HOLIDAY_META.updated`를 바꿉니다.

## 라이선스
코드 © 2026 NangmanSoondae. 글꼴 Pretendard는 SIL Open Font License 1.1.
