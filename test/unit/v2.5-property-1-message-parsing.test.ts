/**
 * 属性测试 1: 访客意图消息解析完整性
 * 验证需求: 1.1, 1.2
 *
 * 使用fast-check生成随机visitor_intent_notification消息
 * 验证解析后包含所有必需字段
 */

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import { DeviceService } from "@/services/DeviceService";

describe("属性 1: 访客意图消息解析完整性", () => {
  let deviceService: DeviceService;

  beforeEach(() => {
    deviceService = new DeviceService();
  });

  it("对于任意有效的visitor_intent_notification消息，解析后应包含所有必需字段", () => {
    // 定义生成器
    const visitorIntentMessageArbitrary = fc.record({
      type: fc.constant("visitor_intent_notification"),
      visit_id: fc.integer({ min: 1, max: 999999 }),
      session_id: fc.string({ minLength: 1, maxLength: 50 }),
      person_info: fc.record({
        person_id: fc.option(fc.integer({ min: 1, max: 999999 }), {
          nil: null,
        }),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        relation_type: fc.constantFrom("family", "friend", "unknown"),
      }),
      intent_summary: fc.record({
        intent_type: fc.constantFrom(
          "delivery",
          "visit",
          "sales",
          "maintenance",
          "other",
        ),
        summary: fc.string({ minLength: 1, maxLength: 200 }),
        important_notes: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
          maxLength: 5,
        }),
        ai_analysis: fc.string({ minLength: 1, maxLength: 500 }),
      }),
      dialogue_history: fc.array(
        fc.record({
          role: fc.constantFrom("assistant", "user"),
          content: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        { maxLength: 20 },
      ),
      ts: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
    });

    // 属性测试
    fc.assert(
      fc.property(visitorIntentMessageArbitrary, (message) => {
        let emittedData: any = null;

        // 订阅事件
        const unsubscribe = deviceService.on("visitor_intent", (_, data) => {
          emittedData = data;
        });

        try {
          // 调用处理方法
          (deviceService as any).handleVisitorIntentNotification(message);

          // 验证事件被触发
          expect(emittedData).toBeTruthy();

          // 验证所有必需字段都存在
          expect(emittedData.visit_id).toBe(message.visit_id);
          expect(emittedData.session_id).toBe(message.session_id);
          expect(emittedData.person_info).toEqual(message.person_info);
          expect(emittedData.intent_summary).toEqual(message.intent_summary);
          expect(emittedData.dialogue_history).toEqual(
            message.dialogue_history,
          );
          expect(emittedData.ts).toBe(message.ts);

          // 验证字段类型正确
          expect(typeof emittedData.visit_id).toBe("number");
          expect(typeof emittedData.session_id).toBe("string");
          expect(typeof emittedData.intent_summary).toBe("object");
          expect(Array.isArray(emittedData.dialogue_history)).toBe(true);
          expect(typeof emittedData.ts).toBe("number");
        } finally {
          unsubscribe();
        }
      }),
      {
        numRuns: 100, // 运行100次
        verbose: true,
      },
    );
  });

  it("对于任意包含package_check的消息，应正确提取快递警报且不影响访客意图解析", () => {
    // 定义生成器（包含package_check）
    const messageWithPackageCheckArbitrary = fc.record({
      type: fc.constant("visitor_intent_notification"),
      visit_id: fc.integer({ min: 1, max: 999999 }),
      session_id: fc.string({ minLength: 1, maxLength: 50 }),
      person_info: fc.record({
        person_id: fc.option(fc.integer({ min: 1, max: 999999 }), {
          nil: null,
        }),
        name: fc.string({ minLength: 1, maxLength: 50 }),
        relation_type: fc.constantFrom("family", "friend", "unknown"),
      }),
      intent_summary: fc.record({
        intent_type: fc.constantFrom(
          "delivery",
          "visit",
          "sales",
          "maintenance",
          "other",
        ),
        summary: fc.string({ minLength: 1, maxLength: 200 }),
        important_notes: fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
          maxLength: 5,
        }),
        ai_analysis: fc.string({ minLength: 1, maxLength: 500 }),
      }),
      dialogue_history: fc.array(
        fc.record({
          role: fc.constantFrom("assistant", "user"),
          content: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        { maxLength: 20 },
      ),
      package_check: fc.record({
        threat_level: fc.constantFrom("low", "medium", "high"),
        action: fc.constantFrom(
          "normal",
          "passing",
          "searching",
          "taking",
          "damaging",
        ),
        description: fc.string({ minLength: 1, maxLength: 200 }),
      }),
      ts: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
    });

    // 属性测试
    fc.assert(
      fc.property(messageWithPackageCheckArbitrary, (message) => {
        let visitorIntentData: any = null;
        let packageAlertData: any = null;

        // 订阅事件
        const unsubVisitorIntent = deviceService.on(
          "visitor_intent",
          (_, data) => {
            visitorIntentData = data;
          },
        );
        const unsubPackageAlert = deviceService.on(
          "package_alert",
          (_, data) => {
            packageAlertData = data;
          },
        );

        try {
          // 调用处理方法
          (deviceService as any).handleVisitorIntentNotification(message);

          // 验证访客意图事件被触发
          expect(visitorIntentData).toBeTruthy();
          expect(visitorIntentData.visit_id).toBe(message.visit_id);
          expect(visitorIntentData.session_id).toBe(message.session_id);

          // 验证快递警报事件被触发
          expect(packageAlertData).toBeTruthy();
          expect(packageAlertData.session_id).toBe(message.session_id);
          expect(packageAlertData.threat_level).toBe(
            message.package_check.threat_level,
          );
          expect(packageAlertData.action).toBe(message.package_check.action);
          expect(packageAlertData.description).toBe(
            message.package_check.description,
          );
          expect(packageAlertData.ts).toBe(message.ts);
        } finally {
          unsubVisitorIntent();
          unsubPackageAlert();
        }
      }),
      {
        numRuns: 100,
        verbose: true,
      },
    );
  });

  it("对于任意格式错误的消息，系统应记录错误但不崩溃", () => {
    // 定义生成器（缺少必需字段）
    const invalidMessageArbitrary = fc.oneof(
      // 缺少visit_id
      fc.record({
        type: fc.constant("visitor_intent_notification"),
        session_id: fc.string({ minLength: 1 }),
        intent_summary: fc.record({
          intent_type: fc.string(),
          summary: fc.string(),
          important_notes: fc.array(fc.string()),
          ai_analysis: fc.string(),
        }),
      }),
      // 缺少session_id
      fc.record({
        type: fc.constant("visitor_intent_notification"),
        visit_id: fc.integer({ min: 1 }),
        intent_summary: fc.record({
          intent_type: fc.string(),
          summary: fc.string(),
          important_notes: fc.array(fc.string()),
          ai_analysis: fc.string(),
        }),
      }),
      // 缺少intent_summary
      fc.record({
        type: fc.constant("visitor_intent_notification"),
        visit_id: fc.integer({ min: 1 }),
        session_id: fc.string({ minLength: 1 }),
      }),
    );

    // 属性测试
    fc.assert(
      fc.property(invalidMessageArbitrary, (message) => {
        let visitorIntentEmitted = false;
        let logEmitted = false;

        // 订阅事件
        const unsubVisitorIntent = deviceService.on("visitor_intent", () => {
          visitorIntentEmitted = true;
        });
        const unsubLog = deviceService.on("log", (_, data) => {
          if (data.type === "error") {
            logEmitted = true;
          }
        });

        try {
          // 调用处理方法（不应崩溃）
          expect(() => {
            (deviceService as any).handleVisitorIntentNotification(message);
          }).not.toThrow();

          // 验证不触发visitor_intent事件
          expect(visitorIntentEmitted).toBe(false);

          // 验证触发错误日志事件
          expect(logEmitted).toBe(true);
        } finally {
          unsubVisitorIntent();
          unsubLog();
        }
      }),
      {
        numRuns: 50,
        verbose: true,
      },
    );
  });
});
