import { NextRequest, NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

const BUSINESS_ID="216a46d9-86df-4906-a226-7b8a188751ab";
const CONTROL_ID="00000000-0000-0000-0000-000000000001";
const PROJECT_ID="088a8ece-4ffc-46c3-a091-08064218f7d5";
const STAGES=["nuevo","cotizado","reservado","realizado","pagado"] as const;
type KizuStage=(typeof STAGES)[number];

function standardStage(stage:KizuStage){
  if(stage==="nuevo") return "new";
  if(stage==="cotizado") return "proposal";
  return "won";
}

export async function GET(){
  const db=getCentralSupabase();
  if(!db) return NextResponse.json({error:"Supabase no configurado."},{status:500});
  const {data,error}=await db.from("sales_leads")
    .select("id,full_name,phone,company,interested_pack,interested_product,message,metadata,created_at,updated_at")
    .eq("business_id",BUSINESS_ID).order("created_at",{ascending:false});
  if(error) return NextResponse.json({error:error.message},{status:500});
  const leads=(data??[]).map((x:any)=>{
    const m=x.metadata&&typeof x.metadata==="object"?x.metadata:{};
    const ks=STAGES.includes(m.kizu_stage)?m.kizu_stage:"nuevo";
    return {
      id:x.id,full_name:x.full_name||"Sin nombre",phone:x.phone||"",company:x.company||"",
      need_type:m.need_type||x.interested_pack||"",artist:m.artist||x.interested_product||"",
      event_date:m.event_date||"",venue:m.venue||"",comments:m.comments||x.message||"",
      kizu_stage:ks,amount_clp:Number(m.amount_clp||0),next_action:String(m.next_action||""),
      sound_technician:Boolean(m.sound_technician),dj:Boolean(m.dj),equipment:Boolean(m.equipment),
      special_date:Boolean(m.special_date),created_at:x.created_at,updated_at:x.updated_at,
    };
  });
  return NextResponse.json({business_id:BUSINESS_ID,leads});
}

export async function PATCH(req:NextRequest){
  const db=getCentralSupabase();
  if(!db) return NextResponse.json({error:"Supabase no configurado."},{status:500});
  let body:any; try{body=await req.json()}catch{return NextResponse.json({error:"JSON inválido."},{status:400})}
  const id=String(body.id||""), stage=String(body.kizu_stage||"") as KizuStage;
  if(!id||!STAGES.includes(stage)) return NextResponse.json({error:"Oportunidad o etapa inválida."},{status:400});
  const {data:current,error:readError}=await db.from("sales_leads").select("id,metadata").eq("id",id).eq("business_id",BUSINESS_ID).single();
  if(readError||!current) return NextResponse.json({error:"Oportunidad no encontrada."},{status:404});
  const prev=(current.metadata as any)?.kizu_stage||"nuevo";
  const amount=Math.max(0,Number(body.amount_clp)||0), nextAction=String(body.next_action||"").trim().slice(0,300);
  const metadata={...((current.metadata as Record<string,unknown>)||{}),kizu_stage:stage,amount_clp:amount,next_action:nextAction,
    sound_technician:Boolean(body.sound_technician),dj:Boolean(body.dj),equipment:Boolean(body.equipment),special_date:Boolean(body.special_date),
    dashboard_updated_at:new Date().toISOString()};
  const updates:any={metadata,stage:standardStage(stage),updated_at:new Date().toISOString()};
  if(stage==="pagado") updates.closed_at=new Date().toISOString();
  const {error:updateError}=await db.from("sales_leads").update(updates).eq("id",id).eq("business_id",BUSINESS_ID);
  if(updateError) return NextResponse.json({error:updateError.message},{status:500});
  await db.from("sales_events").insert({control_id:CONTROL_ID,business_id:BUSINESS_ID,project_id:PROJECT_ID,lead_id:id,
    event_type:"pipeline",event_name:"kizu_stage_updated",actor:"human",
    payload:{from:prev,to:stage,amount_clp:amount,next_action:nextAction,sound_technician:Boolean(body.sound_technician),
      dj:Boolean(body.dj),equipment:Boolean(body.equipment),special_date:Boolean(body.special_date)}});
  return NextResponse.json({ok:true});
}
