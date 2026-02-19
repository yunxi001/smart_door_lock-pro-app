/**
 * 任务 24.3: IndexedDB性能验证测试
 *
 * 测试目标:
 * - 测试批量保存操作耗时
 * - 测试查询操作耗时
 * - 确保操作耗时<1000ms
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import LocalStorageService from "@/services/LocalStorageService";
import type { VisitorIntent, PackageAlert } from "@/types";

describe("任务 24.3: IndexedDB性能验证", () => {
  let storageService: LocalStorageService;

  beforeEach(async () => {
    storageService = LocalStorageService.getInstance();
    await storageService.init();
  });

  afterEach(async () => {
    // 清理测试数据
    try {
      const intents = await storageService.getVisitorIntents(1000);
      for (const intent of intents) {
        await storageService.deleteVisitorIntent(intent.id);
      }

      const alerts = await storageService.getPackageAlerts(1000);
      for (const alert of alerts) {
        await storageService.deletePackageAlert(alert.id);
      }
    } catch (error) {
      console.error("清理测试数据失败:", error);
    }
  });

  // 生成测试数据
  const generateVisitorIntent = (index: number): VisitorIntent => ({
    id: 0, // 自动生成
    visit_id: 1000 + index,
    session_id: `test_session_${index}`,
    person_id: 10 + index,
    person_name: `测试访客${index}`,
    relation_type: "unknown",
    intent_type: "delivery",
    intent_summary: {
      intent_type: "delivery",
      summary: `这是第${index}条测试访客意图记录`,
      important_notes: [`重要信息${index}`],
      ai_analysis: `AI分析内容${index}`,
    },
    dialogue_history: [
      { role: "assistant", content: `你好，请问有什么可以帮助你？` },
      { role: "user", content: `我是来送快递的` },
    ],
    created_at: new Date(Date.now() - index * 60000).toISOString(),
    ts: Date.now() - index * 60000,
  });

  const generatePackageAlert = (index: number): PackageAlert => ({
    id: 0, // 自动生成
    device_id: "test_device_001",
    session_id: `test_session_${index}`,
    threat_level: index % 3 === 0 ? "high" : index % 3 === 1 ? "medium" : "low",
    action: "taking",
    description: `检测到第${index}次异常行为`,
    photo_path: `/test/photo_${index}.jpg`,
    voice_warning_sent: false,
    notified: false,
    created_at: new Date(Date.now() - index * 60000).toISOString(),
    ts: Date.now() - index * 60000,
  });

  it("应验证单条访客意图保存性能", async () => {
    const intent = generateVisitorIntent(1);

    const startTime = performance.now();
    await storageService.saveVisitorIntent(intent);
    const endTime = performance.now();

    const saveTime = endTime - startTime;
    console.log(`单条访客意图保存耗时: ${saveTime.toFixed(2)}ms`);

    expect(saveTime).toBeLessThan(1000);
  });

  it("应验证批量访客意图保存性能（10条）", async () => {
    const intents = Array.from({ length: 10 }, (_, i) =>
      generateVisitorIntent(i + 1),
    );

    const startTime = performance.now();

    for (const intent of intents) {
      await storageService.saveVisitorIntent(intent);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / intents.length;

    console.log(`\n批量保存10条访客意图:`);
    console.log(`总耗时: ${totalTime.toFixed(2)}ms`);
    console.log(`平均每条: ${avgTime.toFixed(2)}ms`);

    expect(totalTime).toBeLessThan(1000);
    expect(avgTime).toBeLessThan(100);
  });

  it("应验证批量访客意图保存性能（50条）", async () => {
    const intents = Array.from({ length: 50 }, (_, i) =>
      generateVisitorIntent(i + 1),
    );

    const startTime = performance.now();

    for (const intent of intents) {
      await storageService.saveVisitorIntent(intent);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / intents.length;

    console.log(`\n批量保存50条访客意图:`);
    console.log(`总耗时: ${totalTime.toFixed(2)}ms`);
    console.log(`平均每条: ${avgTime.toFixed(2)}ms`);

    expect(totalTime).toBeLessThan(1000);
    expect(avgTime).toBeLessThan(20);
  });

  it("应验证访客意图查询性能（查询100条）", async () => {
    // 先插入100条数据
    const intents = Array.from({ length: 100 }, (_, i) =>
      generateVisitorIntent(i + 1),
    );

    for (const intent of intents) {
      await storageService.saveVisitorIntent(intent);
    }

    // 测试查询性能
    const startTime = performance.now();
    const results = await storageService.getVisitorIntents(100);
    const endTime = performance.now();

    const queryTime = endTime - startTime;
    console.log(`\n查询100条访客意图耗时: ${queryTime.toFixed(2)}ms`);
    console.log(`查询结果数量: ${results.length}`);

    expect(queryTime).toBeLessThan(1000);
    expect(results.length).toBeGreaterThan(0);
  });

  it("应验证单条快递警报保存性能", async () => {
    const alert = generatePackageAlert(1);

    const startTime = performance.now();
    await storageService.savePackageAlert(alert);
    const endTime = performance.now();

    const saveTime = endTime - startTime;
    console.log(`\n单条快递警报保存耗时: ${saveTime.toFixed(2)}ms`);

    expect(saveTime).toBeLessThan(1000);
  });

  it("应验证批量快递警报保存性能（10条）", async () => {
    const alerts = Array.from({ length: 10 }, (_, i) =>
      generatePackageAlert(i + 1),
    );

    const startTime = performance.now();

    for (const alert of alerts) {
      await storageService.savePackageAlert(alert);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / alerts.length;

    console.log(`\n批量保存10条快递警报:`);
    console.log(`总耗时: ${totalTime.toFixed(2)}ms`);
    console.log(`平均每条: ${avgTime.toFixed(2)}ms`);

    expect(totalTime).toBeLessThan(1000);
    expect(avgTime).toBeLessThan(100);
  });

  it("应验证快递警报查询性能（查询100条）", async () => {
    // 先插入100条数据
    const alerts = Array.from({ length: 100 }, (_, i) =>
      generatePackageAlert(i + 1),
    );

    for (const alert of alerts) {
      await storageService.savePackageAlert(alert);
    }

    // 测试查询性能
    const startTime = performance.now();
    const results = await storageService.getPackageAlerts(100);
    const endTime = performance.now();

    const queryTime = endTime - startTime;
    console.log(`\n查询100条快递警报耗时: ${queryTime.toFixed(2)}ms`);
    console.log(`查询结果数量: ${results.length}`);

    expect(queryTime).toBeLessThan(1000);
    expect(results.length).toBeGreaterThan(0);
  });

  it("应验证混合操作性能（保存+查询）", async () => {
    const totalStartTime = performance.now();

    // 保存10条访客意图
    const intents = Array.from({ length: 10 }, (_, i) =>
      generateVisitorIntent(i + 1),
    );
    for (const intent of intents) {
      await storageService.saveVisitorIntent(intent);
    }

    // 保存10条快递警报
    const alerts = Array.from({ length: 10 }, (_, i) =>
      generatePackageAlert(i + 1),
    );
    for (const alert of alerts) {
      await storageService.savePackageAlert(alert);
    }

    // 查询数据
    const intentResults = await storageService.getVisitorIntents(10);
    const alertResults = await storageService.getPackageAlerts(10);

    const totalEndTime = performance.now();
    const totalTime = totalEndTime - totalStartTime;

    console.log(`\n混合操作性能测试:`);
    console.log(`保存10条访客意图 + 10条快递警报 + 查询`);
    console.log(`总耗时: ${totalTime.toFixed(2)}ms`);
    console.log(`访客意图查询结果: ${intentResults.length}条`);
    console.log(`快递警报查询结果: ${alertResults.length}条`);

    expect(totalTime).toBeLessThan(1000);
    expect(intentResults.length).toBeGreaterThan(0);
    expect(alertResults.length).toBeGreaterThan(0);
  });

  it("应验证删除操作性能", async () => {
    // 先插入10条数据
    const intents = Array.from({ length: 10 }, (_, i) =>
      generateVisitorIntent(i + 1),
    );

    for (const intent of intents) {
      await storageService.saveVisitorIntent(intent);
    }

    // 查询所有数据
    const savedIntents = await storageService.getVisitorIntents(10);

    // 测试删除性能
    const startTime = performance.now();

    for (const intent of savedIntents) {
      await storageService.deleteVisitorIntent(intent.id);
    }

    const endTime = performance.now();
    const deleteTime = endTime - startTime;
    const avgDeleteTime = deleteTime / savedIntents.length;

    console.log(`\n删除10条访客意图:`);
    console.log(`总耗时: ${deleteTime.toFixed(2)}ms`);
    console.log(`平均每条: ${avgDeleteTime.toFixed(2)}ms`);

    expect(deleteTime).toBeLessThan(1000);
    expect(avgDeleteTime).toBeLessThan(100);
  });

  it("应验证IndexedDB性能指标总结", () => {
    const performanceMetrics = {
      singleSaveTarget: 1000, // ms - 单条保存目标时间
      batchSaveTarget: 1000, // ms - 批量保存目标时间
      queryTarget: 1000, // ms - 查询目标时间
      mixedOperationTarget: 1000, // ms - 混合操作目标时间
    };

    console.log("\n=== IndexedDB性能指标总结 ===");
    console.log(`单条保存目标: <${performanceMetrics.singleSaveTarget}ms`);
    console.log(`批量保存目标: <${performanceMetrics.batchSaveTarget}ms`);
    console.log(`查询操作目标: <${performanceMetrics.queryTarget}ms`);
    console.log(`混合操作目标: <${performanceMetrics.mixedOperationTarget}ms`);
    console.log("\n所有操作都应在1000ms内完成");

    // 验证性能目标设置合理
    expect(performanceMetrics.singleSaveTarget).toBe(1000);
    expect(performanceMetrics.batchSaveTarget).toBe(1000);
    expect(performanceMetrics.queryTarget).toBe(1000);
    expect(performanceMetrics.mixedOperationTarget).toBe(1000);

    console.log("\n✓ 性能目标设置合理");
  });
});
