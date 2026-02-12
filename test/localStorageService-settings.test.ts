/**
 * LocalStorageService 应用设置属性测试
 * 使用 fast-check 进行基于属性的测试
 * 验证任务 4.2 的实现
 *
 * Feature: local-storage-persistence
 * 需求: 10.5, 11.2, 11.3, 11.4
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { localStorageService } from "@/services/LocalStorageService";

// Tab 类型定义
type Tab = "home" | "monitor" | "settings";

/**
 * Tab 值生成器
 */
const tabArbitrary = fc.constantFrom<Tab>("home", "monitor", "settings");

/**
 * 设置键生成器（使用预定义的设置键）
 */
const settingKeyArbitrary = fc.constantFrom(
  "currentTab",
  "autoDownload",
  "volume",
  "notificationEnabled",
);

/**
 * 设置值生成器（根据键类型生成合适的值）
 */
const settingValueArbitrary = (key: string) => {
  switch (key) {
    case "currentTab":
      return tabArbitrary;
    case "autoDownload":
      return fc.boolean();
    case "volume":
      return fc.integer({ min: 0, max: 100 });
    case "notificationEnabled":
      return fc.boolean();
    default:
      return fc.anything();
  }
};

/**
 * 任意设置键值对生成器
 */
const settingPairArbitrary = fc
  .constantFrom("currentTab", "autoDownload", "volume", "notificationEnabled")
  .chain((key) => settingValueArbitrary(key).map((value) => ({ key, value })));

