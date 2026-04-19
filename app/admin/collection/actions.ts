"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { generateRiskScoresFromNtsLatestMonth } from "@/lib/risk-scores/generate";
import { generateRiskSignalsForLatestScoreDate } from "@/lib/risk-signals/generate";
import { generateSbizRegionCategoryMetrics } from "@/lib/sbiz-metrics/generate";

function redirectWithError(message: string) {
  redirect(`/admin/collection?error=${encodeURIComponent(message)}`);
}

function revalidateCorePaths() {
  revalidatePath("/");
  revalidatePath("/rankings");
  revalidatePath("/signals");
  revalidatePath("/regions");
  revalidatePath("/watchlist");
  revalidatePath("/admin/collection");
}

function redirectWithSuccess(message: string) {
  revalidateCorePaths();
  redirect(`/admin/collection?success=${encodeURIComponent(message)}`);
}

export async function generateRiskScoresAction() {
  const result = await generateRiskScoresFromNtsLatestMonth();

  if (!result.ok) {
    redirectWithError(result.message || "risk_scores 생성에 실패했습니다.");
  }

  redirectWithSuccess(
    `${result.scoreDate} 기준 risk_scores ${result.generatedCount}건 생성 완료 (source ${result.sourceCount}건)`
  );
}

export async function generateSignalsAction() {
  const result = await generateRiskSignalsForLatestScoreDate();

  if (!result.ok) {
    redirectWithError(result.message || "risk_signals 생성에 실패했습니다.");
  }

  redirectWithSuccess(
    `${result.scoreDate} 기준 risk_signals ${result.generatedCount}건 생성 완료 (source ${result.sourceCount}건)`
  );
}

export async function generateSbizMetricsAction() {
  const result = await generateSbizRegionCategoryMetrics();

  if (!result.ok) {
    redirectWithError(result.message || "sbiz metrics 생성에 실패했습니다.");
  }

  redirectWithSuccess(
    `${result.scoreDate} 기준 sbiz metrics ${result.generatedCount}건 생성 완료`
  );
}