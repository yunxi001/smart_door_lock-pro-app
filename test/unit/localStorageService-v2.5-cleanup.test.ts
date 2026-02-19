/**
 * LocalStorageService v2.5 数据清理功能测试
 * 测试访客意图和快递警报的时间清理、数量清理功能
 * 需求: 23.1, 23.2, 23.3, 23.4
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { localStorageService } from "@/services/LocalStorageService";

describe("LocalStorageService - v2.5数据清理功能", () => {
  beforeEach(async () => {
    // 初始化数据库
    await localStorageService.init();

    // 清空测试数据
    await localStorageService.clear("visitor_intents");
    await localStorageService.clear("package_alerts");
  });

  afterEach(async () => {
    // 清理测试数据
    await localStorageService.clear("visitor_intents");
    await localStorageService.clear("package_alerts");
  });

  describe("visitor_intents - 按时间清理", () => {
    it("应该删除超过30天的访客意图记录", async () => {
      // 准备测试数据：3条记录，不同时间
      const now = new Date();
      const records = [
        {
          id: 1,
          visit_id: 101,
          session_id: "session_101",
          person_id: 1,
          person_name: "张三",
          relation_type: "family",
          intent_type: "delivery",
          intent_summary: {
            intent_type: "delivery",
            summary: "快递员送快递",
            important_notes: [],
            ai_analysis: "正常快递配送",
          },
          dialogue_history: [],
          created_at: new Date(
            now.getTime() - 40 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ts: now.getTime() - 40 * 24 * 60 * 60 * 1000, // 40天前
        },
        {
          id: 2,
          visit_id: 102,
          session_id: "session_102",
          person_id: 2,
          person_name: "李四",
          relation_type: "friend",
          intent_type: "visit",
          intent_summary: {
            intent_type: "visit",
            summary: "朋友来访",
            important_notes: [],
            ai_analysis: "正常拜访",
          },
          dialogue_history: [],
          created_at: new Date(
            now.getTime() - 20 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ts: now.getTime() - 20 * 24 * 60 * 60 * 1000, // 20天前
        },
        {
          id: 3,
          visit_id: 103,
          session_id: "session_103",
          person_id: 3,
          person_name: "王五",
          relation_type: "unknown",
          intent_type: "sales",
          intent_summary: {
            intent_type: "sales",
            summary: "推销人员",
            important_notes: [],
            ai_analysis: "推销产品",
          },
          dialogue_history: [],
          created_at: new Date(
            now.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ts: now.getTime() - 5 * 24 * 60 * 60 * 1000, // 5天前
        },
      ];

      // 保存测试数据
      await localStorageService.saveBatch("visitor_intents", records);

      // 清理30天前的数据
      const deletedCount = await localStorageService.cleanupByAge(
        "visitor_intents",
        30,
      );

      // 验证删除了1条记录（40天前的）
      expect(deletedCount).toBe(1);

      // 验证剩余2条记录
      const remaining = await localStorageService.getAll("visitor_intents");
      expect(remaining).toHaveLength(2);
      expect(remaining.map((r: any) => r.id).sort()).toEqual([2, 3]);
    });

    it("应该在没有过期记录时返回0", async () => {
      // 准备测试数据：所有记录都在30天内
      const now = new Date();
      const records = [
        {
          id: 1,
          visit_id: 101,
          session_id: "session_101",
          person_id: 1,
          person_name: "张三",
          relation_type: "family",
          intent_type: "delivery",
          intent_summary: {
            intent_type: "delivery",
            summary: "快递员送快递",
            important_notes: [],
            ai_analysis: "正常快递配送",
          },
          dialogue_history: [],
          created_at: new Date(
            now.getTime() - 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ts: now.getTime() - 10 * 24 * 60 * 60 * 1000,
        },
        {
          id: 2,
          visit_id: 102,
          session_id: "session_102",
          person_id: 2,
          person_name: "李四",
          relation_type: "friend",
          intent_type: "visit",
          intent_summary: {
            intent_type: "visit",
            summary: "朋友来访",
            important_notes: [],
            ai_analysis: "正常拜访",
          },
          dialogue_history: [],
          created_at: new Date(
            now.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ts: now.getTime() - 5 * 24 * 60 * 60 * 1000,
        },
      ];

      await localStorageService.saveBatch("visitor_intents", records);

      // 清理30天前的数据
      const deletedCount = await localStorageService.cleanupByAge(
        "visitor_intents",
        30,
      );

      // 验证没有删除任何记录
      expect(deletedCount).toBe(0);

      // 验证所有记录仍然存在
      const remaining = await localStorageService.getAll("visitor_intents");
      expect(remaining).toHaveLength(2);
    });
  });

  describe("visitor_intents - 按数量清理", () => {
    it("应该保留最新的1000条记录，删除其余记录", async () => {
      // 准备测试数据：1200条记录
      const now = new Date();
      const records = Array.from({ length: 1200 }, (_, i) => ({
        id: i + 1,
        visit_id: 100 + i,
        session_id: `session_${100 + i}`,
        person_id: i + 1,
        person_name: `访客${i + 1}`,
        relation_type: "unknown",
        intent_type: "delivery",
        intent_summary: {
          intent_type: "delivery",
          summary: `访客${i + 1}的意图`,
          important_notes: [],
          ai_analysis: "AI分析",
        },
        dialogue_history: [],
        created_at: new Date(
          now.getTime() - (1200 - i) * 60 * 60 * 1000,
        ).toISOString(),
        ts: now.getTime() - (1200 - i) * 60 * 60 * 1000, // 按时间递增
      }));

      await localStorageService.saveBatch("visitor_intents", records);

      // 保留最新的1000条记录
      const deletedCount = await localStorageService.cleanupByCount(
        "visitor_intents",
        1000,
      );

      // 验证删除了200条记录
      expect(deletedCount).toBe(200);

      // 验证剩余1000条记录
      const remaining = await localStorageService.getAll("visitor_intents");
      expect(remaining).toHaveLength(1000);

      // 验证保留的是最新的1000条（id 201-1200）
      const remainingIds = remaining
        .map((r: any) => r.id)
        .sort((a, b) => a - b);
      expect(remainingIds[0]).toBeGreaterThanOrEqual(201);
      expect(remainingIds[remainingIds.length - 1]).toBe(1200);
    });

    it("应该在记录数少于1000时不删除任何记录", async () => {
      // 准备测试数据：500条记录
      const now = new Date();
      const records = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        visit_id: 100 + i,
        session_id: `session_${100 + i}`,
        person_id: i + 1,
        person_name: `访客${i + 1}`,
        relation_type: "unknown",
        intent_type: "delivery",
        intent_summary: {
          intent_type: "delivery",
          summary: `访客${i + 1}的意图`,
          important_notes: [],
          ai_analysis: "AI分析",
        },
        dialogue_history: [],
        created_at: new Date(
          now.getTime() - (500 - i) * 60 * 60 * 1000,
        ).toISOString(),
        ts: now.getTime() - (500 - i) * 60 * 60 * 1000,
      }));

      await localStorageService.saveBatch("visitor_intents", records);

      // 保留最新的1000条记录（实际只有500条）
      const deletedCount = await localStorageService.cleanupByCount(
        "visitor_intents",
        1000,
      );

      // 验证没有删除任何记录
      expect(deletedCount).toBe(0);

      // 验证所有记录仍然存在
      const remaining = await localStorageService.getAll("visitor_intents");
      expect(remaining).toHaveLength(500);
    });
  });

  describe("package_alerts - 按时间清理", () => {
    it("应该删除超过30天的快递警报记录", async () => {
      // 准备测试数据：3条记录，不同时间
      const now = new Date();
      const records = [
        {
          id: 1,
          device_id: "device_001",
          session_id: "session_201",
          threat_level: "high",
          action: "taking",
          description: "检测到非主人拿走快递",
          photo_path: "/photos/alert1.jpg",
          voice_warning_sent: true,
          notified: true,
          created_at: new Date(
            now.getTime() - 40 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ts: now.getTime() - 40 * 24 * 60 * 60 * 1000, // 40天前
        },
        {
          id: 2,
          device_id: "device_001",
          session_id: "session_202",
          threat_level: "medium",
          action: "searching",
          description: "检测到可疑行为",
          photo_path: "/photos/alert2.jpg",
          voice_warning_sent: false,
          notified: true,
          created_at: new Date(
            now.getTime() - 20 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ts: now.getTime() - 20 * 24 * 60 * 60 * 1000, // 20天前
        },
        {
          id: 3,
          device_id: "device_001",
          session_id: "session_203",
          threat_level: "low",
          action: "passing",
          description: "正常路过",
          photo_path: "/photos/alert3.jpg",
          voice_warning_sent: false,
          notified: false,
          created_at: new Date(
            now.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ts: now.getTime() - 5 * 24 * 60 * 60 * 1000, // 5天前
        },
      ];

      // 保存测试数据
      await localStorageService.saveBatch("package_alerts", records);

      // 清理30天前的数据
      const deletedCount = await localStorageService.cleanupByAge(
        "package_alerts",
        30,
      );

      // 验证删除了1条记录（40天前的）
      expect(deletedCount).toBe(1);

      // 验证剩余2条记录
      const remaining = await localStorageService.getAll("package_alerts");
      expect(remaining).toHaveLength(2);
      expect(remaining.map((r: any) => r.id).sort()).toEqual([2, 3]);
    });

    it("应该在没有过期记录时返回0", async () => {
      // 准备测试数据：所有记录都在30天内
      const now = new Date();
      const records = [
        {
          id: 1,
          device_id: "device_001",
          session_id: "session_201",
          threat_level: "high",
          action: "taking",
          description: "检测到非主人拿走快递",
          photo_path: "/photos/alert1.jpg",
          voice_warning_sent: true,
          notified: true,
          created_at: new Date(
            now.getTime() - 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ts: now.getTime() - 10 * 24 * 60 * 60 * 1000,
        },
        {
          id: 2,
          device_id: "device_001",
          session_id: "session_202",
          threat_level: "medium",
          action: "searching",
          description: "检测到可疑行为",
          photo_path: "/photos/alert2.jpg",
          voice_warning_sent: false,
          notified: true,
          created_at: new Date(
            now.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          ts: now.getTime() - 5 * 24 * 60 * 60 * 1000,
        },
      ];

      await localStorageService.saveBatch("package_alerts", records);

      // 清理30天前的数据
      const deletedCount = await localStorageService.cleanupByAge(
        "package_alerts",
        30,
      );

      // 验证没有删除任何记录
      expect(deletedCount).toBe(0);

      // 验证所有记录仍然存在
      const remaining = await localStorageService.getAll("package_alerts");
      expect(remaining).toHaveLength(2);
    });
  });

  describe("package_alerts - 按数量清理", () => {
    it("应该保留最新的1000条记录，删除其余记录", async () => {
      // 准备测试数据：1200条记录
      const now = new Date();
      const records = Array.from({ length: 1200 }, (_, i) => ({
        id: i + 1,
        device_id: "device_001",
        session_id: `session_${200 + i}`,
        threat_level: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
        action: "taking",
        description: `警报${i + 1}`,
        photo_path: `/photos/alert${i + 1}.jpg`,
        voice_warning_sent: i % 2 === 0,
        notified: true,
        created_at: new Date(
          now.getTime() - (1200 - i) * 60 * 60 * 1000,
        ).toISOString(),
        ts: now.getTime() - (1200 - i) * 60 * 60 * 1000, // 按时间递增
      }));

      await localStorageService.saveBatch("package_alerts", records);

      // 保留最新的1000条记录
      const deletedCount = await localStorageService.cleanupByCount(
        "package_alerts",
        1000,
      );

      // 验证删除了200条记录
      expect(deletedCount).toBe(200);

      // 验证剩余1000条记录
      const remaining = await localStorageService.getAll("package_alerts");
      expect(remaining).toHaveLength(1000);

      // 验证保留的是最新的1000条（id 201-1200）
      const remainingIds = remaining
        .map((r: any) => r.id)
        .sort((a, b) => a - b);
      expect(remainingIds[0]).toBeGreaterThanOrEqual(201);
      expect(remainingIds[remainingIds.length - 1]).toBe(1200);
    });

    it("应该在记录数少于1000时不删除任何记录", async () => {
      // 准备测试数据：500条记录
      const now = new Date();
      const records = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        device_id: "device_001",
        session_id: `session_${200 + i}`,
        threat_level: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
        action: "taking",
        description: `警报${i + 1}`,
        photo_path: `/photos/alert${i + 1}.jpg`,
        voice_warning_sent: i % 2 === 0,
        notified: true,
        created_at: new Date(
          now.getTime() - (500 - i) * 60 * 60 * 1000,
        ).toISOString(),
        ts: now.getTime() - (500 - i) * 60 * 60 * 1000,
      }));

      await localStorageService.saveBatch("package_alerts", records);

      // 保留最新的1000条记录（实际只有500条）
      const deletedCount = await localStorageService.cleanupByCount(
        "package_alerts",
        1000,
      );

      // 验证没有删除任何记录
      expect(deletedCount).toBe(0);

      // 验证所有记录仍然存在
      const remaining = await localStorageService.getAll("package_alerts");
      expect(remaining).toHaveLength(500);
    });
  });

  describe("cleanupExpiredData - v2.5自动清理", () => {
    it("应该清理访客意图和快递警报数据", async () => {
      const now = new Date();

      // 准备 visitor_intents 测试数据：1200条记录，部分超过30天
      const visitorIntents = Array.from({ length: 1200 }, (_, i) => ({
        id: i + 1,
        visit_id: 100 + i,
        session_id: `session_${100 + i}`,
        person_id: i + 1,
        person_name: `访客${i + 1}`,
        relation_type: "unknown",
        intent_type: "delivery",
        intent_summary: {
          intent_type: "delivery",
          summary: `访客${i + 1}的意图`,
          important_notes: [],
          ai_analysis: "AI分析",
        },
        dialogue_history: [],
        created_at: new Date(
          now.getTime() - (1200 - i) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        ts: now.getTime() - (1200 - i) * 24 * 60 * 60 * 1000, // 从1200天前到现在
      }));

      // 准备 package_alerts 测试数据：1200条记录
      const packageAlerts = Array.from({ length: 1200 }, (_, i) => ({
        id: i + 1,
        device_id: "device_001",
        session_id: `session_${200 + i}`,
        threat_level: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
        action: "taking",
        description: `警报${i + 1}`,
        photo_path: `/photos/alert${i + 1}.jpg`,
        voice_warning_sent: i % 2 === 0,
        notified: true,
        created_at: new Date(
          now.getTime() - (1200 - i) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        ts: now.getTime() - (1200 - i) * 24 * 60 * 60 * 1000,
      }));

      // 保存所有测试数据
      await localStorageService.saveBatch("visitor_intents", visitorIntents);
      await localStorageService.saveBatch("package_alerts", packageAlerts);

      // 执行自动清理
      await localStorageService.cleanupExpiredData();

      // 验证 visitor_intents：应保留最近30天或最多1000条
      const remainingIntents =
        await localStorageService.getAll("visitor_intents");
      expect(remainingIntents.length).toBeLessThanOrEqual(1000);
      // 所有剩余记录应在30天内
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      remainingIntents.forEach((intent: any) => {
        expect(intent.ts).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
      });

      // 验证 package_alerts：应保留最近30天或最多1000条
      const remainingAlerts =
        await localStorageService.getAll("package_alerts");
      expect(remainingAlerts.length).toBeLessThanOrEqual(1000);
      remainingAlerts.forEach((alert: any) => {
        expect(alert.ts).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
      });
    });

    it("应该在没有v2.5数据时正常执行", async () => {
      // 不添加任何v2.5数据，直接执行清理
      await expect(
        localStorageService.cleanupExpiredData(),
      ).resolves.toBeUndefined();

      // 验证没有错误
      const intents = await localStorageService.getAll("visitor_intents");
      const alerts = await localStorageService.getAll("package_alerts");
      expect(intents).toHaveLength(0);
      expect(alerts).toHaveLength(0);
    });
  });

  describe("清理准确性验证", () => {
    it("visitor_intents 应该遵循30天或1000条的规则", async () => {
      const now = new Date();

      // 创建1200条记录，跨越60天
      const records = Array.from({ length: 1200 }, (_, i) => ({
        id: i + 1,
        visit_id: 100 + i,
        session_id: `session_${100 + i}`,
        person_id: i + 1,
        person_name: `访客${i + 1}`,
        relation_type: "unknown",
        intent_type: "delivery",
        intent_summary: {
          intent_type: "delivery",
          summary: `访客${i + 1}的意图`,
          important_notes: [],
          ai_analysis: "AI分析",
        },
        dialogue_history: [],
        created_at: new Date(
          now.getTime() - (60 - i / 20) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        ts: now.getTime() - (60 - i / 20) * 24 * 60 * 60 * 1000,
      }));

      await localStorageService.saveBatch("visitor_intents", records);
      await localStorageService.cleanupExpiredData();

      const remaining = await localStorageService.getAll("visitor_intents");

      // 应该不超过1000条
      expect(remaining.length).toBeLessThanOrEqual(1000);

      // 所有记录应在30天内
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      remaining.forEach((intent: any) => {
        expect(intent.ts).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
      });
    });

    it("package_alerts 应该遵循30天或1000条的规则", async () => {
      const now = new Date();

      // 创建1200条记录，跨越60天
      const records = Array.from({ length: 1200 }, (_, i) => ({
        id: i + 1,
        device_id: "device_001",
        session_id: `session_${200 + i}`,
        threat_level: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
        action: "taking",
        description: `警报${i + 1}`,
        photo_path: `/photos/alert${i + 1}.jpg`,
        voice_warning_sent: i % 2 === 0,
        notified: true,
        created_at: new Date(
          now.getTime() - (60 - i / 20) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        ts: now.getTime() - (60 - i / 20) * 24 * 60 * 60 * 1000,
      }));

      await localStorageService.saveBatch("package_alerts", records);
      await localStorageService.cleanupExpiredData();

      const remaining = await localStorageService.getAll("package_alerts");

      // 应该不超过1000条
      expect(remaining.length).toBeLessThanOrEqual(1000);

      // 所有记录应在30天内
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      remaining.forEach((alert: any) => {
        expect(alert.ts).toBeGreaterThanOrEqual(thirtyDaysAgo.getTime());
      });
    });
  });
});
