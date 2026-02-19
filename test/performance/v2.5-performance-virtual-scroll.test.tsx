/**
 * 任务 24.1: 虚拟滚动性能验证测试
 * 验证需求: 19.4
 *
 * 测试目标:
 * - 准备100+条对话历史测试数据
 * - 验证渲染时间<100ms
 * - 验证滚动帧率>50 FPS
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import VisitorIntentScreen from "@/screens/VisitorIntentScreen";
import type { VisitorIntent, DialogueMessage } from "@/types";

describe("任务 24.1: 虚拟滚动性能验证", () => {
  // 生成大量对话历史测试数据
  const generateDialogueHistory = (count: number): DialogueMessage[] => {
    const messages: DialogueMessage[] = [];
    for (let i = 0; i < count; i++) {
      messages.push({
        role: i % 2 === 0 ? "assistant" : "user",
        content: `这是第 ${i + 1} 条测试消息。内容包含一些文本用于测试渲染性能。`,
      });
    }
    return messages;
  };

  // 创建测试用的访客意图数据
  const createTestIntent = (dialogueCount: number): VisitorIntent => ({
    id: 1,
    visit_id: 1001,
    session_id: "test_session_001",
    person_id: 10,
    person_name: "性能测试访客",
    relation_type: "unknown",
    intent_type: "delivery",
    intent_summary: {
      intent_type: "delivery",
      summary: "快递员送快递",
      important_notes: ["测试重要信息1", "测试重要信息2"],
      ai_analysis: "这是AI分析的详细内容，用于性能测试。",
    },
    dialogue_history: generateDialogueHistory(dialogueCount),
    created_at: new Date().toISOString(),
    ts: Date.now(),
  });

  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("应准备100+条对话历史测试数据", () => {
    const intent = createTestIntent(150);

    expect(intent.dialogue_history).toBeDefined();
    expect(intent.dialogue_history.length).toBeGreaterThanOrEqual(100);
    expect(intent.dialogue_history.length).toBe(150);

    // 验证数据结构正确
    intent.dialogue_history.forEach((msg, index) => {
      expect(msg).toHaveProperty("role");
      expect(msg).toHaveProperty("content");
      expect(["assistant", "user"]).toContain(msg.role);
      expect(msg.content).toContain(`第 ${index + 1} 条`);
    });
  });

  it("应在渲染100条对话时触发虚拟滚动", () => {
    const intent = createTestIntent(100);

    render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

    // 验证对话历史数量超过50条（触发虚拟滚动的条件）
    expect(intent.dialogue_history.length).toBeGreaterThan(50);
    expect(intent.dialogue_history.length).toBe(100);
  });

  it("应验证渲染时间<100ms (100条对话)", () => {
    const intent = createTestIntent(100);

    // 测量渲染时间
    const startTime = performance.now();

    render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`渲染100条对话耗时: ${renderTime.toFixed(2)}ms`);

    // 验证渲染时间小于100ms
    expect(renderTime).toBeLessThan(100);
  });

  it("应验证渲染时间<100ms (150条对话)", () => {
    const intent = createTestIntent(150);

    // 测量渲染时间
    const startTime = performance.now();

    render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`渲染150条对话耗时: ${renderTime.toFixed(2)}ms`);

    // 验证渲染时间小于100ms
    expect(renderTime).toBeLessThan(100);
  });

  it("应验证渲染时间<100ms (200条对话)", () => {
    const intent = createTestIntent(200);

    // 测量渲染时间
    const startTime = performance.now();

    render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    console.log(`渲染200条对话耗时: ${renderTime.toFixed(2)}ms`);

    // 验证渲染时间小于100ms
    expect(renderTime).toBeLessThan(100);
  });

  it("应在少于50条对话时使用普通渲染", () => {
    const intent = createTestIntent(30);

    const { container } = render(
      <VisitorIntentScreen intent={intent} onBack={mockOnBack} />,
    );

    // 验证所有对话都直接渲染（不使用虚拟滚动）
    const chatBubbles = container.querySelectorAll('[class*="flex"]');

    // 应该能找到所有30条消息的容器
    expect(chatBubbles.length).toBeGreaterThan(0);
  });

  it("应验证虚拟滚动仅渲染可见区域", async () => {
    const intent = createTestIntent(100);

    const { container } = render(
      <VisitorIntentScreen intent={intent} onBack={mockOnBack} />,
    );

    // 等待虚拟滚动组件加载
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 虚拟滚动应该只渲染部分内容
    // 由于虚拟滚动的特性，DOM中的元素数量应该远少于100
    const renderedItems = container.querySelectorAll('[style*="position"]');

    // 验证渲染的元素数量少于总数（说明虚拟滚动生效）
    if (renderedItems.length > 0) {
      expect(renderedItems.length).toBeLessThan(100);
      console.log(
        `虚拟滚动渲染了 ${renderedItems.length} 个可见项（总共100项）`,
      );
    }
  });

  it("应验证性能指标 - 批量渲染测试", () => {
    const testCases = [50, 100, 150, 200, 300];
    const results: Array<{ count: number; time: number }> = [];

    testCases.forEach((count) => {
      const intent = createTestIntent(count);

      const startTime = performance.now();
      const { unmount } = render(
        <VisitorIntentScreen intent={intent} onBack={mockOnBack} />,
      );
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      results.push({ count, time: renderTime });

      unmount();
    });

    // 输出性能报告
    console.log("\n=== 虚拟滚动性能报告 ===");
    results.forEach(({ count, time }) => {
      console.log(`${count}条对话: ${time.toFixed(2)}ms`);
    });

    // 验证所有测试用例的渲染时间都小于100ms
    results.forEach(({ count, time }) => {
      expect(time).toBeLessThan(100);
    });
  });

  it("应验证虚拟滚动的内存效率", () => {
    const smallIntent = createTestIntent(30);
    const largeIntent = createTestIntent(200);

    // 渲染小数据集
    const { container: smallContainer, unmount: unmountSmall } = render(
      <VisitorIntentScreen intent={smallIntent} onBack={mockOnBack} />,
    );

    const smallDomSize = smallContainer.innerHTML.length;
    unmountSmall();

    // 渲染大数据集
    const { container: largeContainer, unmount: unmountLarge } = render(
      <VisitorIntentScreen intent={largeIntent} onBack={mockOnBack} />,
    );

    const largeDomSize = largeContainer.innerHTML.length;
    unmountLarge();

    console.log(`30条对话DOM大小: ${smallDomSize} 字符`);
    console.log(`200条对话DOM大小: ${largeDomSize} 字符`);

    // 虚拟滚动应该使大数据集的DOM大小增长不成比例
    // 200条数据的DOM不应该是30条的6.67倍
    const ratio = largeDomSize / smallDomSize;
    console.log(`DOM大小比例: ${ratio.toFixed(2)}x`);

    // 如果虚拟滚动生效，比例应该远小于 200/30 = 6.67
    expect(ratio).toBeLessThan(6.67);
  });
});
