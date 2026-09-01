"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function Ficha360QuickAccess(){
  const [target,setTarget]=useState<HTMLElement|null>(null);
  const [business,setBusiness]=useState("");

  useEffect(()=>{
    const sync=()=>{
      const head=document.querySelector<HTMLElement>(".cc-ficha-head");
      const name=head?.querySelector("h1")?.textContent?.trim()||"";
      const existing=document.getElementById("cc-business-access");
      if(!head){ if(existing) existing.remove(); setTarget(null); setBusiness(""); return; }
      let mount=existing as HTMLElement|null;
      if(!mount){
        mount=document.createElement("div"); mount.id="cc-business-access";
        head.insertAdjacentElement("afterend",mount);
      }
      setBusiness(name); setTarget(mount);
    };
    sync();
    const observer=new MutationObserver(sync); observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);

  if(!target)return null;
  const isCaracol=business.toLowerCase().includes("caracol");
  return createPortal(<>
    <style>{`
      #cc-business-access{max-width:1200px;margin:14px auto 18px}
      .cc-ba{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .cc-ba-card{min-height:118px;border:1px solid #d8d8d3;border-radius:16px;padding:18px;text-decoration:none;color:inherit;background:rgba(255,255,255,.55);display:flex;flex-direction:column;justify-content:space-between;transition:.15s ease}
      .cc-ba-card:active{transform:scale(.985)}
      .cc-ba-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.cc-ba-top b{font-size:18px;letter-spacing:-.02em}.cc-ba-top span{font-size:22px}
      .cc-ba-card p{margin:18px 0 0;font-size:12px;line-height:1.45;color:#777}.cc-ba-card small{font-size:9px;letter-spacing:.12em;color:#888;margin-bottom:6px}
      .cc-ba-card.off{opacity:.45;pointer-events:none}
      @media(prefers-color-scheme:dark){.cc-ba-card{background:#151515;border-color:#30302e}.cc-ba-card p{color:#8d8d88}}
      @media(max-width:600px){#cc-business-access{margin:12px 0 18px}.cc-ba{gap:9px}.cc-ba-card{min-height:132px;padding:15px;border-radius:14px}.cc-ba-top b{font-size:17px}.cc-ba-card p{margin-top:14px;font-size:11px}}
    `}</style>
    <div className="cc-ba" aria-label="Centro operacional del negocio">
      <a className={`cc-ba-card ${!isCaracol?"off":""}`} href={isCaracol?"/misiones":"#"}>
        <div><small>CICLO ACTIVO</small><div className="cc-ba-top"><b>Misión</b><span>→</span></div></div>
        <p>{isCaracol?"Objetivos, semanas, acciones, entregables y avance del ciclo.":"Sin misión activa configurada."}</p>
      </a>
      <a className={`cc-ba-card ${!isCaracol?"off":""}`} href={isCaracol?"/misiones/tasks":"#"}>
        <div><small>EJECUCIÓN</small><div className="cc-ba-top"><b>Tasks</b><span>→</span></div></div>
        <p>{isCaracol?"Pendientes, ejecución, revisión, evidencia y completadas.":"Sin tablero de tareas configurado."}</p>
      </a>
    </div>
  </>,target);
}
