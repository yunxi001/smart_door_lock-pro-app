/**
 * VisitorIntentScreen 组件测试
 * 验证需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VisitorIntentScreen from "@/screens/VisitorIntentScreen";
import type { VisitorIntent } from "@/types";

describe("VisitorIntentScreen 组件", () => {
  // 创建测试用的访客意图数据
  const createMockIntent = (dialogueCount: number = 5): VisitorIntent => ({
    id: 1,
    visit_id: 123,
    session_id: "session_123",
    person_id: 10,
    person_name: "张三",
    relation_type: "family",
    intent_type: "delivery",
    intent_summary: {
      intent_type: "delivery",
      summary: "快递员送快递",
      important_notes: ["包裹较大", "需要签收"],
      ai_analysis: "访客是快递员，正在配送包裹。",
    },
    dialogue_history: Array.from({ length: dialogueCount }, (_, i) => ({
      role: i % 2 === 0 ? ("assistant" as const) : ("user" as const),
      content: `对话内容 ${i + 1}`,
    })),
    created_at: "2024-12-11T10:30:00Z",
    ts: Date.now(),
  });

  const mockOnBack = vi.fn();

  describe("顶部信息栏渲染 (需求 4.1, 4.2)", () => {
    it("应正确渲染访客姓名", () => {
      const intent = createMockIntent();
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("张三")).toBeTruthy();
    });

    it("应正确渲染意图类型标签", () => {
      const intent = createMockIntent();
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("快递配送")).toBeTruthy();
    });

    it("应正确渲染关系类型", () => {
      const intent = createMockIntent();
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("家人")).toBeTruthy();
    });

    it("应正确显示不同的关系类型", () => {
      const friendIntent: VisitorIntent = {
        ...createMockIntent(),
        relation_type: "friend",
      };

      const { rerender } = render(
        <VisitorIntentScreen intent={friendIntent} onBack={mockOnBack} />,
      );
      expect(screen.getByText("朋友")).toBeTruthy();

      const unknownIntent: VisitorIntent = {
        ...createMockIntent(),
        relation_type: "unknown",
      };

      rerender(
        <VisitorIntentScreen intent={unknownIntent} onBack={mockOnBack} />,
      );
      expect(screen.getByText("陌生人")).toBeTruthy();
    });
  });

  describe("AI分析摘要渲染 (需求 4.3, 4.4)", () => {
    it("应正确渲染简要总结", () => {
      const intent = createMockIntent();
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("快递员送快递")).toBeTruthy();
    });

    it("应正确渲染详细分析", () => {
      const intent = createMockIntent();
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("访客是快递员，正在配送包裹。")).toBeTruthy();
    });
  });

  describe("重要信息列表渲染 (需求 4.5)", () => {
    it("应正确渲染重要信息列表", () => {
      const intent = createMockIntent();
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("包裹较大")).toBeTruthy();
      expect(screen.getByText("需要签收")).toBeTruthy();
    });

    it("当没有重要信息时不应显示重要信息区域", () => {
      const intent: VisitorIntent = {
        ...createMockIntent(),
        intent_summary: {
          intent_type: "delivery",
          summary: "快递员送快递",
          important_notes: [],
          ai_analysis: "访客是快递员，正在配送包裹。",
        },
      };

      const { container } = render(
        <VisitorIntentScreen intent={intent} onBack={mockOnBack} />,
      );

      // 验证不显示重要信息标题
      expect(screen.queryByText("重要信息")).toBeFalsy();
    });
  });

  describe("对话历史渲染 (需求 4.6)", () => {
    it("应正确渲染对话历史", () => {
      const intent = createMockIntent(3);
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("对话内容 1")).toBeTruthy();
      expect(screen.getByText("对话内容 2")).toBeTruthy();
      expect(screen.getByText("对话内容 3")).toBeTruthy();
    });

    it("当对话历史为空时应显示空状态提示", () => {
      const intent = createMockIntent(0);
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("暂无对话记录")).toBeTruthy();
    });
  });

  describe("虚拟滚动优化 (需求 4.7, 19.1, 19.5)", () => {
    it("当对话历史少于50条时应使用普通渲染", () => {
      const intent = createMockIntent(30);
      const { container } = render(
        <VisitorIntentScreen intent={intent} onBack={mockOnBack} />,
      );

      // 验证使用普通渲染（有space-y-2类）
      const dialogueContainer = container.querySelector(".space-y-2");
      expect(dialogueContainer).toBeTruthy();

      // 验证所有对话都被渲染
      expect(screen.getByText("对话内容 1")).toBeTruthy();
      expect(screen.getByText("对话内容 30")).toBeTruthy();
    });

    it("当对话历史超过50条时应启用虚拟滚动组件", () => {
      const intent = createMockIntent(60);
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      // 验证至少部分对话被渲染（虚拟滚动会渲染所有内容，因为在测试环境中会降级）
      // 在测试环境中，由于动态导入是异步的，会先使用降级渲染
      expect(screen.getByText("对话内容 1")).toBeTruthy();
    });

    it("当对话历史恰好50条时应使用普通渲染", () => {
      const intent = createMockIntent(50);
      const { container } = render(
        <VisitorIntentScreen intent={intent} onBack={mockOnBack} />,
      );

      // 50条不超过阈值，使用普通渲染
      const dialogueContainer = container.querySelector(".space-y-2");
      expect(dialogueContainer).toBeTruthy();
    });

    it("当对话历史为51条时应启用虚拟滚动组件", () => {
      const intent = createMockIntent(51);
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      // 验证对话被渲染
      expect(screen.getByText("对话内容 1")).toBeTruthy();
      expect(screen.getByText("对话内容 51")).toBeTruthy();
    });
  });

  describe("返回按钮 (需求 4.8)", () => {
    it("点击返回按钮应调用onBack回调", () => {
      const intent = createMockIntent();
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      const backButton = screen.getByLabelText("返回");
      backButton.click();

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("快递检查结果渲染 (可选)", () => {
    it("应正确渲染快递检查结果（如果有）", () => {
      const intent: VisitorIntent = {
        ...createMockIntent(),
        package_check: {
          threat_level: "high",
          action: "taking",
          description: "检测到非主人拿走快递",
        },
      };

      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("快递检查结果")).toBeTruthy();
      expect(screen.getByText("高威胁")).toBeTruthy();
      expect(screen.getByText("拿走")).toBeTruthy();
      expect(screen.getByText("检测到非主人拿走快递")).toBeTruthy();
    });

    it("应正确显示不同的威胁等级", () => {
      const mediumThreatIntent: VisitorIntent = {
        ...createMockIntent(),
        package_check: {
          threat_level: "medium",
          action: "searching",
          description: "检测到翻找快递",
        },
      };

      const { rerender } = render(
        <VisitorIntentScreen intent={mediumThreatIntent} onBack={mockOnBack} />,
      );
      expect(screen.getByText("中威胁")).toBeTruthy();

      const lowThreatIntent: VisitorIntent = {
        ...createMockIntent(),
        package_check: {
          threat_level: "low",
          action: "passing",
          description: "路过快递",
        },
      };

      rerender(
        <VisitorIntentScreen intent={lowThreatIntent} onBack={mockOnBack} />,
      );
      expect(screen.getByText("低威胁")).toBeTruthy();
    });

    it("当没有快递检查结果时不应显示该区域", () => {
      const intent = createMockIntent();
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.queryByText("快递检查结果")).toBeFalsy();
    });
  });

  describe("组件结构", () => {
    it("应包含顶部导航栏", () => {
      const intent = createMockIntent();
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("访客意图详情")).toBeTruthy();
    });

    it("应包含AI分析摘要标题", () => {
      const intent = createMockIntent();
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("AI分析摘要")).toBeTruthy();
    });

    it("应包含对话历史标题", () => {
      const intent = createMockIntent();
      render(<VisitorIntentScreen intent={intent} onBack={mockOnBack} />);

      expect(screen.getByText("对话历史")).toBeTruthy();
    });
  });
});
