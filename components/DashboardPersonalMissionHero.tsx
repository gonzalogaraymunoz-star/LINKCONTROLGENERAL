"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Task={id:string;title:string;detail?:string;source:string;money:boolean;done:boolean};
type State={date:string;tasks:Task[];body:boolean;mind:boolean;pocket:boolean;note:string};
const KEY="cc-personal-mission-v2";

export default function DashboardPersonalMissionHero(){
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [state,setState]=useState<State|null>(null);

  useEffect(()=>{
    let cancelled=false;
    const mount=()=>{
      if(cancelled)return;
      const top=document.querySelector(".cc-topbar");
      if(!top){requestAnimationFrame(mount);return;}
      let node=document.getElementById("cc-personal-hero-host");
      if(!node){node=document.createElement("div");node.id="cc-personal-hero-host";top.insertAdjacentElement("afterend",node)}
      setHost(node as HTMLElement);
    };
    mount();
    return()=>{cancelled=true;document.getElementById("cc-personal-hero-host")?.remove()};
  },[]);

  useEffect(()=>{
    const read=()=>{try{const raw=localStorage.getItem(KEY);setState(raw?JSON.parse(raw):null)}catch{setState(null)}};
    read(); window.addEventListener("storage",read); window.addEventListener("focus",read);
    return()=>{window.removeEventListener("storage",read);window.removeEventListener("focus",read)};
  },[]);

  const tasks=state?.tasks||[];
  const open=tasks.filter(t=>!t.done),done=tasks.filter(t=>t.done);
  const minimums=state?[state.body,state.mind,state.pocket].filter(Boolean).length:0;
  const moneyDone=!!state?.tasks.some(t=>t.money&&t.done);
  const today=useMemo(()=>new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"}),[]);

  const toggle=(id:string)=>{
    if(!state)return;
    const next={...state,tasks:state.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)};
    setState(next); localStorage.setItem(KEY,JSON.stringify(next));
  };

  if(!host)return null;

  return createPortal(<section className="link-dashboard-hero">
    <style jsx global>{css}</style>
    <div className="link-hero-banner">
      <div className="link-hero-copy">
        <small>{today}</small>
        <h1>Misión Personal</h1>
        <p>Cerrar + vender + no abrir.</p>
        <blockquote>Enfoque crea libertad.</blockquote>
        <a href="/mision-personal">Iniciar misión de hoy →</a>
      </div>
      <div className="link-hero-mark"><span>UN DÍA MÁS CERCA</span><b>LINK</b></div>
    </div>

    <div className="link-task-grid">
      <section className="link-panel link-tasks-panel">
        <div className="link-panel-head"><div><small>FOCO</small><h2>Tareas de hoy</h2></div><a href="/mision-personal">Ver todas →</a></div>
        <div className="link-task-list">
          {open.slice(0,4).map((t,i)=><div className="link-task-row" key={t.id}>
            <button className="link-task-check" onClick={()=>toggle(t.id)} aria-label="Completar tarea" />
            <div className="link-task-copy"><b>{t.title}</b><span>{t.source}{t.money?" · Monetización":""}</span></div>
            <em className={i===0?"high":""}>Pendiente</em>
          </div>)}
          {!open.length&&<div className="link-empty">✓ Todo lo definido para hoy está cerrado.</div>}
        </div>
      </section>

      <aside className="link-side-stack">
        <section className="link-panel">
          <div className="link-panel-head"><div><small>SISTEMA MÍNIMO</small><h2>Mis 3 mínimos</h2></div><b>{minimums}/3</b></div>
          <Mini done={!!state?.body} label="Cuerpo" detail="Moverme y recuperar energía"/>
          <Mini done={!!state?.mind} label="Mente" detail="Definir una sola misión activa"/>
          <Mini done={!!state?.pocket} label="Bolsillo" detail="1 movimiento comercial real"/>
        </section>
        <section className="link-panel money"><div><small>MONETIZACIÓN</small><h2>{moneyDone?"Movimiento comercial hecho":"Movimiento comercial pendiente"}</h2><p>Al menos una acción que acerque dinero hoy.</p></div><strong>{moneyDone?"✓":"$"}</strong></section>
      </aside>
    </div>

    <div className="link-kpis">
      <Kpi label="Tareas hoy" value={`${done.length}/${tasks.length||0}`} detail="cerradas"/>
      <Kpi label="Mínimos" value={`${minimums}/3`} detail="sostenidos"/>
      <Kpi label="Movimiento comercial" value={moneyDone?"1/1":"0/1"} detail="hoy"/>
      <div className="link-kpi progress"><span className="check">✓</span><div><b>{open.length?"Día en curso":"Día cerrado"}</b><small>{open.length?"Sigue avanzando":"Objetivo sostenido"}</small></div></div>
    </div>
  </section>,host);
}

function Mini({done,label,detail}:{done:boolean;label:string;detail:string}){return <div className="link-mini"><span className={done?"dot done":"dot"}>{done?"✓":""}</span><div><b>{label}</b><small>{detail}</small></div><em>↻ Diario</em></div>}
function Kpi({label,value,detail}:{label:string;value:string;detail:string}){return <div className="link-kpi"><div className="ring"><span>{value}</span></div><div><b>{label}</b><small>{detail}</small></div></div>}

