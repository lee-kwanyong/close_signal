import "server-only";

export type KosisRawScalar = string | number | boolean | null;
export type KosisRawRow = Record<string, KosisRawScalar>;

const KOSIS_CLOSURE_9816_URL =
  "https://kosis.kr/openapi/Param/statisticsParameterData.do?method=getList&itmId=T001+&objL1=ALL&objL2=ALL&objL3=&objL4=&objL5=&objL6=&objL7=&objL8=&format=json&jsonVD=Y&prdSe=Y&newEstPrdCnt=3&orgId=133&tblId=DT_133001N_9816";

export function getKosisClosure9816Url() {
  return KOSIS_CLOSURE_9816_URL;
}

function injectApiKey(url: string, apiKey: string) {
  if (/([?&])apiKey=/i.test(url)) {
    return url.replace(
      /([?&])apiKey=[^&]*/i,
      `$1apiKey=${encodeURIComponent(apiKey)}`,
    );
  }

  return `${url}${url.includes("?") ? "&" : "?"}apiKey=${encodeURIComponent(apiKey)}`;
}

function normalizeKosisPayload(payload: unknown): KosisRawRow[] {
  if (Array.isArray(payload)) {
    return payload as KosisRawRow[];
  }

  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    const errorMessage =
      typeof obj.errMsg === "string"
        ? obj.errMsg
        : typeof obj.message === "string"
          ? obj.message
          : null;

    if (errorMessage) {
      throw new Error(errorMessage);
    }

    if (Array.isArray(obj.result)) {
      return obj.result as KosisRawRow[];
    }

    if (Array.isArray(obj.data)) {
      return obj.data as KosisRawRow[];
    }
  }

  throw new Error("Unexpected KOSIS payload shape");
}

export async function fetchKosisJsonByGeneratedUrl(
  generatedUrl: string,
): Promise<KosisRawRow[]> {
  const apiKey = process.env.KOSIS_API_KEY;

  if (!apiKey) {
    throw new Error("Missing KOSIS_API_KEY");
  }

  const url = injectApiKey(generatedUrl, apiKey);

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json,text/plain,*/*",
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`KOSIS ${response.status}: ${text.slice(0, 400)}`);
  }

  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`KOSIS returned non-JSON response: ${text.slice(0, 400)}`);
  }

  return normalizeKosisPayload(payload);
}