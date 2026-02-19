/**
 * DeviceService 测试
 * Feature: smart-doorlock-app
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { DeviceService } from "../services/DeviceService";

describe("DeviceService", () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  describe("seq_id 生成", () => {
    it("Property 14: seq_id 自动生成", () => {
      fc.assert(
        fc.property(fc.nat(1000), () => {
          const seqId = service.generateSeqId();
          expect(seqId).toBeDefined();
          expect(typeof seqId).toBe("string");
          expect(seqId.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });

    it("Property 15: seq_id 格式规范 (简化格式)", () => {
      fc.assert(
        fc.property(fc.nat(100), () => {
          const seqId = service.generateSeqId();
          // 新格式: {timestamp}_{sequence}
          const pattern = /^\d+_\d+$/;
          expect(seqId).toMatch(pattern);
          const parts = seqId.split("_");
          expect(parts.length).toBe(2);
          expect(Number(parts[0])).toBeGreaterThan(0); // 时间戳
          expect(Number(parts[1])).toBeGreaterThanOrEqual(0); // 序号
        }),
        { numRuns: 100 },
      );
    });

    it("seq_id 应该唯一递增", () => {
      const seqIds = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const seqId = service.generateSeqId();
        expect(seqIds.has(seqId)).toBe(false);
        seqIds.add(seqId);
      }
    });
  });

  describe("server_ack 处理", () => {
    it("server_ack code=0 时继续等待 ESP32 ack", () => {
      // 模拟添加一个等待中的命令
      const seqId = service.generateSeqId();
      const pendingCommands = (service as any).pendingCommands as Map<
        string,
        any
      >;
      pendingCommands.set(seqId, {
        seqId,
        command: { type: "test" },
        sentAt: Date.now(),
        retryCount: 0,
        timeoutId: setTimeout(() => {}, 10000),
      });

      const events: any[] = [];
      service.on("log", (_, data) => events.push({ type: "log", data }));

      const msg = {
        type: "server_ack",
        seq_id: seqId,
        code: 0,
        msg: "已接收",
        ts: Date.now(),
      };
      (service as any).handleServerAck(msg);

      // code=0 时不应清理队列，继续等待 ESP32 ack
      expect(pendingCommands.has(seqId)).toBe(true);
      expect(
        events.some(
          (e) => e.type === "log" && e.data.msg.includes("服务器已确认命令"),
        ),
      ).toBe(true);

      // 清理
      clearTimeout(pendingCommands.get(seqId)?.timeoutId);
      pendingCommands.delete(seqId);
    });

    it("server_ack code=3 时清理等待队列（参数错误）", () => {
      const seqId = service.generateSeqId();
      const pendingCommands = (service as any).pendingCommands as Map<
        string,
        any
      >;
      let errorCalled = false;

      pendingCommands.set(seqId, {
        seqId,
        command: { type: "test" },
        sentAt: Date.now(),
        retryCount: 0,
        timeoutId: setTimeout(() => {}, 10000),
        onError: () => {
          errorCalled = true;
        },
      });

      const events: any[] = [];
      service.on("log", (_, data) => events.push({ type: "log", data }));

      const msg = {
        type: "server_ack",
        seq_id: seqId,
        code: 3, // 参数错误（v2.4）
        msg: "参数不正确",
        ts: Date.now(),
      };
      (service as any).handleServerAck(msg);

      // code=3 时应清理队列并触发 onError
      expect(pendingCommands.has(seqId)).toBe(false);
      expect(errorCalled).toBe(true);
      expect(
        events.some((e) => e.type === "log" && e.data.msg.includes("参数错误")),
      ).toBe(true);
    });

    it("server_ack code=8 时清理等待队列（未认证）", () => {
      const seqId = service.generateSeqId();
      const pendingCommands = (service as any).pendingCommands as Map<
        string,
        any
      >;
      let errorCalled = false;

      pendingCommands.set(seqId, {
        seqId,
        command: { type: "test" },
        sentAt: Date.now(),
        retryCount: 0,
        timeoutId: setTimeout(() => {}, 10000),
        onError: () => {
          errorCalled = true;
        },
      });

      const events: any[] = [];
      service.on("log", (_, data) => events.push({ type: "log", data }));

      const msg = {
        type: "server_ack",
        seq_id: seqId,
        code: 8, // 未认证（v2.4）
        msg: "未认证",
        ts: Date.now(),
      };
      (service as any).handleServerAck(msg);

      // code=8 时应清理队列并触发 onError
      expect(pendingCommands.has(seqId)).toBe(false);
      expect(errorCalled).toBe(true);
      expect(
        events.some((e) => e.type === "log" && e.data.msg.includes("未认证")),
      ).toBe(true);
    });

    it("server_ack code=9 时清理队列但不触发错误（重复消息）", () => {
      const seqId = service.generateSeqId();
      const pendingCommands = (service as any).pendingCommands as Map<
        string,
        any
      >;
      let errorCalled = false;

      pendingCommands.set(seqId, {
        seqId,
        command: { type: "test" },
        sentAt: Date.now(),
        retryCount: 0,
        timeoutId: setTimeout(() => {}, 10000),
        onError: () => {
          errorCalled = true;
        },
      });

      const events: any[] = [];
      service.on("log", (_, data) => events.push({ type: "log", data }));

      const msg = {
        type: "server_ack",
        seq_id: seqId,
        code: 9, // 重复消息（v2.4）
        msg: "重复消息",
        ts: Date.now(),
      };
      (service as any).handleServerAck(msg);

      // code=9 时应清理队列但不触发 onError
      expect(pendingCommands.has(seqId)).toBe(false);
      expect(errorCalled).toBe(false);
      expect(
        events.some(
          (e) => e.type === "log" && e.data.msg.includes("检测到重复消息"),
        ),
      ).toBe(true);
    });
  });

  describe("ESP32 ack 处理", () => {
    it("ack code=0 时触发 onSuccess 回调", () => {
      const seqId = service.generateSeqId();
      const pendingCommands = (service as any).pendingCommands as Map<
        string,
        any
      >;
      let successCalled = false;

      pendingCommands.set(seqId, {
        seqId,
        command: { type: "test" },
        sentAt: Date.now(),
        retryCount: 0,
        timeoutId: setTimeout(() => {}, 10000),
        onSuccess: () => {
          successCalled = true;
        },
      });

      const events: any[] = [];
      service.on("ack", (_, data) => events.push({ type: "ack", data }));
      service.on("log", (_, data) => events.push({ type: "log", data }));

      const msg = {
        type: "ack",
        seq_id: seqId,
        code: 0,
        msg: "OK",
      };
      (service as any).handleAck(msg);

      expect(successCalled).toBe(true);
      expect(pendingCommands.has(seqId)).toBe(false);
      expect(events.some((e) => e.type === "ack")).toBe(true);
      expect(
        events.some((e) => e.type === "log" && e.data.msg.includes("执行成功")),
      ).toBe(true);
    });

    it("ack code≠0 时触发 onError 回调", () => {
      const seqId = service.generateSeqId();
      const pendingCommands = (service as any).pendingCommands as Map<
        string,
        any
      >;
      let errorMessage = "";

      pendingCommands.set(seqId, {
        seqId,
        command: { type: "test" },
        sentAt: Date.now(),
        retryCount: 0,
        timeoutId: setTimeout(() => {}, 10000),
        onError: (msg: string) => {
          errorMessage = msg;
        },
      });

      const events: any[] = [];
      service.on("ack", (_, data) => events.push({ type: "ack", data }));
      service.on("log", (_, data) => events.push({ type: "log", data }));

      const msg = {
        type: "ack",
        seq_id: seqId,
        code: 6, // 硬件故障
        msg: "Hardware error",
      };
      (service as any).handleAck(msg);

      expect(errorMessage).toBe("硬件故障，请联系维修");
      expect(pendingCommands.has(seqId)).toBe(false);
      expect(
        events.some((e) => e.type === "log" && e.data.type === "error"),
      ).toBe(true);
    });

    it("ack 错误码映射正确", () => {
      const errorMap: Record<number, string> = {
        0: "成功",
        1: "设备离线，请检查网络连接",
        2: "设备忙碌，请稍后重试",
        3: "参数错误，请检查输入",
        4: "设备不支持该操作",
        5: "操作超时，请重试",
        6: "硬件故障，请联系维修",
        7: "存储空间已满，请清理后重试",
        8: "权限不足，请重新认证",
        9: "重复操作，已忽略",
        10: "设备内部错误，请重启设备",
      };

      Object.entries(errorMap).forEach(([code, expectedMsg]) => {
        const result = (service as any).getAckErrorMessage(
          Number(code),
          "default",
        );
        expect(result).toBe(expectedMsg);
      });
    });
  });

  describe("状态推送处理", () => {
    it("Property 4: 状态推送更新", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 1000 }),
          fc.constantFrom(0, 1),
          fc.constantFrom(0, 1),
          (bat, lux, lock, light) => {
            const events: any[] = [];
            service.on("status_report", (_, data) => events.push(data));
            const msg = {
              type: "status_report",
              ts: Date.now(),
              data: { bat, lux, lock, light },
            };
            (service as any).handleStatusReport(msg);
            expect(events.length).toBe(1);
            expect(events[0].battery).toBe(bat);
            expect(events[0].lux).toBe(lux);
            expect(events[0].lockState).toBe(lock);
            expect(events[0].lightState).toBe(light);
            expect(events[0].online).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("Property 5: 事件推送处理", () => {
      const eventTypes = [
        "bell",
        "pir_trigger",
        "tamper",
        "door_open",
        "door_closed",
        "lock_success",
        "bolt_alarm",
        "low_battery",
      ];
      fc.assert(
        fc.property(
          fc.constantFrom(...eventTypes),
          fc.integer({ min: 0, max: 100 }),
          (event, param) => {
            const events: any[] = [];
            service.on("event_report", (_, data) =>
              events.push({ type: "event_report", data }),
            );
            service.on("log", (_, data) => events.push({ type: "log", data }));
            const msg = { type: "event_report", ts: Date.now(), event, param };
            (service as any).handleEventReport(msg);
            expect(events.some((e) => e.type === "event_report")).toBe(true);
            const logEvent = events.find((e) => e.type === "log");
            expect(logEvent).toBeDefined();
            if (event === "bell") {
              expect(logEvent.data.msg).toContain("门铃");
            } else if (event === "tamper") {
              expect(logEvent.data.msg).toContain("撬锁");
              expect(logEvent.data.type).toBe("error");
            } else if (event === "low_battery") {
              expect(logEvent.data.msg).toContain("低电量");
              expect(logEvent.data.type).toBe("warning");
            } else if (event === "door_closed") {
              expect(logEvent.data.msg).toContain("门已关闭");
              expect(logEvent.data.type).toBe("info");
            } else if (event === "lock_success") {
              expect(logEvent.data.msg).toContain("上锁成功");
              expect(logEvent.data.type).toBe("info");
            } else if (event === "bolt_alarm") {
              expect(logEvent.data.msg).toContain("锁舌上锁失败");
              expect(logEvent.data.msg).toContain("远程上锁");
              expect(logEvent.data.type).toBe("warning");
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it("door_closed 事件处理正确", () => {
      const events: any[] = [];
      service.on("event_report", (_, data) =>
        events.push({ type: "event_report", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));
      const msg = {
        type: "event_report",
        ts: Date.now(),
        event: "door_closed",
        param: 0,
      };
      (service as any).handleEventReport(msg);
      expect(events.some((e) => e.type === "event_report")).toBe(true);
      expect(
        events.some((e) => e.type === "log" && e.data.msg === "门已关闭"),
      ).toBe(true);
    });

    it("lock_success 事件处理正确", () => {
      const events: any[] = [];
      service.on("event_report", (_, data) =>
        events.push({ type: "event_report", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));
      const msg = {
        type: "event_report",
        ts: Date.now(),
        event: "lock_success",
        param: 0,
      };
      (service as any).handleEventReport(msg);
      expect(events.some((e) => e.type === "event_report")).toBe(true);
      expect(
        events.some((e) => e.type === "log" && e.data.msg === "上锁成功"),
      ).toBe(true);
    });

    it("bolt_alarm 事件处理正确", () => {
      const events: any[] = [];
      service.on("event_report", (_, data) =>
        events.push({ type: "event_report", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));
      const msg = {
        type: "event_report",
        ts: Date.now(),
        event: "bolt_alarm",
        param: 0,
      };
      (service as any).handleEventReport(msg);
      expect(events.some((e) => e.type === "event_report")).toBe(true);
      expect(
        events.some(
          (e) =>
            e.type === "log" && e.data.msg === "锁舌上锁失败，请尝试远程上锁",
        ),
      ).toBe(true);
      expect(
        events.some((e) => e.type === "log" && e.data.type === "warning"),
      ).toBe(true);
    });

    it("Property 6: 开锁日志推送处理", () => {
      const methods = [
        "face",
        "fingerprint",
        "password",
        "nfc",
        "remote",
        "temp_code",
        "key",
      ];
      fc.assert(
        fc.property(
          fc.constantFrom(...methods),
          fc.integer({ min: 1, max: 100 }),
          fc.boolean(),
          fc.integer({ min: 0, max: 5 }),
          (method, uid, statusCode, lock_time) => {
            const status =
              statusCode === 0
                ? "success"
                : statusCode === 1
                  ? "fail"
                  : "locked";
            const events: any[] = [];
            service.on("log_report", (_, data) =>
              events.push({ type: "log_report", data }),
            );
            service.on("log", (_, data) => events.push({ type: "log", data }));
            const msg = {
              type: "log_report",
              ts: Date.now(),
              data: { method, uid, status, lock_time },
            };
            (service as any).handleLogReport(msg);
            expect(events.some((e) => e.type === "log_report")).toBe(true);
            const logEvent = events.find((e) => e.type === "log");
            expect(logEvent).toBeDefined();
            expect(logEvent.data.msg).toContain("开锁记录");
            if (status === "success") {
              expect(logEvent.data.type).toBe("success");
            } else {
              expect(logEvent.data.type).toBe("warning");
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("设备状态处理", () => {
    it("设备上线通知处理", () => {
      const events: any[] = [];
      service.on("device_status", (_, data) => events.push(data));
      service.on("log", (_, data) => events.push({ type: "log", data }));
      const msg = {
        type: "device_status",
        status: "online" as const,
        device_id: "test_device",
        ts: Date.now(),
      };
      (service as any).handleDeviceStatus(msg);
      expect(events.some((e) => e.status === "online")).toBe(true);
      expect(
        events.some((e) => e.type === "log" && e.data.msg.includes("已上线")),
      ).toBe(true);
    });

    it("设备离线通知处理", () => {
      const events: any[] = [];
      service.on("device_status", (_, data) => events.push(data));
      service.on("log", (_, data) => events.push({ type: "log", data }));
      const msg = {
        type: "device_status",
        status: "offline" as const,
        device_id: "test_device",
        ts: Date.now(),
        reason: "心跳超时",
      };
      (service as any).handleDeviceStatus(msg);
      expect(events.some((e) => e.status === "offline")).toBe(true);
      expect(
        events.some((e) => e.type === "log" && e.data.msg.includes("已离线")),
      ).toBe(true);
    });
  });

  describe("查询结果处理", () => {
    it("开锁记录查询结果处理", () => {
      const events: any[] = [];
      service.on("query_result", (_, data) =>
        events.push({ type: "query_result", data }),
      );
      service.on("unlock_logs_result", (_, data) =>
        events.push({ type: "unlock_logs_result", data }),
      );
      const msg = {
        type: "query_result",
        target: "unlock_logs",
        status: "success" as const,
        data: [
          {
            id: 1,
            method: "face",
            uid: 1,
            result: true,
            fail_count: 0,
            timestamp: "2024-01-01",
          },
        ],
        total: 1,
      };
      (service as any).handleQueryResult(msg);
      expect(events.some((e) => e.type === "query_result")).toBe(true);
      expect(events.some((e) => e.type === "unlock_logs_result")).toBe(true);
    });

    it("查询错误处理", () => {
      const events: any[] = [];
      service.on("query_result", (_, data) =>
        events.push({ type: "query_result", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));
      const msg = {
        type: "query_result",
        target: "unlock_logs",
        status: "error" as const,
        error: "数据库错误",
      };
      (service as any).handleQueryResult(msg);
      expect(
        events.some((e) => e.type === "log" && e.data.msg.includes("查询失败")),
      ).toBe(true);
    });
  });

  // 用户管理命令测试 (需求 11.8, 11.11, 12.8, 12.11, 13.7)
  describe("用户管理命令", () => {
    it("sendUserMgmtCommand 方法存在且可调用", () => {
      expect(typeof service.sendUserMgmtCommand).toBe("function");
    });

    it("指纹查询命令格式正确", () => {
      const events: any[] = [];
      service.on("log", (_, data) => events.push(data));
      service.sendUserMgmtCommand("finger", "query");
      expect(
        events.some((e) => e.msg.includes("指纹") && e.msg.includes("查询")),
      ).toBe(true);
    });

    it("NFC 卡片添加命令格式正确", () => {
      const events: any[] = [];
      service.on("log", (_, data) => events.push(data));
      service.sendUserMgmtCommand("nfc", "add", 0);
      expect(
        events.some((e) => e.msg.includes("NFC卡片") && e.msg.includes("添加")),
      ).toBe(true);
    });

    it("密码设置命令格式正确", () => {
      const events: any[] = [];
      service.on("log", (_, data) => events.push(data));
      service.sendUserMgmtCommand("password", "set", 0, "123456");
      expect(
        events.some((e) => e.msg.includes("密码") && e.msg.includes("设置")),
      ).toBe(true);
    });
  });

  // user_mgmt_result 处理测试 (需求 11.12, 12.12, 13.15)
  describe("user_mgmt_result 处理", () => {
    it("指纹管理结果触发 finger_result 事件", () => {
      const events: any[] = [];
      service.on("finger_result", (_, data) =>
        events.push({ type: "finger_result", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));
      // 使用服务器实际返回的格式：result 是布尔值
      const msg = {
        type: "user_mgmt_result",
        category: "finger" as const,
        command: "add",
        result: true, // 服务器返回布尔值
        val: 1,
        msg: "Success",
        user_id: 1,
        data: { id: 1, name: "测试指纹" },
      };
      (service as any).handleUserMgmtResult(msg);
      expect(events.some((e) => e.type === "finger_result")).toBe(true);
      expect(
        events.some(
          (e) =>
            e.type === "log" &&
            e.data.msg.includes("指纹") &&
            e.data.msg.includes("成功"),
        ),
      ).toBe(true);
    });

    it("NFC 卡片管理结果触发 nfc_result 事件", () => {
      const events: any[] = [];
      service.on("nfc_result", (_, data) =>
        events.push({ type: "nfc_result", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));
      // 使用服务器实际返回的格式：result 是布尔值
      const msg = {
        type: "user_mgmt_result",
        category: "nfc" as const,
        command: "query",
        result: true, // 服务器返回布尔值
        val: 1,
        msg: "Success",
        data: [{ id: 1, name: "测试卡片", card_id: "12345678" }],
      };
      (service as any).handleUserMgmtResult(msg);
      expect(events.some((e) => e.type === "nfc_result")).toBe(true);
      expect(
        events.some(
          (e) =>
            e.type === "log" &&
            e.data.msg.includes("NFC卡片") &&
            e.data.msg.includes("成功"),
        ),
      ).toBe(true);
    });

    it("密码管理结果触发 password_result 事件", () => {
      const events: any[] = [];
      service.on("password_result", (_, data) =>
        events.push({ type: "password_result", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));
      // 使用服务器实际返回的格式：result 是布尔值
      const msg = {
        type: "user_mgmt_result",
        category: "password" as const,
        command: "set",
        result: true, // 服务器返回布尔值
        val: 0,
        msg: "Success",
      };
      (service as any).handleUserMgmtResult(msg);
      expect(events.some((e) => e.type === "password_result")).toBe(true);
      expect(
        events.some(
          (e) =>
            e.type === "log" &&
            e.data.msg.includes("密码") &&
            e.data.msg.includes("成功"),
        ),
      ).toBe(true);
    });

    it("失败结果记录错误日志", () => {
      const events: any[] = [];
      service.on("finger_result", (_, data) =>
        events.push({ type: "finger_result", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));
      // 使用服务器实际返回的格式：result 是布尔值
      const msg = {
        type: "user_mgmt_result",
        category: "finger" as const,
        command: "add",
        result: false, // 服务器返回布尔值
        msg: "指纹传感器故障",
      };
      (service as any).handleUserMgmtResult(msg);
      expect(events.some((e) => e.type === "finger_result")).toBe(true);
      expect(
        events.some(
          (e) =>
            e.type === "log" &&
            e.data.type === "error" &&
            e.data.msg.includes("失败"),
        ),
      ).toBe(true);
    });

    it.skip("进度更新触发进度事件", () => {
      // 注意：当前实现中，进度更新不通过 user_mgmt_result 传递
      // 而是通过单独的进度事件机制
      // 此测试暂时跳过
      const events: any[] = [];
      service.on("finger_progress", (_, data) =>
        events.push({ type: "finger_progress", data }),
      );
      const msg = {
        type: "user_mgmt_result",
        category: "finger" as const,
        command: "add",
        result: true,
        progress: 50,
        msg: "请再次按压指纹",
      };
      (service as any).handleUserMgmtResult(msg);
      expect(
        events.some(
          (e) => e.type === "finger_progress" && e.data.progress === 50,
        ),
      ).toBe(true);
    });
  });

  // 媒体下载命令测试 (需求 15.1)
  describe("媒体下载命令", () => {
    it("sendMediaDownload 方法存在且可调用", () => {
      expect(typeof service.sendMediaDownload).toBe("function");
    });

    it("sendMediaDownloadChunk 方法存在且可调用", () => {
      expect(typeof service.sendMediaDownloadChunk).toBe("function");
    });

    it("媒体下载命令记录日志", () => {
      const events: any[] = [];
      service.on("log", (_, data) => events.push(data));
      service.sendMediaDownload(101);
      expect(
        events.some((e) => e.msg.includes("媒体文件") && e.msg.includes("101")),
      ).toBe(true);
    });

    it("分片下载命令记录日志", () => {
      const events: any[] = [];
      service.on("log", (_, data) => events.push(data));
      service.sendMediaDownloadChunk(100, 0, 1048576);
      expect(
        events.some((e) => e.msg.includes("媒体分片") && e.msg.includes("100")),
      ).toBe(true);
    });
  });

  // 媒体下载响应处理测试 (需求 15.2, 15.3)
  describe("媒体下载响应处理", () => {
    it("成功响应触发 media_download 事件", () => {
      const events: any[] = [];
      service.on("media_download", (_, data) =>
        events.push({ type: "media_download", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));
      const msg = {
        type: "media_download",
        file_id: 101,
        status: "success" as const,
        data: "base64encodeddata",
        file_size: 1024,
        file_type: "video/mp4",
      };
      (service as any).handleMediaDownload(msg);
      expect(
        events.some(
          (e) => e.type === "media_download" && e.data.fileId === 101,
        ),
      ).toBe(true);
      expect(
        events.some((e) => e.type === "log" && e.data.msg.includes("下载完成")),
      ).toBe(true);
    });

    it("失败响应记录错误日志", () => {
      const events: any[] = [];
      service.on("media_download", (_, data) =>
        events.push({ type: "media_download", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));
      const msg = {
        type: "media_download",
        file_id: 101,
        status: "error" as const,
        error: "文件不存在",
      };
      (service as any).handleMediaDownload(msg);
      expect(
        events.some(
          (e) => e.type === "media_download" && e.data.status === "error",
        ),
      ).toBe(true);
      expect(
        events.some(
          (e) =>
            e.type === "log" &&
            e.data.type === "error" &&
            e.data.msg.includes("下载失败"),
        ),
      ).toBe(true);
    });

    it("分片下载响应触发 media_download_chunk 事件", () => {
      const events: any[] = [];
      service.on("media_download_chunk", (_, data) =>
        events.push({ type: "media_download_chunk", data }),
      );
      service.on("media_download_progress", (_, data) =>
        events.push({ type: "media_download_progress", data }),
      );
      const msg = {
        type: "media_download_chunk",
        file_id: 100,
        chunk_index: 2,
        status: "success" as const,
        data: "base64chunkdata",
        chunk_size: 1048576,
        total_chunks: 10,
        is_last: false,
      };
      (service as any).handleMediaDownloadChunk(msg);
      expect(
        events.some(
          (e) => e.type === "media_download_chunk" && e.data.chunkIndex === 2,
        ),
      ).toBe(true);
      expect(
        events.some(
          (e) => e.type === "media_download_progress" && e.data.progress === 30,
        ),
      ).toBe(true);
    });

    it("最后一个分片触发完成日志", () => {
      const events: any[] = [];
      service.on("media_download_chunk", (_, data) =>
        events.push({ type: "media_download_chunk", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));
      const msg = {
        type: "media_download_chunk",
        file_id: 100,
        chunk_index: 9,
        status: "success" as const,
        data: "base64chunkdata",
        chunk_size: 1048576,
        total_chunks: 10,
        is_last: true,
      };
      (service as any).handleMediaDownloadChunk(msg);
      expect(
        events.some(
          (e) => e.type === "log" && e.data.msg.includes("分片下载完成"),
        ),
      ).toBe(true);
    });
  });

  // 新消息类型处理测试 (需求 5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4)
  describe("新消息类型处理", () => {
    it("door_opened_report 消息触发事件和日志", () => {
      const events: any[] = [];
      service.on("door_opened_report", (_, data) =>
        events.push({ type: "door_opened_report", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));

      const msg = {
        type: "door_opened_report",
        ts: Date.now(),
        data: {
          method: "face",
          source: "outside" as const,
        },
      };

      (service as any).handleDoorOpenedReport(msg);

      expect(events.some((e) => e.type === "door_opened_report")).toBe(true);
      expect(
        events.some(
          (e) =>
            e.type === "log" &&
            e.data.msg.includes("门已开启") &&
            e.data.msg.includes("人脸识别") &&
            e.data.msg.includes("外侧"),
        ),
      ).toBe(true);
    });

    it("door_opened_report 支持不同的开门方式", () => {
      const methods = [
        "face",
        "fingerprint",
        "password",
        "nfc",
        "remote",
        "key",
      ];

      methods.forEach((method) => {
        const events: any[] = [];
        service.on("log", (_, data) => events.push({ type: "log", data }));

        const msg = {
          type: "door_opened_report",
          ts: Date.now(),
          data: {
            method,
            source: "inside" as const,
          },
        };

        (service as any).handleDoorOpenedReport(msg);

        expect(
          events.some(
            (e) =>
              e.type === "log" &&
              e.data.msg.includes("门已开启") &&
              e.data.msg.includes("内侧"),
          ),
        ).toBe(true);
      });
    });

    it("door_opened_report 支持不同的来源", () => {
      const sources: Array<"outside" | "inside" | "unknown"> = [
        "outside",
        "inside",
        "unknown",
      ];
      const sourceTexts = ["外侧", "内侧", "未知"];

      sources.forEach((source, index) => {
        const events: any[] = [];
        service.on("log", (_, data) => events.push({ type: "log", data }));

        const msg = {
          type: "door_opened_report",
          ts: Date.now(),
          data: {
            method: "face",
            source,
          },
        };

        (service as any).handleDoorOpenedReport(msg);

        expect(
          events.some(
            (e) =>
              e.type === "log" &&
              e.data.msg.includes("门已开启") &&
              e.data.msg.includes(sourceTexts[index]),
          ),
        ).toBe(true);
      });
    });

    it("password_report 消息触发事件和日志", () => {
      const events: any[] = [];
      service.on("password_report", (_, data) =>
        events.push({ type: "password_report", data }),
      );
      service.on("log", (_, data) => events.push({ type: "log", data }));

      const msg = {
        type: "password_report",
        ts: Date.now(),
        data: {
          password: "123456",
        },
      };

      (service as any).handlePasswordReport(msg);

      expect(events.some((e) => e.type === "password_report")).toBe(true);
      expect(events[0].data.data.password).toBe("123456");
      expect(
        events.some(
          (e) => e.type === "log" && e.data.msg.includes("收到密码查询结果"),
        ),
      ).toBe(true);
    });

    it("password_report 日志不显示密码内容", () => {
      const events: any[] = [];
      service.on("log", (_, data) => events.push({ type: "log", data }));

      const msg = {
        type: "password_report",
        ts: Date.now(),
        data: {
          password: "123456",
        },
      };

      (service as any).handlePasswordReport(msg);

      // 确保日志中不包含密码
      expect(
        events.every((e) => e.type !== "log" || !e.data.msg.includes("123456")),
      ).toBe(true);
    });

    it("handleTextMessage 正确路由 door_opened_report", () => {
      const events: any[] = [];
      service.on("door_opened_report", (_, data) =>
        events.push({ type: "door_opened_report", data }),
      );

      const msgStr = JSON.stringify({
        type: "door_opened_report",
        ts: Date.now(),
        data: {
          method: "password",
          source: "outside",
        },
      });

      (service as any).handleTextMessage(msgStr);

      expect(events.some((e) => e.type === "door_opened_report")).toBe(true);
    });

    it("handleTextMessage 正确路由 password_report", () => {
      const events: any[] = [];
      service.on("password_report", (_, data) =>
        events.push({ type: "password_report", data }),
      );

      const msgStr = JSON.stringify({
        type: "password_report",
        ts: Date.now(),
        data: {
          password: "654321",
        },
      });

      (service as any).handleTextMessage(msgStr);

      expect(events.some((e) => e.type === "password_report")).toBe(true);
    });
  });
});
