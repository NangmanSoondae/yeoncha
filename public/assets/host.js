// 예비 주소(yeoncha.pages.dev)로 들어오면 대표 주소로 옮긴다. 미리보기 배포(해시.yeoncha.pages.dev)는 그대로 둔다.
(function () {
  if (location.hostname === 'yeoncha.pages.dev') {
    location.replace('https://yeoncha.nangsoon.com' + location.pathname + location.search + location.hash);
  }
})();

// Meta 링크 검사기(referrer facebook.com, 미국 서버의 윈도 크롬)가 스레드에 링크를 올릴 때마다 페이지를 실행해 방문으로 잡힌다.
// 페이스북에는 링크를 올리지 않으므로, 페이스북에서 왔는데 한국 시간대가 아니면 집계하지 않는다. (count.js보다 먼저 실행돼야 함)
(function () {
  try {
    var fb = /(^|\.)facebook\.com$/.test(new URL(document.referrer).hostname);
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (fb && tz !== 'Asia/Seoul') window.goatcounter = { no_onload: true, skip: true };
  } catch (e) {
    /* referrer 없음 */
  }
})();
