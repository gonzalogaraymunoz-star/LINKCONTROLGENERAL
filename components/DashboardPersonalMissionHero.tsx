"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type Work={id:string;title:string;status:string;starts_at?:string|null;priority?:number;is_money?:boolean;client?:{name?:string}|null};
type Progress={body_minimum?:boolean;mind_minimum?:boolean;pocket_minimum?:boolean;commercial_moves?:number;closures?:number};
type Filter="all"|"open"|"done";

export default function DashboardPersonalMissionHero(){
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [items,setItems]=useState<Work[]>([]);
  const [progress,setProgress]=useState<Progress|null>(null);
  const [filter,setFilter]=useState<Filter>("all");
  const [busy,setBusy]=useState<string|null>(null);

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

  const load=async()=>{
    try{
      const r=await fetch("/api/work",{cache:"no-store"});
      const j=await r.json();
      if(r.ok){setItems(j.items||[]);setProgress(j.progress||null)}
    }catch{}
  };
  useEffect(()=>{load();const id=setInterval(load,30000);return()=>clearInterval(id)},[]);

  const todayKey=new Date().toLocaleDateString("en-CA");
  const todayItems=useMemo(()=>items.filter(w=>!w.starts_at||new Date(w.starts_at).toLocaleDateString("en-CA")===todayKey),[items,todayKey]);
  const open=todayItems.filter(w=>w.status!=="completed");
  const done=todayItems.filter(w=>w.status==="completed");
  const visible=(filter==="all"?todayItems:filter==="open"?open:done).slice(0,5);
  const minimums=[progress?.body_minimum,progress?.mind_minimum,progress?.pocket_minimum].filter(Boolean).length;
  const moneyDone=(progress?.commercial_moves||0)>0||done.some(t=>t.is_money);
  const today=useMemo(()=>new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"}),[]);

  const toggleMinimum=async(key:"body"|"mind"|"pocket")=>{
    const current=key==="body"?!!progress?.body_minimum:key==="mind"?!!progress?.mind_minimum:!!progress?.pocket_minimum;
    setBusy(key);const payload:any={action:"minimums"};payload[key]=!current;
    await fetch("/api/work",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    await load();setBusy(null);
  };
  const complete=async(id:string)=>{
    setBusy(id);
    await fetch("/api/work",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"complete",id})});
    await load();setBusy(null);
  };

  if(!host)return null;
  return createPortal(<>
    <style>{css}</style>
    <section className="link-dashboard-hero">
      <div className="link-hero-banner"><div className="link-hero-copy"><small>{today}</small><h1>Misión Personal <span>•</span></h1><p>Cerrar + vender + no abrir.</p><blockquote>“Disciplina hoy, libertad mañana.”</blockquote><a href="/mision-personal">Iniciar misión de hoy <b>→</b></a></div><div className="link-hero-message"><span>— UN DÍA MÁS CERCA</span><b>Enfoque<br/>crea libertad.</b></div></div>
      <div className="link-task-grid">
        <section className="link-panel link-tasks-panel"><div className="link-panel-head"><div className="link-title-line"><h2>Tareas de hoy</h2><span>{open.length}</span></div><div className="link-panel-actions"><button className={`pill ${filter==="all"?"on":""}`} onClick={()=>setFilter("all")}>Todas</button><button className={`pill ${filter==="open"?"on":""}`} onClick={()=>setFilter("open")}>Pendientes {open.length}</button><button className={`pill ${filter==="done"?"on":""}`} onClick={()=>setFilter("done")}>Completadas {done.length}</button><a href="/mision-personal">＋ Añadir</a></div></div>
          <div className="link-task-list">{visible.map((t,i)=><div className="link-task-row" key={t.id}><button className={`link-task-check ${t.status==="completed"?"done":""}`} disabled={busy===t.id||t.status==="completed"} onClick={()=>complete(t.id)}>{t.status==="completed"?"✓":""}</button><span className="link-task-icon">{t.is_money?"$":i===0?"◎":"•"}</span><div className="link-task-copy"><b>{t.title}</b><span>{t.client?.name||"PERSONAL"}{t.is_money?" · Monetización":""}</span></div><span className="link-task-date">{t.status==="completed"?"Cerrada":"Hoy"}</span><em className={(t.priority||2)===1?"high":(t.priority||2)===2?"medium":"low"}>{(t.priority||2)===1?"Alta":(t.priority||2)===2?"Media":"Baja"}</em></div>)}{!visible.length&&<div className="link-empty"><span>✓</span><div><b>{filter==="done"?"Aún no hay tareas cerradas hoy.":"No hay tareas en esta vista."}</b><small>Usa Misión Personal para programar el siguiente foco.</small></div></div>}</div>
        </section>
        <aside className="link-side-stack"><section className="link-panel minimum-panel"><div className="link-panel-head compact"><div className="link-title-line"><h2>Mis 3 mínimos</h2></div><span className="count">{minimums}/3</span></div><Mini done={!!progress?.body_minimum} label="Cuerpo" detail="20 min de movimiento" icon="↔" disabled={busy==="body"} onClick={()=>toggleMinimum("body")}/><Mini done={!!progress?.mind_minimum} label="Mente" detail="Una sola misión activa" icon="◉" disabled={busy==="mind"} onClick={()=>toggleMinimum("mind")}/><Mini done={!!progress?.pocket_minimum} label="Bolsillo" detail="1 movimiento comercial real" icon="▥" disabled={busy==="pocket"} onClick={()=>toggleMinimum("pocket")}/></section><section className="link-panel money"><div className="money-head"><div><span className="money-icon">$</span><b>Movimiento comercial</b></div><span>{moneyDone?"1/1":"0/1"}</span></div><p>Al menos una acción que acerque dinero hoy.</p><a href="/mision-personal">＋ Registrar movimiento comercial</a></section></aside>
      </div>
      <div className="link-kpis"><Kpi label="Tareas hoy" value={`${done.length}/${todayItems.length}`} detail="Cerradas"/><Kpi label="Mínimos" value={`${minimums}/3`} detail="Sostenidos"/><Kpi label="Movimiento comercial" value={moneyDone?"1/1":"0/1"} detail="Hoy"/><a className="link-kpi progress" href="/mision-personal"><span className="check">✓</span><div><b>{open.length?"Día en curso":"Día cerrado"}</b><small>{open.length?"Sigue avanzando":"Objetivo sostenido"}</small></div><strong>›</strong></a></div>
    </section>
  </>,host);
}

