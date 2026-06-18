/* ============================================================
   STATE
   ============================================================ */
let STATE = {
  identity:        { vision:"", mission:"", values:[] },
  pillars:         [],
  perspectives:    [],
  orientations:    [],
  goals:           [],
  initiatives:     [],
  portfolios:      [],
  exec_plans:      [],
  oper_goals:      [],
  kpi_library:     [],
  milestone_types: [],
  kpi_options:     { polarities:[], cumulatives:[], frequencies:[], departments:[], data_sources:[] },
  initiative_options: { classifications:[], exec_types:[], follow_up_tags:[], approval_auths:[], media_coverages:[] },
  kpi_reports:     [],
  change_log:      [],
  updated_at:      null,
};
let SESSION   = null;
let ADMIN_MODE = false;
const API = "strategy-data.php";
const PILLAR_COLORS = ["#0D3B6B","#179C7C","#C9A24B","#e0824b","#5b6b7e","#2ECC8F","#8B5CF6"];

/* ============================================================
   AUTO-SAVE + AUDIT LOG
   ============================================================ */
let _saveTimer = null;
function dirtySave(){
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(async ()=>{
    if(!SESSION) return;
    const body={
      action:"save", username:SESSION.username, password:SESSION.password,
      identity:STATE.identity, pillars:STATE.pillars, perspectives:STATE.perspectives,
      orientations:STATE.orientations, goals:STATE.goals, initiatives:STATE.initiatives,
      portfolios:STATE.portfolios, exec_plans:STATE.exec_plans, oper_goals:STATE.oper_goals,
      kpi_library:STATE.kpi_library, milestone_types:STATE.milestone_types,
      kpi_options:STATE.kpi_options, initiative_options:STATE.initiative_options,
      kpi_reports:STATE.kpi_reports, change_log:STATE.change_log
    };
    const res=await apiPost(body);
    if(!res||res.err) return;
    STATE.updated_at=res.updated_at;
    updateMeta();
  }, 1500);
}

function logChange(action, entity, detail){
  if(!STATE.change_log) STATE.change_log=[];
  STATE.change_log.unshift({
    id:uid(), action, entity,
    detail:String(detail||""),
    user:SESSION?SESSION.username:"—",
    ts:new Date().toISOString()
  });
  if(STATE.change_log.length>500) STATE.change_log.length=500;
}

/* ============================================================
   UTILS
   ============================================================ */
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function esc(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function fmtDate(s){ if(!s) return "—"; const d=new Date(s+"T00:00:00"); return d.toLocaleDateString("ar-SA",{year:"numeric",month:"long",day:"numeric"}); }
function toAr(n){ return String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]); }

function toast(msg,type="ok"){
  const t=document.getElementById("toast");
  t.textContent=msg; t.className="toast "+(type||"ok");
  setTimeout(()=>t.classList.add("show"),10);
  setTimeout(()=>t.classList.remove("show"),3200);
}
function statusPill(st){
  const m={done:"مكتمل",todo:"جارٍ",late:"متأخر",none:"لم يبدأ"};
  return `<span class="spill ${st||"none"}">${m[st]||"لم يبدأ"}</span>`;
}
function calcStatus(pct,end){
  if(+pct>=100) return "done";
  if(end && end<todayISO()) return "late";
  if(+pct>0) return "todo";
  return "none";
}

/* ===== KPI Color Thresholds ===== */
function kpiColor(pct){
  if(pct>=99) return "var(--kpi-g)";
  if(pct>=85) return "var(--kpi-y)";
  return "var(--kpi-r)";
}
function kpiHex(pct){
  if(pct>=99) return "#2ECC8F";
  if(pct>=85) return "#C9A24B";
  return "#e0824b";
}

/* ===== SVG Gauge ===== */
function svgGauge(pct, w=160, h=90){
  pct = Math.min(100, Math.max(0, Math.round(+pct||0)));
  const col = kpiHex(pct);
  const cx=w/2, cy=h-10, r=Math.min(cx,cy)-10;
  const ang = Math.PI * pct / 100;
  const px = (cx - r * Math.cos(ang)).toFixed(2);
  const py = (cy - r * Math.sin(ang)).toFixed(2);
  const sx = cx - r;
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;margin:auto">
    <path d="M ${sx} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}" fill="none" stroke="#e8eef5" stroke-width="12" stroke-linecap="round"/>
    ${pct>0?`<path d="M ${sx} ${cy} A ${r} ${r} 0 0 1 ${px} ${py}" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/>`:""}
    <text x="${cx}" y="${cy+2}" text-anchor="middle" font-size="${Math.round(w/8)}" font-weight="700" fill="${col}" font-family="IBM Plex Sans Arabic,sans-serif">${pct}%</text>
  </svg>`;
}

/* ============================================================
   API
   ============================================================ */
async function apiGet(){
  try{ const r=await fetch(API); if(!r.ok) throw 0; return await r.json(); }
  catch{ return null; }
}
async function apiPost(body){
  try{
    const r=await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    return await r.json();
  }catch{ return {err:"تعذّر الاتصال بالخادم"}; }
}
async function saveAll(){
  if(!SESSION) return;
  clearTimeout(_saveTimer);
  const body={
    action:"save", username:SESSION.username, password:SESSION.password,
    identity:STATE.identity, pillars:STATE.pillars, perspectives:STATE.perspectives,
    orientations:STATE.orientations, goals:STATE.goals, initiatives:STATE.initiatives,
    portfolios:STATE.portfolios, exec_plans:STATE.exec_plans, oper_goals:STATE.oper_goals,
    kpi_library:STATE.kpi_library, milestone_types:STATE.milestone_types,
    kpi_options:STATE.kpi_options, kpi_reports:STATE.kpi_reports, change_log:STATE.change_log
  };
  const res=await apiPost(body);
  if(res.err){ toast(res.err,"err"); return; }
  STATE.updated_at=res.updated_at;
  updateMeta();
  toast("تم الحفظ بنجاح ✓");
}

/* ============================================================
   LOAD + INIT
   ============================================================ */
async function init(){
  const data=await apiGet();
  if(data && !data.err){
    if(data.identity)     STATE.identity     = data.identity;
    if(data.pillars)      STATE.pillars      = data.pillars;
    if(data.orientations) STATE.orientations = data.orientations;
    if(data.goals)        STATE.goals        = data.goals;
    if(data.initiatives)  STATE.initiatives  = data.initiatives;
    if(data.portfolios)   STATE.portfolios   = data.portfolios;
    if(data.exec_plans)   STATE.exec_plans   = data.exec_plans;
    if(data.oper_goals)   STATE.oper_goals   = data.oper_goals;
    if(data.kpi_library)     STATE.kpi_library     = data.kpi_library;
    if(data.perspectives)    STATE.perspectives    = data.perspectives;
    if(data.milestone_types) STATE.milestone_types = data.milestone_types;
    if(data.kpi_options)     STATE.kpi_options     = Object.assign({polarities:[],cumulatives:[],frequencies:[],departments:[],data_sources:[]},data.kpi_options);
    if(data.kpi_reports)        STATE.kpi_reports        = data.kpi_reports;
    if(data.change_log)         STATE.change_log         = data.change_log;
    if(data.updated_at)         STATE.updated_at         = data.updated_at;
    if(data.initiative_options) STATE.initiative_options = Object.assign(
      {classifications:[],exec_types:[],follow_up_tags:[],approval_auths:[],media_coverages:[]},
      data.initiative_options
    );

    // Migrate: old portfolios had nested .initiatives[] — move them top-level
    STATE.portfolios.forEach(pf=>{
      if(pf.initiatives && pf.initiatives.length){
        pf.initiatives.forEach(ini=>{
          if(!STATE.initiatives.find(x=>x.id===ini.id)) STATE.initiatives.push(ini);
          if(!pf.initiative_ids) pf.initiative_ids=[];
          if(!pf.initiative_ids.includes(ini.id)) pf.initiative_ids.push(ini.id);
        });
        delete pf.initiatives;
      }
    });

    // Migrate: convert old string notes → timestamped array
    STATE.initiatives.forEach(ini=>{
      if(typeof ini.notes==="string"){
        ini.notes=ini.notes.trim()?[{id:uid(),text:ini.notes.trim(),user:"—",ts:new Date().toISOString()}]:[];
      } else if(!Array.isArray(ini.notes)){
        ini.notes=[];
      }
    });
  }
  renderAll();
  updateMeta();
  updateKPIs();
  updateTabBadges();
}

function updateMeta(){
  const el=document.getElementById("topMeta");
  if(!STATE.updated_at){ el.innerHTML="لم يُحفَظ بعد"; return; }
  const d=new Date(STATE.updated_at);
  el.innerHTML=`آخر تحديث: <b>${d.toLocaleDateString("ar-SA",{year:"numeric",month:"long",day:"numeric"})}</b>`;
}

function renderAll(){
  renderIdentity();
  renderPillars();
  renderOrientations();
  renderGoals();
  renderStratMap();
  renderInitiatives();
  renderPortfolios();
  renderExecPlans();
  renderOperGoals();
}

/* ============================================================
   KPI SUMMARY CARDS
   ============================================================ */
function updateKPIs(){
  const goalKpis=[];
  STATE.goals.forEach(g=>(g.kpis||[]).forEach(k=>goalKpis.push(k)));
  const goalPct=goalKpis.length?Math.round(goalKpis.reduce((s,k)=>s+Math.min(100,(+k.actual||0)/(+k.target||1)*100),0)/goalKpis.length):0;
  document.getElementById("kGoalPct").textContent=toAr(goalPct);
  const gb=document.getElementById("kGoalBar");
  gb.style.width=goalPct+"%";
  gb.style.background=kpiHex(goalPct);

  document.getElementById("kInitCount").textContent=toAr(STATE.initiatives.length);
  const initPct=STATE.initiatives.length?Math.round(STATE.initiatives.reduce((s,i)=>s+(+i.pct||0),0)/STATE.initiatives.length):0;
  document.getElementById("kInitPct").textContent=toAr(initPct);
  const ib=document.getElementById("kInitBar");
  ib.style.width=initPct+"%";
  ib.style.background=kpiHex(initPct);

  let kpiTotal=goalKpis.length;
  STATE.initiatives.forEach(i=>kpiTotal+=(i.kpis||[]).length);
  STATE.oper_goals.forEach(og=>kpiTotal+=(og.kpis||[]).length);
  document.getElementById("kKpiCount").textContent=toAr(kpiTotal);
}

function updateTabBadges(){
  document.getElementById("tabBadge0").textContent=toAr(STATE.goals.filter(g=>g.type==="general").length);
  document.getElementById("tabBadge1").textContent=toAr(STATE.initiatives.length);
  document.getElementById("tabBadge2").textContent=toAr(STATE.oper_goals.length);
}

/* ============================================================
   STRATEGY MAP (BSC View)
   ============================================================ */
function renderStratMap(){
  const el=document.getElementById("stratMapContent");
  if(!el) return;
  const generals=STATE.goals.filter(g=>g.type==="general");
  if(!generals.length){
    el.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z"/></svg>لا توجد أهداف بعد لعرض الخريطة</div>`;
    return;
  }
  // Group goals by pillar
  const rows=[];
  STATE.pillars.forEach((p,i)=>{
    const gs=generals.filter(g=>g.pillar_id===p.id);
    if(gs.length) rows.push({label:p.name, goals:gs, color:PILLAR_COLORS[i%PILLAR_COLORS.length]});
  });
  const unassigned=generals.filter(g=>!g.pillar_id||!STATE.pillars.find(p=>p.id===g.pillar_id));
  if(unassigned.length) rows.push({label:"أهداف عامة", goals:unassigned, color:"#5b6b7e"});
  if(!rows.length){
    el.innerHTML=`<div class="smap-none">أضف ركائز واربط بها الأهداف لعرض الخريطة</div>`;
    return;
  }
  el.innerHTML=`<div class="smap-container">${rows.map(row=>`
    <div class="smap-row" style="--smap-col:${row.color}">
      <div class="smap-label">${esc(row.label)}</div>
      <div class="smap-goals">${row.goals.map(g=>{
        const avg=kpiAvg(g.kpis);
        const col=kpiHex(avg);
        return `<div class="smap-goal" style="border-color:${col}">
          <div class="smap-goal-dot" style="background:${col}"></div>
          <div class="smap-goal-name">${esc(g.name)}</div>
          <div class="smap-goal-pct" style="color:${col}">${toAr(avg)}%</div>
        </div>`;
      }).join("")}</div>
    </div>`).join("")}</div>`;
}

/* ============================================================
   RENDER: IDENTITY
   ============================================================ */
function renderIdentity(){
  document.getElementById("editIdentityBtn").style.display=ADMIN_MODE?"":"none";
  const id=STATE.identity;
  document.getElementById("identityView").innerHTML=`
    <div class="id-card${id.vision?"":" empty"}">
      <div class="id-lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M2 12h4M18 12h4M12 2v4M12 18v4"/></svg>الرؤية</div>
      <div class="id-val">${esc(id.vision)||"لم تُحدَّد الرؤية بعد"}</div>
    </div>
    <div class="id-card${id.mission?"":" empty"}">
      <div class="id-lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v16H4z"/><path d="M9 9h6M9 13h6M9 17h4"/></svg>الرسالة</div>
      <div class="id-val">${esc(id.mission)||"لم تُحدَّد الرسالة بعد"}</div>
    </div>
    <div class="values-wrap">
      <div class="id-card" style="width:100%;border-color:var(--line)">
        <div class="id-lbl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6.5h7l-5.5 4 2 7L12 16l-6.5 3.5 2-7L2 8.5h7z"/></svg>القيم</div>
        ${(id.values||[]).length?`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">${id.values.map(v=>`<span class="val-chip"><i></i>${esc(v)}</span>`).join("")}</div>`:`<div class="id-val" style="color:#aab5c4;font-style:italic">لم تُحدَّد القيم بعد</div>`}
      </div>
    </div>`;
}

/* ============================================================
   RENDER: PILLARS
   ============================================================ */
function renderPillars(){
  document.getElementById("addPillarBtn").style.display=ADMIN_MODE?"":"none";
  const grid=document.getElementById("pillarsGrid");
  if(!STATE.pillars.length&&!ADMIN_MODE){
    grid.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>لا توجد ركائز بعد</div>`;
    return;
  }
  grid.innerHTML=STATE.pillars.map((p,i)=>`
    <div class="pillar-card" onclick="${ADMIN_MODE?`editPillar('${p.id}')`:``}">
      <div class="pillar-strip" style="background:${PILLAR_COLORS[i%PILLAR_COLORS.length]}"></div>
      <div class="pc-num">الركيزة ${toAr(i+1)}</div>
      <div class="pc-name">${esc(p.name)}</div>
      <div class="pc-axes">${(p.axes||[]).map(a=>`<span class="ax-chip">${esc(a.name||a)}</span>`).join("")||`<span style="font-size:11px;color:#aab5c4">لا توجد محاور</span>`}</div>
      ${ADMIN_MODE?`<div style="margin-top:10px;display:flex;gap:6px">
        <button class="ebtn sm" onclick="event.stopPropagation();editPillar('${p.id}')" type="button">تعديل</button>
        <button class="ebtn sm danger" onclick="event.stopPropagation();delPillar('${p.id}')" type="button">حذف</button>
      </div>`:""}
    </div>`).join("")+
    (ADMIN_MODE?`<div class="add-card" onclick="showAddPillar()"><div class="plus">+</div><b>ركيزة جديدة</b><span>أضف ركيزة استراتيجية</span></div>`:"");
}

