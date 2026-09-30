// 대표 주소가 아닌 곳(예비 주소 pages.dev, 예전 GitHub Pages)으로 들어오면 대표 주소로 옮긴다.
// 미리보기 배포(해시.yeoncha.pages.dev)는 그대로 둔다.
(function () {
  var h = location.hostname;
  if (h === 'yeoncha.pages.dev' || h === 'nangmansoondae.github.io') {
    location.replace('https://yeoncha.nangsoon.com/' + location.search + location.hash);
  }
})();
