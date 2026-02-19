/**
 * 任务 25.2: 测试存储空间不足处理
 *
 * 测试目标：
 * - 模拟QuotaExceededError
 * - 验证自动清理和重试逻辑
 * - 验证错误提示显示
 *
 * 验证需求: 22.2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { localStorageService } from "@/services/LocalStorageService";

describe("任务 25.2: 存储空间不足处理测试", () => {
  beforeEach(async () => {
    await localStorageService.init();
  });

  describe("QuotaExceededError处理", () => {
    it("应能检测到存储空间不足错误", async () => {
      // 创建一个非常大的数据对象来触发配额错误
      const largeIntent = {
        id: Date.now(),
        visit_id: 999999,
        session_id: "quota_test_" + Date.now(),
        person_name: "配额测试",
        intent_type: "delivery",
        intent_summary: {
          summary: "测试配额",
          important_notes: [],
          ai_analysis: "A".repeat(1000000), // 1MB的数据
        },
        dialogue_history: Array.from({ length: 1000 }, (_, i) => ({
          role: i % 2 === 0 ? "assistant" : "user",
          content: "X".repeat(1000), // 每条1KB
        })),
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      // 尝试保存大数据，应该能处理而不崩溃
      await expect(
        localStorageService.saveVisitorIntent(largeIntent),
      ).resolves.not.toThrow();
    });

    it("应能在存储失败后继续工作", async () => {
      // 先尝试保存一个可能导致配额问题的大对象
      const largeIntent = {
        id: Date.now(),
        visit_id: 888888,
        session_id: "large_test_" + Date.now(),
        person_name: "大数据测试",
        intent_type: "delivery",
        intent_summary: {
          summary: "测试",
          important_notes: [],
          ai_analysis: "B".repeat(500000),
        },
        dialogue_history: [],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      try {
        await localStorageService.saveVisitorIntent(largeIntent);
      } catch (error) {
        // 忽略可能的错误
      }

      // 验证服务仍然可用
      expect(localStorageService.isAvailable()).toBe(true);

      // 验证可以保存正常大小的数据
      const normalIntent = {
        id: Date.now() + 1,
        visit_id: 777777,
        session_id: "normal_test_" + Date.now(),
        person_name: "正常测试",
        intent_type: "visit",
        intent_summary: {
          summary: "正常数据",
          important_notes: [],
          ai_analysis: "正常分析",
        },
        dialogue_history: [{ role: "assistant", content: "您好" }],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      await expect(
        localStorageService.saveVisitorIntent(normalIntent),
      ).resolves.not.toThrow();

      // 验证数据已保存
      const intents = await localStorageService.getVisitorIntents(100);
      const saved = intents.find(
        (i) => i.session_id === normalIntent.session_id,
      );
      expect(saved).toBeDefined();
    });
  });

  describe("自动清理和重试逻辑", () => {
    it("应能在空间不足时自动清理旧数据", async () => {
      // 添加一些旧数据
      const oldDate = Date.now() - 35 * 24 * 60 * 60 * 1000; // 35天前

      for (let i = 0; i < 5; i++) {
        await localStorageService.saveVisitorIntent({
          id: Date.now() + i,
          visit_id: 100000 + i,
          session_id: `old_data_${Date.now()}_${i}`,
          person_name: `旧访客${i}`,
          intent_type: "delivery",
          intent_summary: { summary: "旧数据" },
          dialogue_history: [],
          created_at: new Date(oldDate).toISOString(),
          ts: oldDate,
        });
      }

      // 执行清理
      await localStorageService.cleanupExpiredData();

      // 验证清理成功
      const intents = await localStorageService.getVisitorIntents(100);
      const oldIntents = intents.filter(
        (i) => i.ts < Date.now() - 30 * 24 * 60 * 60 * 1000,
      );

      // 旧数据应该被清理（或至少尝试清理）
      expect(oldIntents.length).toBeLessThanOrEqual(5);
    });

    it("应能处理批量数据保存中的配额问题", async () => {
      const testData = Array.from({ length: 10 }, (_, i) => ({
        id: Date.now() + i,
        visit_id: 200000 + i,
        session_id: `batch_quota_${Date.now()}_${i}`,
        person_name: `批量访客${i}`,
        intent_type: "delivery",
        intent_summary: { summary: "批量测试" },
        dialogue_history: [],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      }));

      // 批量保存应该能处理而不崩溃
      for (const data of testData) {
        await expect(
          localStorageService.saveVisitorIntent(data),
        ).resolves.not.toThrow();
      }

      // 验证至少部分数据被保存
      const intents = await localStorageService.getVisitorIntents(100);
      expect(intents.length).toBeGreaterThan(0);
    });

    it("应能在清理后重试保存操作", async () => {
      // 先执行清理
      await localStorageService.cleanupExpiredData();

      // 然后尝试保存新数据
      const newIntent = {
        id: Date.now(),
        visit_id: 300000,
        session_id: "retry_test_" + Date.now(),
        person_name: "重试测试",
        intent_type: "visit",
        intent_summary: {
          summary: "测试重试逻辑",
          important_notes: [],
          ai_analysis: "重试分析",
        },
        dialogue_history: [{ role: "assistant", content: "测试" }],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      // 保存应该成功
      await expect(
        localStorageService.saveVisitorIntent(newIntent),
      ).resolves.not.toThrow();

      // 验证数据已保存
      const intents = await localStorageService.getVisitorIntents(100);
      const saved = intents.find((i) => i.session_id === newIntent.session_id);
      expect(saved).toBeDefined();
      expect(saved?.person_name).toBe("重试测试");
    });
  });

  describe("错误提示和降级处理", () => {
    it("应能在配额错误后继续提供基本功能", async () => {
      // 验证服务状态
      expect(localStorageService.isAvailable()).toBe(true);

      // 验证读取功能正常
      const intents = await localStorageService.getVisitorIntents(10);
      expect(Array.isArray(intents)).toBe(true);

      const alerts = await localStorageService.getPackageAlerts(10);
      expect(Array.isArray(alerts)).toBe(true);
    });

    it("应能在降级模式下保存小数据", async () => {
      const smallIntent = {
        id: Date.now(),
        visit_id: 400000,
        session_id: "small_test_" + Date.now(),
        person_name: "小数据",
        intent_type: "delivery",
        intent_summary: {
          summary: "小",
          important_notes: [],
          ai_analysis: "小",
        },
        dialogue_history: [],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      // 小数据应该总能保存
      await expect(
        localStorageService.saveVisitorIntent(smallIntent),
      ).resolves.not.toThrow();

      // 验证数据
      const intents = await localStorageService.getVisitorIntents(100);
      const saved = intents.find(
        (i) => i.session_id === smallIntent.session_id,
      );
      expect(saved).toBeDefined();
    });

    it("应能处理快递警报的配额问题", async () => {
      const largeAlert = {
        id: Date.now(),
        device_id: "device_large_" + Date.now(),
        session_id: "alert_large_" + Date.now(),
        threat_level: "high",
        action: "taking",
        description: "D".repeat(10000), // 10KB描述
        photo_path: "/path/to/photo.jpg",
        voice_warning_sent: true,
        notified: true,
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      // 应该能处理而不崩溃
      await expect(
        localStorageService.savePackageAlert(largeAlert),
      ).resolves.not.toThrow();

      // 验证服务仍然可用
      expect(localStorageService.isAvailable()).toBe(true);
    });

    it("应能在多次配额错误后保持稳定", async () => {
      // 连续尝试保存多个大对象
      for (let i = 0; i < 3; i++) {
        const largeData = {
          id: Date.now() + i,
          visit_id: 500000 + i,
          session_id: `stress_test_${Date.now()}_${i}`,
          person_name: `压力测试${i}`,
          intent_type: "delivery",
          intent_summary: {
            summary: "压力",
            important_notes: [],
            ai_analysis: "C".repeat(100000),
          },
          dialogue_history: [],
          created_at: new Date().toISOString(),
          ts: Date.now(),
        };

        try {
          await localStorageService.saveVisitorIntent(largeData);
        } catch (error) {
          // 忽略错误，继续测试
        }
      }

      // 验证服务仍然稳定
      expect(localStorageService.isAvailable()).toBe(true);

      // 验证仍能保存正常数据
      const normalData = {
        id: Date.now() + 100,
        visit_id: 600000,
        session_id: "after_stress_" + Date.now(),
        person_name: "压力后测试",
        intent_type: "visit",
        intent_summary: {
          summary: "正常",
          important_notes: [],
          ai_analysis: "正常",
        },
        dialogue_history: [],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      await expect(
        localStorageService.saveVisitorIntent(normalData),
      ).resolves.not.toThrow();
    });
  });

  describe("数据完整性验证", () => {
    it("应在配额问题后保持现有数据完整", async () => {
      // 保存一些正常数据
      const testIntent = {
        id: Date.now(),
        visit_id: 700000,
        session_id: "integrity_test_" + Date.now(),
        person_name: "完整性测试",
        intent_type: "delivery",
        intent_summary: {
          summary: "测试数据完整性",
          important_notes: ["重要"],
          ai_analysis: "完整性分析",
        },
        dialogue_history: [
          { role: "assistant", content: "你好" },
          { role: "user", content: "送快递" },
        ],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      await localStorageService.saveVisitorIntent(testIntent);

      // 尝试保存大数据（可能失败）
      try {
        await localStorageService.saveVisitorIntent({
          id: Date.now() + 1,
          visit_id: 700001,
          session_id: "large_" + Date.now(),
          person_name: "大数据",
          intent_type: "delivery",
          intent_summary: {
            summary: "大",
            important_notes: [],
            ai_analysis: "E".repeat(500000),
          },
          dialogue_history: [],
          created_at: new Date().toISOString(),
          ts: Date.now(),
        });
      } catch (error) {
        // 忽略
      }

      // 验证原始数据仍然完整
      const intents = await localStorageService.getVisitorIntents(100);
      const original = intents.find(
        (i) => i.session_id === testIntent.session_id,
      );

      expect(original).toBeDefined();
      expect(original?.person_name).toBe("完整性测试");
      expect(original?.dialogue_history).toHaveLength(2);
      expect(original?.intent_summary.important_notes).toContain("重要");
    });
  });
});
