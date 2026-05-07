import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { hashSensitive } from "@/lib/utils/hash";
import type { Customer, StoreProfile } from "@/lib/db/types";

export function db(): SupabaseClient {
  return getSupabaseAdmin();
}

export async function assertNoError<T>(result: { data: T; error: unknown }, label: string): Promise<T> {
  if (result.error) {
    const message = result.error instanceof Error ? result.error.message : JSON.stringify(result.error);
    throw new Error(`${label}: ${message}`);
  }
  return result.data;
}

export async function createCustomer(input: {
  business_number?: string;
  business_name: string;
  owner_name?: string;
  industry_code?: string;
  industry_name?: string;
  industry_group?: string;
  address?: string;
  road_address?: string;
  opened_at?: string;
  store_count?: number;
}) {
  const payload = {
    business_number_hash: hashSensitive(input.business_number),
    business_name: input.business_name,
    owner_name_hash: hashSensitive(input.owner_name),
    industry_code: input.industry_code ?? null,
    industry_name: input.industry_name ?? null,
    industry_group: input.industry_group ?? "unknown",
    address: input.address ?? null,
    road_address: input.road_address ?? null,
    opened_at: input.opened_at ?? null,
    store_count: input.store_count ?? 1,
    customer_status: "active"
  };

  const data = await assertNoError(
    await db().from("customer").insert(payload).select("*").single(),
    "createCustomer"
  );

  await db().from("customer_journey_state").upsert({ customer_id: data.customer_id, current_stage: "onboarded" });
  await createEvent(data.customer_id, "CUSTOMER_CREATED", "customer", data.customer_id, null, { source: "api" });

  return data;
}

export async function getCustomer(customerId: string): Promise<Customer> {
  const data = await assertNoError(await db().from("customer").select("*").eq("customer_id", customerId).single(), "getCustomer");
  if (!data) throw new Error(`getCustomer: customer not found ${customerId}`);
  return data as Customer;
}

export async function updateCustomerLocation(customerId: string, lat: number, lng: number) {
  return assertNoError(await db().from("customer").update({ lat, lng }).eq("customer_id", customerId).select("*").single(), "updateCustomerLocation");
}

export async function upsertStoreProfile(customerId: string, input: Partial<StoreProfile>) {
  const fields = [
    input.store_type,
    input.main_channel,
    input.customer_goal,
    input.target_customer,
    input.main_products,
    input.differentiation_keywords?.length ? "keywords" : null,
    input.avg_monthly_sales_self_reported,
    input.avg_ticket_size_self_reported,
    input.employee_count
  ];
  const completeness = Math.round((fields.filter((v) => v !== null && v !== undefined && v !== "").length / fields.length) * 100);

  const payload = {
    customer_id: customerId,
    store_type: input.store_type ?? null,
    main_channel: input.main_channel ?? null,
    customer_goal: input.customer_goal ?? null,
    target_customer: input.target_customer ?? null,
    main_products: input.main_products ?? null,
    differentiation_keywords: input.differentiation_keywords ?? null,
    avg_monthly_sales_self_reported: input.avg_monthly_sales_self_reported ?? null,
    avg_ticket_size_self_reported: input.avg_ticket_size_self_reported ?? null,
    employee_count: input.employee_count ?? null,
    profile_completeness_score: completeness
  };

  const data = await assertNoError(await db().from("store_profile").upsert(payload).select("*").single(), "upsertStoreProfile");
  await createEvent(customerId, "DATA_INPUT_COMPLETED", "customer", customerId, null, { type: "profile" });
  return data;
}

export async function getStoreProfile(customerId: string): Promise<StoreProfile | null> {
  const { data, error } = await db().from("store_profile").select("*").eq("customer_id", customerId).maybeSingle();
  if (error) throw new Error(`getStoreProfile: ${error.message}`);
  return data;
}

export async function createEvent(customerId: string, eventName: string, entityType?: string | null, entityId?: string | null, eventValue?: number | null, metadata: Record<string, unknown> = {}) {
  return assertNoError(
    await db().from("customer_event").insert({
      customer_id: customerId,
      event_name: eventName,
      entity_type: entityType ?? null,
      entity_id: entityId ?? null,
      event_value: eventValue ?? null,
      metadata_json: metadata
    }).select("*").single(),
    "createEvent"
  );
}

export async function latest<T = any>(table: string, customerId: string, orderColumn: string): Promise<T | null> {
  const { data, error } = await db().from(table).select("*").eq("customer_id", customerId).order(orderColumn, { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`latest ${table}: ${error.message}`);
  return data as T | null;
}

export async function recent<T = any>(table: string, customerId: string, orderColumn: string, limit = 100): Promise<T[]> {
  const { data, error } = await db().from(table).select("*").eq("customer_id", customerId).order(orderColumn, { ascending: false }).limit(limit);
  if (error) throw new Error(`recent ${table}: ${error.message}`);
  return (data ?? []) as T[];
}
