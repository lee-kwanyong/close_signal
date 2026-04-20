"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function toSafeString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function toSafeNumber(value: FormDataEntryValue | null) {
  const n = Number(typeof value === "string" ? value : "");
  return Number.isFinite(n) ? n : NaN;
}

function getSafeNext(nextValue: string) {
  if (!nextValue) return "/hq/actions";
  if (!nextValue.startsWith("/")) return "/hq/actions";
  if (nextValue.startsWith("//")) return "/hq/actions";
  return nextValue;
}

function buildRedirectUrl(next: string, key: "success" | "error", value: string) {
  const [pathname, rawQuery] = next.split("?");
  const params = new URLSearchParams(rawQuery || "");
  params.set(key, value);
  return `${pathname}?${params.toString()}`;
}

async function revalidateHqPaths(storeId?: number | null) {
  revalidatePath("/hq");
  revalidatePath("/hq/stores");
  revalidatePath("/hq/sites");
  revalidatePath("/hq/regions");
  revalidatePath("/hq/actions");

  if (Number.isFinite(storeId)) {
    revalidatePath(`/hq/stores/${storeId}`);
  }
}

type ActionRow = {
  id: number;
  score_id: number;
  status: string | null;
};

type ScoreRow = {
  id: number;
  target_kind: string | null;
  store_id: number | null;
  brand_id: number | null;
  snapshot_date: string | null;
  analysis_radius_m: number | null;
  store_risk_score: number | null;
};

type FeatureRow = {
  estimated_sales_index: number | null;
};

type RunRow = {
  id: number;
  run_status: string | null;
};

