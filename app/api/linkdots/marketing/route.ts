import { NextResponse } from "next/server";
import { getCentralSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function naturalName(value: unknown) {
  const text = String(value || "").trim();
  if (text.length < 2) return false;
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(text)) return false;
  if (/^[A-Z0-9_-]{8,}$/.test(text)) return false;
  return true;
}

function contactable(lead: any) {
  const hasContact = Boolean(String(lead?.email || "").trim() || String(lead?.phone || "").trim());
  return naturalName(lead?.full_name) && hasContact;
}

export async function GET() {
  const supabase = getCentralSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "central_supabase_not_configured" }, { status: 503 });
  }

  const { data: plan, error: planError } = await supabase
    .from("link_rrss_operation_plans")
    .select("*")
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (planError) return NextResponse.json({ ok: false, error: planError.message }, { status: 500 });
  if (!plan) return NextResponse.json({ ok: true, empty: true });

  const { data: business } = await supabase
    .from("link_world_businesses")
    .select("id,name,slug,sector,city,country,verification_status,global_id")
    .eq("id", plan.business_id)
    .maybeSingle();

  const [tasksResult, profileResult, briefResult, learningResult, leadsResult] = await Promise.all([
    supabase
      .from("link_rrss_operation_tasks")
      .select("id,title,content_type,channel,planned_at,status,linked_post_id,proof_url,completed_at,verified_at")
      .eq("plan_id", plan.id)
      .neq("status", "cancelled")
      .order("planned_at", { ascending: true }),
    supabase
      .from("link_rrss_profiles")
      .select("id,name,slug,status")
      .eq("business_id", plan.business_id)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("link_marketing_briefs")
      .select("id,name,status,product_id,audience,benefit,hook,offer,capture_rule,primary_channel,target_leads,budget_clp,metadata,updated_at")
      .eq("business_id", plan.business_id)
      .eq("plan_id", plan.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("link_marketing_learnings")
      .select("id,observed_at,signal_type,finding,decision,metrics,evidence,source_ref")
      .eq("business_id", plan.business_id)
      .order("observed_at", { ascending: false })
      .limit(8),
    supabase
      .from("sales_leads")
      .select("id,full_name,email,phone,stage,source,source_page,source_cta,created_at")
      .eq("business_id", plan.business_id)
      .gte("created_at", `${plan.period_start}T00:00:00Z`)
      .lte("created_at", `${plan.period_end}T23:59:59Z`),
  ]);

  const profile = profileResult.data;
  let accounts: any[] = [];
  let posts: any[] = [];

  if (profile?.id) {
    const { data: sources } = await supabase
      .from("link_rrss_sources")
      .select("id,provider,status,last_synced_at")
      .eq("profile_id", profile.id)
      .neq("status", "disconnected");

    const sourceIds = (sources || []).map((item: any) => item.id);
    if (sourceIds.length) {
      const { data: accountRows } = await supabase
        .from("link_rrss_accounts")
        .select("id,platform,username,display_name,status,can_post,can_analytics,last_synced_at")
        .in("source_id", sourceIds)
        .neq("status", "disconnected");
      accounts = accountRows || [];

      const accountIds = accounts.map((item: any) => item.id);
      if (accountIds.length) {
        const { data: postRows } = await supabase
          .from("link_rrss_posts")
          .select("id,account_id,media_type,status,published_at,scheduled_for,metrics,post_url")
          .in("account_id", accountIds)
          .gte("published_at", `${plan.period_start}T00:00:00Z`)
          .lte("published_at", `${plan.period_end}T23:59:59Z`)
          .order("published_at", { ascending: false });
        posts = postRows || [];
      }
    }
  }

  const tasks = tasksResult.data || [];
  const leads = leadsResult.data || [];
  const validLeads = leads.filter(contactable);

  const taskStatus = tasks.reduce((acc: Record<string, number>, item: any) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    business,
    profile,
    plan,
    brief: briefResult.data || null,
    tasks,
    accounts,
    recentPosts: posts.slice(0, 12),
    learnings: learningResult.data || [],
    metrics: {
      plannedTasks: tasks.length,
      verifiedTasks: taskStatus.verified || 0,
      inProgressTasks: (taskStatus.in_progress || 0) + (taskStatus.awaiting_proof || 0),
      actualPosts: posts.length,
      leadsCaptured: leads.length,
      validLeads: validLeads.length,
      handoffBlocked: validLeads.length === 0,
    },
  });
}