/* ============================================================
   RENDER: ORIENTATIONS
   ============================================================ */
function renderOrientations(){
  document.getElementById("addOrientBtn").style.display=ADMIN_MODE?"":"none";
  const list=document.getElementById("orientList");
  if(!STATE.orientations.length){
    list.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>لا توجد توجهات بعد</div>`;
    return;
  }
  list.innerHTML=`<div class="orient-list">${STATE.orientations.map((o,i)=>`
    <div class="orient-row">
      <span class="or-n">${toAr(i+1)}</span>
      <span class="or-txt">${esc(o.name||o)}</span>
      ${ADMIN_MODE?`<div class="or-actions"><button class="ebtn sm danger" onclick="delOrient('${o.id||i}')" type="button">حذف</button></div>`:""}
    </div>`).join("")}</div>`;
}

/* ============================================================
   RENDER: GOALS
   ============================================================ */
function kpiAvg(kpis){
  if(!kpis||!kpis.length) return 0;
  const totalW=kpis.reduce((s,k)=>s+(+k.weight||0),0);
  if(totalW>0){
    return Math.round(kpis.reduce((s,k)=>{
      const pct=Math.min(100,(+k.actual||0)/(+k.target_annual||+k.target||1)*100);
      return s+pct*(+k.weight||0)/totalW;
    },0));
  }
  return Math.round(kpis.reduce((s,k)=>s+Math.min(100,(+k.actual||0)/(+k.target||1)*100),0)/kpis.length);
}

function _kpiStatusGov(k){
  const a=k.actual;
  if(a===""||a===undefined||a===null) return {label:"لم يبدأ",color:"#8d9bb5"};
  const pct=Math.min(200,Math.round((+a)/(+k.target_annual||+k.target||1)*100));
  if(pct>=100) return {label:"مكتمل",color:"#2ECC8F"};
  if(pct>=85)  return {label:"حسب المخطط",color:"#179C7C"};
  if(pct>=70)  return {label:"متأخر",color:"#C9A24B"};
  return {label:"متأخر جداً",color:"#e0824b"};
}

function kpiTable(kpis,parentId,admin,scope){
  if(!kpis||!kpis.length) return admin?`<div style="color:#aab5c4;font-size:12px;margin-bottom:6px">لا توجد مؤشرات</div>`:"";
  scope=scope||"goal";
  const hasWeights=kpis.some(k=>+k.weight>0);
  return `<div class="kpi-tbl-wrap"><table class="kpi-tbl kpi-gov"><thead><tr>
    <th class="kpi-seq-h">#</th>
    <th>اسم المؤشر</th>
    ${hasWeights?`<th class="kpi-w-h">الوزن</th>`:""}
    <th class="kpi-num-h">المستهدف السنوي</th>
    <th class="kpi-num-h">المستهدف الكلي</th>
    <th class="kpi-num-h">الفعلي</th>
    <th class="kpi-pct-h">الإنجاز السنوي %</th>
    <th class="kpi-pct-h">الإنجاز الكلي %</th>
    ${hasWeights?`<th class="kpi-w-h">الأداء الموزون</th>`:""}
    <th>الحالة</th>
    <th></th>
  </tr></thead>
  <tbody>${kpis.map((k,i)=>{
    const hasVal=k.actual!==undefined&&k.actual!==null&&k.actual!=="";
    const pctAnnual=hasVal?Math.min(200,Math.round((+k.actual)/(+k.target_annual||+k.target||1)*100)):0;
    const pctTotal =hasVal?Math.min(200,Math.round((+k.actual)/(+k.target||1)*100)):0;
    const weightedPerf=hasWeights&&+k.weight>0?Math.round(pctAnnual*(+k.weight)/100):null;
    const col=kpiHex(Math.min(100,pctAnnual));
    const st=_kpiStatusGov(k);
    const isOwner=SESSION&&k.kpi_owner&&SESSION.username===k.kpi_owner;
    const hasPending=(STATE.kpi_reports||[]).some(r=>r.kpi_id===k.id&&r.status==="pending");
    return `<tr>
      <td class="kpi-seq">${toAr(i+1)}</td>
      <td class="kn">${esc(k.name)}${k.code?`<span class="kpi-code">${esc(k.code)}</span>`:""}</td>
      ${hasWeights?`<td class="kpi-w">${+k.weight>0?toAr(+k.weight)+"%":"—"}</td>`:""}
      <td class="kpi-num">${k.target_annual?esc(k.target_annual)+" "+esc(k.unit||""):"—"}</td>
      <td class="kpi-num">${esc(k.target||"—")} ${k.target?esc(k.unit||""):""}</td>
      <td class="kpi-num" style="color:${hasVal?col:"var(--muted)"};font-weight:700">${hasVal?esc(k.actual)+" "+esc(k.unit||""):"—"}</td>
      <td class="kpi-pct">
        <div class="kprog">
          <div class="kbar"><div class="kfill" style="width:${Math.min(100,pctAnnual)}%;background:${col}"></div></div>
          <span style="font-size:12px;font-weight:700;color:${col};min-width:38px">${hasVal?toAr(pctAnnual)+"%":"—"}</span>
        </div>
      </td>
      <td class="kpi-pct"><span style="font-size:12.5px;font-weight:700;color:${col}">${hasVal?toAr(pctTotal)+"%":"—"}</span></td>
      ${hasWeights?`<td class="kpi-w" style="color:${col};font-weight:700">${weightedPerf!==null?toAr(weightedPerf)+"%":"—"}</td>`:""}
      <td><span class="kpi-status-pill" style="background:${st.color}22;color:${st.color};border:1px solid ${st.color}44">${st.label}</span></td>
      <td style="white-space:nowrap">
        ${admin?`<button class="ebtn sm danger" onclick="delKpi('${parentId}','${k.id}')" type="button">حذف</button>`:""}
        ${(isOwner||admin)&&SESSION?`<button class="ebtn sm teal" onclick="showSubmitMeasurement('${scope}','${parentId}','${k.id}')" type="button" ${hasPending?"disabled title='يوجد تقرير معلّق'":""}>رفع قياس</button>`:""}
      </td></tr>`;
  }).join("")}</tbody></table></div>`;
}

function renderGoals(){
  document.getElementById("addGoalBtn").style.display=ADMIN_MODE?"":"none";
  const tree=document.getElementById("goalsTree");
  const generals=STATE.goals.filter(g=>g.type==="general");
  if(!generals.length){
    tree.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="9"/></svg>لا توجد أهداف استراتيجية بعد</div>`;
    return;
  }
  tree.innerHTML=generals.map((g,gi)=>{
    const subs=STATE.goals.filter(s=>s.parent_id===g.id&&s.type==="sub");
    const avg=kpiAvg(g.kpis);
    const col=kpiHex(avg);
    const pillar=STATE.pillars.find(p=>p.id===g.pillar_id);
    const persp=STATE.perspectives.find(p=>p.id===g.perspective_id);
    const PERSP_COLORS={"مالي":"#2ECC8F","عملاء":"#179C7C","عمليات":"#C9A24B","تعلم":"#8B5CF6"};
    const pc=persp?(PERSP_COLORS[Object.keys(PERSP_COLORS).find(k=>persp.name.includes(k))||""]||"var(--teal)"):"";
    return `
    <div class="goal-card" id="gc-${g.id}">
      <div class="gc-head" onclick="toggleGoal('${g.id}')">
        <div class="gc-num">${toAr(gi+1)}</div>
        <div class="gc-name">
          ${esc(g.name)}
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px">
            ${pillar?`<span style="font-size:11px;font-weight:600;color:var(--teal)">${esc(pillar.name)}</span>`:""}
            ${persp?`<span class="persp-badge" style="background:${pc}20;color:${pc};border:1px solid ${pc}40">${esc(persp.name)}</span>`:""}
            ${g.start||g.end?`<span style="font-size:11px;color:var(--muted)">${g.start?fmtDate(g.start):""}${g.end?" ← "+fmtDate(g.end):""}</span>`:""}
          </div>
        </div>
        <div class="gc-meta">
          <span class="gc-pct" style="color:${col}">${toAr(avg)}%</span>
          ${statusPill(calcStatus(avg,g.end||""))}
          ${ADMIN_MODE?`<button class="ebtn sm" onclick="event.stopPropagation();editGoal('${g.id}')" type="button">تعديل</button>
          <button class="ebtn sm danger" onclick="event.stopPropagation();delGoal('${g.id}')" type="button">حذف</button>`:""}
        </div>
      </div>
      <div class="gc-body">
        <div class="gc-bar"><span style="width:${avg}%;background:${col}"></span></div>
        ${(g.kpis&&g.kpis.length)||ADMIN_MODE?`<div class="kpi-sec-head" style="margin-top:8px"><span>مؤشرات الأداء</span>${ADMIN_MODE?`<button class="ebtn sm" onclick="showAddKpi('goal','${g.id}')" type="button">+ مؤشر</button>`:""}</div>${kpiTable(g.kpis,g.id,ADMIN_MODE)||`<div style="color:#aab5c4;font-size:12px;padding:4px 0">لا توجد مؤشرات</div>`}`:""}
        ${subs.length?`
        <div style="margin-top:14px">
          <div style="font-size:12.5px;font-weight:700;color:var(--navy);margin-bottom:8px">الأهداف الفرعية (التشغيلية):</div>
          ${subs.map(s=>{
            const dets=STATE.goals.filter(d=>d.parent_id===s.id&&d.type==="detailed");
            const savg=kpiAvg(s.kpis); const scol=kpiHex(savg);
            return `<div class="sub-goal" id="sg-${s.id}">
              <div class="sg-head" onclick="toggleSubGoal('${s.id}')">
                <div class="sg-dot" style="background:${scol}"></div>
                <div class="sg-name">${esc(s.name)}${s.start||s.end?`<span style="font-size:11px;color:var(--muted);margin-right:8px">${s.start?fmtDate(s.start):""}${s.end?" ← "+fmtDate(s.end):""}</span>`:""}</div>
                <span style="font-size:12px;font-weight:700;color:${scol};margin-right:auto">${toAr(savg)}%</span>
                ${ADMIN_MODE?`<button class="ebtn sm" onclick="event.stopPropagation();editGoal('${s.id}')" type="button">تعديل</button>
                <button class="ebtn sm danger" onclick="event.stopPropagation();delGoal('${s.id}')" type="button">حذف</button>`:""}
              </div>
              <div class="sg-body">
                ${(s.kpis&&s.kpis.length)||ADMIN_MODE?`<div class="kpi-sec-head"><span>مؤشرات</span>${ADMIN_MODE?`<button class="ebtn sm" onclick="showAddKpi('goal','${s.id}')" type="button">+ مؤشر</button>`:""}</div>${kpiTable(s.kpis,s.id,ADMIN_MODE)||`<div style="color:#aab5c4;font-size:12px">لا توجد مؤشرات</div>`}`:""}
                ${dets.length?`<div style="font-size:12px;font-weight:700;color:var(--muted);margin:10px 0 6px">الأهداف التفصيلية:</div>
                  ${dets.map(d=>`<div class="det-goal"><div class="dg-bullet"></div><div class="dg-name">${esc(d.name)}${d.start||d.end?`<span style="font-size:11px;color:var(--muted);margin-right:6px">${d.start?fmtDate(d.start):""}${d.end?" ← "+fmtDate(d.end):""}</span>`:""}</div>${ADMIN_MODE?`<div style="display:flex;gap:4px"><button class="ebtn sm" onclick="editGoal('${d.id}')" type="button">تعديل</button><button class="ebtn sm danger" onclick="delGoal('${d.id}')" type="button">حذف</button></div>`:""}</div>`).join("")}`:""}
                ${ADMIN_MODE?`<button class="ebtn sm" onclick="showAddSubGoal('${g.id}','${s.id}','detailed')" type="button" style="margin-top:8px">+ هدف تفصيلي</button>`:""}
              </div>
            </div>`;
          }).join("")}
        </div>`:""}
        ${ADMIN_MODE?`<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="ebtn sm" onclick="showAddSubGoal('${g.id}',null,'sub')" type="button">+ هدف فرعي</button>
        </div>`:""}
      </div>
    </div>`;
  }).join("");
}

function toggleGoal(id){ const el=document.getElementById("gc-"+id); if(el) el.classList.toggle("open"); }
function toggleSubGoal(id){ const el=document.getElementById("sg-"+id); if(el) el.classList.toggle("open"); }

/* ============================================================
   RENDER: INITIATIVES (top-level)
   ============================================================ */
