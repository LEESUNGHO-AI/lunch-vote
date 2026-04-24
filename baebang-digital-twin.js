/**
 * 아산이노베이션 스퀘어 — 인터랙티브 3D 디지털 트윈 v5
 * 마우스/터치 드래그: 상하좌우 회전
 * 스크롤: 줌 인/아웃
 */
(function(){
'use strict';

// ── 뷰 파라미터 (드래그로 변경됨) ──
var azimuth = 0.52;    // 좌우 회전 (라디안, 초기: ~30도)
var elevation = 0.38;  // 상하 기울기 (라디안, 약간 평평하게)
var scale = 7.5;       // 줌 (12→7.5, 전체 건물이 화면에 여유있게)
var panX = 350, panY = 250; // 중심점 (120→250, viewBox 중앙)
var WH = 2.2, GAP = 5.5, BW = 22.2, BD = 21.35;

// ── 3D → 2D 투영 (회전 가능) ──
function iso(x, y, z) {
  var ca = Math.cos(azimuth), sa = Math.sin(azimuth);
  var ce = Math.cos(elevation), se = Math.sin(elevation);
  // 회전 적용
  var rx = x * ca - z * sa;
  var rz = x * sa + z * ca;
  // 투영
  var px = panX + rx * scale;
  var py = panY + rz * scale * se - y * scale * ce * 1.4;
  return [px, py];
}

function pp(pts) {
  var d = '';
  for (var i = 0; i < pts.length; i++)
    d += (i ? 'L' : 'M') + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1);
  return d + 'Z';
}

// ── 실 데이터 ──
var RM = {
B1: [
  {n:'창고',x:0,z:3.15,w:5.8,d:3.15,c:'#475569',p:0,s:'-',t:20,a:16.3},
  {n:'방송실',x:0,z:0,w:5.8,d:3.15,c:'#475569',p:0,s:'대기',t:21.5,a:8.5},
  {n:'로비',x:6.1,z:0,w:10,d:6.3,c:'#94a3b8',p:8,s:'개방',t:22,a:70.8},
  {n:'라운지',x:0,z:6.3,w:6.1,d:6.3,c:'#06b6d4',p:12,s:'개방',t:22,a:41},
  {n:'MAIN HALL',x:6.1,z:6.3,w:10,d:6.3,c:'#f59e0b',p:45,s:'행사중',t:23.1,a:89.4},
  {n:'회의실',x:16.1,z:6.3,w:6.1,d:5.6,c:'#8b5cf6',p:8,s:'사용중',t:22.8,a:42.5},
  {n:'장비실',x:16.1,z:11.9,w:6.1,d:3.8,c:'#64748b',p:0,s:'정상',t:19.2,a:17.1},
  {n:'무인매장',x:0,z:12.6,w:6.1,d:5.5,c:'#22c55e',p:6,s:'영업중',t:21.5,a:51.6},
  {n:'LED WALL',x:6.1,z:12.6,w:5.6,d:2,c:'#ef4444',p:0,s:'가동',t:24,a:5.6},
  {n:'운영사무실',x:16.1,z:15.7,w:6.1,d:5.65,c:'#00b8e6',p:3,s:'운영중',t:22.5,a:37.3}
],
B2: [
  {n:'홀',x:0,z:0,w:6.1,d:6.3,c:'#94a3b8',p:4,s:'개방',t:22,a:36.7},
  {n:'대회의실',x:6.1,z:0,w:10,d:6.3,c:'#00b8e6',p:0,s:'예약가능',t:22,a:38.9},
  {n:'오픈스튜디오',x:0,z:6.3,w:6.1,d:6.3,c:'#f59e0b',p:5,s:'사용중',t:22.5,a:39.3},
  {n:'오픈휴게공간',x:0,z:12.6,w:12,d:8.75,c:'#06b6d4',p:18,s:'개방',t:22,a:120.4},
  {n:'공유오피스 8인',x:16.1,z:3.3,w:6.1,d:4.2,c:'#8b5cf6',p:8,s:'만실',t:22.5,a:39},
  {n:'오피스 A',x:16.1,z:7.5,w:6.1,d:3.2,c:'#8b5cf6',p:2,s:'이용중',t:22.2,a:19.7},
  {n:'오피스 B',x:16.1,z:10.7,w:6.1,d:3.2,c:'#8b5cf6',p:1,s:'여유',t:22,a:18.7},
  {n:'오피스 C',x:16.1,z:13.9,w:6.1,d:3.2,c:'#8b5cf6',p:0,s:'예약가능',t:21.8,a:20.6},
  {n:'전관',x:0,z:18,w:6.1,d:3.35,c:'#475569',p:0,s:'-',t:20.5,a:26.4}
]};

var vw = 'ALL';
var dragging = false, lastX = 0, lastY = 0;

window._initDigitalTwin = function() {
  var ct = document.getElementById('bbDigitalTwin');
  if (!ct) return;
  ct.style.width = '100%';
  ct.style.height = '100%';
  ct.style.minHeight = '380px';
  ct.style.background = '#07090f';
  ct.style.position = 'relative';
  ct.style.overflow = 'hidden';
  ct.style.cursor = 'grab';
  ct.style.touchAction = 'none';

  draw(ct);

  // ── 마우스 드래그: 회전 ──
  ct.addEventListener('mousedown', function(e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    ct.style.cursor = 'grabbing';
    e.preventDefault();
  });
  window.addEventListener('mousemove', function(e) {
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    azimuth += dx * 0.008;
    elevation = Math.max(0.15, Math.min(1.2, elevation + dy * 0.005));
    lastX = e.clientX; lastY = e.clientY;
    draw(ct);
  });
  window.addEventListener('mouseup', function() {
    dragging = false; ct.style.cursor = 'grab';
  });

  // ── 터치 드래그 ──
  ct.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
      dragging = true;
      lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    }
  }, {passive: false});
  ct.addEventListener('touchmove', function(e) {
    if (!dragging || e.touches.length !== 1) return;
    var dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
    azimuth += dx * 0.008;
    elevation = Math.max(0.15, Math.min(1.2, elevation + dy * 0.005));
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    draw(ct);
    e.preventDefault();
  }, {passive: false});
  ct.addEventListener('touchend', function() { dragging = false; });

  // ── 스크롤: 줌 ──
  ct.addEventListener('wheel', function(e) {
    scale = Math.max(5, Math.min(22, scale - e.deltaY * 0.01));
    draw(ct);
    e.preventDefault();
  }, {passive: false});

  if (!window._dtT) window._dtT = setInterval(function() { sim(); draw(ct); }, 6000);
};

