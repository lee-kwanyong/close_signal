import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import MonitorDetailClient from "./MonitorDetailClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AnyRow = Record<string, unknown>;

export const dynamic = "force-dynamic";

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function selectMaybe<T = AnyRow>(
  tableName: string,
  builder: (query: any) => any,
): Promise<T[]> {
  try {
    const query = builder(supabaseAdmin().from(tableName).select("*"));
    const { data, error } = await query;
    if (error || !Array.isArray(data)) return [];
    return data as T[];
  } catch {
    return [];
  }
}

async function selectOneMaybe<T = AnyRow>(
  tableName: string,
  builder: (query: any) => any,
): Promise<T | null> {
  try {
    const query = builder(supabaseAdmin().from(tableName).select("*"));
    const { data, error } = await query.limit(1).maybeSingle();
    if (error || !data) return null;
    return data as T;
  } catch {
    return null;
  }
}

export default async function MonitorDetailPage({ params }: PageProps) {
  const { id } = await params;
  const monitorId = Number(id);

  if (!Number.isFinite(monitorId) || monitorId <= 0) {
    notFound();
  }

  const monitor = await selectOneMaybe("external_intel_targets", (query) =>
    query.eq("id", monitorId),
  );

  if (!monitor) {
    notFound();
  }

  const snapshots = await selectMaybe("business_health_snapshots", (query) =>
    query.eq("monitor_id", monitorId).order("created_at", { ascending: false }).limit(10),
  );

  const latestSnapshot = snapshots[0] ?? null;
  const previousSnapshot = snapshots[1] ?? null;

  const latestSnapshotId = asNumber(latestSnapshot?.id);
  const snapshotIds = snapshots
    .map((row) => asNumber(row.id))
    .filter((value): value is number => value !== null);

  const reasonRowsAll =
    snapshotIds.length > 0
      ? await selectMaybe("business_snapshot_reasons", (query) =>
          query.in("snapshot_id", snapshotIds).order("created_at", { ascending: false }),
        )
      : [];

  const actionRowsAll =
    snapshotIds.length > 0
      ? await selectMaybe("snapshot_recommended_actions", (query) =>
          query.in("snapshot_id", snapshotIds).order("created_at", { ascending: false }),
        )
      : [];

  const reasonRows =
    latestSnapshotId == null
      ? []
      : reasonRowsAll.filter((row) => asNumber(row.snapshot_id) === latestSnapshotId);

  const actionRows =
    latestSnapshotId == null
      ? []
      : actionRowsAll.filter((row) => asNumber(row.snapshot_id) === latestSnapshotId);

  const tasks = await selectMaybe("intervention_tasks", (query) =>
    query.eq("monitor_id", monitorId).order("created_at", { ascending: false }),
  );

  const outcomes = await selectMaybe("intervention_outcomes", (query) =>
    query.eq("monitor_id", monitorId).order("created_at", { ascending: false }),
  );

  const latestOutcome = outcomes[0] ?? null;

  const viewRow =
    (await selectOneMaybe("v_monitor_last_chance_cards", (query) =>
      query.eq("monitor_id", monitorId),
    )) ??
    (await selectOneMaybe("monitor_last_chance_cards", (query) =>
      query.eq("monitor_id", monitorId),
    )) ??
    {};

  const detail = {
    monitor,
    latestSnapshot: latestSnapshot ?? {},
    previousSnapshot: previousSnapshot ?? {},
    latestOutcome: latestOutcome ?? {},
    viewRow,
    whySummary:
      latestSnapshot?.why_summary ??
      latestSnapshot?.summary ??
      monitor?.latest_reason_code ??
      null,
    actionSummary:
      latestSnapshot?.action_summary ??
      monitor?.note ??
      null,
    reasonRows,
    actionRows,
    timeline: {
      healthSnapshots: snapshots,
      interventionTasks: tasks,
      interventionOutcomes: outcomes,
    },
  };

  return <MonitorDetailClient detail={detail} />;
}