describe("LocalStorageService - 应用设置属性测试", () => {
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

  /**
   * Feature: local-storage-persistence, Property 7: 设置默认值处理
   *
   * 对于任意未设置的配置键，读取时应返回预定义的默认值，而不是 null 或 undefined。
   *
   * **Validates: Requirements 10.5, 11.4**
   */
  describe("属性 7: 设置默认值处理", () => {
    it("对于未设置的 currentTab，应返回默认值 'home'", async () => {
      const value = await localStorageService.getSetting("currentTab");
      expect(value).toBe("home");
    });

    it("对于未设置的 autoDownload，应返回默认值 false", async () => {
      const value = await localStorageService.getSetting("autoDownload");
      expect(value).toBe(false);
    });

    it("对于未设置的 volume，应返回默认值 80", async () => {
      const value = await localStorageService.getSetting("volume");
      expect(value).toBe(80);
    });

    it("对于未设置的 notificationEnabled，应返回默认值 true", async () => {
      const value = await localStorageService.getSetting("notificationEnabled");
      expect(value).toBe(true);
    });

    it("对于任意未设置的预定义键，应返回对应的默认值", async () => {
      await fc.assert(
        fc.asyncProperty(settingKeyArbitrary, async (key) => {
          // 确保设置不存在
          await localStorageService.clear("appSettings");

          // 获取设置
          const value = await localStorageService.getSetting(key);

          // 验证返回了默认值（不是 null 或 undefined）
          expect(value).not.toBeNull();
          expect(value).not.toBeUndefined();

          // 验证默认值符合预期类型
          switch (key) {
            case "currentTab":
              expect(["home", "monitor", "settings"]).toContain(value);
              break;
            case "autoDownload":
              expect(typeof value).toBe("boolean");
              break;
            case "volume":
              expect(typeof value).toBe("number");
              expect(value).toBeGreaterThanOrEqual(0);
              expect(value).toBeLessThanOrEqual(100);
              break;
            case "notificationEnabled":
              expect(typeof value).toBe("boolean");
              break;
          }
        }),
        { numRuns: 100 },
      );
    });

    it("对于未设置的键，使用自定义默认值时应返回自定义默认值", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.anything(),
          async (key, defaultValue) => {
            // 确保设置不存在
            await localStorageService.clear("appSettings");

            // 获取设置，提供自定义默认值
            const value = await localStorageService.getSetting(
              key,
              defaultValue,
            );

            // 验证返回了自定义默认值
            expect(value).toEqual(defaultValue);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("对于已设置的键，不应返回默认值而应返回实际值", async () => {
      await fc.assert(
        fc.asyncProperty(settingPairArbitrary, async ({ key, value }) => {
          // 保存设置
          await localStorageService.saveSetting(key, value);

          // 获取设置
          const retrieved = await localStorageService.getSetting(key);

          // 验证返回了实际值，而不是默认值
          expect(retrieved).toEqual(value);
        }),
        { numRuns: 100 },
      );
    });

    it("清空设置后再次获取应返回默认值", async () => {
      await fc.assert(
        fc.asyncProperty(settingPairArbitrary, async ({ key, value }) => {
          // 保存设置
          await localStorageService.saveSetting(key, value);

          // 验证设置已保存
          const saved = await localStorageService.getSetting(key);
          expect(saved).toEqual(value);

          // 清空设置
          await localStorageService.clear("appSettings");

          // 再次获取应返回默认值
          const afterClear = await localStorageService.getSetting(key);
          expect(afterClear).not.toBeNull();
          expect(afterClear).not.toBeUndefined();

          // 验证返回的是默认值（与之前保存的值不同，除非恰好相同）
          const defaultValue = (localStorageService as any).DEFAULT_SETTINGS[
            key
          ];
          expect(afterClear).toEqual(defaultValue);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: local-storage-persistence, Property 8: Tab 状态往返
   *
   * 对于任意有效的 Tab 值，保存 Tab 状态后重新初始化应用，应恢复到相同的 Tab。
   *
   * **Validates: Requirements 11.2, 11.3**
   */
  describe("属性 8: Tab 状态往返", () => {
    it("对于任意有效的 Tab 值，保存后读取应得到相同值", async () => {
      await fc.assert(
        fc.asyncProperty(tabArbitrary, async (tab) => {
          // 保存 Tab 状态
          await localStorageService.saveSetting("currentTab", tab);

          // 读取 Tab 状态
          const loaded = await localStorageService.getSetting("currentTab");

          // 验证等价性
          expect(loaded).toBe(tab);
        }),
        { numRuns: 100 },
      );
    });

    it("保存 Tab 状态后重新初始化数据库，应能恢复相同的 Tab", async () => {
      await fc.assert(
        fc.asyncProperty(tabArbitrary, async (tab) => {
          // 保存 Tab 状态
          await localStorageService.saveSetting("currentTab", tab);

          // 关闭数据库
          const db = localStorageService.getDb();
          if (db) {
            db.close();
          }

          // 重置单例状态
          (localStorageService as any).isInitialized = false;
          (localStorageService as any).db = null;

          // 重新初始化
          await localStorageService.init();

          // 读取 Tab 状态
          const loaded = await localStorageService.getSetting("currentTab");

          // 验证恢复了相同的 Tab
          expect(loaded).toBe(tab);
        }),
        { numRuns: 100 },
      );
    });

    it("多次切换 Tab 后，最后保存的 Tab 应该被正确恢复", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(tabArbitrary, { minLength: 2, maxLength: 10 }),
          async (tabs) => {
            // 依次保存多个 Tab 状态
            for (const tab of tabs) {
              await localStorageService.saveSetting("currentTab", tab);
            }

            // 读取 Tab 状态
            const loaded = await localStorageService.getSetting("currentTab");

            // 验证恢复了最后一个 Tab
            const lastTab = tabs[tabs.length - 1];
            expect(loaded).toBe(lastTab);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("首次启动时（无保存的 Tab），应返回默认 Tab 'home'", async () => {
      // 清空设置
      await localStorageService.clear("appSettings");

      // 读取 Tab 状态
      const loaded = await localStorageService.getSetting("currentTab");

      // 验证返回默认值
      expect(loaded).toBe("home");
    });

    it("保存无效的 Tab 值后，仍应能正常读取", async () => {
      // 保存一个无效的 Tab 值（不在预定义列表中）
      await localStorageService.saveSetting("currentTab", "invalid_tab");

      // 读取 Tab 状态
      const loaded = await localStorageService.getSetting("currentTab");

      // 验证能够读取（即使值无效）
      expect(loaded).toBe("invalid_tab");
    });

    it("Tab 状态应独立于其他设置项", async () => {
      await fc.assert(
        fc.asyncProperty(
          tabArbitrary,
          fc.boolean(),
          fc.integer({ min: 0, max: 100 }),
          async (tab, autoDownload, volume) => {
            // 保存多个设置
            await localStorageService.saveSetting("currentTab", tab);
            await localStorageService.saveSetting("autoDownload", autoDownload);
            await localStorageService.saveSetting("volume", volume);

            // 读取所有设置
            const loadedTab =
              await localStorageService.getSetting("currentTab");
            const loadedAutoDownload =
              await localStorageService.getSetting("autoDownload");
            const loadedVolume = await localStorageService.getSetting("volume");

            // 验证所有设置都正确保存
            expect(loadedTab).toBe(tab);
            expect(loadedAutoDownload).toBe(autoDownload);
            expect(loadedVolume).toBe(volume);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("getAllSettings 应包含 currentTab 设置", async () => {
      await fc.assert(
        fc.asyncProperty(tabArbitrary, async (tab) => {
          // 保存 Tab 状态
          await localStorageService.saveSetting("currentTab", tab);

          // 获取所有设置
          const allSettings = await localStorageService.getAllSettings();

          // 验证包含 currentTab
          expect(allSettings).toHaveProperty("currentTab");
          expect(allSettings.currentTab).toBe(tab);
        }),
        { numRuns: 100 },
      );
    });

    it("保存 Tab 状态应更新 updatedAt 时间戳", async () => {
      await fc.assert(
        fc.asyncProperty(tabArbitrary, async (tab) => {
          const beforeSave = Date.now();

          // 保存 Tab 状态
          await localStorageService.saveSetting("currentTab", tab);

          const afterSave = Date.now();

          // 直接从数据库读取设置对象
          const setting = await localStorageService.get<{
            key: string;
            value: any;
            updatedAt: number;
          }>("appSettings", "currentTab");

          // 验证 updatedAt 在合理范围内
          expect(setting).not.toBeNull();
          expect(setting!.updatedAt).toBeGreaterThanOrEqual(beforeSave);
          expect(setting!.updatedAt).toBeLessThanOrEqual(afterSave);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * 额外测试：saveSetting 和 getSetting 的综合测试
   */
  describe("saveSetting 和 getSetting 综合测试", () => {
    it("对于任意设置键值对，保存后应能正确读取", async () => {
      await fc.assert(
        fc.asyncProperty(settingPairArbitrary, async ({ key, value }) => {
          // 保存设置
          await localStorageService.saveSetting(key, value);

          // 读取设置
          const loaded = await localStorageService.getSetting(key);

          // 验证等价性
          expect(loaded).toEqual(value);
        }),
        { numRuns: 100 },
      );
    });

    it("多次保存同一个键应覆盖旧值", async () => {
      await fc.assert(
        fc.asyncProperty(
          settingKeyArbitrary,
          fc.array(fc.anything(), { minLength: 2, maxLength: 5 }),
          async (key, values) => {
            // 依次保存多个值
            for (const value of values) {
              await localStorageService.saveSetting(key, value);
            }

            // 读取设置
            const loaded = await localStorageService.getSetting(key);

            // 验证是最后一个值
            expect(loaded).toEqual(values[values.length - 1]);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("getAllSettings 应返回所有已保存的设置", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(settingPairArbitrary, { minLength: 1, maxLength: 4 }),
          async (settings) => {
            // 清空现有设置
            await localStorageService.clear("appSettings");

            // 保存所有设置
            for (const { key, value } of settings) {
              await localStorageService.saveSetting(key, value);
            }

            // 获取所有设置
            const allSettings = await localStorageService.getAllSettings();

            // 构建最终应该存在的设置（最后保存的值）
            const finalSettings = new Map<string, any>();
            for (const { key, value } of settings) {
              finalSettings.set(key, value);
            }

            // 验证所有最终设置都存在且值正确
            for (const [key, value] of finalSettings.entries()) {
              expect(allSettings).toHaveProperty(key);
              expect(allSettings[key]).toEqual(value);
            }

            // 验证设置数量正确（等于唯一键的数量）
            expect(Object.keys(allSettings).length).toBe(finalSettings.size);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("保存复杂对象作为设置值应能正确往返", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.record({
            nested: fc.record({
              value: fc.integer(),
              flag: fc.boolean(),
            }),
            array: fc.array(fc.string(), { maxLength: 5 }),
          }),
          async (key, complexValue) => {
            // 保存复杂对象
            await localStorageService.saveSetting(key, complexValue);

            // 读取设置
            const loaded = await localStorageService.getSetting(key);

            // 验证复杂对象完整性
            expect(loaded).toEqual(complexValue);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