export async function mutateHqActionStatusAction(formData: FormData) {
  const intent = toSafeString(formData.get("intent"));
  const actionId = toSafeNumber(formData.get("action_id"));
  const next = getSafeNext(toSafeString(formData.get("next")) || "/hq/actions");
  const ownerNote = toSafeString(formData.get("owner_note"));
  const resultSummary = toSafeString(formData.get("result_summary"));

  if (!Number.isFinite(actionId) || !intent) {
    redirect(buildRedirectUrl(next, "error", "invalid_request"));
  }

  const supabase = await createClient();

  const { data: actionData, error: actionError } = await supabase
    .from("hq_site_actions")
    .select("id, score_id, status")
    .eq("id", actionId)
    .single();

  if (actionError || !actionData) {
    console.error("load hq_site_actions error", actionError);
    redirect(buildRedirectUrl(next, "error", "action_not_found"));
  }

  const actionRow = actionData as ActionRow;

  const { data: scoreData, error: scoreError } = await supabase
    .from("hq_site_scores")
    .select("id, target_kind, store_id, brand_id, snapshot_date, analysis_radius_m, store_risk_score")
    .eq("id", actionRow.score_id)
    .single();

  if (scoreError || !scoreData) {
    console.error("load hq_site_scores error", scoreError);
    redirect(buildRedirectUrl(next, "error", "score_not_found"));
  }

  const scoreRow = scoreData as ScoreRow;

  let estimatedSalesIndex: number | null = null;

  if (
    scoreRow.target_kind === "store" &&
    Number.isFinite(scoreRow.store_id) &&
    scoreRow.snapshot_date &&
    Number.isFinite(scoreRow.analysis_radius_m)
  ) {
    const { data: featureData } = await supabase
      .from("hq_site_feature_snapshots")
      .select("estimated_sales_index")
      .eq("target_kind", "store")
      .eq("store_id", scoreRow.store_id as number)
      .eq("snapshot_date", scoreRow.snapshot_date)
      .eq("analysis_radius_m", scoreRow.analysis_radius_m as number)
      .maybeSingle();

    if (featureData) {
      estimatedSalesIndex = (featureData as FeatureRow).estimated_sales_index ?? null;
    }
  }

  const { data: latestOpenRunData } = await supabase
    .from("hq_action_runs")
    .select("id, run_status")
    .eq("action_id", actionId)
    .in("run_status", ["planned", "started"])
    .order("created_at", { ascending: false })
    .limit(1);

  const latestOpenRun = Array.isArray(latestOpenRunData)
    ? ((latestOpenRunData[0] as RunRow | undefined) ?? null)
    : null;

  const now = new Date().toISOString();

  async function insertRun(runStatus: "started" | "done" | "dismissed") {
    const payload = {
      action_id: actionId,
      store_id: scoreRow.store_id,
      run_status: runStatus,
      started_at: runStatus === "started" || runStatus === "done" ? now : null,
      finished_at: runStatus === "done" || runStatus === "dismissed" ? now : null,
      before_risk_score:
        runStatus === "started" || runStatus === "done"
          ? scoreRow.store_risk_score
          : null,
      after_risk_score: runStatus === "done" ? scoreRow.store_risk_score : null,
      before_sales_index:
        runStatus === "started" || runStatus === "done" ? estimatedSalesIndex : null,
      after_sales_index: runStatus === "done" ? estimatedSalesIndex : null,
      result_summary: resultSummary || null,
      owner_note: ownerNote || null,
      result_payload: {},
    };

    const { error } = await supabase.from("hq_action_runs").insert(payload);

    if (error) {
      console.error("insert hq_action_runs error", error);
      redirect(buildRedirectUrl(next, "error", "run_insert_failed"));
    }
  }

  async function updateLatestRun(runStatus: "started" | "done" | "dismissed") {
    if (!latestOpenRun?.id) {
      await insertRun(runStatus);
      return;
    }

    const patch: Record<string, unknown> = {
      run_status: runStatus,
      owner_note: ownerNote || null,
    };

    if (runStatus === "started") {
      patch.started_at = now;
      patch.before_risk_score = scoreRow.store_risk_score;
      patch.before_sales_index = estimatedSalesIndex;
    }

    if (runStatus === "done") {
      patch.finished_at = now;
      patch.after_risk_score = scoreRow.store_risk_score;
      patch.after_sales_index = estimatedSalesIndex;
      patch.result_summary = resultSummary || null;
    }

    if (runStatus === "dismissed") {
      patch.finished_at = now;
      patch.result_summary = resultSummary || null;
    }

    const { error } = await supabase
      .from("hq_action_runs")
      .update(patch)
      .eq("id", latestOpenRun.id);

    if (error) {
      console.error("update hq_action_runs error", error);
      redirect(buildRedirectUrl(next, "error", "run_update_failed"));
    }
  }

  if (intent === "accept") {
    const { error } = await supabase
      .from("hq_site_actions")
      .update({ status: "accepted" })
      .eq("id", actionId);

    if (error) {
      console.error("accept hq_site_actions error", error);
      redirect(buildRedirectUrl(next, "error", "accept_failed"));
    }

    await revalidateHqPaths(scoreRow.store_id);
    redirect(buildRedirectUrl(next, "success", "accepted"));
  }

  if (intent === "start") {
    const { error } = await supabase
      .from("hq_site_actions")
      .update({ status: "in_progress" })
      .eq("id", actionId);

    if (error) {
      console.error("start hq_site_actions error", error);
      redirect(buildRedirectUrl(next, "error", "start_failed"));
    }

    await updateLatestRun("started");
    await revalidateHqPaths(scoreRow.store_id);
    redirect(buildRedirectUrl(next, "success", "started"));
  }

  if (intent === "done") {
    const { error } = await supabase
      .from("hq_site_actions")
      .update({ status: "done" })
      .eq("id", actionId);

    if (error) {
      console.error("done hq_site_actions error", error);
      redirect(buildRedirectUrl(next, "error", "done_failed"));
    }

    await updateLatestRun("done");
    await revalidateHqPaths(scoreRow.store_id);
    redirect(buildRedirectUrl(next, "success", "done"));
  }

  if (intent === "dismiss") {
    const { error } = await supabase
      .from("hq_site_actions")
      .update({ status: "dismissed" })
      .eq("id", actionId);

    if (error) {
      console.error("dismiss hq_site_actions error", error);
      redirect(buildRedirectUrl(next, "error", "dismiss_failed"));
    }

    await updateLatestRun("dismissed");
    await revalidateHqPaths(scoreRow.store_id);
    redirect(buildRedirectUrl(next, "success", "dismissed"));
  }

  if (intent === "reset") {
    const { error } = await supabase
      .from("hq_site_actions")
      .update({ status: "recommended" })
      .eq("id", actionId);

    if (error) {
      console.error("reset hq_site_actions error", error);
      redirect(buildRedirectUrl(next, "error", "reset_failed"));
    }

    await revalidateHqPaths(scoreRow.store_id);
    redirect(buildRedirectUrl(next, "success", "reset"));
  }

  redirect(buildRedirectUrl(next, "error", "unknown_intent"));
}