window._dtV = function(v) { vw = v; var ct = document.getElementById('bbDigitalTwin'); if (ct) draw(ct); };

function draw(ct) {
  var tp = 0, n = 0, tt = 0;
  if (vw !== 'B2') for (var i = 0; i < RM.B1.length; i++) { tp += RM.B1[i].p; tt += RM.B1[i].t; n++; }
  if (vw !== 'B1') for (var i = 0; i < RM.B2.length; i++) { tp += RM.B2[i].p; tt += RM.B2[i].t; n++; }
  var at = n ? (tt / n).toFixed(1) : '--';
  var deg = Math.round(azimuth * 180 / Math.PI) % 360;

  var s = '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 700 500" preserveAspectRatio="xMidYMid meet" style="background:#07090f;">';
  s += '<style>.rm:hover .rt{fill-opacity:.5!important}.rm:hover .rw{fill-opacity:.4!important}.rm:hover .re{stroke-opacity:1!important;stroke-width:1.5!important}.rm{cursor:pointer}.pu{animation:dp 1.5s infinite}@keyframes dp{0%,100%{opacity:1}50%{opacity:.3}}</style>';

  // Title + controls
  s += '<text x="350" y="18" text-anchor="middle" font-size="12" font-weight="700" fill="#e2e8f0" font-family="monospace">DIGITAL TWIN — 아산이노베이션 스퀘어</text>';
  s += '<text x="350" y="31" text-anchor="middle" font-size="8" fill="#64748b" font-family="monospace">22.2m × 21.35m | 드래그: 회전 | 스크롤: 줌</text>';

  // Stats
  s += '<text x="10" y="20" font-size="9" fill="#475569" font-family="monospace">재실</text>';
  s += '<text x="10" y="32" font-size="14" font-weight="700" fill="#00e5b0" font-family="monospace">' + tp + '명</text>';
  s += '<text x="60" y="20" font-size="9" fill="#475569" font-family="monospace">온도</text>';
  s += '<text x="60" y="32" font-size="14" font-weight="700" fill="#00b8e6" font-family="monospace">' + at + '°C</text>';
  s += '<text x="110" y="20" font-size="9" fill="#475569" font-family="monospace">각도</text>';
  s += '<text x="110" y="32" font-size="14" font-weight="700" fill="#f59e0b" font-family="monospace">' + deg + '°</text>';

  // View buttons
  s += svgBtn('분리뷰', 'ALL', 540, 8);
  s += svgBtn('B1', 'B1', 590, 8);
  s += svgBtn('B2', 'B2', 625, 8);
  s += svgBtn('리셋', 'RESET', 660, 8);

  // Grid floor
  s += drawGrid();

  // Floors
  if (vw !== 'B2') { s += floorSvg('B1', 0); s += floorLbl('B1 — 운영·행사', 0, '#00e5b0'); }
  if (vw !== 'B1') { var by = vw === 'B2' ? 0 : (WH + GAP); s += floorSvg('B2', by); s += floorLbl('B2 — 공유오피스', by, '#00b8e6'); }

  // Legend
  s += '<circle cx="220" cy="490" r="3" fill="#22c55e"/><text x="228" y="493" font-size="7" fill="#64748b" font-family="monospace">운영</text>';
  s += '<circle cx="260" cy="490" r="3" fill="#f59e0b"/><text x="268" y="493" font-size="7" fill="#64748b" font-family="monospace">행사</text>';
  s += '<circle cx="300" cy="490" r="3" fill="#ef4444"/><text x="308" y="493" font-size="7" fill="#64748b" font-family="monospace">만실</text>';
  s += '<text x="690" y="493" text-anchor="end" font-size="7" fill="#334155" font-family="monospace">유원건축 | 제일엔지니어링</text>';

  s += '</svg>';
  ct.innerHTML = s;
}

