/**
 * VideoStorageService 兼容性测试
 * Feature: local-storage-persistence
 *
 * 验证 VideoStorageService 与 LocalStorageService 的兼容性
 * 确保 videos 对象存储在版本 2 中被正确保留
 * 需求: 1.2, 13.4
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { localStorageService } from "../services/LocalStorageService";

describe("VideoStorageService 兼容性验证", () => {
  beforeEach(async () => {
    // 初始化 LocalStorageService
    await localStorageService.init();
  });

  afterEach(async () => {
    // 清理测试数据
    if (localStorageService.isAvailable()) {
      const db = localStorageService.getDb();
      if (db && db.objectStoreNames.contains("videos")) {
        await localStorageService.clear("videos");
      }
    }
  });

  /**
   * 测试 1: 验证 videos 对象存储存在
   * 需求: 1.2
   */
  it("应在数据库版本 2 中包含 videos 对象存储", () => {
    // 跳过降级模式
    if (!localStorageService.isAvailable()) {
      console.log("跳过测试：IndexedDB 不可用");
      return;
    }

    const db = localStorageService.getDb();
    expect(db).not.toBeNull();

    if (db) {
      // 验证 videos 对象存储存在
      expect(db.objectStoreNames.contains("videos")).toBe(true);
      console.log("✓ videos 对象存储已保留");
    }
  });

  /**
   * 测试 2: 验证 videos 对象存储的索引
   * 需求: 1.2
   */
  it("videos 对象存储应包含正确的索引", async () => {
    // 跳过降级模式
    if (!localStorageService.isAvailable()) {
      console.log("跳过测试：IndexedDB 不可用");
      return;
    }

    const db = localStorageService.getDb();
    if (!db) {
      throw new Error("数据库未初始化");
    }

    // 创建事务以访问对象存储
    const transaction = db.transaction(["videos"], "readonly");
    const store = transaction.objectStore("videos");

    // 验证主键
    expect(store.keyPath).toBe("recordId");

    // 验证索引存在
    expect(store.indexNames.contains("mediaId")).toBe(true);
    expect(store.indexNames.contains("createdAt")).toBe(true);
    expect(store.indexNames.contains("recordType")).toBe(true);

    console.log("✓ videos 对象存储索引正确");
  });

  /**
   * 测试 3: 验证 VideoStorageService 可以使用 videos 存储
   * 需求: 13.4
   */
  it("VideoStorageService 应能正常使用 videos 对象存储", async () => {
    // 跳过降级模式
    if (!localStorageService.isAvailable()) {
      console.log("跳过测试：IndexedDB 不可用");
      return;
    }

    const db = localStorageService.getDb();
    if (!db) {
      throw new Error("数据库未初始化");
    }

    // 模拟 VideoStorageService 保存视频数据
    const testVideo = {
      recordId: 12345,
      recordType: "unlock_log" as const,
      mediaId: 67890,
      filePath: "/test/video.mp4",
      fileSize: 1024000,
      duration: 30,
      data: new ArrayBuffer(1024),
      createdAt: Date.now(),
    };

    // 使用事务保存数据
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(["videos"], "readwrite");
      const store = transaction.objectStore("videos");
      const request = store.put(testVideo);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // 验证数据已保存
    const savedVideo = await new Promise<any>((resolve, reject) => {
      const transaction = db.transaction(["videos"], "readonly");
      const store = transaction.objectStore("videos");
      const request = store.get(12345);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    expect(savedVideo).toBeDefined();
    expect(savedVideo.recordId).toBe(12345);
    expect(savedVideo.mediaId).toBe(67890);
    expect(savedVideo.recordType).toBe("unlock_log");

    console.log("✓ VideoStorageService 可以正常使用 videos 存储");
  });

  /**
   * 测试 4: 验证数据库版本号
   * 需求: 1.2
   */
  it("数据库版本应为 2", () => {
    expect(localStorageService.getDbVersion()).toBe(2);

    if (localStorageService.isAvailable()) {
      const db = localStorageService.getDb();
      if (db) {
        expect(db.version).toBe(2);
      }
    }

    console.log("✓ 数据库版本正确");
  });

  /**
   * 测试 5: 验证所有必需的对象存储都存在
   * 需求: 1.2
   */
  it("应包含所有必需的对象存储", () => {
    // 跳过降级模式
    if (!localStorageService.isAvailable()) {
      console.log("跳过测试：IndexedDB 不可用");
      return;
    }

    const db = localStorageService.getDb();
    if (!db) {
      throw new Error("数据库未初始化");
    }

    // 验证所有对象存储存在
    const requiredStores = [
      "deviceStatus", // 版本 1 的存储
      "videos", // 版本 1 的存储
      "persons", // 版本 2 的新存储
      "fingerprints",
      "nfcCards",
      "tempPasswords",
      "unlockLogs",
      "eventLogs",
      "visitRecords",
      "recentActivities",
      "appSettings",
    ];

    for (const storeName of requiredStores) {
      expect(db.objectStoreNames.contains(storeName)).toBe(true);
    }

    console.log("✓ 所有对象存储都存在");
  });
});