function renderInitiatives(){
  document.getElementById("addInitiativeBtn").style.display=ADMIN_MODE?"":"none";
  const el=document.getElementById("initiativesList");
  if(!STATE.initiatives.length){
    el.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>لا توجد مبادرات بعد — أضف مبادرات واربطها بمحافظ</div>`;
    return;
  }
  el.innerHTML=`<div class="init-grid">${STATE.initiatives.map(ini=>{
    const pct=+ini.pct||0;
    const st=calcStatus(pct,ini.end);
    const col=kpiHex(pct);
    const linkedPfs=STATE.portfolios.filter(pf=>(pf.initiative_ids||[]).includes(ini.id));
    return `
    <div class="init-card" onclick="showInitiativeDetail('${ini.id}')">
      <div class="init-card-head" style="border-color:${col}">
        <div class="init-card-name">${esc(ini.name)}</div>
        ${statusPill(st)}
      </div>
      <div style="margin:8px 0 4px;text-align:center">${svgGauge(pct,120,68)}</div>
      ${ini.owner?`<div style="font-size:12px;color:var(--muted);margin-top:6px">المسؤول: <b style="color:var(--navy)">${esc(ini.owner)}</b></div>`:""}
      ${ini.end?`<div style="font-size:11.5px;color:var(--muted);margin-top:3px">الانتهاء: ${fmtDate(ini.end)}</div>`:""}
      ${linkedPfs.length?`<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">${linkedPfs.map(pf=>`<span style="font-size:11px;background:rgba(13,59,107,.08);color:var(--navy);padding:2px 8px;border-radius:99px">${esc(pf.name)}</span>`).join("")}</div>`:""}
      ${ADMIN_MODE?`<div style="display:flex;gap:6px;margin-top:10px" onclick="event.stopPropagation()">
        <button class="ebtn sm" onclick="editInitiative('${ini.id}')" type="button">تعديل</button>
        <button class="ebtn sm danger" onclick="delInitiative('${ini.id}')" type="button">حذف</button>
      </div>`:""}
    </div>`;
  }).join("")}</div>`;
}

/* ============================================================
   RENDER: PORTFOLIOS
   ============================================================ */
function renderPortfolios(){
  document.getElementById("addPortfolioBtn").style.display=ADMIN_MODE?"":"none";
  const el=document.getElementById("portfoliosList");
  if(!STATE.portfolios.length){
    el.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>لا توجد محافظ بعد</div>`;
    return;
  }
  el.innerHTML=STATE.portfolios.map(pf=>{
    const initIds=pf.initiative_ids||[];
    const inits=initIds.map(id=>STATE.initiatives.find(i=>i.id===id)).filter(Boolean);
    const avgPct=inits.length?Math.round(inits.reduce((s,i)=>s+(+i.pct||0),0)/inits.length):0;
    return `
    <div class="portfolio-card">
      <div class="pf-head">
        <div class="pf-name">${esc(pf.name)}</div>
        <div class="pf-stats">${toAr(inits.length)} مبادرة · ${toAr(avgPct)}% إنجاز</div>
        ${ADMIN_MODE?`<button class="ebtn sm" style="background:rgba(255,255,255,.15);color:#fff;border-color:rgba(255,255,255,.3)" onclick="editPortfolio('${pf.id}')" type="button">تعديل</button>
        <button class="ebtn sm danger" style="background:rgba(255,100,80,.2);color:#fff;border-color:rgba(255,100,80,.3)" onclick="delPortfolio('${pf.id}')" type="button">حذف</button>`:""}
      </div>
      <div class="pf-body">
        ${inits.map(ini=>{
          const pct=+ini.pct||0;
          const col=kpiHex(pct);
          const st=calcStatus(pct,ini.end);
          return `<div class="initiative-row" onclick="showInitiativeDetail('${ini.id}')">
            <div class="ir-top">
              <div class="ir-name">${esc(ini.name)}</div>
              ${statusPill(st)}
              <span class="ir-pct" style="color:${col}">${toAr(pct)}%</span>
            </div>
            <div class="ir-bar"><div class="ir-fill" style="width:${pct}%;background:${col}"></div></div>
            <div class="ir-meta">
              ${ini.owner?`<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>${esc(ini.owner)}</span>`:""}
              ${ini.start?`<span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${fmtDate(ini.start)}</span>`:""}
              ${ini.end?`<span>← ${fmtDate(ini.end)}</span>`:""}
            </div>
          </div>`;
        }).join("")}
        ${!inits.length&&ADMIN_MODE?`<div style="color:#aab5c4;font-size:12.5px;padding:10px 0;font-style:italic">لا توجد مبادرات مرتبطة — عدّل المحفظة لإضافة مبادرات</div>`:""}
      </div>
    </div>`;
  }).join("")+
  (ADMIN_MODE?`<div class="add-card" onclick="showAddPortfolio()"><div class="plus">+</div><b>محفظة جديدة</b><span>أضف محفظة استراتيجية</span></div>`:"");
}

/* ============================================================
   RENDER: EXEC PLANS
   ============================================================ */
function renderExecPlans(){
  document.getElementById("addExecPlanBtn").style.display=ADMIN_MODE?"":"none";
  const el=document.getElementById("execPlansList");
  if(!STATE.exec_plans.length){
    el.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>لا توجد خطط تنفيذية بعد</div>`;
    return;
  }
  el.innerHTML=STATE.exec_plans.map(ep=>`
    <div class="ep-card">
      <div class="ep-head">
        ${ep.year?`<span class="ep-year">${esc(ep.year)}</span>`:""}
        <span class="ep-name">${esc(ep.name)}</span>
        ${ADMIN_MODE?`<button class="ebtn sm danger" onclick="delExecPlan('${ep.id}')" type="button" style="margin-right:auto">حذف</button>`:""}
      </div>
      ${(ep.objectives||[]).map(obj=>`
        <div class="ep-obj">
          <div class="eo-dot"></div>
          <div class="eo-txt">${esc(obj.name)}${obj.goal_id?(()=>{const g=STATE.goals.find(x=>x.id===obj.goal_id);return g?`<div style="font-size:11px;color:var(--teal);margin-top:2px">← ${esc(g.name)}</div>`:""})():""}
          </div>
          ${ADMIN_MODE?`<button class="ebtn sm danger" onclick="delExecObj('${ep.id}','${obj.id}')" type="button">حذف</button>`:""}
        </div>`).join("")}
      ${ADMIN_MODE?`<button class="ebtn sm" onclick="showAddExecObj('${ep.id}')" type="button" style="margin-top:10px">+ هدف تنفيذي</button>`:""}
    </div>`).join("");
}

/* ============================================================
   RENDER: OPERATIONAL
   ============================================================ */
function renderOperGoals(){
  document.getElementById("addOperGoalBtn").style.display=ADMIN_MODE?"":"none";
  const el=document.getElementById("operGoalsList");
  if(!STATE.oper_goals.length){
    el.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg>لا توجد أهداف تشغيلية بعد</div>`;
    return;
  }
  el.innerHTML=STATE.oper_goals.map((og,i)=>`
    <div class="oper-card">
      <div class="oc-head">
        <div class="oc-num">${toAr(i+1)}</div>
        <div class="oc-name">${esc(og.name)}</div>
        ${ADMIN_MODE?`<button class="ebtn sm" onclick="editOperGoal('${og.id}')" type="button">تعديل</button>
        <button class="ebtn sm danger" onclick="delOperGoal('${og.id}')" type="button">حذف</button>`:""}
      </div>
      ${kpiTable(og.kpis,og.id,ADMIN_MODE)}
      ${(og.programs||[]).length?`
      <div style="margin-top:14px">
        <div style="font-size:12.5px;font-weight:700;color:var(--navy);margin-bottom:8px">البرامج:</div>
        ${og.programs.map(pr=>`
          <div class="prog-row">
            <div class="pr-name">${esc(pr.name)}</div>
            <div style="display:flex;flex-wrap:wrap">${(pr.tasks||[]).map(t=>`<span class="task-chip ${t.status||""}">${esc(t.name)}</span>`).join("")}</div>
            ${ADMIN_MODE?`<div style="margin-top:8px;display:flex;gap:6px">
              <button class="ebtn sm" onclick="showAddTask('${og.id}','${pr.id}')" type="button">+ مهمة</button>
              <button class="ebtn sm danger" onclick="delProgram('${og.id}','${pr.id}')" type="button">حذف البرنامج</button>
            </div>`:""}
          </div>`).join("")}
      </div>`:""}
      ${ADMIN_MODE?`<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="ebtn sm" onclick="showAddProgram('${og.id}')" type="button">+ برنامج</button>
        <button class="ebtn sm" onclick="showAddKpi('oper','${og.id}')" type="button">+ مؤشر KPI</button>
      </div>`:""}
    </div>`).join("");
}

/* ============================================================
   ADMIN MODE + AUTH
   ============================================================ */
const ICON_LOCK=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`;
const ICON_EYE=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`;

function setAdminBtn(state){
  const b=document.getElementById("adminToggle");
  if(state==="login"){ b.innerHTML=ICON_LOCK+"تسجيل الدخول"; b.classList.remove("on"); }
  else if(state==="admin"){ b.innerHTML=ICON_LOCK+"وضع الإدارة"; b.classList.add("on"); }
  else { b.innerHTML=ICON_EYE+"وضع القراءة"; b.classList.remove("on"); }
}

document.getElementById("adminToggle").addEventListener("click",()=>{
  if(!SESSION){ showAuth(); return; }
  if(SESSION.role!=="owner"){ toast("وضع الإدارة متاح للمالك فقط","err"); return; }
  ADMIN_MODE=!ADMIN_MODE;
  setAdminBtn(ADMIN_MODE?"admin":"read");
  document.getElementById("adminBanner").style.display=ADMIN_MODE?"flex":"none";
  document.getElementById("manageUsersBtn").style.display=ADMIN_MODE?"":"none";
  document.getElementById("kpiLibraryBtn").style.display=ADMIN_MODE?"":"none";
  document.getElementById("adminSettingsBtn").style.display=ADMIN_MODE?"":"none";
  document.getElementById("pendingRptsBtn").style.display=ADMIN_MODE?"":"none";
  renderAll();
});

document.getElementById("logoutBtn").addEventListener("click",()=>{
  SESSION=null; ADMIN_MODE=false;
  document.getElementById("logoutBtn").style.display="none";
  document.getElementById("adminBanner").style.display="none";
  ["manageUsersBtn","kpiLibraryBtn","adminSettingsBtn","pendingRptsBtn"].forEach(id=>document.getElementById(id).style.display="none");
  setAdminBtn("login");
  renderAll();
  toast("تم تسجيل الخروج");
});

document.getElementById("saveAllBtn").addEventListener("click",saveAll);
document.getElementById("addGoalBtn").addEventListener("click",()=>showAddGoal());
document.getElementById("addPillarBtn").addEventListener("click",showAddPillar);
document.getElementById("addOrientBtn").addEventListener("click",showAddOrient);
document.getElementById("addPortfolioBtn").addEventListener("click",showAddPortfolio);
document.getElementById("addExecPlanBtn").addEventListener("click",showAddExecPlan);
document.getElementById("addOperGoalBtn").addEventListener("click",showAddOperGoal);
document.getElementById("addInitiativeBtn").addEventListener("click",()=>showAddInitiative());

document.getElementById("kpiLibraryBtn").addEventListener("click",showKpiLibraryModal);
document.getElementById("adminSettingsBtn").addEventListener("click",showAdminSettings);
document.getElementById("pendingRptsBtn").addEventListener("click",showPendingReports);

function showAuth(){
  document.getElementById("authOv").classList.add("show");
  setTimeout(()=>document.getElementById("lgUser").focus(),80);
}
document.getElementById("lgBtn").addEventListener("click",async()=>{
  const u=document.getElementById("lgUser").value.trim();
  const p=document.getElementById("lgPass").value;
  if(!u||!p){ document.getElementById("lgErr").textContent="أدخل الاسم وكلمة المرور"; return; }
  document.getElementById("lgBtn").textContent="جارٍ التحقق…";
  const res=await apiPost({action:"login",username:u,password:p});
  document.getElementById("lgBtn").textContent="دخول";
  if(res.err){ document.getElementById("lgErr").textContent=res.err; return; }
  SESSION={role:res.role,username:u,password:p,_users:res.users||[]};
  document.getElementById("authOv").classList.remove("show");
  document.getElementById("lgUser").value=""; document.getElementById("lgPass").value="";
  document.getElementById("lgErr").textContent="";
  document.getElementById("logoutBtn").style.display="";
  document.getElementById("adminBanner").style.display="flex";
  // hide all privileged buttons first, then show selectively
  ["manageUsersBtn","kpiLibraryBtn","adminSettingsBtn","pendingRptsBtn"].forEach(id=>document.getElementById(id).style.display="none");
  if(res.role==="owner"){
    ADMIN_MODE=true;
    setAdminBtn("admin");
    document.getElementById("abWho").innerHTML=`<b>وضع الإدارة مُفعّل</b> — ${esc(res.username)} (المالك)`;
    document.getElementById("manageUsersBtn").style.display="";
    document.getElementById("kpiLibraryBtn").style.display="";
    document.getElementById("adminSettingsBtn").style.display="";
    document.getElementById("pendingRptsBtn").style.display="";
  } else {
    ADMIN_MODE=false;
    setAdminBtn("read");
    document.getElementById("abWho").innerHTML=`مرحباً <b>${esc(res.username)}</b> — <span style="color:var(--teal);font-weight:700">مستخدم</span>`;
    document.getElementById("pendingRptsBtn").style.display=""; // for KPI owners to submit/view reports
  }
  renderAll();
  toast("مرحباً "+esc(res.username)+" ✓");
});
document.getElementById("lgPass").addEventListener("keydown",e=>{ if(e.key==="Enter") document.getElementById("lgBtn").click(); });

/* ============================================================
   TABS
   ============================================================ */
document.querySelectorAll(".ltab").forEach(btn=>{
  btn.addEventListener("click",()=>{
    document.querySelectorAll(".ltab").forEach(b=>b.classList.remove("on"));
    btn.classList.add("on");
    const t=btn.dataset.tab;
    document.getElementById("paneStrategic").style.display=t==="strategic"?"":"none";
    document.getElementById("paneExecutive").style.display=t==="executive"?"":"none";
    document.getElementById("paneOperational").style.display=t==="operational"?"":"none";
  });
});

/* Strategy Map toggle */
let _mapOn=false;
document.getElementById("mapToggleBtn").addEventListener("click",()=>{
  _mapOn=!_mapOn;
  document.getElementById("stratMapPane").style.display=_mapOn?"":"none";
  document.getElementById("stratListPane").style.display=_mapOn?"none":"";
  document.getElementById("mapToggleBtn").innerHTML=_mapOn
    ?`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6l4-4 4 4M8 18l4 4 4-4"/><path d="M4 12h16"/></svg>عرض القائمة`
    :`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z"/><path d="M9 4v13M15 7v13"/></svg>خريطة استراتيجية`;
  if(_mapOn) renderStratMap();
});

/* ============================================================
   MODAL HELPERS
   ============================================================ */
const overlay=document.getElementById("overlay");
const modal=document.getElementById("modal");
function openModal(title,bodyHTML){
  modal.innerHTML=`<div class="mh"><h3>${title}</h3>
    <button class="close" onclick="closeModal()" type="button"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
  </div><div class="mb">${bodyHTML}</div>`;
  overlay.classList.add("show");
}
function closeModal(){ overlay.classList.remove("show"); }
overlay.addEventListener("click",e=>{ if(e.target===overlay) closeModal(); });

/* ============================================================
   IDENTITY EDIT
   ============================================================ */
document.getElementById("editIdentityBtn").addEventListener("click",()=>{
  const id=STATE.identity;
  openModal("تعديل الهوية الاستراتيجية",`
    <div class="eform">
      <div class="fl"><label>الرؤية</label><textarea id="fVision" rows="3">${esc(id.vision)}</textarea></div>
      <div class="fl"><label>الرسالة</label><textarea id="fMission" rows="3">${esc(id.mission)}</textarea></div>
      <div class="fl"><label>القيم (اكتب قيمة ثم Enter أو فاصلة)</label>
        <div class="tag-builder" id="valuesBuilder">
          ${(id.values||[]).map(v=>`<span class="tag-item">${esc(v)}<span class="tx" onclick="removeTag(this)">×</span></span>`).join("")}
          <input type="text" id="valInput" placeholder="أضف قيمة…">
        </div>
      </div>
      <div class="faprow">
        <button class="ebtn primary" onclick="saveIdentity()" type="button">حفظ</button>
        <button class="ebtn" onclick="closeModal()" type="button">إلغاء</button>
      </div>
    </div>`);
  document.getElementById("valInput").addEventListener("keydown",e=>{ if(e.key==="Enter"||e.key===","){ e.preventDefault(); addTag(); } });
});
function addTag(){
  const inp=document.getElementById("valInput");
  const v=inp.value.trim().replace(/,$/,"");
  if(!v) return;
  const b=document.getElementById("valuesBuilder");
  const span=document.createElement("span");
  span.className="tag-item";
  span.innerHTML=`${esc(v)}<span class="tx" onclick="removeTag(this)">×</span>`;
  b.insertBefore(span,inp);
  inp.value="";
}
function removeTag(el){ el.closest(".tag-item").remove(); }
function saveIdentity(){
  addTag();
  const vals=Array.from(document.querySelectorAll("#valuesBuilder .tag-item")).map(s=>s.childNodes[0].textContent.trim());
  STATE.identity={vision:document.getElementById("fVision").value.trim(),mission:document.getElementById("fMission").value.trim(),values:vals};
  closeModal(); renderIdentity();
  logChange("تعديل","الهوية الاستراتيجية","الرؤية — الرسالة — القيم"); dirtySave();
}

/* ============================================================
   PILLAR CRUD
   ============================================================ */
function pillarForm(p){
  const axes=(p&&p.axes||[]).map(a=>a.name||a).join("، ");
  return `<div class="eform">
    <div class="fl"><label>اسم الركيزة</label><input id="fPillarName" value="${esc(p?p.name:"")}"></div>
    <div class="fl"><label>المحاور (مفصولة بفاصلة أو سطر جديد)</label><textarea id="fAxes" rows="3">${esc(axes)}</textarea></div>
    <div class="faprow">
      <button class="ebtn primary" onclick="savePillar(${p?`'${p.id}'`:null})" type="button">حفظ</button>
      <button class="ebtn" onclick="closeModal()" type="button">إلغاء</button>
    </div>
  </div>`;
}
function showAddPillar(){ openModal("إضافة ركيزة استراتيجية",pillarForm(null)); }
function editPillar(id){ if(!ADMIN_MODE) return; const p=STATE.pillars.find(x=>x.id===id); openModal("تعديل الركيزة",pillarForm(p)); }
function savePillar(id){
  const name=document.getElementById("fPillarName").value.trim();
  const axes=document.getElementById("fAxes").value.split(/[،,\n]+/).map(s=>s.trim()).filter(Boolean).map(n=>({id:uid(),name:n}));
  if(!name) return;
  if(id){ const p=STATE.pillars.find(x=>x.id===id); if(p){p.name=name;p.axes=axes;} }
  else STATE.pillars.push({id:uid(),name,axes});
  closeModal(); renderPillars(); renderGoals(); renderStratMap();
  logChange(id?"تعديل":"إضافة","ركيزة",name); dirtySave();
}
function delPillar(id){ if(!confirm("حذف هذه الركيزة؟")) return; const _dp=STATE.pillars.find(p=>p.id===id); STATE.pillars=STATE.pillars.filter(p=>p.id!==id); renderPillars(); renderStratMap(); logChange("حذف","ركيزة",_dp?_dp.name:""); dirtySave(); }

/* ============================================================
   ORIENTATION CRUD
   ============================================================ */
function showAddOrient(){
  openModal("إضافة توجه / تطلع",`<div class="eform">
    <div class="fl"><label>نص التوجه</label><input id="fOrient" placeholder="أدخل التوجه الاستراتيجي…"></div>
    <div class="faprow"><button class="ebtn primary" onclick="saveOrient()" type="button">إضافة</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div>
  </div>`);
  setTimeout(()=>document.getElementById("fOrient").focus(),50);
}
function saveOrient(){
  const name=document.getElementById("fOrient").value.trim(); if(!name) return;
  STATE.orientations.push({id:uid(),name});
  closeModal(); renderOrientations();
  logChange("إضافة","توجه",name); dirtySave();
}
function delOrient(id){ const _do=STATE.orientations.find(o=>o.id===id||o===id); STATE.orientations=STATE.orientations.filter(o=>o.id!==id&&o!==id); renderOrientations(); logChange("حذف","توجه",_do?(_do.name||_do):""); dirtySave(); }

/* ============================================================
   GOAL CRUD
   ============================================================ */
function _goalFormFields(g){
  const pillarOpts=STATE.pillars.map(p=>`<option value="${p.id}"${g&&g.pillar_id===p.id?" selected":""}>${esc(p.name)}</option>`).join("");
  const perspOpts=STATE.perspectives.map(p=>`<option value="${p.id}"${g&&g.perspective_id===p.id?" selected":""}>${esc(p.name)}</option>`).join("");
  return `
    <div class="fl"><label>اسم الهدف</label><input id="fGoalName" value="${esc(g?g.name:"")}" placeholder="الهدف الاستراتيجي…"></div>
    ${pillarOpts?`<div class="fl"><label>الركيزة</label><select id="fGoalPillar"><option value="">— غير مرتبط —</option>${pillarOpts}</select></div>`:""}
    ${perspOpts?`<div class="fl"><label>المنظور (BSC)</label><select id="fGoalPersp"><option value="">— غير مصنّف —</option>${perspOpts}</select></div>`:""}
    <div class="frow">
      <div class="fl"><label>تاريخ البدء</label><input id="fGoalStart" type="date" value="${esc(g?g.start||"":"")}"></div>
      <div class="fl"><label>تاريخ الانتهاء</label><input id="fGoalEnd" type="date" value="${esc(g?g.end||"":"")}"></div>
    </div>`;
}
function showAddGoal(){
  openModal("إضافة هدف استراتيجي",`<div class="eform">${_goalFormFields(null)}
    <div class="faprow"><button class="ebtn primary" onclick="saveGoal(null,'general',null)" type="button">إضافة</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div>
  </div>`);
  setTimeout(()=>document.getElementById("fGoalName").focus(),50);
}
function showAddSubGoal(parentId,subId,type){
  const label=type==="sub"?"هدف فرعي":"هدف تفصيلي";
  openModal(`إضافة ${label}`,`<div class="eform">
    <div class="fl"><label>اسم الهدف</label><input id="fGoalName" placeholder="${label}…"></div>
    <div class="faprow"><button class="ebtn primary" onclick="saveGoal('${parentId||""}','${type}','${subId||""}')" type="button">إضافة</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div>
  </div>`);
  setTimeout(()=>document.getElementById("fGoalName").focus(),50);
}
function editGoal(id){
  const g=STATE.goals.find(x=>x.id===id); if(!g) return;
  openModal("تعديل الهدف",`<div class="eform">${g.type==="general"?_goalFormFields(g):`<div class="fl"><label>الاسم</label><input id="fGoalName" value="${esc(g.name)}"></div><div class="frow"><div class="fl"><label>تاريخ البدء</label><input id="fGoalStart" type="date" value="${esc(g.start||"")}"></div><div class="fl"><label>تاريخ الانتهاء</label><input id="fGoalEnd" type="date" value="${esc(g.end||"")}"></div></div>`}
    <div class="faprow"><button class="ebtn primary" onclick="updateGoal('${id}')" type="button">حفظ</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div>
  </div>`);
  setTimeout(()=>document.getElementById("fGoalName").focus(),50);
}
function updateGoal(id){
  const g=STATE.goals.find(x=>x.id===id); if(!g) return;
  g.name=document.getElementById("fGoalName").value.trim();
  const ps=document.getElementById("fGoalPillar"); if(ps) g.pillar_id=ps.value||null;
  const pp=document.getElementById("fGoalPersp"); if(pp) g.perspective_id=pp.value||null;
  const gs=document.getElementById("fGoalStart"); if(gs) g.start=gs.value||null;
  const ge=document.getElementById("fGoalEnd"); if(ge) g.end=ge.value||null;
  closeModal(); renderGoals(); renderStratMap();
  logChange("تعديل","هدف",g.name); dirtySave();
}
function saveGoal(parentId,type,subParentId){
  const name=document.getElementById("fGoalName").value.trim(); if(!name) return;
  const pillarId=(document.getElementById("fGoalPillar")||{}).value||null;
  const perspId=(document.getElementById("fGoalPersp")||{}).value||null;
  const startV=(document.getElementById("fGoalStart")||{}).value||null;
  const endV=(document.getElementById("fGoalEnd")||{}).value||null;
  const pid=type==="detailed"?subParentId:parentId;
  STATE.goals.push({id:uid(),name,type,parent_id:pid||null,pillar_id:pillarId||null,perspective_id:perspId||null,start:startV,end:endV,kpis:[]});
  closeModal(); renderGoals(); renderStratMap(); updateKPIs(); updateTabBadges();
  logChange("إضافة","هدف",name); dirtySave();
}
function delGoal(id){
  if(!confirm("حذف هذا الهدف وكل ما يتبعه؟")) return;
  const _dg=STATE.goals.find(g=>g.id===id);
  const remove=ids=>{ ids.forEach(i=>{ remove(STATE.goals.filter(g=>g.parent_id===i).map(g=>g.id)); STATE.goals=STATE.goals.filter(g=>g.id!==i); }); };
  remove([id]);
  renderGoals(); renderStratMap(); updateKPIs(); updateTabBadges();
  logChange("حذف","هدف",_dg?_dg.name:""); dirtySave();
}

/* ============================================================
   KPI CRUD
   ============================================================ */
function showAddKpi(scope,parentId){
  const libHTML=STATE.kpi_library.length?`
    <div style="margin-bottom:14px">
      <div style="font-size:12.5px;font-weight:700;color:var(--teal);margin-bottom:8px">اختر من مكتبة المؤشرات:</div>
      <div class="lib-from">${STATE.kpi_library.map(k=>`
        <div class="lib-pick-row">
          <span class="lp-name">${esc(k.name)}</span>
          <span style="font-size:11.5px;color:var(--muted)">${esc(k.unit||"%")}</span>
          <button class="ebtn sm teal" onclick="addKpiFromLib('${scope}','${parentId}','${k.id}')" type="button">+ إضافة</button>
        </div>`).join("")}
      </div>
      <hr class="modal-divider">
      <div style="font-size:12.5px;font-weight:700;color:var(--navy);margin-bottom:8px">أو أضف مؤشراً جديداً:</div>
    </div>`:"";
  openModal("إضافة مؤشر KPI",`
    ${libHTML}
    <div class="eform">
      <div class="fl"><label>اسم المؤشر *</label><input id="fKpiName" placeholder="مثال: نسبة الرضا"></div>
      <div class="frow">
        <div class="fl"><label>الوحدة</label><input id="fKpiUnit" value="%" placeholder="%، ريال، مشروع…"></div>
        <div class="fl"><label>الوزن (%)</label><input id="fKpiWeight" type="number" min="0" max="100" value="" placeholder="اختياري"></div>
      </div>
      <div class="frow">
        <div class="fl"><label>المستهدف السنوي</label><input id="fKpiTargetAnnual" type="number" value="" placeholder="اختياري"></div>
        <div class="fl"><label>المستهدف الكلي</label><input id="fKpiTarget" type="number" value="100"></div>
      </div>
      <div class="fl"><label>الفعلي</label><input id="fKpiActual" type="number" value="0"></div>
      ${ADMIN_MODE?_kpiExtFields(null):""}
      <div class="faprow">
        <button class="ebtn primary" onclick="saveKpi('${scope}','${parentId}')" type="button">إضافة</button>
        <button class="ebtn" onclick="closeModal()" type="button">إلغاء</button>
      </div>
    </div>`);
  setTimeout(()=>{ const el=document.getElementById("fKpiName"); if(el) el.focus(); },50);
}

function addKpiFromLib(scope,parentId,libId){
  const lib=STATE.kpi_library.find(k=>k.id===libId); if(!lib) return;
  _addKpiToParent(scope,parentId,{id:uid(),name:lib.name,target:"100",actual:"0",unit:lib.unit||"%"});
  closeModal(); renderAll(); updateKPIs();
  logChange("إضافة من المكتبة","مؤشر KPI",lib.name); dirtySave();
  toast("تمت إضافة المؤشر من المكتبة ✓");
}
function saveKpi(scope,parentId){
  const name=document.getElementById("fKpiName").value.trim(); if(!name) return;
  const v=id=>((document.getElementById(id)||{}).value??"").trim();
  const kpi={id:uid(),name,
    target:v("fKpiTarget")||"100",
    actual:v("fKpiActual")||"0",
    unit:v("fKpiUnit")||"%",
    weight:v("fKpiWeight"),
    target_annual:v("fKpiTargetAnnual"),
    ...(ADMIN_MODE?_collectKpiExt():{})
  };
  _addKpiToParent(scope,parentId,kpi);
  closeModal(); renderAll(); updateKPIs();
  logChange("إضافة","مؤشر KPI",name); dirtySave();
}
function _addKpiToParent(scope,parentId,kpi){
  if(scope==="goal"){ const g=STATE.goals.find(x=>x.id===parentId); if(g){ if(!g.kpis)g.kpis=[]; g.kpis.push(kpi); } }
  if(scope==="init"){ const ini=STATE.initiatives.find(x=>x.id===parentId); if(ini){ if(!ini.kpis)ini.kpis=[]; ini.kpis.push(kpi); } }
  if(scope==="oper"){ const og=STATE.oper_goals.find(x=>x.id===parentId); if(og){ if(!og.kpis)og.kpis=[]; og.kpis.push(kpi); } }
}
function delKpi(parentId,kpiId){
  const _allk=[...STATE.goals.flatMap(g=>g.kpis||[]),...STATE.initiatives.flatMap(i=>i.kpis||[]),...STATE.oper_goals.flatMap(o=>o.kpis||[])];
  const _kn=(_allk.find(k=>k.id===kpiId)||{}).name||"";
  const g=STATE.goals.find(x=>x.id===parentId);
  if(g){ g.kpis=(g.kpis||[]).filter(k=>k.id!==kpiId); renderGoals(); updateKPIs(); logChange("حذف","مؤشر KPI",_kn); dirtySave(); return; }
  const ini=STATE.initiatives.find(x=>x.id===parentId);
  if(ini){ ini.kpis=(ini.kpis||[]).filter(k=>k.id!==kpiId); showInitiativeDetail(parentId); updateKPIs(); logChange("حذف","مؤشر KPI",_kn); dirtySave(); return; }
  const og=STATE.oper_goals.find(x=>x.id===parentId);
  if(og){ og.kpis=(og.kpis||[]).filter(k=>k.id!==kpiId); renderOperGoals(); updateKPIs(); logChange("حذف","مؤشر KPI",_kn); dirtySave(); }
}

/* ============================================================
   KPI LIBRARY
   ============================================================ */
function showKpiLibraryModal(){
  openModal("مكتبة مؤشرات الأداء",`
    <div id="kpiLibList"></div>
    <hr class="modal-divider">
    <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:10px">إضافة مؤشر للمكتبة</div>
    <div class="eform">
      <div class="frow">
        <div class="fl"><label>اسم المؤشر</label><input id="fLibName" placeholder="مثال: نسبة رضا العملاء"></div>
        <div class="fl"><label>الوحدة</label><input id="fLibUnit" value="%"></div>
      </div>
      <div class="faprow">
        <button class="ebtn primary" onclick="addToLibrary()" type="button">إضافة للمكتبة</button>
      </div>
    </div>`);
  renderLibList();
}
function renderLibList(){
  const el=document.getElementById("kpiLibList"); if(!el) return;
  if(!STATE.kpi_library.length){
    el.innerHTML=`<div style="color:#aab5c4;font-size:13px;padding:6px 0;font-style:italic">المكتبة فارغة — أضف مؤشرات لاستخدامها في أي مستوى</div>`;
    return;
  }
  el.innerHTML=STATE.kpi_library.map(k=>`
    <div class="lib-item">
      <span class="li-name">${esc(k.name)}</span>
      <span class="li-unit">${esc(k.unit||"%")}</span>
      <button class="ebtn sm danger" onclick="delFromLibrary('${k.id}')" type="button">حذف</button>
    </div>`).join("");
}
function addToLibrary(){
  const name=document.getElementById("fLibName").value.trim(); if(!name) return;
  const unit=document.getElementById("fLibUnit").value.trim()||"%";
  STATE.kpi_library.push({id:uid(),name,unit});
  document.getElementById("fLibName").value="";
  renderLibList();
  logChange("إضافة","مكتبة KPI",name); dirtySave();
  toast("تمت إضافة المؤشر للمكتبة ✓");
}
function delFromLibrary(id){
  const _dfk=STATE.kpi_library.find(k=>k.id===id);
  STATE.kpi_library=STATE.kpi_library.filter(k=>k.id!==id);
  renderLibList();
  logChange("حذف","مكتبة KPI",_dfk?_dfk.name:""); dirtySave();
}

/* ============================================================
   INITIATIVE CRUD
   ============================================================ */
function initiativeForm(ini){
  const iopts=STATE.initiative_options;
  const classOpts=iopts.classifications.map(v=>`<option value="${esc(v)}"${ini&&ini.classification===v?" selected":""}>${esc(v)}</option>`).join("");
  const execOpts=iopts.exec_types.map(v=>`<option value="${esc(v)}"${ini&&ini.exec_type===v?" selected":""}>${esc(v)}</option>`).join("");
  return `<div class="eform">
    ${ADMIN_MODE?`<div class="frow">
      <div class="fl"><label>رقم المبادرة</label><input id="fIniNum" value="${esc(ini?ini.num||""||"":"")}"></div>
      <div class="fl"><label>التصنيف</label>${classOpts?`<select id="fIniClass"><option value="">— غير محدد —</option>${classOpts}</select>`:`<input id="fIniClass" value="${esc(ini?ini.classification||"":"")}" placeholder="التصنيف…">`}</div>
    </div>`:""}
    <div class="fl"><label>اسم المبادرة *</label><input id="fIniName" value="${esc(ini?ini.name:"")}"></div>
    <div class="fl"><label>المسؤول / قائد المبادرة</label><input id="fIniOwner" value="${esc(ini?ini.owner||""||"":"")}"></div>
    ${ADMIN_MODE?`<div class="fl"><label>وصف المبادرة</label><textarea id="fIniDesc" rows="2">${esc(ini?ini.desc||"":"")}</textarea></div>`:""}
    ${ADMIN_MODE?`<div class="fl"><label>المخرج التنفيذي</label><textarea id="fIniOutput" rows="2">${esc(ini?ini.exec_output||"":"")}</textarea></div>`:""}
    ${execOpts?`<div class="fl"><label>نوع التنفيذ</label><select id="fIniExecType"><option value="">— غير محدد —</option>${execOpts}</select></div>`:""}
    <div class="frow">
      <div class="fl"><label>تاريخ البدء</label><input id="fIniStart" type="date" value="${esc(ini?ini.start||"":"")}"></div>
      <div class="fl"><label>تاريخ الانتهاء</label><input id="fIniEnd" type="date" value="${esc(ini?ini.end||"":"")}"></div>
    </div>
    <div class="fl"><label>نسبة الإنجاز (٪)</label><input id="fIniPct" type="number" min="0" max="100" value="${ini?+ini.pct||0:0}"></div>
  </div>`;
}
function showAddInitiative(){
  openModal("إضافة مبادرة استراتيجية",`${initiativeForm(null)}<div class="faprow"><button class="ebtn primary" onclick="saveInitiative(null)" type="button">إضافة</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div>`);
  setTimeout(()=>document.getElementById("fIniName").focus(),50);
}
function editInitiative(id){
  const ini=STATE.initiatives.find(x=>x.id===id); if(!ini) return;
  openModal("تعديل المبادرة",`${initiativeForm(ini)}<div class="faprow"><button class="ebtn primary" onclick="saveInitiative('${id}')" type="button">حفظ</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div>`);
}
function saveInitiative(id){
  const name=document.getElementById("fIniName").value.trim(); if(!name) return;
  const g=id=>( (document.getElementById(id)||{}).value ?? "" );
  const data={
    name,
    owner:g("fIniOwner").trim(),
    start:g("fIniStart"),
    end:g("fIniEnd"),
    pct:Math.min(100,Math.max(0,+g("fIniPct")||0)),
    exec_type:g("fIniExecType"),
  };
  if(ADMIN_MODE){
    data.num=g("fIniNum").trim();
    data.classification=g("fIniClass").trim();
    data.desc=g("fIniDesc").trim();
    data.exec_output=g("fIniOutput").trim();
  }
  if(id){
    const ini=STATE.initiatives.find(x=>x.id===id);
    if(ini) Object.assign(ini,data);
  } else {
    STATE.initiatives.push({id:uid(),...data,notes:[],kpis:[],milestones:[],linked_projects:[]});
  }
  closeModal(); renderInitiatives(); renderPortfolios(); updateKPIs(); updateTabBadges();
  logChange(id?"تعديل":"إضافة","مبادرة",name); dirtySave();
}
function delInitiative(id){
  if(!confirm("حذف هذه المبادرة؟ سيتم إزالتها من كل المحافظ المرتبطة.")) return;
  const _di=STATE.initiatives.find(i=>i.id===id);
  STATE.initiatives=STATE.initiatives.filter(i=>i.id!==id);
  STATE.portfolios.forEach(pf=>{ pf.initiative_ids=(pf.initiative_ids||[]).filter(x=>x!==id); });
  renderInitiatives(); renderPortfolios(); updateKPIs(); updateTabBadges();
  logChange("حذف","مبادرة",_di?_di.name:""); dirtySave();
}
function showInitiativeDetail(initId){
  const ini=STATE.initiatives.find(x=>x.id===initId); if(!ini) return;
  _renderIniModal(ini);
}

function _renderIniModal(ini){
  const pct=+ini.pct||0;
  const st=calcStatus(pct,ini.end);
  const linkedPfs=STATE.portfolios.filter(pf=>(pf.initiative_ids||[]).includes(ini.id));
  const isOwner=SESSION&&SESSION.username===ini.owner;
  const canEdit=ADMIN_MODE||isOwner;
  const notes=Array.isArray(ini.notes)?ini.notes:[];

  // ── Stats bar ──
  const mss=(ini.milestones||[]);
  const totalMs=mss.length;
  const doneMs=mss.filter(m=>+m.pct>=100).length;

  // ── Milestones HTML ──
  const msHTML=mss.length?mss.map((m,mi)=>{
    const mc=kpiHex(+m.pct||0);
    const types=(m.type_ids||[]).map(tid=>{const t=STATE.milestone_types.find(x=>x.id===tid);return t?`<span class="ms-type-chip">${esc(t.name)}</span>`:""}).join("");
    const ftags=(m.follow_up_tags||[]).map(tag=>`<span class="ms-type-chip" style="background:rgba(13,59,107,.07);color:var(--navy);border-color:rgba(13,59,107,.18)">${esc(tag)}</span>`).join("");
    const metaLine=[
      m.exec_type?`<span style="font-size:11.5px;color:var(--muted)">نوع التنفيذ: ${esc(m.exec_type)}</span>`:"",
      m.approval_auth?`<span style="font-size:11.5px;color:var(--muted)">الاعتماد: ${esc(m.approval_auth)}</span>`:"",
      m.media_coverage?`<span style="font-size:11.5px;color:var(--muted)">الإعلام: ${esc(m.media_coverage)}</span>`:"",
    ].filter(Boolean).join(" · ");
    return `<div class="ms-row" id="msr-${m.id}">
      <div class="ms-num">${toAr(mi+1)}</div>
      <div class="ms-body">
        <div class="ms-name">${esc(m.name)}${types?`<span style="display:inline-flex;gap:4px;margin-right:6px">${types}</span>`:""}</div>
        ${ftags?`<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px">${ftags}</div>`:""}
        ${m.start||m.end?`<div class="ms-dates">${m.start?fmtDate(m.start):""}${m.end?" ← "+fmtDate(m.end):""}</div>`:""}
        <div class="ms-bar-wrap"><div class="ms-bar"><div class="ms-fill" style="width:${+m.pct||0}%;background:${mc}"></div></div><span class="ms-pct" style="color:${mc}">${toAr(+m.pct||0)}%</span></div>
        ${metaLine?`<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:3px">${metaLine}</div>`:""}
        ${m.output?`<div class="ms-notes" style="margin-top:5px"><b style="font-size:11px;color:var(--teal)">المخرج:</b> ${esc(m.output)}</div>`:""}
        ${m.notes?`<div class="ms-notes">${esc(m.notes)}</div>`:""}
      </div>
      ${canEdit?`<div class="ms-acts">
        ${mi>0?`<button class="ebtn sm" onclick="moveMilestone('${ini.id}','${m.id}',-1)" type="button">↑</button>`:""}
        ${mi<mss.length-1?`<button class="ebtn sm" onclick="moveMilestone('${ini.id}','${m.id}',1)" type="button">↓</button>`:""}
        <button class="ebtn sm" onclick="editMilestone('${ini.id}','${m.id}')" type="button">تعديل</button>
        <button class="ebtn sm danger" onclick="delMilestone('${ini.id}','${m.id}')" type="button">حذف</button>
      </div>`:""}
    </div>`;
  }).join(""):`<div style="color:#aab5c4;font-size:12.5px;padding:8px 0;font-style:italic">لا توجد معالم بعد</div>`;

  // ── Linked projects HTML ──
  const lps=(ini.linked_projects||[]);
  const lpHTML=lps.length?lps.map(lp=>`<div class="lp-row">
    <span class="lp-name">${esc(lp.name)}</span>
    ${lp.url?`<a href="${esc(lp.url)}" target="_blank" class="ebtn sm teal" style="text-decoration:none">فتح الرابط</a>`:""}
    ${canEdit?`<button class="ebtn sm danger" onclick="delLinkedProject('${ini.id}','${lp.id}')" type="button">حذف</button>`:""}
  </div>`).join(""):`<div style="color:#aab5c4;font-size:12px;font-style:italic">لا توجد مشاريع مرتبطة</div>`;

  // ── Notes HTML ──
  const notesHTML=notes.length?notes.map(n=>{
    const d=new Date(n.ts);
    const dt=d.toLocaleDateString("ar-SA",{year:"numeric",month:"long",day:"numeric"})+" · "+d.toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"});
    const canDel=ADMIN_MODE||(SESSION&&SESSION.username===n.user);
    return `<div class="ini-note-item">
      <div class="ini-note-text">${esc(n.text)}</div>
      <div class="ini-note-meta">${esc(n.user)} · ${dt}
        ${canDel?`<button class="ebtn sm danger" onclick="delIniNote('${ini.id}','${n.id}')" type="button" style="margin-right:8px;padding:2px 8px">×</button>`:""}
      </div>
    </div>`;
  }).join(""):`<div style="color:#aab5c4;font-size:12.5px;font-style:italic;padding:6px 0">لا توجد ملاحظات بعد</div>`;

  const titleHtml=`${ini.num?`<span style="font-size:13px;color:var(--teal);font-weight:600;display:block;margin-bottom:2px">مبادرة رقم ${esc(ini.num)}</span>`:""}${esc(ini.name)}`;

  openModal(titleHtml,`
    ${ADMIN_MODE?`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <button class="ebtn sm" onclick="editInitiative('${ini.id}')" type="button">تعديل بيانات المبادرة</button>
      <button class="ebtn sm" onclick="showAddMilestone('${ini.id}')" type="button">+ معلم جديد</button>
      <button class="ebtn sm danger" onclick="delInitiative('${ini.id}')" type="button">حذف المبادرة</button>
    </div>`:""}

    <div class="ini-stats-bar">
      <div class="isb-item">
        <span class="isb-lbl">الحالة</span>
        <div>${svgGauge(pct,64,38)}</div>
        ${statusPill(st)}
      </div>
      <div class="isb-item">
        <span class="isb-lbl">المعالم المنجزة</span>
        <span class="isb-val">${totalMs?`${toAr(doneMs)} / ${toAr(totalMs)}`:"- / -"}</span>
      </div>
      <div class="isb-item">
        <span class="isb-lbl">من / إلى</span>
        <span class="isb-val" style="font-size:13px">${ini.start||ini.end?`${ini.start?fmtDate(ini.start):"—"} ← ${ini.end?fmtDate(ini.end):"—"}`:"-"}</span>
      </div>
    </div>

    ${ini.classification||ini.owner?`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      ${ini.classification?`<span style="font-size:11.5px;background:rgba(201,162,75,.1);color:var(--gold);border:1px solid rgba(201,162,75,.3);padding:2px 10px;border-radius:99px;font-weight:700">${esc(ini.classification)}</span>`:""}
      ${ini.owner?`<span style="font-size:11.5px;color:var(--muted)">المسؤول: <b style="color:var(--navy)">${esc(ini.owner)}</b></span>`:""}
      ${linkedPfs.length?linkedPfs.map(pf=>`<span style="font-size:11px;background:rgba(13,59,107,.07);color:var(--navy);padding:2px 8px;border-radius:99px">${esc(pf.name)}</span>`).join(""):""}
    </div>`:""}

    ${ini.desc?`<div class="ini-desc">${esc(ini.desc)}</div>`:""}

    ${ini.exec_output||ini.exec_type?`
    <div class="ini-sec-head"><span>التنفيذ والمتابعة</span></div>
    ${ini.exec_output?`<div style="background:rgba(23,156,124,.06);border:1px solid rgba(23,156,124,.2);border-radius:10px;padding:10px 12px;font-size:13.5px;color:var(--ink);margin-bottom:6px">
      <div style="font-size:11.5px;font-weight:700;color:var(--teal);margin-bottom:4px">المخرج التنفيذي</div>${esc(ini.exec_output)}</div>`:""}
    ${ini.exec_type?`<div style="font-size:13px;color:var(--muted)">نوع التنفيذ: <b style="color:var(--navy)">${esc(ini.exec_type)}</b></div>`:""}
    `:""}

    <div class="ini-sec-head" style="margin-top:12px">
      <span>ملاحظات المبادرة</span>
      ${canEdit?`<button class="ebtn sm" onclick="showAddIniNote('${ini.id}')" type="button">+ إضافة ملاحظة</button>`:""}
    </div>
    <div id="iniNotesWrap-${ini.id}">${notesHTML}</div>

    <div class="ini-sec-head" style="margin-top:12px">
      <span>المعالم وتواريخ الإنجاز (${toAr(mss.length)})</span>
      ${canEdit&&!ADMIN_MODE?`<button class="ebtn sm" onclick="showAddMilestone('${ini.id}')" type="button">+ معلم</button>`:""}
    </div>
    <div id="msListWrap-${ini.id}">${msHTML}</div>

    <div class="ini-sec-head" style="margin-top:12px">
      <span>المشاريع المرتبطة</span>
      ${canEdit?`<button class="ebtn sm" onclick="showAddLinkedProject('${ini.id}')" type="button">+ مشروع</button>`:""}
    </div>
    <div id="lpListWrap-${ini.id}">${lpHTML}</div>

    <div class="kpi-sec-head" style="margin-top:14px">
      <span>مؤشرات الأداء (KPIs)</span>
      ${ADMIN_MODE?`<button class="ebtn sm" onclick="showAddKpi('init','${ini.id}')" type="button">+ مؤشر</button>`:""}
    </div>
    ${kpiTable(ini.kpis,ini.id,ADMIN_MODE,"init")||`<div style="color:#aab5c4;font-size:12px">لا توجد مؤشرات</div>`}
  `);
}

/* ============================================================
   PORTFOLIO CRUD
   ============================================================ */
function portfolioForm(pf){
  const initIds=pf?(pf.initiative_ids||[]):[];
  const checks=STATE.initiatives.length?`<div class="init-pick-list">${STATE.initiatives.map(ini=>{
    const sel=initIds.includes(ini.id);
    const col=kpiHex(+ini.pct||0);
    return `<label class="init-pick-item${sel?" selected":""}" onclick="this.classList.toggle('selected');this.querySelector('input').checked=!this.querySelector('input').checked">
      <input type="checkbox" name="initCheck" value="${ini.id}" ${sel?"checked":""} style="accent-color:var(--teal)">
      <span class="ip-name">${esc(ini.name)}</span>
      <span class="ip-pct" style="color:${col}">${toAr(+ini.pct||0)}%</span>
    </label>`;
  }).join("")}</div>`:`<div style="color:#aab5c4;font-size:12.5px;font-style:italic">لا توجد مبادرات — أضف مبادرات أولاً من قسم المبادرات</div>`;
  return `<div class="eform">
    <div class="fl"><label>اسم المحفظة</label><input id="fPfName" value="${esc(pf?pf.name:"")}"></div>
    <div class="fl"><label>المبادرات المرتبطة (اختر من القائمة)</label>${checks}</div>
    <div class="faprow">
      <button class="ebtn primary" onclick="savePortfolio(${pf?`'${pf.id}'`:null})" type="button">حفظ</button>
      <button class="ebtn" onclick="closeModal()" type="button">إلغاء</button>
    </div>
  </div>`;
}
function showAddPortfolio(){ openModal("إضافة محفظة استراتيجية",portfolioForm(null)); setTimeout(()=>document.getElementById("fPfName").focus(),50); }
function editPortfolio(id){ const pf=STATE.portfolios.find(x=>x.id===id); if(!pf) return; openModal("تعديل المحفظة",portfolioForm(pf)); }
function savePortfolio(id){
  const name=document.getElementById("fPfName").value.trim(); if(!name) return;
  const checks=Array.from(document.querySelectorAll('input[name="initCheck"]:checked')).map(c=>c.value);
  if(id){ const pf=STATE.portfolios.find(x=>x.id===id); if(pf){pf.name=name;pf.initiative_ids=checks;} }
  else STATE.portfolios.push({id:uid(),name,initiative_ids:checks,goal_ids:[]});
  closeModal(); renderPortfolios(); updateKPIs(); updateTabBadges();
  logChange(id?"تعديل":"إضافة","محفظة",name); dirtySave();
}
function delPortfolio(id){ if(!confirm("حذف المحفظة؟")) return; const _dpf=STATE.portfolios.find(p=>p.id===id); STATE.portfolios=STATE.portfolios.filter(p=>p.id!==id); renderPortfolios(); updateKPIs(); updateTabBadges(); logChange("حذف","محفظة",_dpf?_dpf.name:""); dirtySave(); }

/* ============================================================
   EXEC PLANS CRUD
   ============================================================ */
function showAddExecPlan(){
  openModal("إضافة خطة تنفيذية",`<div class="eform">
    <div class="fl"><label>اسم الخطة</label><input id="fEpName" placeholder="مثال: الخطة التنفيذية السنوية"></div>
    <div class="fl"><label>السنة</label><input id="fEpYear" value="${new Date().getFullYear()}"></div>
    <div class="faprow"><button class="ebtn primary" onclick="saveExecPlan()" type="button">إضافة</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div>
  </div>`);
  setTimeout(()=>document.getElementById("fEpName").focus(),50);
}
function saveExecPlan(){ const name=document.getElementById("fEpName").value.trim(); if(!name) return; STATE.exec_plans.push({id:uid(),name,year:document.getElementById("fEpYear").value.trim(),objectives:[]}); closeModal(); renderExecPlans(); logChange("إضافة","خطة تنفيذية",name); dirtySave(); }
function delExecPlan(id){ if(!confirm("حذف الخطة التنفيذية؟")) return; const _dep=STATE.exec_plans.find(e=>e.id===id); STATE.exec_plans=STATE.exec_plans.filter(e=>e.id!==id); renderExecPlans(); logChange("حذف","خطة تنفيذية",_dep?_dep.name:""); dirtySave(); }
function showAddExecObj(epId){
  const goalOpts=STATE.goals.filter(g=>g.type==="general").map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join("");
  openModal("إضافة هدف تنفيذي",`<div class="eform">
    <div class="fl"><label>الهدف التنفيذي</label><input id="fEoName" placeholder="الهدف التنفيذي…"></div>
    ${goalOpts?`<div class="fl"><label>الهدف الاستراتيجي المرتبط</label><select id="fEoGoal"><option value="">— غير مرتبط —</option>${goalOpts}</select></div>`:""}
    <div class="faprow"><button class="ebtn primary" onclick="saveExecObj('${epId}')" type="button">إضافة</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div>
  </div>`);
  setTimeout(()=>document.getElementById("fEoName").focus(),50);
}
function saveExecObj(epId){
  const name=document.getElementById("fEoName").value.trim(); if(!name) return;
  const goalId=document.getElementById("fEoGoal")?document.getElementById("fEoGoal").value:"";
  const ep=STATE.exec_plans.find(e=>e.id===epId); if(!ep) return;
  if(!ep.objectives) ep.objectives=[];
  ep.objectives.push({id:uid(),name,goal_id:goalId||null});
  closeModal(); renderExecPlans();
  logChange("إضافة","هدف تنفيذي",name); dirtySave();
}
function delExecObj(epId,objId){ const ep=STATE.exec_plans.find(e=>e.id===epId); const _deo=ep&&(ep.objectives||[]).find(o=>o.id===objId); if(ep) ep.objectives=(ep.objectives||[]).filter(o=>o.id!==objId); renderExecPlans(); logChange("حذف","هدف تنفيذي",_deo?_deo.name:""); dirtySave(); }

/* ============================================================
   OPERATIONAL CRUD
   ============================================================ */
function showAddOperGoal(){
  openModal("إضافة هدف تشغيلي",`<div class="eform">
    <div class="fl"><label>اسم الهدف التشغيلي</label><input id="fOgName" placeholder="الهدف التشغيلي…"></div>
    <div class="faprow"><button class="ebtn primary" onclick="saveOperGoal(null)" type="button">إضافة</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div>
  </div>`);
  setTimeout(()=>document.getElementById("fOgName").focus(),50);
}
function editOperGoal(id){ const og=STATE.oper_goals.find(x=>x.id===id); if(!og) return; openModal("تعديل الهدف التشغيلي",`<div class="eform"><div class="fl"><label>الاسم</label><input id="fOgName" value="${esc(og.name)}"></div><div class="faprow"><button class="ebtn primary" onclick="saveOperGoal('${id}')" type="button">حفظ</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div></div>`); }
function saveOperGoal(id){
  const name=document.getElementById("fOgName").value.trim(); if(!name) return;
  if(id){ const og=STATE.oper_goals.find(x=>x.id===id); if(og) og.name=name; }
  else STATE.oper_goals.push({id:uid(),name,kpis:[],programs:[]});
  closeModal(); renderOperGoals(); updateTabBadges();
  logChange(id?"تعديل":"إضافة","هدف تشغيلي",name); dirtySave();
}
function delOperGoal(id){ if(!confirm("حذف الهدف التشغيلي؟")) return; const _dog=STATE.oper_goals.find(o=>o.id===id); STATE.oper_goals=STATE.oper_goals.filter(o=>o.id!==id); renderOperGoals(); updateTabBadges(); logChange("حذف","هدف تشغيلي",_dog?_dog.name:""); dirtySave(); }
function showAddProgram(ogId){
  openModal("إضافة برنامج",`<div class="eform"><div class="fl"><label>اسم البرنامج</label><input id="fProgName" placeholder="البرنامج…"></div><div class="faprow"><button class="ebtn primary" onclick="saveProgram('${ogId}')" type="button">إضافة</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div></div>`);
  setTimeout(()=>document.getElementById("fProgName").focus(),50);
}
function saveProgram(ogId){ const name=document.getElementById("fProgName").value.trim(); if(!name) return; const og=STATE.oper_goals.find(x=>x.id===ogId); if(!og) return; if(!og.programs)og.programs=[]; og.programs.push({id:uid(),name,tasks:[]}); closeModal(); renderOperGoals(); logChange("إضافة","برنامج",name); dirtySave(); }
function delProgram(ogId,progId){ const og=STATE.oper_goals.find(x=>x.id===ogId); const _dpr=og&&(og.programs||[]).find(p=>p.id===progId); if(og) og.programs=(og.programs||[]).filter(p=>p.id!==progId); renderOperGoals(); logChange("حذف","برنامج",_dpr?_dpr.name:""); dirtySave(); }
function showAddTask(ogId,progId){
  openModal("إضافة مهمة / مشروع",`<div class="eform">
    <div class="fl"><label>اسم المهمة</label><input id="fTaskName" placeholder="المهمة…"></div>
    <div class="fl"><label>الحالة</label><select id="fTaskStatus"><option value="none">لم تبدأ</option><option value="todo">جارية</option><option value="done">مكتملة</option><option value="late">متأخرة</option></select></div>
    <div class="faprow"><button class="ebtn primary" onclick="saveTask('${ogId}','${progId}')" type="button">إضافة</button><button class="ebtn" onclick="closeModal()" type="button">إلغاء</button></div>
  </div>`);
  setTimeout(()=>document.getElementById("fTaskName").focus(),50);
}
function saveTask(ogId,progId){ const name=document.getElementById("fTaskName").value.trim(); if(!name) return; const og=STATE.oper_goals.find(x=>x.id===ogId); const prog=og&&(og.programs||[]).find(x=>x.id===progId); if(!prog) return; if(!prog.tasks)prog.tasks=[]; prog.tasks.push({id:uid(),name,status:document.getElementById("fTaskStatus").value}); closeModal(); renderOperGoals(); logChange("إضافة","مهمة",name); dirtySave(); }

/* ============================================================
   USERS MODAL
   ============================================================ */
let _usersTemp=[];
document.getElementById("manageUsersBtn").addEventListener("click",()=>{
  _usersTemp=(SESSION&&SESSION._users?SESSION._users:[]).map(u=>({username:u.username,newpass:"",hash:u.password||""}));
  showUsersModal();
});
function showUsersModal(){
  openModal("إدارة المستخدمين",`
    <div id="usersList"></div>
    <button class="ebtn sm" onclick="addUserRow()" type="button" style="margin-top:8px">+ إضافة مستخدم</button>
    <div class="faprow" style="margin-top:14px">
      <button class="ebtn primary" onclick="saveUsers()" type="button">حفظ المستخدمين</button>
      <button class="ebtn" onclick="closeModal()" type="button">إلغاء</button>
    </div>`);
  renderUsersList();
}
function renderUsersList(){
  const el=document.getElementById("usersList"); if(!el) return;
  el.innerHTML=_usersTemp.map((u,i)=>`
    <div class="urow">
      <input class="uin" placeholder="اسم المستخدم" value="${esc(u.username)}" oninput="_usersTemp[${i}].username=this.value">
      <input class="uin" type="password" placeholder="${u.hash?"اتركها فارغة للإبقاء":"كلمة المرور"}" oninput="_usersTemp[${i}].newpass=this.value">
      <button class="ebtn sm danger" onclick="_usersTemp.splice(${i},1);renderUsersList()" type="button">حذف</button>
    </div>`).join("")||`<div style="color:#aab5c4;font-size:13px;padding:8px">لا يوجد مستخدمون</div>`;
}
function addUserRow(){ _usersTemp.push({username:"",newpass:"",hash:""}); renderUsersList(); }
async function saveUsers(){
  const users=_usersTemp.filter(u=>u.username.trim());
  const payload=users.map(u=>({username:u.username.trim(),password:u.newpass?u.newpass:(u.hash||u.username.trim())}));
  const res=await apiPost({action:"saveUsers",username:SESSION.username,password:SESSION.password,users:payload});
  if(res.err){ toast(res.err,"err"); return; }
  if(SESSION) SESSION._users=res.users||[];
  closeModal(); logChange("تعديل","المستخدمين","تم تحديث قائمة المستخدمين"); dirtySave(); toast("تم حفظ المستخدمين ✓");
}

/* ============================================================
   PERSPECTIVES CRUD (BSC مناظير)
   ============================================================ */
function showPerspectivesAdmin(){
  openModal("إدارة مناظير BSC",`
    <div id="perspList"></div>
    <hr class="modal-divider">
    <div class="eform">
      <div class="frow">
        <div class="fl"><label>اسم المنظور</label><input id="fPerspName" placeholder="مثال: المالي، العملاء…"></div>
        <div class="fl"><label>اللون (hex)</label><input id="fPerspColor" type="color" value="#179C7C" style="height:40px;padding:4px"></div>
      </div>
      <div class="faprow"><button class="ebtn primary" onclick="addPerspective()" type="button">إضافة</button></div>
    </div>`);
  renderPerspList();
}
function renderPerspList(){
  const el=document.getElementById("perspList"); if(!el) return;
  el.innerHTML=STATE.perspectives.length?STATE.perspectives.map(p=>`
    <div class="lib-item">
      <span class="persp-badge" style="background:${p.color||"var(--teal)"}20;color:${p.color||"var(--teal)"};border:1px solid ${p.color||"var(--teal)"}40">${esc(p.name)}</span>
      <button class="ebtn sm danger" onclick="delPerspective('${p.id}')" type="button">حذف</button>
    </div>`).join(""):`<div style="color:#aab5c4;font-size:13px;padding:6px 0;font-style:italic">لا توجد مناظير — أضف مناظير BSC</div>`;
}
function addPerspective(){
  const name=document.getElementById("fPerspName").value.trim(); if(!name) return;
  const color=document.getElementById("fPerspColor").value||"#179C7C";
  STATE.perspectives.push({id:uid(),name,color});
  document.getElementById("fPerspName").value="";
  renderPerspList(); logChange("إضافة","منظور BSC",name); dirtySave();
  toast("تمت إضافة المنظور ✓");
}
function delPerspective(id){
  const p=STATE.perspectives.find(x=>x.id===id);
  STATE.perspectives=STATE.perspectives.filter(x=>x.id!==id);
  renderPerspList(); logChange("حذف","منظور BSC",p?p.name:""); dirtySave();
}

/* ============================================================
   MILESTONE TYPES ADMIN
   ============================================================ */
function showMilestoneTypesAdmin(){
  openModal("إدارة أنواع المعالم",`
    <div id="msTypeList"></div>
    <hr class="modal-divider">
    <div class="eform">
      <div class="fl"><label>نوع المعلم</label><input id="fMsTypeName" placeholder="مثال: تنفيذ داخلي، عرض للقيادة…"></div>
      <div class="faprow"><button class="ebtn primary" onclick="addMsType()" type="button">إضافة</button></div>
    </div>`);
  renderMsTypeList();
}
function renderMsTypeList(){
  const el=document.getElementById("msTypeList"); if(!el) return;
  el.innerHTML=STATE.milestone_types.length?STATE.milestone_types.map(t=>`
    <div class="lib-item">
      <span class="li-name">${esc(t.name)}</span>
      <button class="ebtn sm danger" onclick="delMsType('${t.id}')" type="button">حذف</button>
    </div>`).join(""):`<div style="color:#aab5c4;font-size:13px;padding:6px 0;font-style:italic">لا توجد أنواع بعد</div>`;
}
function addMsType(){
  const name=document.getElementById("fMsTypeName").value.trim(); if(!name) return;
  STATE.milestone_types.push({id:uid(),name});
  document.getElementById("fMsTypeName").value="";
  renderMsTypeList(); logChange("إضافة","نوع معلم",name); dirtySave(); toast("تمت إضافة النوع ✓");
}
function delMsType(id){
  const t=STATE.milestone_types.find(x=>x.id===id);
  STATE.milestone_types=STATE.milestone_types.filter(x=>x.id!==id);
  renderMsTypeList(); logChange("حذف","نوع معلم",t?t.name:""); dirtySave();
}

/* ============================================================
   KPI OPTIONS ADMIN
   ============================================================ */
function showKpiOptionsAdmin(){
  const categories=[
    {key:"polarities",label:"القطبية",ex:"إيجابي، سلبي"},
    {key:"cumulatives",label:"التراكمية",ex:"تراكمي، غير تراكمي"},
    {key:"frequencies",label:"تكرار القياس",ex:"ربعي، شهري، سنوي"},
    {key:"departments",label:"الإدارات المالكة",ex:"الإدارة المالية…"},
    {key:"data_sources",label:"مصادر البيانات",ex:"المالية والمشتريات…"},
  ];
  openModal("إدارة خيارات مؤشرات الأداء",`
    <div class="kpi-opts-wrap">
      ${categories.map(c=>`
        <div class="kpi-opt-group">
          <div class="koi-label">${esc(c.label)}</div>
          <div id="koList_${c.key}"></div>
          <div class="frow" style="margin-top:6px">
            <input class="koi-inp" id="koInp_${c.key}" placeholder="${esc(c.ex)}">
            <button class="ebtn sm" onclick="addKpiOpt('${c.key}')" type="button">+</button>
          </div>
        </div>`).join("")}
    </div>`);
  categories.forEach(c=>renderKoList(c.key));
}
function renderKoList(key){
  const el=document.getElementById("koList_"+key); if(!el) return;
  const items=(STATE.kpi_options[key]||[]);
  el.innerHTML=items.length?items.map(v=>`
    <div class="lib-item" style="padding:4px 8px">
      <span class="li-name">${esc(v)}</span>
      <button class="ebtn sm danger" onclick="delKpiOpt('${key}','${esc(v)}')" type="button">×</button>
    </div>`).join(""):`<div style="color:#aab5c4;font-size:12px">— فارغ</div>`;
}
function addKpiOpt(key){
  const inp=document.getElementById("koInp_"+key); if(!inp) return;
  const val=inp.value.trim(); if(!val) return;
  if(!STATE.kpi_options[key]) STATE.kpi_options[key]=[];
  if(!STATE.kpi_options[key].includes(val)) STATE.kpi_options[key].push(val);
  inp.value="";
  renderKoList(key); dirtySave();
}
function delKpiOpt(key,val){
  if(!STATE.kpi_options[key]) return;
  STATE.kpi_options[key]=STATE.kpi_options[key].filter(v=>v!==val);
  renderKoList(key); dirtySave();
}

/* ============================================================
   ADMIN SETTINGS MODAL
   ============================================================ */
function showAdminSettings(){
  openModal("إعدادات النظام",`
    <div style="display:flex;flex-direction:column;gap:10px">
      <button class="ebtn" onclick="showPerspectivesAdmin()" type="button" style="justify-content:flex-start">مناظير BSC — قائمة المناظير</button>
      <button class="ebtn" onclick="showMilestoneTypesAdmin()" type="button" style="justify-content:flex-start">أنواع المعالم — قائمة الأنواع</button>
      <button class="ebtn" onclick="showInitiativeOptionsAdmin()" type="button" style="justify-content:flex-start">خيارات المبادرات (التصنيفات، التنفيذ، الاعتماد…)</button>
      <button class="ebtn" onclick="showKpiOptionsAdmin()" type="button" style="justify-content:flex-start">خيارات مؤشرات الأداء (KPI)</button>
      <button class="ebtn" onclick="showPendingReports()" type="button" style="justify-content:flex-start">تقارير القياس المعلّقة <span class="badge" style="background:var(--kpi-r);color:#fff;margin-right:6px">${toAr((STATE.kpi_reports||[]).filter(r=>r.status==="pending").length)}</span></button>
    </div>`);
}

/* ============================================================
   INITIATIVE OPTIONS ADMIN
   ============================================================ */
function showInitiativeOptionsAdmin(){
  const cats=[
    {key:"classifications", label:"التصنيفات",      ex:"إعلامي، تقني، خدمي…"},
    {key:"exec_types",      label:"أنواع التنفيذ",  ex:"تنفيذ داخلي، خارجي…"},
    {key:"follow_up_tags",  label:"وسوم المتابعة",  ex:"التنسيق مع أطراف خارجية…"},
    {key:"approval_auths",  label:"صلاحيات الاعتماد", ex:"مدير الإدارة، القيادة…"},
    {key:"media_coverages", label:"التغطية الإعلامية", ex:"واس، قناة رسمية…"},
  ];
  openModal("خيارات المبادرات والمعالم",`
    <div class="kpi-opts-wrap">
      ${cats.map(c=>`
        <div class="kpi-opt-group">
          <div class="koi-label">${esc(c.label)}</div>
          <div id="ioList_${c.key}"></div>
          <div class="frow" style="margin-top:6px">
            <input class="koi-inp" id="ioInp_${c.key}" placeholder="${esc(c.ex)}">
            <button class="ebtn sm" onclick="addIniOpt('${c.key}')" type="button">+</button>
          </div>
        </div>`).join("")}
    </div>`);
  cats.forEach(c=>renderIoList(c.key));
}
function renderIoList(key){
  const el=document.getElementById("ioList_"+key); if(!el) return;
  const items=(STATE.initiative_options[key]||[]);
  el.innerHTML=items.length?items.map(v=>`
    <div class="lib-item" style="padding:4px 8px">
      <span class="li-name">${esc(v)}</span>
      <button class="ebtn sm danger" onclick="delIniOpt('${key}','${esc(v)}')" type="button">×</button>
    </div>`).join(""):`<div style="color:#aab5c4;font-size:12px">— فارغ</div>`;
}
function addIniOpt(key){
  const inp=document.getElementById("ioInp_"+key); if(!inp) return;
  const val=inp.value.trim(); if(!val) return;
  if(!STATE.initiative_options[key]) STATE.initiative_options[key]=[];
  if(!STATE.initiative_options[key].includes(val)) STATE.initiative_options[key].push(val);
  inp.value=""; renderIoList(key); dirtySave();
}
function delIniOpt(key,val){
  if(!STATE.initiative_options[key]) return;
  STATE.initiative_options[key]=STATE.initiative_options[key].filter(v=>v!==val);
  renderIoList(key); dirtySave();
}

/* ============================================================
   MILESTONES CRUD
   ============================================================ */
function _msForm(m){
  const io=STATE.initiative_options;
  const typeChecks=STATE.milestone_types.map(t=>{
    const sel=m&&(m.type_ids||[]).includes(t.id);
    return `<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
      <input type="checkbox" name="msType" value="${t.id}" ${sel?"checked":""} style="accent-color:var(--teal)">${esc(t.name)}</label>`;
  }).join("");
  const tagChecks=io.follow_up_tags.map(tag=>{
    const sel=m&&(m.follow_up_tags||[]).includes(tag);
    return `<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;background:${sel?"rgba(13,59,107,.08)":"#f7fafc"};border:1px solid var(--line);border-radius:8px;padding:5px 10px">
      <input type="checkbox" name="msTag" value="${esc(tag)}" ${sel?"checked":""} style="accent-color:var(--teal)">${esc(tag)}</label>`;
  }).join("");
  const execOpts=io.exec_types.map(v=>`<option value="${esc(v)}"${m&&m.exec_type===v?" selected":""}>${esc(v)}</option>`).join("");
  const authOpts=io.approval_auths.map(v=>`<option value="${esc(v)}"${m&&m.approval_auth===v?" selected":""}>${esc(v)}</option>`).join("");
  const mediaOpts=io.media_coverages.map(v=>`<option value="${esc(v)}"${m&&m.media_coverage===v?" selected":""}>${esc(v)}</option>`).join("");
  return `<div class="eform">
    <div class="fl"><label>اسم المعلم *</label><input id="fMsName" value="${esc(m?m.name:"")}"></div>
    ${typeChecks?`<div class="fl"><label>نوع المعلم</label><div style="display:flex;flex-wrap:wrap;gap:8px">${typeChecks}</div></div>`:""}
    <div class="frow">
      <div class="fl"><label>تاريخ البدء</label><input id="fMsStart" type="date" value="${esc(m?m.start||"":"")}"></div>
      <div class="fl"><label>تاريخ الانتهاء</label><input id="fMsEnd" type="date" value="${esc(m?m.end||"":"")}"></div>
    </div>
    <div class="fl"><label>نسبة الإنجاز (%)</label><input id="fMsPct" type="number" min="0" max="100" value="${m?+m.pct||0:0}"></div>
    <div class="fl"><label>المخرج</label><textarea id="fMsOutput" rows="2">${esc(m?m.output||"":"")}</textarea></div>
    ${execOpts?`<div class="fl"><label>نوع التنفيذ</label><select id="fMsExecType"><option value="">— غير محدد —</option>${execOpts}</select></div>`:""}
    ${tagChecks?`<div class="fl"><label>وسوم المتابعة (يمكن اختيار أكثر من واحد)</label><div style="display:flex;flex-wrap:wrap;gap:6px">${tagChecks}</div></div>`:""}
    ${authOpts?`<div class="fl"><label>صلاحية الاعتماد</label><select id="fMsAuth"><option value="">— غير محدد —</option>${authOpts}</select></div>`:""}
    ${mediaOpts?`<div class="fl"><label>متطلبات التغطية الإعلامية</label><select id="fMsMedia"><option value="">— غير محدد —</option>${mediaOpts}</select></div>`:""}
    <div class="fl"><label>ملاحظات</label><textarea id="fMsNotes" rows="2">${esc(m?m.notes||"":"")}</textarea></div>
  </div>`;
}
function showAddMilestone(iniId){
  openModal("إضافة معلم",`${_msForm(null)}<div class="faprow"><button class="ebtn primary" onclick="saveMilestone('${iniId}',null)" type="button">إضافة</button><button class="ebtn" onclick="showInitiativeDetail('${iniId}')" type="button">إلغاء</button></div>`);
  setTimeout(()=>document.getElementById("fMsName").focus(),50);
}
function editMilestone(iniId,msId){
  const ini=STATE.initiatives.find(x=>x.id===iniId); if(!ini) return;
  const m=(ini.milestones||[]).find(x=>x.id===msId); if(!m) return;
  openModal("تعديل المعلم",`${_msForm(m)}<div class="faprow"><button class="ebtn primary" onclick="saveMilestone('${iniId}','${msId}')" type="button">حفظ</button><button class="ebtn" onclick="showInitiativeDetail('${iniId}')" type="button">إلغاء</button></div>`);
}
function saveMilestone(iniId,msId){
  const name=document.getElementById("fMsName").value.trim(); if(!name) return;
  const ini=STATE.initiatives.find(x=>x.id===iniId); if(!ini) return;
  if(!ini.milestones) ini.milestones=[];
  const g=id=>((document.getElementById(id)||{}).value??'');
  const typeIds=Array.from(document.querySelectorAll('input[name="msType"]:checked')).map(c=>c.value);
  const followTags=Array.from(document.querySelectorAll('input[name="msTag"]:checked')).map(c=>c.value);
  const data={
    name, type_ids:typeIds, follow_up_tags:followTags,
    start:g("fMsStart"), end:g("fMsEnd"),
    pct:Math.min(100,Math.max(0,+g("fMsPct")||0)),
    output:g("fMsOutput").trim(),
    exec_type:g("fMsExecType"),
    approval_auth:g("fMsAuth"),
    media_coverage:g("fMsMedia"),
    notes:g("fMsNotes").trim()
  };
  if(msId){ const m=ini.milestones.find(x=>x.id===msId); if(m) Object.assign(m,data); }
  else ini.milestones.push({id:uid(),...data});
  logChange(msId?"تعديل":"إضافة","معلم",name); dirtySave();
  _renderIniModal(ini);
}
function delMilestone(iniId,msId){
  const ini=STATE.initiatives.find(x=>x.id===iniId); if(!ini) return;
  const m=(ini.milestones||[]).find(x=>x.id===msId);
  ini.milestones=(ini.milestones||[]).filter(x=>x.id!==msId);
  logChange("حذف","معلم",m?m.name:""); dirtySave();
  _renderIniModal(ini);
}
function moveMilestone(iniId,msId,dir){
  const ini=STATE.initiatives.find(x=>x.id===iniId); if(!ini) return;
  const ms=ini.milestones||[];
  const i=ms.findIndex(x=>x.id===msId); if(i<0) return;
  const j=i+dir; if(j<0||j>=ms.length) return;
  [ms[i],ms[j]]=[ms[j],ms[i]];
  dirtySave(); _renderIniModal(ini);
}

/* ============================================================
   LINKED PROJECTS
   ============================================================ */
function showAddLinkedProject(iniId){
  openModal("إضافة مشروع مرتبط",`<div class="eform">
    <div class="fl"><label>اسم المشروع</label><input id="fLpName" placeholder="اسم المشروع أو البرنامج…"></div>
    <div class="fl"><label>الرابط (اختياري)</label><input id="fLpUrl" type="url" placeholder="https://…"></div>
    <div class="faprow">
      <button class="ebtn primary" onclick="saveLinkedProject('${iniId}')" type="button">إضافة</button>
      <button class="ebtn" onclick="showInitiativeDetail('${iniId}')" type="button">إلغاء</button>
    </div>
  </div>`);
  setTimeout(()=>document.getElementById("fLpName").focus(),50);
}
function saveLinkedProject(iniId){
  const name=document.getElementById("fLpName").value.trim(); if(!name) return;
  const url=(document.getElementById("fLpUrl")||{}).value?.trim()||"";
  const ini=STATE.initiatives.find(x=>x.id===iniId); if(!ini) return;
  if(!ini.linked_projects) ini.linked_projects=[];
  ini.linked_projects.push({id:uid(),name,url});
  logChange("إضافة","مشروع مرتبط",name); dirtySave(); _renderIniModal(ini);
}
function delLinkedProject(iniId,lpId){
  const ini=STATE.initiatives.find(x=>x.id===iniId); if(!ini) return;
  const lp=(ini.linked_projects||[]).find(x=>x.id===lpId);
  ini.linked_projects=(ini.linked_projects||[]).filter(x=>x.id!==lpId);
  logChange("حذف","مشروع مرتبط",lp?lp.name:""); dirtySave(); _renderIniModal(ini);
}

/* ============================================================
   INITIATIVE NOTES (timestamped array)
   ============================================================ */
function showAddIniNote(iniId){
  openModal("إضافة ملاحظة",`<div class="eform">
    <div class="fl"><label>نص الملاحظة</label><textarea id="fNoteText" rows="4" style="min-height:100px" placeholder="اكتب ملاحظتك هنا…"></textarea></div>
    <div class="faprow">
      <button class="ebtn primary" onclick="saveIniNote('${iniId}')" type="button">حفظ الملاحظة</button>
      <button class="ebtn" onclick="showInitiativeDetail('${iniId}')" type="button">إلغاء</button>
    </div>
  </div>`);
  setTimeout(()=>document.getElementById("fNoteText").focus(),50);
}
function saveIniNote(iniId){
  const text=document.getElementById("fNoteText").value.trim(); if(!text) return;
  const ini=STATE.initiatives.find(x=>x.id===iniId); if(!ini) return;
  if(!Array.isArray(ini.notes)) ini.notes=[];
  ini.notes.push({id:uid(),text,user:SESSION?SESSION.username:"—",ts:new Date().toISOString()});
  logChange("إضافة","ملاحظة مبادرة",ini.name); dirtySave(); _renderIniModal(ini);
}
function delIniNote(iniId,noteId){
  const ini=STATE.initiatives.find(x=>x.id===iniId); if(!ini) return;
  ini.notes=(ini.notes||[]).filter(n=>n.id!==noteId);
  logChange("حذف","ملاحظة مبادرة",ini.name); dirtySave();
  const wrap=document.getElementById("iniNotesWrap-"+iniId); if(!wrap) return;
  const notes=Array.isArray(ini.notes)?ini.notes:[];
  wrap.innerHTML=notes.length?notes.map(n=>{
    const d=new Date(n.ts);
    const dt=d.toLocaleDateString("ar-SA",{year:"numeric",month:"long",day:"numeric"})+" · "+d.toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"});
    const canDel=ADMIN_MODE||(SESSION&&SESSION.username===n.user);
    return `<div class="ini-note-item">
      <div class="ini-note-text">${esc(n.text)}</div>
      <div class="ini-note-meta">${esc(n.user)} · ${dt}
        ${canDel?`<button class="ebtn sm danger" onclick="delIniNote('${ini.id}','${n.id}')" type="button" style="margin-right:8px;padding:2px 8px">×</button>`:""}
      </div>
    </div>`;
  }).join(""):`<div style="color:#aab5c4;font-size:12.5px;font-style:italic;padding:6px 0">لا توجد ملاحظات بعد</div>`;
}

/* ============================================================
   KPI EXTENDED FORM
   ============================================================ */
function _kpiExtFields(k){
  const opts=STATE.kpi_options;
  const sel=(arr,id,val)=>arr.map(v=>`<option value="${esc(v)}"${(k&&k[id]===v)?" selected":""}>${esc(v)}</option>`).join("");
  return `
    <hr class="modal-divider">
    <div style="font-size:12.5px;font-weight:700;color:var(--navy);margin-bottom:8px">معلومات إضافية (اختياري)</div>
    <div class="frow">
      <div class="fl"><label>الوزن (%)</label><input id="fKpiWeight" type="number" min="0" max="100" value="${esc(k?k.weight||"":"")}"></div>
      <div class="fl"><label>المستهدف السنوي</label><input id="fKpiTargetAnnual" type="number" value="${esc(k?k.target_annual||""||"":"")}"></div>
    </div>
    <div class="frow">
      <div class="fl"><label>رمز المؤشر</label><input id="fKpiCode" value="${esc(k?k.code||"":"")}"></div>
      <div class="fl"><label>الإدارة المالكة</label>${opts.departments.length?`<select id="fKpiDept"><option value="">—</option>${sel(opts.departments,"dept",k?k.dept:"")}</select>`:`<input id="fKpiDept" value="${esc(k?k.dept||"":"")}">` }</div>
    </div>
    <div class="frow">
      <div class="fl"><label>القطبية</label>${opts.polarities.length?`<select id="fKpiPol"><option value="">—</option>${sel(opts.polarities,"polarity",k?k.polarity:"")}</select>`:`<input id="fKpiPol" value="${esc(k?k.polarity||""||"":"")}">` }</div>
      <div class="fl"><label>التراكمية</label>${opts.cumulatives.length?`<select id="fKpiCum"><option value="">—</option>${sel(opts.cumulatives,"cumulative",k?k.cumulative:"")}</select>`:`<input id="fKpiCum" value="${esc(k?k.cumulative||"":"")}">` }</div>
    </div>
    <div class="frow">
      <div class="fl"><label>تكرار القياس</label>${opts.frequencies.length?`<select id="fKpiFreq"><option value="">—</option>${sel(opts.frequencies,"frequency",k?k.frequency:"")}</select>`:`<input id="fKpiFreq" value="${esc(k?k.frequency||"":"")}">` }</div>
      <div class="fl"><label>مصدر البيانات</label>${opts.data_sources.length?`<select id="fKpiSrc"><option value="">—</option>${sel(opts.data_sources,"data_source",k?k.data_source:"")}</select>`:`<input id="fKpiSrc" value="${esc(k?k.data_source||"":"")}">` }</div>
    </div>
    <div class="frow">
      <div class="fl"><label>قيمة خط الأساس</label><input id="fKpiBase" type="number" value="${esc(k?k.baseline_val||"":"")}"></div>
      <div class="fl"><label>سنة خط الأساس</label><input id="fKpiBaseY" value="${esc(k?k.baseline_year||"":"")}"></div>
    </div>
    <div class="fl"><label>معادلة القياس</label><input id="fKpiFormula" value="${esc(k?k.formula||""||"":"")}"></div>
    <div class="fl"><label>موعد توفر البيانات</label><input id="fKpiAvail" value="${esc(k?k.data_avail||"":"")}"></div>
    ${SESSION&&SESSION._users&&SESSION._users.length?`<div class="fl"><label>مالك المؤشر</label><select id="fKpiOwner"><option value="">— غير محدد —</option>${(SESSION._users||[]).map(u=>`<option value="${esc(u.username)}"${k&&k.kpi_owner===u.username?" selected":""}>${esc(u.username)}</option>`).join("")}</select></div>`:""}`;
}

function _collectKpiExt(){
  const v=id=>((document.getElementById(id)||{}).value??"");
  return {
    weight:v("fKpiWeight"),target_annual:v("fKpiTargetAnnual"),
    code:v("fKpiCode"),polarity:v("fKpiPol"),cumulative:v("fKpiCum"),
    frequency:v("fKpiFreq"),dept:v("fKpiDept"),data_source:v("fKpiSrc"),
    baseline_val:v("fKpiBase"),baseline_year:v("fKpiBaseY"),
    formula:v("fKpiFormula"),data_avail:v("fKpiAvail"),kpi_owner:v("fKpiOwner")
  };
}

/* ============================================================
   MEASUREMENT REPORTS
   ============================================================ */
function showSubmitMeasurement(scope,parentId,kpiId){
  const kpi=_findKpi(scope,parentId,kpiId); if(!kpi) return;
  openModal(`رفع تقرير قياس — ${esc(kpi.name)}`,`
    <div style="font-size:12.5px;color:var(--muted);margin-bottom:10px">المستهدف: <b>${esc(kpi.target)} ${esc(kpi.unit||"")}</b></div>
    <div class="eform">
      <div class="fl"><label>القيمة الفعلية المتحققة</label><input id="fRptActual" type="number" value="${esc(kpi.actual||0)}"></div>
      <div class="fl"><label>ملاحظات التقرير</label><textarea id="fRptNotes" rows="3"></textarea></div>
      <div class="fl"><label>ملف مرفق (اختياري)</label>
        <input type="file" id="fRptFile" style="font-family:inherit;font-size:13px">
      </div>
      <div class="faprow">
        <button class="ebtn primary" onclick="submitMeasurementReport('${scope}','${parentId}','${kpiId}')" type="button">رفع التقرير للمراجعة</button>
        <button class="ebtn" onclick="closeModal()" type="button">إلغاء</button>
      </div>
    </div>`);
}
function _findKpi(scope,parentId,kpiId){
  if(scope==="goal"){ const g=STATE.goals.find(x=>x.id===parentId); return g&&(g.kpis||[]).find(k=>k.id===kpiId); }
  if(scope==="init"){ const i=STATE.initiatives.find(x=>x.id===parentId); return i&&(i.kpis||[]).find(k=>k.id===kpiId); }
  if(scope==="oper"){ const o=STATE.oper_goals.find(x=>x.id===parentId); return o&&(o.kpis||[]).find(k=>k.id===kpiId); }
  return null;
}
async function submitMeasurementReport(scope,parentId,kpiId){
  const actual=(document.getElementById("fRptActual")||{}).value||"0";
  const notes=(document.getElementById("fRptNotes")||{}).value?.trim()||"";
  const fileEl=document.getElementById("fRptFile");
  let file_url="",file_name="";
  if(fileEl&&fileEl.files&&fileEl.files[0]){
    const f=fileEl.files[0];
    const b64=await new Promise(res=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.readAsDataURL(f);});
    const up=await apiPost({action:"upload",username:SESSION.username,password:SESSION.password,file_data:b64,file_name:f.name});
    if(up&&up.url){ file_url=up.url; file_name=up.name||f.name; }
  }
  if(!STATE.kpi_reports) STATE.kpi_reports=[];
  STATE.kpi_reports.push({
    id:uid(),scope,parent_id:parentId,kpi_id:kpiId,
    actual,notes,file_url,file_name,
    submitted_by:SESSION.username,submitted_at:new Date().toISOString(),
    status:"pending",reviewed_by:"",reviewed_at:"",review_notes:""
  });
  logChange("رفع","تقرير قياس",_findKpi(scope,parentId,kpiId)?.name||""); dirtySave();
  closeModal(); toast("تم رفع التقرير — في انتظار الموافقة");
}
function showPendingReports(){
  const pending=(STATE.kpi_reports||[]).filter(r=>r.status==="pending");
  const all=(STATE.kpi_reports||[]);
  const rows=all.length?all.map(r=>{
    const kpi=_findKpi(r.scope,r.parent_id,r.kpi_id);
    const d=new Date(r.submitted_at);
    const ds=d.toLocaleDateString("ar-SA",{year:"numeric",month:"short",day:"numeric"})+" "+d.toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"});
    const statusMap={pending:"معلّق",approved:"موافق",returned:"مُرجَع",rejected:"مرفوض"};
    const statusCol={pending:"var(--gold)",approved:"var(--kpi-g)",returned:"var(--teal)",rejected:"var(--kpi-r)"};
    const sc=statusCol[r.status]||"var(--muted)";
    return `<div class="rpt-row">
      <div class="rpt-head">
        <span class="clog-badge" style="background:${sc}20;color:${sc};border:1px solid ${sc}40">${statusMap[r.status]||r.status}</span>
        <span class="rpt-kpi">${esc(kpi?kpi.name:"مؤشر محذوف")}</span>
        <span style="font-size:11.5px;color:var(--muted);margin-right:auto">${esc(r.submitted_by)} · ${ds}</span>
      </div>
      <div class="rpt-meta">القيمة المتحققة: <b>${esc(r.actual)} ${esc(kpi?kpi.unit||"":"")} </b>
        ${r.notes?`· ${esc(r.notes)}`:""}</div>
      ${r.file_url?`<a href="${esc(r.file_url)}" target="_blank" class="ebtn sm teal" style="text-decoration:none;margin-top:4px;display:inline-flex">الملف المرفق</a>`:""}
      ${r.review_notes?`<div style="font-size:12px;color:var(--muted);margin-top:4px;font-style:italic">ملاحظة المراجع: ${esc(r.review_notes)}</div>`:""}
      ${ADMIN_MODE&&r.status==="pending"?`<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
        <button class="ebtn sm" style="background:var(--kpi-g)20;color:var(--kpi-g);border-color:var(--kpi-g)40" onclick="reviewReport('${r.id}','approved')" type="button">موافقة</button>
        <button class="ebtn sm" style="background:var(--teal)20;color:var(--teal);border-color:var(--teal)40" onclick="reviewReport('${r.id}','returned')" type="button">إرجاع</button>
        <button class="ebtn sm danger" onclick="reviewReport('${r.id}','rejected')" type="button">رفض</button>
      </div>`:""}
    </div>`;
  }).join(""):`<div style="color:#aab5c4;font-style:italic;padding:12px 0;text-align:center">لا توجد تقارير</div>`;
  openModal(`تقارير القياس (${toAr(all.length)}) — معلّق: ${toAr(pending.length)}`,`<div class="rpt-list">${rows}</div>`);
}
function reviewReport(rptId,action){
  let reason="";
  if(action==="returned"||action==="rejected"){
    reason=prompt(action==="rejected"?"سبب الرفض:":"ملاحظة الإرجاع:")?.trim()||"";
  }
  const rpt=(STATE.kpi_reports||[]).find(r=>r.id===rptId); if(!rpt) return;
  rpt.status=action; rpt.reviewed_by=SESSION.username;
  rpt.reviewed_at=new Date().toISOString(); rpt.review_notes=reason;
  if(action==="approved"){
    const kpi=_findKpi(rpt.scope,rpt.parent_id,rpt.kpi_id);
    if(kpi) kpi.actual=rpt.actual;
  }
  logChange(action==="approved"?"موافقة":action==="returned"?"إرجاع":"رفض","تقرير قياس","");
  dirtySave(); renderAll(); updateKPIs(); showPendingReports();
  toast(action==="approved"?"تمت الموافقة وتحديث المؤشر ✓":action==="returned"?"تم الإرجاع":"تم الرفض");
}

/* ============================================================
   CHANGE LOG MODAL
   ============================================================ */
function showChangeLog(){
  const log=STATE.change_log||[];
  const actionColor={
    "إضافة":"var(--kpi-g)","إضافة من المكتبة":"var(--teal)",
    "تعديل":"var(--gold)","حذف":"var(--kpi-r)"
  };
  const rows=log.length?log.map(e=>{
    const d=new Date(e.ts);
    const dateStr=d.toLocaleDateString("ar-SA",{year:"numeric",month:"long",day:"numeric"});
    const timeStr=d.toLocaleTimeString("ar-SA",{hour:"2-digit",minute:"2-digit"});
    const col=actionColor[e.action]||"var(--muted)";
    return `<div class="clog-entry">
      <span class="clog-badge" style="background:${col}20;color:${col};border:1px solid ${col}40">${esc(e.action)}</span>
      <div class="clog-body">
        <div class="clog-entity">${esc(e.entity)}<span class="clog-detail">${e.detail?` — ${esc(e.detail)}`:""}</span></div>
        <div class="clog-meta">${esc(e.user)} · ${dateStr} ${timeStr}</div>
      </div>
    </div>`;
  }).join(""):`<div style="color:#aab5c4;font-style:italic;padding:14px 0;text-align:center">لا توجد تغييرات مسجّلة بعد</div>`;
  openModal(`سجل التغييرات (${toAr(log.length)})`,`<div class="clog-list">${rows}</div>`);
}

document.getElementById("changeLogBtn").addEventListener("click", showChangeLog);

/* ============================================================
   START
   ============================================================ */
init();
