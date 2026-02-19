/**
 * DeviceService v2.5 协议消息处理测试
 * Feature: v2.5-protocol-adaptation
 *
 * 测试访客意图通知和快递警报消息的解析、事件触发和错误处理
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeviceService } from "../services/DeviceService";

describe("DeviceService - v2.5 协议消息处理", () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  describe("访客意图通知消息处理", () => {
    it("应正确解析 visitor_intent_notification 消息", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 123,
        session_id: "session_123",
        person_info: {
          person_id: 10,
          name: "张三",
          relation_type: "family",
        },
        intent_summary: {
          intent_type: "delivery",
          summary: "快递员送快递",
          important_notes: ["包裹较大", "需要签收"],
          ai_analysis: "访客是快递员，携带包裹，态度友好",
        },
        dialogue_history: [
          { role: "assistant", content: "您好，请问有什么事吗？" },
          { role: "user", content: "我是快递员，有您的包裹" },
        ],
        ts: Date.now(),
      };

      let emittedIntent: any = null;
      let emittedLog: any = null;

      service.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      service.on("log", (_, data) => {
        if (data.msg.includes("访客意图通知")) {
          emittedLog = data;
        }
      });

      // 模拟接收消息
      (service as any).handleTextMessage(JSON.stringify(mockMessage));

      // 验证事件触发
      expect(emittedIntent).toBeTruthy();
      expect(emittedIntent.visit_id).toBe(123);
      expect(emittedIntent.session_id).toBe("session_123");
      expect(emittedIntent.person_info.name).toBe("张三");
      expect(emittedIntent.intent_summary.intent_type).toBe("delivery");
      expect(emittedIntent.dialogue_history).toHaveLength(2);

      // 验证日志记录
      expect(emittedLog).toBeTruthy();
      expect(emittedLog.msg).toContain("张三");
      expect(emittedLog.msg).toContain("delivery");
      expect(emittedLog.type).toBe("info");
    });

    it("应处理缺少 person_info 的消息", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 124,
        session_id: "session_124",
        intent_summary: {
          intent_type: "visit",
          summary: "访客来访",
          important_notes: [],
          ai_analysis: "未知访客",
        },
        dialogue_history: [],
        ts: Date.now(),
      };

      let emittedIntent: any = null;
      let emittedLog: any = null;

      service.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      service.on("log", (_, data) => {
        if (data.msg.includes("访客意图通知")) {
          emittedLog = data;
        }
      });

      (service as any).handleTextMessage(JSON.stringify(mockMessage));

      // 验证事件触发
      expect(emittedIntent).toBeTruthy();
      expect(emittedIntent.person_info).toEqual({});

      // 验证日志使用默认值
      expect(emittedLog.msg).toContain("未知访客");
    });

    it("应处理缺少 dialogue_history 的消息", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 125,
        session_id: "session_125",
        person_info: { person_id: 11, name: "李四", relation_type: "friend" },
        intent_summary: {
          intent_type: "sales",
          summary: "推销员推销产品",
          important_notes: [],
          ai_analysis: "推销员",
        },
        ts: Date.now(),
      };

      let emittedIntent: any = null;

      service.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      (service as any).handleTextMessage(JSON.stringify(mockMessage));

      // 验证事件触发
      expect(emittedIntent).toBeTruthy();
      expect(emittedIntent.dialogue_history).toEqual([]);
    });
  });

  describe("快递警报提取", () => {
    it("应正确提取 package_check 字段并触发 package_alert 事件", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 126,
        session_id: "session_126",
        person_info: { person_id: 12, name: "王五", relation_type: "unknown" },
        intent_summary: {
          intent_type: "delivery",
          summary: "快递员送快递",
          important_notes: [],
          ai_analysis: "快递员",
        },
        dialogue_history: [],
        package_check: {
          threat_level: "high",
          action: "taking",
          description: "检测到非主人拿走快递",
        },
        ts: Date.now(),
      };

      let emittedIntent: any = null;
      let emittedAlert: any = null;
      let alertLog: any = null;

      service.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      service.on("package_alert", (_, data) => {
        emittedAlert = data;
      });

      service.on("log", (_, data) => {
        if (data.msg.includes("快递警报")) {
          alertLog = data;
        }
      });

      (service as any).handleTextMessage(JSON.stringify(mockMessage));

      // 验证访客意图事件
      expect(emittedIntent).toBeTruthy();
      expect(emittedIntent.package_check).toBeTruthy();

      // 验证快递警报事件
      expect(emittedAlert).toBeTruthy();
      expect(emittedAlert.session_id).toBe("session_126");
      expect(emittedAlert.threat_level).toBe("high");
      expect(emittedAlert.action).toBe("taking");
      expect(emittedAlert.description).toBe("检测到非主人拿走快递");

      // 验证日志记录
      expect(alertLog).toBeTruthy();
      expect(alertLog.msg).toContain("高威胁");
      expect(alertLog.msg).toContain("检测到非主人拿走快递");
      expect(alertLog.type).toBe("error"); // high 威胁应该是 error 类型
    });

    it("应正确处理 medium 威胁等级", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 127,
        session_id: "session_127",
        person_info: { person_id: 13, name: "赵六", relation_type: "unknown" },
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

      let emittedAlert: any = null;
      let alertLog: any = null;

      service.on("package_alert", (_, data) => {
        emittedAlert = data;
      });

      service.on("log", (_, data) => {
        if (data.msg.includes("快递警报")) {
          alertLog = data;
        }
      });

      (service as any).handleTextMessage(JSON.stringify(mockMessage));

      // 验证快递警报事件
      expect(emittedAlert).toBeTruthy();
      expect(emittedAlert.threat_level).toBe("medium");

      // 验证日志记录
      expect(alertLog).toBeTruthy();
      expect(alertLog.msg).toContain("中威胁");
      expect(alertLog.type).toBe("warning"); // medium 威胁应该是 warning 类型
    });

    it("应正确处理 low 威胁等级", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 128,
        session_id: "session_128",
        person_info: { person_id: 14, name: "孙七", relation_type: "unknown" },
        intent_summary: {
          intent_type: "delivery",
          summary: "快递员送快递",
          important_notes: [],
          ai_analysis: "快递员",
        },
        dialogue_history: [],
        package_check: {
          threat_level: "low",
          action: "passing",
          description: "有人路过快递",
        },
        ts: Date.now(),
      };

      let emittedAlert: any = null;
      let alertLog: any = null;

      service.on("package_alert", (_, data) => {
        emittedAlert = data;
      });

      service.on("log", (_, data) => {
        if (data.msg.includes("快递警报")) {
          alertLog = data;
        }
      });

      (service as any).handleTextMessage(JSON.stringify(mockMessage));

      // 验证快递警报事件
      expect(emittedAlert).toBeTruthy();
      expect(emittedAlert.threat_level).toBe("low");

      // 验证日志记录
      expect(alertLog).toBeTruthy();
      expect(alertLog.msg).toContain("低威胁");
      expect(alertLog.type).toBe("warning"); // low 威胁也是 warning 类型
    });

    it("当没有 package_check 字段时不应触发 package_alert 事件", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 129,
        session_id: "session_129",
        person_info: { person_id: 15, name: "周八", relation_type: "family" },
        intent_summary: {
          intent_type: "visit",
          summary: "家人来访",
          important_notes: [],
          ai_analysis: "家人",
        },
        dialogue_history: [],
        ts: Date.now(),
      };

      let emittedIntent: any = null;
      let emittedAlert: any = null;

      service.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      service.on("package_alert", (_, data) => {
        emittedAlert = data;
      });

      (service as any).handleTextMessage(JSON.stringify(mockMessage));

      // 验证访客意图事件触发
      expect(emittedIntent).toBeTruthy();

      // 验证快递警报事件未触发
      expect(emittedAlert).toBeNull();
    });
  });

  describe("错误处理", () => {
    it("应处理缺少必需字段的消息", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        // 缺少 visit_id
        session_id: "session_130",
        intent_summary: {
          intent_type: "other",
          summary: "其他",
          important_notes: [],
          ai_analysis: "未知",
        },
        ts: Date.now(),
      };

      let emittedIntent: any = null;
      let errorLog: any = null;

      service.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      service.on("log", (_, data) => {
        if (data.type === "error" && data.msg.includes("格式错误")) {
          errorLog = data;
        }
      });

      // 使用 spy 监控 console.error
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (service as any).handleTextMessage(JSON.stringify(mockMessage));

      // 验证不应触发 visitor_intent 事件
      expect(emittedIntent).toBeNull();

      // 验证错误日志
      expect(errorLog).toBeTruthy();
      expect(errorLog.msg).toContain("格式错误");

      // 验证 console.error 被调用
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("应处理缺少 session_id 的消息", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 131,
        // 缺少 session_id
        intent_summary: {
          intent_type: "other",
          summary: "其他",
          important_notes: [],
          ai_analysis: "未知",
        },
        ts: Date.now(),
      };

      let emittedIntent: any = null;
      let errorLog: any = null;

      service.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      service.on("log", (_, data) => {
        if (data.type === "error") {
          errorLog = data;
        }
      });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (service as any).handleTextMessage(JSON.stringify(mockMessage));

      // 验证不应触发事件
      expect(emittedIntent).toBeNull();
      expect(errorLog).toBeTruthy();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("应处理缺少 intent_summary 的消息", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 132,
        session_id: "session_132",
        // 缺少 intent_summary
        person_info: { person_id: 16, name: "吴九", relation_type: "unknown" },
        dialogue_history: [],
        ts: Date.now(),
      };

      let emittedIntent: any = null;
      let errorLog: any = null;

      service.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      service.on("log", (_, data) => {
        if (data.type === "error") {
          errorLog = data;
        }
      });

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (service as any).handleTextMessage(JSON.stringify(mockMessage));

      // 验证不应触发事件
      expect(emittedIntent).toBeNull();
      expect(errorLog).toBeTruthy();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("应处理 JSON 解析错误", () => {
      const invalidJson = "{ invalid json }";

      let emittedIntent: any = null;

      service.on("visitor_intent", (_, data) => {
        emittedIntent = data;
      });

      // handleTextMessage 内部有 try-catch，不应抛出错误
      expect(() => {
        (service as any).handleTextMessage(invalidJson);
      }).not.toThrow();

      // 验证不应触发事件
      expect(emittedIntent).toBeNull();
    });
  });

  describe("getThreatLevelText 辅助方法", () => {
    it("应返回正确的威胁等级文本", () => {
      const getThreatLevelText = (service as any).getThreatLevelText.bind(
        service,
      );

      expect(getThreatLevelText("low")).toBe("低威胁");
      expect(getThreatLevelText("medium")).toBe("中威胁");
      expect(getThreatLevelText("high")).toBe("高威胁");
      expect(getThreatLevelText("unknown")).toBe("未知威胁");
      expect(getThreatLevelText("")).toBe("未知威胁");
    });
  });
});
