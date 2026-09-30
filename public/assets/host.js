// 예비 주소(yeoncha.pages.dev)로 들어오면 대표 주소로 옮긴다. 미리보기 배포(해시.yeoncha.pages.dev)는 그대로 둔다.
(function () {
  if (location.hostname === 'yeoncha.pages.dev') {
    location.replace('https://yeoncha.nangsoon.com' + location.pathname + location.search + location.hash);
  }
})();
