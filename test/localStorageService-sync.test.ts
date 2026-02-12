/**
 * LocalStorageService 数据同步功能测试
 * 测试 SyncManager 相关方法
 * 需求: 12.1, 12.3, 12.4, 12.5
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { localStorageService } from "@/services/LocalStorageService";

describe("LocalStorageService - 数据同步功能", () => {
  beforeEach(async () => {
    // 初始化数据库
    await localStorageService.init();

    // 清空所有测试相关的存储
    await localStorageService.clear("persons");
    await localStorageService.clear("fingerprints");
    await localStorageService.clear("unlockLogs");
  });

  afterEach(async () => {
    // 清理测试数据
    await localStorageService.clear("persons");
    await localStorageService.clear("fingerprints");
    await localStorageService.clear("unlockLogs");
  });

  describe("loadCachedData()", () => {
    it("应该加载所有缓存数据", async () => {
      // 准备测试数据
      const testPerson = {
        id: 1,
        name: "张三",
        relation_type: "family",
        cachedAt: Date.now(),
      };

      const testFingerprint = {
        id: 1,
        name: "指纹1",
        registeredAt: new Date().toISOString(),
        cachedAt: Date.now(),
      };

      // 保存测试数据
      await localStorageService.save("persons", testPerson);
      await localStorageService.save("fingerprints", testFingerprint);

      // 加载缓存数据
      const cached = await localStorageService.loadCachedData();

      // 验证
      expect(cached.persons).toHaveLength(1);
      expect(cached.persons[0]).toMatchObject({
        id: 1,
        name: "张三",
        relation_type: "family",
      });

      expect(cached.fingerprints).toHaveLength(1);
      expect(cached.fingerprints[0]).toMatchObject({
        id: 1,
        name: "指纹1",
      });

      // 其他数据应该为空数组
      expect(cached.nfcCards).toEqual([]);
      expect(cached.tempPasswords).toEqual([]);
      expect(cached.unlockLogs).toEqual([]);
      expect(cached.eventLogs).toEqual([]);
      expect(cached.visitRecords).toEqual([]);
      expect(cached.recentActivities).toEqual([]);
    });

    it("首次启动时应该返回空数据", async () => {
      // 加载缓存数据（没有任何数据）
      const cached = await localStorageService.loadCachedData();

      // 验证所有数据都是空数组
      expect(cached.persons).toEqual([]);
      expect(cached.fingerprints).toEqual([]);
      expect(cached.nfcCards).toEqual([]);
      expect(cached.tempPasswords).toEqual([]);
      expect(cached.unlockLogs).toEqual([]);
      expect(cached.eventLogs).toEqual([]);
      expect(cached.visitRecords).toEqual([]);
      expect(cached.recentActivities).toEqual([]);
    });
  });

  describe("syncData()", () => {
    it("应该添加新数据到本地存储", async () => {
      // 服务器数据（新数据）
      const serverData = [
        { id: 1, name: "张三", relation_type: "family" },
        { id: 2, name: "李四", relation_type: "friend" },
      ];

      // 同步数据
      await localStorageService.syncData("persons", serverData);

      // 验证数据已保存
      const persons = await localStorageService.getAll("persons");
      expect(persons).toHaveLength(2);

      // 验证数据内容
      expect(persons[0]).toMatchObject({
        id: 1,
        name: "张三",
        relation_type: "family",
      });
      expect(persons[1]).toMatchObject({
        id: 2,
        name: "李四",
        relation_type: "friend",
      });

      // 验证添加了 cachedAt 时间戳
      expect(persons[0].cachedAt).toBeDefined();
      expect(persons[1].cachedAt).toBeDefined();
      expect(typeof persons[0].cachedAt).toBe("number");
    });

    it("应该更新已存在的数据", async () => {
      // 先保存旧数据
      const oldData = [
        {
          id: 1,
          name: "张三",
          relation_type: "family",
          cachedAt: Date.now() - 10000,
        },
      ];
      await localStorageService.saveBatch("persons", oldData);

      // 服务器返回更新后的数据
      const serverData = [
        { id: 1, name: "张三（已更新）", relation_type: "family" },
      ];

      // 同步数据
      await localStorageService.syncData("persons", serverData);

      // 验证数据已更新
      const persons = await localStorageService.getAll("persons");
      expect(persons).toHaveLength(1);
      expect(persons[0].name).toBe("张三（已更新）");

      // 验证 cachedAt 时间戳已更新
      expect(persons[0].cachedAt).toBeGreaterThan(Date.now() - 1000);
    });

    it("应该删除本地存在但服务器不存在的数据", async () => {
      // 先保存本地数据
      const localData = [
        {
          id: 1,
          name: "张三",
          relation_type: "family",
          cachedAt: Date.now(),
        },
        {
          id: 2,
          name: "李四",
          relation_type: "friend",
          cachedAt: Date.now(),
        },
        {
          id: 3,
          name: "王五",
          relation_type: "worker",
          cachedAt: Date.now(),
        },
      ];
      await localStorageService.saveBatch("persons", localData);

      // 服务器只返回部分数据（删除了 id=2 的数据）
      const serverData = [
        { id: 1, name: "张三", relation_type: "family" },
        { id: 3, name: "王五", relation_type: "worker" },
      ];

      // 同步数据
      await localStorageService.syncData("persons", serverData);

      // 验证数据已删除
      const persons = await localStorageService.getAll("persons");
      expect(persons).toHaveLength(2);

      const ids = persons.map((p) => p.id);
      expect(ids).toContain(1);
      expect(ids).toContain(3);
      expect(ids).not.toContain(2);
    });

    it("应该同时处理添加、更新、删除操作", async () => {
      // 先保存本地数据
      const localData = [
        {
          id: 1,
          name: "张三",
          relation_type: "family",
          cachedAt: Date.now() - 10000,
        },
        {
          id: 2,
          name: "李四",
          relation_type: "friend",
          cachedAt: Date.now() - 10000,
        },
      ];
      await localStorageService.saveBatch("persons", localData);

      // 服务器数据：更新 id=1，删除 id=2，添加 id=3
      const serverData = [
        { id: 1, name: "张三（已更新）", relation_type: "family" },
        { id: 3, name: "王五", relation_type: "worker" },
      ];

      // 同步数据
      await localStorageService.syncData("persons", serverData);

      // 验证结果
      const persons = await localStorageService.getAll("persons");
      expect(persons).toHaveLength(2);

      // 验证更新
      const person1 = persons.find((p) => p.id === 1);
      expect(person1?.name).toBe("张三（已更新）");

      // 验证删除
      const person2 = persons.find((p) => p.id === 2);
      expect(person2).toBeUndefined();

      // 验证添加
      const person3 = persons.find((p) => p.id === 3);
      expect(person3).toBeDefined();
      expect(person3?.name).toBe("王五");
    });

    it("应该支持自定义主键字段", async () => {
      // 使用自定义主键的数据（例如开锁记录）
      const localData = [
        {
          id: 100,
          method: "face",
          uid: 1,
          status: "success",
          lock_time: Date.now() - 10000,
          timestamp: new Date().toISOString(),
          cachedAt: Date.now() - 10000,
        },
      ];
      await localStorageService.saveBatch("unlockLogs", localData);

      // 服务器数据
      const serverData = [
        {
          id: 100,
          method: "face",
          uid: 1,
          status: "success",
          lock_time: Date.now(),
          timestamp: new Date().toISOString(),
        },
        {
          id: 101,
          method: "fingerprint",
          uid: 2,
          status: "success",
          lock_time: Date.now(),
          timestamp: new Date().toISOString(),
        },
      ];

      // 同步数据（使用 'id' 作为主键）
      await localStorageService.syncData("unlockLogs", serverData, "id");

      // 验证结果
      const logs = await localStorageService.getAll("unlockLogs");
      expect(logs).toHaveLength(2);

      const ids = logs.map((log) => log.id);
      expect(ids).toContain(100);
      expect(ids).toContain(101);
    });

    it("服务器数据为空时应该清空本地数据", async () => {
      // 先保存本地数据
      const localData = [
        {
          id: 1,
          name: "张三",
          relation_type: "family",
          cachedAt: Date.now(),
        },
      ];
      await localStorageService.saveBatch("persons", localData);

      // 服务器返回空数组
      const serverData: any[] = [];

      // 同步数据
      await localStorageService.syncData("persons", serverData);

      // 验证本地数据已清空
      const persons = await localStorageService.getAll("persons");
      expect(persons).toHaveLength(0);
    });

    it("数据相同时不应该执行更新操作", async () => {
      // 保存本地数据
      const localData = [
        {
          id: 1,
          name: "张三",
          relation_type: "family",
          cachedAt: Date.now() - 10000,
        },
      ];
      await localStorageService.saveBatch("persons", localData);

      // 服务器返回相同的数据
      const serverData = [{ id: 1, name: "张三", relation_type: "family" }];

      // 同步数据
      await localStorageService.syncData("persons", serverData);

      // 验证数据仍然存在
      const persons = await localStorageService.getAll("persons");
      expect(persons).toHaveLength(1);
      expect(persons[0].name).toBe("张三");
    });
  });

  describe("数据完整性", () => {
    it("同步后的数据应该包含所有必需字段", async () => {
      // 服务器数据（包含嵌套对象）
      const serverData = [
        {
          id: 1,
          name: "张三",
          relation_type: "family",
          permission: {
            time_start: "08:00",
            time_end: "18:00",
            permission_type: "permanent",
          },
        },
      ];

      // 同步数据
      await localStorageService.syncData("persons", serverData);

      // 验证数据完整性
      const persons = await localStorageService.getAll("persons");
      expect(persons).toHaveLength(1);

      const person = persons[0];
      expect(person.id).toBe(1);
      expect(person.name).toBe("张三");
      expect(person.relation_type).toBe("family");
      expect(person.permission).toBeDefined();
      expect(person.permission.time_start).toBe("08:00");
      expect(person.permission.time_end).toBe("18:00");
      expect(person.permission.permission_type).toBe("permanent");
      expect(person.cachedAt).toBeDefined();
    });

    it("同步后的数据应该包含 cachedAt 时间戳", async () => {
      // 服务器数据
      const serverData = [
        { id: 1, name: "张三", relation_type: "family" },
        { id: 2, name: "李四", relation_type: "friend" },
      ];

      const beforeSync = Date.now();

      // 同步数据
      await localStorageService.syncData("persons", serverData);

      const afterSync = Date.now();

      // 验证 cachedAt 时间戳
      const persons = await localStorageService.getAll("persons");
      expect(persons).toHaveLength(2);

      for (const person of persons) {
        expect(person.cachedAt).toBeDefined();
        expect(person.cachedAt).toBeGreaterThanOrEqual(beforeSync);
        expect(person.cachedAt).toBeLessThanOrEqual(afterSync);
      }
    });
  });

  describe("错误处理", () => {
    it("同步失败时不应该中断应用", async () => {
      // 尝试同步到不存在的存储
      await expect(
        localStorageService.syncData("nonexistent", [{ id: 1 }]),
      ).resolves.not.toThrow();
    });
  });
});