const css=`
#cc-personal-hero-host{margin-top:18px;margin-bottom:18px}.link-dashboard-hero{font-family:Arial,Helvetica,sans-serif;color:var(--link-text)}
.link-hero-banner{min-height:235px;border:1px solid var(--link-line);border-radius:22px;padding:28px 32px;position:relative;overflow:hidden;background:radial-gradient(circle at 74% 26%,rgba(225,205,181,.78),transparent 30%),linear-gradient(105deg,#f5f1ea 0%,#e9e4da 44%,#c4c2bd 72%,#8f9797 100%);box-shadow:var(--link-shadow)}
:root[data-link-theme="dark"] .link-hero-banner{background:radial-gradient(circle at 72% 25%,rgba(120,104,88,.35),transparent 28%),linear-gradient(105deg,#252521 0%,#363630 48%,#4f5350 100%)}
:root[data-link-theme="gray"] .link-hero-banner{background:linear-gradient(105deg,#ecece8 0%,#d8d9d5 55%,#afb3af 100%)}
.link-hero-banner:after{content:"";position:absolute;right:-70px;bottom:-80px;width:58%;height:72%;background:linear-gradient(145deg,transparent 0 35%,rgba(53,61,59,.18) 36% 48%,transparent 49%),linear-gradient(28deg,transparent 0 48%,rgba(53,61,59,.15) 49% 58%,transparent 59%);transform:skewX(-9deg)}
.link-hero-copy{position:relative;z-index:2}.link-hero-copy small{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:#5e625f}.link-hero-copy h1{font-size:54px;line-height:.95;letter-spacing:-.055em;margin:10px 0 8px;font-weight:600;color:#1d2225}.link-hero-copy p{font-size:18px;margin:0 0 18px;color:#5f6465}.link-hero-copy blockquote{margin:0 0 22px;font-size:16px;font-style:italic;color:#6e706e}.link-hero-copy a{display:inline-flex;align-items:center;background:#1d2225;color:#fff!important;text-decoration:none;border-radius:12px;padding:12px 17px;font-size:13px}.link-hero-mark{position:absolute;right:32px;bottom:26px;z-index:2;text-align:right;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.2)}.link-hero-mark span{display:block;font-size:9px;letter-spacing:.28em}.link-hero-mark b{font-size:28px;letter-spacing:.08em}
:root[data-link-theme="dark"] .link-hero-copy h1,:root[data-link-theme="dark"] .link-hero-copy p,:root[data-link-theme="dark"] .link-hero-copy blockquote,:root[data-link-theme="dark"] .link-hero-copy small{color:#f1f3ef}
.link-task-grid{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.8fr);gap:12px;margin-top:12px}.link-panel{background:var(--link-surface);border:1px solid var(--link-line);border-radius:18px;padding:16px 18px;box-shadow:var(--link-shadow)}.link-panel-head{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:8px}.link-panel-head small,.money small{font-size:9px;letter-spacing:.15em;color:var(--link-muted)}.link-panel-head h2,.money h2{margin:3px 0 0;font-size:18px;letter-spacing:-.02em}.link-panel-head>a{font-size:11px;color:var(--link-muted);text-decoration:none}.link-panel-head>b{font-size:12px;background:var(--link-surface-2);padding:6px 9px;border-radius:999px}.link-task-row{display:grid;grid-template-columns:34px 1fr auto;align-items:center;gap:8px;min-height:64px;border-top:1px solid var(--link-soft)}.link-task-check{width:22px;height:22px;border:2px solid #9ca1a0;border-radius:50%;background:transparent}.link-task-copy{display:flex;flex-direction:column;gap:4px}.link-task-copy b{font-size:14px}.link-task-copy span{font-size:10px;color:var(--link-muted);letter-spacing:.04em}.link-task-row em{font-style:normal;font-size:10px;color:var(--link-muted);border:1px solid var(--link-line);padding:6px 8px;border-radius:999px}.link-task-row em.high{background:#f7ece9;color:#a64b3b;border-color:#ecd5cf}.link-empty{padding:24px;color:var(--link-muted);font-size:13px}.link-side-stack{display:grid;gap:12px}.link-mini{display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center;padding:11px 0;border-top:1px solid var(--link-soft)}.link-mini .dot{width:20px;height:20px;border:1.5px solid #9da29f;border-radius:50%;display:grid;place-items:center;font-size:11px}.link-mini .dot.done{background:#2e7d5c;color:#fff;border-color:#2e7d5c}.link-mini>div{display:flex;flex-direction:column}.link-mini b{font-size:13px}.link-mini small,.link-mini em{font-size:10px;color:var(--link-muted);font-style:normal}.money{display:flex;align-items:center;justify-content:space-between}.money p{margin:6px 0 0;color:var(--link-muted);font-size:11px}.money strong{width:42px;height:42px;border-radius:14px;background:#e9f4ec;color:#28734f;display:grid;place-items:center;font-size:20px}.link-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}.link-kpi{background:var(--link-surface);border:1px solid var(--link-line);border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:var(--link-shadow);min-height:84px}.link-kpi .ring{width:50px;height:50px;border:6px solid var(--link-soft);border-radius:50%;display:grid;place-items:center;flex:none}.link-kpi .ring span{font-size:12px;font-weight:700}.link-kpi>div:last-child{display:flex;flex-direction:column;gap:4px}.link-kpi b{font-size:12px}.link-kpi small{font-size:10px;color:var(--link-muted)}.link-kpi.progress{background:#edf7f0;border-color:#d6eadc}.link-kpi.progress .check{width:44px;height:44px;border-radius:50%;background:#d7eddf;color:#28734f;display:grid;place-items:center;font-size:20px}
@media(max-width:1000px){.link-task-grid{grid-template-columns:1fr}.link-kpis{grid-template-columns:1fr 1fr}.link-hero-mark{display:none}}
@media(max-width:760px){#cc-personal-hero-host{margin-top:10px}.link-hero-banner{padding:22px 18px;min-height:215px}.link-hero-copy h1{font-size:38px}.link-hero-copy p{font-size:15px}.link-kpis{grid-template-columns:1fr}.link-panel{padding:14px}.link-task-row{grid-template-columns:30px 1fr}.link-task-row em{display:none}}
`;
