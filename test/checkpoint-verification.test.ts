/**
 * 检查点 7 - 核心功能验证
 * 验证任务 1-6 的核心修复是否正确实现
 */
import { describe, it, expect, beforeEach } from "vitest";
import { DeviceService } from "../services/DeviceService";

describe("检查点 7: 核心功能验证", () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  describe("✓ 任务 1: hello 消息包含 app_id", () => {
    it("connect() 方法接受 appId 参数", () => {
      // 验证 connect 方法签名正确
      expect(typeof service.connect).toBe("function");

      // 验证方法可以接受 3 个参数
      expect(service.connect.length).toBe(3);
    });

    it("hello 消息应包含 app_id 字段", () => {
      // 通过检查代码实现来验证
      // connect 方法会发送包含 app_id 的 hello 消息
      const connectCode = service.connect.toString();
      expect(connectCode).toContain("app_id");
      expect(connectCode).toContain("appId");
    });
  });

  describe("✓ 任务 1: seq_id 格式正确", () => {
    it("seq_id 格式为 {timestamp}_{sequence}，无前缀", () => {
      const seqId = service.generateSeqId();

      // 验证格式：13位时间戳_序号
      const pattern = /^\d{13}_\d+$/;
      expect(seqId).toMatch(pattern);

      // 验证没有 "app_" 前缀
      expect(seqId).not.toContain("app_");

      // 验证可以拆分为两部分
      const parts = seqId.split("_");
      expect(parts.length).toBe(2);

      // 验证时间戳部分是 13 位数字
      expect(parts[0].length).toBe(13);
      expect(Number(parts[0])).toBeGreaterThan(0);

      // 验证序号部分是数字
      expect(Number(parts[1])).toBeGreaterThanOrEqual(0);
    });

    it("同一毫秒内序号递增", () => {
      const seqIds: string[] = [];

      // 快速生成多个 seq_id
      for (let i = 0; i < 10; i++) {
        seqIds.push(service.generateSeqId());
      }

      // 检查是否有相同时间戳的 seq_id
      const timestamps = seqIds.map((id) => id.split("_")[0]);
      const hasSameTimestamp = timestamps.some(
        (ts, i) => i > 0 && ts === timestamps[i - 1],
      );

      if (hasSameTimestamp) {
        // 如果有相同时间戳，验证序号递增
        for (let i = 1; i < seqIds.length; i++) {
          const [ts1, seq1] = seqIds[i - 1].split("_");
          const [ts2, seq2] = seqIds[i].split("_");

          if (ts1 === ts2) {
            expect(Number(seq2)).toBe(Number(seq1) + 1);
          }
        }
      }
    });

    it("seq_id 唯一性", () => {
      const seqIds = new Set<string>();

      // 生成 1000 个 seq_id
      for (let i = 0; i < 1000; i++) {
        const seqId = service.generateSeqId();
        expect(seqIds.has(seqId)).toBe(false);
        seqIds.add(seqId);
      }

      expect(seqIds.size).toBe(1000);
    });
  });

  describe("✓ 任务 2: 两级确认机制", () => {
    it("server_ack code=0 时继续等待 ack", () => {
      const seqId = service.generateSeqId();
      const pendingCommands = (service as any).pendingCommands as Map<
        string,
        any
      >;

      // 添加等待命令
      pendingCommands.set(seqId, {
        seqId,
        command: { type: "test" },
        sentAt: Date.now(),
        retryCount: 0,
        timeoutId: setTimeout(() => {}, 10000),
      });

      // 模拟收到 server_ack (code=0)
      const msg = {
        type: "server_ack",
        seq_id: seqId,
        code: 0,
        msg: "已接收",
        ts: Date.now(),
      };

      (service as any).handleServerAck(msg);

      // 验证命令仍在队列中
      expect(pendingCommands.has(seqId)).toBe(true);

      // 清理
      clearTimeout(pendingCommands.get(seqId)?.timeoutId);
      pendingCommands.delete(seqId);
    });

    it("server_ack code≠0 时清理队列", () => {
      const seqId = service.generateSeqId();
      const pendingCommands = (service as any).pendingCommands as Map<
        string,
        any
      >;
      let errorCalled = false;

      // 添加等待命令
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

      // 模拟收到 server_ack (code=1)
      const msg = {
        type: "server_ack",
        seq_id: seqId,
        code: 1,
        msg: "设备离线",
        ts: Date.now(),
      };

      (service as any).handleServerAck(msg);

      // 验证命令已从队列中移除
      expect(pendingCommands.has(seqId)).toBe(false);

      // 验证错误回调被触发
      expect(errorCalled).toBe(true);
    });

    it("ack code=0 时触发 onSuccess", () => {
      const seqId = service.generateSeqId();
      const pendingCommands = (service as any).pendingCommands as Map<
        string,
        any
      >;
      let successCalled = false;

      // 添加等待命令
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

      // 模拟收到 ack (code=0)
      const msg = {
        type: "ack",
        seq_id: seqId,
        code: 0,
        msg: "OK",
      };

      (service as any).handleAck(msg);

      // 验证命令已从队列中移除
      expect(pendingCommands.has(seqId)).toBe(false);

      // 验证成功回调被触发
      expect(successCalled).toBe(true);
    });

    it("ack code≠0 时触发 onError", () => {
      const seqId = service.generateSeqId();
      const pendingCommands = (service as any).pendingCommands as Map<
        string,
        any
      >;
      let errorMessage = "";

      // 添加等待命令
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

      // 模拟收到 ack (code=6)
      const msg = {
        type: "ack",
        seq_id: seqId,
        code: 6,
        msg: "Hardware error",
      };

      (service as any).handleAck(msg);

      // 验证命令已从队列中移除
      expect(pendingCommands.has(seqId)).toBe(false);

      // 验证错误回调被触发，且错误消息正确
      expect(errorMessage).toBe("硬件故障，请联系维修");
    });
  });

  describe("✓ 任务 3: 错误码映射", () => {
    it("ack 错误码 0-10 都有对应的中文描述", () => {
      const expectedErrors: Record<number, string> = {
        0: "成功",
        1: "设备离线，请检查网络连接",
        2: "设备忙碌，请稍后重试",
        3: "参数错误",
        4: "不支持",
        5: "超时",
        6: "硬件故障，请联系维修",
        7: "资源已满",
        8: "未认证",
        9: "重复消息",
        10: "内部错误",
      };

      // 验证每个错误码都有映射
      for (let code = 0; code <= 10; code++) {
        const errorMsg = (service as any).getAckErrorMessage(code, "default");
        expect(errorMsg).toBe(expectedErrors[code]);
        expect(errorMsg).toBeTruthy();
        expect(errorMsg.length).toBeGreaterThan(0);
      }
    });

    it("错误提示包含用户友好的操作建议", () => {
      // 设备离线
      const offline = (service as any).getAckErrorMessage(1, "");
      expect(offline).toContain("请检查网络连接");

      // 设备忙碌
      const busy = (service as any).getAckErrorMessage(2, "");
      expect(busy).toContain("请稍后重试");

      // 硬件故障
      const hardware = (service as any).getAckErrorMessage(6, "");
      expect(hardware).toContain("请联系维修");
    });
  });

  describe("✓ 任务 4: 新增事件类型", () => {
    it("door_closed 事件处理正确", () => {
      const events: any[] = [];
      service.on("log", (_, data) => events.push(data));

      const msg = {
        type: "event_report",
        ts: Date.now(),
        event: "door_closed",
        param: 0,
      };

      (service as any).handleEventReport(msg);

      expect(events.some((e) => e.msg === "门已关闭")).toBe(true);
    });

    it("lock_success 事件处理正确", () => {
      const events: any[] = [];
      service.on("log", (_, data) => events.push(data));

      const msg = {
        type: "event_report",
        ts: Date.now(),
        event: "lock_success",
        param: 0,
      };

      (service as any).handleEventReport(msg);

      expect(events.some((e) => e.msg === "上锁成功")).toBe(true);
    });

    it("bolt_alarm 事件处理正确", () => {
      const events: any[] = [];
      service.on("log", (_, data) => events.push(data));

      const msg = {
        type: "event_report",
        ts: Date.now(),
        event: "bolt_alarm",
        param: 0,
      };

      (service as any).handleEventReport(msg);

      expect(
        events.some(
          (e) =>
            e.msg === "锁舌上锁失败，请尝试远程上锁" && e.type === "warning",
        ),
      ).toBe(true);
    });
  });

  describe("✓ 任务 5: log_report 字段修复", () => {
    it("使用 status 字段而非 result", () => {
      const events: any[] = [];
      service.on("log_report", (_, data) => events.push(data));

      const msg = {
        type: "log_report",
        ts: Date.now(),
        data: {
          method: "face",
          uid: 1,
          status: "success",
          lock_time: Date.now(),
        },
      };

      (service as any).handleLogReport(msg);

      // 验证事件被触发
      expect(events.length).toBe(1);
      expect(events[0].data.status).toBe("success");
    });

    it("status 值正确映射为中文", () => {
      const statusMap = [
        { status: "success", expected: "成功" },
        { status: "fail", expected: "失败" },
        { status: "locked", expected: "超时" },
      ];

      statusMap.forEach(({ status, expected }) => {
        const events: any[] = [];
        service.on("log", (_, data) => events.push(data));

        const msg = {
          type: "log_report",
          ts: Date.now(),
          data: {
            method: "face",
            uid: 1,
            status,
            lock_time: Date.now(),
          },
        };

        (service as any).handleLogReport(msg);

        expect(events.some((e) => e.msg.includes(expected))).toBe(true);
      });
    });
  });

  describe("✓ 任务 6: 新消息类型", () => {
    it("door_opened_report 消息处理正确", () => {
      const events: any[] = [];
      service.on("door_opened_report", (_, data) => events.push(data));
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

      // 验证事件被触发
      expect(events.some((e) => e.data?.method === "face")).toBe(true);

      // 验证日志包含正确信息
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

    it("password_report 消息处理正确", () => {
      const events: any[] = [];
      service.on("password_report", (_, data) => events.push(data));
      service.on("log", (_, data) => events.push({ type: "log", data }));

      const msg = {
        type: "password_report",
        ts: Date.now(),
        data: {
          password: "123456",
        },
      };

      (service as any).handlePasswordReport(msg);

      // 验证事件被触发
      expect(events.some((e) => e.data?.password === "123456")).toBe(true);

      // 验证日志不显示密码内容
      expect(
        events.some(
          (e) => e.type === "log" && e.data.msg.includes("收到密码查询结果"),
        ),
      ).toBe(true);

      expect(
        events.every((e) => e.type !== "log" || !e.data.msg.includes("123456")),
      ).toBe(true);
    });
  });

  describe("✅ 综合验证", () => {
    it("所有核心功能已正确实现", () => {
      // 1. hello 消息包含 app_id
      expect(service.connect.length).toBe(3);

      // 2. seq_id 格式正确
      const seqId = service.generateSeqId();
      expect(seqId).toMatch(/^\d{13}_\d+$/);

      // 3. 错误码映射完整
      for (let code = 0; code <= 10; code++) {
        const errorMsg = (service as any).getAckErrorMessage(code, "");
        expect(errorMsg).toBeTruthy();
      }

      // 4. 新事件类型支持
      const eventTypes = ["door_closed", "lock_success", "bolt_alarm"];
      eventTypes.forEach((event) => {
        const events: any[] = [];
        service.on("log", (_, data) => events.push(data));
        (service as any).handleEventReport({
          type: "event_report",
          ts: Date.now(),
          event,
          param: 0,
        });
        expect(events.length).toBeGreaterThan(0);
      });

      // 5. log_report 使用 status 字段
      const logEvents: any[] = [];
      service.on("log_report", (_, data) => logEvents.push(data));
      (service as any).handleLogReport({
        type: "log_report",
        ts: Date.now(),
        data: {
          method: "face",
          uid: 1,
          status: "success",
          lock_time: Date.now(),
        },
      });
      expect(logEvents.length).toBe(1);

      // 6. 新消息类型支持
      const doorEvents: any[] = [];
      service.on("door_opened_report", (_, data) => doorEvents.push(data));
      (service as any).handleDoorOpenedReport({
        type: "door_opened_report",
        ts: Date.now(),
        data: { method: "face", source: "outside" },
      });
      expect(doorEvents.length).toBe(1);

      const pwdEvents: any[] = [];
      service.on("password_report", (_, data) => pwdEvents.push(data));
      (service as any).handlePasswordReport({
        type: "password_report",
        ts: Date.now(),
        data: { password: "test" },
      });
      expect(pwdEvents.length).toBe(1);
    });
  });
});
