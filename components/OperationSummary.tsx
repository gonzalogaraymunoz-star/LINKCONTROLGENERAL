"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type SummaryData = {
  counts: { active: number; today: number; financial: number; waiting: number };
  tasks: Array<{
    id: string;
    title: string;
    business_name?: string | null;
    business_color?: string | null;
    due_at?: string | null;
    priority: number;
    workflow_state: string;
  }>;
};

export default function OperationSummary() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/operational-board", { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "No se pudo cargar Operación");
        setData(json);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const next = (data?.tasks || [])
    .filter((task) => !["resolved", "financially_closed"].includes(task.workflow_state))
    .sort((a, b) => {
      if (a.due_at && b.due_at) return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      if (a.due_at) return -1;
      if (b.due_at) return 1;
      return a.priority - b.priority;
    })
    .slice(0, 3);

  return (
    <main style={styles.page}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}><span style={styles.mark} /><b>LINK CONTROL<br/>CENTRAL</b></div>
        <nav style={styles.nav}>
          <Link href="/" style={styles.link}>Inicio</Link>
          <Link href="/operacion" style={{...styles.link,...styles.active}}>Operación</Link>
          <Link href="/mision-personal" style={styles.link}>Misión personal</Link>
        </nav>
      </aside>

      <section style={styles.main}>
        <header style={styles.header}>
          <div>
            <small style={styles.eyebrow}>OPERACIÓN</small>
            <h1 style={styles.h1}>Lo que necesita pasar.</h1>
            <p style={styles.sub}>Resumen mínimo de LINK WORLD antes de entrar a trabajar.</p>
          </div>
          <Link href="/operacion/pizarra" style={styles.openButton}>Abrir pizarra operativa →</Link>
        </header>

        {error ? <div style={styles.error}>{error}</div> : null}

        <div style={styles.metrics}>
          <Metric label="Gestos activos" value={data?.counts.active ?? 0} />
          <Metric label="Hoy" value={data?.counts.today ?? 0} />
          <Metric label="Finanzas" value={data?.counts.financial ?? 0} />
          <Metric label="Esperando" value={data?.counts.waiting ?? 0} />
        </div>

        <section style={styles.next}>
          <div style={styles.sectionTitle}><small style={styles.eyebrow}>SIGUIENTE</small><span>{next.length}</span></div>
          {next.length ? next.map((task) => (
            <article key={task.id} style={{...styles.row,borderLeftColor:task.business_color || "#d6d4cd"}}>
              <div>
                <b style={styles.rowTitle}>{task.title}</b>
                <small style={styles.rowMeta}>{task.business_name || "Sin negocio"} · {stateLabel(task.workflow_state)}</small>
              </div>
              <time style={styles.time}>{task.due_at ? format(task.due_at) : "Sin fecha"}</time>
            </article>
          )) : <div style={styles.empty}>No hay gestos activos con los filtros actuales.</div>}
        </section>
      </section>
    </main>
  );
}

function Metric({label,value}:{label:string;value:number}) {
  return <div style={styles.metric}><strong>{String(value).padStart(2,"0")}</strong><small>{label}</small></div>;
}
function stateLabel(value:string) {
  const map:Record<string,string>={inbox:"Entrada",to_resolve:"Por resolver",scheduled:"Programado",in_progress:"En curso",waiting:"Esperando respuesta",resolved:"Resuelto",financially_closed:"Cerrado financiero"};
  return map[value] || value;
}
function format(value:string) {
  return new Date(value).toLocaleString("es-CL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
}

const styles:Record<string,React.CSSProperties>={
  page:{minHeight:"100vh",display:"grid",gridTemplateColumns:"190px 1fr",background:"#f5f4f0",color:"#1f1f1d",fontFamily:'Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",Arial,sans-serif'},
  sidebar:{borderRight:"1px solid #dddcd5",padding:"24px 12px",background:"#faf9f6"},
  brand:{display:"flex",alignItems:"center",gap:10,fontSize:9,letterSpacing:2,lineHeight:1.35},
  mark:{width:24,height:24,border:"1px solid #222",borderRadius:"50%",display:"block"},
  nav:{display:"grid",gap:4,marginTop:34},
  link:{padding:"10px 12px",borderRadius:11,textDecoration:"none",color:"#6e6d67",fontSize:11},
  active:{background:"#e9e8e3",color:"#20201e",fontWeight:650},
  main:{padding:"62px clamp(24px,5vw,72px)",maxWidth:1180,width:"100%",margin:"0 auto"},
  header:{display:"flex",justifyContent:"space-between",alignItems:"end",gap:24,paddingBottom:28,borderBottom:"1px solid #dddcd5"},
  eyebrow:{fontSize:8,letterSpacing:1.7,color:"#9a9992"},
  h1:{fontSize:"clamp(34px,5vw,62px)",lineHeight:.95,letterSpacing:"-.055em",margin:"8px 0 10px",fontWeight:560},
  sub:{margin:0,color:"#76756e",fontSize:12},
  openButton:{background:"#20201e",color:"#fff",textDecoration:"none",padding:"12px 16px",borderRadius:999,fontSize:11,fontWeight:650,whiteSpace:"nowrap"},
  metrics:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",borderBottom:"1px solid #dddcd5"},
  metric:{padding:"22px 16px 18px 0"},
  metricStrong:{},
  next:{marginTop:28},
  sectionTitle:{display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:8,borderBottom:"1px solid #dddcd5"},
  row:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:18,borderBottom:"1px solid #e5e4de",borderLeft:"3px solid transparent",padding:"14px 12px"},
  rowTitle:{display:"block",fontSize:12},
  rowMeta:{display:"block",fontSize:9,color:"#88877f",marginTop:4},
  time:{fontSize:9,color:"#77766f"},
  empty:{padding:"24px 10px",fontSize:10,color:"#8f8e87"},
  error:{marginTop:16,padding:12,border:"1px solid #e2c9c2",background:"#f5e9e6",borderRadius:10,fontSize:10,color:"#7d4d44"}
};
