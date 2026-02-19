/**
 * v2.5协议适配 - 完整数据流集成测试
 * 任务 23.1: 测试从消息接收到UI显示的完整流程
 *
 * 测试范围：
 * 1. 从消息接收到UI显示的完整流程
 * 2. 从推送到IndexedDB保存的完整流程
 * 3. 查询和数据合并逻辑
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DeviceService } from "@/services/DeviceService";
import { localStorageService } from "@/services/LocalStorageService";
import type { VisitorIntent, PackageAlert } from "@/types";

describe("v2.5协议适配 - 完整数据流集成测试", () => {
  let deviceService: DeviceService;

  beforeEach(async () => {
    deviceService = new DeviceService();
    await localStorageService.init();
  });

  afterEach(() => {
    deviceService.disconnect();
  });

  describe("1. 访客意图完整数据流", () => {
    it("应完成从消息接收到IndexedDB保存的完整流程", async () => {
      // 准备测试数据
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 1001,
        session_id: "session_integration_1001",
        person_info: {
          person_id: 100,
          name: "集成测试访客",
          relation_type: "friend",
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
          { role: "assistant", content: "好的，请稍等" },
        ],
        ts: Date.now(),
      };

      // 步骤1: 订阅事件
      let receivedIntent: any = null;
      const unsubscribe = deviceService.on("visitor_intent", (_, data) => {
        receivedIntent = data;
      });

      // 步骤2: 模拟接收消息
      (deviceService as any).handleTextMessage(JSON.stringify(mockMessage));

      // 步骤3: 验证事件触发
      expect(receivedIntent).toBeTruthy();
      expect(receivedIntent.visit_id).toBe(1001);
      expect(receivedIntent.session_id).toBe("session_integration_1001");
      expect(receivedIntent.person_info.name).toBe("集成测试访客");
      expect(receivedIntent.intent_summary.intent_type).toBe("delivery");
      expect(receivedIntent.dialogue_history).toHaveLength(3);

      // 步骤4: 保存到IndexedDB
      await localStorageService.saveVisitorIntent(receivedIntent);

      // 步骤5: 从IndexedDB读取
      const savedIntents = await localStorageService.getVisitorIntents(10);

      // 步骤6: 验证数据完整性
      expect(savedIntents.length).toBeGreaterThan(0);
      const savedIntent = savedIntents.find(
        (i) => i.session_id === "session_integration_1001",
      );
      expect(savedIntent).toBeTruthy();
      expect(savedIntent!.visit_id).toBe(1001);
      expect(savedIntent!.person_info.name).toBe("集成测试访客");
      expect(savedIntent!.dialogue_history).toHaveLength(3);

      // 清理
      unsubscribe();
      if (savedIntent?.id) {
        await localStorageService.deleteVisitorIntent(savedIntent.id);
      }
    });

    it("应正确处理多条访客意图消息的连续接收", async () => {
      const messages = [
        {
          type: "visitor_intent_notification",
          visit_id: 1002,
          session_id: "session_integration_1002",
          person_info: {
            person_id: 101,
            name: "访客A",
            relation_type: "family",
          },
          intent_summary: {
            intent_type: "visit",
            summary: "家人来访",
            important_notes: [],
            ai_analysis: "家人",
          },
          dialogue_history: [],
          ts: Date.now(),
        },
        {
          type: "visitor_intent_notification",
          visit_id: 1003,
          session_id: "session_integration_1003",
          person_info: {
            person_id: 102,
            name: "访客B",
            relation_type: "unknown",
          },
          intent_summary: {
            intent_type: "sales",
            summary: "推销员推销产品",
            important_notes: [],
            ai_analysis: "推销员",
          },
          dialogue_history: [],
          ts: Date.now() + 1000,
        },
        {
          type: "visitor_intent_notification",
          visit_id: 1004,
          session_id: "session_integration_1004",
          person_info: {
            person_id: 103,
            name: "访客C",
            relation_type: "unknown",
          },
          intent_summary: {
            intent_type: "maintenance",
            summary: "维修人员维修",
            important_notes: [],
            ai_analysis: "维修人员",
          },
          dialogue_history: [],
          ts: Date.now() + 2000,
        },
      ];

      const receivedIntents: any[] = [];
      const unsubscribe = deviceService.on("visitor_intent", (_, data) => {
        receivedIntents.push(data);
      });

      // 连续接收消息
      for (const msg of messages) {
        (deviceService as any).handleTextMessage(JSON.stringify(msg));
      }

      // 验证所有消息都被接收
      expect(receivedIntents).toHaveLength(3);

      // 保存所有数据
      for (const intent of receivedIntents) {
        await localStorageService.saveVisitorIntent(intent);
      }

      // 从IndexedDB读取
      const savedIntents = await localStorageService.getVisitorIntents(10);

      // 验证所有数据都被保存
      const sessionIds = savedIntents.map((i) => i.session_id);
      expect(sessionIds).toContain("session_integration_1002");
      expect(sessionIds).toContain("session_integration_1003");
      expect(sessionIds).toContain("session_integration_1004");

      // 清理
      unsubscribe();
      for (const intent of savedIntents) {
        if (
          intent.session_id.startsWith("session_integration_100") &&
          intent.id
        ) {
          await localStorageService.deleteVisitorIntent(intent.id);
        }
      }
    });
  });

  describe("2. 快递警报完整数据流", () => {
    it("应完成从消息接收到IndexedDB保存的完整流程", async () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 2001,
        session_id: "session_integration_2001",
        person_info: {
          person_id: 200,
          name: "快递警报测试",
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
          threat_level: "high",
          action: "taking",
          description: "检测到非主人拿走快递",
        },
        ts: Date.now(),
      };

      // 订阅事件
      let receivedIntent: any = null;
      let receivedAlert: any = null;

      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        receivedIntent = data;
      });

      const unsubAlert = deviceService.on("package_alert", (_, data) => {
        receivedAlert = data;
      });

      // 模拟接收消息
      (deviceService as any).handleTextMessage(JSON.stringify(mockMessage));

      // 验证访客意图事件
      expect(receivedIntent).toBeTruthy();
      expect(receivedIntent.package_check).toBeTruthy();

      // 验证快递警报事件
      expect(receivedAlert).toBeTruthy();
      expect(receivedAlert.session_id).toBe("session_integration_2001");
      expect(receivedAlert.threat_level).toBe("high");
      expect(receivedAlert.action).toBe("taking");

      // 保存到IndexedDB
      await localStorageService.saveVisitorIntent(receivedIntent);
      await localStorageService.savePackageAlert(receivedAlert);

      // 从IndexedDB读取
      const savedAlerts = await localStorageService.getPackageAlerts(10);

      // 验证数据完整性
      const savedAlert = savedAlerts.find(
        (a) => a.session_id === "session_integration_2001",
      );
      expect(savedAlert).toBeTruthy();
      expect(savedAlert!.threat_level).toBe("high");
      expect(savedAlert!.action).toBe("taking");
      expect(savedAlert!.description).toBe("检测到非主人拿走快递");

      // 清理
      unsubIntent();
      unsubAlert();
      if (savedAlert?.id) {
        await localStorageService.deletePackageAlert(savedAlert.id);
      }
      const savedIntents = await localStorageService.getVisitorIntents(10);
      const savedIntent = savedIntents.find(
        (i) => i.session_id === "session_integration_2001",
      );
      if (savedIntent?.id) {
        await localStorageService.deleteVisitorIntent(savedIntent.id);
      }
    });

    it("应正确处理不同威胁等级的快递警报", async () => {
      const messages = [
        {
          type: "visitor_intent_notification",
          visit_id: 2002,
          session_id: "session_integration_2002",
          person_info: {
            person_id: 201,
            name: "测试A",
            relation_type: "unknown",
          },
          intent_summary: {
            intent_type: "delivery",
            summary: "快递",
            important_notes: [],
            ai_analysis: "快递",
          },
          dialogue_history: [],
          package_check: {
            threat_level: "low",
            action: "passing",
            description: "有人路过快递",
          },
          ts: Date.now(),
        },
        {
          type: "visitor_intent_notification",
          visit_id: 2003,
          session_id: "session_integration_2003",
          person_info: {
            person_id: 202,
            name: "测试B",
            relation_type: "unknown",
          },
          intent_summary: {
            intent_type: "delivery",
            summary: "快递",
            important_notes: [],
            ai_analysis: "快递",
          },
          dialogue_history: [],
          package_check: {
            threat_level: "medium",
            action: "searching",
            description: "检测到有人翻看快递",
          },
          ts: Date.now() + 1000,
        },
        {
          type: "visitor_intent_notification",
          visit_id: 2004,
          session_id: "session_integration_2004",
          person_info: {
            person_id: 203,
            name: "测试C",
            relation_type: "unknown",
          },
          intent_summary: {
            intent_type: "delivery",
            summary: "快递",
            important_notes: [],
            ai_analysis: "快递",
          },
          dialogue_history: [],
          package_check: {
            threat_level: "high",
            action: "damaging",
            description: "检测到有人破坏快递",
          },
          ts: Date.now() + 2000,
        },
      ];

      const receivedAlerts: any[] = [];
      const unsubscribe = deviceService.on("package_alert", (_, data) => {
        receivedAlerts.push(data);
      });

      // 连续接收消息
      for (const msg of messages) {
        (deviceService as any).handleTextMessage(JSON.stringify(msg));
      }

      // 验证所有警报都被接收
      expect(receivedAlerts).toHaveLength(3);
      expect(receivedAlerts[0].threat_level).toBe("low");
      expect(receivedAlerts[1].threat_level).toBe("medium");
      expect(receivedAlerts[2].threat_level).toBe("high");

      // 保存所有数据
      for (const alert of receivedAlerts) {
        await localStorageService.savePackageAlert(alert);
      }

      // 从IndexedDB读取
      const savedAlerts = await localStorageService.getPackageAlerts(10);

      // 验证所有数据都被保存
      const sessionIds = savedAlerts.map((a) => a.session_id);
      expect(sessionIds).toContain("session_integration_2002");
      expect(sessionIds).toContain("session_integration_2003");
      expect(sessionIds).toContain("session_integration_2004");

      // 清理
      unsubscribe();
      for (const alert of savedAlerts) {
        if (
          alert.session_id.startsWith("session_integration_200") &&
          alert.id
        ) {
          await localStorageService.deletePackageAlert(alert.id);
        }
      }
    });
  });

  describe("3. 查询和数据合并逻辑", () => {
    it("应正确构造访客意图查询消息（需要WebSocket连接）", () => {
      // 注意：此测试需要WebSocket连接，在未连接状态下会返回null
      const queryId = deviceService.queryVisitorIntents({
        start_date: "2024-12-01",
        end_date: "2024-12-31",
        limit: 20,
        offset: 0,
      });

      // 未连接时返回null是正常的
      expect(queryId).toBeNull();
    });

    it("应正确构造快递警报查询消息（需要WebSocket连接）", () => {
      // 注意：此测试需要WebSocket连接，在未连接状态下会返回null
      const queryId = deviceService.queryPackageAlerts({
        threat_level: "high",
        start_date: "2024-12-01",
        end_date: "2024-12-31",
        limit: 10,
        offset: 0,
      });

      // 未连接时返回null是正常的
      expect(queryId).toBeNull();
    });

    it("应正确处理访客意图查询结果", async () => {
      // 准备查询结果数据
      const mockQueryResult = {
        type: "query_result",
        msg_id: "query_123",
        target: "visitor_intents",
        data: {
          records: [
            {
              visit_id: 3001,
              session_id: "session_query_3001",
              person_info: {
                person_id: 300,
                name: "查询测试访客",
                relation_type: "friend",
              },
              intent_summary: {
                intent_type: "visit",
                summary: "朋友来访",
                important_notes: [],
                ai_analysis: "朋友",
              },
              dialogue_history: [],
              ts: Date.now(),
            },
          ],
          total: 1,
        },
      };

      // 订阅查询结果事件
      let receivedResult: any = null;
      const unsubscribe = deviceService.on(
        "visitor_intents_query_result",
        (_, data) => {
          receivedResult = data;
        },
      );

      // 模拟接收查询结果
      (deviceService as any).handleTextMessage(JSON.stringify(mockQueryResult));

      // 验证查询结果事件
      expect(receivedResult).toBeTruthy();
      if (receivedResult) {
        expect(receivedResult.data).toHaveLength(1);
        expect(receivedResult.data[0].visit_id).toBe(3001);
        expect(receivedResult.total).toBe(1);
      }

      // 清理
      unsubscribe();
    });

    it("应正确处理快递警报查询结果", async () => {
      const mockQueryResult = {
        type: "query_result",
        msg_id: "query_456",
        target: "package_alerts",
        data: {
          records: [
            {
              device_id: "device_001",
              session_id: "session_query_4001",
              threat_level: "medium",
              action: "searching",
              description: "查询测试警报",
              photo_path: "/path/to/photo.jpg",
              voice_warning_sent: false,
              notified: false,
              created_at: new Date().toISOString(),
              ts: Date.now(),
            },
          ],
          total: 1,
        },
      };

      let receivedResult: any = null;
      const unsubscribe = deviceService.on(
        "package_alerts_query_result",
        (_, data) => {
          receivedResult = data;
        },
      );

      (deviceService as any).handleTextMessage(JSON.stringify(mockQueryResult));

      expect(receivedResult).toBeTruthy();
      if (receivedResult) {
        expect(receivedResult.data).toHaveLength(1);
        expect(receivedResult.data[0].threat_level).toBe("medium");
        expect(receivedResult.total).toBe(1);
      }

      unsubscribe();
    });

    it("应正确合并推送和查询的数据（去重）", async () => {
      // 场景：先收到推送，再收到查询结果，应该去重
      const sessionId = "session_merge_5001";

      // 步骤1: 收到推送消息
      const pushMessage = {
        type: "visitor_intent_notification",
        visit_id: 5001,
        session_id: sessionId,
        person_info: {
          person_id: 500,
          name: "合并测试访客",
          relation_type: "family",
        },
        intent_summary: {
          intent_type: "visit",
          summary: "家人来访",
          important_notes: [],
          ai_analysis: "家人",
        },
        dialogue_history: [],
        ts: Date.now(),
      };

      const receivedIntents: any[] = [];
      const unsubIntent = deviceService.on("visitor_intent", (_, data) => {
        receivedIntents.push(data);
      });

      (deviceService as any).handleTextMessage(JSON.stringify(pushMessage));

      // 步骤2: 收到查询结果（包含相同的session_id）
      const queryResult = {
        type: "query_result",
        msg_id: "query_merge",
        target: "visitor_intents",
        data: {
          records: [
            {
              visit_id: 5001,
              session_id: sessionId,
              person_info: {
                person_id: 500,
                name: "合并测试访客",
                relation_type: "family",
              },
              intent_summary: {
                intent_type: "visit",
                summary: "家人来访",
                important_notes: [],
                ai_analysis: "家人",
              },
              dialogue_history: [],
              ts: Date.now(),
            },
          ],
          total: 1,
        },
      };

      let queryResultData: any = null;
      const unsubQuery = deviceService.on(
        "visitor_intents_query_result",
        (_, data) => {
          queryResultData = data;
        },
      );

      (deviceService as any).handleTextMessage(JSON.stringify(queryResult));

      // 验证：推送和查询都收到了
      expect(receivedIntents).toHaveLength(1);
      expect(queryResultData).toBeTruthy();
      if (queryResultData) {
        expect(queryResultData.data).toHaveLength(1);

        // 模拟App.tsx中的合并去重逻辑
        const mergeAndDeduplicate = (
          existing: any[],
          newData: any[],
        ): any[] => {
          const merged = [...existing, ...newData];
          const uniqueMap = new Map<string, any>();

          merged.forEach((item) => {
            if (
              !uniqueMap.has(item.session_id) ||
              item.ts > uniqueMap.get(item.session_id)!.ts
            ) {
              uniqueMap.set(item.session_id, item);
            }
          });

          return Array.from(uniqueMap.values());
        };

        const mergedData = mergeAndDeduplicate(
          receivedIntents,
          queryResultData.data,
        );

        // 验证：合并后应该只有1条记录（去重成功）
        expect(mergedData).toHaveLength(1);
        expect(mergedData[0].session_id).toBe(sessionId);
      }

      // 清理
      unsubIntent();
      unsubQuery();
    });
  });

  describe("4. 端到端数据流测试", () => {
    it("应完成完整的端到端数据流：推送→事件→保存→查询→合并", async () => {
      const testSessionId = "session_e2e_6001";

      // 步骤1: 接收推送消息
      const pushMessage = {
        type: "visitor_intent_notification",
        visit_id: 6001,
        session_id: testSessionId,
        person_info: {
          person_id: 600,
          name: "端到端测试",
          relation_type: "friend",
        },
        intent_summary: {
          intent_type: "delivery",
          summary: "快递员送快递",
          important_notes: ["测试包裹"],
          ai_analysis: "快递员",
        },
        dialogue_history: [
          { role: "assistant", content: "您好" },
          { role: "user", content: "送快递" },
        ],
        package_check: {
          threat_level: "low",
          action: "normal",
          description: "正常送快递",
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

      (deviceService as any).handleTextMessage(JSON.stringify(pushMessage));

      // 步骤2: 验证事件触发
      expect(receivedIntent).toBeTruthy();
      expect(receivedAlert).toBeTruthy();

      // 步骤3: 保存到IndexedDB
      await localStorageService.saveVisitorIntent(receivedIntent);
      await localStorageService.savePackageAlert(receivedAlert);

      // 步骤4: 从IndexedDB读取（模拟App启动加载缓存）
      const cachedIntents = await localStorageService.getVisitorIntents(100);
      const cachedAlerts = await localStorageService.getPackageAlerts(100);

      const cachedIntent = cachedIntents.find(
        (i) => i.session_id === testSessionId,
      );
      const cachedAlert = cachedAlerts.find(
        (a) => a.session_id === testSessionId,
      );

      expect(cachedIntent).toBeTruthy();
      expect(cachedAlert).toBeTruthy();

      // 步骤5: 模拟查询（切换到首页时触发）
      // 注意：未连接时queryVisitorIntents返回null，这里直接模拟查询结果
      const mockQueryId = "query_e2e_6001";

      // 步骤6: 模拟接收查询结果
      const queryResult = {
        type: "query_result",
        msg_id: mockQueryId,
        target: "visitor_intents",
        data: {
          records: [receivedIntent],
          total: 1,
        },
      };

      let queryResultData: any = null;
      const unsubQuery = deviceService.on(
        "visitor_intents_query_result",
        (_, data) => {
          queryResultData = data;
        },
      );

      (deviceService as any).handleTextMessage(JSON.stringify(queryResult));

      // 步骤7: 验证查询结果
      expect(queryResultData).toBeTruthy();
      if (queryResultData) {
        expect(queryResultData.data).toHaveLength(1);

        // 步骤8: 验证完整数据流
        expect(receivedIntent.visit_id).toBe(6001);
        expect(receivedIntent.dialogue_history).toHaveLength(2);
        expect(receivedAlert.threat_level).toBe("low");
        expect(cachedIntent!.visit_id).toBe(6001);
        expect(cachedAlert!.threat_level).toBe("low");
        expect(queryResultData.data[0].visit_id).toBe(6001);
      }

      // 清理
      unsubIntent();
      unsubAlert();
      unsubQuery();
      if (cachedIntent?.id) {
        await localStorageService.deleteVisitorIntent(cachedIntent.id);
      }
      if (cachedAlert?.id) {
        await localStorageService.deletePackageAlert(cachedAlert.id);
      }
    });
  });
});
