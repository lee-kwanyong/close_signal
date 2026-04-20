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

function getNextPath(formData: FormData, fallback = "/watchlist") {
  return (
    toSafeString(formData.get("next")) ||
    toSafeString(formData.get("return_to")) ||
    fallback
  );
}

async function resolveInternalUserId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  requestedUserId: number,
) {
  let internalUserId = requestedUserId;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    const { data: mappedUser, error: mappedUserError } = await supabase
      .from("users")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!mappedUserError && mappedUser?.id) {
      internalUserId = mappedUser.id;
    }
  }

  return internalUserId;
}

function revalidateWatchlistPaths(regionCode?: string, categoryId?: number) {
  revalidatePath("/");
  revalidatePath("/rankings");
  revalidatePath("/signals");
  revalidatePath("/watchlist");

  if (regionCode && Number.isFinite(categoryId)) {
    revalidatePath(`/regions/${regionCode}/${categoryId}`);
  }
}

async function addWatchlistCore(params: {
  regionCode: string;
  categoryId: number;
  requestedUserId: number;
  next: string;
}) {
  const { regionCode, categoryId, requestedUserId, next } = params;

  if (!regionCode || !Number.isFinite(categoryId)) {
    redirect(`${next}?error=missing_required_fields`);
  }

  const supabase = await createClient();
  const internalUserId = await resolveInternalUserId(supabase, requestedUserId);

  if (!Number.isFinite(internalUserId)) {
    redirect(`${next}?error=invalid_user`);
  }

  const { error } = await supabase.rpc("add_watchlist", {
    p_user_id: internalUserId,
    p_region_code: regionCode,
    p_category_id: categoryId,
  });

  if (error) {
    console.error("add_watchlist error", error);
    redirect(`${next}?error=add_failed`);
  }

  revalidateWatchlistPaths(regionCode, categoryId);
  redirect(`${next}?success=added`);
}

async function removeWatchlistCore(params: {
  watchlistId: number;
  regionCode?: string;
  categoryId?: number;
  requestedUserId: number;
  next: string;
}) {
  const { watchlistId, regionCode, categoryId, requestedUserId, next } = params;

  if (!Number.isFinite(watchlistId)) {
    redirect(`${next}?error=watchlist_not_found`);
  }

  const supabase = await createClient();
  const internalUserId = await resolveInternalUserId(supabase, requestedUserId);

  if (!Number.isFinite(internalUserId)) {
    redirect(`${next}?error=invalid_user`);
  }

  const { error } = await supabase.rpc("remove_watchlist", {
    p_user_id: internalUserId,
    p_watchlist_id: watchlistId,
  });

  if (error) {
    console.error("remove_watchlist error", error);
    redirect(`${next}?error=remove_failed`);
  }

  revalidateWatchlistPaths(regionCode, categoryId);
  redirect(`${next}?success=removed`);
}

export async function mutateWatchlistAction(formData: FormData) {
  const intent = toSafeString(formData.get("intent"));
  const regionCode = toSafeString(formData.get("region_code"));
  const categoryId = toSafeNumber(formData.get("category_id"));
  const watchlistId = toSafeNumber(formData.get("watchlist_id"));
  const next = getNextPath(formData);

  const fallbackUserId = toSafeNumber(formData.get("user_id"));
  const requestedUserId = Number.isFinite(fallbackUserId) ? fallbackUserId : 1;

  if (intent === "remove") {
    if (Number.isFinite(watchlistId)) {
      return removeWatchlistCore({
        watchlistId,
        regionCode: regionCode || undefined,
        categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
        requestedUserId,
        next,
      });
    }

    if (!regionCode || !Number.isFinite(categoryId)) {
      redirect(`${next}?error=missing_required_fields`);
    }

    const supabase = await createClient();
    const internalUserId = await resolveInternalUserId(supabase, requestedUserId);

    if (!Number.isFinite(internalUserId)) {
      redirect(`${next}?error=invalid_user`);
    }

    const { data: statusData, error: statusError } = await supabase.rpc(
      "get_watchlist_status",
      {
        p_user_id: internalUserId,
        p_region_code: regionCode,
        p_category_id: categoryId,
      },
    );

    if (statusError) {
      console.error("get_watchlist_status error", statusError);
      redirect(`${next}?error=watchlist_lookup_failed`);
    }

    const statusRow = Array.isArray(statusData) ? statusData[0] : null;
    const targetWatchlistId = Number(statusRow?.watchlist_id);

    return removeWatchlistCore({
      watchlistId: targetWatchlistId,
      regionCode,
      categoryId,
      requestedUserId: internalUserId,
      next,
    });
  }

  return addWatchlistCore({
    regionCode,
    categoryId,
    requestedUserId,
    next,
  });
}

export async function addWatchlistAction(formData: FormData) {
  const regionCode = toSafeString(formData.get("region_code"));
  const categoryId = toSafeNumber(formData.get("category_id"));
  const next = getNextPath(formData);

  const fallbackUserId = toSafeNumber(formData.get("user_id"));
  const requestedUserId = Number.isFinite(fallbackUserId) ? fallbackUserId : 1;

  return addWatchlistCore({
    regionCode,
    categoryId,
    requestedUserId,
    next,
  });
}

export async function removeWatchlistAction(formData: FormData) {
  const regionCode = toSafeString(formData.get("region_code"));
  const categoryId = toSafeNumber(formData.get("category_id"));
  const watchlistId = toSafeNumber(formData.get("watchlist_id"));
  const next = getNextPath(formData);

  const fallbackUserId = toSafeNumber(formData.get("user_id"));
  const requestedUserId = Number.isFinite(fallbackUserId) ? fallbackUserId : 1;

  if (Number.isFinite(watchlistId)) {
    return removeWatchlistCore({
      watchlistId,
      regionCode: regionCode || undefined,
      categoryId: Number.isFinite(categoryId) ? categoryId : undefined,
      requestedUserId,
      next,
    });
  }

  if (!regionCode || !Number.isFinite(categoryId)) {
    redirect(`${next}?error=missing_required_fields`);
  }

  const supabase = await createClient();
  const internalUserId = await resolveInternalUserId(supabase, requestedUserId);

  if (!Number.isFinite(internalUserId)) {
    redirect(`${next}?error=invalid_user`);
  }

  const { data: statusData, error: statusError } = await supabase.rpc(
    "get_watchlist_status",
    {
      p_user_id: internalUserId,
      p_region_code: regionCode,
      p_category_id: categoryId,
    },
  );

  if (statusError) {
    console.error("get_watchlist_status error", statusError);
    redirect(`${next}?error=watchlist_lookup_failed`);
  }

  const statusRow = Array.isArray(statusData) ? statusData[0] : null;
  const targetWatchlistId = Number(statusRow?.watchlist_id);

  return removeWatchlistCore({
    watchlistId: targetWatchlistId,
    regionCode,
    categoryId,
    requestedUserId: internalUserId,
    next,
  });
}