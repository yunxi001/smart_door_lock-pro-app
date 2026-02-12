/**
 * 系统命令测试
 * 验证 sendSystemCommand() 方法和 system 响应处理
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeviceService } from "../services/DeviceService";

describe("系统命令功能", () => {
  let service: DeviceService;
  let mockWs: any;

  beforeEach(() => {
    service = new DeviceService();

    // 模拟 WebSocket
    mockWs = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.OPEN,
    };

    // 注入模拟的 WebSocket
    (service as any).ws = mockWs;
  });

  describe("sendSystemCommand() 方法", () => {
    it("应该发送 start_monitor 命令并包含 record 字段", () => {
      service.sendSystemCommand("start_monitor", { record: true });

      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);

      expect(sentMessage.type).toBe("system");
      expect(sentMessage.command).toBe("start_monitor");
      expect(sentMessage.record).toBe(true);
      expect(sentMessage.seq_id).toBeDefined();
    });

    it("应该发送 stop_monitor 命令", () => {
      service.sendSystemCommand("stop_monitor");

      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);

      expect(sentMessage.type).toBe("system");
      expect(sentMessage.command).toBe("stop_monitor");
      expect(sentMessage.seq_id).toBeDefined();
    });

    it("应该记录发送系统命令的日志", () => {
      const logEvents: any[] = [];
      service.on("log", (type, data) => {
        logEvents.push(data);
      });

      service.sendSystemCommand("start_monitor", { record: true });

      expect(logEvents.length).toBeGreaterThan(0);
      const logMessage = logEvents.find((log) =>
        log.msg.includes("发送系统命令"),
      );
      expect(logMessage).toBeDefined();
      expect(logMessage.msg).toContain("启动监控");
    });
  });

  describe("system 响应处理", () => {
    it("应该处理成功响应并显示成功日志", () => {
      const logEvents: any[] = [];
      service.on("log", (type, data) => {
        logEvents.push(data);
      });

      // 模拟收到 system 成功响应
      const systemResponse = {
        type: "system",
        command: "start_monitor",
        status: "success",
      };

      (service as any).handleTextMessage(JSON.stringify(systemResponse));

      const successLog = logEvents.find(
        (log) => log.msg.includes("系统指令") && log.type === "success",
      );
      expect(successLog).toBeDefined();
      expect(successLog.msg).toContain("start_monitor");
      expect(successLog.msg).toContain("成功");
    });

    it("应该处理失败响应并显示错误日志", () => {
      const logEvents: any[] = [];
      service.on("log", (type, data) => {
        logEvents.push(data);
      });

      // 模拟收到 system 失败响应
      const systemResponse = {
        type: "system",
        command: "stop_monitor",
        status: "error",
      };

      (service as any).handleTextMessage(JSON.stringify(systemResponse));

      const errorLog = logEvents.find(
        (log) => log.msg.includes("系统指令") && log.type === "error",
      );
      expect(errorLog).toBeDefined();
      expect(errorLog.msg).toContain("stop_monitor");
      expect(errorLog.msg).toContain("失败");
    });

    it("应该根据 status 字段正确判断成功或失败", () => {
      const logEvents: any[] = [];
      service.on("log", (type, data) => {
        logEvents.push(data);
      });

      // 测试成功状态
      (service as any).handleTextMessage(
        JSON.stringify({
          type: "system",
          command: "start_monitor",
          status: "success",
        }),
      );

      // 测试失败状态
      (service as any).handleTextMessage(
        JSON.stringify({
          type: "system",
          command: "stop_monitor",
          status: "error",
        }),
      );

      const successLogs = logEvents.filter((log) => log.type === "success");
      const errorLogs = logEvents.filter((log) => log.type === "error");

      expect(successLogs.length).toBeGreaterThan(0);
      expect(errorLogs.length).toBeGreaterThan(0);
    });
  });

  describe("完整流程测试", () => {
    it("应该完整支持启动监控流程", () => {
      const logEvents: any[] = [];
      service.on("log", (type, data) => {
        logEvents.push(data);
      });

      // 1. 发送启动监控命令
      service.sendSystemCommand("start_monitor", { record: true });

      // 验证命令已发送
      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe("system");
      expect(sentMessage.command).toBe("start_monitor");
      expect(sentMessage.record).toBe(true);

      // 2. 模拟收到成功响应
      (service as any).handleTextMessage(
        JSON.stringify({
          type: "system",
          command: "start_monitor",
          status: "success",
        }),
      );

      // 验证日志记录
      const sendLog = logEvents.find((log) => log.msg.includes("发送系统命令"));
      const successLog = logEvents.find(
        (log) => log.msg.includes("系统指令") && log.type === "success",
      );

      expect(sendLog).toBeDefined();
      expect(successLog).toBeDefined();
    });

    it("应该完整支持停止监控流程", () => {
      const logEvents: any[] = [];
      service.on("log", (type, data) => {
        logEvents.push(data);
      });

      // 1. 发送停止监控命令
      service.sendSystemCommand("stop_monitor");

      // 验证命令已发送
      expect(mockWs.send).toHaveBeenCalledTimes(1);
      const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
      expect(sentMessage.type).toBe("system");
      expect(sentMessage.command).toBe("stop_monitor");

      // 2. 模拟收到成功响应
      (service as any).handleTextMessage(
        JSON.stringify({
          type: "system",
          command: "stop_monitor",
          status: "success",
        }),
      );

      // 验证日志记录
      const sendLog = logEvents.find((log) => log.msg.includes("发送系统命令"));
      const successLog = logEvents.find(
        (log) => log.msg.includes("系统指令") && log.type === "success",
      );

      expect(sendLog).toBeDefined();
      expect(successLog).toBeDefined();
    });
  });
});
