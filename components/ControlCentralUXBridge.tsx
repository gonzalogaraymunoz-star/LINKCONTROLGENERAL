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
.cc-calendar-head p{margin:4px 0 0;color:var(--link-muted);font-size:12px}
.cc-calendar-layout{display:grid;grid-template-columns:230px minmax(0,1fr);gap:12px;align-items:start}
.cc-calendar-sidebar{display:grid;gap:10px;position:sticky;top:12px}
.cc-calendar-main{min-width:0}
.cc-mini-month,.cc-calendar-filters,.cc-undated{background:var(--link-surface);border:1px solid var(--link-line);border-radius:14px;padding:12px;box-shadow:var(--link-shadow)}
.cc-mini-month>b,.cc-calendar-filters>b,.cc-undated>b{display:block;margin-bottom:9px;font-size:11px;text-transform:capitalize}
.cc-mini-month>div{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}.cc-mini-month small{text-align:center;font-size:8px;color:var(--link-muted);padding:3px}.cc-mini-month button{position:relative;aspect-ratio:1;border:0;border-radius:50%;background:transparent;color:var(--link-text);font-size:9px}.cc-mini-month button.selected{background:var(--link-accent);color:var(--link-accent-text)}.cc-mini-month button.muted{opacity:.35}.cc-mini-month i{position:absolute;bottom:2px;left:50%;width:3px;height:3px;border-radius:50%;background:var(--link-green);transform:translateX(-50%)}
.cc-calendar-filters label{display:flex;align-items:center;gap:7px;font-size:10px;margin:7px 0;color:var(--link-muted)}
.cc-undated>b{display:flex;justify-content:space-between}.cc-undated>b span{color:var(--link-muted)}.cc-undated button{width:100%;border:0;border-top:1px solid var(--link-soft);background:transparent;color:var(--link-text);text-align:left;padding:8px 2px;font-size:10px}.cc-undated small{font-size:9px;color:var(--link-muted)}
.cc-month-grid>section{display:block;min-width:0;min-height:122px;border-right:1px solid var(--link-soft);border-bottom:1px solid var(--link-soft);text-align:left;padding:7px;overflow:hidden;background:var(--link-surface)}.cc-month-grid>section.muted{opacity:.42}.cc-month-grid>section.selected{box-shadow:inset 0 0 0 1px var(--link-accent)}
.cc-day-number{display:inline-flex!important;width:26px!important;height:26px!important;align-items:center!important;justify-content:center!important;border:0!important;border-radius:50%!important;background:transparent!important;color:var(--link-text)!important;padding:0!important}.cc-month-grid>section.selected .cc-day-number{background:var(--link-accent)!important;color:var(--link-accent-text)!important}
.cc-calendar-event{display:block;width:100%;border:0;border-left:3px solid;border-radius:6px;background:var(--link-surface-2);color:var(--link-text);padding:5px 6px;margin-top:4px;text-align:left;overflow:hidden}.cc-calendar-event b,.cc-calendar-event small{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.cc-calendar-event b{font-size:9px}.cc-calendar-event small{font-size:8px;color:var(--link-muted);margin-top:2px}.cc-more{border:0;background:transparent;color:var(--link-muted);font-size:9px;padding:5px}
.cc-week-view>section{min-height:260px;border:1px solid var(--link-line);background:var(--link-surface);padding:8px}.cc-week-view>section>button{border-left:3px solid!important}
.cc-year>button{border:1px solid var(--link-line);background:var(--link-surface);color:var(--link-text);padding:18px;border-radius:12px;display:flex;flex-direction:column;text-align:left}.cc-year>button strong{font-size:28px}.cc-year>button small{color:var(--link-muted)}
.cc-moving{position:sticky;top:4px;z-index:5;padding:8px 10px;background:var(--link-blue-soft);color:var(--link-blue);border-radius:9px;font-size:10px;margin-bottom:6px}
html[data-cc-view="calendario"] #cc-personal-hero-host,html[data-cc-view="calendario"] #cc-work-board-host{display:none!important}
html:not([data-cc-view="inicio"]) #cc-personal-hero-host,html:not([data-cc-view="inicio"]) #cc-work-board-host{display:none!important}
@media(max-width:760px){
 .cc-cal-toolbar{grid-template-columns:auto auto auto 1fr!important;gap:6px!important}.cc-cal-toolbar strong{grid-column:1/-1;grid-row:1}.cc-cal-toolbar input{grid-column:1/-1;width:100%}.cc-weekdays,.cc-month-grid{grid-template-columns:repeat(7,minmax(86px,1fr))!important;min-width:602px!important}.cc-month-grid>button{min-height:100px!important}.cc-calendar-select{align-items:center;gap:8px;overflow:hidden}.cc-calendar-select select{min-width:0;max-width:60vw}.cc-calendar-head{display:flex;align-items:center;justify-content:space-between}.cc-calendar-head h1{font-size:26px!important}
 .cc-calendar-layout{grid-template-columns:1fr}.cc-calendar-sidebar{position:static;grid-template-columns:1fr 1fr}.cc-calendar-select{grid-column:1/-1}.cc-mini-month{grid-row:2/4}.cc-calendar-main{grid-column:1/-1}.cc-month-grid>section{min-height:104px}.cc-calendar-event b{font-size:8px}
}
@media(max-width:470px){.cc-calendar-sidebar{grid-template-columns:1fr}.cc-mini-month{grid-row:auto}.cc-calendar-head{align-items:flex-end}.cc-calendar-head p{display:none}}
`;
