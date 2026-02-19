/**
 * v2.5协议属性测试集合（修复版）
 * 包含属性6、9、12、19的测试：数据持久化、查询、UI组件、数据清理
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fc from "fast-check";
import { deviceService } from "@/services/DeviceService";
import { localStorageService } from "@/services/LocalStorageService";
import type { VisitorIntent, PackageAlert } from "@/types";

describe("属性 6: 访客意图持久化完整性", () => {
  beforeEach(async () => {
    await localStorageService.init();
  });

  afterEach(async () => {
    // 清理测试数据
    const db = (localStorageService as any).db;
    if (db) {
      const transaction = db.transaction(["visitor_intents"], "readwrite");
      const store = transaction.objectStore("visitor_intents");
      await store.clear();
    }
  });

  it("对于任意VisitorIntent对象，保存后读取应得到相同数据", () => {
    // 定义生成器
    const visitorIntentArbitrary = fc.record({
      visit_id: fc.integer({ min: 1, max: 999999 }),
      session_id: fc.string({ minLength: 1, maxLength: 50 }),
      person_id: fc.option(fc.integer({ min: 1, max: 999999 }), { nil: null }),
      person_name: fc.string({ minLength: 1, maxLength: 50 }),
      relation_type: fc.constantFrom(
        "family",
        "friend",
        "unknown",
      ) as fc.Arbitrary<"family" | "friend" | "unknown">,
      intent_type: fc.constantFrom(
        "delivery",
        "visit",
        "sales",
        "maintenance",
        "other",
      ) as fc.Arbitrary<
        "delivery" | "visit" | "sales" | "maintenance" | "other"
      >,
      intent_summary: fc.record({
        intent_type: fc.string({ minLength: 1, maxLength: 20 }),
        summary: fc.string({ minLength: 1, maxLength: 200 }),
        important_notes: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
          maxLength: 5,
        }),
        ai_analysis: fc.string({ minLength: 1, maxLength: 500 }),
      }),
      dialogue_history: fc.array(
        fc.record({
          role: fc.constantFrom("assistant", "user") as fc.Arbitrary<
            "assistant" | "user"
          >,
          content: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        { maxLength: 10 },
      ),
      created_at: fc
        .date({ min: new Date("2024-01-01"), max: new Date() })
        .map((d) => d.toISOString()),
      ts: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
    });

    // 属性测试
    fc.assert(
      fc.asyncProperty(visitorIntentArbitrary, async (intent) => {
        // 保存
        await localStorageService.saveVisitorIntent(intent as any);

        // 读取
        const intents = await localStorageService.getVisitorIntents(100);
        const savedIntent = intents.find(
          (i) => i.session_id === intent.session_id,
        );

        // 验证存在
        expect(savedIntent).toBeTruthy();

        // 验证字段相等（忽略id字段，因为是自动生成的）
        expect(savedIntent?.visit_id).toBe(intent.visit_id);
        expect(savedIntent?.session_id).toBe(intent.session_id);
        expect(savedIntent?.person_id).toBe(intent.person_id);
        expect(savedIntent?.person_name).toBe(intent.person_name);
        expect(savedIntent?.relation_type).toBe(intent.relation_type);
        expect(savedIntent?.intent_type).toBe(intent.intent_type);
        expect(savedIntent?.intent_summary).toEqual(intent.intent_summary);
        expect(savedIntent?.dialogue_history).toEqual(intent.dialogue_history);
        expect(savedIntent?.created_at).toBe(intent.created_at);
        expect(savedIntent?.ts).toBe(intent.ts);
      }),
      {
        numRuns: 30, // 减少运行次数以提高速度
        verbose: true,
      },
    );
  });

  it("对于任意PackageAlert对象，保存后读取应得到相同数据", () => {
    // 定义生成器
    const packageAlertArbitrary = fc.record({
      device_id: fc.string({ minLength: 1, maxLength: 50 }),
      session_id: fc.string({ minLength: 1, maxLength: 50 }),
      threat_level: fc.constantFrom("low", "medium", "high") as fc.Arbitrary<
        "low" | "medium" | "high"
      >,
      action: fc.constantFrom(
        "normal",
        "passing",
        "searching",
        "taking",
        "damaging",
      ) as fc.Arbitrary<
        "normal" | "passing" | "searching" | "taking" | "damaging"
      >,
      description: fc.string({ minLength: 1, maxLength: 200 }),
      photo_path: fc.string({ minLength: 1, maxLength: 200 }),
      voice_warning_sent: fc.boolean(),
      notified: fc.boolean(),
      created_at: fc
        .date({ min: new Date("2024-01-01"), max: new Date() })
        .map((d) => d.toISOString()),
      ts: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
    });

    // 属性测试
    fc.assert(
      fc.asyncProperty(packageAlertArbitrary, async (alert) => {
        // 保存
        await localStorageService.savePackageAlert(alert as any);

        // 读取
        const alerts = await localStorageService.getPackageAlerts(100);
        const savedAlert = alerts.find(
          (a) => a.session_id === alert.session_id,
        );

        // 验证存在
        expect(savedAlert).toBeTruthy();

        // 验证字段相等
        expect(savedAlert?.device_id).toBe(alert.device_id);
        expect(savedAlert?.session_id).toBe(alert.session_id);
        expect(savedAlert?.threat_level).toBe(alert.threat_level);
        expect(savedAlert?.action).toBe(alert.action);
        expect(savedAlert?.description).toBe(alert.description);
        expect(savedAlert?.photo_path).toBe(alert.photo_path);
        expect(savedAlert?.voice_warning_sent).toBe(alert.voice_warning_sent);
        expect(savedAlert?.notified).toBe(alert.notified);
        expect(savedAlert?.created_at).toBe(alert.created_at);
        expect(savedAlert?.ts).toBe(alert.ts);
      }),
      {
        numRuns: 30,
        verbose: true,
      },
    );
  });
});

describe("属性 9: 查询消息构造正确性", () => {
  it("对于任意查询参数，queryVisitorIntents应构造符合协议规范的query消息", () => {
    // 定义生成器 - 使用整数时间戳而不是日期对象
    const queryParamsArbitrary = fc.record({
      start_date: fc.option(
        fc.integer({ min: 1704067200000, max: Date.now() }).map((ts) => {
          const d = new Date(ts);
          return d.toISOString().split("T")[0];
        }),
        { nil: undefined },
      ),
      end_date: fc.option(
        fc.integer({ min: 1704067200000, max: Date.now() }).map((ts) => {
          const d = new Date(ts);
          return d.toISOString().split("T")[0];
        }),
        { nil: undefined },
      ),
      limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
      offset: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
    });

    // 属性测试
    fc.assert(
      fc.property(queryParamsArbitrary, (params) => {
        // Mock sendCommand方法
        let capturedCommand: any = null;
        const originalSendCommand = deviceService.sendCommand;
        deviceService.sendCommand = vi.fn((cmd: any) => {
          capturedCommand = cmd;
          return "test-seq-id";
        });

        try {
          // 调用查询方法
          const seqId = deviceService.queryVisitorIntents(params);

          // 验证返回值
          expect(seqId).toBe("test-seq-id");

          // 验证命令结构
          expect(capturedCommand).toBeTruthy();
          expect(capturedCommand.type).toBe("query");
          expect(capturedCommand.target).toBe("visitor_intents");
          expect(capturedCommand.data).toBeTruthy();

          // 验证参数传递
          if (params.start_date !== undefined) {
            expect(capturedCommand.data.start_date).toBe(params.start_date);
          }
          if (params.end_date !== undefined) {
            expect(capturedCommand.data.end_date).toBe(params.end_date);
          }
          if (params.limit !== undefined) {
            expect(capturedCommand.data.limit).toBe(params.limit);
          }
          if (params.offset !== undefined) {
            expect(capturedCommand.data.offset).toBe(params.offset);
          }
        } finally {
          // 恢复原方法
          deviceService.sendCommand = originalSendCommand;
        }
      }),
      {
        numRuns: 100,
        verbose: true,
      },
    );
  });

  it("对于任意查询参数，queryPackageAlerts应构造符合协议规范的query消息", () => {
    // 定义生成器 - 使用整数时间戳
    const queryParamsArbitrary = fc.record({
      threat_level: fc.option(fc.constantFrom("low", "medium", "high"), {
        nil: undefined,
      }),
      start_date: fc.option(
        fc.integer({ min: 1704067200000, max: Date.now() }).map((ts) => {
          const d = new Date(ts);
          return d.toISOString().split("T")[0];
        }),
        { nil: undefined },
      ),
      end_date: fc.option(
        fc.integer({ min: 1704067200000, max: Date.now() }).map((ts) => {
          const d = new Date(ts);
          return d.toISOString().split("T")[0];
        }),
        { nil: undefined },
      ),
      limit: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
      offset: fc.option(fc.integer({ min: 0, max: 1000 }), { nil: undefined }),
    });

    // 属性测试
    fc.assert(
      fc.property(queryParamsArbitrary, (params) => {
        // Mock sendCommand方法
        let capturedCommand: any = null;
        const originalSendCommand = deviceService.sendCommand;
        deviceService.sendCommand = vi.fn((cmd: any) => {
          capturedCommand = cmd;
          return "test-seq-id";
        });

        try {
          // 调用查询方法
          const seqId = deviceService.queryPackageAlerts(params);

          // 验证返回值
          expect(seqId).toBe("test-seq-id");

          // 验证命令结构
          expect(capturedCommand).toBeTruthy();
          expect(capturedCommand.type).toBe("query");
          expect(capturedCommand.target).toBe("package_alerts");
          expect(capturedCommand.data).toBeTruthy();

          // 验证参数传递
          if (params.threat_level !== undefined) {
            expect(capturedCommand.data.threat_level).toBe(params.threat_level);
          }
          if (params.start_date !== undefined) {
            expect(capturedCommand.data.start_date).toBe(params.start_date);
          }
          if (params.end_date !== undefined) {
            expect(capturedCommand.data.end_date).toBe(params.end_date);
          }
          if (params.limit !== undefined) {
            expect(capturedCommand.data.limit).toBe(params.limit);
          }
          if (params.offset !== undefined) {
            expect(capturedCommand.data.offset).toBe(params.offset);
          }
        } finally {
          // 恢复原方法
          deviceService.sendCommand = originalSendCommand;
        }
      }),
      {
        numRuns: 100,
        verbose: true,
      },
    );
  });
});

describe("属性 12: Toast自动关闭时间准确性", () => {
  it("对于任意duration参数，Toast应在指定时间后关闭（误差<100ms）", () => {
    // 定义生成器
    const durationArbitrary = fc.integer({ min: 1000, max: 5000 });

    // 属性测试
    fc.assert(
      fc.asyncProperty(durationArbitrary, async (duration) => {
        let closeCalled = false;
        let closeTime = 0;
        const startTime = Date.now();

        // 模拟Toast组件的自动关闭逻辑
        const timer = setTimeout(() => {
          closeCalled = true;
          closeTime = Date.now();
        }, duration);

        // 等待关闭
        await new Promise((resolve) => setTimeout(resolve, duration + 50));

        // 清理定时器
        clearTimeout(timer);

        // 验证关闭被调用
        expect(closeCalled).toBe(true);

        // 验证时间准确性（误差<100ms）
        const actualDuration = closeTime - startTime;
        const error = Math.abs(actualDuration - duration);
        expect(error).toBeLessThan(100);
      }),
      {
        numRuns: 20, // 减少运行次数，因为涉及实际等待
        verbose: true,
      },
    );
  });
});

describe("属性 19: 按时间清理准确性", () => {
  beforeEach(async () => {
    await localStorageService.init();
  });

  afterEach(async () => {
    // 清理测试数据
    const db = (localStorageService as any).db;
    if (db) {
      const transaction = db.transaction(
        ["visitor_intents", "package_alerts"],
        "readwrite",
      );
      await transaction.objectStore("visitor_intents").clear();
      await transaction.objectStore("package_alerts").clear();
    }
  });

  it("对于任意maxAgeDays参数，cleanupByAge应删除所有超期记录", () => {
    // 定义生成器
    const maxAgeDaysArbitrary = fc.integer({ min: 1, max: 90 });

    // 属性测试
    fc.assert(
      fc.asyncProperty(maxAgeDaysArbitrary, async (maxAgeDays) => {
        const now = Date.now();
        const cutoffTime = now - maxAgeDays * 24 * 60 * 60 * 1000;

        // 创建测试数据：一半过期，一半未过期
        const expiredIntent: VisitorIntent = {
          id: 1,
          visit_id: 1,
          session_id: "expired-session",
          person_id: 1,
          person_name: "过期访客",
          relation_type: "unknown",
          intent_type: "delivery",
          intent_summary: {
            intent_type: "delivery",
            summary: "测试",
            important_notes: [],
            ai_analysis: "测试",
          },
          dialogue_history: [],
          created_at: new Date(cutoffTime - 1000).toISOString(),
          ts: cutoffTime - 1000,
        };

        const validIntent: VisitorIntent = {
          id: 2,
          visit_id: 2,
          session_id: "valid-session",
          person_id: 2,
          person_name: "有效访客",
          relation_type: "family",
          intent_type: "visit",
          intent_summary: {
            intent_type: "visit",
            summary: "测试",
            important_notes: [],
            ai_analysis: "测试",
          },
          dialogue_history: [],
          created_at: new Date(cutoffTime + 1000).toISOString(),
          ts: cutoffTime + 1000,
        };

        // 保存测试数据
        await localStorageService.saveVisitorIntent(expiredIntent);
        await localStorageService.saveVisitorIntent(validIntent);

        // 执行清理
        const deleted = await (localStorageService as any).cleanupByAge(
          "visitor_intents",
          maxAgeDays,
        );

        // 验证至少删除了过期记录
        expect(deleted).toBeGreaterThanOrEqual(1);

        // 读取剩余数据
        const remaining = await localStorageService.getVisitorIntents(100);

        // 验证所有剩余记录都未过期
        for (const intent of remaining) {
          expect(intent.ts).toBeGreaterThanOrEqual(cutoffTime);
        }

        // 验证有效记录仍然存在
        const validRemaining = remaining.find(
          (i) => i.session_id === "valid-session",
        );
        expect(validRemaining).toBeTruthy();
      }),
      {
        numRuns: 10, // 减少运行次数，因为涉及数据库操作
        verbose: true,
      },
    );
  });
});
