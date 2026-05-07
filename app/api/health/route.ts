import { ok } from "@/lib/utils/response";

export const runtime = "nodejs";

export async function GET() {
  return ok({ status: "ok", service: "growth-signal-300-cloud" });
}
