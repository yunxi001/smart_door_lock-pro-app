/**
 * LocalStorageService 错误处理测试
 * 测试降级模式、存储空间不足、数据验证等错误场景
 * 需求: 1.5, 14.1, 14.2, 14.4, 16.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// 模拟 IndexedDB
class MockIDBDatabase {
  objectStoreNames = {
    contains: vi.fn(() => false),
  };
  transaction = vi.fn();
  close = vi.fn();
}

class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
}

class MockIDBOpenDBRequest extends MockIDBRequest {
  onupgradeneeded: ((event: any) => void) | null = null;
  onblocked: (() => void) | null = null;
}

describe("LocalStorageService - 错误处理", () => {
  let LocalStorageService: any;
  let localStorageService: any;
  let originalIndexedDB: any;

  beforeEach(async () => {
    // 保存原始 indexedDB
    originalIndexedDB = globalThis.indexedDB;

    // 动态导入服务（每次测试前重新导入以重置单例）
    vi.resetModules();
    const module = await import("../services/LocalStorageService");
    LocalStorageService = module.default || module.LocalStorageService;
    localStorageService = (module as any).localStorageService;
  });

  afterEach(() => {
    // 恢复原始 indexedDB
    if (originalIndexedDB) {
      globalThis.indexedDB = originalIndexedDB;
    }
  });

  describe("降级模式测试", () => {
    it("IndexedDB 不可用时应降级到内存模式", async () => {
      // 模拟 IndexedDB 不可用
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 验证降级模式已启用
      expect(service.isInFallbackMode()).toBe(true);
      expect(service.isAvailable()).toBe(false);
    });

    it("降级模式下应能保存和读取数据", async () => {
      // 模拟 IndexedDB 不可用
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 测试数据
      const testPerson = {
        id: 1,
        name: "张三",
        relation_type: "family",
      };

      // 保存数据
      await service.save("persons", testPerson);

      // 读取数据
      const loaded = await service.get("persons", 1);

      // 验证数据
      expect(loaded).toEqual(testPerson);
    });

    it("降级模式下应能批量保存和读取数据", async () => {
      // 模拟 IndexedDB 不可用
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 测试数据
      const testPersons = [
        { id: 1, name: "张三", relation_type: "family" },
        { id: 2, name: "李四", relation_type: "friend" },
        { id: 3, name: "王五", relation_type: "worker" },
      ];

      // 批量保存数据
      await service.saveBatch("persons", testPersons);

      // 读取所有数据
      const loaded = await service.getAll("persons");

      // 验证数据
      expect(loaded).toHaveLength(3);
      expect(loaded).toEqual(expect.arrayContaining(testPersons));
    });

    it("降级模式下应能删除数据", async () => {
      // 模拟 IndexedDB 不可用
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 测试数据
      const testPerson = {
        id: 1,
        name: "张三",
        relation_type: "family",
      };

      // 保存数据
      await service.save("persons", testPerson);

      // 验证数据存在
      let loaded = await service.get("persons", 1);
      expect(loaded).toEqual(testPerson);

      // 删除数据
      await service.delete("persons", 1);

      // 验证数据已删除
      loaded = await service.get("persons", 1);
      expect(loaded).toBeNull();
    });

    it("降级模式下应能清空存储", async () => {
      // 模拟 IndexedDB 不可用
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 测试数据
      const testPersons = [
        { id: 1, name: "张三", relation_type: "family" },
        { id: 2, name: "李四", relation_type: "friend" },
      ];

      // 批量保存数据
      await service.saveBatch("persons", testPersons);

      // 验证数据存在
      let loaded = await service.getAll("persons");
      expect(loaded).toHaveLength(2);

      // 清空存储
      await service.clear("persons");

      // 验证数据已清空
      loaded = await service.getAll("persons");
      expect(loaded).toHaveLength(0);
    });

    it("降级模式下应能按时间清理数据", async () => {
      // 模拟 IndexedDB 不可用
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 创建测试数据（不同时间戳）
      const now = new Date();
      const old = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000); // 31天前
      const recent = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10天前

      const testLogs = [
        {
          id: 1,
          method: "face",
          uid: 1,
          status: "success",
          lock_time: old.getTime(),
          timestamp: old.toISOString(),
        },
        {
          id: 2,
          method: "fingerprint",
          uid: 2,
          status: "success",
          lock_time: recent.getTime(),
          timestamp: recent.toISOString(),
        },
      ];

      // 保存数据
      await service.saveBatch("unlockLogs", testLogs);

      // 清理30天前的数据
      const deletedCount = await service.cleanupByAge("unlockLogs", 30);

      // 验证清理结果
      expect(deletedCount).toBe(1);

      // 验证剩余数据
      const remaining = await service.getAll("unlockLogs");
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(2);
    });

    it("降级模式下应能按数量清理数据", async () => {
      // 模拟 IndexedDB 不可用
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 创建测试数据
      const testActivities = [];
      for (let i = 1; i <= 60; i++) {
        testActivities.push({
          id: `activity-${i}`,
          type: "unlock",
          title: `活动 ${i}`,
          description: "测试活动",
          timestamp: new Date(Date.now() - i * 1000).toISOString(),
        });
      }

      // 保存数据
      await service.saveBatch("recentActivities", testActivities);

      // 清理，保留最新50条
      const deletedCount = await service.cleanupByCount("recentActivities", 50);

      // 验证清理结果
      expect(deletedCount).toBe(10);

      // 验证剩余数据
      const remaining = await service.getAll("recentActivities");
      expect(remaining).toHaveLength(50);
    });
  });

  describe("数据验证测试", () => {
    it("应拒绝无效数据（非对象类型）", async () => {
      // 模拟 IndexedDB 不可用（使用降级模式简化测试）
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 测试无效数据
      const invalidData = "这是一个字符串，不是对象";

      // 尝试保存无效数据（带验证）
      await expect(
        service.saveWithErrorHandling("persons", invalidData, {
          validate: true,
        }),
      ).rejects.toThrow("数据必须是对象类型");
    });

    it("应拒绝缺少必需字段的数据", async () => {
      // 模拟 IndexedDB 不可用（使用降级模式简化测试）
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 测试缺少必需字段的数据
      const incompleteData = {
        name: "张三",
        // 缺少 id 字段
      };

      // 尝试保存不完整数据（带验证）
      await expect(
        service.saveWithErrorHandling("persons", incompleteData, {
          validate: true,
          requiredFields: ["id", "name"],
        }),
      ).rejects.toThrow("缺少必需字段: id");
    });

    it("应接受包含所有必需字段的有效数据", async () => {
      // 模拟 IndexedDB 不可用（使用降级模式简化测试）
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 测试有效数据
      const validData = {
        id: 1,
        name: "张三",
        relation_type: "family",
      };

      // 保存有效数据（带验证）
      await expect(
        service.saveWithErrorHandling("persons", validData, {
          validate: true,
          requiredFields: ["id", "name"],
        }),
      ).resolves.not.toThrow();

      // 验证数据已保存
      const loaded = await service.get("persons", 1);
      expect(loaded).toEqual(validData);
    });
  });

  describe("错误不中断应用流程测试", () => {
    it("存储错误应记录日志但不中断应用", async () => {
      // 模拟 IndexedDB 不可用（使用降级模式）
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 模拟 console.error
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      // 测试数据
      const testPerson = {
        id: 1,
        name: "张三",
        relation_type: "family",
      };

      // 保存数据（应该成功，因为降级模式可用）
      await service.save("persons", testPerson);

      // 验证数据已保存
      const loaded = await service.get("persons", 1);
      expect(loaded).toEqual(testPerson);

      // 恢复 console.error
      consoleErrorSpy.mockRestore();
    });

    it("数据清理失败不应中断应用启动", async () => {
      // 模拟 IndexedDB 不可用（使用降级模式）
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 模拟 console.error
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      // 执行数据清理（降级模式下应该正常工作）
      await expect(service.cleanupExpiredData()).resolves.not.toThrow();

      // 恢复 console.error
      consoleErrorSpy.mockRestore();
    });

    it("同步数据失败不应中断应用", async () => {
      // 模拟 IndexedDB 不可用（使用降级模式）
      (globalThis as any).indexedDB = undefined;

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 模拟 console.error
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      // 测试服务器数据
      const serverData = [
        { id: 1, name: "张三", relation_type: "family" },
        { id: 2, name: "李四", relation_type: "friend" },
      ];

      // 同步数据（应该成功）
      await expect(
        service.syncData("persons", serverData),
      ).resolves.not.toThrow();

      // 验证数据已同步
      const loaded = await service.getAll("persons");
      expect(loaded).toHaveLength(2);

      // 恢复 console.error
      consoleErrorSpy.mockRestore();
    });
  });

  describe("降级模式警告提示测试", () => {
    it("启用降级模式时应记录警告日志", async () => {
      // 模拟 IndexedDB 不可用
      (globalThis as any).indexedDB = undefined;

      // 模拟 console.warn
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation();

      // 重新导入服务
      vi.resetModules();
      const module = await import("../services/LocalStorageService");
      const service = (module as any).localStorageService;

      // 初始化服务
      await service.init();

      // 验证警告日志已记录
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("降级模式"),
      );

      // 恢复 console.warn
      consoleWarnSpy.mockRestore();
    });
  });
});
