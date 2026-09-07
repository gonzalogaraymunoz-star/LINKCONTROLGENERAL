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
 --link-bg:#f6f4ef;--link-surface:#ffffff;--link-surface-2:#f1f0eb;--link-surface-3:#ebe9e3;
 --link-text:#171b1f;--link-muted:#6f7479;--link-faint:#969b9f;--link-line:#deddd7;--link-soft:#ecebe6;
 --link-accent:#182027;--link-accent-text:#ffffff;--link-green:#117a4f;--link-green-soft:#e8f5ed;
 --link-red:#c34943;--link-red-soft:#f8e9e7;--link-blue:#2f6fae;--link-blue-soft:#eaf1fb;--link-amber:#b66d14;--link-amber-soft:#fbf0dc;
 --link-radius-xl:22px;--link-radius-lg:16px;--link-radius-md:12px;--link-shadow:0 8px 28px rgba(30,34,37,.055);
 --link-font:Inter,-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Arial,sans-serif;
}
:root[data-link-theme="dark"]{
 --link-bg:#111312;--link-surface:#191b1a;--link-surface-2:#222523;--link-surface-3:#2b2e2b;
 --link-text:#f1f2ef;--link-muted:#a3a7a3;--link-faint:#7f847f;--link-line:#353936;--link-soft:#292d2a;
 --link-accent:#f3f4ef;--link-accent-text:#141715;--link-green:#83d1a7;--link-green-soft:#193126;
 --link-red:#ed9b94;--link-red-soft:#3a2422;--link-blue:#9fc7ef;--link-blue-soft:#1e3041;--link-amber:#e9bd7e;--link-amber-soft:#382d20;--link-shadow:none;
}
:root[data-link-theme="gray"]{
 --link-bg:#dde0dc;--link-surface:#eef0ed;--link-surface-2:#e2e5e1;--link-surface-3:#d5d9d4;
 --link-text:#242826;--link-muted:#666c68;--link-faint:#858b87;--link-line:#c8cdc7;--link-soft:#d8dcd7;
 --link-accent:#2c312e;--link-accent-text:#fff;--link-green:#287650;--link-green-soft:#dbece2;--link-shadow:0 6px 20px rgba(26,31,28,.05);
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--link-bg);color:var(--link-text);font-family:var(--link-font);-webkit-font-smoothing:antialiased}
button,input,select,textarea{font:inherit}
button,a{transition:background .16s ease,border-color .16s ease,color .16s ease,opacity .16s ease,transform .16s ease}
button{cursor:pointer}

/* APP SHELL */
.cc-shell{min-height:100dvh;background:var(--link-bg);color:var(--link-text)}
.cc-menu{width:212px;background:var(--link-surface);border-right:1px solid var(--link-line);padding:92px 12px 24px;box-shadow:2px 0 18px rgba(28,31,32,.02)}
.cc-menu-head{height:auto;min-height:72px;padding:20px 18px;align-items:flex-start}
.cc-menu-head b{font-size:12px;letter-spacing:.16em;line-height:1.35;color:var(--link-text);max-width:150px}
.cc-menu>button,.cc-personal-mission{min-height:44px;border-radius:12px;padding:0 13px;gap:12px;color:var(--link-muted);font-size:14px;font-weight:500}
.cc-menu>button span,.cc-personal-mission span{width:16px;text-align:center;color:var(--link-muted)}
.cc-menu>button:hover,.cc-personal-mission:hover{background:var(--link-surface-2);color:var(--link-text)}
.cc-menu>button.on{background:var(--link-surface-2);color:var(--link-text);box-shadow:inset 0 0 0 1px rgba(0,0,0,.01)}
.cc-main{margin-left:212px;padding:0 26px 72px;background:var(--link-bg);min-height:100dvh}
.cc-topbar{height:88px;border-bottom:0;display:grid;grid-template-columns:220px minmax(240px,1fr) auto;align-items:center;padding:0;gap:18px}
.cc-topbar>div{grid-column:1;align-self:center}
.cc-topbar>div small{font-size:9px;letter-spacing:.19em;color:var(--link-faint)}
.cc-topbar>div strong{display:block;margin-top:2px;font-size:14px;color:var(--link-text)}
.cc-add{position:static;grid-column:2 / 4;height:42px;border:1px solid var(--link-line);background:var(--link-surface);color:var(--link-text);border-radius:12px;box-shadow:var(--link-shadow);font-size:13px}
.cc-add:hover{background:var(--link-surface-2)}

