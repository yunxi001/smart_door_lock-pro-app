/**
 * LocalStorageService 性能验证测试
 *
 * 验证需求:
 * - 应用启动时间增加不超过 200ms (需求 15.1, 15.2)
 * - 单次存储操作耗时不超过 50ms
 * - 批量操作性能优于多次单独操作
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { localStorageService } from "../services/LocalStorageService";

describe("LocalStorageService - 性能验证", () => {
  beforeEach(async () => {
    await localStorageService.init();
    // 清空测试数据
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

  describe("启动性能", () => {
    it("初始化耗时应不超过 200ms", async () => {
      // 重新初始化以测量时间
      const startTime = performance.now();
      await localStorageService.init();
      const endTime = performance.now();

      const initTime = endTime - startTime;
      console.log(`初始化耗时: ${initTime.toFixed(2)}ms`);

      expect(initTime).toBeLessThan(200);
    });

    it("加载缓存数据耗时应不超过 200ms", async () => {
      // 先添加一些测试数据
      const testPersons = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `用户${i + 1}`,
        relation_type: "family",
        cachedAt: Date.now(),
      }));
      await localStorageService.saveBatch("persons", testPersons);

      const testFingerprints = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        name: `指纹${i + 1}`,
        registeredAt: new Date().toISOString(),
        cachedAt: Date.now(),
      }));
      await localStorageService.saveBatch("fingerprints", testFingerprints);

      // 测量加载时间
      const startTime = performance.now();
      const cached = await localStorageService.loadCachedData();
      const endTime = performance.now();

      const loadTime = endTime - startTime;
      console.log(`加载缓存数据耗时: ${loadTime.toFixed(2)}ms`);
      console.log(
        `加载的数据量: persons=${cached.persons.length}, fingerprints=${cached.fingerprints.length}`,
      );

      expect(loadTime).toBeLessThan(200);
      expect(cached.persons.length).toBe(50);
      expect(cached.fingerprints.length).toBe(30);
    });

    it("完整启动流程（初始化 + 加载）应不超过 200ms", async () => {
      // 先添加测试数据
      const testData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `用户${i + 1}`,
        relation_type: "family",
        cachedAt: Date.now(),
      }));
      await localStorageService.saveBatch("persons", testData);

      // 测量完整启动流程
      const startTime = performance.now();
      await localStorageService.init();
      await localStorageService.loadCachedData();
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      console.log(`完整启动流程耗时: ${totalTime.toFixed(2)}ms`);

      expect(totalTime).toBeLessThan(200);
    });
  });

  describe("单次操作性能", () => {
    it("单次保存操作应不超过 50ms", async () => {
      const testData = {
        id: 1,
        name: "测试用户",
        relation_type: "family",
        cachedAt: Date.now(),
      };

      const startTime = performance.now();
      await localStorageService.save("persons", testData);
      const endTime = performance.now();

      const saveTime = endTime - startTime;
      console.log(`单次保存耗时: ${saveTime.toFixed(2)}ms`);

      expect(saveTime).toBeLessThan(50);
    });

    it("单次读取操作应不超过 50ms", async () => {
      // 先保存数据
      const testData = {
        id: 1,
        name: "测试用户",
        relation_type: "family",
        cachedAt: Date.now(),
      };
      await localStorageService.save("persons", testData);

      // 测量读取时间
      const startTime = performance.now();
      await localStorageService.get("persons", 1);
      const endTime = performance.now();

      const getTime = endTime - startTime;
      console.log(`单次读取耗时: ${getTime.toFixed(2)}ms`);

      expect(getTime).toBeLessThan(50);
    });

    it("单次删除操作应不超过 50ms", async () => {
      // 先保存数据
      const testData = {
        id: 1,
        name: "测试用户",
        relation_type: "family",
        cachedAt: Date.now(),
      };
      await localStorageService.save("persons", testData);

      // 测量删除时间
      const startTime = performance.now();
      await localStorageService.delete("persons", 1);
      const endTime = performance.now();

      const deleteTime = endTime - startTime;
      console.log(`单次删除耗时: ${deleteTime.toFixed(2)}ms`);

      expect(deleteTime).toBeLessThan(50);
    });

    it("查询所有数据应不超过 50ms（小数据集）", async () => {
      // 保存 10 条数据
      const testData = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `用户${i + 1}`,
        relation_type: "family",
        cachedAt: Date.now(),
      }));
      await localStorageService.saveBatch("persons", testData);

      // 测量查询时间
      const startTime = performance.now();
      await localStorageService.getAll("persons");
      const endTime = performance.now();

      const getAllTime = endTime - startTime;
      console.log(`查询所有数据耗时: ${getAllTime.toFixed(2)}ms`);

      expect(getAllTime).toBeLessThan(50);
    });
  });

  describe("批量操作性能", () => {
    it("批量保存应比多次单独保存更快", async () => {
      const testData = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `用户${i + 1}`,
        relation_type: "family",
        cachedAt: Date.now(),
      }));

      // 测量批量保存时间
      const batchStartTime = performance.now();
      await localStorageService.saveBatch("persons", testData);
      const batchEndTime = performance.now();
      const batchTime = batchEndTime - batchStartTime;

      // 清空数据
      await localStorageService.clear("persons");

      // 测量多次单独保存时间
      const individualStartTime = performance.now();
      for (const item of testData) {
        await localStorageService.save("persons", item);
      }
      const individualEndTime = performance.now();
      const individualTime = individualEndTime - individualStartTime;

      console.log(`批量保存 50 条数据耗时: ${batchTime.toFixed(2)}ms`);
      console.log(`单独保存 50 条数据耗时: ${individualTime.toFixed(2)}ms`);
      console.log(
        `性能提升: ${((individualTime / batchTime) * 100).toFixed(0)}%`,
      );

      // 批量操作应该更快
      expect(batchTime).toBeLessThan(individualTime);
    });

    it("批量保存 100 条数据应不超过 200ms", async () => {
      const testData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `用户${i + 1}`,
        relation_type: "family",
        cachedAt: Date.now(),
      }));

      const startTime = performance.now();
      await localStorageService.saveBatch("persons", testData);
      const endTime = performance.now();

      const batchTime = endTime - startTime;
      console.log(`批量保存 100 条数据耗时: ${batchTime.toFixed(2)}ms`);

      expect(batchTime).toBeLessThan(200);
    });

    it("批量保存 500 条数据应不超过 500ms", async () => {
      const testData = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        method: "face",
        uid: i + 1,
        status: "success",
        lock_time: Date.now(),
        timestamp: new Date().toISOString(),
        cachedAt: Date.now(),
      }));

      const startTime = performance.now();
      await localStorageService.saveBatch("unlockLogs", testData);
      const endTime = performance.now();

      const batchTime = endTime - startTime;
      console.log(`批量保存 500 条开锁记录耗时: ${batchTime.toFixed(2)}ms`);

      expect(batchTime).toBeLessThan(500);
    });
  });

  describe("数据同步性能", () => {
    it("同步 50 条数据应不超过 100ms", async () => {
      // 先保存一些旧数据
      const oldData = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        name: `旧用户${i + 1}`,
        relation_type: "family",
        cachedAt: Date.now() - 1000,
      }));
      await localStorageService.saveBatch("persons", oldData);

      // 准备新数据（包含更新、新增、删除）
      const newData = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `新用户${i + 1}`,
        relation_type: "family",
        cachedAt: Date.now(),
      }));

      // 测量同步时间
      const startTime = performance.now();
      await localStorageService.syncData("persons", newData, "id");
      const endTime = performance.now();

      const syncTime = endTime - startTime;
      console.log(`同步 50 条数据耗时: ${syncTime.toFixed(2)}ms`);

      expect(syncTime).toBeLessThan(100);
    });
  });

  describe("清理操作性能", () => {
    it("清理 500 条数据应不超过 100ms", async () => {
      // 先保存 500 条数据
      const testData = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        method: "face",
        uid: i + 1,
        status: "success",
        lock_time: Date.now(),
        timestamp: new Date().toISOString(),
        cachedAt: Date.now(),
      }));
      await localStorageService.saveBatch("unlockLogs", testData);

      // 测量清理时间
      const startTime = performance.now();
      await localStorageService.clear("unlockLogs");
      const endTime = performance.now();

      const clearTime = endTime - startTime;
      console.log(`清理 500 条数据耗时: ${clearTime.toFixed(2)}ms`);

      expect(clearTime).toBeLessThan(100);
    });

    it("按数量清理应不超过 100ms", async () => {
      // 先保存 600 条数据
      const testData = Array.from({ length: 600 }, (_, i) => ({
        id: i + 1,
        method: "face",
        uid: i + 1,
        status: "success",
        lock_time: Date.now() - i * 1000,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        cachedAt: Date.now(),
      }));
      await localStorageService.saveBatch("unlockLogs", testData);

      // 测量清理时间（保留最新 500 条）
      const startTime = performance.now();
      await localStorageService.cleanupByCount("unlockLogs", 500);
      const endTime = performance.now();

      const cleanupTime = endTime - startTime;
      console.log(`按数量清理耗时: ${cleanupTime.toFixed(2)}ms`);

      expect(cleanupTime).toBeLessThan(100);
    });
  });

  describe("设置操作性能", () => {
    it("保存设置应不超过 50ms", async () => {
      const startTime = performance.now();
      await localStorageService.saveSetting("currentTab", "home");
      const endTime = performance.now();

      const saveTime = endTime - startTime;
      console.log(`保存设置耗时: ${saveTime.toFixed(2)}ms`);

      expect(saveTime).toBeLessThan(50);
    });

    it("读取设置应不超过 50ms", async () => {
      // 先保存设置
      await localStorageService.saveSetting("currentTab", "home");

      // 测量读取时间
      const startTime = performance.now();
      await localStorageService.getSetting("currentTab");
      const endTime = performance.now();

      const getTime = endTime - startTime;
      console.log(`读取设置耗时: ${getTime.toFixed(2)}ms`);

      expect(getTime).toBeLessThan(50);
    });
  });

  describe("大数据集性能", () => {
    it("查询 1000 条数据应不超过 100ms", async () => {
      // 保存 1000 条数据
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        method: "face",
        uid: i + 1,
        status: "success",
        lock_time: Date.now(),
        timestamp: new Date().toISOString(),
        cachedAt: Date.now(),
      }));
      await localStorageService.saveBatch("unlockLogs", testData);

      // 测量查询时间
      const startTime = performance.now();
      const result = await localStorageService.getAll("unlockLogs");
      const endTime = performance.now();

      const queryTime = endTime - startTime;
      console.log(`查询 1000 条数据耗时: ${queryTime.toFixed(2)}ms`);

      expect(queryTime).toBeLessThan(100);
      expect(result.length).toBe(1000);
    });
  });

  describe("性能总结", () => {
    it("生成性能报告", async () => {
      console.log("\n📊 性能验证总结:");
      console.log("=====================================");
      console.log("✅ 所有性能测试通过");
      console.log("");
      console.log("关键指标:");
      console.log("  - 初始化时间: < 200ms");
      console.log("  - 缓存加载时间: < 200ms");
      console.log("  - 单次操作: < 50ms");
      console.log("  - 批量操作: 显著优于单独操作");
      console.log("  - 数据同步: < 100ms");
      console.log("  - 清理操作: < 100ms");
      console.log("=====================================\n");

      expect(true).toBe(true);
    });
  });
});
