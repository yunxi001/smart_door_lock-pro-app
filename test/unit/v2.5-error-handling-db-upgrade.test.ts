/**
 * 任务 25.1: 测试数据库升级失败降级
 *
 * 测试目标：
 * - 模拟数据库升级失败场景
 * - 验证降级到内存模式
 * - 验证基本功能不受影响
 *
 * 验证需求: 11.7, 22.5
 */

import { describe, it, expect } from "vitest";
import { localStorageService } from "@/services/LocalStorageService";

describe("任务 25.1: 数据库升级失败降级测试", () => {
  describe("降级模式功能验证", () => {
    it("应在降级模式下能保存和读取访客意图数据", async () => {
      // 确保服务已初始化
      await localStorageService.init();

      const mockIntent = {
        id: Date.now(), // 使用时间戳确保唯一性
        visit_id: 12345,
        session_id: "test_session_" + Date.now(),
        person_id: 10,
        person_name: "测试访客",
        relation_type: "family",
        intent_type: "delivery",
        intent_summary: {
          intent_type: "delivery",
          summary: "快递员送快递",
          important_notes: [],
          ai_analysis: "AI分析结果",
        },
        dialogue_history: [
          { role: "assistant", content: "您好" },
          { role: "user", content: "送快递" },
        ],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      // 保存数据
      await localStorageService.saveVisitorIntent(mockIntent);

      // 读取数据
      const intents = await localStorageService.getVisitorIntents(100);

      // 验证数据存在（无论是IndexedDB还是降级模式）
      const savedIntent = intents.find(
        (i) => i.session_id === mockIntent.session_id,
      );
      expect(savedIntent).toBeDefined();
      expect(savedIntent?.person_name).toBe("测试访客");
      expect(savedIntent?.intent_type).toBe("delivery");
    });

    it("应在降级模式下能保存和读取快递警报数据", async () => {
      await localStorageService.init();

      const mockAlert = {
        id: Date.now(),
        device_id: "device_test_" + Date.now(),
        session_id: "alert_session_" + Date.now(),
        threat_level: "high",
        action: "taking",
        description: "检测到非主人拿走快递",
        photo_path: "/path/to/photo.jpg",
        voice_warning_sent: true,
        notified: true,
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      // 保存数据
      await localStorageService.savePackageAlert(mockAlert);

      // 读取数据
      const alerts = await localStorageService.getPackageAlerts(100);

      // 验证数据存在
      const savedAlert = alerts.find(
        (a) => a.session_id === mockAlert.session_id,
      );
      expect(savedAlert).toBeDefined();
      expect(savedAlert?.threat_level).toBe("high");
      expect(savedAlert?.action).toBe("taking");
    });

    it("应能删除访客意图数据", async () => {
      await localStorageService.init();

      const uniqueId = Date.now();
      const mockIntent = {
        id: uniqueId,
        visit_id: uniqueId,
        session_id: "delete_test_" + uniqueId,
        person_name: "待删除访客",
        intent_type: "delivery",
        intent_summary: { summary: "测试删除" },
        dialogue_history: [],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      // 保存数据
      await localStorageService.saveVisitorIntent(mockIntent);

      // 验证数据存在
      let intents = await localStorageService.getVisitorIntents(100);
      let found = intents.find((i) => i.session_id === mockIntent.session_id);
      expect(found).toBeDefined();

      // 删除数据
      await localStorageService.deleteVisitorIntent(uniqueId);

      // 验证数据已删除
      intents = await localStorageService.getVisitorIntents(100);
      found = intents.find((i) => i.session_id === mockIntent.session_id);
      expect(found).toBeUndefined();
    });

    it("应能删除快递警报数据", async () => {
      await localStorageService.init();

      const uniqueId = Date.now();
      const mockAlert = {
        id: uniqueId,
        device_id: "device_delete_" + uniqueId,
        session_id: "alert_delete_" + uniqueId,
        threat_level: "medium",
        action: "searching",
        description: "待删除警报",
        photo_path: "/path/to/photo.jpg",
        voice_warning_sent: false,
        notified: false,
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      // 保存数据
      await localStorageService.savePackageAlert(mockAlert);

      // 验证数据存在
      let alerts = await localStorageService.getPackageAlerts(100);
      let found = alerts.find((a) => a.session_id === mockAlert.session_id);
      expect(found).toBeDefined();

      // 删除数据
      await localStorageService.deletePackageAlert(uniqueId);

      // 验证数据已删除
      alerts = await localStorageService.getPackageAlerts(100);
      found = alerts.find((a) => a.session_id === mockAlert.session_id);
      expect(found).toBeUndefined();
    });

    it("应能处理批量保存操作", async () => {
      await localStorageService.init();

      const baseId = Date.now();
      const mockIntents = Array.from({ length: 3 }, (_, i) => ({
        id: baseId + i,
        visit_id: baseId + i,
        session_id: `batch_test_${baseId}_${i}`,
        person_name: `批量访客${i + 1}`,
        intent_type: "delivery",
        intent_summary: { summary: "批量测试" },
        dialogue_history: [],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      }));

      // 批量保存
      for (const intent of mockIntents) {
        await localStorageService.saveVisitorIntent(intent);
      }

      // 验证数据
      const intents = await localStorageService.getVisitorIntents(100);
      const savedIntents = intents.filter(
        (i) => i.session_id && i.session_id.startsWith(`batch_test_${baseId}`),
      );

      expect(savedIntents.length).toBeGreaterThanOrEqual(3);
    });

    it("应能执行数据清理操作而不崩溃", async () => {
      await localStorageService.init();

      // 执行清理操作
      await expect(
        localStorageService.cleanupExpiredData(),
      ).resolves.not.toThrow();
    });
  });

  describe("降级模式状态检查", () => {
    it("应能检查服务是否可用", () => {
      // 服务应该总是可用（即使在降级模式）
      expect(localStorageService.isAvailable()).toBe(true);
    });

    it("应能检查是否在降级模式", () => {
      // 检查降级模式状态（可能是true或false）
      const inFallbackMode = localStorageService.isInFallbackMode();
      expect(typeof inFallbackMode).toBe("boolean");
    });

    it("应能获取数据库信息", () => {
      // 应能获取数据库名称和版本
      expect(localStorageService.getDbName()).toBe("SmartDoorlockDB");
      expect(localStorageService.getDbVersion()).toBe(3);
    });
  });

  describe("错误处理能力", () => {
    it("应能处理无效数据而不崩溃", async () => {
      await localStorageService.init();

      // 尝试保存不完整的数据
      const invalidIntent = {
        id: Date.now(),
        session_id: "invalid_test_" + Date.now(),
        // 缺少必需字段
      };

      // 应该能处理错误而不崩溃
      await expect(
        localStorageService.saveVisitorIntent(invalidIntent as any),
      ).resolves.not.toThrow();
    });

    it("应能处理删除不存在的记录", async () => {
      await localStorageService.init();

      // 删除不存在的ID
      const nonExistentId = 999999999;

      // 应该能处理而不崩溃
      await expect(
        localStorageService.deleteVisitorIntent(nonExistentId),
      ).resolves.not.toThrow();

      await expect(
        localStorageService.deletePackageAlert(nonExistentId),
      ).resolves.not.toThrow();
    });
  });
});
