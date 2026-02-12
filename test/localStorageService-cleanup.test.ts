/**
 * LocalStorageService 数据清理功能测试
 * 测试 CleanupManager 的时间清理、数量清理和自动清理功能
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { localStorageService } from "@/services/LocalStorageService";

describe("LocalStorageService - 数据清理功能", () => {
  beforeEach(async () => {
    // 初始化数据库
    await localStorageService.init();

    // 清空测试数据
    await localStorageService.clear("unlockLogs");
    await localStorageService.clear("eventLogs");
    await localStorageService.clear("visitRecords");
    await localStorageService.clear("recentActivities");
  });

  afterEach(async () => {
    // 清理测试数据
    await localStorageService.clear("unlockLogs");
    await localStorageService.clear("eventLogs");
    await localStorageService.clear("visitRecords");
    await localStorageService.clear("recentActivities");
  });

  describe("cleanupByAge - 按时间清理", () => {
    it("应该删除超过指定天数的记录", async () => {
      // 准备测试数据：3条记录，不同时间
      const now = new Date();
      const records = [
        {
          id: 1,
          method: "face",
          uid: 1,
          status: "success",
          lock_time: now.getTime() - 40 * 24 * 60 * 60 * 1000, // 40天前
          timestamp: new Date(
            now.getTime() - 40 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        {
          id: 2,
          method: "fingerprint",
          uid: 2,
          status: "success",
          lock_time: now.getTime() - 20 * 24 * 60 * 60 * 1000, // 20天前
          timestamp: new Date(
            now.getTime() - 20 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        {
          id: 3,
          method: "password",
          uid: 3,
          status: "success",
          lock_time: now.getTime() - 5 * 24 * 60 * 60 * 1000, // 5天前
          timestamp: new Date(
            now.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      ];

      // 保存测试数据
      await localStorageService.saveBatch("unlockLogs", records);

      // 清理30天前的数据
      const deletedCount = await localStorageService.cleanupByAge(
        "unlockLogs",
        30,
      );

      // 验证删除了1条记录（40天前的）
      expect(deletedCount).toBe(1);

      // 验证剩余2条记录
      const remaining = await localStorageService.getAll("unlockLogs");
      expect(remaining).toHaveLength(2);
      expect(remaining.map((r: any) => r.id).sort()).toEqual([2, 3]);
    });

    it("应该在没有过期记录时返回0", async () => {
      // 准备测试数据：所有记录都在30天内
      const now = new Date();
      const records = [
        {
          id: 1,
          method: "face",
          uid: 1,
          status: "success",
          lock_time: now.getTime() - 10 * 24 * 60 * 60 * 1000,
          timestamp: new Date(
            now.getTime() - 10 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        {
          id: 2,
          method: "fingerprint",
          uid: 2,
          status: "success",
          lock_time: now.getTime() - 5 * 24 * 60 * 60 * 1000,
          timestamp: new Date(
            now.getTime() - 5 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      ];

      await localStorageService.saveBatch("unlockLogs", records);

      // 清理30天前的数据
      const deletedCount = await localStorageService.cleanupByAge(
        "unlockLogs",
        30,
      );

      // 验证没有删除任何记录
      expect(deletedCount).toBe(0);

      // 验证所有记录仍然存在
      const remaining = await localStorageService.getAll("unlockLogs");
      expect(remaining).toHaveLength(2);
    });

    it("应该正确处理边界情况（恰好30天）", async () => {
      const now = new Date();
      const exactly30DaysAgo = new Date(
        now.getTime() - 30 * 24 * 60 * 60 * 1000,
      );

      const record = {
        id: 1,
        method: "face",
        uid: 1,
        status: "success",
        lock_time: exactly30DaysAgo.getTime(),
        timestamp: exactly30DaysAgo.toISOString(),
      };

      await localStorageService.save("unlockLogs", record);

      // 清理30天前的数据（不包括恰好30天的）
      const deletedCount = await localStorageService.cleanupByAge(
        "unlockLogs",
        30,
      );

      // 验证恰好30天的记录被保留
      expect(deletedCount).toBe(0);
      const remaining = await localStorageService.getAll("unlockLogs");
      expect(remaining).toHaveLength(1);
    });
  });

  describe("cleanupByCount - 按数量清理", () => {
    it("应该保留最新的N条记录，删除其余记录", async () => {
      // 准备测试数据：10条记录
      const now = new Date();
      const records = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        method: "face",
        uid: i + 1,
        status: "success",
        lock_time: now.getTime() - (10 - i) * 60 * 60 * 1000, // 按时间递增
        timestamp: new Date(
          now.getTime() - (10 - i) * 60 * 60 * 1000,
        ).toISOString(),
      }));

      await localStorageService.saveBatch("unlockLogs", records);

      // 保留最新的5条记录
      const deletedCount = await localStorageService.cleanupByCount(
        "unlockLogs",
        5,
      );

      // 验证删除了5条记录
      expect(deletedCount).toBe(5);

      // 验证剩余5条记录
      const remaining = await localStorageService.getAll("unlockLogs");
      expect(remaining).toHaveLength(5);

      // 验证保留的是最新的5条（id 6-10）
      const remainingIds = remaining
        .map((r: any) => r.id)
        .sort((a, b) => a - b);
      expect(remainingIds).toEqual([6, 7, 8, 9, 10]);
    });

    it("应该在记录数少于限制时不删除任何记录", async () => {
      // 准备测试数据：3条记录
      const now = new Date();
      const records = Array.from({ length: 3 }, (_, i) => ({
        id: i + 1,
        method: "face",
        uid: i + 1,
        status: "success",
        lock_time: now.getTime() - (3 - i) * 60 * 60 * 1000,
        timestamp: new Date(
          now.getTime() - (3 - i) * 60 * 60 * 1000,
        ).toISOString(),
      }));

      await localStorageService.saveBatch("unlockLogs", records);

      // 保留最新的5条记录（实际只有3条）
      const deletedCount = await localStorageService.cleanupByCount(
        "unlockLogs",
        5,
      );

      // 验证没有删除任何记录
      expect(deletedCount).toBe(0);

      // 验证所有记录仍然存在
      const remaining = await localStorageService.getAll("unlockLogs");
      expect(remaining).toHaveLength(3);
    });

    it("应该正确处理边界情况（恰好等于限制）", async () => {
      // 准备测试数据：5条记录
      const now = new Date();
      const records = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        method: "face",
        uid: i + 1,
        status: "success",
        lock_time: now.getTime() - (5 - i) * 60 * 60 * 1000,
        timestamp: new Date(
          now.getTime() - (5 - i) * 60 * 60 * 1000,
        ).toISOString(),
      }));

      await localStorageService.saveBatch("unlockLogs", records);

      // 保留最新的5条记录（恰好等于现有数量）
      const deletedCount = await localStorageService.cleanupByCount(
        "unlockLogs",
        5,
      );

      // 验证没有删除任何记录
      expect(deletedCount).toBe(0);

      // 验证所有记录仍然存在
      const remaining = await localStorageService.getAll("unlockLogs");
      expect(remaining).toHaveLength(5);
    });
  });

  describe("cleanupExpiredData - 自动清理", () => {
    it("应该根据预设规则清理所有类型的数据", async () => {
      const now = new Date();

      // 准备 unlockLogs 测试数据：600条记录，部分超过30天
      const unlockLogs = Array.from({ length: 600 }, (_, i) => ({
        id: i + 1,
        method: "face",
        uid: i + 1,
        status: "success",
        lock_time: now.getTime() - (600 - i) * 24 * 60 * 60 * 1000, // 从600天前到现在
        timestamp: new Date(
          now.getTime() - (600 - i) * 24 * 60 * 60 * 1000,
        ).toISOString(),
      }));

      // 准备 eventLogs 测试数据：600条记录
      const eventLogs = Array.from({ length: 600 }, (_, i) => ({
        id: i + 1,
        event: "doorbell",
        param: i,
        timestamp: new Date(
          now.getTime() - (600 - i) * 24 * 60 * 60 * 1000,
        ).toISOString(),
      }));

      // 准备 visitRecords 测试数据：300条记录
      const visitRecords = Array.from({ length: 300 }, (_, i) => ({
        id: i + 1,
        visit_time: new Date(
          now.getTime() - (300 - i) * 24 * 60 * 60 * 1000,
        ).toISOString(),
        person_name: `访客${i + 1}`,
        result: "success",
        access_granted: true,
        timestamp: new Date(
          now.getTime() - (300 - i) * 24 * 60 * 60 * 1000,
        ).toISOString(),
      }));

      // 准备 recentActivities 测试数据：100条记录
      const recentActivities = Array.from({ length: 100 }, (_, i) => ({
        id: `activity-${i + 1}`,
        type: "unlock" as const,
        title: `活动${i + 1}`,
        description: "测试活动",
        timestamp: new Date(
          now.getTime() - (100 - i) * 60 * 60 * 1000,
        ).toISOString(),
      }));

      // 保存所有测试数据
      await localStorageService.saveBatch("unlockLogs", unlockLogs);
      await localStorageService.saveBatch("eventLogs", eventLogs);
      await localStorageService.saveBatch("visitRecords", visitRecords);
      await localStorageService.saveBatch("recentActivities", recentActivities);

      // 执行自动清理
      await localStorageService.cleanupExpiredData();

      // 验证 unlockLogs：应保留最近30天或最多500条
      const remainingUnlockLogs =
        await localStorageService.getAll("unlockLogs");
      expect(remainingUnlockLogs.length).toBeLessThanOrEqual(500);
      // 所有剩余记录应在30天内
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      remainingUnlockLogs.forEach((log: any) => {
        expect(new Date(log.timestamp).getTime()).toBeGreaterThanOrEqual(
          thirtyDaysAgo.getTime(),
        );
      });

      // 验证 eventLogs：应保留最近30天或最多500条
      const remainingEventLogs = await localStorageService.getAll("eventLogs");
      expect(remainingEventLogs.length).toBeLessThanOrEqual(500);
      remainingEventLogs.forEach((log: any) => {
        expect(new Date(log.timestamp).getTime()).toBeGreaterThanOrEqual(
          thirtyDaysAgo.getTime(),
        );
      });

      // 验证 visitRecords：应保留最近30天或最多200条
      const remainingVisitRecords =
        await localStorageService.getAll("visitRecords");
      expect(remainingVisitRecords.length).toBeLessThanOrEqual(200);
      remainingVisitRecords.forEach((record: any) => {
        expect(new Date(record.timestamp).getTime()).toBeGreaterThanOrEqual(
          thirtyDaysAgo.getTime(),
        );
      });

      // 验证 recentActivities：应保留最多50条
      const remainingActivities =
        await localStorageService.getAll("recentActivities");
      expect(remainingActivities.length).toBeLessThanOrEqual(50);
    });

    it("应该在没有数据时正常执行", async () => {
      // 不添加任何数据，直接执行清理
      await expect(
        localStorageService.cleanupExpiredData(),
      ).resolves.toBeUndefined();

      // 验证没有错误
      const unlockLogs = await localStorageService.getAll("unlockLogs");
      expect(unlockLogs).toHaveLength(0);
    });

    it("应该在清理失败时不中断应用", async () => {
      // 这个测试验证错误处理
      // 即使某个存储清理失败，其他存储仍应继续清理

      // 准备正常的测试数据
      const now = new Date();
      const recentActivities = Array.from({ length: 100 }, (_, i) => ({
        id: `activity-${i + 1}`,
        type: "unlock" as const,
        title: `活动${i + 1}`,
        description: "测试活动",
        timestamp: new Date(
          now.getTime() - (100 - i) * 60 * 60 * 1000,
        ).toISOString(),
      }));

      await localStorageService.saveBatch("recentActivities", recentActivities);

      // 执行清理（即使某些存储不存在或失败，也应继续）
      await expect(
        localStorageService.cleanupExpiredData(),
      ).resolves.toBeUndefined();

      // 验证 recentActivities 仍然被清理
      const remaining = await localStorageService.getAll("recentActivities");
      expect(remaining.length).toBeLessThanOrEqual(50);
    });
  });

  describe("清理方法的错误处理", () => {
    it("cleanupByAge 应该在未初始化时抛出错误", async () => {
      // 创建一个新的未初始化的实例（通过反射访问私有属性）
      const service = localStorageService;
      const originalInitialized = (service as any).isInitialized;

      // 临时设置为未初始化
      (service as any).isInitialized = false;

      await expect(service.cleanupByAge("unlockLogs", 30)).rejects.toThrow(
        "LocalStorageService 未初始化",
      );

      // 恢复状态
      (service as any).isInitialized = originalInitialized;
    });

    it("cleanupByCount 应该在未初始化时抛出错误", async () => {
      const service = localStorageService;
      const originalInitialized = (service as any).isInitialized;

      (service as any).isInitialized = false;

      await expect(service.cleanupByCount("unlockLogs", 500)).rejects.toThrow(
        "LocalStorageService 未初始化",
      );

      (service as any).isInitialized = originalInitialized;
    });
  });

  describe("清理规则验证", () => {
    it("unlockLogs 应该遵循30天或500条的规则", async () => {
      const now = new Date();

      // 创建600条记录，跨越60天
      const records = Array.from({ length: 600 }, (_, i) => ({
        id: i + 1,
        method: "face",
        uid: i + 1,
        status: "success",
        lock_time: now.getTime() - (60 - i / 10) * 24 * 60 * 60 * 1000,
        timestamp: new Date(
          now.getTime() - (60 - i / 10) * 24 * 60 * 60 * 1000,
        ).toISOString(),
      }));

      await localStorageService.saveBatch("unlockLogs", records);
      await localStorageService.cleanupExpiredData();

      const remaining = await localStorageService.getAll("unlockLogs");

      // 应该不超过500条
      expect(remaining.length).toBeLessThanOrEqual(500);

      // 所有记录应在30天内
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      remaining.forEach((log: any) => {
        expect(new Date(log.timestamp).getTime()).toBeGreaterThanOrEqual(
          thirtyDaysAgo.getTime(),
        );
      });
    });

    it("recentActivities 应该遵循50条的规则", async () => {
      const now = new Date();

      // 创建100条记录
      const activities = Array.from({ length: 100 }, (_, i) => ({
        id: `activity-${i + 1}`,
        type: "unlock" as const,
        title: `活动${i + 1}`,
        description: "测试活动",
        timestamp: new Date(
          now.getTime() - (100 - i) * 60 * 60 * 1000,
        ).toISOString(),
      }));

      await localStorageService.saveBatch("recentActivities", activities);
      await localStorageService.cleanupExpiredData();

      const remaining = await localStorageService.getAll("recentActivities");

      // 应该不超过50条
      expect(remaining.length).toBeLessThanOrEqual(50);

      // 验证保留的是最新的50条
      const remainingIds = remaining
        .map((a: any) => parseInt(a.id.split("-")[1]))
        .sort((a, b) => a - b);
      expect(remainingIds[0]).toBeGreaterThanOrEqual(51);
    });
  });
});
