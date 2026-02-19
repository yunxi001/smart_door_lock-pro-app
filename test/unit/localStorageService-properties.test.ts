/**
 * LocalStorageService 属性测试
 * 使用 fast-check 进行基于属性的测试
 * 验证任务 1.4 的实现
 *
 * Feature: local-storage-persistence
 * 需求: 2.2, 2.5, 16.1
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { localStorageService } from "@/services/LocalStorageService";

// 测试数据类型定义
interface TestPerson {
  id: number;
  name: string;
  relation_type: string;
  permission?: {
    time_start: string;
    time_end: string;
    permission_type?: string;
    valid_from?: string;
    valid_until?: string;
    remaining_count?: number;
  };
}

interface TestFingerprint {
  id: number;
  name: string;
  registeredAt: string;
}

interface TestNFCCard {
  id: number;
  name: string;
  cardId: string;
  maskedCardId: string;
  registeredAt: string;
}

interface TestTempPassword {
  id: number;
  name: string;
  password: string;
  type: "one_time" | "time_limited" | "count_limited";
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
  currentUses: number;
  createdAt: string;
  isExpired: boolean;
}

interface TestUnlockLog {
  id: number;
  method: string;
  uid: number;
  status: string;
  lock_time: number;
  timestamp: string;
  user_name?: string;
  hasVideo?: boolean;
  mediaId?: number;
}

interface TestSetting {
  key: string;
  value: any;
  updatedAt: number;
}

// fast-check 数据生成器
// 使用有效的日期范围避免 "Invalid time value" 错误

/**
 * 人脸数据生成器
 */
const personArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  relation_type: fc.constantFrom("family", "friend", "worker", "other"),
  permission: fc.option(
    fc.record({
      time_start: fc
        .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
        .map((d) => d.toISOString()),
      time_end: fc
        .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
        .map((d) => d.toISOString()),
      permission_type: fc.constantFrom(
        "permanent",
        "temporary",
        "count_limited",
      ),
      valid_from: fc.option(
        fc
          .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
          .map((d) => d.toISOString()),
      ),
      valid_until: fc.option(
        fc
          .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
          .map((d) => d.toISOString()),
      ),
      remaining_count: fc.option(fc.integer({ min: 0, max: 100 })),
    }),
  ),
});

/**
 * 指纹数据生成器
 */
const fingerprintArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  registeredAt: fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .map((d) => d.toISOString()),
});

/**
 * NFC 卡片数据生成器
 */
const nfcCardArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  cardId: fc.string({ minLength: 8, maxLength: 16 }),
  maskedCardId: fc.string({ minLength: 8, maxLength: 16 }),
  registeredAt: fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .map((d) => d.toISOString()),
});

/**
 * 临时密码数据生成器
 */
const tempPasswordArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  password: fc.string({ minLength: 4, maxLength: 8 }),
  type: fc.constantFrom("one_time", "time_limited", "count_limited"),
  validFrom: fc.option(
    fc
      .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
      .map((d) => d.toISOString()),
  ),
  validUntil: fc.option(
    fc
      .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
      .map((d) => d.toISOString()),
  ),
  maxUses: fc.option(fc.integer({ min: 1, max: 100 })),
  currentUses: fc.integer({ min: 0, max: 100 }),
  createdAt: fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .map((d) => d.toISOString()),
  isExpired: fc.boolean(),
});

/**
 * 开锁记录数据生成器
 */
const unlockLogArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  method: fc.constantFrom("face", "fingerprint", "password", "nfc", "remote"),
  uid: fc.integer({ min: 1, max: 10000 }),
  status: fc.constantFrom("success", "fail", "locked"),
  lock_time: fc.integer({
    min: Date.now() - 30 * 24 * 60 * 60 * 1000,
    max: Date.now(),
  }),
  timestamp: fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .map((d) => d.toISOString()),
  user_name: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  hasVideo: fc.option(fc.boolean()),
  mediaId: fc.option(fc.integer({ min: 1, max: 100000 })),
});

/**
 * 设置项数据生成器
 */
const settingArbitrary = fc.record({
  key: fc.constantFrom(
    "currentTab",
    "autoDownload",
    "volume",
    "notificationEnabled",
  ),
  value: fc.anything(),
  updatedAt: fc.integer({
    min: Date.now() - 365 * 24 * 60 * 60 * 1000,
    max: Date.now(),
  }),
});

