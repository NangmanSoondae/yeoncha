// 0일차 실기기 시험 — 긴 링크(# 뒤)가 온전히 오는지, 이미지 저장, 저장소, 브라우저 기능을 확인한다.
// 외부 요청 없음. innerHTML을 쓰지 않고 textContent로만 그린다. (연차각 CSP: 인라인 스크립트·스타일 금지)
(function () {
  'use strict';
  var NL = String.fromCharCode(10);
  var $ = function (id) { return document.getElementById(id); };
  var UA = navigator.userAgent;
  // 연차각 app.js와 같은 판정(백슬래시 대신 [/] [(] 사용)
  var IN_APP = /KAKAOTALK|Instagram|FBAN|FBAV|Line[/]|NAVER[(]inapp|everytimeApp|DaumApps/i.test(UA);
  var MOBILE = /Android|iPhone|iPad|iPod/i.test(UA);
  var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  var STORE_KEY = 'lab-linktest-v1';
  var saveLog = [];
  var lastSave = '';

  function appName() {
    var list = [['KAKAOTALK', '카카오톡 인앱'], ['Instagram', '인스타그램 인앱'], ['FBAN', '페이스북 인앱'], ['FBAV', '페이스북 인앱'],
      ['Line/', '라인 인앱'], ['NAVER(inapp', '네이버 앱'], ['everytimeApp', '에브리타임 인앱'], ['DaumApps', '다음 앱'],
      ['BAND/', '밴드 인앱'], ['Telegram', '텔레그램'], ['Threads', '스레드 인앱'], ['SamsungBrowser', '삼성 인터넷'],
      ['Whale', '네이버 웨일'], ['CriOS', '크롬(iOS)'], ['FxiOS', '파이어폭스(iOS)'], ['EdgA', '엣지'], ['Firefox', '파이어폭스'], ['Chrome', '크롬 계열']];
    for (var i = 0; i < list.length; i++) if (UA.indexOf(list[i][0]) >= 0) return list[i][1];
    if (/iPhone|iPad/.test(UA) && /Safari/.test(UA)) return '사파리';
    if (/iPhone|iPad/.test(UA)) return 'iOS 앱 안 웹뷰(이름 모름)';
    return '알 수 없음';
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = String(text);
    return e;
  }
  function kv(dl, key, value, state) {
    dl.appendChild(el('dt', null, key));
    dl.appendChild(el('dd', state ? 's-' + state : null, value));
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function stamp() {
    var d = new Date();
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
  }
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }

  // ---------- 저장소(기록) ----------
  var store = null;
  try {
    store = window.localStorage;
    store.setItem('__lt_probe', '1');
    if (store.getItem('__lt_probe') !== '1') store = null;
    else store.removeItem('__lt_probe');
  } catch (e) { store = null; }
  function loadRec() {
    var r = null;
    try { r = JSON.parse((store && store.getItem(STORE_KEY)) || 'null'); } catch (e) { r = null; }
    if (!r || typeof r !== 'object' || !Array.isArray(r.hist)) r = { count: 0, first: stamp(), last: '', hist: [] };
    return r;
  }
  function saveRec(r) {
    if (!store) return false;
    try { store.setItem(STORE_KEY, JSON.stringify(r)); return true; } catch (e) { return false; }
  }

  // ---------- 시험 링크: # 뒤 = 'l' + 모드 + '1.' + 길이 + '.' + 가짜 데이터 + '.end' + 길이 [+ '_'] ----------
  // 가짜 데이터는 길이로 정해지는 의사난수라, 받는 쪽에서 똑같이 다시 만들어 한 글자씩 비교할 수 있다.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function build(n, mode) {
    var head = 'l' + mode + '1.' + n + '.';
    var tail = '.end' + n + (mode === 'u' ? '_' : '');
    var r = rng(n * 7 + (mode === 'u' ? 1 : 0));
    var parts = [];
    for (var i = head.length + tail.length; i < n; i++) parts.push(ALPHA.charAt(Math.floor(r() * 64)));
    return head + parts.join('') + tail;
  }
  function baseUrl() { return location.protocol + '//' + location.host + location.pathname; }

  // ---------- ① 들어온 링크 확인 ----------
  function checkArrival(record) {
    var big = $('arrive-big');
    var dl = $('arrive-detail');
    dl.textContent = '';
    var raw = location.hash ? location.hash.slice(1) : '';
    var href = location.href;
    var hrefHash = href.indexOf('#') >= 0 ? href.slice(href.indexOf('#') + 1) : '';
    var verdict;
    var state;
    var made = 0;
    var mode = 't';
    if (!raw) {
      verdict = '# 뒤 데이터 없음 — ②에서 링크를 만들어 열어 보세요';
      state = 'none';
    } else {
      var m = /^l([tu])1[.]([0-9]{3,5})[.]/.exec(raw);
      if (!m) {
        verdict = '❌ 머리 부분이 깨졌어요 (받은 길이 ' + raw.length + '자)';
        state = 'bad';
      } else {
        mode = m[1];
        made = Number(m[2]);
        var exp = build(made, mode);
        if (raw === exp) {
          verdict = '✅ 온전히 도착 — ' + made.toLocaleString() + '자 전부 일치';
          state = 'ok';
        } else if (exp.indexOf(raw) === 0) {
          verdict = '❌ 끝이 잘림 — ' + raw.length.toLocaleString() + ' / ' + made.toLocaleString() + '자만 도착 (' + (made - raw.length) + '자 빠짐)';
          state = 'bad';
        } else if (raw.indexOf(exp) === 0) {
          verdict = '⚠️ 다 왔지만 뒤에 ' + (raw.length - made) + '자가 덧붙음';
          state = 'warn';
        } else {
          var i = 0;
          while (i < raw.length && raw.charAt(i) === exp.charAt(i)) i++;
          verdict = '❌ 내용이 바뀜 — ' + (i + 1) + '번째 글자부터 다름 (받은 ' + raw.length + '자 / 만든 ' + made + '자)';
          state = 'bad';
        }
      }
    }
    big.className = 'big s-' + state;
    big.textContent = verdict;
    if (raw) {
      if (made) kv(dl, '만든 길이', made.toLocaleString() + '자' + (mode === 'u' ? ' (끝이 _ 인 링크)' : ''));
      kv(dl, '받은 길이(# 뒤)', raw.length.toLocaleString() + '자', state === 'ok' ? 'ok' : state);
      kv(dl, '주소 전체 길이', href.length.toLocaleString() + '자');
      kv(dl, '앞 24자', raw.slice(0, 24));
      kv(dl, '뒤 24자', raw.slice(-24));
      var endMark = made ? '.end' + made : '';
      var hasEnd = !!endMark && raw.indexOf(endMark) >= 0;
      kv(dl, '끝 표시(' + (endMark || '.end…') + ')', hasEnd ? '있음' : '없음', hasEnd ? 'ok' : 'bad');
      if (hrefHash !== raw) kv(dl, '주의', 'location.hash와 주소 값이 달라요(인코딩 변경?)', 'warn');
    }
    kv(dl, '들어온 경로(referrer)', document.referrer ? document.referrer.slice(0, 80) : '(없음)');
    kv(dl, '브라우저 추정', appName());
    if (record && raw) {
      var r = loadRec();
      r.hist.unshift({ t: stamp(), made: made, mode: mode, got: raw.length, v: state, app: appName() });
      r.hist = r.hist.slice(0, 12);
      saveRec(r);
    }
    renderHistory();
  }
  function histLine(h) {
    var mark = h.v === 'ok' ? '✅' : h.v === 'warn' ? '⚠️' : '❌';
    return mark + ' ' + h.t + ' · 만든 ' + (h.made || '?') + '자' + (h.mode === 'u' ? '(_끝)' : '') + ' → 받은 ' + h.got + '자 · ' + h.app;
  }
  function renderHistory() {
    var ol = $('arrive-history');
    ol.textContent = '';
    if (!store) { ol.appendChild(el('li', 's-warn', '저장소가 막혀 기록을 남길 수 없어요')); return; }
    var hist = loadRec().hist;
    if (!hist.length) { ol.appendChild(el('li', null, '아직 없음')); return; }
    hist.forEach(function (h) { ol.appendChild(el('li', h.v === 'ok' ? 's-ok' : h.v === 'warn' ? 's-warn' : 's-bad', histLine(h))); });
  }

  // ---------- ② 링크 만들기·복사·공유 ----------
  var madeLink = '';
  function makeLink(n) {
    var mode = $('end-underscore').checked ? 'u' : 't';
    madeLink = baseUrl() + '#' + build(n, mode);
    $('made-link').value = madeLink;
    $('made-info').textContent = '# 뒤 ' + n.toLocaleString() + '자 링크를 만들었어요 (주소 전체 ' + madeLink.length.toLocaleString() + '자' +
      (mode === 'u' ? ', 끝이 _' : '') + '). 복사하거나 공유해서 카톡 「나와의 채팅」에 보낸 뒤 눌러 보세요.';
    $('open-link').href = madeLink;
    $('copy-link').disabled = false;
    $('share-link').disabled = false;
    var btns = $('len-buttons').querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', String(Number(btns[i].getAttribute('data-len')) === n));
    $('make-log').textContent = '';
  }
  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '0';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { ta.setSelectionRange(0, text.length); } catch (e) { /* 무시 */ }
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok ? 'execCommand' : '';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return 'clipboard API'; }, function () { return fallback(); });
    }
    return Promise.resolve(fallback());
  }

  // ---------- ③ 이미지 저장 ----------
  var imgBlob = null;
  var FONT = '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';
  function drawTestImage() {
    var c = document.createElement('canvas');
    c.width = 600;
    c.height = 750;
    var ctx = c.getContext('2d');
    var g = ctx.createLinearGradient(0, 0, 600, 750);
    g.addColorStop(0, '#fff8e6');
    g.addColorStop(1, '#ffe2a8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 600, 750);
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 14;
    ctx.strokeRect(24, 24, 552, 702);
    ctx.lineWidth = 3;
    ctx.strokeRect(46, 46, 508, 658);
    ctx.fillStyle = '#5a3d00';
    ctx.textAlign = 'center';
    ctx.font = '800 72px ' + FONT;
    ctx.fillText('상  장', 300, 175);
    ctx.font = '800 40px ' + FONT;
    ctx.fillText('저장 성공상', 300, 265);
    ctx.font = '500 26px ' + FONT;
    ctx.fillText('위 기기는 이 이미지를 무사히', 300, 345);
    ctx.fillText('저장했기에 이 상장을 드립니다', 300, 385);
    ctx.fillText('한글 가나다 · 이모지 🎉🏆', 300, 455);
    ctx.font = '600 22px ' + FONT;
    ctx.fillText(new Date().toLocaleString('ko-KR'), 300, 600);
    ctx.fillText('0일차 시험 페이지 · ' + appName(), 300, 640);
    return c;
  }
  function prepareImage() {
    try {
      var c = drawTestImage();
      if (!c.toBlob) { addSave('준비', 'canvas.toBlob 없음 — 이미지 시험 불가', 'bad'); return; }
      c.toBlob(function (b) {
        if (!b) { addSave('준비', '이미지 만들기 실패(toBlob null)', 'bad'); return; }
        imgBlob = b;
        $('img-thumb').src = URL.createObjectURL(b);
        capsShare();
      }, 'image/png');
    } catch (e) {
      addSave('준비', '이미지 그리기 오류: ' + (e && e.name), 'bad');
    }
  }
  function addSave(method, text, state) {
    var line = stamp() + ' [' + method + '] ' + text;
    saveLog.push((state === 'ok' ? '✅ ' : state === 'bad' ? '❌ ' : state === 'warn' ? '⚠️ ' : '· ') + line);
    $('save-log').appendChild(el('li', state ? 's-' + state : null, line));
  }
  function tried(method) {
    lastSave = method;
    $('save-last').textContent = '방금 시도: ' + method;
  }
  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  function showImage(blob) {
    var img = $('img-preview');
    if (img.src && img.src.indexOf('blob:') === 0) URL.revokeObjectURL(img.src);
    img.src = URL.createObjectURL(blob);
    var dlg = $('img-dialog');
    if (dlg.showModal) dlg.showModal();
    else dlg.setAttribute('open', '');
  }
  function pngFile() {
    try { return new File([imgBlob], 'lab-test.png', { type: 'image/png' }); } catch (e) { return null; }
  }
  function shareFile(method) {
    var file = pngFile();
    if (!file || !navigator.canShare || !navigator.canShare({ files: [file] })) {
      addSave(method, '파일 공유 불가(canShare 없음 또는 false)', 'bad');
      return false;
    }
    navigator.share({ files: [file] }).then(function () {
      addSave(method, '공유창 완료(저장 위치는 직접 확인)', 'ok');
    }, function (e) {
      var name = (e && e.name) || '오류';
      addSave(method, name === 'AbortError' ? '공유창 취소(AbortError)' : '공유창 실패: ' + name, name === 'AbortError' ? 'warn' : 'bad');
    });
    addSave(method, '공유창 열기 요청');
    return true;
  }
  // 연차각 onSaveImage와 같은 순서: 모바일·인앱 아님·파일 공유 가능 → 공유창 / 인앱·모바일 → 이미지 띄우기 / PC → 내려받기
  function saveAuto() {
    var method = '연차각 방식';
    tried(method);
    if (!imgBlob) { addSave(method, '이미지가 아직 준비되지 않았어요', 'bad'); return; }
    if (MOBILE && !IN_APP && navigator.canShare) {
      var file = pngFile();
      if (file && navigator.canShare({ files: [file] })) {
        addSave(method, '→ 공유창(파일)');
        navigator.share({ files: [file] }).then(function () {
          addSave(method, '공유창 완료', 'ok');
        }, function (e) {
          if (!e || e.name !== 'AbortError') { addSave(method, '공유창 실패(' + (e && e.name) + ') → 이미지 띄우기', 'warn'); showImage(imgBlob); }
          else addSave(method, '공유창 취소(AbortError)', 'warn');
        });
        return;
      }
    }
    if (IN_APP || MOBILE) { addSave(method, '→ 이미지 띄우기(길게 눌러 저장)' + (IN_APP ? ' · 인앱으로 판정' : '')); showImage(imgBlob); return; }
    download(imgBlob, 'lab-test.png');
    addSave(method, '→ 파일 내려받기 실행');
  }

  // ---------- ④ 저장소 ----------
  function storageTest() {
    var dl = $('storage');
    dl.textContent = '';
    if (!store) {
      kv(dl, 'localStorage 쓰기·읽기', '❌ 막힘 또는 값이 안 남음', 'bad');
    } else {
      kv(dl, 'localStorage 쓰기·읽기', '✅ 됨', 'ok');
      var r = loadRec();
      var prev = r.last;
      r.count += 1;
      r.last = stamp();
      var ok = saveRec(r) && loadRec().count === r.count;
      kv(dl, '이 브라우저에서 이 페이지를 연 횟수', r.count + '회' + (prev ? ' (지난번 ' + prev + ', 처음 ' + r.first + ')' : ' (처음)'), ok ? (r.count > 1 ? 'ok' : null) : 'bad');
      if (r.count === 1) kv(dl, '다음 할 일', '카톡 인앱 창을 완전히 닫고, 채팅방에서 같은 링크를 다시 눌러 보세요. 횟수가 2로 늘면 인앱에서도 저장소가 남는 거예요.');
    }
    var ss = false;
    try { sessionStorage.setItem('__lt', '1'); ss = sessionStorage.getItem('__lt') === '1'; sessionStorage.removeItem('__lt'); } catch (e) { ss = false; }
    kv(dl, 'sessionStorage', ss ? '✅ 됨' : '❌ 안 됨', ss ? 'ok' : 'bad');
    kv(dl, '쿠키 허용', navigator.cookieEnabled ? '예' : '아니오');
    var idbRow = el('dd', null, '확인 중…');
    dl.appendChild(el('dt', null, 'IndexedDB 열기'));
    dl.appendChild(idbRow);
    var done = false;
    function idb(ok, msg) { if (done) return; done = true; idbRow.textContent = msg; idbRow.className = ok ? 's-ok' : 's-bad'; }
    try {
      var req = indexedDB.open('lab-linktest', 1);
      req.onsuccess = function () { try { req.result.close(); } catch (e) { /* 무시 */ } idb(true, '✅ 됨'); };
      req.onerror = function () { idb(false, '❌ 오류 ' + ((req.error && req.error.name) || '')); };
      setTimeout(function () { idb(false, '❌ 3초 안에 응답 없음'); }, 3000);
    } catch (e) { idb(false, '❌ 없음 ' + (e && e.name)); }
  }

  // ---------- ⑤ 브라우저 기능 ----------
  function streamTo(u8, ts) {
    return new Response(new Blob([u8]).stream().pipeThrough(ts)).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function capsTest() {
    var dl = $('caps');
    ['deflate', 'deflate-raw', 'gzip'].forEach(function (fmt) {
      var ok = false;
      try { new CompressionStream(fmt); new DecompressionStream(fmt); ok = true; } catch (e) { ok = false; }
      kv(dl, '압축 ' + fmt, ok ? '✅ 지원' : '❌ 없음', ok ? 'ok' : 'bad');
    });
    var trip = el('dd', null, '확인 중…');
    dl.appendChild(el('dt', null, 'deflate 한글 왕복'));
    dl.appendChild(trip);
    try {
      var src = new Array(41).join('우리 모임 시상식 🎉 칭찬 ');
      var u8 = new TextEncoder().encode(src);
      streamTo(u8, new CompressionStream('deflate')).then(function (z) {
        return streamTo(z, new DecompressionStream('deflate')).then(function (back) {
          var ok = new TextDecoder().decode(back) === src;
          trip.textContent = ok ? '✅ ' + u8.length + 'B → ' + z.length + 'B → 원래대로' : '❌ 값이 달라요';
          trip.className = ok ? 's-ok' : 's-bad';
        });
      }).catch(function (e) { trip.textContent = '❌ ' + ((e && e.name) || '오류'); trip.className = 's-bad'; });
    } catch (e) { trip.textContent = '❌ ' + ((e && e.name) || '오류'); trip.className = 's-bad'; }

    var cr = el('dd', null, '확인 중…');
    dl.appendChild(el('dt', null, '암호화 ECDH+AES-GCM (2단계 투표용)'));
    dl.appendChild(cr);
    try {
      var s = crypto.subtle;
      var P = { name: 'ECDH', namedCurve: 'P-256' };
      var A = { name: 'AES-GCM', length: 256 };
      var iv = crypto.getRandomValues(new Uint8Array(12));
      Promise.all([s.generateKey(P, false, ['deriveKey']), s.generateKey(P, false, ['deriveKey'])]).then(function (ks) {
        return Promise.all([
          s.deriveKey({ name: 'ECDH', public: ks[1].publicKey }, ks[0].privateKey, A, false, ['encrypt', 'decrypt']),
          s.deriveKey({ name: 'ECDH', public: ks[0].publicKey }, ks[1].privateKey, A, false, ['encrypt', 'decrypt']),
        ]);
      }).then(function (k) {
        return s.encrypt({ name: 'AES-GCM', iv: iv }, k[0], new TextEncoder().encode('투표 시험')).then(function (ct) {
          return s.decrypt({ name: 'AES-GCM', iv: iv }, k[1], ct);
        });
      }).then(function (pt) {
        var ok = new TextDecoder().decode(pt) === '투표 시험';
        cr.textContent = ok ? '✅ 됨' : '❌ 값이 달라요';
        cr.className = ok ? 's-ok' : 's-bad';
      }).catch(function (e) { cr.textContent = '❌ ' + ((e && e.name) || '오류'); cr.className = 's-bad'; });
    } catch (e) { cr.textContent = '❌ 없음 ' + ((e && e.name) || ''); cr.className = 's-bad'; }

    kv(dl, '공유 기능(navigator.share)', navigator.share ? '✅ 있음' : '❌ 없음', navigator.share ? 'ok' : 'bad');
    kv(dl, '클립보드 API', navigator.clipboard && navigator.clipboard.writeText ? '✅ 있음' : '❌ 없음(대체 복사 사용)', navigator.clipboard ? 'ok' : 'warn');
    var dlg = $('img-dialog');
    kv(dl, '팝업 창(dialog.showModal)', dlg.showModal ? '✅ 있음' : '❌ 없음', dlg.showModal ? 'ok' : 'warn');
    kv(dl, '글자 단위 세기(Intl.Segmenter)', typeof Intl !== 'undefined' && Intl.Segmenter ? '✅ 있음' : '❌ 없음', Intl.Segmenter ? 'ok' : 'warn');
    kv(dl, '보안 연결(isSecureContext)', window.isSecureContext ? '예' : '아니오');
  }
  function capsShare() {
    var file = pngFile();
    var ok = false;
    try { ok = !!(file && navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { ok = false; }
    kv($('caps'), '이미지 파일 공유(canShare files)', ok ? '✅ 가능' : '❌ 불가', ok ? 'ok' : 'warn');
  }

  // ---------- ⑥ 기기 정보 ----------
  function envInfo() {
    $('ua').textContent = UA;
    var dl = $('env');
    kv(dl, '브라우저 추정', appName());
    kv(dl, '연차각 인앱 판정(IN_APP)', IN_APP ? '예 → 저장은 「이미지 띄우기」로' : '아니오');
    kv(dl, '모바일 판정', MOBILE ? '예' : '아니오');
    kv(dl, '화면', screen.width + '×' + screen.height + ' · 창 ' + window.innerWidth + '×' + window.innerHeight + ' · 배율 ' + (window.devicePixelRatio || 1));
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { tz = '?'; }
    kv(dl, '시간대·언어', tz + ' · ' + (navigator.language || '?'));
  }

  // ---------- 결과 복사 ----------
  function dlText(id) {
    var dl = $(id);
    var out = [];
    var dts = dl.querySelectorAll('dt');
    for (var i = 0; i < dts.length; i++) {
      var dd = dts[i].nextElementSibling;
      out.push('- ' + dts[i].textContent + ': ' + (dd ? dd.textContent : ''));
    }
    return out;
  }
  function buildReport() {
    var lines = ['[0일차 시험 결과] ' + new Date().toLocaleString('ko-KR'), '브라우저: ' + appName() + (IN_APP ? ' (인앱)' : ''), 'UA: ' + UA, ''];
    lines.push('## ① 지금 연 링크: ' + $('arrive-big').textContent);
    lines = lines.concat(dlText('arrive-detail'));
    lines.push('', '## ① 지금까지 연 시험 링크');
    var hist = store ? loadRec().hist : [];
    if (!hist.length) lines.push('- 없음');
    hist.forEach(function (h) { lines.push('- ' + histLine(h)); });
    lines.push('', '## ③ 이미지 저장');
    if (!saveLog.length) lines.push('- 시도 안 함');
    saveLog.forEach(function (s) { lines.push('- ' + s); });
    lines.push('', '## ④ 저장소');
    lines = lines.concat(dlText('storage'));
    lines.push('', '## ⑤ 브라우저 기능');
    lines = lines.concat(dlText('caps'));
    lines.push('', '## ⑥ 기기');
    lines = lines.concat(dlText('env'));
    return lines.join(NL);
  }

  // ---------- 연결 ----------
  function bind() {
    $('len-buttons').addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-len]') : null;
      if (b) makeLink(Number(b.getAttribute('data-len')));
    });
    $('end-underscore').addEventListener('change', function () {
      var on = $('len-buttons').querySelector('button[aria-pressed="true"]');
      if (on) makeLink(Number(on.getAttribute('data-len')));
    });
    $('copy-link').addEventListener('click', function () {
      if (!madeLink) return;
      copyText(madeLink).then(function (how) {
        $('make-log').textContent = how ? '복사됨(' + how + ', ' + madeLink.length.toLocaleString() + '자)' : '복사 실패 — 위 칸을 길게 눌러 전체 선택 후 복사해 주세요';
        toast(how ? '링크를 복사했어요. 카톡 「나와의 채팅」에 붙여 넣으세요' : '복사하지 못했어요');
      });
    });
    $('share-link').addEventListener('click', function () {
      if (!madeLink) return;
      if (!navigator.share) {
        $('make-log').textContent = '이 브라우저는 공유 기능이 없어요 → 「링크 복사」를 써 주세요';
        return;
      }
      navigator.share({ url: madeLink }).then(function () {
        $('make-log').textContent = '공유창 완료';
      }, function (e) {
        $('make-log').textContent = '공유창 ' + ((e && e.name) === 'AbortError' ? '취소' : '실패: ' + ((e && e.name) || '오류'));
      });
    });
    $('made-link').addEventListener('focus', function () { this.select(); });
    $('save-auto').addEventListener('click', saveAuto);
    $('save-share').addEventListener('click', function () {
      tried('공유창');
      if (!imgBlob) { addSave('공유창', '이미지 준비 전', 'bad'); return; }
      shareFile('공유창');
    });
    $('save-download').addEventListener('click', function () {
      tried('내려받기');
      if (!imgBlob) { addSave('내려받기', '이미지 준비 전', 'bad'); return; }
      try { download(imgBlob, 'lab-test.png'); addSave('내려받기', 'a[download] 클릭 실행'); } catch (e) { addSave('내려받기', '오류 ' + (e && e.name), 'bad'); }
    });
    $('save-show').addEventListener('click', function () {
      tried('이미지 띄우기');
      if (!imgBlob) { addSave('이미지 띄우기', '이미지 준비 전', 'bad'); return; }
      showImage(imgBlob);
      addSave('이미지 띄우기', '띄움 — 길게 눌러 저장해 보세요');
    });
    $('save-yes').addEventListener('click', function () {
      if (!lastSave) return toast('먼저 저장 버튼 하나를 눌러 주세요');
      addSave(lastSave, '사람 확인: 저장됐어요', 'ok');
    });
    $('save-no').addEventListener('click', function () {
      if (!lastSave) return toast('먼저 저장 버튼 하나를 눌러 주세요');
      addSave(lastSave, '사람 확인: 안 됐어요', 'bad');
    });
    $('img-close').addEventListener('click', function () {
      var dlg = $('img-dialog');
      if (dlg.close) dlg.close();
      else dlg.removeAttribute('open');
    });
    $('store-clear').addEventListener('click', function () {
      try { if (store) store.removeItem(STORE_KEY); } catch (e) { /* 무시 */ }
      renderHistory();
      storageTest();
      toast('이 페이지 기록을 지웠어요');
    });
    $('copy-report').addEventListener('click', function () {
      var text = buildReport();
      copyText(text).then(function (how) {
        toast(how ? '결과를 복사했어요. PM에게 붙여 넣어 주세요' : '복사하지 못했어요');
        if (!how) {
          $('made-link').value = text;
          $('made-info').textContent = '복사가 막혀 결과를 위 ② 칸에 넣었어요. 길게 눌러 전체 선택 후 복사해 주세요.';
        }
      });
    });
    window.addEventListener('hashchange', function () { checkArrival(true); });
  }

  function init() {
    envInfo();
    storageTest();
    checkArrival(true);
    capsTest();
    prepareImage();
    bind();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
