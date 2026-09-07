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
      if(!mount){mount=document.createElement("div");mount.id="cc-business-access";head.insertAdjacentElement("afterend",mount)}
      setBusiness(name);setTarget(mount);
    };
    sync();const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
  },[]);

  if(!target)return null;
  const isCaracol=business.toLowerCase().includes("caracol");
  return createPortal(<>
    <style>{`
      #cc-business-access{width:100%;margin:12px 0 18px}.cc-ba{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .cc-ba-card{min-height:112px;border:1px solid var(--link-line);border-radius:var(--link-radius-lg);padding:16px;text-decoration:none;color:var(--link-text);background:var(--link-surface);box-shadow:var(--link-shadow);display:flex;flex-direction:column;justify-content:space-between;transition:.16s ease}
      .cc-ba-card:hover{background:var(--link-surface-2);transform:translateY(-1px)}.cc-ba-card:active{transform:scale(.99)}
      .cc-ba-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.cc-ba-top b{font-size:17px;letter-spacing:-.025em}.cc-ba-top span{font-size:20px}.cc-ba-card p{margin:14px 0 0;font-size:11px;line-height:1.45;color:var(--link-muted)}.cc-ba-card small{font-size:9px;letter-spacing:.14em;color:var(--link-faint);margin-bottom:6px}.cc-ba-card.off{opacity:.48;pointer-events:none}
      @media(max-width:640px){#cc-business-access{margin:10px 0 14px}.cc-ba{grid-template-columns:1fr;gap:8px}.cc-ba-card{min-height:94px;padding:14px;border-radius:15px}.cc-ba-top b{font-size:16px}.cc-ba-card p{margin-top:10px;font-size:10px}}
    `}</style>
    <div className="cc-ba" aria-label="Centro operacional del negocio">
      <a className={`cc-ba-card ${!isCaracol?"off":""}`} href={isCaracol?"/misiones":"#"}><div><small>CICLO ACTIVO</small><div className="cc-ba-top"><b>Misión</b><span>→</span></div></div><p>{isCaracol?"Objetivos, semanas, acciones, entregables y avance del ciclo.":"Sin misión activa configurada."}</p></a>
      <a className={`cc-ba-card ${!isCaracol?"off":""}`} href={isCaracol?"/misiones/tasks":"#"}><div><small>EJECUCIÓN</small><div className="cc-ba-top"><b>Tasks</b><span>→</span></div></div><p>{isCaracol?"Pendientes, ejecución, revisión, evidencia y completadas.":"Sin tablero de tareas configurado."}</p></a>
    </div>
  </>,target);
}
