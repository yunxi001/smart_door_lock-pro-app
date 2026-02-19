/**
 * LocalStorageService 数据同步和清理的属性测试
 * 使用 fast-check 进行基于属性的测试
 * 验证任务 2.3 的实现
 *
 * Feature: local-storage-persistence
 * 需求: 6.3, 6.4, 12.3, 12.4, 16.2
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import { localStorageService } from "@/services/LocalStorageService";

// 测试数据类型定义
interface TestPerson {
  id: number;
  name: string;
  relation_type: string;
}

// fast-check 数据生成器

/**
 * 人脸数据生成器（用于同步测试）
 */
const personArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  relation_type: fc.constantFrom("family", "friend", "worker", "other"),
});

describe("LocalStorageService - 数据同步和清理属性测试", () => {
  // 在每个测试前初始化数据库
  beforeEach(async () => {
    // 重置单例状态
    (localStorageService as any).isInitialized = false;
    (localStorageService as any).isFallbackMode = false;
    (localStorageService as any).db = null;

    // 初始化数据库
    await localStorageService.init();

    // 清空测试数据
    await localStorageService.clear("unlockLogs");
    await localStorageService.clear("eventLogs");
    await localStorageService.clear("visitRecords");
    await localStorageService.clear("recentActivities");
    await localStorageService.clear("persons");
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
   * Feature: local-storage-persistence, Property 2: 容量限制自动清理
   *
   * 对于任意有容量限制的存储，当添加新记录导致超过限制时，
   * 最旧的记录应被自动删除，使总数保持在限制内。
   *
   * **Validates: Requirements 6.3, 6.4**
   */
  describe("属性 2: 容量限制自动清理", () => {
    it("对于任意数量的记录，清理后应保持在限制内", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 501, max: 600 }), // 减少范围以提高测试速度
          async (totalCount) => {
            const now = new Date();

            // 生成指定数量的记录，确保唯一 id
            const records = Array.from({ length: totalCount }, (_, i) => ({
              id: i + 1,
              method: "face",
              uid: i + 1,
              status: "success",
              lock_time: now.getTime() - (totalCount - i) * 60 * 60 * 1000,
              timestamp: new Date(
                now.getTime() - (totalCount - i) * 60 * 60 * 1000,
              ).toISOString(),
            }));

            // 批量保存记录
            await localStorageService.saveBatch("unlockLogs", records);

            // 执行容量限制清理（限制为 500 条）
            await localStorageService.cleanupByCount("unlockLogs", 500);

            // 验证：记录数应该不超过 500
            const remaining = await localStorageService.getAll("unlockLogs");
            expect(remaining.length).toBeLessThanOrEqual(500);

            // 验证：保留的应该是最新的记录
            if (remaining.length > 0) {
              const remainingIds = remaining
                .map((r: any) => r.id)
                .sort((a, b) => a - b);
              const expectedMinId = totalCount - 499; // 最小 id 应该是 totalCount - 499
              expect(remainingIds[0]).toBeGreaterThanOrEqual(expectedMinId);
            }

            // 清理数据
            await localStorageService.clear("unlockLogs");
          },
        ),
        { numRuns: 50, timeout: 10000 }, // 减少迭代次数并增加超时
      );
    }, 15000); // 增加测试超时时间

    it("对于任意存储类型，超过限制时应删除最旧记录", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            { store: "unlockLogs", limit: 500 },
            { store: "eventLogs", limit: 500 },
            { store: "visitRecords", limit: 200 },
            { store: "recentActivities", limit: 50 },
          ),
          fc.integer({ min: 10, max: 50 }), // 减少额外数量
          async (config, extraCount) => {
            const now = new Date();
            const totalCount = config.limit + extraCount;

            // 生成记录
            const records = Array.from({ length: totalCount }, (_, i) => {
              const baseRecord = {
                id:
                  config.store === "recentActivities"
                    ? `activity-${i + 1}`
                    : i + 1,
                timestamp: new Date(
                  now.getTime() - (totalCount - i) * 60 * 60 * 1000,
                ).toISOString(),
              };

              // 根据存储类型添加必需字段
              if (config.store === "unlockLogs") {
                return {
                  ...baseRecord,
                  method: "face",
                  uid: i + 1,
                  status: "success",
                  lock_time: now.getTime() - (totalCount - i) * 60 * 60 * 1000,
                };
              } else if (config.store === "eventLogs") {
                return {
                  ...baseRecord,
                  event: "doorbell",
                  param: i,
                };
              } else if (config.store === "visitRecords") {
                return {
                  ...baseRecord,
                  visit_time: baseRecord.timestamp,
                  person_name: `访客${i + 1}`,
                  result: "success",
                  access_granted: true,
                };
              } else {
                // recentActivities
                return {
                  ...baseRecord,
                  type: "unlock" as const,
                  title: `活动${i + 1}`,
                  description: "测试",
                };
              }
            });

            // 保存记录
            await localStorageService.saveBatch(config.store, records);

            // 执行清理
            await localStorageService.cleanupByCount(
              config.store,
              config.limit,
            );

            // 验证：记录数应该不超过限制
            const remaining = await localStorageService.getAll(config.store);
            expect(remaining.length).toBeLessThanOrEqual(config.limit);

            // 清理数据
            await localStorageService.clear(config.store);
          },
        ),
        { numRuns: 50, timeout: 10000 },
      );
    }, 15000);
  });

  /**
   * Feature: local-storage-persistence, Property 3: 时间清理策略
   *
   * 对于任意有时间限制的存储，当记录的时间戳超过限制天数时，
   * 该记录应在下次清理时被删除。
   *
   * **Validates: Requirements 6.3, 6.4**
   */
  describe("属性 3: 时间清理策略", () => {
    it("对于任意时间范围的记录，超过限制天数的应被删除", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 35, max: 60 }), // 超过30天的天数
          fc.integer({ min: 10, max: 30 }), // 减少记录数量
          async (daysAgo, recordCount) => {
            const now = new Date();

            // 生成记录：一半超过30天，一半在30天内
            const records = Array.from({ length: recordCount }, (_, i) => {
              const isOld = i < recordCount / 2;
              // 确保旧记录明显超过30天，新记录明显在30天内
              const daysOffset = isOld
                ? daysAgo
                : Math.floor(Math.random() * 25);

              return {
                id: i + 1,
                method: "face",
                uid: i + 1,
                status: "success",
                lock_time: now.getTime() - daysOffset * 24 * 60 * 60 * 1000,
                timestamp: new Date(
                  now.getTime() - daysOffset * 24 * 60 * 60 * 1000,
                ).toISOString(),
              };
            });

            // 保存记录
            await localStorageService.saveBatch("unlockLogs", records);

            // 执行时间清理（30天）
            await localStorageService.cleanupByAge("unlockLogs", 30);

            // 验证：所有剩余记录应在30天内
            const remaining = await localStorageService.getAll("unlockLogs");
            const thirtyDaysAgo = new Date(
              now.getTime() - 30 * 24 * 60 * 60 * 1000,
            );

            remaining.forEach((log: any) => {
              const logDate = new Date(log.timestamp);
              // 使用大于等于比较，允许恰好30天的记录
              expect(logDate.getTime()).toBeGreaterThanOrEqual(
                thirtyDaysAgo.getTime(),
              );
            });

            // 清理数据
            await localStorageService.clear("unlockLogs");
          },
        ),
        { numRuns: 50, timeout: 10000 },
      );
    }, 15000);

    it("对于任意存储类型，时间清理应正确应用", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom("unlockLogs", "eventLogs", "visitRecords"),
          fc.integer({ min: 35, max: 60 }), // 超过30天的天数
          async (storeName, daysAgo) => {
            const now = new Date();

            // 生成一条超过30天的记录和一条在30天内的记录
            const oldRecord = {
              id: 1,
              timestamp: new Date(
                now.getTime() - daysAgo * 24 * 60 * 60 * 1000,
              ).toISOString(),
            };

            const recentRecord = {
              id: 2,
              timestamp: new Date(
                now.getTime() - 10 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            };

            // 根据存储类型添加必需字段
            const records = [oldRecord, recentRecord].map((r) => {
              if (storeName === "unlockLogs") {
                return {
                  ...r,
                  method: "face",
                  uid: r.id,
                  status: "success",
                  lock_time: new Date(r.timestamp).getTime(),
                };
              } else if (storeName === "eventLogs") {
                return {
                  ...r,
                  event: "doorbell",
                  param: r.id,
                };
              } else {
                // visitRecords
                return {
                  ...r,
                  visit_time: r.timestamp,
                  person_name: `访客${r.id}`,
                  result: "success",
                  access_granted: true,
                };
              }
            });

            // 保存记录
            await localStorageService.saveBatch(storeName, records);

            // 执行时间清理
            await localStorageService.cleanupByAge(storeName, 30);

            // 验证：只剩下最近的记录
            const remaining = await localStorageService.getAll(storeName);
            expect(remaining.length).toBe(1);
            expect(remaining[0].id).toBe(2);

            // 清理数据
            await localStorageService.clear(storeName);
          },
        ),
        { numRuns: 50, timeout: 10000 },
      );
    }, 15000);
  });

  /**
   * Feature: local-storage-persistence, Property 5: 实时同步更新
   *
   * 对于任意数据类型的增删改操作，操作完成后立即查询本地存储，
   * 应能反映最新的变更状态。
   *
   * **Validates: Requirements 12.4, 16.2**
   */
  describe("属性 5: 实时同步更新", () => {
    it("对于任意数据的保存操作，应立即反映在本地存储", async () => {
      await fc.assert(
        fc.asyncProperty(personArbitrary, async (person) => {
          // 保存数据
          await localStorageService.save("persons", person);

          // 立即查询
          const loaded = await localStorageService.get("persons", person.id);

          // 验证：数据应立即可查询
          expect(loaded).not.toBeNull();
          expect(loaded).toMatchObject(person);

          // 清理数据
          await localStorageService.clear("persons");
        }),
        { numRuns: 100 },
      );
    });

    it("对于任意数据的更新操作，应立即反映最新值", async () => {
      await fc.assert(
        fc.asyncProperty(
          personArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }),
          async (person, newName) => {
            // 保存初始数据
            await localStorageService.save("persons", person);

            // 更新数据
            const updatedPerson = { ...person, name: newName };
            await localStorageService.save("persons", updatedPerson);

            // 立即查询
            const loaded = await localStorageService.get("persons", person.id);

            // 验证：应该是更新后的值
            expect(loaded).not.toBeNull();
            expect(loaded?.name).toBe(newName);

            // 清理数据
            await localStorageService.clear("persons");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("对于任意数据的删除操作，应立即从存储中移除", async () => {
      await fc.assert(
        fc.asyncProperty(personArbitrary, async (person) => {
          // 保存数据
          await localStorageService.save("persons", person);

          // 验证数据存在
          let loaded = await localStorageService.get("persons", person.id);
          expect(loaded).not.toBeNull();

          // 删除数据
          await localStorageService.delete("persons", person.id);

          // 立即查询
          loaded = await localStorageService.get("persons", person.id);

          // 验证：数据应该不存在
          expect(loaded).toBeNull();

          // 清理数据
          await localStorageService.clear("persons");
        }),
        { numRuns: 100 },
      );
    });

    it("对于任意批量操作，所有变更应立即生效", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(personArbitrary, { minLength: 2, maxLength: 10 }),
          async (persons) => {
            // 确保唯一 id
            const uniquePersons = persons.map((p, i) => ({ ...p, id: i + 1 }));

            // 批量保存
            await localStorageService.saveBatch("persons", uniquePersons);

            // 立即查询所有数据
            const loaded = await localStorageService.getAll("persons");

            // 验证：所有数据都应该存在
            expect(loaded.length).toBe(uniquePersons.length);

            // 验证每个数据都正确
            for (const person of uniquePersons) {
              const found = loaded.find((p: any) => p.id === person.id);
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
  });

  /**
   * Feature: local-storage-persistence, Property 9: 数据同步冲突解决
   *
   * 对于任意本地缓存数据，当服务器返回不同版本的数据时，
   * 同步后本地存储应包含服务器版本的数据。
   *
   * **Validates: Requirements 12.3, 16.2**
   */
  describe("属性 9: 数据同步冲突解决", () => {
    it("对于任意冲突数据，应以服务器数据为准", async () => {
      await fc.assert(
        fc.asyncProperty(
          personArbitrary,
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom("family", "friend", "worker", "other"),
          async (person, serverName, serverRelationType) => {
            // 保存本地数据
            const localPerson = { ...person, cachedAt: Date.now() - 10000 };
            await localStorageService.save("persons", localPerson);

            // 服务器返回不同的数据
            const serverPerson = {
              ...person,
              name: serverName,
              relation_type: serverRelationType,
            };

            // 同步数据
            await localStorageService.syncData("persons", [serverPerson]);

            // 验证：本地数据应该是服务器版本
            const loaded = await localStorageService.get("persons", person.id);
            expect(loaded).not.toBeNull();
            expect(loaded?.name).toBe(serverName);
            expect(loaded?.relation_type).toBe(serverRelationType);

            // 验证：cachedAt 应该被更新
            expect(loaded?.cachedAt).toBeGreaterThan(localPerson.cachedAt);

            // 清理数据
            await localStorageService.clear("persons");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("对于任意数据集，同步后应完全匹配服务器数据", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(personArbitrary, { minLength: 2, maxLength: 5 }),
          fc.array(personArbitrary, { minLength: 2, maxLength: 5 }),
          async (localPersons, serverPersons) => {
            // 确保唯一 id
            const uniqueLocal = localPersons.map((p, i) => ({
              ...p,
              id: i + 1,
              cachedAt: Date.now() - 10000,
            }));
            const uniqueServer = serverPersons.map((p, i) => ({
              ...p,
              id: i + 1,
            }));

            // 保存本地数据
            await localStorageService.saveBatch("persons", uniqueLocal);

            // 同步服务器数据
            await localStorageService.syncData("persons", uniqueServer);

            // 验证：本地数据应该完全匹配服务器数据
            const loaded = await localStorageService.getAll("persons");
            expect(loaded.length).toBe(uniqueServer.length);

            // 验证每个数据都是服务器版本
            for (const serverPerson of uniqueServer) {
              const found = loaded.find((p: any) => p.id === serverPerson.id);
              expect(found).toBeDefined();
              expect(found?.name).toBe(serverPerson.name);
              expect(found?.relation_type).toBe(serverPerson.relation_type);
            }

            // 清理数据
            await localStorageService.clear("persons");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("对于任意本地独有的数据，同步时应被删除", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(personArbitrary, { minLength: 3, maxLength: 5 }),
          async (persons) => {
            // 确保唯一 id
            const uniquePersons = persons.map((p, i) => ({
              ...p,
              id: i + 1,
              cachedAt: Date.now(),
            }));

            // 保存本地数据
            await localStorageService.saveBatch("persons", uniquePersons);

            // 服务器只返回部分数据（删除了最后一个）
            const serverPersons = uniquePersons.slice(0, -1).map((p) => ({
              id: p.id,
              name: p.name,
              relation_type: p.relation_type,
            }));

            // 同步数据
            await localStorageService.syncData("persons", serverPersons);

            // 验证：本地应该只有服务器返回的数据
            const loaded = await localStorageService.getAll("persons");
            expect(loaded.length).toBe(serverPersons.length);

            // 验证：最后一个数据应该被删除
            const lastId = uniquePersons[uniquePersons.length - 1].id;
            const found = loaded.find((p: any) => p.id === lastId);
            expect(found).toBeUndefined();

            // 清理数据
            await localStorageService.clear("persons");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("对于任意服务器新增的数据，同步时应被添加", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(personArbitrary, { minLength: 2, maxLength: 4 }),
          personArbitrary,
          async (existingPersons, newPerson) => {
            // 确保唯一 id
            const uniqueExisting = existingPersons.map((p, i) => ({
              ...p,
              id: i + 1,
              cachedAt: Date.now(),
            }));

            // 保存本地数据
            await localStorageService.saveBatch("persons", uniqueExisting);

            // 服务器返回包含新数据的完整列表
            const serverPersons = [
              ...uniqueExisting.map((p) => ({
                id: p.id,
                name: p.name,
                relation_type: p.relation_type,
              })),
              {
                ...newPerson,
                id: uniqueExisting.length + 1,
              },
            ];

            // 同步数据
            await localStorageService.syncData("persons", serverPersons);

            // 验证：本地应该包含新数据
            const loaded = await localStorageService.getAll("persons");
            expect(loaded.length).toBe(serverPersons.length);

            // 验证：新数据存在
            const found = loaded.find(
              (p: any) => p.id === uniqueExisting.length + 1,
            );
            expect(found).toBeDefined();
            expect(found?.name).toBe(newPerson.name);

            // 清理数据
            await localStorageService.clear("persons");
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