function drawGrid() {
  var s = '', op = 0.04;
  for (var x = 0; x <= BW; x += 5) {
    var p1 = iso(x, 0, 0), p2 = iso(x, 0, BD);
    s += '<line x1="' + p1[0].toFixed(0) + '" y1="' + p1[1].toFixed(0) + '" x2="' + p2[0].toFixed(0) + '" y2="' + p2[1].toFixed(0) + '" stroke="#334155" stroke-opacity="' + op + '" stroke-width=".3"/>';
  }
  for (var z = 0; z <= BD; z += 5) {
    var p1 = iso(0, 0, z), p2 = iso(BW, 0, z);
    s += '<line x1="' + p1[0].toFixed(0) + '" y1="' + p1[1].toFixed(0) + '" x2="' + p2[0].toFixed(0) + '" y2="' + p2[1].toFixed(0) + '" stroke="#334155" stroke-opacity="' + op + '" stroke-width=".3"/>';
  }
  return s;
}

function floorSvg(fk, by) {
  var s = '', cl = fk === 'B1' ? '#00e5b0' : '#00b8e6';
  var p0 = iso(0, by, 0), p1 = iso(BW, by, 0), p2 = iso(BW, by, BD), p3 = iso(0, by, BD);
  s += '<path d="' + pp([p0, p1, p2, p3]) + '" fill="' + cl + '" fill-opacity=".06" stroke="' + cl + '" stroke-opacity=".2" stroke-width=".5"/>';
  var rooms = RM[fk].slice().sort(function(a, b) { return (a.x + a.z) - (b.x + b.z); });
  for (var i = 0; i < rooms.length; i++) s += roomSvg(rooms[i], by);
  var ty = by + WH;
  p0 = iso(0, ty, 0); p1 = iso(BW, ty, 0); p2 = iso(BW, ty, BD); p3 = iso(0, ty, BD);
  s += '<path d="' + pp([p0, p1, p2, p3]) + '" fill="' + cl + '" fill-opacity=".03" stroke="' + cl + '" stroke-opacity=".1" stroke-width=".3"/>';
  return s;
}

