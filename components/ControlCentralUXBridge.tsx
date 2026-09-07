"use client";

import {useEffect} from "react";

export default function ControlCentralUXBridge(){
 useEffect(()=>{
  let frame=0;
  const sync=()=>{
   const menu=document.querySelector(".cc-menu");
   if(menu){
    menu.querySelectorAll("button").forEach((b)=>{if(b.textContent?.includes("Gestos")){const strong=b.querySelector("b");if(strong)strong.textContent="Tareas"}});
   }
   const add=document.querySelector<HTMLButtonElement>(".cc-add");
   if(add&&add.textContent?.includes("Gesto"))add.textContent="＋ Tarea";
   const title=document.querySelector(".cc-topbar strong")?.textContent?.trim()||"";
   document.documentElement.dataset.ccView=title.toLowerCase().replace(/\s+/g,"-");
   frame=requestAnimationFrame(sync);
  };
  sync();return()=>cancelAnimationFrame(frame);
 },[]);
 return <style>{css}</style>;
}

const css=`
/* Calendar is an operational workspace, never a compressed strip */
.cc-month{width:100%;overflow:auto;border:1px solid var(--link-line);border-radius:16px;background:var(--link-surface)}
.cc-weekdays,.cc-month-grid{display:grid!important;grid-template-columns:repeat(7,minmax(110px,1fr))!important;min-width:770px!important;width:100%}
.cc-weekdays{position:sticky;top:0;z-index:3;background:var(--link-surface);border-bottom:1px solid var(--link-line)}
.cc-weekdays b{min-height:34px;display:flex;align-items:center;padding:0 10px!important}
.cc-month-grid>button{display:block!important;min-width:0!important;min-height:122px!important;border:0!important;border-right:1px solid var(--link-soft)!important;border-bottom:1px solid var(--link-soft)!important;border-radius:0!important;text-align:left!important;padding:9px!important;overflow:hidden}
.cc-month-grid>button>span{display:inline-flex;width:26px;height:26px;align-items:center;justify-content:center;border-radius:50%;font-size:12px}
.cc-month-grid>button.selected>span{background:var(--link-accent);color:var(--link-accent-text)}
.cc-month-grid i{display:block!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:4px 0 0!important;font-size:10px!important}
.cc-cal-toolbar{display:grid!important;grid-template-columns:auto auto auto 1fr minmax(180px,280px);align-items:center}
.cc-cal-toolbar strong{min-width:0;text-transform:capitalize}
.cc-cal-modes{display:flex!important;flex-wrap:wrap}
html[data-cc-view="calendario"] #cc-personal-hero-host,html[data-cc-view="calendario"] #cc-work-board-host{display:none!important}
html:not([data-cc-view="inicio"]) #cc-personal-hero-host,html:not([data-cc-view="inicio"]) #cc-work-board-host{display:none!important}
@media(max-width:760px){
 .cc-cal-toolbar{grid-template-columns:auto auto auto 1fr!important;gap:6px!important}.cc-cal-toolbar strong{grid-column:1/-1;grid-row:1}.cc-cal-toolbar input{grid-column:1/-1;width:100%}.cc-weekdays,.cc-month-grid{grid-template-columns:repeat(7,minmax(86px,1fr))!important;min-width:602px!important}.cc-month-grid>button{min-height:100px!important}.cc-calendar-select{align-items:center;gap:8px;overflow:hidden}.cc-calendar-select select{min-width:0;max-width:60vw}.cc-calendar-head{display:flex;align-items:center;justify-content:space-between}.cc-calendar-head h1{font-size:26px!important}
}
`;
