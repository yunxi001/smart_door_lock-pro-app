// HTTP API 客户端 — 替代 WebSocket query 和 face_management
// 对应文档: docs/refactor_guide/05-HTTP-API实现规范更新版.md

import { DeviceStatus, Person, VisitRecord, EventLog, UnlockLog } from "../types";

const API_BASE = "http://192.168.1.100:8000";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface PaginatedData<T> {
  records: T[];
  total: number;
  limit?: number;
  offset?: number;
  page?: number;
  page_size?: number;
}

export class DoorlockApiService {
  private authToken: string | null = null;

  setToken(token: string): void {
    this.authToken = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    // FormData 不设 Content-Type，让浏览器自动设置 multipart boundary
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      throw new Error("认证已过期，请重新连接");
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // ===== Phase 1 端点 (Server已实现) =====

  // GET /api/doorlock/status?device_id=...
  async getDeviceStatus(deviceId: string): Promise<DeviceStatus> {
    const res = await this.request<ApiResponse<DeviceStatus>>(
      `/api/doorlock/status?device_id=${encodeURIComponent(deviceId)}`,
    );
    if (!res.success || !res.data) throw new Error(res.message || "获取状态失败");
    return res.data;
  }

  // GET /api/doorlock/faces
  async getPersons(page = 1, pageSize = 100): Promise<{ persons: Person[]; total: number }> {
    const res = await this.request<
      ApiResponse<PaginatedData<Person>>
    >(`/api/doorlock/faces?page=${page}&page_size=${pageSize}`);
    if (!res.success || !res.data) throw new Error(res.message || "获取人员列表失败");
    return {
      persons: res.data.records,
      total: res.data.total,
    };
  }

  // POST /api/doorlock/faces — multipart/form-data
  async registerFace(params: {
    name: string;
    relation_type?: string;
    permission?: string;
    images: File[];
  }): Promise<{ person_id: number }> {
    const form = new FormData();
    form.append("name", params.name);
    form.append("relation_type", params.relation_type || "other");
    if (params.permission) form.append("permission", params.permission);
    params.images.forEach((file) => form.append("images", file));

    const res = await this.request<ApiResponse<{ person_id: number }>>(
      "/api/doorlock/faces",
      { method: "POST", body: form },
    );
    if (!res.success || !res.data) throw new Error(res.message || "注册人脸失败");
    return res.data;
  }

  // DELETE /api/doorlock/faces/<id>
  async deletePerson(personId: number): Promise<void> {
    const res = await this.request<ApiResponse<null>>(
      `/api/doorlock/faces/${personId}`,
      { method: "DELETE" },
    );
    if (!res.success) throw new Error(res.message || "删除人员失败");
  }

  // PUT /api/doorlock/faces/<id>/permission
  async updatePermission(
    personId: number,
    permission: object,
  ): Promise<void> {
    const res = await this.request<ApiResponse<null>>(
      `/api/doorlock/faces/${personId}/permission`,
      {
        method: "PUT",
        body: JSON.stringify({ permission }),
      },
    );
    if (!res.success) throw new Error(res.message || "更新权限失败");
  }

  // GET /api/doorlock/visits?date_from=&date_to=&limit=&offset=
  async getVisits(params: {
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ visits: VisitRecord[]; total: number }> {
    const searchParams = new URLSearchParams();
    if (params.date_from) searchParams.set("date_from", params.date_from);
    if (params.date_to) searchParams.set("date_to", params.date_to);
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.offset) searchParams.set("offset", String(params.offset));

    const res = await this.request<
      ApiResponse<PaginatedData<VisitRecord>>
    >(`/api/doorlock/visits?${searchParams.toString()}`);
    if (!res.success || !res.data) throw new Error(res.message || "获取到访记录失败");
    return {
      visits: res.data.records,
      total: res.data.total,
    };
  }

  // ===== Phase 2 端点 (Server待实施，App端方法先定义完整) =====

  // GET /api/doorlock/events?device_id=&event_type=&limit=&offset=
  async getEvents(params: {
    deviceId: string;
    event_type?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ events: EventLog[]; total: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set("device_id", params.deviceId);
    if (params.event_type) searchParams.set("event_type", params.event_type);
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.offset) searchParams.set("offset", String(params.offset));

    const res = await this.request<
      ApiResponse<PaginatedData<EventLog>>
    >(`/api/doorlock/events?${searchParams.toString()}`);
    if (!res.success || !res.data) throw new Error(res.message || "获取事件记录失败");
    return {
      events: res.data.records,
      total: res.data.total,
    };
  }

  // GET /api/doorlock/unlock_logs?device_id=&method=&result=&limit=&offset=
  async getUnlockLogs(params: {
    deviceId: string;
    method?: string;
    result?: number;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: UnlockLog[]; total: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set("device_id", params.deviceId);
    if (params.method) searchParams.set("method", params.method);
    if (params.result !== undefined) searchParams.set("result", String(params.result));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.offset) searchParams.set("offset", String(params.offset));

    const res = await this.request<
      ApiResponse<PaginatedData<UnlockLog>>
    >(`/api/doorlock/unlock_logs?${searchParams.toString()}`);
    if (!res.success || !res.data) throw new Error(res.message || "获取开锁日志失败");
    return {
      logs: res.data.records,
      total: res.data.total,
    };
  }

  // GET /api/doorlock/password?device_id=...
  async getPassword(deviceId: string): Promise<string> {
    const res = await this.request<
      ApiResponse<{ password: string }>
    >(`/api/doorlock/password?device_id=${encodeURIComponent(deviceId)}`);
    if (!res.success || !res.data) throw new Error(res.message || "获取密码失败");
    return res.data.password;
  }

  // GET /api/doorlock/media?device_id=&file_type=&date_from=&date_to=&limit=&offset=
  async getMediaList(params: {
    deviceId: string;
    file_type?: string;
    date_from?: string;
    date_to?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ records: any[]; total: number }> {
    const searchParams = new URLSearchParams();
    searchParams.set("device_id", params.deviceId);
    if (params.file_type) searchParams.set("file_type", params.file_type);
    if (params.date_from) searchParams.set("date_from", params.date_from);
    if (params.date_to) searchParams.set("date_to", params.date_to);
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.offset) searchParams.set("offset", String(params.offset));

    const res = await this.request<
      ApiResponse<PaginatedData<any>>
    >(`/api/doorlock/media?${searchParams.toString()}`);
    if (!res.success || !res.data) throw new Error(res.message || "获取媒体列表失败");
    return { records: res.data.records, total: res.data.total };
  }

  // GET /api/doorlock/media/<id> — 返回 Blob（不是 base64）
  async downloadMedia(fileId: number): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    const res = await fetch(`${API_BASE}/api/doorlock/media/${fileId}`, { headers });
    if (res.status === 401) throw new Error("认证已过期，请重新连接");
    if (!res.ok) throw new Error(`下载失败: HTTP ${res.status}`);
    return res.blob();
  }

  // GET /api/doorlock/media/download?path=... — 用于 visit_notification 中的 image_path
  async downloadMediaByPath(filePath: string): Promise<Blob> {
    const headers: Record<string, string> = {};
    if (this.authToken) {
      headers["Authorization"] = `Bearer ${this.authToken}`;
    }

    const res = await fetch(
      `${API_BASE}/api/doorlock/media/download?path=${encodeURIComponent(filePath)}`,
      { headers },
    );
    if (res.status === 401) throw new Error("认证已过期，请重新连接");
    if (!res.ok) throw new Error(`下载失败: HTTP ${res.status}`);
    return res.blob();
  }
}

export const doorlockApiService = new DoorlockApiService();
