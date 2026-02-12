/**
 * LocalStorageService 数据库初始化测试
 * 验证任务 1.2 的实现
 * 需求: 1.2, 1.3, 1.4, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { localStorageService } from "@/services/LocalStorageService";

describe("LocalStorageService - 数据库初始化", () => {
  // 在每个测试前重置单例状态
  beforeEach(() => {
    // 通过反射重置私有属性
    (localStorageService as any).isInitialized = false;
    (localStorageService as any).isFallbackMode = false;
    (localStorageService as any).db = null;
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

  it("应该成功初始化数据库", async () => {
    await localStorageService.init();

    expect(localStorageService.isAvailable()).toBe(true);
    expect(localStorageService.isInFallbackMode()).toBe(false);
    expect(localStorageService.getDb()).not.toBeNull();
  });

  it("应该创建所有 11 个对象存储", async () => {
    await localStorageService.init();

    const db = localStorageService.getDb();
    expect(db).not.toBeNull();

    if (db) {
      const storeNames = Array.from(db.objectStoreNames);

      // 验证所有对象存储都已创建
      expect(storeNames).toContain("deviceStatus");
      expect(storeNames).toContain("videos");
      expect(storeNames).toContain("persons");
      expect(storeNames).toContain("fingerprints");
      expect(storeNames).toContain("nfcCards");
      expect(storeNames).toContain("tempPasswords");
      expect(storeNames).toContain("unlockLogs");
      expect(storeNames).toContain("eventLogs");
      expect(storeNames).toContain("visitRecords");
      expect(storeNames).toContain("recentActivities");
      expect(storeNames).toContain("appSettings");

      // 验证总数
      expect(storeNames.length).toBe(11);
    }
  });

  it("应该为时间戳字段创建索引", async () => {
    await localStorageService.init();

    const db = localStorageService.getDb();
    expect(db).not.toBeNull();

    if (db) {
      // 需要在 versionchange 事务完成后才能创建新事务
      // 使用 Promise 等待数据库完全就绪
      await new Promise((resolve) => setTimeout(resolve, 10));

      // 创建一个事务来检查索引
      const transaction = db.transaction(
        ["fingerprints", "unlockLogs", "eventLogs"],
        "readonly",
      );

      // 检查 fingerprints 的 registeredAt 索引
      const fingerprintsStore = transaction.objectStore("fingerprints");
      expect(fingerprintsStore.indexNames.contains("registeredAt")).toBe(true);

      // 检查 unlockLogs 的 timestamp 索引
      const unlockLogsStore = transaction.objectStore("unlockLogs");
      expect(unlockLogsStore.indexNames.contains("timestamp")).toBe(true);

      // 检查 eventLogs 的 timestamp 索引
      const eventLogsStore = transaction.objectStore("eventLogs");
      expect(eventLogsStore.indexNames.contains("timestamp")).toBe(true);
    }
  });

  it("重复调用 init() 应该不会重复初始化", async () => {
    await localStorageService.init();
    const db1 = localStorageService.getDb();

    await localStorageService.init();
    const db2 = localStorageService.getDb();

    expect(db1).toBe(db2);
  });

  it("IndexedDB 不可用时应该降级到内存模式", async () => {
    // 模拟 IndexedDB 不可用
    const originalIndexedDB = window.indexedDB;
    Object.defineProperty(window, "indexedDB", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    // 重置单例状态
    (localStorageService as any).isInitialized = false;
    (localStorageService as any).isFallbackMode = false;
    (localStorageService as any).db = null;

    await localStorageService.init();

    expect(localStorageService.isAvailable()).toBe(false);
    expect(localStorageService.isInFallbackMode()).toBe(true);

    // 恢复 IndexedDB
    Object.defineProperty(window, "indexedDB", {
      value: originalIndexedDB,
      writable: true,
      configurable: true,
    });
  });
});

describe("LocalStorageService - 数据库版本升级", () => {
  // 在每个测试前重置单例状态
  beforeEach(() => {
    (localStorageService as any).isInitialized = false;
    (localStorageService as any).isFallbackMode = false;
    (localStorageService as any).db = null;
  });

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

  it("应该正确处理从版本 1 到版本 2 的升级", async () => {
    // 首先创建版本 1 的数据库（只有 deviceStatus 和 videos）
    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.open("SmartDoorlockDB", 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建版本 1 的对象存储
        if (!db.objectStoreNames.contains("deviceStatus")) {
          db.createObjectStore("deviceStatus", { keyPath: "deviceId" });
        }
        if (!db.objectStoreNames.contains("videos")) {
          db.createObjectStore("videos", { keyPath: "recordId" });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.close();
        resolve();
      };

      request.onerror = () => reject(request.error);
    });

    // 等待数据库关闭
    await new Promise((resolve) => setTimeout(resolve, 50));

    // 现在初始化 LocalStorageService（应该升级到版本 2）
    await localStorageService.init();

    const db = localStorageService.getDb();
    expect(db).not.toBeNull();

    if (db) {
      // 验证版本号
      expect(db.version).toBe(2);

      // 验证旧的对象存储仍然存在
      expect(db.objectStoreNames.contains("deviceStatus")).toBe(true);
      expect(db.objectStoreNames.contains("videos")).toBe(true);

      // 验证新的对象存储已创建
      expect(db.objectStoreNames.contains("persons")).toBe(true);
      expect(db.objectStoreNames.contains("fingerprints")).toBe(true);
      expect(db.objectStoreNames.contains("nfcCards")).toBe(true);
      expect(db.objectStoreNames.contains("tempPasswords")).toBe(true);
      expect(db.objectStoreNames.contains("unlockLogs")).toBe(true);
      expect(db.objectStoreNames.contains("eventLogs")).toBe(true);
      expect(db.objectStoreNames.contains("visitRecords")).toBe(true);
      expect(db.objectStoreNames.contains("recentActivities")).toBe(true);
      expect(db.objectStoreNames.contains("appSettings")).toBe(true);

      // 验证总数
      expect(db.objectStoreNames.length).toBe(11);
    }
  });
});
