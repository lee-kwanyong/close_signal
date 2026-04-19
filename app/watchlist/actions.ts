"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getInternalUserId } from "@/lib/auth/get-internal-user";

function toSafeString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function toSafeNumber(value: FormDataEntryValue | null) {
  const n = Number(typeof value === "string" ? value : "");
  return Number.isFinite(n) ? n : NaN;
}

function revalidateWatchlistRelatedPaths(regionCode: string, categoryId: number) {
  revalidatePath("/");
  revalidatePath("/rankings");
  revalidatePath("/signals");
  revalidatePath("/watchlist");
  revalidatePath(`/regions/${regionCode}/${categoryId}`);
}

export async function mutateWatchlistAction(formData: FormData) {
  const intent = toSafeString(formData.get("intent"));
  const regionCode = toSafeString(formData.get("region_code"));
  const categoryId = toSafeNumber(formData.get("category_id"));
  const watchlistId = toSafeNumber(formData.get("watchlist_id"));
  const next = toSafeString(formData.get("next")) || "/watchlist";

  if (!regionCode || !Number.isFinite(categoryId)) {
    redirect(`${next}?error=missing_required_fields`);
  }

  const internalUserId = await getInternalUserId();

  if (!internalUserId) {
    redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  }

  const supabase = await createClient();

  if (intent === "remove") {
    let targetWatchlistId = watchlistId;

    if (!Number.isFinite(targetWatchlistId)) {
      const { data: statusData, error: statusError } = await supabase.rpc(
        "get_watchlist_status",
        {
          p_user_id: internalUserId,
          p_region_code: regionCode,
          p_category_id: categoryId,
        }
      );

      if (statusError) {
        console.error("get_watchlist_status error", statusError);
        redirect(`${next}?error=watchlist_lookup_failed`);
      }

      const statusRow = Array.isArray(statusData) ? statusData[0] : null;
      targetWatchlistId = Number(statusRow?.watchlist_id);
    }

    if (!Number.isFinite(targetWatchlistId)) {
      redirect(`${next}?error=watchlist_not_found`);
    }

    const { error } = await supabase.rpc("remove_watchlist", {
      p_user_id: internalUserId,
      p_watchlist_id: targetWatchlistId,
    });

    if (error) {
      console.error("remove_watchlist error", error);
      redirect(`${next}?error=remove_failed`);
    }

    revalidateWatchlistRelatedPaths(regionCode, categoryId);
    redirect(`${next}?success=removed`);
  }

  const { error } = await supabase.rpc("add_watchlist", {
    p_user_id: internalUserId,
    p_region_code: regionCode,
    p_category_id: categoryId,
  });

  if (error) {
    const code = String((error as { code?: string } | null)?.code ?? "");
    const message = String((error as { message?: string } | null)?.message ?? "").toLowerCase();

    if (code === "23505" || message.includes("duplicate")) {
      revalidateWatchlistRelatedPaths(regionCode, categoryId);
      redirect(`${next}?success=added`);
    }

    console.error("add_watchlist error", error);
    redirect(`${next}?error=add_failed`);
  }

  revalidateWatchlistRelatedPaths(regionCode, categoryId);
  redirect(`${next}?success=added`);
}