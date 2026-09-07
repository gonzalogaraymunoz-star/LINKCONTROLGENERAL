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
              <span className="link-task-date">Hoy</span>
              <em className={i===0?"high":i<3?"medium":"low"}>{i===0?"Alta":i<3?"Media":"Baja"}</em>
              <span className="link-more">•••</span>
            </div>)}
            {!open.length&&<div className="link-empty"><span>✓</span><div><b>Todo lo definido para hoy está cerrado.</b><small>Puedes abrir Misión Personal para preparar el siguiente foco.</small></div></div>}
          </div>
        </section>

        <aside className="link-side-stack">
          <section className="link-panel minimum-panel">
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
        <Kpi label="Tareas hoy" value={`${done.length}/${tasks.length||0}`} detail="Cerradas"/>
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
#cc-personal-hero-host{margin:8px 0 18px}.link-dashboard-hero{color:var(--link-text);width:100%}
.link-hero-banner{height:250px;border:1px solid var(--link-line);border-radius:var(--link-radius-xl);padding:31px 34px;position:relative;overflow:hidden;background:var(--link-surface) url('/link-mountain.svg') center/cover no-repeat;box-shadow:var(--link-shadow)}
.link-hero-banner:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(248,246,241,.98) 0%,rgba(248,246,241,.88) 34%,rgba(248,246,241,.14) 66%,rgba(18,25,25,.08) 100%)}
:root[data-link-theme="dark"] .link-hero-banner:before{background:linear-gradient(90deg,rgba(22,24,23,.97) 0%,rgba(22,24,23,.84) 34%,rgba(22,24,23,.18) 66%,rgba(5,8,7,.22) 100%)}
:root[data-link-theme="gray"] .link-hero-banner:before{background:linear-gradient(90deg,rgba(235,237,233,.97) 0%,rgba(235,237,233,.84) 34%,rgba(235,237,233,.14) 66%,rgba(25,30,28,.1) 100%)}
.link-hero-copy{position:relative;z-index:2;max-width:610px}.link-hero-copy small{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--link-muted);font-weight:650}.link-hero-copy h1{font-size:clamp(42px,4vw,58px);line-height:.98;letter-spacing:-.06em;margin:10px 0 8px;color:var(--link-text);font-weight:650}.link-hero-copy h1 span{color:var(--link-faint);font-size:.5em;vertical-align:.25em}.link-hero-copy p{font-size:16px;margin:0 0 8px;color:var(--link-muted)}.link-hero-copy blockquote{margin:0 0 17px;font-size:14px;font-style:italic;color:var(--link-muted)}.link-hero-copy a{display:inline-flex;gap:14px;align-items:center;background:var(--link-accent);color:var(--link-accent-text);text-decoration:none;border-radius:11px;padding:12px 17px;font-size:13px}.link-hero-message{position:absolute;right:38px;bottom:32px;z-index:2;color:white;text-align:left;text-shadow:0 2px 14px rgba(0,0,0,.32)}.link-hero-message span{display:block;font-size:9px;letter-spacing:.25em;margin-bottom:7px}.link-hero-message b{font-family:Georgia,serif;font-size:27px;line-height:.95;font-weight:500}
.link-task-grid{display:grid;grid-template-columns:minmax(0,1.72fr) minmax(300px,.82fr);gap:12px;margin-top:12px}.link-panel{background:var(--link-surface);border:1px solid var(--link-line);border-radius:var(--link-radius-lg);box-shadow:var(--link-shadow);padding:14px 17px;min-width:0}.link-panel-head{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:44px}.link-title-line{display:flex;align-items:center;gap:9px;min-width:0}.link-title-line h2{font-size:17px;letter-spacing:-.025em;margin:0;white-space:nowrap}.link-title-line>span,.count{font-size:11px;background:var(--link-surface-2);border-radius:999px;padding:5px 8px;color:var(--link-muted)}.link-panel-actions{display:flex;align-items:center;gap:6px;min-width:0}.pill{font-size:10px;color:var(--link-muted);padding:6px 9px;border-radius:8px;white-space:nowrap}.pill.on{background:var(--link-surface-2);color:var(--link-text)}.link-panel-actions>a{font-size:11px;text-decoration:none;color:var(--link-text);border:1px solid var(--link-line);padding:7px 10px;border-radius:9px;white-space:nowrap}.link-task-list{border-top:1px solid var(--link-soft)}
.link-task-row{display:grid;grid-template-columns:28px 36px minmax(0,1fr) 52px 54px 28px;gap:7px;align-items:center;min-height:66px;border-bottom:1px solid var(--link-soft)}.link-task-check{width:20px;height:20px;border:1.6px solid #9aa09d;border-radius:50%;background:transparent}.link-task-icon{width:34px;height:34px;border-radius:11px;background:var(--link-surface-2);display:grid;place-items:center;font-size:13px;color:var(--link-text)}.link-task-copy{min-width:0;display:flex;flex-direction:column;gap:4px}.link-task-copy b{font-size:13px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.link-task-copy span{font-size:10px;color:var(--link-muted);letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.link-task-date{font-size:10px;color:var(--link-red);white-space:nowrap}.link-task-row em{font-style:normal;font-size:10px;text-align:center;border-radius:8px;padding:6px 7px}.link-task-row em.high{background:var(--link-red-soft);color:var(--link-red)}.link-task-row em.medium{background:var(--link-amber-soft);color:var(--link-amber)}.link-task-row em.low{background:var(--link-surface-2);color:var(--link-muted)}.link-more{color:var(--link-faint);font-size:11px;text-align:right}.link-empty{min-height:118px;display:flex;align-items:center;gap:12px;color:var(--link-muted);font-size:12px;padding:18px 6px}.link-empty>span{width:32px;height:32px;border-radius:50%;background:var(--link-green-soft);color:var(--link-green);display:grid;place-items:center}.link-empty>div{display:flex;flex-direction:column;gap:4px}.link-empty b{color:var(--link-text);font-size:13px}.link-empty small{font-size:11px}
.link-side-stack{display:grid;gap:12px}.link-panel-head.compact{margin-bottom:3px}.link-mini{width:100%;border:0;border-top:1px solid var(--link-soft);background:transparent;color:var(--link-text);display:grid;grid-template-columns:24px 28px 1fr auto;gap:8px;align-items:center;text-align:left;padding:11px 0}.mini-check{width:19px;height:19px;border:1.5px solid #9ca09e;border-radius:50%;display:grid;place-items:center;font-size:10px}.link-mini.done .mini-check{background:var(--link-green);border-color:var(--link-green);color:white}.mini-icon{font-size:14px;text-align:center}.mini-copy{display:flex;flex-direction:column;gap:2px;min-width:0}.mini-copy b{font-size:12px}.mini-copy small,.link-mini em{font-size:10px;color:var(--link-muted);font-style:normal}.mini-copy small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.money-head{display:flex;justify-content:space-between;align-items:center}.money-head>div{display:flex;align-items:center;gap:8px;min-width:0}.money-icon{width:22px;height:22px;border-radius:8px;background:var(--link-green-soft);color:var(--link-green);display:grid;place-items:center;font-size:11px}.money-head b{font-size:14px}.money-head>span{font-size:11px;background:var(--link-surface-2);border-radius:999px;padding:5px 8px}.money p{margin:6px 0 10px;font-size:10px;color:var(--link-muted)}.money>a{display:block;text-align:center;text-decoration:none;color:var(--link-faint);background:var(--link-surface-2);border-radius:9px;padding:10px;font-size:10px}
.link-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.link-kpi{background:var(--link-surface);border:1px solid var(--link-line);border-radius:var(--link-radius-lg);min-height:84px;padding:13px 15px;display:flex;align-items:center;gap:12px;box-shadow:var(--link-shadow);min-width:0}.ring{width:48px;height:48px;border-radius:50%;border:6px solid var(--link-soft);flex:none}.link-kpi>div{display:flex;flex-direction:column;gap:2px;min-width:0}.link-kpi>div>span,.link-kpi small{font-size:10px;color:var(--link-muted)}.link-kpi>div>b{font-size:19px;letter-spacing:-.03em}.link-kpi.progress{background:var(--link-green-soft)}.link-kpi.progress .check{width:44px;height:44px;border-radius:50%;background:rgba(17,122,79,.12);color:var(--link-green);display:grid;place-items:center;font-size:19px}.link-kpi.progress>div>b{font-size:13px;color:var(--link-green)}.link-kpi.progress>strong{margin-left:auto;color:var(--link-green);font-size:20px}
@media(max-width:1180px){.link-task-grid{grid-template-columns:1fr}.link-side-stack{grid-template-columns:1fr 1fr}.link-kpis{grid-template-columns:repeat(2,1fr)}.link-panel-actions .pill{display:none}}
@media(max-width:760px){
 #cc-personal-hero-host{margin:6px 0 14px}.link-dashboard-hero{width:100%;overflow:hidden}.link-hero-banner{height:auto;min-height:320px;border-radius:22px;padding:24px 22px 28px;background-position:63% center}.link-hero-banner:before{background:linear-gradient(180deg,rgba(248,246,241,.96) 0%,rgba(248,246,241,.82) 48%,rgba(248,246,241,.18) 75%,rgba(18,25,25,.08) 100%)}:root[data-link-theme="dark"] .link-hero-banner:before{background:linear-gradient(180deg,rgba(22,24,23,.97) 0%,rgba(22,24,23,.82) 50%,rgba(22,24,23,.18) 76%,rgba(5,8,7,.22) 100%)}:root[data-link-theme="gray"] .link-hero-banner:before{background:linear-gradient(180deg,rgba(235,237,233,.97) 0%,rgba(235,237,233,.84) 50%,rgba(235,237,233,.18) 76%,rgba(25,30,28,.1) 100%)}.link-hero-copy{max-width:100%}.link-hero-copy small{font-size:9px;letter-spacing:.17em}.link-hero-copy h1{font-size:clamp(38px,11vw,48px);max-width:100%;margin-top:12px}.link-hero-copy p{font-size:15px}.link-hero-copy blockquote{font-size:13px;margin-bottom:22px}.link-hero-copy a{padding:12px 16px;font-size:13px}.link-hero-message{display:none}
 .link-task-grid{grid-template-columns:1fr;gap:10px;margin-top:10px}.link-side-stack{grid-template-columns:1fr;gap:10px}.link-panel{padding:13px 14px;border-radius:18px}.link-panel-head{min-height:42px}.link-panel-actions{display:none}.link-title-line h2{font-size:17px}.link-task-row{grid-template-columns:28px 34px minmax(0,1fr);gap:7px;min-height:68px;padding:8px 0}.link-task-date,.link-task-row em,.link-more{display:none}.link-task-copy b{font-size:13px;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.link-task-copy span{font-size:9px}.link-empty{min-height:120px;padding:18px 2px}.link-empty>div small{display:none}.link-mini{grid-template-columns:24px 28px minmax(0,1fr);padding:12px 0}.link-mini em{display:none}.money{padding-bottom:14px}.link-kpis{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.link-kpi{min-height:76px;padding:11px 12px;gap:9px}.ring{width:40px;height:40px;border-width:5px}.link-kpi>div>b{font-size:17px}.link-kpi.progress .check{width:38px;height:38px}.link-kpi.progress>strong{display:none}
}
@media(max-width:430px){.link-hero-banner{min-height:300px;padding:22px 18px 24px}.link-hero-copy h1{font-size:40px}.link-kpis{grid-template-columns:1fr}.link-kpi{min-height:70px}.link-task-icon{width:32px;height:32px}}
`;
