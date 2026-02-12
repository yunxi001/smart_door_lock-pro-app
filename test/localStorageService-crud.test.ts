/**
 * LocalStorageService CRUD 操作测试
 * 验证任务 1.3 的实现
 * 需求: 1.1, 15.1, 15.3
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { localStorageService } from "@/services/LocalStorageService";

// 测试数据类型
interface TestPerson {
  id: number;
  name: string;
  relation_type: string;
}

interface TestUnlockLog {
  id: number;
  method: string;
  timestamp: string;
  status: string;
}

describe("LocalStorageService - CRUD 操作", () => {
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

  describe("save() - 保存单个数据", () => {
    it("应该成功保存数据对象", async () => {
      const person: TestPerson = {
        id: 1,
        name: "张三",
        relation_type: "family",
      };

      await localStorageService.save("persons", person);

      // 验证数据已保存
      const saved = await localStorageService.get<TestPerson>("persons", 1);
      expect(saved).not.toBeNull();
      expect(saved?.id).toBe(1);
      expect(saved?.name).toBe("张三");
      expect(saved?.relation_type).toBe("family");
    });

    it("应该更新已存在的数据", async () => {
      const person: TestPerson = {
        id: 1,
        name: "张三",
        relation_type: "family",
      };

      // 首次保存
      await localStorageService.save("persons", person);

      // 更新数据
      const updatedPerson: TestPerson = {
        id: 1,
        name: "张三（已更新）",
        relation_type: "friend",
      };
      await localStorageService.save("persons", updatedPerson);

      // 验证数据已更新
      const saved = await localStorageService.get<TestPerson>("persons", 1);
      expect(saved?.name).toBe("张三（已更新）");
      expect(saved?.relation_type).toBe("friend");
    });

    it("未初始化时应该抛出错误", async () => {
      // 重置初始化状态
      (localStorageService as any).isInitialized = false;

      const person: TestPerson = {
        id: 1,
        name: "张三",
        relation_type: "family",
      };

      await expect(localStorageService.save("persons", person)).rejects.toThrow(
        "LocalStorageService 未初始化",
      );
    });
  });

  describe("saveBatch() - 批量保存数据", () => {
    it("应该成功批量保存多个数据对象", async () => {
      const persons: TestPerson[] = [
        { id: 1, name: "张三", relation_type: "family" },
        { id: 2, name: "李四", relation_type: "friend" },
        { id: 3, name: "王五", relation_type: "worker" },
      ];

      await localStorageService.saveBatch("persons", persons);

      // 验证所有数据已保存
      const allPersons =
        await localStorageService.getAll<TestPerson>("persons");
      expect(allPersons.length).toBe(3);
      expect(allPersons.map((p) => p.name)).toContain("张三");
      expect(allPersons.map((p) => p.name)).toContain("李四");
      expect(allPersons.map((p) => p.name)).toContain("王五");
    });

    it("应该批量保存空数组", async () => {
      await localStorageService.saveBatch("persons", []);

      const allPersons =
        await localStorageService.getAll<TestPerson>("persons");
      expect(allPersons.length).toBe(0);
    });

    it("未初始化时应该抛出错误", async () => {
      (localStorageService as any).isInitialized = false;

      await expect(
        localStorageService.saveBatch("persons", []),
      ).rejects.toThrow("LocalStorageService 未初始化");
    });
  });

  describe("get() - 获取单个数据", () => {
    it("应该成功获取已保存的数据", async () => {
      const person: TestPerson = {
        id: 1,
        name: "张三",
        relation_type: "family",
      };

      await localStorageService.save("persons", person);

      const retrieved = await localStorageService.get<TestPerson>("persons", 1);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(1);
      expect(retrieved?.name).toBe("张三");
    });

    it("不存在的键应该返回 null", async () => {
      const retrieved = await localStorageService.get<TestPerson>(
        "persons",
        999,
      );
      expect(retrieved).toBeNull();
    });

    it("未初始化时应该抛出错误", async () => {
      (localStorageService as any).isInitialized = false;

      await expect(localStorageService.get("persons", 1)).rejects.toThrow(
        "LocalStorageService 未初始化",
      );
    });
  });

  describe("getAll() - 获取所有数据", () => {
    it("应该获取所有已保存的数据", async () => {
      const persons: TestPerson[] = [
        { id: 1, name: "张三", relation_type: "family" },
        { id: 2, name: "李四", relation_type: "friend" },
      ];

      await localStorageService.saveBatch("persons", persons);

      const allPersons =
        await localStorageService.getAll<TestPerson>("persons");
      expect(allPersons.length).toBe(2);
    });

    it("空存储应该返回空数组", async () => {
      const allPersons =
        await localStorageService.getAll<TestPerson>("persons");
      expect(allPersons).toEqual([]);
    });

    it("未初始化时应该抛出错误", async () => {
      (localStorageService as any).isInitialized = false;

      await expect(localStorageService.getAll("persons")).rejects.toThrow(
        "LocalStorageService 未初始化",
      );
    });
  });

  describe("query() - 查询数据（支持索引和分页）", () => {
    beforeEach(async () => {
      // 准备测试数据：10 条开锁记录
      const logs: TestUnlockLog[] = [];
      for (let i = 1; i <= 10; i++) {
        logs.push({
          id: i,
          method: "face",
          timestamp: new Date(Date.now() - i * 60000).toISOString(), // 每条记录间隔 1 分钟
          status: "success",
        });
      }
      await localStorageService.saveBatch("unlockLogs", logs);
    });

    it("应该使用索引查询所有数据", async () => {
      const logs = await localStorageService.query<TestUnlockLog>(
        "unlockLogs",
        "timestamp",
      );

      expect(logs.length).toBe(10);
      // 应该按时间倒序排列（最新的在前）
      expect(logs[0].id).toBe(1);
      expect(logs[9].id).toBe(10);
    });

    it("应该支持分页查询 - 第一页", async () => {
      const logs = await localStorageService.query<TestUnlockLog>(
        "unlockLogs",
        "timestamp",
        undefined,
        { offset: 0, limit: 5 },
      );

      expect(logs.length).toBe(5);
      expect(logs[0].id).toBe(1);
      expect(logs[4].id).toBe(5);
    });

    it("应该支持分页查询 - 第二页", async () => {
      const logs = await localStorageService.query<TestUnlockLog>(
        "unlockLogs",
        "timestamp",
        undefined,
        { offset: 5, limit: 5 },
      );

      expect(logs.length).toBe(5);
      expect(logs[0].id).toBe(6);
      expect(logs[4].id).toBe(10);
    });

    it("应该支持范围查询", async () => {
      // 查询最近 5 分钟的记录
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      const range = IDBKeyRange.lowerBound(fiveMinutesAgo);

      const logs = await localStorageService.query<TestUnlockLog>(
        "unlockLogs",
        "timestamp",
        range,
      );

      // 应该只返回最近 5 条记录
      expect(logs.length).toBeLessThanOrEqual(5);
    });

    it("未初始化时应该抛出错误", async () => {
      (localStorageService as any).isInitialized = false;

      await expect(
        localStorageService.query("unlockLogs", "timestamp"),
      ).rejects.toThrow("LocalStorageService 未初始化");
    });
  });

  describe("delete() - 删除数据", () => {
    it("应该成功删除数据", async () => {
      const person: TestPerson = {
        id: 1,
        name: "张三",
        relation_type: "family",
      };

      await localStorageService.save("persons", person);

      // 验证数据存在
      let retrieved = await localStorageService.get<TestPerson>("persons", 1);
      expect(retrieved).not.toBeNull();

      // 删除数据
      await localStorageService.delete("persons", 1);

      // 验证数据已删除
      retrieved = await localStorageService.get<TestPerson>("persons", 1);
      expect(retrieved).toBeNull();
    });

    it("删除不存在的键应该不报错", async () => {
      await expect(
        localStorageService.delete("persons", 999),
      ).resolves.not.toThrow();
    });

    it("未初始化时应该抛出错误", async () => {
      (localStorageService as any).isInitialized = false;

      await expect(localStorageService.delete("persons", 1)).rejects.toThrow(
        "LocalStorageService 未初始化",
      );
    });
  });

  describe("clear() - 清空存储", () => {
    it("应该清空对象存储中的所有数据", async () => {
      const persons: TestPerson[] = [
        { id: 1, name: "张三", relation_type: "family" },
        { id: 2, name: "李四", relation_type: "friend" },
        { id: 3, name: "王五", relation_type: "worker" },
      ];

      await localStorageService.saveBatch("persons", persons);

      // 验证数据存在
      let allPersons = await localStorageService.getAll<TestPerson>("persons");
      expect(allPersons.length).toBe(3);

      // 清空存储
      await localStorageService.clear("persons");

      // 验证数据已清空
      allPersons = await localStorageService.getAll<TestPerson>("persons");
      expect(allPersons.length).toBe(0);
    });

    it("清空空存储应该不报错", async () => {
      await expect(localStorageService.clear("persons")).resolves.not.toThrow();
    });

    it("未初始化时应该抛出错误", async () => {
      (localStorageService as any).isInitialized = false;

      await expect(localStorageService.clear("persons")).rejects.toThrow(
        "LocalStorageService 未初始化",
      );
    });
  });

  describe("降级模式下的 CRUD 操作", () => {
    beforeEach(() => {
      // 每个测试前清空降级存储
      const fallbackStorage = (localStorageService as any).fallbackStorage;
      (fallbackStorage as any).memoryStore = new Map();
    });

    it("降级模式下 save() 应该不抛出错误", async () => {
      // 直接设置降级模式，不需要重新初始化
      (localStorageService as any).isFallbackMode = true;

      const person: TestPerson = {
        id: 1,
        name: "张三",
        relation_type: "family",
      };

      await expect(
        localStorageService.save("persons", person),
      ).resolves.not.toThrow();

      // 验证数据确实保存了
      const retrieved = await localStorageService.get<TestPerson>("persons", 1);
      expect(retrieved).toEqual(person);
    });

    it("降级模式下 get() 在没有数据时应该返回 null", async () => {
      // 直接设置降级模式
      (localStorageService as any).isFallbackMode = true;

      const retrieved = await localStorageService.get<TestPerson>(
        "persons",
        999,
      );
      expect(retrieved).toBeNull();
    });

    it("降级模式下 getAll() 在没有数据时应该返回空数组", async () => {
      // 直接设置降级模式
      (localStorageService as any).isFallbackMode = true;

      const allPersons =
        await localStorageService.getAll<TestPerson>("persons");
      expect(allPersons).toEqual([]);
    });
  });
});