function roomSvg(r, by) {
  var s = '', c = r.c, ty = by + WH;
  var f0 = iso(r.x, by + .01, r.z), f1 = iso(r.x + r.w, by + .01, r.z), f2 = iso(r.x + r.w, by + .01, r.z + r.d), f3 = iso(r.x, by + .01, r.z + r.d);
  var t0 = iso(r.x, ty, r.z), t1 = iso(r.x + r.w, ty, r.z), t2 = iso(r.x + r.w, ty, r.z + r.d), t3 = iso(r.x, ty, r.z + r.d);
  var occ = r.cap ? r.p + '/' + r.cap + '석' : r.p + '명';
  var tip = r.n + ' | ' + r.a + '㎡ | ' + occ + ' | ' + r.t + '°C | ' + r.s;

  s += '<g class="rm"><title>' + tip + '</title>';
  s += '<path d="' + pp([f0, f1, f2, f3]) + '" fill="' + c + '" fill-opacity=".15"/>';
  // Walls (dynamic based on view angle)
  s += '<path class="rw" d="' + pp([iso(r.x + r.w, by, r.z), t1, t2, iso(r.x + r.w, by, r.z + r.d)]) + '" fill="' + c + '" fill-opacity=".12"/>';
  s += '<path class="rw" d="' + pp([iso(r.x, by, r.z + r.d), t3, t2, iso(r.x + r.w, by, r.z + r.d)]) + '" fill="' + c + '" fill-opacity=".18"/>';
  s += '<path class="rw" d="' + pp([iso(r.x, by, r.z), t0, t3, iso(r.x, by, r.z + r.d)]) + '" fill="' + c + '" fill-opacity=".08"/>';
  s += '<path class="rw" d="' + pp([iso(r.x, by, r.z), t0, t1, iso(r.x + r.w, by, r.z)]) + '" fill="' + c + '" fill-opacity=".06"/>';
  // Top
  s += '<path class="rt" d="' + pp([t0, t1, t2, t3]) + '" fill="' + c + '" fill-opacity=".25"/>';
  s += '<path class="re" d="' + pp([t0, t1, t2, t3]) + '" fill="none" stroke="' + c + '" stroke-opacity=".6" stroke-width=".7"/>';
  // Label
  var cx = (t0[0] + t1[0] + t2[0] + t3[0]) / 4, cy = (t0[1] + t1[1] + t2[1] + t3[1]) / 4;
  if (r.w > 3 && r.d > 3) {
    s += '<text x="' + cx.toFixed(0) + '" y="' + (cy - 4).toFixed(0) + '" text-anchor="middle" font-size="8" font-weight="700" fill="' + c + '" font-family="monospace">' + r.n + '</text>';
    s += '<text x="' + cx.toFixed(0) + '" y="' + (cy + 5).toFixed(0) + '" text-anchor="middle" font-size="6" fill="#94a3b8" font-family="monospace">' + r.a + '㎡</text>';
    if (r.p > 0) s += '<text x="' + cx.toFixed(0) + '" y="' + (cy + 13).toFixed(0) + '" text-anchor="middle" font-size="7" font-weight="600" fill="#00e5b0" font-family="monospace">' + r.p + '명</text>';
  } else {
    s += '<text x="' + cx.toFixed(0) + '" y="' + (cy + 2).toFixed(0) + '" text-anchor="middle" font-size="6.5" font-weight="600" fill="' + c + '" font-family="monospace">' + r.n + '</text>';
  }
  // Status dot
  var sc = r.s === '만실' ? '#ef4444' : r.s === '행사중' ? '#f59e0b' : (r.s.indexOf('중') >= 0 ? '#22c55e' : null);
  if (sc) { var ip = iso(r.x + r.w - .3, ty + .3, r.z + .3); s += '<circle' + (sc !== '#22c55e' ? ' class="pu"' : '') + ' cx="' + ip[0].toFixed(0) + '" cy="' + ip[1].toFixed(0) + '" r="3.5" fill="' + sc + '"/>'; }
  // People dots
  var mp = Math.min(r.p, 8);
  for (var k = 0; k < mp; k++) {
    var px = r.x + .8 + (k % 4) * (r.w > 4 ? (r.w - 1.6) / 3 : .8);
    var pz = r.z + .8 + Math.floor(k / 4) * (r.d > 4 ? (r.d - 1.6) / 2 : .8);
    var pt = iso(px, by + .05, pz);
    s += '<circle cx="' + pt[0].toFixed(0) + '" cy="' + pt[1].toFixed(0) + '" r="1.5" fill="#00e5b0" opacity=".5"/>';
  }
  s += '</g>';
  return s;
}

