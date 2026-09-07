"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "gray";
const KEY = "link-control-theme";

export default function LinkThemeController(){
  const [theme,setTheme]=useState<Theme>("light");
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    const saved=(localStorage.getItem(KEY) as Theme|null)||"light";
    setTheme(saved);
    document.documentElement.dataset.linkTheme=saved;
  },[]);

  const apply=(next:Theme)=>{
    setTheme(next);
    localStorage.setItem(KEY,next);
    document.documentElement.dataset.linkTheme=next;
    setOpen(false);
  };

  return <>
    <style jsx global>{globalCss}</style>
    <div className="link-theme-switcher">
      <button className="link-theme-trigger" onClick={()=>setOpen(v=>!v)} aria-label="Cambiar apariencia">
        <span>{theme==="light"?"☀":theme==="dark"?"☾":"◐"}</span>
        <span className="label">Apariencia</span>
      </button>
      {open&&<div className="link-theme-menu">
        <button onClick={()=>apply("light")} className={theme==="light"?"on":""}>☀ <span>Modo día</span><b>✓</b></button>
        <button onClick={()=>apply("dark")} className={theme==="dark"?"on":""}>☾ <span>Modo noche</span><b>✓</b></button>
        <button onClick={()=>apply("gray")} className={theme==="gray"?"on":""}>◐ <span>Modo gris</span><b>✓</b></button>
      </div>}
    </div>
  </>;
}

const globalCss=`
:root{
 --link-bg:#f6f5f1;--link-surface:#ffffff;--link-surface-2:#f1f0ec;--link-text:#1f2328;--link-muted:#6d7278;--link-line:#dddcd6;--link-soft:#ebeae5;--link-accent:#20242a;--link-accent-text:#fff;--link-shadow:0 8px 24px rgba(25,27,30,.06);
}
:root[data-link-theme="dark"]{
 --link-bg:#101211;--link-surface:#171918;--link-surface-2:#202321;--link-text:#f2f3f0;--link-muted:#9b9f9b;--link-line:#323531;--link-soft:#262925;--link-accent:#f4f4ef;--link-accent-text:#141614;--link-shadow:none;
}
:root[data-link-theme="gray"]{
 --link-bg:#dfe1de;--link-surface:#eceeeb;--link-surface-2:#d4d7d3;--link-text:#252827;--link-muted:#626763;--link-line:#c4c8c3;--link-soft:#d7dad6;--link-accent:#303432;--link-accent-text:#fff;--link-shadow:0 5px 18px rgba(20,24,22,.06);
}
html,body{background:var(--link-bg)!important;color:var(--link-text)!important}
.cc-shell,.cc-main{background:var(--link-bg)!important;color:var(--link-text)!important}
.cc-menu{background:var(--link-surface)!important;border-color:var(--link-line)!important}
.cc-menu-head,.cc-menu>button,.cc-personal-mission{color:var(--link-muted)!important}
.cc-menu>button.on{background:var(--link-surface-2)!important;color:var(--link-text)!important}
.cc-personal-mission:hover,.cc-menu>button:hover{background:var(--link-surface-2)!important;color:var(--link-text)!important}
.cc-topbar{border-color:var(--link-line)!important}
.cc-topbar>div small,.cc-hero small,.cc-calendar-head small{color:var(--link-muted)!important}
.cc-add,.cc-square,.cc-action,.cc-cal-toolbar button,.cc-cal-modes button{background:var(--link-surface)!important;color:var(--link-text)!important;border-color:var(--link-line)!important}
.cc-card,.cc-metric,.cc-client-card,.cc-gesture-row,.cc-calendar-select,.cc-sheet{background:var(--link-surface)!important;color:var(--link-text)!important;border-color:var(--link-line)!important;box-shadow:var(--link-shadow)}
.cc-client-card small,.cc-gesture-row small,.cc-activity small,.cc-hero p,.cc-empty{color:var(--link-muted)!important}
.cc-gesture-main,.cc-week-view button,.cc-agenda{color:var(--link-text)!important}
.cc-status,.cc-calendar-select select,.cc-cal-toolbar input,.cc-sheet input,.cc-sheet select,.cc-sheet textarea{background:var(--link-surface-2)!important;color:var(--link-text)!important;border-color:var(--link-line)!important}
.cc-month-grid>button,.cc-week-view>div,.cc-year>div{background:var(--link-surface)!important;color:var(--link-text)!important;border-color:var(--link-line)!important}
.cc-activity,.cc-month-grid i{border-color:var(--link-line)!important}
.cc-nav-cube{background:var(--link-surface)!important;color:var(--link-text)!important;border-color:var(--link-line)!important}
.link-theme-switcher{position:fixed;right:20px;top:18px;z-index:100}
.link-theme-trigger{height:38px;border:1px solid var(--link-line);border-radius:12px;background:var(--link-surface);color:var(--link-text);display:flex;align-items:center;gap:8px;padding:0 12px;box-shadow:var(--link-shadow);cursor:pointer}
.link-theme-trigger .label{font-size:12px}
.link-theme-menu{position:absolute;right:0;top:46px;width:188px;border:1px solid var(--link-line);border-radius:14px;background:var(--link-surface);padding:6px;box-shadow:0 14px 34px rgba(0,0,0,.14)}
.link-theme-menu button{width:100%;border:0;background:transparent;color:var(--link-text);border-radius:10px;padding:10px;display:grid;grid-template-columns:24px 1fr 20px;align-items:center;text-align:left;cursor:pointer}
.link-theme-menu button:hover,.link-theme-menu button.on{background:var(--link-surface-2)}
.link-theme-menu span{font-size:13px}.link-theme-menu b{opacity:0}.link-theme-menu .on b{opacity:1}
@media(max-width:760px){.link-theme-switcher{right:12px;top:12px}.link-theme-trigger .label{display:none}.link-theme-trigger{width:38px;padding:0;justify-content:center}}
`;
