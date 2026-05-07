import type {
  ActionAssetsDto,
  ActionDetailDto,
  ApiEnvelope,
  CompleteActionResponseDto,
  CurrentSprintDto,
  CustomerSuccessQueueDto,
  DiagnosisListDto,
  GrowthSignalLatestDto,
} from "@/lib/dto";
import { assertCustomerId } from "@/lib/customer-id";
import {
  mockActionDetail,
  mockAssets,
  mockCustomerSuccessQueue,
  mockDiagnoses,
  mockGrowthReport,
  mockSprint,
} from "@/lib/mock-data";

function getApiBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

const API_BASE_URL = getApiBaseUrl();
const USE_MOCK_FALLBACK = process.env.NEXT_PUBLIC_USE_MOCK_FALLBACK === "true";

type ApiFailureEnvelope = {
  success: false;
  error?: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  };
};

function isApiFailureEnvelope(value: unknown): value is ApiFailureEnvelope {
  return Boolean(
    value &&
      typeof value === "object" &&
      "success" in value &&
      (value as { success?: unknown }).success === false
  );
}

async function readErrorMessage(response: Response, url: string) {
  const text = await response.text();

  if (!text) {
    return `API ${response.status}: ${url}`;
  }

  try {
    const parsed = JSON.parse(text) as unknown;

    if (isApiFailureEnvelope(parsed)) {
      return parsed.error?.message ?? `API ${response.status}: ${url}`;
    }
  } catch {
    // keep text below
  }

  return text;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  fallback?: T
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await readErrorMessage(response, url);
      throw new Error(`API ${response.status}: ${message}`);
    }

    const envelope = (await response.json()) as
      | ApiEnvelope<T>
      | ApiFailureEnvelope;

    if (isApiFailureEnvelope(envelope)) {
      throw new Error(envelope.error?.message ?? `API failed: ${url}`);
    }

    return envelope.data;
  } catch (error) {
    if (USE_MOCK_FALLBACK && fallback !== undefined) {
      return fallback;
    }

    throw error;
  }
}

export const growthSignalApi = {
  getLatest(customerId: string) {
    const validCustomerId = assertCustomerId(customerId);

    return apiFetch<GrowthSignalLatestDto>(
      `/api/v1/customers/${validCustomerId}/growth-signal/latest`,
      {},
      { ...mockGrowthReport, customer_id: validCustomerId }
    );
  },

  getDiagnoses(customerId: string) {
    const validCustomerId = assertCustomerId(customerId);

    return apiFetch<DiagnosisListDto>(
      `/api/v1/customers/${validCustomerId}/diagnoses/latest`,
      {},
      mockDiagnoses
    );
  },

  getCurrentSprint(customerId: string) {
    const validCustomerId = assertCustomerId(customerId);

    return apiFetch<CurrentSprintDto>(
      `/api/v1/customers/${validCustomerId}/sprints/current`,
      {},
      mockSprint
    );
  },

  getAction(actionId: string) {
    return apiFetch<ActionDetailDto>(
      `/api/v1/actions/${actionId}`,
      {},
      { ...mockActionDetail, action_id: actionId }
    );
  },

  getActionAssets(actionId: string) {
    return apiFetch<ActionAssetsDto>(
      `/api/v1/actions/${actionId}/assets`,
      {},
      { ...mockAssets, action_id: actionId }
    );
  },

  viewAction(actionId: string) {
    return apiFetch<{ action_id: string; status: string }>(
      `/api/v1/actions/${actionId}/view`,
      { method: "POST" },
      { action_id: actionId, status: "viewed" }
    );
  },

  clickAction(actionId: string) {
    return apiFetch<{ action_id: string; status: string }>(
      `/api/v1/actions/${actionId}/click`,
      { method: "POST" },
      { action_id: actionId, status: "clicked" }
    );
  },

  completeAction(actionId: string, completionNote?: string) {
    return apiFetch<CompleteActionResponseDto>(
      `/api/v1/actions/${actionId}/complete`,
      {
        method: "POST",
        body: JSON.stringify({
          completion_note: completionNote ?? "프론트에서 완료 처리",
        }),
      },
      {
        action_id: actionId,
        status: "completed_l0",
        score_feedback: {
          message: "미션 완료! Growth Signal 점수가 상승했습니다.",
          before_growth_signal_score: 68,
          after_growth_signal_score: 70,
          changed_components: {
            action_velocity: { before: 62, after: 68 },
          },
        },
      }
    );
  },

  submitEvidence(
    actionId: string,
    payload: {
      evidence_type: string;
      evidence_text?: string;
      evidence_url?: string;
    }
  ) {
    return apiFetch<{
      action_id: string;
      evidence_id: string;
      verification_level: string;
      verification_status: string;
    }>(
      `/api/v1/actions/${actionId}/evidence`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      {
        action_id: actionId,
        evidence_id: "evidence_mock",
        verification_level: "L1",
        verification_status: "submitted",
      }
    );
  },

  trackEvent(payload: {
    customer_id: string;
    event_name: string;
    entity_type?: string;
    entity_id?: string;
    event_value?: number | null;
    metadata?: Record<string, unknown>;
  }) {
    return apiFetch<{
      event_id: string;
      event_name: string;
      event_time: string;
    }>(
      `/api/v1/events`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      {
        event_id: `mock_${Date.now()}`,
        event_name: payload.event_name,
        event_time: new Date().toISOString(),
      }
    );
  },

  getCustomerSuccessQueue() {
    return apiFetch<CustomerSuccessQueueDto>(
      `/admin/v1/customer-success/queue?status=open&limit=50`,
      {},
      mockCustomerSuccessQueue
    );
  },
};