function Mini({done,label,detail,icon,onClick,disabled}:{done:boolean;label:string;detail:string;icon:string;onClick:()=>void;disabled?:boolean}){return <button className={`link-mini ${done?"done":""}`} onClick={onClick} disabled={disabled}><span className="mini-check">{done?"✓":""}</span><span className="mini-icon">{icon}</span><span className="mini-copy"><b>{label}</b><small>{detail}</small></span><em>↻ Diario</em></button>}
function Kpi({label,value,detail}:{label:string;value:string;detail:string}){return <div className="link-kpi"><span className="ring"/><div><span>{label}</span><b>{value}</b><small>{detail}</small></div></div>}

const css=`#cc-personal-hero-host{margin:8px 0 18px}.link-dashboard-hero{color:var(--link-text);width:100%}.link-hero-banner{height:250px;border:1px solid var(--link-line);border-radius:var(--link-radius-xl);padding:31px 34px;position:relative;overflow:hidden;background:var(--link-surface) url('/link-mountain.svg') center/cover no-repeat;box-shadow:var(--link-shadow)}.link-hero-banner:before{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(248,246,241,.98) 0%,rgba(248,246,241,.88) 34%,rgba(248,246,241,.14) 66%,rgba(18,25,25,.08) 100%)}:root[data-link-theme="dark"] .link-hero-banner:before{background:linear-gradient(90deg,rgba(22,24,23,.97) 0%,rgba(22,24,23,.84) 34%,rgba(22,24,23,.18) 66%,rgba(5,8,7,.22) 100%)}.link-hero-copy{position:relative;z-index:2}.link-hero-copy small{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--link-muted)}.link-hero-copy h1{font-size:clamp(42px,4vw,58px);line-height:.98;letter-spacing:-.06em;margin:10px 0 8px}.link-hero-copy h1 span{color:var(--link-faint);font-size:.5em}.link-hero-copy p{font-size:16px;margin:0 0 8px;color:var(--link-muted)}.link-hero-copy blockquote{margin:0 0 17px;font-size:14px;font-style:italic;color:var(--link-muted)}.link-hero-copy a{display:inline-flex;gap:14px;align-items:center;background:var(--link-accent);color:var(--link-accent-text);text-decoration:none;border-radius:11px;padding:12px 17px;font-size:13px}.link-hero-message{position:absolute;right:38px;bottom:32px;z-index:2;color:white;text-shadow:0 2px 14px rgba(0,0,0,.32)}.link-hero-message span{display:block;font-size:9px;letter-spacing:.25em}.link-hero-message b{font-family:Georgia,serif;font-size:27px;line-height:.95}.link-task-grid{display:grid;grid-template-columns:minmax(0,1.72fr) minmax(300px,.82fr);gap:12px;margin-top:12px}.link-panel{background:var(--link-surface);border:1px solid var(--link-line);border-radius:var(--link-radius-lg);box-shadow:var(--link-shadow);padding:14px 17px}.link-panel-head{display:flex;align-items:center;justify-content:space-between;gap:14px;min-height:44px}.link-title-line{display:flex;align-items:center;gap:9px}.link-title-line h2{font-size:17px;margin:0}.link-title-line>span,.count{font-size:11px;background:var(--link-surface-2);border-radius:999px;padding:5px 8px;color:var(--link-muted)}.link-panel-actions{display:flex;align-items:center;gap:6px}.pill{border:0;background:transparent;font-size:10px;color:var(--link-muted);padding:6px 9px;border-radius:8px}.pill.on{background:var(--link-surface-2);color:var(--link-text)}.link-panel-actions>a{font-size:11px;text-decoration:none;color:var(--link-text);border:1px solid var(--link-line);padding:7px 10px;border-radius:9px}.link-task-list{border-top:1px solid var(--link-soft)}.link-task-row{display:grid;grid-template-columns:28px 36px minmax(0,1fr) 52px 54px;gap:7px;align-items:center;min-height:66px;border-bottom:1px solid var(--link-soft)}.link-task-check{width:20px;height:20px;border:1.6px solid #9aa09d;border-radius:50%;background:transparent}.link-task-check.done{background:var(--link-green);border-color:var(--link-green);color:white}.link-task-icon{width:34px;height:34px;border-radius:11px;background:var(--link-surface-2);display:grid;place-items:center}.link-task-copy{min-width:0;display:flex;flex-direction:column}.link-task-copy b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.link-task-copy span{font-size:10px;color:var(--link-muted)}.link-task-date{font-size:10px;color:var(--link-red)}.link-task-row em{font-style:normal;font-size:10px;text-align:center;border-radius:8px;padding:6px}.link-task-row em.high{background:var(--link-red-soft);color:var(--link-red)}.link-task-row em.medium{background:var(--link-amber-soft);color:var(--link-amber)}.link-task-row em.low{background:var(--link-surface-2);color:var(--link-muted)}.link-empty{min-height:118px;display:flex;align-items:center;gap:12px;color:var(--link-muted)}.link-empty>span{width:32px;height:32px;border-radius:50%;background:var(--link-green-soft);color:var(--link-green);display:grid;place-items:center}.link-empty>div{display:flex;flex-direction:column}.link-side-stack{display:grid;gap:12px}.link-mini{width:100%;border:0;border-top:1px solid var(--link-soft);background:transparent;color:var(--link-text);display:grid;grid-template-columns:24px 28px 1fr auto;gap:8px;align-items:center;text-align:left;padding:11px 0}.mini-check{width:19px;height:19px;border:1.5px solid #9ca09e;border-radius:50%;display:grid;place-items:center}.link-mini.done .mini-check{background:var(--link-green);border-color:var(--link-green);color:white}.mini-copy{display:flex;flex-direction:column}.mini-copy b{font-size:12px}.mini-copy small,.link-mini em{font-size:10px;color:var(--link-muted);font-style:normal}.money-head{display:flex;justify-content:space-between}.money-head>div{display:flex;align-items:center;gap:8px}.money-icon{width:22px;height:22px;border-radius:8px;background:var(--link-green-soft);color:var(--link-green);display:grid;place-items:center}.money p{margin:6px 0 10px;font-size:10px;color:var(--link-muted)}.money>a{display:block;text-align:center;text-decoration:none;color:var(--link-faint);background:var(--link-surface-2);border-radius:9px;padding:10px;font-size:10px}.link-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}.link-kpi{background:var(--link-surface);border:1px solid var(--link-line);border-radius:var(--link-radius-lg);min-height:84px;padding:13px 15px;display:flex;align-items:center;gap:12px;box-shadow:var(--link-shadow);text-decoration:none;color:inherit}.ring{width:48px;height:48px;border-radius:50%;border:6px solid var(--link-soft)}.link-kpi>div{display:flex;flex-direction:column}.link-kpi>div>span,.link-kpi small{font-size:10px;color:var(--link-muted)}.link-kpi b{font-size:21px}.link-kpi.progress{background:var(--link-green-soft);color:var(--link-green)}.check{width:46px;height:46px;border-radius:50%;background:rgba(17,122,79,.12);display:grid;place-items:center}.link-kpi.progress strong{margin-left:auto}@media(max-width:900px){.link-task-grid{grid-template-columns:1fr}.link-kpis{grid-template-columns:repeat(2,1fr)}.link-panel-actions{overflow-x:auto;max-width:60%}.link-hero-message{display:none}}@media(max-width:600px){.link-hero-banner{height:300px;padding:26px 22px}.link-panel-head{align-items:flex-start;flex-direction:column}.link-panel-actions{max-width:100%;width:100%;overflow-x:auto}.link-task-row{grid-template-columns:28px 34px minmax(0,1fr) 48px}.link-task-row em{display:none}.link-kpis{grid-template-columns:1fr}.link-mini{grid-template-columns:24px 26px 1fr}.link-mini em{display:none}}`;
