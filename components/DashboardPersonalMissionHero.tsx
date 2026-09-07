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
    read();window.addEventListener("storage",read);window.addEventListener("focus",read);
    return()=>{window.removeEventListener("storage",read);window.removeEventListener("focus",read)};
  },[]);

  const tasks=state?.tasks||[];
  const open=tasks.filter(t=>!t.done),done=tasks.filter(t=>t.done);
  const minimums=state?[state.body,state.mind,state.pocket].filter(Boolean).length:0;
  const moneyDone=!!state?.tasks.some(t=>t.money&&t.done);
  const today=useMemo(()=>new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"}),[]);

  const save=(next:State)=>{setState(next);localStorage.setItem(KEY,JSON.stringify(next))};
  const toggleTask=(id:string)=>{if(!state)return;save({...state,tasks:state.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)})};
  const toggleMinimum=(key:"body"|"mind"|"pocket")=>{if(!state)return;save({...state,[key]:!state[key]})};

  if(!host)return null;

  return createPortal(<>
    <style>{css}</style>
    <section className="link-dashboard-hero">
      <div className="link-hero-banner">
        <div className="link-hero-copy">
          <small>{today}</small>
          <h1>Misión Personal <span>•</span></h1>
          <p>Cerrar + vender + no abrir.</p>
          <blockquote>“Disciplina hoy, libertad mañana.”</blockquote>
          <a href="/mision-personal">Iniciar misión de hoy <b>→</b></a>
        </div>
        <div className="link-hero-message"><span>— UN DÍA MÁS CERCA</span><b>Enfoque<br/>crea libertad.</b></div>
      </div>

      <div className="link-task-grid">
        <section className="link-panel link-tasks-panel">
          <div className="link-panel-head">
            <div className="link-title-line"><h2>Tareas de hoy</h2><span>{open.length}</span></div>
            <div className="link-panel-actions"><span className="pill on">Todas</span><span className="pill">Pendientes {open.length}</span><span className="pill">Completadas {done.length}</span><a href="/mision-personal">＋ Añadir</a></div>
          </div>
          <div className="link-task-list">
            {open.slice(0,4).map((t,i)=><div className="link-task-row" key={t.id}>
              <button className="link-task-check" onClick={()=>toggleTask(t.id)} aria-label={`Completar ${t.title}`} />
              <span className="link-task-icon">{t.money?"$":i===0?"◎":"•"}</span>
              <div className="link-task-copy"><b>{t.title}</b><span>{t.source}{t.money?" · Monetización":""}</span></div>
              <span className="link-task-date">▣ Hoy</span>
              <em className={i===0?"high":i<3?"medium":"low"}>{i===0?"Alta":i<3?"Media":"Baja"}</em>
              <span className="link-more">•••</span>
            </div>)}
            {!open.length&&<div className="link-empty">✓ Todo lo definido para hoy está cerrado.</div>}
          </div>
        </section>

        <aside className="link-side-stack">
          <section className="link-panel">
            <div className="link-panel-head compact"><div className="link-title-line"><h2>Mis 3 mínimos</h2></div><span className="count">{minimums}/3</span></div>
            <Mini done={!!state?.body} label="Cuerpo" detail="20 min de movimiento" icon="↔" onClick={()=>toggleMinimum("body")}/>
            <Mini done={!!state?.mind} label="Mente" detail="Configurar una sola misión activa" icon="◉" onClick={()=>toggleMinimum("mind")}/>
            <Mini done={!!state?.pocket} label="Bolsillo" detail="1 movimiento comercial real" icon="▥" onClick={()=>toggleMinimum("pocket")}/>
          </section>
          <section className="link-panel money">
            <div className="money-head"><div><span className="money-icon">$</span><b>Movimiento comercial</b></div><span>{moneyDone?"1/1":"0/1"}</span></div>
            <p>Al menos una acción que acerque dinero hoy.</p>
            <a href="/mision-personal">＋ Registrar movimiento comercial</a>
          </section>
        </aside>
      </div>

      <div className="link-kpis">
        <Kpi label="Tareas hoy" value={`${done.length}/${tasks.length||0}`} detail="Pendientes"/>
        <Kpi label="Mínimos" value={`${minimums}/3`} detail="Sostenidos"/>
        <Kpi label="Movimiento comercial" value={moneyDone?"1/1":"0/1"} detail="Hoy"/>
        <div className="link-kpi progress"><span className="check">✓</span><div><b>{open.length?"Día en curso":"Día cerrado"}</b><small>{open.length?"Sigue avanzando":"Objetivo sostenido"}</small></div><strong>›</strong></div>
      </div>
    </section>
  </>,host);
}

