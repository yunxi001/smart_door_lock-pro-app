/**
 * 查询命令验证测试
 * 验证 sendQuery() 和 handleQueryResult() 方法符合需求 9.1, 9.2, 9.3, 9.4
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DeviceService } from "../services/DeviceService";

describe("任务 9: 实现 query 命令支持", () => {
  let service: DeviceService;
  let sentCommands: any[] = [];

  beforeEach(() => {
    service = new DeviceService();
    sentCommands = [];

    // Mock sendCommand 方法以捕获发送的命令
    service.sendCommand = (cmd: object) => {
      sentCommands.push(cmd);
      return null;
    };
  });

  describe("子任务 9.1: 添加 sendQuery() 方法", () => {
    describe("需求 9.1: 方法存在性和基本功能", () => {
      it("sendQuery 方法应该存在", () => {
        expect(typeof service.sendQuery).toBe("function");
      });

      it("sendQuery 方法应该可调用", () => {
        expect(() => {
          service.sendQuery("status");
        }).not.toThrow();
      });

      it("应该使用 sendCommand() 发送消息", () => {
        service.sendQuery("status");

        expect(sentCommands.length).toBe(1);
        expect(sentCommands[0].type).toBe("query");
      });
    });

    describe("需求 9.2: 支持五种 target 类型", () => {
      const targets = [
        "status",
        "status_history",
        "events",
        "unlock_logs",
        "media_files",
      ];

      targets.forEach((target) => {
        it(`应该支持 ${target} 查询类型`, () => {
          service.sendQuery(target);

          expect(sentCommands.length).toBe(1);
          expect(sentCommands[0].type).toBe("query");
          expect(sentCommands[0].target).toBe(target);
        });
      });
    });

    describe("需求 9.3: 支持可选的 data 参数", () => {
      it("当不提供 data 参数时，消息不应包含 data 字段", () => {
        service.sendQuery("unlock_logs");

        expect(sentCommands.length).toBe(1);
        expect(sentCommands[0].data).toBeUndefined();
      });

      it("当提供 data 参数时，应该包含在消息中", () => {
        const queryData = { limit: 10, offset: 0 };
        service.sendQuery("unlock_logs", queryData);

        expect(sentCommands.length).toBe(1);
        expect(sentCommands[0].data).toEqual(queryData);
      });

      it("应该支持分页参数 limit 和 offset", () => {
        service.sendQuery("events", { limit: 20, offset: 10 });

        expect(sentCommands.length).toBe(1);
        expect(sentCommands[0].data.limit).toBe(20);
        expect(sentCommands[0].data.offset).toBe(10);
      });

      it("应该支持其他自定义参数", () => {
        const customData = {
          start_time: 1234567890,
          end_time: 1234567900,
          filter: "success",
        };
        service.sendQuery("unlock_logs", customData);

        expect(sentCommands.length).toBe(1);
        expect(sentCommands[0].data).toEqual(customData);
      });
    });

    describe("消息格式验证", () => {
      it("发送的消息应该包含 type 和 target 字段", () => {
        service.sendQuery("status");

        expect(sentCommands.length).toBe(1);
        const cmd = sentCommands[0];

        expect(cmd).toHaveProperty("type");
        expect(cmd).toHaveProperty("target");
        expect(cmd.type).toBe("query");
        expect(cmd.target).toBe("status");
      });

      it("完整消息格式应该符合协议规范", () => {
        service.sendQuery("unlock_logs", { limit: 10, offset: 0 });

        expect(sentCommands.length).toBe(1);
        const cmd = sentCommands[0];

        expect(cmd.type).toBe("query");
        expect(cmd.target).toBe("unlock_logs");
        expect(cmd.data).toEqual({ limit: 10, offset: 0 });
      });
    });

    describe("日志记录验证", () => {
      it("发送查询命令时应该记录日志", () => {
        const logEvents: any[] = [];
        service.on("log", (_, data) => logEvents.push(data));

        service.sendQuery("status");

        expect(logEvents.length).toBeGreaterThan(0);
        expect(logEvents.some((e) => e.msg.includes("查询"))).toBe(true);
      });

      it("日志应该包含正确的查询目标描述", () => {
        const testCases = [
          { target: "status", expected: "设备状态" },
          { target: "status_history", expected: "历史状态" },
          { target: "events", expected: "事件记录" },
          { target: "unlock_logs", expected: "开锁日志" },
          { target: "media_files", expected: "媒体文件列表" },
        ];

        testCases.forEach(({ target, expected }) => {
          const logEvents: any[] = [];
          service.on("log", (_, data) => logEvents.push(data));

          service.sendQuery(target);

          expect(logEvents.some((e) => e.msg.includes(expected))).toBe(true);
        });
      });
    });
  });

  describe("子任务 9.2: 验证 handleQueryResult() 方法", () => {
    describe("需求 9.4: 根据 target 触发对应事件", () => {
      it("应该触发通用的 query_result 事件", () => {
        const events: any[] = [];
        service.on("query_result", (_, data) => events.push(data));

        // 模拟收到查询结果
        const mockResult = {
          type: "query_result",
          target: "status",
          status: "success" as const,
          data: [{ battery: 80, lockState: 0 }],
        };

        // 直接调用私有方法进行测试（通过类型断言）
        (service as any).handleQueryResult(mockResult);

        expect(events.length).toBe(1);
        expect(events[0].target).toBe("status");
      });

      it("status 查询应该触发 status_query_result 事件", () => {
        const events: any[] = [];
        service.on("status_query_result", (_, data) => events.push(data));

        const mockResult = {
          type: "query_result",
          target: "status",
          status: "success" as const,
          data: [{ battery: 80 }],
        };

        (service as any).handleQueryResult(mockResult);

        expect(events.length).toBe(1);
        expect(events[0].data).toEqual([{ battery: 80 }]);
      });

      it("status_history 查询应该触发 status_history_result 事件", () => {
        const events: any[] = [];
        service.on("status_history_result", (_, data) => events.push(data));

        const mockResult = {
          type: "query_result",
          target: "status_history",
          status: "success" as const,
          data: [{ ts: 123, battery: 80 }],
          total: 1,
        };

        (service as any).handleQueryResult(mockResult);

        expect(events.length).toBe(1);
        expect(events[0].data.length).toBe(1);
        expect(events[0].total).toBe(1);
      });

      it("events 查询应该触发 events_result 事件", () => {
        const events: any[] = [];
        service.on("events_result", (_, data) => events.push(data));

        const mockResult = {
          type: "query_result",
          target: "events",
          status: "success" as const,
          data: [{ event: "bell", ts: 123 }],
          total: 1,
        };

        (service as any).handleQueryResult(mockResult);

        expect(events.length).toBe(1);
        expect(events[0].data.length).toBe(1);
      });

      it("unlock_logs 查询应该触发 unlock_logs_result 事件", () => {
        const events: any[] = [];
        service.on("unlock_logs_result", (_, data) => events.push(data));

        const mockResult = {
          type: "query_result",
          target: "unlock_logs",
          status: "success" as const,
          data: [{ method: "face", status: "success" }],
          total: 1,
        };

        (service as any).handleQueryResult(mockResult);

        expect(events.length).toBe(1);
        expect(events[0].data.length).toBe(1);
      });

      it("media_files 查询应该触发 media_files_result 事件", () => {
        const events: any[] = [];
        service.on("media_files_result", (_, data) => events.push(data));

        const mockResult = {
          type: "query_result",
          target: "media_files",
          status: "success" as const,
          data: [{ file_id: 1, file_name: "test.jpg" }],
          total: 1,
        };

        (service as any).handleQueryResult(mockResult);

        expect(events.length).toBe(1);
        expect(events[0].data.length).toBe(1);
      });
    });

    describe("错误处理验证", () => {
      it("当 status 为 error 时，应该记录错误日志", () => {
        const logEvents: any[] = [];
        service.on("log", (_, data) => logEvents.push(data));

        const mockResult = {
          type: "query_result",
          target: "unlock_logs",
          status: "error" as const,
          error: "数据库查询失败",
        };

        (service as any).handleQueryResult(mockResult);

        expect(
          logEvents.some(
            (e) => e.type === "error" && e.msg.includes("查询失败"),
          ),
        ).toBe(true);
      });

      it("错误日志应该包含错误信息", () => {
        const logEvents: any[] = [];
        service.on("log", (_, data) => logEvents.push(data));

        const mockResult = {
          type: "query_result",
          target: "events",
          status: "error" as const,
          error: "权限不足",
        };

        (service as any).handleQueryResult(mockResult);

        expect(logEvents.some((e) => e.msg.includes("权限不足"))).toBe(true);
      });

      it("当没有提供错误信息时，应该显示默认错误", () => {
        const logEvents: any[] = [];
        service.on("log", (_, data) => logEvents.push(data));

        const mockResult = {
          type: "query_result",
          target: "status",
          status: "error" as const,
        };

        (service as any).handleQueryResult(mockResult);

        expect(logEvents.some((e) => e.msg.includes("未知错误"))).toBe(true);
      });

      it("错误时不应该触发特定的结果事件", () => {
        const events: any[] = [];
        service.on("unlock_logs_result", (_, data) => events.push(data));

        const mockResult = {
          type: "query_result",
          target: "unlock_logs",
          status: "error" as const,
          error: "查询失败",
        };

        (service as any).handleQueryResult(mockResult);

        expect(events.length).toBe(0);
      });
    });

    describe("数据处理验证", () => {
      it("应该正确处理空数据数组", () => {
        const events: any[] = [];
        service.on("unlock_logs_result", (_, data) => events.push(data));

        const mockResult = {
          type: "query_result",
          target: "unlock_logs",
          status: "success" as const,
          data: [],
          total: 0,
        };

        (service as any).handleQueryResult(mockResult);

        expect(events.length).toBe(1);
        expect(events[0].data).toEqual([]);
        expect(events[0].total).toBe(0);
      });

      it("当 data 字段缺失时，应该使用空数组", () => {
        const events: any[] = [];
        service.on("events_result", (_, data) => events.push(data));

        const mockResult = {
          type: "query_result",
          target: "events",
          status: "success" as const,
        };

        (service as any).handleQueryResult(mockResult);

        expect(events.length).toBe(1);
        expect(events[0].data).toEqual([]);
      });

      it("当 total 字段缺失时，应该使用 0", () => {
        const events: any[] = [];
        service.on("unlock_logs_result", (_, data) => events.push(data));

        const mockResult = {
          type: "query_result",
          target: "unlock_logs",
          status: "success" as const,
          data: [{ method: "face" }],
        };

        (service as any).handleQueryResult(mockResult);

        expect(events.length).toBe(1);
        expect(events[0].total).toBe(0);
      });

      it("应该正确传递完整的数据", () => {
        const events: any[] = [];
        service.on("unlock_logs_result", (_, data) => events.push(data));

        // 使用服务器返回的字段格式
        const testData = [
          {
            id: 1,
            method: "face",
            result: 1,
            user_id: 1,
            created_at: "2024-01-01T00:00:00Z",
            lock_time: 0,
          },
          {
            id: 2,
            method: "fingerprint",
            result: 0,
            user_id: 2,
            created_at: "2024-01-01T00:01:00Z",
            lock_time: 0,
          },
        ];

        const mockResult = {
          type: "query_result",
          target: "unlock_logs",
          status: "success" as const,
          data: testData,
          total: 100,
        };

        (service as any).handleQueryResult(mockResult);

        expect(events.length).toBe(1);
        expect(events[0].total).toBe(100);

        // 验证转换后的数据格式
        expect(events[0].data).toEqual([
          {
            id: 1,
            method: "face",
            uid: 1,
            status: "success",
            lock_time: 0,
            timestamp: "2024-01-01T00:00:00Z",
            user_name: undefined,
            hasVideo: false,
            mediaId: undefined,
            videoFilePath: undefined,
            videoFileSize: undefined,
            videoDuration: undefined,
            videoThumbnailUrl: undefined,
          },
          {
            id: 2,
            method: "fingerprint",
            uid: 2,
            status: "fail",
            lock_time: 0,
            timestamp: "2024-01-01T00:01:00Z",
            user_name: undefined,
            hasVideo: false,
            mediaId: undefined,
            videoFilePath: undefined,
            videoFileSize: undefined,
            videoDuration: undefined,
            videoThumbnailUrl: undefined,
          },
        ]);
      });
    });

    describe("日志记录验证", () => {
      it("成功查询应该记录成功日志", () => {
        const logEvents: any[] = [];
        service.on("log", (_, data) => logEvents.push(data));

        const mockResult = {
          type: "query_result",
          target: "unlock_logs",
          status: "success" as const,
          data: [{ method: "face" }],
        };

        (service as any).handleQueryResult(mockResult);

        expect(
          logEvents.some((e) => e.type === "success" && e.msg.includes("成功")),
        ).toBe(true);
      });

      it("日志应该包含查询到的记录数量", () => {
        const logEvents: any[] = [];
        service.on("log", (_, data) => logEvents.push(data));

        const mockResult = {
          type: "query_result",
          target: "events",
          status: "success" as const,
          data: [{ event: "bell" }, { event: "pir_trigger" }],
        };

        (service as any).handleQueryResult(mockResult);

        expect(logEvents.some((e) => e.msg.includes("2 条"))).toBe(true);
      });
    });
  });

  describe("集成测试", () => {
    it("完整的查询流程应该正常工作", () => {
      const logEvents: any[] = [];
      const resultEvents: any[] = [];

      service.on("log", (_, data) => logEvents.push(data));
      service.on("unlock_logs_result", (_, data) => resultEvents.push(data));

      // 1. 发送查询命令
      service.sendQuery("unlock_logs", { limit: 10, offset: 0 });

      // 验证命令已发送
      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("query");
      expect(sentCommands[0].target).toBe("unlock_logs");

      // 验证发送日志
      expect(logEvents.some((e) => e.msg.includes("发送查询命令"))).toBe(true);

      // 2. 模拟收到查询结果
      const mockResult = {
        type: "query_result",
        target: "unlock_logs",
        status: "success" as const,
        data: [{ method: "face", status: "success" }],
        total: 1,
      };

      (service as any).handleQueryResult(mockResult);

      // 验证结果事件已触发
      expect(resultEvents.length).toBe(1);
      expect(resultEvents[0].data.length).toBe(1);

      // 验证成功日志
      expect(
        logEvents.some((e) => e.type === "success" && e.msg.includes("成功")),
      ).toBe(true);
    });
  });
});
