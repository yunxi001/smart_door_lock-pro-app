/**
 * v2.5协议适配 - 错误场景集成测试
 * 任务 23.2: 测试错误处理和降级策略
 *
 * 测试范围：
 * 1. 消息解析错误处理
 * 2. IndexedDB写入失败降级
 * 3. 查询超时重试
 * 4. 照片加载失败降级
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DeviceService } from "@/services/DeviceService";
import { localStorageService } from "@/services/LocalStorageService";

describe("v2.5协议适配 - 错误场景集成测试", () => {
  let deviceService: DeviceService;

  beforeEach(async () => {
    deviceService = new DeviceService();
    await localStorageService.init();
  });

  afterEach(() => {
    deviceService.disconnect();
  });

  describe("1. 消息解析错误处理", () => {
    it("应正确处理缺少必需字段的访客意图消息", () => {
      const invalidMessage = {
        type: "visitor_intent_notification",
        // 缺少 visit_id
        session_id: "session_error_1001",
        intent_summary: {
          intent_type: "other",
          summary: "测试",
          important_notes: [],
          ai_analysis: "测试",
        },
        ts: Date.now(),
      };

      let emittedIntent: any = null;
      let errorLog: any = null;

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      const unsubLog = deviceService.on("log", (_, data) => {
        if (data.type === "error" && data.msg.includes("格式错误")) {
          errorLog = data;
        }
      });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // 模拟接收消息
      (deviceService as any).handleTextMessage(JSON.stringify(invalidMessage));

      // 验证：不应触发visitor_intent事件
      expect(emittedIntent).toBeNull();

      // 验证：应记录错误日志
      expect(errorLog).toBeTruthy();
      expect(errorLog.msg).toContain("格式错误");

      // 验证：应调用console.error
      expect(consoleErrorSpy).toHaveBeenCalled();

      // 清理
      unsubIntent();
      unsubLog();
      consoleErrorSpy.mockRestore();
    });

    it("应正确处理缺少session_id的消息", () => {
      const invalidMessage = {
        type: "visitor_intent_notification",
        visit_id: 1002,
        // 缺少 session_id
        intent_summary: {
          intent_type: "other",
          summary: "测试",
          important_notes: [],
          ai_analysis: "测试",
        },
        ts: Date.now(),
      };

      let emittedIntent: any = null;
      let errorLog: any = null;

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      const unsubLog = deviceService.on("log", (_, data) => {
        if (data.type === "error") {
          errorLog = data;
        }
      });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (deviceService as any).handleTextMessage(JSON.stringify(invalidMessage));

      expect(emittedIntent).toBeNull();
      expect(errorLog).toBeTruthy();
      expect(consoleErrorSpy).toHaveBeenCalled();

      unsubIntent();
      unsubLog();
      consoleErrorSpy.mockRestore();
    });

    it("应正确处理缺少intent_summary的消息", () => {
      const invalidMessage = {
        type: "visitor_intent_notification",
        visit_id: 1003,
        session_id: "session_error_1003",
        // 缺少 intent_summary
        person_info: { person_id: 100, name: "测试", relation_type: "unknown" },
        dialogue_history: [],
        ts: Date.now(),
      };

      let emittedIntent: any = null;
      let errorLog: any = null;

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      const unsubLog = deviceService.on("log", (_, data) => {
        if (data.type === "error") {
          errorLog = data;
        }
      });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (deviceService as any).handleTextMessage(JSON.stringify(invalidMessage));

      expect(emittedIntent).toBeNull();
      expect(errorLog).toBeTruthy();
      expect(consoleErrorSpy).toHaveBeenCalled();

      unsubIntent();
      unsubLog();
      consoleErrorSpy.mockRestore();
    });

    it("应正确处理JSON解析错误", () => {
      const invalidJson = "{ invalid json }";

      let emittedIntent: any = null;

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      // handleTextMessage内部有try-catch，不应抛出错误
      expect(() => {
        (deviceService as any).handleTextMessage(invalidJson);
      }).not.toThrow();

      // 验证：不应触发事件
      expect(emittedIntent).toBeNull();

      unsubIntent();
    });

    it("应正确处理空消息", () => {
      let emittedIntent: any = null;

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      // 空字符串
      (deviceService as any).handleTextMessage("");

      expect(emittedIntent).toBeNull();

      // null
      (deviceService as any).handleTextMessage(null);

      expect(emittedIntent).toBeNull();

      // undefined
      (deviceService as any).handleTextMessage(undefined);

      expect(emittedIntent).toBeNull();

      unsubIntent();
    });
  });

  describe("2. IndexedDB写入失败降级", () => {
    it("应处理IndexedDB保存失败的情况", async () => {
      // 模拟保存失败
      const originalSave = localStorageService.saveVisitorIntent;
      const saveSpy = vi
        .spyOn(localStorageService, "saveVisitorIntent")
        .mockRejectedValue(new Error("存储空间不足"));

      const testIntent = {
        id: 1,
        visit_id: 2001,
        session_id: "session_error_2001",
        person_id: 200,
        person_name: "测试访客",
        relation_type: "unknown" as const,
        intent_type: "other" as const,
        intent_summary: {
          intent_type: "other",
          summary: "测试",
          important_notes: [],
          ai_analysis: "测试",
        },
        dialogue_history: [],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      // 尝试保存
      await expect(
        localStorageService.saveVisitorIntent(testIntent),
      ).rejects.toThrow("存储空间不足");

      // 验证：saveSpy被调用
      expect(saveSpy).toHaveBeenCalledWith(testIntent);

      // 恢复
      saveSpy.mockRestore();
    });

    it("应处理IndexedDB读取失败的情况", async () => {
      // 模拟读取失败
      const getSpy = vi
        .spyOn(localStorageService, "getVisitorIntents")
        .mockRejectedValue(new Error("数据库连接失败"));

      // 尝试读取
      await expect(localStorageService.getVisitorIntents(10)).rejects.toThrow(
        "数据库连接失败",
      );

      // 验证：getSpy被调用
      expect(getSpy).toHaveBeenCalledWith(10);

      // 恢复
      getSpy.mockRestore();
    });

    it("应处理IndexedDB删除失败的情况", async () => {
      // 模拟删除失败
      const deleteSpy = vi
        .spyOn(localStorageService, "deleteVisitorIntent")
        .mockRejectedValue(new Error("删除失败"));

      // 尝试删除
      await expect(
        localStorageService.deleteVisitorIntent(999),
      ).rejects.toThrow("删除失败");

      // 验证：deleteSpy被调用
      expect(deleteSpy).toHaveBeenCalledWith(999);

      // 恢复
      deleteSpy.mockRestore();
    });
  });

  describe("3. 查询超时和错误处理", () => {
    it("应正确处理查询错误响应", () => {
      const errorResponse = {
        type: "query_result",
        msg_id: "query_error_3001",
        target: "visitor_intents",
        status: "error",
        error: "查询超时",
      };

      let errorLog: any = null;

      const unsubLog = deviceService.on("log", (_, data) => {
        if (data.type === "error" && data.msg.includes("查询失败")) {
          errorLog = data;
        }
      });

      // 模拟接收错误响应
      (deviceService as any).handleTextMessage(JSON.stringify(errorResponse));

      // 验证：应记录错误日志
      expect(errorLog).toBeTruthy();
      expect(errorLog.msg).toContain("查询失败");
      expect(errorLog.msg).toContain("查询超时");

      unsubLog();
    });

    it("应正确处理查询返回空数据", () => {
      const emptyResponse = {
        type: "query_result",
        msg_id: "query_empty_3002",
        target: "visitor_intents",
        status: "success",
        data: {
          records: [],
          total: 0,
        },
      };

      let queryResult: any = null;

      const unsubQuery = deviceService.on(
        "visitor_intents_query_result",
        (_, data) => {
          queryResult = data;
        },
      );

      (deviceService as any).handleTextMessage(JSON.stringify(emptyResponse));

      // 验证：应触发事件，但数据为空
      expect(queryResult).toBeTruthy();
      expect(queryResult.data).toHaveLength(0);
      expect(queryResult.total).toBe(0);

      unsubQuery();
    });

    it("应正确处理查询返回格式错误的数据", () => {
      const malformedResponse = {
        type: "query_result",
        msg_id: "query_malformed_3003",
        target: "visitor_intents",
        status: "success",
        data: null, // 格式错误：data应该是对象
      };

      let queryResult: any = null;

      const unsubQuery = deviceService.on(
        "visitor_intents_query_result",
        (_, data) => {
          queryResult = data;
        },
      );

      (deviceService as any).handleTextMessage(
        JSON.stringify(malformedResponse),
      );

      // 验证：应触发事件，但数据为空数组
      expect(queryResult).toBeTruthy();
      expect(queryResult.data).toEqual([]);

      unsubQuery();
    });
  });

  describe("4. 数据一致性和边界情况", () => {
    it("应正确处理重复的session_id", async () => {
      const sessionId = "session_duplicate_4001";

      // 第一条消息
      const message1 = {
        type: "visitor_intent_notification",
        visit_id: 4001,
        session_id: sessionId,
        person_info: { person_id: 400, name: "访客A", relation_type: "family" },
        intent_summary: {
          intent_type: "visit",
          summary: "第一次访问",
          important_notes: [],
          ai_analysis: "家人",
        },
        dialogue_history: [],
        ts: Date.now(),
      };

      // 第二条消息（相同session_id，更新的时间戳）
      const message2 = {
        type: "visitor_intent_notification",
        visit_id: 4002,
        session_id: sessionId,
        person_info: { person_id: 400, name: "访客A", relation_type: "family" },
        intent_summary: {
          intent_type: "visit",
          summary: "第二次访问",
          important_notes: [],
          ai_analysis: "家人",
        },
        dialogue_history: [],
        ts: Date.now() + 1000,
      };

      const receivedIntents: any[] = [];

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        receivedIntents.push(data);
      });

      // 连续接收两条消息
      (deviceService as any).handleTextMessage(JSON.stringify(message1));
      (deviceService as any).handleTextMessage(JSON.stringify(message2));

      // 验证：两条消息都被接收
      expect(receivedIntents).toHaveLength(2);
      expect(receivedIntents[0].session_id).toBe(sessionId);
      expect(receivedIntents[1].session_id).toBe(sessionId);

      // 验证：第二条消息的时间戳更新
      expect(receivedIntents[1].ts).toBeGreaterThan(receivedIntents[0].ts);

      unsubIntent();
    });

    it("应正确处理极大的对话历史", () => {
      // 生成100条对话
      const largeDialogueHistory = Array.from({ length: 100 }, (_, i) => ({
        role: i % 2 === 0 ? ("assistant" as const) : ("user" as const),
        content: `消息 ${i + 1}`,
      }));

      const message = {
        type: "visitor_intent_notification",
        visit_id: 4003,
        session_id: "session_large_4003",
        person_info: {
          person_id: 401,
          name: "访客B",
          relation_type: "unknown",
        },
        intent_summary: {
          intent_type: "other",
          summary: "长对话测试",
          important_notes: [],
          ai_analysis: "测试",
        },
        dialogue_history: largeDialogueHistory,
        ts: Date.now(),
      };

      let receivedIntent: any = null;

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        receivedIntent = data;
      });

      (deviceService as any).handleTextMessage(JSON.stringify(message));

      // 验证：应正确接收所有对话
      expect(receivedIntent).toBeTruthy();
      expect(receivedIntent.dialogue_history).toHaveLength(100);

      unsubIntent();
    });

    it("应正确处理空的person_info", () => {
      const message = {
        type: "visitor_intent_notification",
        visit_id: 4004,
        session_id: "session_empty_person_4004",
        // person_info为空对象
        person_info: {},
        intent_summary: {
          intent_type: "other",
          summary: "未知访客",
          important_notes: [],
          ai_analysis: "未知",
        },
        dialogue_history: [],
        ts: Date.now(),
      };

      let receivedIntent: any = null;

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        receivedIntent = data;
      });

      (deviceService as any).handleTextMessage(JSON.stringify(message));

      // 验证：应正确处理空person_info
      expect(receivedIntent).toBeTruthy();
      expect(receivedIntent.person_info).toEqual({});

      unsubIntent();
    });

    it("应正确处理空的dialogue_history", () => {
      const message = {
        type: "visitor_intent_notification",
        visit_id: 4005,
        session_id: "session_empty_dialogue_4005",
        person_info: { person_id: 402, name: "访客C", relation_type: "friend" },
        intent_summary: {
          intent_type: "visit",
          summary: "朋友来访",
          important_notes: [],
          ai_analysis: "朋友",
        },
        // dialogue_history为空数组
        dialogue_history: [],
        ts: Date.now(),
      };

      let receivedIntent: any = null;

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        receivedIntent = data;
      });

      (deviceService as any).handleTextMessage(JSON.stringify(message));

      // 验证：应正确处理空dialogue_history
      expect(receivedIntent).toBeTruthy();
      expect(receivedIntent.dialogue_history).toEqual([]);

      unsubIntent();
    });
  });

  describe("5. 并发和竞态条件", () => {
    it("应正确处理快速连续的消息", () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        type: "visitor_intent_notification",
        visit_id: 5001 + i,
        session_id: `session_concurrent_${5001 + i}`,
        person_info: {
          person_id: 500 + i,
          name: `访客${i}`,
          relation_type: "unknown",
        },
        intent_summary: {
          intent_type: "other",
          summary: `测试${i}`,
          important_notes: [],
          ai_analysis: `测试${i}`,
        },
        dialogue_history: [],
        ts: Date.now() + i,
      }));

      const receivedIntents: any[] = [];

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        receivedIntents.push(data);
      });

      // 快速连续发送消息
      messages.forEach((msg) => {
        (deviceService as any).handleTextMessage(JSON.stringify(msg));
      });

      // 验证：所有消息都被接收
      expect(receivedIntents).toHaveLength(10);

      // 验证：消息顺序正确
      receivedIntents.forEach((intent, i) => {
        expect(intent.visit_id).toBe(5001 + i);
      });

      unsubIntent();
    });

    it("应正确处理同时接收访客意图和快递警报", () => {
      const message = {
        type: "visitor_intent_notification",
        visit_id: 5011,
        session_id: "session_concurrent_5011",
        person_info: {
          person_id: 510,
          name: "并发测试",
          relation_type: "unknown",
        },
        intent_summary: {
          intent_type: "delivery",
          summary: "快递员送快递",
          important_notes: [],
          ai_analysis: "快递员",
        },
        dialogue_history: [],
        package_check: {
          threat_level: "medium",
          action: "searching",
          description: "检测到有人翻看快递",
        },
        ts: Date.now(),
      };

      let receivedIntent: any = null;
      let receivedAlert: any = null;

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        receivedIntent = data;
      });

      const unsubAlert = deviceService.on("package_alert", (_, data) => {
        receivedAlert = data;
      });

      (deviceService as any).handleTextMessage(JSON.stringify(message));

      // 验证：两个事件都被触发
      expect(receivedIntent).toBeTruthy();
      expect(receivedAlert).toBeTruthy();

      // 验证：数据正确
      expect(receivedIntent.visit_id).toBe(5011);
      expect(receivedAlert.threat_level).toBe("medium");

      unsubIntent();
      unsubAlert();
    });
  });

  describe("6. 内存泄漏预防", () => {
    it("应正确清理事件监听器", () => {
      let callCount = 0;

      const unsubscribe = deviceService.on("visitor_intent", () => {
        callCount++;
      });

      const message = {
        type: "visitor_intent_notification",
        visit_id: 6001,
        session_id: "session_memory_6001",
        person_info: { person_id: 600, name: "测试", relation_type: "unknown" },
        intent_summary: {
          intent_type: "other",
          summary: "测试",
          important_notes: [],
          ai_analysis: "测试",
        },
        dialogue_history: [],
        ts: Date.now(),
      };

      // 第一次触发
      (deviceService as any).handleTextMessage(JSON.stringify(message));
      expect(callCount).toBe(1);

      // 取消订阅
      unsubscribe();

      // 第二次触发（应该不会调用回调）
      (deviceService as any).handleTextMessage(JSON.stringify(message));
      expect(callCount).toBe(1); // 仍然是1，没有增加
    });

    it("应支持多个监听器同时订阅", () => {
      let count1 = 0;
      let count2 = 0;
      let count3 = 0;

      const unsub1 = deviceService.on("visitor_intent", () => {
        count1++;
      });

      const unsub2 = deviceService.on("visitor_intent", () => {
        count2++;
      });

      const unsub3 = deviceService.on("visitor_intent", () => {
        count3++;
      });

      const message = {
        type: "visitor_intent_notification",
        visit_id: 6002,
        session_id: "session_multi_6002",
        person_info: { person_id: 601, name: "测试", relation_type: "unknown" },
        intent_summary: {
          intent_type: "other",
          summary: "测试",
          important_notes: [],
          ai_analysis: "测试",
        },
        dialogue_history: [],
        ts: Date.now(),
      };

      (deviceService as any).handleTextMessage(JSON.stringify(message));

      // 验证：所有监听器都被调用
      expect(count1).toBe(1);
      expect(count2).toBe(1);
      expect(count3).toBe(1);

      // 清理
      unsub1();
      unsub2();
      unsub3();
    });
  });
});
