/**
 * 유니트리 Go2 순찰 로봇 v5
 * 색상: 순찰=#00b8e6(시안), 충전=#f59e0b(앰버)
 * 충전 시 배터리 채움 애니메이션
 */
(function() {
'use strict';

const COL = '#00b8e6'; // 메인 색상 (시안)
const COL_CHG = '#f59e0b'; // 충전 색상

const UNITREE_SVG = `<svg viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
  <rect x="10" y="6" width="20" height="10" rx="3" fill="currentColor" opacity=".9"/>
  <rect x="25" y="3" width="8" height="8" rx="2" fill="currentColor" opacity=".85"/>
  <circle cx="30" cy="5.5" r="1.5" fill="#000" opacity=".5"/>
  <rect x="28" y="4" width="4" height="2" rx="1" fill="currentColor" opacity=".7"/>
  <line x1="12" y1="16" x2="9" y2="23" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="9" y1="23" x2="7" y2="27" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="18" y1="16" x2="16" y2="23" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="16" y1="23" x2="14" y2="27" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="22" y1="16" x2="24" y2="23" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="24" y1="23" x2="26" y2="27" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  <line x1="28" y1="16" x2="31" y2="23" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="31" y1="23" x2="33" y2="27" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const UNITREE_SMALL = `<svg viewBox="0 0 40 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:18px;height:14px;vertical-align:middle;">
  <rect x="10" y="6" width="20" height="10" rx="3" fill="currentColor" opacity=".9"/>
  <rect x="25" y="3" width="8" height="8" rx="2" fill="currentColor" opacity=".85"/>
  <circle cx="30" cy="5.5" r="1.5" fill="#000" opacity=".4"/>
  <line x1="12" y1="16" x2="9" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="18" y1="16" x2="16" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="22" y1="16" x2="24" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="28" y1="16" x2="31" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

const ROUTES = {
  'RD-01': {
    name: '도고온천로 순찰', color: COL,
    waypoints: [
      {lat:36.7646,lng:126.8845,label:'일미식당'},{lat:36.7645,lng:126.8848},{lat:36.7644,lng:126.8852},
      {lat:36.7643,lng:126.8855},{lat:36.7642,lng:126.8858},{lat:36.7641,lng:126.8862,label:'이마트24'},
      {lat:36.7641,lng:126.8865},{lat:36.7640,lng:126.8868},{lat:36.7638,lng:126.8872},
      {lat:36.7635,lng:126.8875},{lat:36.7630,lng:126.8878,label:'도고온천로 중앙'},
      {lat:36.7626,lng:126.8880},{lat:36.7624,lng:126.8882,label:'더자라모텔'},
      {lat:36.7622,lng:126.8884},{lat:36.7620,lng:126.8885,label:'Space-One'},
      {lat:36.7618,lng:126.8883},{lat:36.7615,lng:126.8881},{lat:36.7612,lng:126.8880,label:'한국콘도'},
      {lat:36.7615,lng:126.8878},{lat:36.7620,lng:126.8876},{lat:36.7625,lng:126.8874},
      {lat:36.7630,lng:126.8872},{lat:36.7635,lng:126.8868},{lat:36.7638,lng:126.8865},
      {lat:36.7641,lng:126.8860},{lat:36.7643,lng:126.8855},{lat:36.7646,lng:126.8845,label:'일미식당 복귀'}
    ]
  },
  'RD-02': {
    name: 'OASIS 핵심 순찰', color: '#22c55e',
    waypoints: [
      {lat:36.7625,lng:126.8885,label:'워케이션 센터'},{lat:36.7627,lng:126.8883},
      {lat:36.7630,lng:126.8880},{lat:36.7632,lng:126.8878},{lat:36.7635,lng:126.8875},
      {lat:36.7638,lng:126.8872},{lat:36.7640,lng:126.8868},{lat:36.7641,lng:126.8865,label:'이마트24'},
      {lat:36.7639,lng:126.8868},{lat:36.7636,lng:126.8872},{lat:36.7632,lng:126.8876},
      {lat:36.7628,lng:126.8880},{lat:36.7625,lng:126.8883},{lat:36.7623,lng:126.8884},
      {lat:36.7625,lng:126.8885,label:'워케이션 복귀'}
    ]
  }
};

let robots = [
  { id:'RD-01', name:'순찰견-01 (도고온천로)', model:'Unitree Go2',
    status:'patrol', battery:78, speed:1.5, temperature:37,
    uptime:'02:15:42', totalDistance:4.8, patrolCount:6,
    wp:0, prog:0, lat:36.7646, lng:126.8845,
    lidar:'active', camera:'recording', alerts:0,
    lastEvent:'도고온천로 순찰 중', route:'RD-01' },
  { id:'RD-02', name:'순찰견-02 (OASIS)', model:'Unitree Go2',
    status:'patrol', battery:62, speed:1.2, temperature:35,
    uptime:'01:32:10', totalDistance:2.1, patrolCount:3,
    wp:0, prog:0, lat:36.7625, lng:126.8885,
    lidar:'active', camera:'recording', alerts:0,
    lastEvent:'OASIS 순찰 중', route:'RD-02' }
];

let overlays = {markers:[], lines:[]};
let lastT = 0;

function injectCSS() {
  const s = document.createElement('style');
  s.textContent = `
.robot-panel{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:8px}
.robot-card{background:var(--bg3,#101828);border:1px solid var(--border,#1a2640);border-radius:6px;padding:10px;position:relative;overflow:hidden;cursor:pointer;transition:all .3s}
.robot-card:hover{border-color:${COL};transform:translateY(-1px)}
.rc-head{display:flex;align-items:center;gap:6px;margin-bottom:6px}
.rc-icon{width:28px;height:22px;color:${COL}}
.rc-icon.charging{color:${COL_CHG};animation:rcBlink 1.5s infinite}
.rc-icon.standby{color:#475569}
.rc-name{font-size:10px;font-weight:600;color:var(--t1,#e2e8f0);line-height:1.2}
.rc-model{font-size:7px;color:var(--t3,#94a3b8)}
.rc-status{position:absolute;top:6px;right:8px;font-size:8px;font-weight:600;font-family:var(--mono,monospace)}
.rc-metrics{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-top:4px}
.rc-m{background:rgba(255,255,255,.03);border-radius:3px;padding:3px 5px}
.rc-ml{font-size:7px;color:var(--t4,#475569)}
.rc-mv{font-size:11px;font-weight:600;font-family:var(--mono,monospace)}
.rc-bat{display:flex;align-items:center;gap:4px;margin-top:5px;padding-top:5px;border-top:1px solid var(--border,#1a2640)}
.rc-bar{flex:1;height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden;position:relative}
.rc-fill{height:100%;border-radius:3px;transition:width 2s}
.rc-fill.charging{animation:rcCharge 2s ease-in-out infinite}
.rc-bt{font-size:9px;font-family:var(--mono,monospace);font-weight:600;min-width:32px;text-align:right}
.rc-ev{margin-top:4px;font-size:8px;color:var(--t3,#94a3b8);display:flex;align-items:center}
.rc-chg-indicator{display:none;margin-top:4px;padding:3px 6px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:4px;font-size:8px;color:${COL_CHG};font-family:var(--mono,monospace);text-align:center}
.rc-chg-indicator.active{display:block;animation:rcBlink 2s infinite}
.rbt-mk{display:flex;flex-direction:column;align-items:center}
.rbt-ic{width:32px;height:24px;filter:drop-shadow(0 0 6px rgba(0,184,230,.6));transition:all .5s}
.rbt-ic.patrol{color:${COL}}
.rbt-ic.charging{color:${COL_CHG};animation:rcBlink 1.5s infinite}
.rbt-ic.standby{color:#475569}
.rbt-lb{margin-top:2px;padding:1px 5px;background:rgba(6,10,18,.9);border:1px solid ${COL};border-radius:3px;font-family:var(--mono,monospace);font-size:7px;color:#7dd3fc;white-space:nowrap}
.rbt-lb.charging{border-color:${COL_CHG};color:#fbbf24}
@keyframes rcBlink{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes rcCharge{0%{background-position:-100% 0}100%{background-position:100% 0}}`;
  document.head.appendChild(s);
}

function renderCards() {
  const ct = document.getElementById('robotPanel');
  if (!ct) return;
  ct.innerHTML = '<div class="robot-panel">' + robots.map(r => {
    const isP = r.status==='patrol', isC = r.status==='charging';
    const sc = isP?'#22c55e':isC?COL_CHG:'#64748b';
    const sl = isP?'순찰중':isC?'충전중':'대기';
    const bc = r.battery>50?'#22c55e':r.battery>20?COL_CHG:'#ef4444';
    const chgPct = isC ? `⚡ 충전중 ${Math.round(r.battery)}% → 95%` : '';
    return `<div class="robot-card" style="${isC?'border-color:rgba(245,158,11,.3);':''}">
<div class="rc-head"><div class="rc-icon ${r.status}">${UNITREE_SVG}</div><div><div class="rc-name">${r.name}</div><div class="rc-model">${r.model} | ${r.route}</div></div></div>
<div class="rc-status" style="color:${sc}">● ${sl}</div>
<div class="rc-metrics">
<div class="rc-m"><div class="rc-ml">속도</div><div class="rc-mv" style="color:${isP?COL:'#475569'}">${isP?r.speed+' m/s':isC?'도킹':'-'}</div></div>
<div class="rc-m"><div class="rc-ml">순찰거리</div><div class="rc-mv" style="color:#00e5b0">${r.totalDistance}km</div></div>
<div class="rc-m"><div class="rc-ml">LiDAR</div><div class="rc-mv" style="color:${r.lidar==='active'?'#22c55e':'#475569'};font-size:10px">${r.lidar==='active'?'● 4D L1':'○ 대기'}</div></div>
<div class="rc-m"><div class="rc-ml">카메라</div><div class="rc-mv" style="color:${r.camera==='recording'?'#22c55e':'#475569'};font-size:10px">${r.camera==='recording'?'● REC':'○ 대기'}</div></div>
</div>
<div class="rc-bat"><i class="fas fa-battery-${r.battery>75?'full':r.battery>50?'three-quarters':r.battery>25?'half':'quarter'}" style="font-size:10px;color:${bc}"></i><div class="rc-bar"><div class="rc-fill ${isC?'charging':''}" style="width:${r.battery}%;background:${isC?'linear-gradient(90deg,'+COL_CHG+',#fbbf24,'+COL_CHG+')':bc};${isC?'background-size:200% 100%;':''}"></div></div><span class="rc-bt" style="color:${bc}">${Math.round(r.battery)}%</span></div>
<div class="rc-chg-indicator ${isC?'active':''}">${chgPct}</div>
<div class="rc-ev"><span style="color:${COL};width:14px;height:10px;display:inline-block;margin-right:4px;">${UNITREE_SMALL}</span>${r.lastEvent}</div>
</div>`;
  }).join('') + '</div>';
}

function mkHTML(r) {
  const cls = r.status==='patrol'?'patrol':r.status==='charging'?'charging':'standby';
  const lbcls = r.status==='charging'?' charging':'';
  return `<div class="rbt-mk"><div class="rbt-ic ${cls}">${UNITREE_SVG}</div><div class="rbt-lb${lbcls}">${r.id} ${r.status==='charging'?'⚡':''}${Math.round(r.battery)}%</div></div>`;
}

function moveRobot(r, dt) {
  const route = ROUTES[r.route];
  if (!route) return;
  const wps = route.waypoints;
  r.prog += dt / 60;
  if (r.prog >= 1) {
    r.prog -= 1;
    r.wp = (r.wp + 1) % wps.length;
    const w = wps[r.wp];
    r.lastEvent = w.label || `경유점 ${r.wp}`;
    if (r.wp === 0) {
      r.patrolCount++;
      r.lastEvent = `순찰 ${r.patrolCount}회차 완료`;
    }
  }
  const c = wps[r.wp], n = wps[(r.wp+1)%wps.length], t = r.prog;
  r.lat = c.lat+(n.lat-c.lat)*t;
  r.lng = c.lng+(n.lng-c.lng)*t;
  r.speed = Math.round((1.3+Math.sin(Date.now()/8000)*.4)*10)/10;
  r.totalDistance = Math.round((r.totalDistance+0.0001)*1000)/1000;
  r.battery = Math.max(5, r.battery - 0.003);
  r.temperature = Math.round((36+Math.sin(Date.now()/15000)*1.5)*10)/10;

  // 배터리 15% 이하 → 충전
  if (r.battery < 15 && r.status === 'patrol') {
    r.status = 'charging';
    r.speed = 0;
    r.lidar = 'standby';
    r.camera = 'standby';
    r.lastEvent = '⚡ 충전스테이션 도킹 (' + Math.round(r.battery) + '%)';
  }
}

function updateMap() {
  if (typeof kakao==='undefined' || !window.kakaoMap) return;
  const map = window.kakaoMap;

  if (overlays.markers.length === 0) {
    robots.forEach(r => {
      const m = new kakao.maps.CustomOverlay({
        position: new kakao.maps.LatLng(r.lat, r.lng),
        content: mkHTML(r), yAnchor:1, xAnchor:.5
      });
      m.setMap(map); m._rid=r.id;
      overlays.markers.push(m);
    });
    Object.values(ROUTES).forEach(route => {
      const path = route.waypoints.map(w => new kakao.maps.LatLng(w.lat, w.lng));
      new kakao.maps.Polyline({
        path, strokeWeight:2, strokeColor:route.color,
        strokeOpacity:.15, strokeStyle:'shortdash'
      }).setMap(map);
    });
  }

  robots.forEach(r => {
    const m = overlays.markers.find(m => m._rid===r.id);
    if (m) {
      m.setPosition(new kakao.maps.LatLng(r.lat, r.lng));
      m.setContent(mkHTML(r));
    }
  });
}

function tick() {
  const now = Date.now()/1000;
  const dt = lastT ? (now-lastT) : 0;
  lastT = now;

  robots.forEach(r => {
    if (r.status === 'patrol') moveRobot(r, dt);
    if (r.status === 'charging') {
      r.battery = Math.min(100, r.battery + 0.08);
      r.lastEvent = `⚡ 충전중 ${Math.round(r.battery)}%`;
      if (r.battery >= 95) {
        r.status = 'patrol';
        r.battery = 95;
        r.lidar = 'active';
        r.camera = 'recording';
        r.speed = 1.3;
        r.lastEvent = '충전 완료 → 순찰 재개';
      }
    }
  });
  updateMap();
}

function init() {
  // robotSlot이 있으면 그곳에, 없으면 right-panel에 삽입
  const slot = document.getElementById('robotSlot');
  const rp = document.querySelector('.right-panel');
  if ((!slot && !rp) || document.getElementById('robotWidget')) return;
  injectCSS();
  const w = document.createElement('div');
  w.className='widget'; w.id='robotWidget'; w.style.cssText='flex-shrink:0;';
  w.innerHTML = `<div class="w-head"><div class="w-head-title"><span style="color:${COL};width:20px;height:14px;display:inline-block;vertical-align:middle;margin-right:4px;">${UNITREE_SMALL}</span> 순찰 로봇 현황</div></div><div class="w-body" style="padding:0;" id="robotPanel"><div style="text-align:center;padding:10px;color:var(--t3);font-size:10px;">초기화중...</div></div>`;
  if (slot) {
    slot.appendChild(w);
  } else {
    const last = rp.lastElementChild;
    if (last) rp.insertBefore(w, last); else rp.appendChild(w);
  }

  const wait = setInterval(() => {
    if (typeof kakao!=='undefined' && window.kakaoMap) { clearInterval(wait); updateMap(); }
  }, 1000);

  setInterval(renderCards, 2000);
  setInterval(tick, 3000);
}

if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>setTimeout(init,4000));
else setTimeout(init, 4000);
})();
