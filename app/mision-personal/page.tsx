"use client";

import {FormEvent,useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import LinkThemeController from "@/components/LinkThemeController";

type Client={id:string;name:string};
type Session={id:string;gesture_id:string;started_at:string;planned_minutes:number;status:string};
type Work={id:string;title:string;description?:string;status:string;starts_at?:string;ends_at?:string;priority:number;planned_minutes:number;accumulated_seconds:number;scope:string;is_money:boolean;client?:Client|null;runningSession?:Session|null};
type Progress={body_minimum:boolean;mind_minimum:boolean;pocket_minimum:boolean;focused_seconds:number;tasks_completed:number;commercial_moves:number;closures:number;notes?:string};
type Feedback={kind:"success"|"error";message:string};

const PRESETS=[15,30,50,90];
const TZ="America/Santiago";
const pad=(n:number)=>String(n).padStart(2,"0");
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

function friendlyError(value:unknown){
 const error=String(value||"");
 const messages:Record<string,string>={
  active_session_exists:"Ya existe otra tarea en foco. Paúsala o ciérrala antes de iniciar una nueva.",
  end_must_be_after_start:"La hora final debe ser posterior a la hora de inicio.",
  invalid_schedule:"La fecha o el horario no son válidos.",
  work_not_found:"La tarea ya no existe o fue movida.",
  central_supabase_not_configured:"La conexión de Control Central no está disponible.",
 };
 return messages[error]||error||"No se pudo completar la acción. Intenta nuevamente.";
}

async function post<T>(path:string,body:Record<string,unknown>):Promise<T>{
 const response=await fetch(path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({ok:false,error:"invalid_response"}));
 if(!response.ok||data.ok===false)throw new Error(friendlyError(data.error));
 return data as T;
}

export default function PersonalMission(){
 const [items,setItems]=useState<Work[]>([]);
 const [clients,setClients]=useState<Client[]>([]);
 const [progress,setProgress]=useState<Progress|null>(null);
 const [title,setTitle]=useState("");
 const [clientId,setClientId]=useState("");
 const [date,setDate]=useState(today());
 const [start,setStart]=useState("09:00");
 const [end,setEnd]=useState("09:30");
 const [money,setMoney]=useState(false);
 const [now,setNow]=useState(0);
 const [busy,setBusy]=useState("");
 const [feedback,setFeedback]=useState<Feedback|null>(null);
 const [createdId,setCreatedId]=useState("");

 const load=useCallback(async()=>{
  const [workResponse,summaryResponse]=await Promise.all([
   fetch("/api/work",{cache:"no-store"}),
   fetch("/api/system-summary",{cache:"no-store"}),
  ]);
  const [work,summary]=await Promise.all([
   workResponse.json().catch(()=>({ok:false,error:"invalid_response"})),
   summaryResponse.json().catch(()=>({ok:false,error:"invalid_response"})),
  ]);
  if(!workResponse.ok||!work.ok)throw new Error(friendlyError(work.error));
  if(!summaryResponse.ok||!summary.ok)throw new Error(friendlyError(summary.error));
  setItems(work.items||[]);
  setProgress(work.progress||null);
  setClients((summary.clients||[]).map((client:Client)=>({id:client.id,name:client.name})));
 },[]);

 useEffect(()=>{
  const initial=window.setTimeout(()=>{
   setNow(Date.now());
   void load().catch(error=>setFeedback({kind:"error",message:friendlyError(error instanceof Error?error.message:error)}));
  },0);
  const refresh=setInterval(()=>void load().catch(()=>undefined),30000);
  const clock=setInterval(()=>setNow(Date.now()),1000);
  return()=>{clearTimeout(initial);clearInterval(refresh);clearInterval(clock)};
 },[load]);

 const open=useMemo(()=>items.filter(item=>item.status!=="completed").sort((a,b)=>a.id===createdId?-1:b.id===createdId?1:0),[items,createdId]);
 const done=items.filter(item=>item.status==="completed");
 const active=items.find(item=>item.runningSession)?.runningSession||null;
 const activeWork=active?items.find(item=>item.id===active.gesture_id):null;
 const elapsed=active?Math.max(0,Math.floor((now-new Date(active.started_at).getTime())/1000)):0;
 const remaining=active?Math.max(0,active.planned_minutes*60-elapsed):0;
 const minimums=[progress?.body_minimum,progress?.mind_minimum,progress?.pocket_minimum].filter(Boolean).length;
 const label=useMemo(()=>new Date(`${today()}T12:00:00`).toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"}),[]);

 async function add(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!title.trim()||busy)return;
  const startsAt=new Date(`${date}T${start}:00`);
  const endsAt=new Date(`${date}T${end}:00`);
  if(Number.isNaN(startsAt.getTime())||Number.isNaN(endsAt.getTime())){
   setFeedback({kind:"error",message:friendlyError("invalid_schedule")});
   return;
  }
  if(endsAt<=startsAt){
   setFeedback({kind:"error",message:friendlyError("end_must_be_after_start")});
   return;
  }
  setBusy("add");setFeedback(null);
  try{
   const result=await post<{item:Work}>("/api/work",{action:"create",title:title.trim(),clientId:clientId||null,startsAt:startsAt.toISOString(),endsAt:endsAt.toISOString(),plannedMinutes:Math.round((endsAt.getTime()-startsAt.getTime())/60000),isMoney:money,priority:2});
   const selectedClient=clients.find(client=>client.id===clientId)||null;
   const created={...result.item,client:selectedClient,runningSession:null};
   setItems(current=>[created,...current.filter(item=>item.id!==created.id)]);
   setCreatedId(created.id);
   setTitle("");
   setFeedback({kind:"success",message:`Tarea creada y conectada al calendario: ${created.title}`});
   void load().catch(()=>undefined);
  }catch(error){
   setFeedback({kind:"error",message:friendlyError(error instanceof Error?error.message:error)});
  }finally{setBusy("")}
 }

 async function startTimer(id:string,minutes:number){
  if(busy)return;
  if(active&&active.gesture_id!==id){setFeedback({kind:"error",message:friendlyError("active_session_exists")});return}
  setBusy(`timer-${id}`);setFeedback(null);
  try{
   await post("/api/timer",{action:"start",gestureId:id,plannedMinutes:minutes});
   await load();
   setFeedback({kind:"success",message:`Foco iniciado por ${minutes} minutos.`});
  }catch(error){setFeedback({kind:"error",message:friendlyError(error instanceof Error?error.message:error)})}
  finally{setBusy("")}
 }

 async function stop(completeTask:boolean){
  if(!active||busy)return;
  setBusy("active-timer");setFeedback(null);
  try{
   await post("/api/timer",{action:completeTask?"complete":"stop",sessionId:active.id});
   await load();
   setFeedback({kind:"success",message:completeTask?"Tarea cerrada y tiempo registrado.":"Foco pausado y tiempo registrado."});
  }catch(error){setFeedback({kind:"error",message:friendlyError(error instanceof Error?error.message:error)})}
  finally{setBusy("")}
 }

 async function complete(id:string){
  if(busy)return;
  setBusy(`complete-${id}`);setFeedback(null);
  try{
   if(active?.gesture_id===id)await post("/api/timer",{action:"complete",sessionId:active.id});
   else await post("/api/work",{action:"complete",id});
   if(createdId===id)setCreatedId("");
   await load();
   setFeedback({kind:"success",message:"Tarea cerrada y sincronizada en Control Central."});
  }catch(error){setFeedback({kind:"error",message:friendlyError(error instanceof Error?error.message:error)})}
  finally{setBusy("")}
 }

 async function setMinimum(key:"body"|"mind"|"pocket",value:boolean){
  if(busy)return;
  setBusy(`minimum-${key}`);setFeedback(null);
  try{
   await post("/api/work",{action:"minimums",[key]:value});
   await load();
   setFeedback({kind:"success",message:value?"Mínimo marcado para hoy.":"Mínimo desmarcado para hoy."});
  }catch(error){setFeedback({kind:"error",message:friendlyError(error instanceof Error?error.message:error)})}
  finally{setBusy("")}
 }

 const fmt=(seconds:number)=>`${pad(Math.floor(seconds/60))}:${pad(seconds%60)}`;
 return <main className="pm"><LinkThemeController/><style>{css}</style><div className="pm-shell">
  <header className="pm-header"><div><Link href="/">← Control Central</Link><small>MISIÓN PERSONAL</small><h1>Hoy</h1><p>{label} · {open.length} pendientes · {done.length} cerradas</p></div><div className="pm-status"><b>{minimums}/3</b><span>mínimos</span></div></header>
  {active&&<section className="timer" aria-live="polite"><div><small>EN FOCO · {activeWork?.client?.name||"PERSONAL"}</small><b>{activeWork?.title}</b></div><strong>{fmt(remaining)}</strong><div><button disabled={!!busy} onClick={()=>stop(false)}>{busy==="active-timer"?"Guardando…":"Pausar"}</button><button disabled={!!busy} onClick={()=>stop(true)}>✓ Cerrar</button></div></section>}
  <section className="pm-panel create"><div className="pm-section-title"><h2>Nueva tarea</h2><span>fecha + horario</span></div><form className="create-grid" onSubmit={add}><input aria-label="Nombre de la nueva tarea" value={title} onChange={event=>setTitle(event.target.value)} placeholder="Qué debe quedar cerrado"/><select aria-label="Proyecto de la nueva tarea" value={clientId} onChange={event=>setClientId(event.target.value)}><option value="">PERSONAL</option>{clients.map(client=><option key={client.id} value={client.id}>{client.name}</option>)}</select><input aria-label="Fecha de la nueva tarea" type="date" value={date} onChange={event=>setDate(event.target.value)}/><input aria-label="Hora de inicio" type="time" value={start} onChange={event=>setStart(event.target.value)}/><input aria-label="Hora de término" type="time" value={end} onChange={event=>setEnd(event.target.value)}/><label><input type="checkbox" checked={money} onChange={event=>setMoney(event.target.checked)}/> Monetización</label><button type="submit" disabled={!!busy||!title.trim()}>{busy==="add"?"Añadiendo…":"＋ Añadir"}</button></form>{feedback&&<p className={`pm-feedback ${feedback.kind}`} role={feedback.kind==="error"?"alert":"status"} aria-live="polite">{feedback.kind==="success"?"✓ ":"! "}{feedback.message}</p>}</section>
  <section className="pm-panel"><div className="pm-section-title"><h2>Tareas</h2><span>{open.length}</span></div>{open.length?open.map((work,index)=><article className={`task ${index===0?"primary":""} ${work.id===createdId?"created":""}`} key={work.id}><button className="circle" disabled={!!busy} aria-label={`Cerrar tarea ${work.title}`} onClick={()=>complete(work.id)}>{busy===`complete-${work.id}`?"…":"○"}</button><div className="copy"><b>{work.title}</b><small>{work.client?.name||"PERSONAL"} · {work.starts_at?new Date(work.starts_at).toLocaleDateString("es-CL") :"Sin fecha"} · {work.starts_at?new Date(work.starts_at).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}):"--:--"} → {work.ends_at?new Date(work.ends_at).toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"}):"--:--"} · {Math.round((work.accumulated_seconds||0)/60)} min reales</small></div><div className="presets">{PRESETS.map(minutes=><button key={minutes} disabled={!!busy||!!active} aria-label={`Iniciar ${minutes} minutos para ${work.title}`} onClick={()=>startTimer(work.id,minutes)}>{busy===`timer-${work.id}`?"…":`▶ ${minutes}`}</button>)}</div></article>):<p className="pm-empty">No hay tareas pendientes. Crea la próxima misión arriba.</p>}</section>
  <section className="pm-panel"><div className="pm-section-title"><h2>Mínimos de hoy</h2><span>{minimums}/3</span></div><Minimum title="Cuerpo" detail="20 min de movimiento" checked={!!progress?.body_minimum} disabled={!!busy} set={value=>setMinimum("body",value)}/><Minimum title="Mente" detail="Una sola misión activa" checked={!!progress?.mind_minimum} disabled={!!busy} set={value=>setMinimum("mind",value)}/><Minimum title="Bolsillo" detail="1 movimiento comercial real" checked={!!progress?.pocket_minimum} disabled={!!busy} set={value=>setMinimum("pocket",value)}/></section>
  <section className="stats"><Stat label="Foco" value={`${Math.round((progress?.focused_seconds||0)/60)} min`}/><Stat label="Cierres" value={String(progress?.closures||0)}/><Stat label="Comercial" value={String(progress?.commercial_moves||0)}/></section>
 </div></main>
}

function Minimum({title,detail,checked,disabled,set}:{title:string;detail:string;checked:boolean;disabled:boolean;set:(value:boolean)=>void}){return <button className={`minimum ${checked?"on":""}`} disabled={disabled} aria-pressed={checked} onClick={()=>set(!checked)}><span>{checked?"✓":"○"}</span><div><b>{title}</b><small>{detail}</small></div><em>↻ Diario</em></button>}
function Stat({label,value}:{label:string;value:string}){return <div><small>{label}</small><b>{value}</b></div>}

const css=`.pm{min-height:100dvh;background:var(--link-bg);color:var(--link-text);padding:26px 18px 70px}.pm-shell{max-width:1040px;margin:auto}.pm-header{display:flex;justify-content:space-between;align-items:end;padding:8px 0 22px;border-bottom:1px solid var(--link-line)}.pm-header a{display:block;margin-bottom:24px;color:var(--link-muted);text-decoration:none;font-size:12px}.pm-header small{font-size:9px;letter-spacing:.18em;color:var(--link-faint)}.pm-header h1{font-size:48px;letter-spacing:-.05em;margin:6px 0}.pm-header p{margin:0;color:var(--link-muted);font-size:13px;text-transform:capitalize}.pm-status,.pm-panel,.stats>div{background:var(--link-surface);border:1px solid var(--link-line);border-radius:16px;box-shadow:var(--link-shadow)}.pm-status{padding:12px 18px;text-align:center}.pm-status b{display:block;font-size:20px}.pm-status span{font-size:10px;color:var(--link-muted)}.pm-panel{padding:6px 16px;margin-top:12px}.pm-section-title{height:48px;display:flex;align-items:center;gap:8px}.pm-section-title h2{font-size:17px;margin:0}.pm-section-title span{font-size:10px;color:var(--link-muted);background:var(--link-surface-2);padding:5px 8px;border-radius:999px}.create-grid{display:grid;grid-template-columns:minmax(220px,2fr) minmax(140px,1fr) 140px 110px 110px 130px auto;gap:7px;padding:0 0 12px}.create-grid input,.create-grid select{min-width:0;border:1px solid var(--link-line);background:var(--link-surface-2);color:var(--link-text);border-radius:9px;padding:9px;font-size:11px}.create-grid label{display:flex;gap:6px;align-items:center;font-size:10px}.create-grid>button{border:0;border-radius:9px;background:var(--link-accent);color:var(--link-accent-text);padding:9px 12px}.pm-feedback{margin:0 0 12px;padding:10px 12px;border-radius:9px;font-size:11px;font-weight:650}.pm-feedback.success{color:var(--link-green);background:color-mix(in srgb,var(--link-green) 10%,transparent);border:1px solid color-mix(in srgb,var(--link-green) 28%,transparent)}.pm-feedback.error{color:#b9443e;background:rgba(185,68,62,.09);border:1px solid rgba(185,68,62,.25)}.task{display:grid;grid-template-columns:28px minmax(0,1fr) auto;gap:8px;align-items:center;min-height:68px;border-top:1px solid var(--link-soft)}.task.primary{background:var(--link-surface-2);margin:0 -8px;padding:0 8px;border-radius:10px}.task.created{outline:2px solid color-mix(in srgb,var(--link-green) 45%,transparent);outline-offset:-2px}.circle{border:0;background:transparent;color:var(--link-muted);font-size:22px}.copy{display:flex;flex-direction:column;gap:4px}.copy b{font-size:13px}.copy small{font-size:10px;color:var(--link-muted)}.presets{display:flex;gap:4px}.presets button{border:1px solid var(--link-line);background:var(--link-surface-2);color:var(--link-text);border-radius:7px;padding:6px;font-size:9px}.pm-empty{padding:6px 0 16px;color:var(--link-muted);font-size:12px}.minimum{width:100%;border:0;border-top:1px solid var(--link-soft);background:transparent;color:var(--link-text);display:grid;grid-template-columns:28px 1fr auto;align-items:center;text-align:left;padding:11px 0}.minimum>div{display:flex;flex-direction:column}.minimum b{font-size:12px}.minimum small,.minimum em{font-size:10px;color:var(--link-muted);font-style:normal}.minimum.on>span{color:var(--link-green)}button:disabled{cursor:not-allowed;opacity:.5}.timer{position:sticky;top:10px;z-index:30;background:var(--link-accent);color:var(--link-accent-text);border-radius:14px;padding:11px 14px;margin-top:12px;display:grid;grid-template-columns:1fr auto auto;gap:14px;align-items:center;box-shadow:0 12px 30px rgba(0,0,0,.18)}.timer>div:first-child{display:flex;flex-direction:column}.timer small{font-size:8px;letter-spacing:.14em;opacity:.7}.timer strong{font-size:28px}.timer button{border:1px solid rgba(255,255,255,.25);background:transparent;color:inherit;border-radius:8px;padding:7px 9px;margin-left:5px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}.stats>div{padding:14px}.stats small{display:block;color:var(--link-muted);font-size:10px}.stats b{font-size:22px}@media(max-width:900px){.create-grid{grid-template-columns:1fr 1fr 1fr}.create-grid>button{grid-column:1/-1}.task{grid-template-columns:28px 1fr}.presets{grid-column:2;flex-wrap:wrap}}@media(max-width:600px){.pm{padding:18px 12px 60px}.pm-header h1{font-size:38px}.create-grid{grid-template-columns:1fr 1fr}.create-grid input:first-child,.create-grid select,.create-grid>button{grid-column:1/-1}.timer{grid-template-columns:1fr auto}.timer>div:last-child{grid-column:1/-1}.stats{grid-template-columns:1fr 1fr 1fr}.presets button{min-height:34px;flex:1}.task{padding:8px 0}.copy small{line-height:1.4}}`;
