(function(){
'use strict';
const T=window.TRIP, R=window.ROUTES;
const $=(s,r)=> (r||document).querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mark=s=>esc(s).replace(/(\[待确认\]|需出发前确认)/g,'<span class="tbd">[需出发前确认]</span>');
const SHARED='ulanbutong-trip-v1';          // 共享：总装备清单（与旧版兼容）
const PREF='ulanbutong-trip-v2:';           // 按路线：每日清单/路线专项
const store=(k)=>{let o={};try{o=JSON.parse(localStorage.getItem(k)||'{}')}catch(e){}return o};
const put=(k,o)=>{try{localStorage.setItem(k,JSON.stringify(o))}catch(e){}};
let route=localStorage.getItem(PREF+'route'); if(!R[route]) route='A';
let shared=store(SHARED);
let rstate=store(PREF+route);
let curDay=localStorage.getItem(PREF+'day')||'d1';
const gs=(id)=> id.startsWith('pk') ? shared : rstate;           // 总装备用共享，其余按路线
const save=(id)=> id.startsWith('pk') ? put(SHARED,shared) : put(PREF+route,rstate);
const cur=()=>R[route];
const yuan=n=>'¥'+n.toLocaleString('en-US');

(function guessDay(){
  if(localStorage.getItem(PREF+'day'))return;
  const d0=new Date(T.startDate+'T00:00:00+08:00'),i=Math.floor((new Date()-d0)/864e5);
  if(i>=0&&i<5)curDay='d'+(i+1);
})();

function listHTML(id,items){
  const st=gs(id);
  const done=items.filter((_,i)=>st[id+':'+i]).length,pct=items.length?Math.round(done/items.length*100):0;
  return `<div class="prog"><i style="width:${pct}%"></i></div><div class="pt" data-pt="${id}">${done}/${items.length} 已完成（${pct}%）</div>
  <ul class="items">${items.map((t,i)=>`<li><label><input type="checkbox" data-k="${id}:${i}" data-g="${id}" ${st[id+':'+i]?'checked':''}><span>${mark(t)}</span></label></li>`).join('')}</ul>
  <div class="row"><button class="btn d" data-reset="${id}">重置此清单</button></div>`;
}
function budgetOf(d){const b=d.budget;return b.lodging+b.food+b.fuel+b.toll+b.ticket+b.buffer}
function budgetHTML(d){
  const b=d.budget,n=b.notes||{};
  const rows=[['住宿',b.lodging,n.lodging],['餐饮',b.food,n.food],['油费',b.fuel,n.fuel],['过路费',b.toll,n.toll||''],['门票/活动',b.ticket,n.ticket],['机动',b.buffer,n.buffer]];
  return `<h3>💰 今日预算（4人，估算，以实际为准）</h3><table class="bt"><tbody>${rows.map(r=>`<tr><td>${r[0]}</td><td class="n">${r[1]?yuan(r[1]):'—'}</td><td class="m">${r[2]?mark(r[2]):''}</td></tr>`).join('')}
  <tr class="tot"><td>当日合计</td><td class="n">${yuan(budgetOf(d))}</td><td class="m"></td></tr></tbody></table>`;
}
function routeTotal(r){return r.days.reduce((a,d)=>a+budgetOf(d),0)}

function renderSwitch(){
  $('#switch').innerHTML=Object.keys(R).filter(k=>k.length===1).map(k=>`<button class="rbtn ${k===route?'on':''}" data-route="${k}"><b>${esc(R[k].name)}</b><small>${esc(R[k].tagline)}</small></button>`).join('');
}
function renderItinerary(){
  const r=cur();
  let h=`<div class="card"><h2>${esc(r.name)}</h2><p>${esc(r.tagline)}</p>
  <div class="warn">${mark(r.warn)}</div>
  <h3>总原则</h3><ul class="plain">${r.principles.map(p=>`<li>${mark(p)}</li>`).join('')}</ul>
  <div class="why">日期按 10/1–10/5 编排；如出发日期后移，整体顺延，<b>注意高速免费期只到 10/7 24:00</b>，过路费见各日预算。行车时间为网上资料估算，国庆拥堵会更久。</div></div>`;
  h+=`<div class="card total"><h3>💰 预算总览（4人，估算，以实际为准）</h3>
  <table class="bt"><tbody>${r.days.map(d=>`<tr><td>${esc(d.date.split(' ')[0])}</td><td class="n">${yuan(budgetOf(d))}</td><td class="m">${esc(d.title)}</td></tr>`).join('')}
  <tr class="tot"><td>路线合计</td><td class="n">${yuan(routeTotal(r))}</td><td class="m">未含纪念品、购物等</td></tr></tbody></table>
  <p class="pt">${esc(R.common.fuelBasis)}高速10/1–10/7免费；${esc(R.common.tollShift)}门票价格只有标「第三方资料」的有来源，其余均为粗略估算。</p></div>`;
  r.days.forEach(d=>{
    h+=`<div class="card"><details ${d.id===curDay?'open':''}><summary>${esc(d.date)}｜${esc(d.title)} <span class="badge">${esc(d.badge)}</span></summary>
    <p>${mark(d.summary)}</p><div class="why">${mark(d.why)}</div>
    <h3>时间安排</h3><ul class="tl">${d.schedule.map(s=>`<li><span class="t">${esc(s[0])}</span><span>${mark(s[1])}</span></li>`).join('')}</ul>
    <h3>可选/备注</h3><p>${mark(d.options)}</p><h3>住宿/营地</h3><p>${mark(d.lodging)}</p>${budgetHTML(d)}</details></div>`;
  });
  $('#p-itin').innerHTML=h;
}
function renderDaily(){
  const r=cur(),d=r.days.find(x=>x.id===curDay)||r.days[0];
  let h=`<div class="pt routehint">当前：${esc(r.name)}（勾选状态按路线分别保存）</div><div class="tabs">${r.days.map(x=>`<button class="chip ${x.id===d.id?'on':''}" data-day="${x.id}">${esc(x.date.split(' ')[0])} ${esc(x.title.split(/[→（ ]/)[0].trim())}</button>`).join('')}</div>`;
  h+=`<div class="card"><h2>${esc(d.date)}｜${esc(d.title)}</h2><div class="pt">${esc(d.badge)}</div></div>`;
  h+=`<div class="card"><h3>✅ 今日待办</h3>${listHTML(route+'-todo-'+d.id,d.todo)}</div>`;
  h+=`<div class="card"><h3>🎒 今日携带</h3>${listHTML(route+'-bring-'+d.id,d.bring)}</div>`;
  $('#p-daily').innerHTML=h;
}
const groups=()=>T.packing.map((c,ci)=>({id:'pk'+ci,cat:c.cat,items:c.items})).concat(cur().packExtra.map((c,ci)=>({id:route+'-ex'+ci,cat:'★ '+c.cat,items:c.items})));
function packTotals(){
  let tot=0,done=0;groups().forEach(g=>{const st=gs(g.id);tot+=g.items.length;done+=g.items.filter((_,i)=>st[g.id+':'+i]).length});return [done,tot];
}
function renderPack(){
  const [done,tot]=packTotals(),pct=tot?Math.round(done/tot*100):0;
  let h=`<div class="card"><h2>总装备进度（含${esc(cur().short)}专项）</h2><div class="prog"><i id="allbar" style="width:${pct}%"></i></div><div class="pt" id="alltxt">${done}/${tot} 已完成（${pct}%）</div>
  <div class="row"><button class="btn d" data-resetall="1">全部重置</button></div>
  <p class="pt">共用清单 + 当前路线专项（★）。共用部分两条路线同步，专项按路线分别保存。状态保存在本机浏览器。</p></div>`;
  groups().forEach((g,gi)=>{h+=`<div class="card"><details ${(gi<2||g.cat.startsWith('★'))?'open':''}><summary>${esc(g.cat)}</summary>${listHTML(g.id,g.items)}</details></div>`});
  $('#p-pack').innerHTML=h;
}
function renderNotes(){
  const r=cur();
  let h=`<div class="card"><h2>⚠️ 需出发前确认（${esc(r.short)}）</h2><ul class="plain">${r.unverified.map(u=>`<li>${esc(u)}</li>`).join('')}</ul></div>`;
  r.notes.concat(T.notes).forEach(n=>{h+=`<div class="card"><details><summary>${esc(n.h)}</summary><ul class="plain">${n.items.map(i=>`<li>${mark(i)}</li>`).join('')}</ul></details></div>`});
  h+=`<div class="card"><h3>资料来源（网络检索，非官方承诺）</h3><p class="pt">高速免费：交通运输部发布信息（2026-09-28 新浪财经等转载）；天气：文旅部/中国气象局国庆旅游气象提示、第三方天气站；里程/油费/过路费：车主手册、无敌电动等第三方网站；景区与博物馆：携程、Trip.com、博物中国、去哪儿、新浪等第三方资料。<b>价格、开放情况、营地规则一律以景区/营地/场馆官方通知为准。</b></p></div>`;
  $('#p-notes').innerHTML=h;
}
function refreshProgress(gid){
  const boxes=document.querySelectorAll(`input[data-g="${gid}"]`);
  const done=[...boxes].filter(b=>b.checked).length,n=boxes.length,pct=n?Math.round(done/n*100):0;
  const pt=document.querySelector(`[data-pt="${gid}"]`);
  if(pt){pt.textContent=`${done}/${n} 已完成（${pct}%）`;pt.previousElementSibling.firstElementChild.style.width=pct+'%'}
  if($('#allbar')){const [d,t]=packTotals(),p=t?Math.round(d/t*100):0;$('#allbar').style.width=p+'%';$('#alltxt').textContent=`${d}/${t} 已完成（${p}%）`}
}
function resetGroup(gid){const st=gs(gid);Object.keys(st).forEach(k=>{if(k.startsWith(gid+':'))delete st[k]});save(gid)}
function rerender(){
  const open=[...document.querySelectorAll('details')].map(d=>d.open);
  renderSwitch();renderItinerary();renderDaily();renderPack();renderNotes();
  document.querySelectorAll('details').forEach((d,i)=>{if(open[i]!==undefined)d.open=open[i]});
}
document.addEventListener('change',e=>{
  const t=e.target;if(t.matches('input[type=checkbox][data-k]')){
    const st=gs(t.dataset.g);
    if(t.checked)st[t.dataset.k]=1;else delete st[t.dataset.k];
    save(t.dataset.g);refreshProgress(t.dataset.g);
  }
});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.route){if(b.dataset.route!==route){route=b.dataset.route;localStorage.setItem(PREF+'route',route);rstate=store(PREF+route);curDay='d1';localStorage.setItem(PREF+'day',curDay);renderSwitch();renderItinerary();renderDaily();renderPack();renderNotes();window.scrollTo(0,0)}return}
  if(b.dataset.day){curDay=b.dataset.day;localStorage.setItem(PREF+'day',curDay);renderDaily();return}
  if(b.dataset.reset){if(confirm('确定重置这个清单的勾选？')){resetGroup(b.dataset.reset);rerender()}return}
  if(b.dataset.resetall){if(confirm('确定重置「总装备清单」（共用+本路线专项）全部勾选？')){groups().forEach(g=>resetGroup(g.id));rerender()}return}
  if(b.dataset.tab)showTab(b.dataset.tab);
});
function showTab(id){
  ['itin','daily','pack','notes'].forEach(k=>$('#p-'+k).classList.toggle('hide',k!==id));
  document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('on',x.dataset.tab===id));
  localStorage.setItem(PREF+'tab',id);window.scrollTo(0,0);
}
$('#title').textContent=T.title;$('#sub').textContent=T.sub;
renderSwitch();renderItinerary();renderDaily();renderPack();renderNotes();
showTab(localStorage.getItem(PREF+'tab')||'itin');
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').catch(()=>{}))}
})();
