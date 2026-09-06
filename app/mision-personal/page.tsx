"use client";

import { useEffect, useState } from "react";

type State={date:string;mission:string;body:boolean;mind:boolean;pocket:boolean;money:boolean;note:string};
const key="cc-personal-mission";
const fresh=():State=>({date:new Date().toISOString().slice(0,10),mission:"Cerrar una pieza concreta del ecosistema",body:false,mind:false,pocket:false,money:false,note:""});

export default function PersonalMission(){
 const [s,setS]=useState<State>(fresh());
 useEffect(()=>{const raw=localStorage.getItem(key);if(raw){try{const p=JSON.parse(raw);if(p.date===fresh().date)setS(p)}catch{}}},[]);
 useEffect(()=>{localStorage.setItem(key,JSON.stringify(s))},[s]);
 const set=(v:Partial<State>)=>setS(x=>({...x,...v}));
 const score=[s.body,s.mind,s.pocket].filter(Boolean).length;
 return <main className="pm"><style jsx global>{css}</style>
  <header><div><a href="/">← CONTROL CENTRAL</a><small>MÓDULO PERSONAL · {s.date}</small><h1>Misión Personal</h1><p>Cerrar + vender + no abrir.</p></div><button onClick={()=>setS(fresh())}>Nuevo día</button></header>
  <section className="grid">
   <article className="hero"><small>MISIÓN PRINCIPAL</small><textarea value={s.mission} onChange={e=>set({mission:e.target.value})}/><p>Una sola pieza concreta del ecosistema que debe quedar cerrada hoy.</p></article>
   <article><small>MIS 3 MÍNIMOS</small><Check label="CUERPO · moverme y recuperar energía" checked={s.body} onChange={v=>set({body:v})}/><Check label="MENTE · decidir qué cierro y no abrir frentes" checked={s.mind} onChange={v=>set({mind:v})}/><Check label="BOLSILLO · ejecutar un movimiento comercial real" checked={s.pocket} onChange={v=>set({pocket:v})}/><b className="score">{score}/3 mínimos</b></article>
   <article><small>MONETIZACIÓN</small><h2>Una persona más cerca de pagar.</h2><p>Propuesta, seguimiento, demo, llamada o link de pago. No cuenta “trabajar en vender”. Tiene que existir un movimiento comercial observable.</p><Check label="Movimiento de dinero ejecutado" checked={s.money} onChange={v=>set({money:v})}/></article>
   <article><small>CIERRE DEL DÍA</small><h2>{score===3&&s.money?"Día sostenido ✓":"Día en curso"}</h2><textarea className="note" placeholder="Qué cerré, qué vendí y qué reduzco mañana…" value={s.note} onChange={e=>set({note:e.target.value})}/><div className="rule">Si algo falla: reducir antes de abandonar. No volver a cero.</div></article>
  </section>
 </main>
}

function Check({label,checked,onChange}:{label:string;checked:boolean;onChange:(v:boolean)=>void}){return <label className={checked?"check done":"check"}><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)}/><span>{label}</span></label>}

const css=`*{box-sizing:border-box}html,body{margin:0;background:#f3f2ee;color:#1d1d1b;font-family:Arial,sans-serif}.pm{min-height:100dvh;padding:28px 18px 70px}.pm header,.grid{max-width:1100px;margin:auto}.pm header{display:flex;justify-content:space-between;gap:20px;align-items:end;margin-bottom:22px}.pm header a{display:block;color:#777;text-decoration:none;font-size:11px;letter-spacing:.12em;margin-bottom:18px}.pm small{font-size:10px;letter-spacing:.16em;color:#777}.pm h1{font-size:clamp(40px,6vw,66px);font-weight:500;letter-spacing:-.05em;margin:6px 0}.pm header p{margin:0;color:#666}.pm button{border:1px solid #222;background:#222;color:#fff;border-radius:8px;padding:12px 15px}.grid{display:grid;grid-template-columns:1.15fr .85fr;gap:15px}.grid article{background:#fff;border:1px solid #dedcd5;border-radius:12px;padding:28px}.hero textarea{width:100%;border:0;border-bottom:1px solid #ddd;background:transparent;resize:vertical;min-height:100px;font:500 34px/1.15 Arial;letter-spacing:-.03em;padding:15px 0;outline:none}.grid p{font-size:14px;line-height:1.6;color:#666}.grid h2{font-size:26px;font-weight:500;letter-spacing:-.03em}.check{display:flex;gap:11px;align-items:center;border-top:1px solid #e6e4de;padding:17px 0;font-size:13px}.check input{width:20px;height:20px;accent-color:#222}.check.done{opacity:.5}.score{display:block;margin-top:15px;font-size:24px;font-weight:500}.note{width:100%;min-height:120px;border:1px solid #ddd;border-radius:8px;padding:13px;resize:vertical;font:14px Arial}.rule{margin-top:13px;background:#222;color:#fff;border-radius:8px;padding:14px;text-align:center;font-size:12px}@media(max-width:760px){.pm header{align-items:start}.pm h1{font-size:43px}.grid{grid-template-columns:1fr}.grid article{padding:22px 18px}.hero textarea{font-size:26px}.pm button{font-size:11px}}`;