function Mini({done,label,detail,icon,onClick}:{done:boolean;label:string;detail:string;icon:string;onClick:()=>void}){return <button className={`link-mini ${done?"done":""}`} onClick={onClick}><span className="mini-check">{done?"✓":""}</span><span className="mini-icon">{icon}</span><span className="mini-copy"><b>{label}</b><small>{detail}</small></span><em>↻ Diario</em></button>}
function Kpi({label,value,detail}:{label:string;value:string;detail:string}){return <div className="link-kpi"><span className="ring"/><div><span>{label}</span><b>{value}</b><small>{detail}</small></div></div>}

const css=`
#cc-personal-hero-host{margin:10px 0 18px}.link-dashboard-hero{color:var(--link-text)}
.link-hero-banner{height:250px;border:1px solid var(--link-line);border-radius:var(--link-radius-xl);padding:31px 34px;position:relative;overflow:hidden;background:var(--link-surface) url('/link-mountain.svg') center/cover no-repeat;box-shadow:var(--link-shadow)}
.link-hero-banner:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(248,246,241,.98) 0%,rgba(248,246,241,.85) 32%,rgba(248,246,241,.1) 67%,rgba(18,25,25,.08) 100%)}
:root[data-link-theme="dark"] .link-hero-banner:before{background:linear-gradient(90deg,rgba(22,24,23,.96) 0%,rgba(22,24,23,.82) 33%,rgba(22,24,23,.15) 67%,rgba(5,8,7,.2) 100%)}
:root[data-link-theme="gray"] .link-hero-banner:before{background:linear-gradient(90deg,rgba(235,237,233,.96) 0%,rgba(235,237,233,.82) 33%,rgba(235,237,233,.1) 67%,rgba(25,30,28,.08) 100%)}
.link-hero-copy{position:relative;z-index:2}.link-hero-copy small{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--link-muted);font-weight:600}.link-hero-copy h1{font-size:48px;line-height:1;letter-spacing:-.055em;margin:10px 0 8px;color:var(--link-text);font-weight:650}.link-hero-copy h1 span{color:var(--link-faint);font-size:24px;vertical-align:8px}.link-hero-copy p{font-size:15px;margin:0 0 8px;color:var(--link-muted)}.link-hero-copy blockquote{margin:0 0 17px;font-size:14px;font-style:italic;color:var(--link-muted)}.link-hero-copy a{display:inline-flex;gap:14px;align-items:center;background:var(--link-accent);color:var(--link-accent-text);text-decoration:none;border-radius:11px;padding:12px 17px;font-size:13px}.link-hero-message{position:absolute;right:38px;bottom:32px;z-index:2;color:white;text-align:left;text-shadow:0 2px 14px rgba(0,0,0,.32)}.link-hero-message span{display:block;font-size:9px;letter-spacing:.25em;margin-bottom:7px}.link-hero-message b{font-family:Georgia,serif;font-size:27px;line-height:.95;font-weight:500}
.link-task-grid{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(315px,.82fr);gap:12px;margin-top:12px}.link-panel{background:var(--link-surface);border:1px solid var(--link-line);border-radius:var(--link-radius-lg);box-shadow:var(--link-shadow);padding:14px 17px}.link-panel-head{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:44px}.link-title-line{display:flex;align-items:center;gap:9px}.link-title-line h2{font-size:17px;letter-spacing:-.025em;margin:0}.link-title-line>span,.count{font-size:11px;background:var(--link-surface-2);border-radius:999px;padding:5px 8px;color:var(--link-muted)}.link-panel-actions{display:flex;align-items:center;gap:6px}.pill{font-size:10px;color:var(--link-muted);padding:6px 9px;border-radius:8px}.pill.on{background:var(--link-surface-2);color:var(--link-text)}.link-panel-actions>a{font-size:11px;text-decoration:none;color:var(--link-text);border:1px solid var(--link-line);padding:7px 10px;border-radius:9px}.link-task-list{border-top:1px solid var(--link-soft)}
.link-task-row{display:grid;grid-template-columns:28px 36px minmax(0,1fr) 60px 54px 28px;gap:7px;align-items:center;min-height:66px;border-bottom:1px solid var(--link-soft)}.link-task-check{width:20px;height:20px;border:1.6px solid #9aa09d;border-radius:50%;background:transparent}.link-task-check:hover{border-color:var(--link-text)}.link-task-icon{width:34px;height:34px;border-radius:11px;background:var(--link-surface-2);display:grid;place-items:center;font-size:13px;color:var(--link-text)}.link-task-copy{min-width:0;display:flex;flex-direction:column;gap:4px}.link-task-copy b{font-size:13px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.link-task-copy span{font-size:10px;color:var(--link-muted);letter-spacing:.02em}.link-task-date{font-size:10px;color:var(--link-red)}.link-task-row em{font-style:normal;font-size:10px;text-align:center;border-radius:8px;padding:6px 7px}.link-task-row em.high{background:var(--link-red-soft);color:var(--link-red)}.link-task-row em.medium{background:var(--link-amber-soft);color:var(--link-amber)}.link-task-row em.low{background:var(--link-surface-2);color:var(--link-muted)}.link-more{color:var(--link-faint);font-size:11px;text-align:right}.link-empty{padding:28px 6px;color:var(--link-muted);font-size:12px}
.link-side-stack{display:grid;gap:12px}.link-panel-head.compact{margin-bottom:3px}.link-mini{width:100%;border:0;border-top:1px solid var(--link-soft);background:transparent;color:var(--link-text);display:grid;grid-template-columns:24px 28px 1fr auto;gap:8px;align-items:center;text-align:left;padding:11px 0}.mini-check{width:19px;height:19px;border:1.5px solid #9ca09e;border-radius:50%;display:grid;place-items:center;font-size:10px}.link-mini.done .mini-check{background:var(--link-green);border-color:var(--link-green);color:white}.mini-icon{font-size:14px;text-align:center}.mini-copy{display:flex;flex-direction:column;gap:2px}.mini-copy b{font-size:12px}.mini-copy small,.link-mini em{font-size:10px;color:var(--link-muted);font-style:normal}.money-head{display:flex;justify-content:space-between;align-items:center}.money-head>div{display:flex;align-items:center;gap:8px}.money-icon{width:22px;height:22px;border-radius:8px;background:var(--link-green-soft);color:var(--link-green);display:grid;place-items:center;font-size:11px}.money-head b{font-size:14px}.money-head>span{font-size:11px;background:var(--link-surface-2);border-radius:999px;padding:5px 8px}.money p{margin:6px 0 10px;font-size:10px;color:var(--link-muted)}.money>a{display:block;text-align:center;text-decoration:none;color:var(--link-faint);background:var(--link-surface-2);border-radius:9px;padding:10px;font-size:10px}
.link-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}.link-kpi{background:var(--link-surface);border:1px solid var(--link-line);border-radius:var(--link-radius-lg);min-height:84px;padding:13px 15px;display:flex;align-items:center;gap:12px;box-shadow:var(--link-shadow)}.ring{width:48px;height:48px;border-radius:50%;border:6px solid var(--link-soft);flex:none}.link-kpi>div{display:flex;flex-direction:column;gap:2px}.link-kpi>div>span,.link-kpi small{font-size:10px;color:var(--link-muted)}.link-kpi>div>b{font-size:19px;letter-spacing:-.03em}.link-kpi.progress{background:var(--link-green-soft);border-color:color-mix(in srgb,var(--link-green) 22%,var(--link-line))}.link-kpi.progress .check{width:44px;height:44px;border-radius:50%;background:color-mix(in srgb,var(--link-green) 16%,transparent);color:var(--link-green);display:grid;place-items:center;font-size:19px}.link-kpi.progress>div>b{font-size:13px;color:var(--link-green)}.link-kpi.progress>strong{margin-left:auto;color:var(--link-green);font-size:20px}
@media(max-width:1100px){.link-task-grid{grid-template-columns:1fr}.link-kpis{grid-template-columns:1fr 1fr}.link-hero-message{display:none}.link-panel-actions .pill{display:none}}
@media(max-width:760px){#cc-personal-hero-host{margin-top:4px}.link-hero-banner{height:220px;padding:24px 20px}.link-hero-copy h1{font-size:37px}.link-hero-copy h1 span{font-size:18px;vertical-align:5px}.link-task-grid{margin-top:10px}.link-panel{padding:12px}.link-panel-actions{display:none}.link-task-row{grid-template-columns:27px 34px 1fr 24px;min-height:62px}.link-task-date,.link-task-row em{display:none}.link-kpis{grid-template-columns:1fr}.link-hero-copy blockquote{font-size:12px}}
`;
