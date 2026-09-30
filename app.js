(function(){
'use strict';
const T=window.TRIP;
const $=(s,r)=> (r||document).querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const mark=s=>esc(s).replace(/(\[待确认\]|需出发前确认)/g,'<span class="tbd">[需出发前确认]</span>');
const KEY='ulanbutong-trip-v1';
let state={};
try{state=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){state={}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}}
let curDay=localStorage.getItem(KEY+':day')||'d1';
function guessDay(){
  const d0=new Date(T.startDate+'T00:00:00+08:00'),n=new Date();
  const i=Math.floor((n-d0)/864e5);
  return (i>=0&&i<T.days.length)?T.days[i].id:null;
}
const g=guessDay(); if(g&&!localStorage.getItem(KEY+':day')) curDay=g;

function listHTML(id,items){
  const done=items.filter((_,i)=>state[id+':'+i]).length;
  const pct=items.length?Math.round(done/items.length*100):0;
  return `<div class="prog"><i style="width:${pct}%"></i></div><div class="pt" data-pt="${id}">${done}/${items.length} 已完成（${pct}%）</div>
  <ul class="items">${items.map((t,i)=>`<li><label><input type="checkbox" data-k="${id}:${i}" data-g="${id}" ${state[id+':'+i]?'checked':''}><span>${mark(t)}</span></label></li>`).join('')}</ul>
  <div class="row"><button class="btn d" data-reset="${id}">重置此清单</button></div>`;
}
function groupStats(prefix,n){let d=0,t=0;for(let k=0;k<n.length;k++){t+=n[k];for(let i=0;i<n[k];i++)if(state[prefix(k)+':'+i])d++}return [d,t]}

function renderItinerary(){
  let h=`<div class="card"><h2>总原则</h2><ul class="plain">${T.principles.map(p=>`<li>${mark(p)}</li>`).join('')}</ul>
  <div class="warn">行车时间为网上资料与导航估算，<b>国庆拥堵会更久</b>。标注 <span class="tbd">[需出发前确认]</span> 的内容未能核实，请出发前/当天确认。</div></div>`;
  T.days.forEach(d=>{
    h+=`<div class="card"><details ${d.id===curDay?'open':''}><summary>${esc(d.date)}｜${esc(d.title)} <span class="badge">${esc(d.badge)}</span></summary>
    <p>${mark(d.summary)}</p><div class="why">${mark(d.why)}</div>
    <h3>时间安排</h3><ul class="tl">${d.schedule.map(s=>`<li><span class="t">${esc(s[0])}</span><span>${mark(s[1])}</span></li>`).join('')}</ul>
    <h3>可选/备注</h3><p>${mark(d.options)}</p>
    <h3>住宿/营地</h3><p>${mark(d.lodging)}</p></details></div>`;
  });
  $('#p-itin').innerHTML=h;
}
function renderDaily(){
  const d=T.days.find(x=>x.id===curDay)||T.days[0];
  let h=`<div class="tabs" role="tablist">${T.days.map(x=>`<button class="chip ${x.id===d.id?'on':''}" data-day="${x.id}">${esc(x.date.split(' ')[0])} ${esc(x.title.split('→')[0].trim())}</button>`).join('')}</div>`;
  h+=`<div class="card"><h2>${esc(d.date)}｜${esc(d.title)}</h2><div class="pt">${esc(d.badge)}</div></div>`;
  h+=`<div class="card"><h3>✅ 今日待办</h3>${listHTML('todo-'+d.id,d.todo)}</div>`;
  h+=`<div class="card"><h3>🎒 今日携带</h3>${listHTML('bring-'+d.id,d.bring)}</div>`;
  $('#p-daily').innerHTML=h;
}
function renderPack(){
  const tot=T.packing.reduce((a,c)=>a+c.items.length,0);
  const done=T.packing.reduce((a,c,ci)=>a+c.items.filter((_,i)=>state['pk'+ci+':'+i]).length,0);
  const pct=tot?Math.round(done/tot*100):0;
  let h=`<div class="card"><h2>总装备进度</h2><div class="prog"><i id="allbar" style="width:${pct}%"></i></div><div class="pt" id="alltxt">${done}/${tot} 已完成（${pct}%）</div>
  <div class="row"><button class="btn d" data-resetall="1">全部重置</button></div>
  <p class="pt">出发前逐项对照：勾选＝已装车。状态保存在本机浏览器。</p></div>`;
  T.packing.forEach((c,ci)=>{h+=`<div class="card"><details ${ci<2?'open':''}><summary>${esc(c.cat)}</summary>${listHTML('pk'+ci,c.items)}</details></div>`});
  $('#p-pack').innerHTML=h;
}
function renderNotes(){
  let h=`<div class="card"><h2>⚠️ 需出发前确认（未核实）</h2><ul class="plain">${T.unverified.map(u=>`<li>${esc(u)}</li>`).join('')}</ul></div>`;
  T.notes.forEach(n=>{h+=`<div class="card"><details><summary>${esc(n.h)}</summary><ul class="plain">${n.items.map(i=>`<li>${mark(i)}</li>`).join('')}</ul></details></div>`});
  h+=`<div class="card"><h3>资料来源（网络检索，非官方承诺）</h3><p class="pt">高速免费：交通运输部发布信息（2026-09-28 新浪财经等转载）；天气：文旅部/中国气象局国庆旅游气象提示、第三方天气站；景区与露营规则：携程/Trip.com/新浪等第三方资料。<b>价格、开放情况、营地规则一律以景区/营地官方通知为准。</b></p></div>`;
  $('#p-notes').innerHTML=h;
}
function refreshProgress(gid){
  // 更新该清单进度条
  const boxes=document.querySelectorAll(`input[data-g="${gid}"]`);
  const done=[...boxes].filter(b=>b.checked).length,n=boxes.length,pct=n?Math.round(done/n*100):0;
  const pt=document.querySelector(`[data-pt="${gid}"]`);
  if(pt){pt.textContent=`${done}/${n} 已完成（${pct}%）`;pt.previousElementSibling.firstElementChild.style.width=pct+'%'}
  if(gid.startsWith('pk')){
    const tot=T.packing.reduce((a,c)=>a+c.items.length,0);
    const dn=T.packing.reduce((a,c,ci)=>a+c.items.filter((_,i)=>state['pk'+ci+':'+i]).length,0);
    const p=tot?Math.round(dn/tot*100):0;
    $('#allbar').style.width=p+'%';$('#alltxt').textContent=`${dn}/${tot} 已完成（${p}%）`;
  }
}
function resetGroup(gid){Object.keys(state).forEach(k=>{if(k.startsWith(gid+':'))delete state[k]});save()}
document.addEventListener('change',e=>{
  const t=e.target; if(t.matches('input[type=checkbox][data-k]')){
    if(t.checked)state[t.dataset.k]=1;else delete state[t.dataset.k];
    save();refreshProgress(t.dataset.g);
  }
});
document.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b)return;
  if(b.dataset.day){curDay=b.dataset.day;localStorage.setItem(KEY+':day',curDay);renderDaily();return}
  if(b.dataset.reset){if(confirm('确定重置这个清单的勾选？')){resetGroup(b.dataset.reset);rerender()}return}
  if(b.dataset.resetall){if(confirm('确定重置「总装备清单」全部勾选？')){T.packing.forEach((_,ci)=>resetGroup('pk'+ci));rerender()}return}
  if(b.dataset.tab){showTab(b.dataset.tab)}
});
function rerender(){
  // 保留展开状态
  const open=[...document.querySelectorAll('details')].map(d=>d.open);
  renderItinerary();renderDaily();renderPack();renderNotes();
  document.querySelectorAll('details').forEach((d,i)=>{if(open[i]!==undefined)d.open=open[i]});
}
function showTab(id){
  ['itin','daily','pack','notes'].forEach(k=>{$('#p-'+k).classList.toggle('hide',k!==id);});
  document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===id));
  localStorage.setItem(KEY+':tab',id);window.scrollTo(0,0);
}
$('#title').textContent=T.title;$('#sub').textContent=T.sub;
renderItinerary();renderDaily();renderPack();renderNotes();
showTab(localStorage.getItem(KEY+':tab')||'itin');
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('service-worker.js').catch(()=>{}))}
})();
