const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deposit`;

export interface DepositRequest {
  amount: number;
}

export interface Deposit {
  id: string;
  ref_id: string;
  amount: number;
  final_amount: number;
  qr_string: string;
  qr_image: string;
  status: "unpaid" | "paid" | "expired";
  created_at: string;
  paid_at: string | null;
  expires_at: string;
}

export interface ApiResponse<T> {
  status: "success" | "error";
  data?: T;
  message?: string;
}

export async function createDeposit(
  apiId: string,
  apiKey: string,
  amount: number
): Promise<ApiResponse<Deposit>> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-id": apiId,
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ amount }),
  });

  return response.json();
}

export async function checkDeposit(
  apiId: string,
  apiKey: string,
  refId: string
): Promise<ApiResponse<Deposit>> {
  const response = await fetch(`${EDGE_FUNCTION_URL}?ref_id=${encodeURIComponent(refId)}`, {
    method: "GET",
    headers: {
      "x-api-id": apiId,
      "x-api-key": apiKey,
    },
  });

  return response.json();
}

export async function listDeposits(
  apiId: string,
  apiKey: string,
  options?: { status?: string; limit?: number }
): Promise<ApiResponse<Deposit[]>> {
  const params = new URLSearchParams();
  if (options?.status) params.set("status", options.status);
  if (options?.limit) params.set("limit", options.limit.toString());

  const url = params.toString() ? `${EDGE_FUNCTION_URL}?${params}` : EDGE_FUNCTION_URL;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-api-id": apiId,
      "x-api-key": apiKey,
    },
  });

  return response.json();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
