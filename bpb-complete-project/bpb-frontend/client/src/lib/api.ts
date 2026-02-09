/**
 * API Client for Block Preventer Bridge Backend
 * Uses relative paths — proxied through Vite dev server to FastAPI on port 8000
 */

const API_BASE = "/api/v1";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }
  return response.json();
}

// ========== PACKAGES ==========
export const packagesApi = {
  list: () => request<any[]>("/packages"),
  get: (id: string) => request<any>(`/packages/${id}`),
  create: (data: any) => request<any>("/packages", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) => request<any>(`/packages/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<any>(`/packages/${id}`, { method: "DELETE" }),
  stats: (id: string) => request<any>(`/packages/${id}/stats`),
};

// ========== PROFILES ==========
export const profilesApi = {
  list: (packageId: string) => request<any[]>(`/packages/${packageId}/profiles`),
  get: (packageId: string, profileId: string) => request<any>(`/packages/${packageId}/profiles/${profileId}`),
  create: (packageId: string, data: any) =>
    request<any>(`/packages/${packageId}/profiles`, { method: "POST", body: JSON.stringify(data) }),
  update: (packageId: string, profileId: string, data: any) =>
    request<any>(`/packages/${packageId}/profiles/${profileId}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (packageId: string, profileId: string) =>
    request<any>(`/packages/${packageId}/profiles/${profileId}`, { method: "DELETE" }),
  health: (packageId: string, profileId: string) =>
    request<any>(`/packages/${packageId}/profiles/${profileId}/health`),
  toggleStatus: (packageId: string, profileId: string, status: string) =>
    request<any>(`/packages/${packageId}/profiles/${profileId}/status?status=${status}`, { method: "PATCH" }),
};

// ========== MESSAGES ==========
export const messagesApi = {
  list: (packageId: string, params?: { status?: string; mode?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.mode) query.set("mode", params.mode);
    if (params?.limit) query.set("limit", String(params.limit));
    return request<any[]>(`/packages/${packageId}/messages?${query.toString()}`);
  },
  get: (packageId: string, messageId: string) => request<any>(`/packages/${packageId}/messages/${messageId}`),
  sendOpen: (packageId: string, data: any) =>
    request<any>(`/packages/${packageId}/messages/open`, { method: "POST", body: JSON.stringify(data) }),
  sendReply: (packageId: string, data: any) =>
    request<any>(`/packages/${packageId}/messages/reply`, { method: "POST", body: JSON.stringify(data) }),
  queueStatus: (packageId: string) => request<any>(`/packages/${packageId}/queue`),
  analytics: (packageId: string, days?: number) =>
    request<any>(`/packages/${packageId}/analytics?days=${days || 7}`),
};

// ========== ALERTS ==========
export const alertsApi = {
  list: (packageId?: string, unreadOnly?: boolean) => {
    const query = new URLSearchParams();
    if (packageId) query.set("package_id", packageId);
    if (unreadOnly) query.set("unread_only", "true");
    return request<any[]>(`/alerts?${query.toString()}`);
  },
  markRead: (alertId: string) => request<any>(`/alerts/${alertId}/read`, { method: "PATCH" }),
};

// ========== SYSTEM ==========
export const systemApi = {
  health: () => fetch("/health").then((r) => r.json()),
};
