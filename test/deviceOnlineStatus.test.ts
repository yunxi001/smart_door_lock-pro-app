/**
 * 设备上下线通知处理测试
 * 验证需求 15.1, 15.2, 15.3, 15.4
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeviceService } from "../services/DeviceService";

describe("设备上下线通知处理", () => {
  let deviceService: DeviceService;
  let mockWs: any;
  let eventCallbacks: Map<string, Function>;

  beforeEach(() => {
    // 创建新的 DeviceService 实例
    deviceService = new DeviceService();
    eventCallbacks = new Map();

    // Mock WebSocket
    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Mock WebSocket 构造函数
    global.WebSocket = vi.fn(() => mockWs) as any;
  });

  describe("15.1 验证 handleDeviceStatus() 方法", () => {
    it('应该在收到 online 消息时显示"设备已上线"', (done) => {
      // 订阅 log 事件
      deviceService.on("log", (type, data) => {
        if (data.msg.includes("已上线")) {
          expect(data.msg).toContain("设备");
          expect(data.msg).toContain("已上线");
          expect(data.type).toBe("success");
          done();
        }
      });

      // 连接设备
      deviceService.connect("ws://test", "device1", "app1");

      // 触发 onopen
      if (mockWs.onopen) {
        mockWs.onopen();
      }

      // 模拟收到 device_status 消息 (online)
      const onlineMsg = {
        type: "device_status",
        status: "online",
        device_id: "device1",
        ts: Date.now(),
      };

      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(onlineMsg) });
      }
    });

    it('应该在收到 offline 消息时显示"设备已离线"', (done) => {
      // 订阅 log 事件
      deviceService.on("log", (type, data) => {
        if (data.msg.includes("已离线")) {
          expect(data.msg).toContain("设备");
          expect(data.msg).toContain("已离线");
          expect(data.type).toBe("warning");
          done();
        }
      });

      // 连接设备
      deviceService.connect("ws://test", "device1", "app1");

      // 触发 onopen
      if (mockWs.onopen) {
        mockWs.onopen();
      }

      // 模拟收到 device_status 消息 (offline)
      const offlineMsg = {
        type: "device_status",
        status: "offline",
        device_id: "device1",
        ts: Date.now(),
        reason: "网络断开",
      };

      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(offlineMsg) });
      }
    });

    it("应该触发 device_status 事件", (done) => {
      // 订阅 device_status 事件
      deviceService.on("device_status", (type, data) => {
        expect(data.status).toBe("online");
        expect(data.device_id).toBe("device1");
        expect(data.ts).toBeDefined();
        done();
      });

      // 连接设备
      deviceService.connect("ws://test", "device1", "app1");

      // 触发 onopen
      if (mockWs.onopen) {
        mockWs.onopen();
      }

      // 模拟收到 device_status 消息
      const statusMsg = {
        type: "device_status",
        status: "online",
        device_id: "device1",
        ts: Date.now(),
      };

      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(statusMsg) });
      }
    });

    it("应该在离线消息中包含 reason 字段", (done) => {
      // 订阅 log 事件
      deviceService.on("log", (type, data) => {
        if (data.msg.includes("已离线")) {
          expect(data.msg).toContain("网络超时");
          done();
        }
      });

      // 连接设备
      deviceService.connect("ws://test", "device1", "app1");

      // 触发 onopen
      if (mockWs.onopen) {
        mockWs.onopen();
      }

      // 模拟收到 device_status 消息 (offline with reason)
      const offlineMsg = {
        type: "device_status",
        status: "offline",
        device_id: "device1",
        ts: Date.now(),
        reason: "网络超时",
      };

      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(offlineMsg) });
      }
    });
  });

  describe("15.2 UI 状态更新逻辑", () => {
    it("应该在设备上线时更新设备状态为 online", (done) => {
      let statusUpdateCount = 0;

      // 订阅 device_status 事件
      deviceService.on("device_status", (type, data) => {
        statusUpdateCount++;

        if (statusUpdateCount === 1) {
          // 第一次更新：设备上线
          expect(data.status).toBe("online");
          done();
        }
      });

      // 连接设备
      deviceService.connect("ws://test", "device1", "app1");

      // 触发 onopen
      if (mockWs.onopen) {
        mockWs.onopen();
      }

      // 模拟收到 device_status 消息 (online)
      const onlineMsg = {
        type: "device_status",
        status: "online",
        device_id: "device1",
        ts: Date.now(),
      };

      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(onlineMsg) });
      }
    });

    it("应该在设备离线时更新设备状态为 offline", (done) => {
      // 订阅 device_status 事件
      deviceService.on("device_status", (type, data) => {
        if (data.status === "offline") {
          expect(data.status).toBe("offline");
          expect(data.reason).toBe("心跳超时");
          done();
        }
      });

      // 连接设备
      deviceService.connect("ws://test", "device1", "app1");

      // 触发 onopen
      if (mockWs.onopen) {
        mockWs.onopen();
      }

      // 模拟收到 device_status 消息 (offline)
      const offlineMsg = {
        type: "device_status",
        status: "offline",
        device_id: "device1",
        ts: Date.now(),
        reason: "心跳超时",
      };

      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(offlineMsg) });
      }
    });

    it("应该在设备状态变化时触发多次事件", (done) => {
      const statusChanges: string[] = [];

      // 订阅 device_status 事件
      deviceService.on("device_status", (type, data) => {
        statusChanges.push(data.status);

        if (statusChanges.length === 2) {
          expect(statusChanges).toEqual(["online", "offline"]);
          done();
        }
      });

      // 连接设备
      deviceService.connect("ws://test", "device1", "app1");

      // 触发 onopen
      if (mockWs.onopen) {
        mockWs.onopen();
      }

      // 模拟设备上线
      const onlineMsg = {
        type: "device_status",
        status: "online",
        device_id: "device1",
        ts: Date.now(),
      };

      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(onlineMsg) });
      }

      // 延迟后模拟设备离线
      setTimeout(() => {
        const offlineMsg = {
          type: "device_status",
          status: "offline",
          device_id: "device1",
          ts: Date.now(),
        };

        if (mockWs.onmessage) {
          mockWs.onmessage({ data: JSON.stringify(offlineMsg) });
        }
      }, 10);
    });
  });

  describe("集成测试：设备上下线完整流程", () => {
    it("应该正确处理设备从上线到离线的完整流程", (done) => {
      const events: Array<{ type: string; data: any }> = [];

      // 订阅所有相关事件
      deviceService.on("device_status", (type, data) => {
        events.push({ type: "device_status", data });
      });

      deviceService.on("log", (type, data) => {
        if (data.msg.includes("已上线") || data.msg.includes("已离线")) {
          events.push({ type: "log", data });
        }
      });

      // 连接设备
      deviceService.connect("ws://test", "device1", "app1");

      // 触发 onopen
      if (mockWs.onopen) {
        mockWs.onopen();
      }

      // 模拟设备上线
      const onlineMsg = {
        type: "device_status",
        status: "online",
        device_id: "device1",
        ts: Date.now(),
      };

      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(onlineMsg) });
      }

      // 延迟后模拟设备离线
      setTimeout(() => {
        const offlineMsg = {
          type: "device_status",
          status: "offline",
          device_id: "device1",
          ts: Date.now(),
          reason: "网络断开",
        };

        if (mockWs.onmessage) {
          mockWs.onmessage({ data: JSON.stringify(offlineMsg) });
        }

        // 验证事件序列
        setTimeout(() => {
          // 应该有 4 个事件：2 个 device_status + 2 个 log
          expect(events.length).toBeGreaterThanOrEqual(4);

          // 验证第一个 device_status 事件（上线）
          const firstStatusEvent = events.find(
            (e) => e.type === "device_status" && e.data.status === "online",
          );
          expect(firstStatusEvent).toBeDefined();

          // 验证第二个 device_status 事件（离线）
          const secondStatusEvent = events.find(
            (e) => e.type === "device_status" && e.data.status === "offline",
          );
          expect(secondStatusEvent).toBeDefined();

          // 验证上线日志
          const onlineLog = events.find(
            (e) => e.type === "log" && e.data.msg.includes("已上线"),
          );
          expect(onlineLog).toBeDefined();
          expect(onlineLog?.data.type).toBe("success");

          // 验证离线日志
          const offlineLog = events.find(
            (e) => e.type === "log" && e.data.msg.includes("已离线"),
          );
          expect(offlineLog).toBeDefined();
          expect(offlineLog?.data.type).toBe("warning");
          expect(offlineLog?.data.msg).toContain("网络断开");

          done();
        }, 50);
      }, 20);
    });
  });
});
