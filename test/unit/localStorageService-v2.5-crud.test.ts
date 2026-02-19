/**
 * LocalStorageService v2.5 协议 CRUD 操作测试
 * 验证任务 3.3 的实现
 * 需求: 12.1, 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { localStorageService } from "@/services/LocalStorageService";
import type { VisitorIntent, PackageAlert } from "@/types";

describe("LocalStorageService - v2.5 协议 CRUD 操作", () => {
  // 在每个测试前初始化数据库
  beforeEach(async () => {
    // 重置单例状态
    (localStorageService as any).isInitialized = false;
    (localStorageService as any).isFallbackMode = false;
    (localStorageService as any).db = null;

    // 初始化数据库
    await localStorageService.init();
  });

  // 在每个测试后清理数据库
  afterEach(async () => {
    const db = localStorageService.getDb();
    if (db) {
      db.close();
    }
    // 删除测试数据库
    if (window.indexedDB) {
      await new Promise<void>((resolve) => {
        const request = window.indexedDB.deleteDatabase("SmartDoorlockDB");
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    }
  });

  describe("访客意图 CRUD 操作", () => {
    describe("saveVisitorIntent() - 保存访客意图", () => {
      it("应该成功保存访客意图记录", async () => {
        // 需求: 12.1
        const intent: VisitorIntent = {
          id: 1,
          visit_id: 100,
          session_id: "session_001",
          person_id: 10,
          person_name: "张三",
          relation_type: "family",
          intent_type: "delivery",
          intent_summary: {
            intent_type: "delivery",
            summary: "快递员送快递",
            important_notes: ["包裹较大", "需要签收"],
            ai_analysis: "访客是快递员，携带包裹前来送货",
          },
          dialogue_history: [
            { role: "assistant", content: "您好，请问有什么事吗？" },
            { role: "user", content: "我是快递员，有您的包裹" },
          ],
          created_at: new Date().toISOString(),
          ts: Date.now(),
        };

        await localStorageService.saveVisitorIntent(intent);

        // 验证数据已保存
        const saved = await localStorageService.get<VisitorIntent>(
          "visitor_intents",
          1,
        );
        expect(saved).not.toBeNull();
        expect(saved?.visit_id).toBe(100);
        expect(saved?.person_name).toBe("张三");
        expect(saved?.intent_type).toBe("delivery");
      });

      it("应该保存完整的对话历史", async () => {
        // 需求: 12.3
        const intent: VisitorIntent = {
          id: 2,
          visit_id: 101,
          session_id: "session_002",
          person_id: null,
          person_name: "未知访客",
          relation_type: "unknown",
          intent_type: "sales",
          intent_summary: {
            intent_type: "sales",
            summary: "推销人员",
            important_notes: [],
            ai_analysis: "访客疑似推销人员",
          },
          dialogue_history: [
            { role: "assistant", content: "您好" },
            { role: "user", content: "我想介绍一个产品" },
            { role: "assistant", content: "抱歉，我们不需要" },
          ],
          created_at: new Date().toISOString(),
          ts: Date.now(),
        };

        await localStorageService.saveVisitorIntent(intent);

        const saved = await localStorageService.get<VisitorIntent>(
          "visitor_intents",
          2,
        );
        expect(saved?.dialogue_history).toHaveLength(3);
        expect(saved?.dialogue_history[0].role).toBe("assistant");
        expect(saved?.dialogue_history[1].role).toBe("user");
      });

      it("应该保存包含快递检查的访客意图", async () => {
        // 需求: 12.3
        const intent: VisitorIntent = {
          id: 3,
          visit_id: 102,
          session_id: "session_003",
          person_id: 11,
          person_name: "李四",
          relation_type: "friend",
          intent_type: "delivery",
          intent_summary: {
            intent_type: "delivery",
            summary: "快递配送",
            important_notes: [],
            ai_analysis: "正常快递配送",
          },
          dialogue_history: [],
          package_check: {
            threat_level: "low",
            action: "normal",
            description: "正常放置快递",
          },
          created_at: new Date().toISOString(),
          ts: Date.now(),
        };

        await localStorageService.saveVisitorIntent(intent);

        const saved = await localStorageService.get<VisitorIntent>(
          "visitor_intents",
          3,
        );
        expect(saved?.package_check).toBeDefined();
        expect(saved?.package_check?.threat_level).toBe("low");
        expect(saved?.package_check?.action).toBe("normal");
      });
    });

    describe("getVisitorIntents() - 获取访客意图列表", () => {
      beforeEach(async () => {
        // 准备测试数据：10 条访客意图记录
        const intents: VisitorIntent[] = [];
        for (let i = 1; i <= 10; i++) {
          intents.push({
            id: i,
            visit_id: 100 + i,
            session_id: `session_${i.toString().padStart(3, "0")}`,
            person_id: i,
            person_name: `访客${i}`,
            relation_type: "unknown",
            intent_type: "delivery",
            intent_summary: {
              intent_type: "delivery",
              summary: `访客${i}的意图`,
              important_notes: [],
              ai_analysis: "AI分析结果",
            },
            dialogue_history: [],
            created_at: new Date(Date.now() - i * 60000).toISOString(),
            ts: Date.now() - i * 60000, // 每条记录间隔 1 分钟
          });
        }

        // 批量保存
        for (const intent of intents) {
          await localStorageService.saveVisitorIntent(intent);
        }
      });

      it("应该按时间戳降序返回访客意图列表", async () => {
        // 需求: 12.2, 12.4
        const intents = await localStorageService.getVisitorIntents(10);

        expect(intents.length).toBe(10);
        // 最新的记录应该在前面（id=1 的 ts 最大）
        expect(intents[0].id).toBe(1);
        expect(intents[9].id).toBe(10);
      });

      it("应该支持限制返回数量", async () => {
        // 需求: 12.2
        const intents = await localStorageService.getVisitorIntents(5);

        expect(intents.length).toBe(5);
        // 应该返回最新的 5 条
        expect(intents[0].id).toBe(1);
        expect(intents[4].id).toBe(5);
      });

      it("默认应该返回最近100条记录", async () => {
        // 需求: 12.2
        const intents = await localStorageService.getVisitorIntents();

        // 当前只有 10 条数据
        expect(intents.length).toBe(10);
      });

      it("空数据库应该返回空数组", async () => {
        // 需求: 12.4
        // 清空数据
        await localStorageService.clear("visitor_intents");

        const intents = await localStorageService.getVisitorIntents();
        expect(intents).toEqual([]);
      });
    });

    describe("deleteVisitorIntent() - 删除访客意图", () => {
      it("应该成功删除访客意图记录", async () => {
        // 需求: 12.5
        const intent: VisitorIntent = {
          id: 1,
          visit_id: 100,
          session_id: "session_001",
          person_id: 10,
          person_name: "张三",
          relation_type: "family",
          intent_type: "delivery",
          intent_summary: {
            intent_type: "delivery",
            summary: "快递配送",
            important_notes: [],
            ai_analysis: "AI分析",
          },
          dialogue_history: [],
          created_at: new Date().toISOString(),
          ts: Date.now(),
        };

        await localStorageService.saveVisitorIntent(intent);

        // 验证数据存在
        let saved = await localStorageService.get<VisitorIntent>(
          "visitor_intents",
          1,
        );
        expect(saved).not.toBeNull();

        // 删除数据
        await localStorageService.deleteVisitorIntent(1);

        // 验证数据已删除
        saved = await localStorageService.get<VisitorIntent>(
          "visitor_intents",
          1,
        );
        expect(saved).toBeNull();
      });

      it("删除不存在的记录应该不报错", async () => {
        await expect(
          localStorageService.deleteVisitorIntent(999),
        ).resolves.not.toThrow();
      });
    });
  });

  describe("快递警报 CRUD 操作", () => {
    describe("savePackageAlert() - 保存快递警报", () => {
      it("应该成功保存快递警报记录", async () => {
        // 需求: 13.1
        const alert: PackageAlert = {
          id: 1,
          device_id: "device_001",
          session_id: "session_001",
          threat_level: "high",
          action: "taking",
          description: "检测到非主人拿走快递",
          photo_path: "/media/alert_001.jpg",
          photo_thumbnail: "/media/alert_001_thumb.jpg",
          voice_warning_sent: true,
          notified: true,
          created_at: new Date().toISOString(),
          ts: Date.now(),
        };

        await localStorageService.savePackageAlert(alert);

        // 验证数据已保存
        const saved = await localStorageService.get<PackageAlert>(
          "package_alerts",
          1,
        );
        expect(saved).not.toBeNull();
        expect(saved?.threat_level).toBe("high");
        expect(saved?.action).toBe("taking");
        expect(saved?.description).toBe("检测到非主人拿走快递");
      });

      it("应该保存不同威胁等级的警报", async () => {
        // 需求: 13.3
        const alerts: PackageAlert[] = [
          {
            id: 1,
            device_id: "device_001",
            session_id: "session_001",
            threat_level: "low",
            action: "normal",
            description: "正常放置快递",
            photo_path: "/media/alert_001.jpg",
            voice_warning_sent: false,
            notified: false,
            created_at: new Date().toISOString(),
            ts: Date.now(),
          },
          {
            id: 2,
            device_id: "device_001",
            session_id: "session_002",
            threat_level: "medium",
            action: "searching",
            description: "检测到翻找快递行为",
            photo_path: "/media/alert_002.jpg",
            voice_warning_sent: true,
            notified: true,
            created_at: new Date().toISOString(),
            ts: Date.now(),
          },
          {
            id: 3,
            device_id: "device_001",
            session_id: "session_003",
            threat_level: "high",
            action: "damaging",
            description: "检测到破坏快递行为",
            photo_path: "/media/alert_003.jpg",
            voice_warning_sent: true,
            notified: true,
            created_at: new Date().toISOString(),
            ts: Date.now(),
          },
        ];

        for (const alert of alerts) {
          await localStorageService.savePackageAlert(alert);
        }

        const lowAlert = await localStorageService.get<PackageAlert>(
          "package_alerts",
          1,
        );
        const mediumAlert = await localStorageService.get<PackageAlert>(
          "package_alerts",
          2,
        );
        const highAlert = await localStorageService.get<PackageAlert>(
          "package_alerts",
          3,
        );

        expect(lowAlert?.threat_level).toBe("low");
        expect(mediumAlert?.threat_level).toBe("medium");
        expect(highAlert?.threat_level).toBe("high");
      });

      it("应该保存照片路径信息", async () => {
        // 需求: 13.3
        const alert: PackageAlert = {
          id: 1,
          device_id: "device_001",
          session_id: "session_001",
          threat_level: "medium",
          action: "searching",
          description: "翻找快递",
          photo_path: "/media/package_alert_20241211_103000.jpg",
          photo_thumbnail: "/media/package_alert_20241211_103000_thumb.jpg",
          voice_warning_sent: true,
          notified: true,
          created_at: new Date().toISOString(),
          ts: Date.now(),
        };

        await localStorageService.savePackageAlert(alert);

        const saved = await localStorageService.get<PackageAlert>(
          "package_alerts",
          1,
        );
        expect(saved?.photo_path).toBe(
          "/media/package_alert_20241211_103000.jpg",
        );
        expect(saved?.photo_thumbnail).toBe(
          "/media/package_alert_20241211_103000_thumb.jpg",
        );
      });
    });

    describe("getPackageAlerts() - 获取快递警报列表", () => {
      beforeEach(async () => {
        // 准备测试数据：10 条快递警报记录
        const alerts: PackageAlert[] = [];
        for (let i = 1; i <= 10; i++) {
          alerts.push({
            id: i,
            device_id: "device_001",
            session_id: `session_${i.toString().padStart(3, "0")}`,
            threat_level: i % 3 === 0 ? "high" : i % 2 === 0 ? "medium" : "low",
            action: "normal",
            description: `警报${i}`,
            photo_path: `/media/alert_${i}.jpg`,
            voice_warning_sent: false,
            notified: false,
            created_at: new Date(Date.now() - i * 60000).toISOString(),
            ts: Date.now() - i * 60000, // 每条记录间隔 1 分钟
          });
        }

        // 批量保存
        for (const alert of alerts) {
          await localStorageService.savePackageAlert(alert);
        }
      });

      it("应该按时间戳降序返回快递警报列表", async () => {
        // 需求: 13.2, 13.4
        const alerts = await localStorageService.getPackageAlerts(10);

        expect(alerts.length).toBe(10);
        // 最新的记录应该在前面（id=1 的 ts 最大）
        expect(alerts[0].id).toBe(1);
        expect(alerts[9].id).toBe(10);
      });

      it("应该支持限制返回数量", async () => {
        // 需求: 13.2
        const alerts = await localStorageService.getPackageAlerts(5);

        expect(alerts.length).toBe(5);
        // 应该返回最新的 5 条
        expect(alerts[0].id).toBe(1);
        expect(alerts[4].id).toBe(5);
      });

      it("默认应该返回最近100条记录", async () => {
        // 需求: 13.2
        const alerts = await localStorageService.getPackageAlerts();

        // 当前只有 10 条数据
        expect(alerts.length).toBe(10);
      });

      it("空数据库应该返回空数组", async () => {
        // 需求: 13.4
        // 清空数据
        await localStorageService.clear("package_alerts");

        const alerts = await localStorageService.getPackageAlerts();
        expect(alerts).toEqual([]);
      });
    });

    describe("deletePackageAlert() - 删除快递警报", () => {
      it("应该成功删除快递警报记录", async () => {
        // 需求: 13.5
        const alert: PackageAlert = {
          id: 1,
          device_id: "device_001",
          session_id: "session_001",
          threat_level: "high",
          action: "taking",
          description: "拿走快递",
          photo_path: "/media/alert_001.jpg",
          voice_warning_sent: true,
          notified: true,
          created_at: new Date().toISOString(),
          ts: Date.now(),
        };

        await localStorageService.savePackageAlert(alert);

        // 验证数据存在
        let saved = await localStorageService.get<PackageAlert>(
          "package_alerts",
          1,
        );
        expect(saved).not.toBeNull();

        // 删除数据
        await localStorageService.deletePackageAlert(1);

        // 验证数据已删除
        saved = await localStorageService.get<PackageAlert>(
          "package_alerts",
          1,
        );
        expect(saved).toBeNull();
      });

      it("删除不存在的记录应该不报错", async () => {
        await expect(
          localStorageService.deletePackageAlert(999),
        ).resolves.not.toThrow();
      });
    });
  });

  describe("降级模式下的 v2.5 CRUD 操作", () => {
    beforeEach(() => {
      // 每个测试前清空降级存储
      const fallbackStorage = (localStorageService as any).fallbackStorage;
      (fallbackStorage as any).memoryStore = new Map();
      // 设置降级模式
      (localStorageService as any).isFallbackMode = true;
    });

    it("降级模式下应该能保存和读取访客意图", async () => {
      const intent: VisitorIntent = {
        id: 1,
        visit_id: 100,
        session_id: "session_001",
        person_id: 10,
        person_name: "张三",
        relation_type: "family",
        intent_type: "delivery",
        intent_summary: {
          intent_type: "delivery",
          summary: "快递配送",
          important_notes: [],
          ai_analysis: "AI分析",
        },
        dialogue_history: [],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      await localStorageService.saveVisitorIntent(intent);

      const intents = await localStorageService.getVisitorIntents(10);
      expect(intents.length).toBe(1);
      expect(intents[0].person_name).toBe("张三");
    });

    it("降级模式下应该能保存和读取快递警报", async () => {
      const alert: PackageAlert = {
        id: 1,
        device_id: "device_001",
        session_id: "session_001",
        threat_level: "high",
        action: "taking",
        description: "拿走快递",
        photo_path: "/media/alert_001.jpg",
        voice_warning_sent: true,
        notified: true,
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      await localStorageService.savePackageAlert(alert);

      const alerts = await localStorageService.getPackageAlerts(10);
      expect(alerts.length).toBe(1);
      expect(alerts[0].threat_level).toBe("high");
    });
  });
});
