/**
 * AI 예측 UI v4 — 4-Model (전력/교통/군집/카라반)
 */
(function(){
'use strict';
const PRED_URL='./data/prediction.json';
const HIST_URL='./data/sensor_history.json';
let last=null;

function init(){
  console.log('🤖 AI 4-Model UI v4');
  injectPanel();
  load();
  setInterval(load,60000);
}

async function load(){
  try{
    const r=await fetch(PRED_URL+'?t='+Date.now());
    if(!r.ok){showStatus();return;}
    const d=await r.json();
    if(!d.prediction){showStatus();return;}
    if(last&&last.updated===d.updated)return;
    last=d;
    render(d);
  }catch(e){showStatus();}
}

async function showStatus(){
  const el=document.getElementById('predContent');if(!el)return;
  try{
    const r=await fetch(HIST_URL+'?t='+Date.now());
    if(r.ok){
      const h=await r.json();
      const pts=h.totalPoints||0;
      const t=h.updated?.split('T')[1]?.substring(0,5)||'';
      const has4m=h.data?.length>0&&h.data[h.data.length-1]?.power;
      el.innerHTML=`<div style="padding:8px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <div style="width:8px;height:8px;border-radius:50%;background:var(--teal);animation:pulse 2s infinite;"></div>
          <span style="font-size:10px;color:var(--teal);font-weight:600;">${has4m?'4-Model':'센서'} 데이터 수집 중</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;">
          <div style="background:var(--bg3);border-radius:4px;padding:6px 8px;">
            <div style="font-size:8px;color:var(--t4);">축적</div>
            <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--teal);">${pts}<span style="font-size:9px;color:var(--t3);"> pt</span></div>
          </div>
          <div style="background:var(--bg3);border-radius:4px;padding:6px 8px;">
            <div style="font-size:8px;color:var(--t4);">최신</div>
            <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--cyan);">${t||'--:--'}</div>
          </div>
        </div>
        <div style="margin-top:6px;padding:5px 8px;background:rgba(139,92,246,.06);border-radius:4px;border-left:2px solid var(--purple);">
          <div style="font-size:9px;color:var(--t3);line-height:1.4;">GAS <b style="color:var(--purple);">runPrediction</b> 실행 → 4-Model 예측 활성화</div>
        </div></div>`;
      return;
    }
  }catch(e){}
  el.innerHTML=`<div style="text-align:center;padding:10px;color:var(--t3);font-size:10px;"><i class="fas fa-brain" style="font-size:14px;color:var(--purple);opacity:.3;"></i><div style="margin-top:4px;">AI 예측 대기중</div></div>`;
}

function injectPanel(){
  const rp=document.querySelector('.right-panel');if(!rp)return;
  const p=document.createElement('div');
  p.className='widget';p.id='predPanel';p.style.cssText='flex-shrink:0;';
  p.innerHTML=`<div class="w-head"><div class="w-head-title"><i class="fas fa-brain" style="color:var(--purple);"></i> AI 4-Model 예측</div><div class="w-head-actions"><button onclick="window._pred4&&window._pred4()" style="font-size:8px;">갱신</button></div></div><div class="w-body" style="flex:none;padding:0;" id="predContent"><div style="text-align:center;padding:10px;"><i class="fas fa-spinner fa-spin" style="font-size:12px;color:var(--purple);opacity:.4;"></i></div></div>`;
  const cctv=rp.children[0];
  if(cctv&&cctv.nextSibling)rp.insertBefore(p,cctv.nextSibling);
  else rp.appendChild(p);
}

function render(d){
  const el=document.getElementById('predContent');if(!el)return;
  const p=d.prediction;
  const cur=d.current||{};

  // 트렌드 아이콘
  const ti=t=>t==='충전'||t==='상승'?'↑':t==='방전'||t==='하강'?'↓':'→';
  const dc=v=>v==='혼잡'||v==='과밀'?'var(--red)':v==='보통'?'var(--amber)':'var(--green)';

  // 각 모델 카드
  const pw=p.power||{};const pw6=pw.forecast_6h||{};
  const tr=p.traffic||{};const tr6=tr.forecast_6h||{};
  const cr=p.crowd||{};const cr6=cr.forecast_6h||{};
  const cv=p.caravan||{};const cv6=cv.forecast_6h||{};
  const env=p.environment||{};const env6=env.forecast_6h||{};

  el.innerHTML=`
    <div style="padding:6px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
        ${modelCard('⚡','전력','#22c55e',
          `ESS ${pw6.ess_kwh||'?'}kWh`,
          `RE100 ${pw6.re100_pct||'?'}%`,
          pw6.trend||'?',pw.risk==='경고')}
        ${modelCard('🚗','교통','#3b82f6',
          `${tr6.volume||'?'}대/h`,
          `${tr6.congestion||'?'}`,
          tr6.congestion||'?',tr6.congestion==='혼잡')}
        ${modelCard('📶','군집도','#06b6d4',
          `WiFi ${cr6.wifi_users||'?'}명`,
          `${cr6.density||'?'}`,
          cr6.density||'?',cr6.density==='과밀'||cr6.density==='혼잡')}
        ${modelCard('🏠','카라반','#8b5cf6',
          `${cv6.occupancy||'?'}/${cur.caravan?.total||30}동`,
          `${cv6.occupancy_rate||'?'}%`,
          cv.revenue_trend||'?',false)}
      </div>

      ${p.analysis?`<div style="margin-top:5px;padding:5px 7px;background:var(--bg3);border-radius:4px;border-left:2px solid var(--purple);font-size:9px;color:var(--t2);line-height:1.4;">${p.analysis}</div>`:''}

      ${p.alerts&&p.alerts.length>0?`<div style="margin-top:4px;">${p.alerts.map(a=>
        `<div style="padding:3px 7px;background:${a.level==='critical'?'rgba(239,68,68,.1)':'rgba(245,158,11,.1)'};border-radius:3px;margin-top:2px;font-size:8px;color:${a.level==='critical'?'var(--red)':'var(--amber)'};">
          ${a.level==='critical'?'🔴':'🟡'} [${a.model||''}] ${a.message}</div>`
      ).join('')}</div>`:''}

      <div style="padding:2px 7px;margin-top:4px;font-size:7px;color:var(--t4);font-family:var(--mono);text-align:right;">
        ${d.updated||''} | ${d.version||'4-model'}
      </div>
    </div>`;

  addAlerts(p);
}

function modelCard(icon,label,color,val1,val2,trend,isWarn){
  const bg=isWarn?`rgba(239,68,68,.08)`:`rgba(${hexToRgb(color)},.06)`;
  const bc=isWarn?'var(--red)':color;
  return `<div style="background:${bg};border:1px solid ${isWarn?'rgba(239,68,68,.3)':'var(--border)'};border-radius:5px;padding:6px 8px;border-top:2px solid ${bc};">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
      <span style="font-size:9px;font-weight:600;color:var(--t1);">${icon} ${label}</span>
      <span style="font-size:8px;font-family:var(--mono);color:${bc};font-weight:600;">${trend}</span>
    </div>
    <div style="font-family:var(--mono);font-size:13px;font-weight:700;color:${bc};">${val1}</div>
    <div style="font-size:8px;color:var(--t3);margin-top:2px;">${val2}</div>
  </div>`;
}

function hexToRgb(hex){
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `${r},${g},${b}`;
}

function addAlerts(p){
  if(!p.alerts||!p.alerts.length)return;
  const al=document.getElementById('alertLog');if(!al)return;
  p.alerts.forEach(a=>{
    if(al.innerHTML.includes(a.message))return;
    const el=document.createElement('div');
    el.className=`al-item ${a.level==='critical'?'al-critical':'al-warning'}`;
    el.style.borderLeftColor='var(--purple)';
    el.innerHTML=`<span class="al-time" style="color:var(--purple);">AI</span><span class="al-badge" style="background:rgba(139,92,246,.15);color:var(--purple);">${a.model||'4M'}</span><span class="al-msg">🤖 ${a.message}</span>`;
    al.insertBefore(el,al.firstChild);
  });
}

window._pred4=load;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,3000));
else setTimeout(init,3000);
})();
