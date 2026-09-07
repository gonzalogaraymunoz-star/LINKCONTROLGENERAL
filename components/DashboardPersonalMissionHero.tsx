"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Task={id:string;title:string;detail?:string;source:string;money:boolean;done:boolean};
type State={date:string;tasks:Task[];body:boolean;mind:boolean;pocket:boolean;note:string};

const KEY="cc-personal-mission-v2";

export default function DashboardPersonalMissionHero(){
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [state,setState]=useState<State|null>(null);

  useEffect(()=>{
    const main=document.querySelector(".cc-main");
    const top=document.querySelector(".cc-topbar");
    if(!main||!top)return;
    let node=document.getElementById("cc-personal-hero-host");
    if(!node){
      node=document.createElement("div");
      node.id="cc-personal-hero-host";
      top.insertAdjacentElement("afterend",node);
    }
    setHost(node as HTMLElement);
    return()=>{ if(node?.parentElement) node.remove(); };
  },[]);

  useEffect(()=>{
    const read=()=>{
      try{
        const raw=localStorage.getItem(KEY);
        setState(raw?JSON.parse(raw):null);
      }catch{ setState(null); }
    };
    read();
    window.addEventListener("storage",read);
    window.addEventListener("focus",read);
    return()=>{window.removeEventListener("storage",read);window.removeEventListener("focus",read)};
  },[]);

  if(!host)return null;

  const tasks=state?.tasks||[];
  const open=tasks.filter(t=>!t.done);
  const done=tasks.filter(t=>t.done);
  const minimums=state?[state.body,state.mind,state.pocket].filter(Boolean).length:0;

  const toggle=(id:string)=>{
    if(!state)return;
    const next={...state,tasks:state.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)};
    setState(next);
    localStorage.setItem(KEY,JSON.stringify(next));
  };

  return createPortal(<section className="dpmh">
    <style jsx global>{css}</style>
    <div className="dpmh-head">
      <div>
        <small>MISIÓN PERSONAL · HOY</small>
        <h1>{open[0]?.title||"Define tu misión principal"}</h1>
        <p>{open.length} pendientes · {done.length} cerradas · {minimums}/3 mínimos</p>
      </div>
      <a href="/mision-personal">Abrir misión →</a>
    </div>

    <div className="dpmh-list">
      {open.slice(0,4).map((t,i)=><div className={`dpmh-row ${i===0?"main":""}`} key={t.id}>
        <button className="dpmh-check" onClick={()=>toggle(t.id)} aria-label="Completar tarea" />
        <div className="dpmh-copy">
          <b>{t.title}</b>
          <span>{t.source}{t.money?" · $ MONETIZACIÓN":""}</span>
        </div>
        <span className="dpmh-status">Pendiente</span>
      </div>)}
      {!open.length&&<div className="dpmh-empty">✓ Todo lo definido para hoy está cerrado.</div>}
    </div>

    <div className="dpmh-foot">
      <span><b>{minimums}/3</b> mínimos sostenidos</span>
      <span className={state?.tasks.some(t=>t.money&&t.done)?"ok":""}>$ {state?.tasks.some(t=>t.money&&t.done)?"movimiento comercial hecho":"movimiento comercial pendiente"}</span>
    </div>
  </section>,host);
}

const css=`#cc-personal-hero-host{margin-top:18px}.dpmh{border:1px solid #30312f;background:#181917;border-radius:18px;padding:18px;margin-bottom:14px}.dpmh-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:4px 2px 16px}.dpmh-head small{font-size:8px;letter-spacing:.2em;color:#777}.dpmh-head h1{font-size:27px;line-height:1.08;letter-spacing:-.035em;margin:7px 0 6px;max-width:760px}.dpmh-head p{margin:0;color:#888;font-size:12px}.dpmh-head a{flex:none;color:#ddd;text-decoration:none;font-size:12px;border:1px solid #3a3b39;padding:9px 11px;border-radius:9px}.dpmh-list{border-top:1px solid #2d2e2c}.dpmh-row{display:grid;grid-template-columns:34px 1fr auto;gap:8px;align-items:center;min-height:61px;border-bottom:1px solid #292a28;padding:7px 4px}.dpmh-row.main{background:#1d1f1d}.dpmh-check{width:21px;height:21px;border:2px solid #777;border-radius:50%;background:transparent;cursor:pointer}.dpmh-row.main .dpmh-check{border-color:#d9d9d4}.dpmh-copy{display:flex;flex-direction:column;gap:4px}.dpmh-copy b{font-size:14px;font-weight:600}.dpmh-copy span{font-size:9px;color:#777;letter-spacing:.06em}.dpmh-status{font-size:11px;color:#9a9a95;border:1px solid #3a3b39;border-radius:8px;padding:7px 9px}.dpmh-empty{padding:22px 4px;color:#888;font-size:13px}.dpmh-foot{display:flex;gap:8px;flex-wrap:wrap;padding-top:13px}.dpmh-foot span{font-size:10px;border:1px solid #343532;border-radius:999px;padding:6px 9px;color:#888}.dpmh-foot .ok{color:#9acaa3;border-color:#3d5e44}@media(max-width:760px){#cc-personal-hero-host{margin-top:10px}.dpmh{padding:14px 12px}.dpmh-head{align-items:flex-start}.dpmh-head h1{font-size:21px}.dpmh-head a{font-size:10px;padding:8px}.dpmh-row{grid-template-columns:30px 1fr}.dpmh-status{display:none}.dpmh-copy b{font-size:13px}}`;