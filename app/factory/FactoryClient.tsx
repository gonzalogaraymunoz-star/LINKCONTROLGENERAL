"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import "./factory.css";

type LinkItem={id:string;provider:string;link_type:string;label:string;url:string;status:string};
type BusinessItem={business_key:string;business_name:string;relation_role:string};
type Product={id:string;name:string;slug:string;product_type:string;description?:string|null;status:string;preview_url?:string|null;production_url?:string|null;links:LinkItem[];businesses:BusinessItem[];asset_count:number;memory_count:number};
type View="preview"|"library"|"businesses"|"memory";
const providers=["chatgpt","drive","github","vercel","supabase","control_central","external"];

export default function FactoryClient(){
 const [products,setProducts]=useState<Product[]>([]);
 const [activeId,setActiveId]=useState<string|null>(null);
 const [view,setView]=useState<View>("library");
 const [loading,setLoading]=useState(true);
 const [notice,setNotice]=useState("");
 const [modal,setModal]=useState<"product"|"link"|"business"|"memory"|null>(null);
 const [device,setDevice]=useState<"desktop"|"mobile">("desktop");
 const active=useMemo(()=>products.find(p=>p.id===activeId)??products[0]??null,[products,activeId]);
 const businesses=useMemo(()=>{const map=new Map<string,BusinessItem>();for(const p of products)for(const b of p.businesses)map.set(b.business_key,b);return [...map.values()]},[products]);
 const preview=active?.links.find(l=>l.provider==="vercel"&&l.status==="verified"&&(l.link_type.includes("preview")||l.link_type.includes("production")))?.url||active?.preview_url||active?.production_url||null;

 async function reload(){setLoading(true);try{const r=await fetch("/api/factory",{cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.error||"No se pudo cargar Factory");setProducts(j.products||[]);if(!activeId&&j.products?.[0])setActiveId(j.products[0].id)}catch(e){setNotice(e instanceof Error?e.message:"Error")}finally{setLoading(false)}}
 useEffect(()=>{void reload()},[]);
 async function post(payload:Record<string,unknown>){setNotice("");const r=await fetch("/api/factory",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});const j=await r.json();if(!r.ok){setNotice(j.error||"Error");return false}await reload();return true}
 async function submit(e:FormEvent<HTMLFormElement>,kind:string){e.preventDefault();const f=new FormData(e.currentTarget);const data=Object.fromEntries(f.entries());const ok=await post({action:kind,...data,...(active?{product_id:active.id}:{})});if(ok){setModal(null);e.currentTarget.reset()}}

 const nav:[View,string,string][]=[["preview","◫","Preview"],["library","⌗","Biblioteca"],["businesses","◉","Negocios"],["memory","⌘","Memoria"]];
 return <div className="factory-shell">
  <aside className="factory-rail"><div className="factory-logo">LF</div>{nav.map(([k,i,l])=><button key={k} className={view===k?"active":""} onClick={()=>setView(k)}><span>{i}</span><small>{l}</small></button>)}</aside>
  <main className="factory-main">
   <header className="factory-top"><div><b>LINK Factory</b><span>Creative Operating System</span></div><div className="top-actions"><button onClick={()=>setModal("product")}>＋ Crear producto</button></div></header>
   {notice&&<div className="notice">{notice}</div>}
   <section className="factory-page">
    {loading?<div className="empty">Cargando biblioteca real…</div>:products.length===0?<div className="empty-state"><span>Biblioteca vacía</span><h1>No hay productos fake.</h1><p>Crea la primera ficha. Ningún link se mostrará conectado hasta que exista y pase verificación.</p><button onClick={()=>setModal("product")}>Crear primer producto</button></div>:<>
     {view==="library"&&<><Hero n="01" title={<>Productos,<br/>no carpetas.</>} text="Cada ficha une un producto gráfico con sus negocios, memoria y enlaces reales al ecosistema."/><div className="product-grid">{products.map(p=><button key={p.id} className={`product-card ${active?.id===p.id?"selected":""}`} onClick={()=>{setActiveId(p.id);setView("preview")}}><div className="product-cover"><span>{p.product_type}</span><h2>{p.name}</h2></div><div className="product-meta"><b>{p.name}</b><span>{p.links.length} links · {p.businesses.length} negocios · {p.memory_count} memorias</span></div></button>)}</div></>}
     {view==="preview"&&active&&<><Hero n="02" title={active.name} text={active.description||"Sin descripción todavía."}/><div className="preview-layout"><div className="browser"><div className="browser-bar"><span>←</span><span>→</span><span>↻</span><div className="address">{preview||"Sin preview conectada"}</div><button className={device==="desktop"?"active":""} onClick={()=>setDevice("desktop")}>Desktop</button><button className={device==="mobile"?"active":""} onClick={()=>setDevice("mobile")}>Mobile</button></div><div className="browser-stage">{preview?<iframe src={preview} title={active.name} className={device==="mobile"?"mobile":""}/>:<div className="no-preview"><b>Preview no conectada</b><span>Conecta un deployment real de Vercel y verifícalo.</span><button onClick={()=>setModal("link")}>＋ Conectar preview</button></div>}</div></div><aside className="detail-stack"><Card title="Estado"><h3>{active.status}</h3><div className="chips"><span>{active.product_type}</span><span>{active.businesses.length} negocios</span></div></Card><Card title="Biblioteca de links" add={()=>setModal("link")}>{active.links.length?active.links.map(l=><div className="link-row" key={l.id}><div><b>{l.label}</b><span>{l.provider} · {l.status}</span></div>{l.status==="verified"?<a href={l.url} target="_blank" rel="noreferrer">Abrir ↗</a>:<button onClick={()=>post({action:"verify_link",link_id:l.id})}>Verificar</button>}</div>):<p>Sin links.</p>}</Card><Card title="Negocios relacionados" add={()=>setModal("business")}>{active.businesses.length?active.businesses.map(b=><div className="link-row" key={b.business_key+b.relation_role}><div><b>{b.business_name}</b><span>{b.relation_role}</span></div></div>):<p>Sin negocios asociados.</p>}</Card><Card title="Memoria" add={()=>setModal("memory")}><h3>{active.memory_count} registros</h3><p>Se guardan contexto y referencias, no copias innecesarias.</p></Card></aside></div></>}
     {view==="businesses"&&<><Hero n="03" title={<>Relaciones<br/>reales.</>} text="Un producto puede servir a varios negocios y un negocio puede tener muchos productos."/><div className="business-grid">{businesses.length?businesses.map(b=><div className="business-card" key={b.business_key}><small>{b.relation_role}</small><h2>{b.business_name}</h2><span>{products.filter(p=>p.businesses.some(x=>x.business_key===b.business_key)).length} productos asociados</span></div>):<div className="empty">Aún no hay negocios asociados.</div>}</div></>}
     {view==="memory"&&<><Hero n="04" title={<>Todo queda<br/>ligado.</>} text="Supabase muestra solamente memoria, activos y links que existen de verdad."/><div className="memory-grid">{products.map(p=><div className="memory-card" key={p.id}><small>{p.product_type}</small><h2>{p.name}</h2><div><b>{p.memory_count}</b><span> memorias</span></div><div><b>{p.asset_count}</b><span> activos</span></div><div><b>{p.links.filter(l=>l.status==="verified").length}</b><span> links verificados</span></div></div>)}</div></>}
    </>}
   </section>
  </main>
  {modal==="product"&&<Modal title="Crear producto" close={()=>setModal(null)}><form onSubmit={e=>submit(e,"create_product")}><input name="name" placeholder="Nombre" required/><select name="product_type" defaultValue="website"><option value="website">Website</option><option value="app">App</option><option value="campaign">Campaña</option><option value="catalog">Catálogo</option><option value="graphic">Producto gráfico</option></select><textarea name="description" placeholder="Descripción"/><button className="submit">Crear ficha</button></form></Modal>}
  {modal==="link"&&active&&<Modal title="Conectar link" close={()=>setModal(null)}><form onSubmit={e=>submit(e,"add_link")}><select name="provider">{providers.map(p=><option key={p}>{p}</option>)}</select><input name="link_type" placeholder="project / drive_folder / repo / preview…" required/><input name="label" placeholder="Etiqueta" required/><input name="url" type="url" placeholder="https://…" required/><p className="form-note">Ley anti-fake: queda unverified hasta comprobar el destino.</p><button className="submit">Guardar link</button></form></Modal>}
  {modal==="business"&&active&&<Modal title="Asociar negocio" close={()=>setModal(null)}><form onSubmit={e=>submit(e,"add_business")}><input name="business_name" placeholder="Nombre del negocio" required/><select name="relation_role"><option value="owner">Principal</option><option value="channel">Canal</option><option value="producer">Productor</option><option value="partner">Partner</option></select><button className="submit">Asociar</button></form></Modal>}
  {modal==="memory"&&active&&<Modal title="Añadir memoria" close={()=>setModal(null)}><form onSubmit={e=>submit(e,"add_memory")}><input name="title" placeholder="Título" required/><select name="memory_type"><option value="context">Contexto</option><option value="decision">Decisión</option><option value="brief">Brief</option><option value="learning">Aprendizaje</option></select><textarea name="summary" placeholder="Resumen"/><input name="source_url" type="url" placeholder="Fuente opcional https://…"/><button className="submit">Registrar memoria</button></form></Modal>}
 </div>
}

function Hero({n,title,text}:{n:string;title:ReactNode;text:string}){return <div className="hero"><div><small>{n} / LINK Factory</small><h1>{title}</h1></div><p>{text}</p></div>}
function Card({title,add,children}:{title:string;add?:()=>void;children:ReactNode}){return <div className="detail-card"><div className="card-head"><small>{title}</small>{add&&<button onClick={add}>＋</button>}</div>{children}</div>}
function Modal({title,close,children}:{title:string;close:()=>void;children:ReactNode}){return <div className="modal-backdrop" onMouseDown={e=>{if(e.currentTarget===e.target)close()}}><div className="modal"><div className="modal-head"><h3>{title}</h3><button onClick={close}>×</button></div>{children}</div></div>}
