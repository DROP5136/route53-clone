export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type HostedZone = {
  id: number;
  domain_name: string;
  zone_type: "public" | "private";
  description: string | null;
  created_at: string;
  updated_at: string;
  record_count: number;
};

export const recordTypes = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"] as const;

export type RecordTypeName = (typeof recordTypes)[number];

export type DNSRecord = {
  id: number;
  name: string;
  type: RecordTypeName;
  value: string;
  ttl: number;
  created_at: string;
  updated_at: string;
};

const TOKEN_KEY = "route53_access_token";

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function apiBaseUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new ApiError(0, "NEXT_PUBLIC_API_URL is not set");
  }
  return base.replace(/\/$/, "");
}

function errorMessage(data: unknown): string {
  if (!data || typeof data !== "object" || !("detail" in data)) {
    return "Request failed";
  }
  const detail = (data as { detail: unknown }).detail;
  if (typeof detail === "string" && detail) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail.map((item) => {
      if (!item || typeof item !== "object") {
        return "Request failed";
      }
      const record = item as { msg?: unknown; loc?: unknown };
      const message =
        typeof record.msg === "string" ? record.msg.replace(/^Value error,\s*/i, "") : "Request failed";
      const location = Array.isArray(record.loc)
        ? record.loc.filter((part) => part !== "body").map(String).join(".")
        : "";
      return location ? `${location}: ${message}` : message;
    });
    return messages.filter(Boolean).join(" ") || "Request failed";
  }
  return "Request failed";
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Unable to reach the API");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(data));
  }

  return data as T;
}