describe("LocalStorageService - 属性测试", () => {
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
   * Feature: local-storage-persistence, Property 1: 数据往返一致性
   *
   * 对于任意支持的数据类型，保存数据后立即读取应得到等价的数据对象。
   *
   * **Validates: Requirements 2.2, 2.5**
   */
  describe("属性 1: 数据往返一致性", () => {
    it("对于任意人脸数据，保存后读取应得到相同数据", async () => {
      await fc.assert(
        fc.asyncProperty(personArbitrary, async (person) => {
          // 保存数据
          await localStorageService.save("persons", person);

          // 读取数据
          const loaded = await localStorageService.get<TestPerson>(
            "persons",
            person.id,
          );

          // 验证等价性
          expect(loaded).not.toBeNull();
          expect(loaded).toMatchObject(person);
        }),
        { numRuns: 100 },
      );
    });

    it("对于任意指纹数据，保存后读取应得到相同数据", async () => {
      await fc.assert(
        fc.asyncProperty(fingerprintArbitrary, async (fingerprint) => {
          // 保存数据
          await localStorageService.save("fingerprints", fingerprint);

          // 读取数据
          const loaded = await localStorageService.get<TestFingerprint>(
            "fingerprints",
            fingerprint.id,
          );

          // 验证等价性
          expect(loaded).not.toBeNull();
          expect(loaded).toMatchObject(fingerprint);
        }),
        { numRuns: 100 },
      );
    });

    it("对于任意 NFC 卡片数据，保存后读取应得到相同数据", async () => {
      await fc.assert(
        fc.asyncProperty(nfcCardArbitrary, async (nfcCard) => {
          // 保存数据
          await localStorageService.save("nfcCards", nfcCard);

          // 读取数据
          const loaded = await localStorageService.get<TestNFCCard>(
            "nfcCards",
            nfcCard.id,
          );

          // 验证等价性
          expect(loaded).not.toBeNull();
          expect(loaded).toMatchObject(nfcCard);
        }),
        { numRuns: 100 },
      );
    });

    it("对于任意临时密码数据，保存后读取应得到相同数据", async () => {
      await fc.assert(
        fc.asyncProperty(tempPasswordArbitrary, async (tempPassword) => {
          // 保存数据
          await localStorageService.save("tempPasswords", tempPassword);

          // 读取数据
          const loaded = await localStorageService.get<TestTempPassword>(
            "tempPasswords",
            tempPassword.id,
          );

          // 验证等价性
          expect(loaded).not.toBeNull();
          expect(loaded).toMatchObject(tempPassword);
        }),
        { numRuns: 100 },
      );
    });

    it("对于任意开锁记录数据，保存后读取应得到相同数据", async () => {
      await fc.assert(
        fc.asyncProperty(unlockLogArbitrary, async (unlockLog) => {
          // 保存数据
          await localStorageService.save("unlockLogs", unlockLog);

          // 读取数据
          const loaded = await localStorageService.get<TestUnlockLog>(
            "unlockLogs",
            unlockLog.id,
          );

          // 验证等价性
          expect(loaded).not.toBeNull();
          expect(loaded).toMatchObject(unlockLog);
        }),
        { numRuns: 100 },
      );
    });

    it("对于任意设置项数据，保存后读取应得到相同数据", async () => {
      await fc.assert(
        fc.asyncProperty(settingArbitrary, async (setting) => {
          // 保存数据
          await localStorageService.save("appSettings", setting);

          // 读取数据
          const loaded = await localStorageService.get<TestSetting>(
            "appSettings",
            setting.key,
          );

          // 验证等价性
          expect(loaded).not.toBeNull();
          expect(loaded).toMatchObject(setting);
        }),
        { numRuns: 100 },
      );
    });

    it("对于任意数据类型的数组，批量保存后读取应得到相同数据", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(personArbitrary, { minLength: 1, maxLength: 20 }),
          async (persons) => {
            // 确保每个 person 有唯一的 id（避免 id 冲突）
            const uniquePersons = persons.map((p, index) => ({
              ...p,
              id: index + 1,
            }));

            // 批量保存数据
            await localStorageService.saveBatch("persons", uniquePersons);

            // 逐个读取并验证
            for (const person of uniquePersons) {
              const loaded = await localStorageService.get<TestPerson>(
                "persons",
                person.id,
              );
              expect(loaded).not.toBeNull();
              expect(loaded).toMatchObject(person);
            }

            // 清理数据
            await localStorageService.clear("persons");
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: local-storage-persistence, Property 10: 批量操作原子性
   *
   * 对于任意批量写入操作，要么所有数据都成功保存，要么所有数据都不保存（事务回滚）。
   *
   * **Validates: Requirements 16.1**
   */
  describe("属性 10: 批量操作原子性", () => {
    it("批量保存成功时，所有数据都应该被保存", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(personArbitrary, { minLength: 2, maxLength: 10 }),
          async (persons) => {
            // 确保每个 person 有唯一的 id
            const uniquePersons = persons.map((p, index) => ({
              ...p,
              id: index + 1,
            }));

            // 批量保存
            await localStorageService.saveBatch("persons", uniquePersons);

            // 验证所有数据都已保存
            const allSaved =
              await localStorageService.getAll<TestPerson>("persons");
            expect(allSaved.length).toBe(uniquePersons.length);

            // 验证每个数据都存在
            for (const person of uniquePersons) {
              const found = allSaved.find((p) => p.id === person.id);
              expect(found).toBeDefined();
              expect(found).toMatchObject(person);
            }

            // 清理数据
            await localStorageService.clear("persons");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("批量保存多种数据类型时，每种类型的数据都应该完整保存", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(personArbitrary, { minLength: 1, maxLength: 5 }),
          fc.array(fingerprintArbitrary, { minLength: 1, maxLength: 5 }),
          async (persons, fingerprints) => {
            // 确保唯一 id
            const uniquePersons = persons.map((p, i) => ({ ...p, id: i + 1 }));
            const uniqueFingerprints = fingerprints.map((f, i) => ({
              ...f,
              id: i + 1,
            }));

            // 批量保存不同类型的数据
            await localStorageService.saveBatch("persons", uniquePersons);
            await localStorageService.saveBatch(
              "fingerprints",
              uniqueFingerprints,
            );

            // 验证所有人脸数据都已保存
            const savedPersons =
              await localStorageService.getAll<TestPerson>("persons");
            expect(savedPersons.length).toBe(uniquePersons.length);

            // 验证所有指纹数据都已保存
            const savedFingerprints =
              await localStorageService.getAll<TestFingerprint>("fingerprints");
            expect(savedFingerprints.length).toBe(uniqueFingerprints.length);

            // 清理数据
            await localStorageService.clear("persons");
            await localStorageService.clear("fingerprints");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("批量保存空数组应该成功且不影响现有数据", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(personArbitrary, { minLength: 1, maxLength: 5 }),
          async (persons) => {
            // 先保存一些数据
            const uniquePersons = persons.map((p, i) => ({ ...p, id: i + 1 }));
            await localStorageService.saveBatch("persons", uniquePersons);

            // 批量保存空数组
            await localStorageService.saveBatch("persons", []);

            // 验证原有数据仍然存在
            const savedPersons =
              await localStorageService.getAll<TestPerson>("persons");
            expect(savedPersons.length).toBe(uniquePersons.length);

            // 清理数据
            await localStorageService.clear("persons");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("批量更新已存在的数据时，所有更新都应该生效", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(personArbitrary, { minLength: 2, maxLength: 5 }),
          async (persons) => {
            // 确保唯一 id
            const uniquePersons = persons.map((p, i) => ({ ...p, id: i + 1 }));

            // 首次批量保存
            await localStorageService.saveBatch("persons", uniquePersons);

            // 修改所有数据
            const updatedPersons = uniquePersons.map((p) => ({
              ...p,
              name: p.name + " (已更新)",
              relation_type: "friend",
            }));

            // 批量更新
            await localStorageService.saveBatch("persons", updatedPersons);

            // 验证所有数据都已更新
            const savedPersons =
              await localStorageService.getAll<TestPerson>("persons");
            expect(savedPersons.length).toBe(updatedPersons.length);

            for (const updated of updatedPersons) {
              const found = savedPersons.find((p) => p.id === updated.id);
              expect(found).toBeDefined();
              expect(found?.name).toContain("(已更新)");
              expect(found?.relation_type).toBe("friend");
            }

            // 清理数据
            await localStorageService.clear("persons");
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
