import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID="00000000-0000-0000-0000-000000000001";
const TZ="America/Santiago";

function localDate(d=new Date()){
  return new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
}

export async function GET(request:Request){
  const supabase=getCentralSupabase();
  if(!supabase)return NextResponse.json({ok:false,error:"central_supabase_not_configured"},{status:503});
  const url=new URL(request.url);
  const attention=url.searchParams.get("attention")==="1";
  const [{data:gestures,error},{data:sessions},{data:clients},{data:progress}]=await Promise.all([
    supabase.from("client_gestures").select("id,control_id,client_id,title,description,gesture_type,status,starts_at,ends_at,timezone,priority,source,metadata,scope,planned_minutes,actual_started_at,actual_completed_at,accumulated_seconds,outcome,is_money,sort_order,created_at,updated_at").neq("status","cancelled").order("starts_at",{ascending:true,nullsFirst:false}),
    supabase.from("work_sessions").select("id,gesture_id,started_at,ended_at,elapsed_seconds,planned_minutes,status,note,outcome,created_at").order("started_at",{ascending:false}).limit(200),
    supabase.from("clients").select("id,name,slug,accent,status").eq("status","active"),
    supabase.from("daily_progress").select("*").eq("progress_date",localDate()).maybeSingle(),
  ]);
  if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
  const cmap=Object.fromEntries((clients||[]).map((c:any)=>[c.id,c]));
  const now=Date.now();
  const rows=(gestures||[]).map((g:any)=>{
    const gs=(sessions||[]).filter((s:any)=>s.gesture_id===g.id);
    const running=gs.find((s:any)=>s.status==="running")||null;
    const state=g.status==="completed"?"closed":g.ends_at&&new Date(g.ends_at).getTime()<now?"overdue":g.starts_at&&new Date(g.starts_at).toLocaleDateString("en-CA",{timeZone:TZ})===localDate()?"today":g.starts_at&&new Date(g.starts_at).getTime()<now+86400000?"soon":"upcoming";
    return {...g,client:cmap[g.client_id]||null,attentionState:state,runningSession:running,sessionCount:gs.length};
  });
  const filtered=attention?rows.filter((g:any)=>["overdue","today","soon"].includes(g.attentionState)&&g.status!=="completed"):rows;
  return NextResponse.json({ok:true,date:localDate(),items:filtered,progress:progress||null});
}

export async function POST(request:Request){
  const supabase=getCentralSupabase();
  if(!supabase)return NextResponse.json({ok:false,error:"central_supabase_not_configured"},{status:503});
  const body=await request.json().catch(()=>null);
  if(!body)return NextResponse.json({ok:false,error:"invalid_body"},{status:400});
  const action=String(body.action||"create");

  if(action==="create"){
    const title=String(body.title||"").trim();
    if(!title)return NextResponse.json({ok:false,error:"title_required"},{status:400});
    let client:any=null, workspace:any=null;
    if(body.clientId){
      const r=await supabase.from("clients").select("id,control_id,name").eq("id",body.clientId).single();
      if(r.error||!r.data)return NextResponse.json({ok:false,error:"client_not_found"},{status:404});
      client=r.data;
      const w=await supabase.from("client_calendar_workspaces").select("id,status,google_calendar_id,timezone").eq("client_id",client.id).maybeSingle();workspace=w.data;
    }
    const start=body.startsAt?new Date(body.startsAt):null;
    const end=body.endsAt?new Date(body.endsAt):start?new Date(start.getTime()+Number(body.plannedMinutes||30)*60000):null;
    const {data,error}=await supabase.from("client_gestures").insert({
      control_id:client?.control_id||ROOT_CONTROL_ID,client_id:client?.id||null,calendar_workspace_id:workspace?.id||null,
      title,description:body.description||null,gesture_type:"task",status:"planned",starts_at:start?.toISOString()||null,ends_at:end?.toISOString()||null,
      timezone:workspace?.timezone||TZ,source:body.source||"control_central",priority:Number(body.priority||2),scope:client?"client":"personal",
      planned_minutes:Number(body.plannedMinutes||30),is_money:Boolean(body.isMoney),sync_status:workspace?.status==="connected"&&workspace.google_calendar_id?"pending_sync":"pending_calendar_connection",
      metadata:{created_from:"unified_work",client_name:client?.name||null,...(body.metadata||{})}
    }).select("*").single();
    if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true,item:data},{status:201});
  }

  if(action==="update"||action==="complete"){
    const id=String(body.id||""); if(!id)return NextResponse.json({ok:false,error:"id_required"},{status:400});
    const patch:any={updated_at:new Date().toISOString()};
    if(body.title!==undefined)patch.title=String(body.title).trim();
    if(body.description!==undefined)patch.description=body.description||null;
    if(body.startsAt!==undefined)patch.starts_at=body.startsAt?new Date(body.startsAt).toISOString():null;
    if(body.endsAt!==undefined)patch.ends_at=body.endsAt?new Date(body.endsAt).toISOString():null;
    if(body.priority!==undefined)patch.priority=Number(body.priority);
    if(body.plannedMinutes!==undefined)patch.planned_minutes=Number(body.plannedMinutes);
    if(body.status!==undefined)patch.status=body.status;
    if(body.outcome!==undefined)patch.outcome=body.outcome||null;
    if(action==="complete"){patch.status="completed";patch.actual_completed_at=new Date().toISOString();}
    const {data,error}=await supabase.from("client_gestures").update(patch).eq("id",id).select("*").single();
    if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
    if(action==="complete"){
      const day=localDate();
      const {data:p}=await supabase.from("daily_progress").select("*").eq("control_id",ROOT_CONTROL_ID).eq("progress_date",day).maybeSingle();
      const values={control_id:ROOT_CONTROL_ID,progress_date:day,tasks_completed:Number(p?.tasks_completed||0)+1,closures:Number(p?.closures||0)+1,commercial_moves:Number(p?.commercial_moves||0)+(data.is_money?1:0),updated_at:new Date().toISOString()};
      await supabase.from("daily_progress").upsert(values,{onConflict:"control_id,progress_date"});
    }
    return NextResponse.json({ok:true,item:data});
  }

  if(action==="minimums"){
    const day=localDate();
    const patch:any={control_id:ROOT_CONTROL_ID,progress_date:day,updated_at:new Date().toISOString()};
    if(body.body!==undefined)patch.body_minimum=Boolean(body.body);
    if(body.mind!==undefined)patch.mind_minimum=Boolean(body.mind);
    if(body.pocket!==undefined)patch.pocket_minimum=Boolean(body.pocket);
    if(body.notes!==undefined)patch.notes=body.notes||null;
    const {data,error}=await supabase.from("daily_progress").upsert(patch,{onConflict:"control_id,progress_date"}).select("*").single();
    if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
    return NextResponse.json({ok:true,progress:data});
  }

  return NextResponse.json({ok:false,error:"unknown_action"},{status:400});
}
