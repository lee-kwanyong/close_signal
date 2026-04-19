import { env } from "@/lib/env";

export type NtsStatusItem = {
  b_no?: string;
  b_stt?: string;
  b_stt_cd?: string;
  tax_type?: string;
  tax_type_cd?: string;
  end_dt?: string;
};

type NtsStatusResponse = {
  data?: NtsStatusItem[];
};

export async function fetchNtsBusinessStatus(
  businessNumbers: string[]
): Promise<NtsStatusItem[]> {
  const cleaned = businessNumbers
    .map((value) => value.replace(/[^\d]/g, ""))
    .filter((value) => value.length === 10);

  if (cleaned.length === 0) return [];

  if (cleaned.length > 100) {
    throw new Error("NTS status API allows up to 100 business numbers per request.");
  }

  const url = `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(
    env.NTS_SERVICE_KEY
  )}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      b_no: cleaned,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`NTS API ${response.status}: ${text}`);
  }

  const json = (await response.json()) as NtsStatusResponse;
  return json.data ?? [];
}