/* MAIN TYPOGRAPHY */
.cc-hero{padding:28px 0 14px}
.cc-hero small,.cc-calendar-head small{font-size:9px;letter-spacing:.18em;color:var(--link-faint)}
.cc-hero h1,.cc-calendar-head h1,.cc-ficha-head h1{font-size:30px;line-height:1.08;letter-spacing:-.035em;margin:6px 0;color:var(--link-text)}
.cc-hero p{margin:0;color:var(--link-muted);font-size:14px}

/* PANELS + METRICS */
.cc-metrics{gap:10px;margin-bottom:12px}
.cc-metric,.cc-card,.cc-client-card,.cc-gesture-row,.cc-calendar-select,.cc-sheet{background:var(--link-surface);border:1px solid var(--link-line);box-shadow:var(--link-shadow)}
.cc-metric{padding:15px 16px;border-radius:var(--link-radius-lg)}
.cc-metric small{font-size:10px;color:var(--link-muted)}
.cc-metric b{font-size:24px;letter-spacing:-.03em;color:var(--link-text)}
.cc-card{border-radius:var(--link-radius-lg);padding:14px 16px;margin-bottom:12px}
.cc-card h2{font-size:17px;letter-spacing:-.02em;margin:0 0 10px;color:var(--link-text)}
.cc-card p{color:var(--link-muted);line-height:1.55}
.cc-client-card{min-height:58px;border-radius:13px;margin:7px 0;padding:10px 13px;border-left-width:3px;color:var(--link-text)}
.cc-client-card:hover{background:var(--link-surface-2);transform:translateY(-1px)}
.cc-client-card b{font-size:14px;letter-spacing:-.01em}
.cc-client-card small,.cc-gesture-row small,.cc-activity small{font-size:11px;color:var(--link-muted)}
.cc-client-card strong{font-size:12px;color:var(--link-text)}

/* GESTURES */
.cc-gesture-row{border-radius:12px;overflow:hidden;border-left-width:3px;margin:7px 0}
.cc-gesture-main{color:var(--link-text);padding:11px 12px}
.cc-gesture-main b{font-size:13px}
.cc-status{margin:8px;border:1px solid var(--link-line);background:var(--link-surface-2);color:var(--link-text);border-radius:9px;padding:8px 9px;font-size:11px}
.cc-status.planned{background:var(--link-amber-soft);color:var(--link-amber)}
.cc-status.completed{background:var(--link-green-soft);color:var(--link-green)}
.cc-status.scheduled{background:var(--link-blue-soft);color:var(--link-blue)}

