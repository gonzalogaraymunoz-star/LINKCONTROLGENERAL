import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const ROOT_CONTROL_ID="00000000-0000-0000-0000-000000000001";
const TZ="America/Santiago";
const localDate=()=>new Intl.DateTimeFormat("en-CA",{timeZone:TZ,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());

export async function GET(){
  const supabase=getCentralSupabase();
  if(!supabase)return NextResponse.json({ok:false,error:"central_supabase_not_configured"},{status:503});
  const {data,error}=await supabase.from("work_sessions").select("id,gesture_id,started_at,ended_at,elapsed_seconds,planned_minutes,status,note,outcome").eq("status","running").order("started_at",{ascending:false});
  if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
  return NextResponse.json({ok:true,sessions:data||[]});
}

export async function POST(request:Request){
  const supabase=getCentralSupabase();
  if(!supabase)return NextResponse.json({ok:false,error:"central_supabase_not_configured"},{status:503});
  const body=await request.json().catch(()=>null); if(!body)return NextResponse.json({ok:false,error:"invalid_body"},{status:400});
  const action=String(body.action||"");

  if(action==="start"){
    const gestureId=String(body.gestureId||""); if(!gestureId)return NextResponse.json({ok:false,error:"gestureId_required"},{status:400});
    const {data:g,error:ge}=await supabase.from("client_gestures").select("id,control_id,status,actual_started_at,planned_minutes").eq("id",gestureId).single();
    if(ge||!g)return NextResponse.json({ok:false,error:"work_not_found"},{status:404});
    const existing=await supabase.from("work_sessions").select("id").eq("gesture_id",gestureId).eq("status","running").maybeSingle();
    if(existing.data)return NextResponse.json({ok:true,session:existing.data,alreadyRunning:true});
    const planned=Number(body.plannedMinutes||g.planned_minutes||30);
    const now=new Date().toISOString();
    const {data,error}=await supabase.from("work_sessions").insert({control_id:g.control_id||ROOT_CONTROL_ID,gesture_id:gestureId,planned_minutes:planned,status:"running",started_at:now}).select("*").single();
    if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
    await supabase.from("client_gestures").update({status:"scheduled",actual_started_at:g.actual_started_at||now,planned_minutes:planned,updated_at:now}).eq("id",gestureId);
    return NextResponse.json({ok:true,session:data});
  }

  if(action==="stop"||action==="complete"){
    const sessionId=String(body.sessionId||""); if(!sessionId)return NextResponse.json({ok:false,error:"sessionId_required"},{status:400});
    const {data:s,error:se}=await supabase.from("work_sessions").select("*").eq("id",sessionId).single();
    if(se||!s)return NextResponse.json({ok:false,error:"session_not_found"},{status:404});
    const ended=new Date(); const elapsed=Math.max(0,Math.round((ended.getTime()-new Date(s.started_at).getTime())/1000));
    const {data:session,error}=await supabase.from("work_sessions").update({ended_at:ended.toISOString(),elapsed_seconds:elapsed,status:"completed",note:body.note||s.note||null,outcome:body.outcome||s.outcome||null,updated_at:ended.toISOString()}).eq("id",sessionId).select("*").single();
    if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
    const {data:g}=await supabase.from("client_gestures").select("id,accumulated_seconds,is_money,status").eq("id",s.gesture_id).single();
    if(g){
      const patch:any={accumulated_seconds:Number(g.accumulated_seconds||0)+elapsed,updated_at:ended.toISOString()};
      if(action==="complete"){patch.status="completed";patch.actual_completed_at=ended.toISOString();patch.outcome=body.outcome||null;}
      else patch.status="planned";
      await supabase.from("client_gestures").update(patch).eq("id",s.gesture_id);
      const day=localDate();
      const {data:p}=await supabase.from("daily_progress").select("*").eq("control_id",ROOT_CONTROL_ID).eq("progress_date",day).maybeSingle();
      await supabase.from("daily_progress").upsert({control_id:ROOT_CONTROL_ID,progress_date:day,focused_seconds:Number(p?.focused_seconds||0)+elapsed,tasks_completed:Number(p?.tasks_completed||0)+(action==="complete"?1:0),closures:Number(p?.closures||0)+(action==="complete"?1:0),commercial_moves:Number(p?.commercial_moves||0)+(action==="complete"&&g.is_money?1:0),updated_at:ended.toISOString()},{onConflict:"control_id,progress_date"});
    }
    return NextResponse.json({ok:true,session,completed:action==="complete"});
  }

  return NextResponse.json({ok:false,error:"unknown_action"},{status:400});
}
