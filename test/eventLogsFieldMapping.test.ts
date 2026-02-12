/**
 * 事件记录字段映射测试
 * 验证服务器返回的字段能正确转换为 App 端期望的格式
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DeviceService } from "../services/DeviceService";

describe("事件记录字段映射", () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  it("应该正确转换事件记录的字段名称", () => {
    const events: any[] = [];
    service.on("events_result", (_, data) => events.push(data));

    // 模拟服务器返回的格式（使用 event_type 和 created_at）
    const serverResponse = {
      type: "query_result",
      target: "events",
      status: "success" as const,
      data: {
        records: [
          {
            id: 501,
            event_type: "bell", // 服务器字段
            param: 1,
            created_at: "2024-12-11T10:30:00", // 服务器字段
          },
          {
            id: 502,
            event_type: "pir_trigger",
            param: 0,
            created_at: "2024-12-11T10:31:00",
          },
        ],
        total: 2,
        limit: 100,
        offset: 0,
      },
    };

    // 调用处理方法
    (service as any).handleQueryResult(serverResponse);

    // 验证转换后的数据
    expect(events).toHaveLength(1);
    expect(events[0].data).toHaveLength(2);

    // 验证字段已转换为 App 端格式
    expect(events[0].data[0]).toEqual({
      id: 501,
      event: "bell", // 已转换
      param: 1,
      timestamp: "2024-12-11T10:30:00", // 已转换
    });

    expect(events[0].data[1]).toEqual({
      id: 502,
      event: "pir_trigger",
      param: 0,
      timestamp: "2024-12-11T10:31:00",
    });
  });

  it("应该兼容旧格式（直接使用 event 和 timestamp）", () => {
    const events: any[] = [];
    service.on("events_result", (_, data) => events.push(data));

    // 模拟旧格式（直接使用 event 和 timestamp）
    const oldFormatResponse = {
      type: "query_result",
      target: "events",
      status: "success" as const,
      data: {
        records: [
          {
            id: 503,
            event: "door_open", // 旧字段
            param: 0,
            timestamp: "2024-12-11T10:32:00", // 旧字段
          },
        ],
        total: 1,
      },
    };

    (service as any).handleQueryResult(oldFormatResponse);

    expect(events).toHaveLength(1);
    expect(events[0].data[0]).toEqual({
      id: 503,
      event: "door_open",
      param: 0,
      timestamp: "2024-12-11T10:32:00",
    });
  });

  it("应该正确转换开锁记录的字段名称", () => {
    const logs: any[] = [];
    service.on("unlock_logs_result", (_, data) => logs.push(data));

    // 模拟服务器返回的格式
    const serverResponse = {
      type: "query_result",
      target: "unlock_logs",
      status: "success" as const,
      data: {
        records: [
          {
            id: 201,
            method: "finger",
            user_id: 5, // 服务器字段
            result: 1, // 服务器字段：1=成功
            fail_count: 0,
            created_at: "2024-12-11T10:30:00", // 服务器字段
          },
          {
            id: 202,
            method: "password",
            user_id: 3,
            result: 0, // 服务器字段：0=失败
            fail_count: 1,
            created_at: "2024-12-11T10:31:00",
          },
        ],
        total: 2,
      },
    };

    (service as any).handleQueryResult(serverResponse);

    expect(logs).toHaveLength(1);
    expect(logs[0].data).toHaveLength(2);

    // 验证字段已转换
    expect(logs[0].data[0]).toMatchObject({
      id: 201,
      method: "finger",
      uid: 5, // 已转换
      status: "success", // 已转换
      timestamp: "2024-12-11T10:30:00", // 已转换
    });

    expect(logs[0].data[1]).toMatchObject({
      id: 202,
      method: "password",
      uid: 3,
      status: "fail", // 已转换
      timestamp: "2024-12-11T10:31:00",
    });
  });

  it("应该处理缺失 param 字段的事件记录", () => {
    const events: any[] = [];
    service.on("events_result", (_, data) => events.push(data));

    const serverResponse = {
      type: "query_result",
      target: "events",
      status: "success" as const,
      data: {
        records: [
          {
            id: 504,
            event_type: "tamper",
            // param 字段缺失
            created_at: "2024-12-11T10:33:00",
          },
        ],
        total: 1,
      },
    };

    (service as any).handleQueryResult(serverResponse);

    expect(events[0].data[0]).toEqual({
      id: 504,
      event: "tamper",
      param: 0, // 默认值
      timestamp: "2024-12-11T10:33:00",
    });
  });
});