/* 360 + CALENDAR */
.cc-ficha-head,.cc-calendar-head{padding:24px 0 15px;border-color:var(--link-line)}
.cc-ficha-head button,.cc-action,.cc-cal-toolbar button,.cc-cal-modes button{background:var(--link-surface);color:var(--link-text);border:1px solid var(--link-line);border-radius:10px;padding:9px 11px;box-shadow:var(--link-shadow)}
.cc-ficha-head button:hover,.cc-action:hover,.cc-cal-toolbar button:hover,.cc-cal-modes button:hover{background:var(--link-surface-2)}
.cc-two{gap:12px}
.cc-calendar-select{border-radius:14px;padding:11px 13px;border-left-width:3px}
.cc-calendar-select select,.cc-cal-toolbar input,.cc-sheet input,.cc-sheet select,.cc-sheet textarea{background:var(--link-surface-2);color:var(--link-text);border:1px solid var(--link-line);border-radius:10px;padding:10px}
.cc-cal-toolbar{gap:7px;padding:12px 0}
.cc-cal-modes{gap:6px;margin-bottom:10px}
.cc-cal-modes .on{background:var(--link-accent);color:var(--link-accent-text)}
.cc-weekdays b{font-size:9px;color:var(--link-faint);padding:9px}
.cc-month-grid>button,.cc-week-view>div,.cc-year>div{background:var(--link-surface);color:var(--link-text);border:1px solid var(--link-line)}
.cc-month-grid>button{min-height:112px;padding:8px}
.cc-month-grid>button.selected{outline:2px solid var(--link-text);outline-offset:-2px}
.cc-month-grid i{background:var(--link-surface-2);border-radius:6px;margin-top:5px;padding:5px 6px;color:var(--link-text)}
.cc-week-view button,.cc-agenda{background:var(--link-surface-2);color:var(--link-text);border-radius:8px}
.cc-activity{border-color:var(--link-line);padding:10px 4px}

/* MODALS */
.cc-modal{backdrop-filter:blur(8px);background:rgba(15,18,17,.48)}
.cc-sheet{border-radius:20px;padding:26px}
.cc-primary{background:var(--link-accent);color:var(--link-accent-text)}
.cc-danger{background:var(--link-red-soft);color:var(--link-red)}
.cc-nav-cube{background:var(--link-surface);color:var(--link-text);border:1px solid var(--link-line);box-shadow:var(--link-shadow)}
.cc-empty{color:var(--link-muted)}

/* THEME CONTROL */
.link-theme-switcher{position:fixed;right:28px;top:24px;z-index:100}
.link-theme-trigger{height:40px;border:1px solid var(--link-line);border-radius:12px;background:var(--link-surface);color:var(--link-text);display:flex;align-items:center;gap:8px;padding:0 12px;box-shadow:var(--link-shadow)}
.link-theme-trigger:hover{background:var(--link-surface-2)}
.link-theme-trigger .label{font-size:12px}
.link-theme-menu{position:absolute;right:0;top:48px;width:190px;border:1px solid var(--link-line);border-radius:14px;background:var(--link-surface);padding:6px;box-shadow:0 16px 36px rgba(0,0,0,.14)}
.link-theme-menu button{width:100%;border:0;background:transparent;color:var(--link-text);border-radius:10px;padding:10px;display:grid;grid-template-columns:24px 1fr 20px;align-items:center;text-align:left}
.link-theme-menu button:hover,.link-theme-menu button.on{background:var(--link-surface-2)}
.link-theme-menu span{font-size:13px}.link-theme-menu b{opacity:0}.link-theme-menu .on b{opacity:1}

@media(max-width:1000px){.cc-topbar{grid-template-columns:180px 1fr}.cc-add{grid-column:2}.link-theme-switcher{right:18px}}
@media(max-width:760px){
 .cc-menu{width:min(84vw,320px);padding-top:78px}.cc-main{margin-left:0;padding:0 12px 82px}.cc-topbar{height:78px;grid-template-columns:46px 1fr 92px;gap:8px}.cc-square{display:block;width:40px;height:40px;background:var(--link-surface);color:var(--link-text);border:1px solid var(--link-line);border-radius:11px}.cc-topbar>div{grid-column:2}.cc-add{grid-column:3;height:40px}.link-theme-switcher{right:112px;top:19px}.link-theme-trigger{width:40px;height:40px;padding:0;justify-content:center}.link-theme-trigger .label{display:none}.cc-ficha-grid,.cc-service-grid,.cc-two{grid-template-columns:1fr}.cc-metrics{grid-template-columns:repeat(3,1fr)}.cc-metric{padding:12px}.cc-metric b{font-size:20px}.cc-month{overflow-x:auto}.cc-weekdays,.cc-month-grid{min-width:720px}.cc-sheet{padding:22px 18px}
}
`;
