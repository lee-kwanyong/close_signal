import { supabaseAdmin } from "@/lib/supabase/admin";

type GenerateResult = {
  ok: boolean;
  scoreDate: string | null;
  generatedCount: number;
  sourceCount: number;
  message?: string;
};

async function tryRpc(functionNames: string[]) {
  const supabase = supabaseAdmin();

  for (const functionName of functionNames) {
    try {
      const { data, error } = await supabase.rpc(functionName);
      if (!error) return { functionName, data };
    } catch {
      continue;
    }
  }

  return null;
}

export async function generateRiskScoresFromNtsLatestMonth(): Promise<GenerateResult> {
  const rpc = await tryRpc([
    "generate_risk_scores_from_nts_latest_month",
    "generate_risk_scores_latest_month",
    "refresh_risk_scores_latest_month",
  ]);

  if (rpc) {
    const row = (rpc.data ?? {}) as Record<string, unknown>;
    return {
      ok: true,
      scoreDate:
        typeof row.score_date === "string"
          ? row.score_date
          : typeof row.scoreDate === "string"
            ? row.scoreDate
            : new Date().toISOString().slice(0, 10),
      generatedCount: Number(row.generated_count ?? row.generatedCount ?? 0) || 0,
      sourceCount: Number(row.source_count ?? row.sourceCount ?? 0) || 0,
    };
  }

  const supabase = supabaseAdmin();
  const latestSource = await supabase
    .schema("nts")
    .from("business_status_100_living_industries")
    .select("*", { count: "exact", head: true });

  if (latestSource.error) {
    return {
      ok: false,
      scoreDate: null,
      generatedCount: 0,
      sourceCount: 0,
      message: latestSource.error.message,
    };
  }

  return {
    ok: false,
    scoreDate: null,
    generatedCount: 0,
    sourceCount: latestSource.count ?? 0,
    message: "risk_scores 생성 RPC를 찾지 못했습니다. DB 함수 또는 생성 로직을 연결해야 합니다.",
  };
}