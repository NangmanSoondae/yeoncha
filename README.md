# 연차각 — 남은 연차로 최장 연휴 계산

남은 연차 일수만 넣으면 주말·공휴일·대체공휴일과 이어 붙여 가장 길게 쉬는 연차 조합을 찾아주는 무료 웹 도구입니다.

- 라이브: https://yeoncha.nangsoon.com/
- 호스팅: Cloudflare Pages(프로젝트 `yeoncha`, 예비 주소 yeoncha.pages.dev → 대표 주소로 이동). `main`에 push하면 자동 배포.
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
| `public/` | **배포되는 사이트 전부** (Cloudflare Pages 빌드 출력 디렉터리) |
| `public/_headers` | 보안 헤더·CSP(전 페이지 공통), pages.dev noindex |
| `public/assets/planner.js` | 추천 엔진 — 예산 제약 가중 구간 스케줄링 DP (의존성 0) |
| `public/assets/holidays.js` | 2026–2027 공휴일 데이터 (월력요항·정부 발표 기준, 출처 포함) |
| `public/assets/app.js` | UI 상태·렌더링·URL 공유 |
| `public/assets/card.js` / `public/assets/ics.js` | 공유 카드 PNG / iCalendar 내보내기 |
| `tests/planner.test.mjs` | 엔진 테스트 (전수 탐색 대조 포함) |

## 개발
```bash
python -m http.server 8123 --directory public   # http://localhost:8123
npm test                     # node --test
```

## 배포 전
브라우저 캐시로 HTML과 JS 버전이 어긋나지 않게, 파일을 바꿨으면 `node tools/bump-version.mjs`로 `?v=` 버전을 올린 뒤 커밋하세요(HTML과 JS 버전이 어긋나지 않게).

## 검색 등록
- 구글 서치콘솔: `https://yeoncha.nangsoon.com/` URL 접두어 속성(nangsoon.com 도메인 속성으로 자동 인증), 사이트맵 제출 완료
- 색인 통보: 배포 후 `node tools/indexnow.mjs` (빙·네이버 IndexNow)

## 공휴일 데이터 갱신
- **현재 수록: 2026–2027년**(+ 연말 연휴 계산용 2028-01-01). 2028년 월력요항(2027년 6월경 발표)이 나오면 2028년을 추가하고 `HOLIDAY_META.years`에 넣어야 합니다. 데이터가 끝난 뒤 접속하면 화면에 「공휴일 데이터를 준비 중」 경고가 뜹니다.
임시공휴일이 지정되면 `public/assets/holidays.js`에 `type: 'temporary'`로 추가하고 `HOLIDAY_META.updated`를 바꿉니다.

## 라이선스
코드 © 2026 NangmanSoondae. 글꼴 Pretendard는 SIL Open Font License 1.1.
