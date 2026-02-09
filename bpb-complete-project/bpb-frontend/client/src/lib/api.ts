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
  list: (packageId: string, params?: { status?: string; mode?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.mode) query.set("mode", params.mode);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    return request<any[]>(`/packages/${packageId}/messages?${query.toString()}`);
  },
  get: (packageId: string, messageId: string) => request<any>(`/packages/${packageId}/messages/${messageId}`),
  sendOpen: (packageId: string, data: any) =>
    request<any>(`/packages/${packageId}/messages/open`, { method: "POST", body: JSON.stringify(data) }),
  sendReply: (packageId: string, data: any) =>
    request<any>(`/packages/${packageId}/messages/reply`, { method: "POST", body: JSON.stringify(data) }),
  schedule: (packageId: string, data: any) =>
    request<any>(`/packages/${packageId}/messages/schedule`, { method: "POST", body: JSON.stringify(data) }),
  listScheduled: (packageId: string) => request<any[]>(`/packages/${packageId}/messages/scheduled`),
  cancelScheduled: (packageId: string, messageId: string) =>
    request<any>(`/packages/${packageId}/messages/${messageId}/cancel`, { method: "DELETE" }),
  queueStatus: (packageId: string) => request<any>(`/packages/${packageId}/queue`),
  queueItems: (packageId: string, status?: string) => {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    return request<any[]>(`/packages/${packageId}/queue/items?${query.toString()}`);
  },
  analytics: (packageId: string, days?: number) =>
    request<any>(`/packages/${packageId}/analytics?days=${days || 7}`),
  checkBlocks: (packageId: string) => request<any[]>(`/packages/${packageId}/block-check`),
  riskPatterns: (packageId: string, profileId: string) =>
    request<any>(`/packages/${packageId}/profiles/${profileId}/risk-patterns`),
};

// ========== ALERTS ==========
export const alertsApi = {
  list: (packageId?: string, unreadOnly?: boolean) => {
    const query = new URLSearchParams();
    if (packageId) query.set("package_id", packageId);
    if (unreadOnly) query.set("unread_only", "true");
    return request<any[]>(`/alerts?${query.toString()}`);
  },
  count: () => request<any>("/alerts/count"),
  markRead: (alertId: string) => request<any>(`/alerts/${alertId}/read`, { method: "PATCH" }),
  markAllRead: (packageId?: string) => {
    const query = packageId ? `?package_id=${packageId}` : "";
    return request<any>(`/alerts/read-all${query}`, { method: "PATCH" });
  },
  delete: (alertId: string) => request<any>(`/alerts/${alertId}`, { method: "DELETE" }),
  deleteAll: (packageId?: string) => {
    const query = packageId ? `?package_id=${packageId}` : "";
    return request<any>(`/alerts/delete-all${query}`, { method: "DELETE" });
  },
};

// ========== SYSTEM / SETTINGS ==========
export const systemApi = {
  health: () => fetch("/health").then((r) => r.json()),
  getSettings: () => request<any>("/settings"),
  updateSettings: (data: any) => request<any>("/settings", { method: "PUT", body: JSON.stringify(data) }),
};
