/**
 * DeviceService v2.5 查询方法单元测试
 * 测试访客意图和快递警报的查询功能
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeviceService } from "@/services/DeviceService";

describe("DeviceService - v2.5 查询方法", () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  describe("queryVisitorIntents()", () => {
    it("应构造正确的访客意图查询消息", () => {
      // 监听 sendCommand 调用
      const sendCommandSpy = vi.spyOn(service, "sendCommand");

      // 调用查询方法
      service.queryVisitorIntents({
        start_date: "2024-12-01T00:00:00Z",
        end_date: "2024-12-31T23:59:59Z",
        limit: 20,
        offset: 0,
      });

      // 验证 sendCommand 被调用，且参数正确
      expect(sendCommandSpy).toHaveBeenCalledWith({
        type: "query",
        target: "visitor_intents",
        data: {
          start_date: "2024-12-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
          limit: 20,
          offset: 0,
        },
      });
    });

    it("应支持可选参数", () => {
      const sendCommandSpy = vi.spyOn(service, "sendCommand");

      // 只传递 limit 参数
      service.queryVisitorIntents({
        limit: 5,
      });

      expect(sendCommandSpy).toHaveBeenCalledWith({
        type: "query",
        target: "visitor_intents",
        data: {
          limit: 5,
        },
      });
    });

    it("应返回命令序列号", () => {
      // 模拟 sendCommand 返回序列号
      vi.spyOn(service, "sendCommand").mockReturnValue("seq_123");

      const seqId = service.queryVisitorIntents({ limit: 10 });

      expect(seqId).toBe("seq_123");
    });

    it("应记录查询日志", () => {
      const logEvents: any[] = [];
      service.on("log", (_, data) => {
        logEvents.push(data);
      });

      service.queryVisitorIntents({ limit: 10 });

      // 过滤出 info 类型的日志（排除未连接的错误日志）
      const infoLogs = logEvents.filter((log) => log.type === "info");
      expect(infoLogs).toHaveLength(1);
      expect(infoLogs[0].msg).toContain("查询访客意图历史");
    });
  });

  describe("queryPackageAlerts()", () => {
    it("应构造正确的快递警报查询消息", () => {
      const sendCommandSpy = vi.spyOn(service, "sendCommand");

      service.queryPackageAlerts({
        threat_level: "high",
        start_date: "2024-12-01T00:00:00Z",
        end_date: "2024-12-31T23:59:59Z",
        limit: 20,
        offset: 0,
      });

      expect(sendCommandSpy).toHaveBeenCalledWith({
        type: "query",
        target: "package_alerts",
        data: {
          threat_level: "high",
          start_date: "2024-12-01T00:00:00Z",
          end_date: "2024-12-31T23:59:59Z",
          limit: 20,
          offset: 0,
        },
      });
    });

    it("应支持威胁等级筛选", () => {
      const sendCommandSpy = vi.spyOn(service, "sendCommand");

      service.queryPackageAlerts({
        threat_level: "medium",
        limit: 10,
      });

      expect(sendCommandSpy).toHaveBeenCalledWith({
        type: "query",
        target: "package_alerts",
        data: {
          threat_level: "medium",
          limit: 10,
        },
      });
    });

    it("应返回命令序列号", () => {
      vi.spyOn(service, "sendCommand").mockReturnValue("seq_456");

      const seqId = service.queryPackageAlerts({ limit: 10 });

      expect(seqId).toBe("seq_456");
    });

    it("应记录查询日志", () => {
      const logEvents: any[] = [];
      service.on("log", (_, data) => {
        logEvents.push(data);
      });

      service.queryPackageAlerts({ limit: 10 });

      // 过滤出 info 类型的日志（排除未连接的错误日志）
      const infoLogs = logEvents.filter((log) => log.type === "info");
      expect(infoLogs).toHaveLength(1);
      expect(infoLogs[0].msg).toContain("查询快递警报历史");
    });
  });

  describe("handleQueryResult() - visitor_intents", () => {
    it("应正确解析访客意图查询结果", () => {
      const mockResult = {
        type: "query_result",
        target: "visitor_intents",
        status: "success" as const,
        data: {
          records: [
            {
              id: 1,
              visit_id: 123,
              session_id: "session_123",
              person_name: "张三",
              intent_type: "delivery",
              ts: Date.now(),
            },
            {
              id: 2,
              visit_id: 124,
              session_id: "session_124",
              person_name: "李四",
              intent_type: "visit",
              ts: Date.now(),
            },
          ],
          total: 2,
          limit: 10,
          offset: 0,
        },
      };

      const resultEvents: any[] = [];
      service.on("visitor_intents_query_result", (_, data) => {
        resultEvents.push(data);
      });

      // 调用私有方法（通过类型断言）
      (service as any).handleQueryResult(mockResult);

      expect(resultEvents).toHaveLength(1);
      expect(resultEvents[0].data).toHaveLength(2);
      expect(resultEvents[0].total).toBe(2);
      expect(resultEvents[0].data[0].person_name).toBe("张三");
    });

    it("应触发成功日志", () => {
      const mockResult = {
        type: "query_result",
        target: "visitor_intents",
        status: "success" as const,
        data: {
          records: [{ id: 1 }],
          total: 1,
        },
      };

      const logEvents: any[] = [];
      service.on("log", (_, data) => {
        logEvents.push(data);
      });

      (service as any).handleQueryResult(mockResult);

      const successLog = logEvents.find((log) => log.type === "success");
      expect(successLog).toBeDefined();
      expect(successLog.msg).toContain("获取访客意图历史成功");
      expect(successLog.msg).toContain("1 条");
    });

    it("应处理空结果", () => {
      const mockResult = {
        type: "query_result",
        target: "visitor_intents",
        status: "success" as const,
        data: {
          records: [],
          total: 0,
        },
      };

      const resultEvents: any[] = [];
      service.on("visitor_intents_query_result", (_, data) => {
        resultEvents.push(data);
      });

      (service as any).handleQueryResult(mockResult);

      expect(resultEvents).toHaveLength(1);
      expect(resultEvents[0].data).toHaveLength(0);
      expect(resultEvents[0].total).toBe(0);
    });
  });

  describe("handleQueryResult() - package_alerts", () => {
    it("应正确解析快递警报查询结果", () => {
      const mockResult = {
        type: "query_result",
        target: "package_alerts",
        status: "success" as const,
        data: {
          records: [
            {
              id: 1,
              session_id: "session_123",
              threat_level: "high",
              action: "taking",
              description: "检测到非主人拿走快递",
              ts: Date.now(),
            },
            {
              id: 2,
              session_id: "session_124",
              threat_level: "medium",
              action: "searching",
              description: "检测到可疑翻找行为",
              ts: Date.now(),
            },
          ],
          total: 2,
          limit: 10,
          offset: 0,
        },
      };

      const resultEvents: any[] = [];
      service.on("package_alerts_query_result", (_, data) => {
        resultEvents.push(data);
      });

      (service as any).handleQueryResult(mockResult);

      expect(resultEvents).toHaveLength(1);
      expect(resultEvents[0].data).toHaveLength(2);
      expect(resultEvents[0].total).toBe(2);
      expect(resultEvents[0].data[0].threat_level).toBe("high");
    });

    it("应触发成功日志", () => {
      const mockResult = {
        type: "query_result",
        target: "package_alerts",
        status: "success" as const,
        data: {
          records: [{ id: 1 }, { id: 2 }],
          total: 2,
        },
      };

      const logEvents: any[] = [];
      service.on("log", (_, data) => {
        logEvents.push(data);
      });

      (service as any).handleQueryResult(mockResult);

      const successLog = logEvents.find((log) => log.type === "success");
      expect(successLog).toBeDefined();
      expect(successLog.msg).toContain("获取快递警报历史成功");
      expect(successLog.msg).toContain("2 条");
    });

    it("应处理空结果", () => {
      const mockResult = {
        type: "query_result",
        target: "package_alerts",
        status: "success" as const,
        data: {
          records: [],
          total: 0,
        },
      };

      const resultEvents: any[] = [];
      service.on("package_alerts_query_result", (_, data) => {
        resultEvents.push(data);
      });

      (service as any).handleQueryResult(mockResult);

      expect(resultEvents).toHaveLength(1);
      expect(resultEvents[0].data).toHaveLength(0);
      expect(resultEvents[0].total).toBe(0);
    });
  });

  describe("查询错误处理", () => {
    it("应处理访客意图查询失败", () => {
      const mockResult = {
        type: "query_result",
        target: "visitor_intents",
        status: "error" as const,
        error: "数据库查询失败",
      };

      const logEvents: any[] = [];
      service.on("log", (_, data) => {
        logEvents.push(data);
      });

      (service as any).handleQueryResult(mockResult);

      const errorLog = logEvents.find((log) => log.type === "error");
      expect(errorLog).toBeDefined();
      expect(errorLog.msg).toContain("查询失败");
      expect(errorLog.msg).toContain("数据库查询失败");
    });

    it("应处理快递警报查询失败", () => {
      const mockResult = {
        type: "query_result",
        target: "package_alerts",
        status: "error" as const,
        error: "网络超时",
      };

      const logEvents: any[] = [];
      service.on("log", (_, data) => {
        logEvents.push(data);
      });

      (service as any).handleQueryResult(mockResult);

      const errorLog = logEvents.find((log) => log.type === "error");
      expect(errorLog).toBeDefined();
      expect(errorLog.msg).toContain("查询失败");
      expect(errorLog.msg).toContain("网络超时");
    });
  });

  describe("兼容性测试", () => {
    it("应兼容旧格式响应（data 是数组）", () => {
      const mockResult = {
        type: "query_result",
        target: "visitor_intents",
        status: "success" as const,
        data: [
          { id: 1, person_name: "张三" },
          { id: 2, person_name: "李四" },
        ],
        total: 2,
      };

      const resultEvents: any[] = [];
      service.on("visitor_intents_query_result", (_, data) => {
        resultEvents.push(data);
      });

      (service as any).handleQueryResult(mockResult);

      expect(resultEvents).toHaveLength(1);
      expect(resultEvents[0].data).toHaveLength(2);
      expect(resultEvents[0].total).toBe(2);
    });

    it("应兼容新格式响应（data.records 是数组）", () => {
      const mockResult = {
        type: "query_result",
        target: "package_alerts",
        status: "success" as const,
        data: {
          records: [
            { id: 1, threat_level: "high" },
            { id: 2, threat_level: "medium" },
          ],
          total: 2,
          limit: 10,
          offset: 0,
        },
      };

      const resultEvents: any[] = [];
      service.on("package_alerts_query_result", (_, data) => {
        resultEvents.push(data);
      });

      (service as any).handleQueryResult(mockResult);

      expect(resultEvents).toHaveLength(1);
      expect(resultEvents[0].data).toHaveLength(2);
      expect(resultEvents[0].total).toBe(2);
    });
  });
});