function floorLbl(txt, by, cl) {
  var p = iso(-2, by + WH / 2, BD / 2);
  return '<text x="' + p[0].toFixed(0) + '" y="' + p[1].toFixed(0) + '" text-anchor="end" font-size="10" font-weight="700" fill="' + cl + '" font-family="monospace">' + txt + '</text>';
}

function svgBtn(label, val, x, y) {
  if (val === 'RESET') {
    return '<g onclick="window._dtReset()" style="cursor:pointer;"><rect x="' + x + '" y="' + y + '" width="32" height="17" rx="3" fill="rgba(239,68,68,.15)" stroke="rgba(239,68,68,.3)" stroke-width=".5"/><text x="' + (x + 16) + '" y="' + (y + 11.5) + '" text-anchor="middle" font-size="7.5" font-weight="600" fill="#ef4444" font-family="monospace">' + label + '</text></g>';
  }
  var ac = vw === val, bg = ac ? 'rgba(0,229,176,.15)' : 'rgba(30,41,59,.85)', fc = ac ? '#00e5b0' : '#64748b', sc = ac ? 'rgba(0,229,176,.5)' : 'rgba(100,116,139,.3)';
  return '<g onclick="window._dtV(\'' + val + '\')" style="cursor:pointer;"><rect x="' + x + '" y="' + y + '" width="' + (val === 'ALL' ? 40 : 32) + '" height="17" rx="3" fill="' + bg + '" stroke="' + sc + '" stroke-width=".5"/><text x="' + (x + (val === 'ALL' ? 20 : 16)) + '" y="' + (y + 11.5) + '" text-anchor="middle" font-size="7.5" font-weight="600" fill="' + fc + '" font-family="monospace">' + label + '</text></g>';
}

// 리셋 버튼
window._dtReset = function() {
  azimuth = 0.52; elevation = 0.38; scale = 7.5; panX = 350; panY = 250;
  var ct = document.getElementById('bbDigitalTwin');
  if (ct) draw(ct);
};

function sim() {
  ['B1', 'B2'].forEach(function(fk) {
    RM[fk].forEach(function(r) {
      if (r.p > 0) {
        r.p = Math.max(0, Math.min(r.cap || 100, r.p + Math.round((Math.random() - .5) * 2)));
        r.t = Math.round((r.t + (Math.random() - .5) * .3) * 10) / 10;
      }
      if (r.cap) {
        var pct = r.p / r.cap * 100;
        r.s = pct >= 100 ? '만실' : pct >= 50 ? '이용중' : pct > 0 ? '여유' : '예약가능';
      }
    });
  });
}
})();
