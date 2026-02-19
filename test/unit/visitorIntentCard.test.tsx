/**
 * VisitorIntentCard组件测试
 *
 * 测试访客意图卡片组件的显示、数量限制和交互
 * 需求: 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import VisitorIntentCard from "@/components/VisitorIntentCard";
import type { VisitorIntent } from "@/types";

// 创建测试用的访客意图数据
const createMockIntent = (
  id: number,
  overrides?: Partial<VisitorIntent>,
): VisitorIntent => ({
  id,
  visit_id: 1000 + id,
  session_id: `session_${id}`,
  person_id: id,
  person_name: `访客${id}`,
  relation_type: "unknown",
  intent_type: "delivery",
  intent_summary: {
    intent_type: "delivery",
    summary: `这是访客${id}的简要总结`,
    important_notes: [],
    ai_analysis: "AI分析内容",
  },
  dialogue_history: [],
  created_at: new Date().toISOString(),
  ts: Date.now() - id * 3600000, // 每个记录相差1小时
  ...overrides,
});

describe("VisitorIntentCard组件测试", () => {
  describe("基本渲染", () => {
    it("应显示卡片标题", () => {
      render(<VisitorIntentCard intents={[]} onViewDetail={() => {}} />);
      expect(screen.getByText("最近访客意图")).toBeTruthy();
    });

    it("应包含正确的卡片样式", () => {
      const { container } = render(
        <VisitorIntentCard intents={[]} onViewDetail={() => {}} />,
      );

      const card = container.querySelector(".bg-white");
      expect(card).toBeTruthy();
      expect(card?.classList.contains("rounded-2xl")).toBe(true);
      expect(card?.classList.contains("shadow-sm")).toBe(true);
      expect(card?.classList.contains("p-4")).toBe(true);
    });
  });

  describe("空状态显示 (需求 3.4)", () => {
    it("当没有记录时应显示空状态提示", () => {
      render(<VisitorIntentCard intents={[]} onViewDetail={() => {}} />);
      expect(screen.getByText("暂无访客意图记录")).toBeTruthy();
    });

    it("空状态应有正确的样式", () => {
      const { container } = render(
        <VisitorIntentCard intents={[]} onViewDetail={() => {}} />,
      );

      const emptyState = screen.getByText("暂无访客意图记录").parentElement;
      expect(emptyState?.classList.contains("text-center")).toBe(true);
      expect(
        emptyState?.classList.contains("text-secondary-400") ||
          emptyState?.classList.contains("text-secondary-500"),
      ).toBe(true);
    });

    it("当intents为空数组时应显示空状态", () => {
      render(<VisitorIntentCard intents={[]} onViewDetail={() => {}} />);
      expect(screen.getByText("暂无访客意图记录")).toBeTruthy();
    });
  });

  describe("记录显示 (需求 3.3)", () => {
    it("应显示访客意图记录", () => {
      const intents = [createMockIntent(1)];
      render(<VisitorIntentCard intents={intents} onViewDetail={() => {}} />);

      expect(screen.getByText("访客1")).toBeTruthy();
      expect(screen.getByText("这是访客1的简要总结")).toBeTruthy();
    });

    it("每条记录应包含意图类型标签", () => {
      const intents = [
        createMockIntent(1, { intent_type: "delivery" }),
        createMockIntent(2, { intent_type: "visit" }),
      ];
      render(<VisitorIntentCard intents={intents} onViewDetail={() => {}} />);

      expect(screen.getByText("快递配送")).toBeTruthy();
      expect(screen.getByText("拜访")).toBeTruthy();
    });

    it("每条记录应包含访客姓名", () => {
      const intents = [
        createMockIntent(1, { person_name: "张三" }),
        createMockIntent(2, { person_name: "李四" }),
      ];
      render(<VisitorIntentCard intents={intents} onViewDetail={() => {}} />);

      expect(screen.getByText("张三")).toBeTruthy();
      expect(screen.getByText("李四")).toBeTruthy();
    });

    it("每条记录应包含简要总结", () => {
      const intents = [
        createMockIntent(1, {
          intent_summary: {
            intent_type: "delivery",
            summary: "快递员送快递",
            important_notes: [],
            ai_analysis: "",
          },
        }),
      ];
      render(<VisitorIntentCard intents={intents} onViewDetail={() => {}} />);

      expect(screen.getByText("快递员送快递")).toBeTruthy();
    });

    it("每条记录应包含时间戳", () => {
      const intents = [createMockIntent(1)];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      // 验证时钟图标存在
      const clockIcon = container.querySelector("svg");
      expect(clockIcon).toBeTruthy();

      // 验证相对时间文本存在（刚刚、X分钟前等）
      const timeText = container.querySelector(
        ".text-xs.text-secondary-500, .text-xs.text-secondary-400",
      );
      expect(timeText).toBeTruthy();
    });

    it("每条记录应包含查看详情按钮", () => {
      const intents = [createMockIntent(1)];
      render(<VisitorIntentCard intents={intents} onViewDetail={() => {}} />);

      const detailButtons = screen.getAllByText("查看详情");
      expect(detailButtons).toHaveLength(1);
    });
  });

  describe("数量限制 (需求 3.2)", () => {
    it("应最多显示5条记录", () => {
      const intents = Array.from({ length: 10 }, (_, i) =>
        createMockIntent(i + 1),
      );
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      // 统计渲染的记录卡片数量
      const recordCards = container.querySelectorAll(
        ".border.border-secondary-200.rounded-xl",
      );
      expect(recordCards).toHaveLength(5);
    });

    it("当有3条记录时应显示3条", () => {
      const intents = Array.from({ length: 3 }, (_, i) =>
        createMockIntent(i + 1),
      );
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      const recordCards = container.querySelectorAll(
        ".border.border-secondary-200.rounded-xl",
      );
      expect(recordCards).toHaveLength(3);
    });

    it("应显示最近的5条记录（按传入顺序）", () => {
      const intents = Array.from({ length: 10 }, (_, i) =>
        createMockIntent(i + 1, { person_name: `访客${i + 1}` }),
      );
      render(<VisitorIntentCard intents={intents} onViewDetail={() => {}} />);

      // 验证显示的是前5条
      expect(screen.getByText("访客1")).toBeTruthy();
      expect(screen.getByText("访客2")).toBeTruthy();
      expect(screen.getByText("访客3")).toBeTruthy();
      expect(screen.getByText("访客4")).toBeTruthy();
      expect(screen.getByText("访客5")).toBeTruthy();

      // 验证第6条及以后不显示
      expect(screen.queryByText("访客6")).toBeNull();
      expect(screen.queryByText("访客10")).toBeNull();
    });

    it("当有1条记录时应显示1条", () => {
      const intents = [createMockIntent(1)];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      const recordCards = container.querySelectorAll(
        ".border.border-secondary-200.rounded-xl",
      );
      expect(recordCards).toHaveLength(1);
    });
  });

  describe("点击事件 (需求 3.5)", () => {
    it("点击记录应调用onViewDetail回调", () => {
      const intents = [createMockIntent(1)];
      const onViewDetail = vi.fn();

      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={onViewDetail} />,
      );

      const recordCard = container.querySelector(
        ".border.border-secondary-200.rounded-xl",
      );
      expect(recordCard).toBeTruthy();

      fireEvent.click(recordCard!);

      expect(onViewDetail).toHaveBeenCalledTimes(1);
      expect(onViewDetail).toHaveBeenCalledWith(intents[0]);
    });

    it("点击不同记录应传递对应的intent对象", () => {
      const intents = [createMockIntent(1), createMockIntent(2)];
      const onViewDetail = vi.fn();

      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={onViewDetail} />,
      );

      const recordCards = container.querySelectorAll(
        ".border.border-secondary-200.rounded-xl",
      );

      // 点击第一条记录
      fireEvent.click(recordCards[0]);
      expect(onViewDetail).toHaveBeenCalledWith(intents[0]);

      // 点击第二条记录
      fireEvent.click(recordCards[1]);
      expect(onViewDetail).toHaveBeenCalledWith(intents[1]);

      expect(onViewDetail).toHaveBeenCalledTimes(2);
    });

    it("记录卡片应有hover效果", () => {
      const intents = [createMockIntent(1)];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      const recordCard = container.querySelector(
        ".border.border-secondary-200.rounded-xl",
      );
      expect(
        recordCard?.classList.contains("hover:bg-secondary-50") ||
          recordCard?.classList.contains("hover:bg-secondary-800"),
      ).toBe(true);
      expect(recordCard?.classList.contains("cursor-pointer")).toBe(true);
    });
  });

  describe("相对时间格式化", () => {
    it("应显示刚刚（小于1分钟）", () => {
      const intents = [
        createMockIntent(1, {
          ts: Date.now() - 30000, // 30秒前
        }),
      ];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      expect(container.textContent).toContain("刚刚");
    });

    it("应显示X分钟前", () => {
      const intents = [
        createMockIntent(1, {
          ts: Date.now() - 5 * 60 * 1000, // 5分钟前
        }),
      ];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      expect(container.textContent).toContain("分钟前");
    });

    it("应显示X小时前", () => {
      const intents = [
        createMockIntent(1, {
          ts: Date.now() - 2 * 3600 * 1000, // 2小时前
        }),
      ];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      expect(container.textContent).toContain("小时前");
    });

    it("应显示X天前", () => {
      const intents = [
        createMockIntent(1, {
          ts: Date.now() - 3 * 24 * 3600 * 1000, // 3天前
        }),
      ];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      expect(container.textContent).toContain("天前");
    });
  });

  describe("不同意图类型显示", () => {
    it("应正确显示所有意图类型", () => {
      const intents = [
        createMockIntent(1, { intent_type: "delivery" }),
        createMockIntent(2, { intent_type: "visit" }),
        createMockIntent(3, { intent_type: "sales" }),
        createMockIntent(4, { intent_type: "maintenance" }),
        createMockIntent(5, { intent_type: "other" }),
      ];
      render(<VisitorIntentCard intents={intents} onViewDetail={() => {}} />);

      expect(screen.getByText("快递配送")).toBeTruthy();
      expect(screen.getByText("拜访")).toBeTruthy();
      expect(screen.getByText("推销")).toBeTruthy();
      expect(screen.getByText("维修")).toBeTruthy();
      expect(screen.getByText("其他")).toBeTruthy();
    });
  });

  describe("布局和样式", () => {
    it("记录列表应有正确的间距", () => {
      const intents = [createMockIntent(1), createMockIntent(2)];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      const listContainer = container.querySelector(".space-y-3");
      expect(listContainer).toBeTruthy();
    });

    it("简要总结应支持多行显示（line-clamp-2）", () => {
      const intents = [
        createMockIntent(1, {
          intent_summary: {
            intent_type: "delivery",
            summary: "这是一个很长的总结文本".repeat(10),
            important_notes: [],
            ai_analysis: "",
          },
        }),
      ];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      const summary = container.querySelector(".line-clamp-2");
      expect(summary).toBeTruthy();
    });

    it("查看详情按钮应有正确的样式", () => {
      const intents = [createMockIntent(1)];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      const detailButton = container.querySelector(
        ".text-primary-600, .text-primary-400",
      );
      expect(detailButton).toBeTruthy();
      expect(
        detailButton?.classList.contains("hover:text-primary-700") ||
          detailButton?.classList.contains("hover:text-primary-300"),
      ).toBe(true);
    });
  });

  describe("边界情况", () => {
    it("应处理空的intent_summary", () => {
      const intents = [
        createMockIntent(1, {
          intent_summary: {
            intent_type: "delivery",
            summary: "",
            important_notes: [],
            ai_analysis: "",
          },
        }),
      ];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      // 应该能正常渲染，不会崩溃
      expect(
        container.querySelector(".border.border-secondary-200"),
      ).toBeTruthy();
    });

    it("应处理空的person_name", () => {
      const intents = [createMockIntent(1, { person_name: "" })];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      // 应该能正常渲染
      expect(
        container.querySelector(".border.border-secondary-200"),
      ).toBeTruthy();
    });

    it("应处理未来的时间戳", () => {
      const intents = [
        createMockIntent(1, {
          ts: Date.now() + 3600000, // 1小时后
        }),
      ];
      const { container } = render(
        <VisitorIntentCard intents={intents} onViewDetail={() => {}} />,
      );

      // 应该显示"刚刚"或不崩溃
      expect(
        container.querySelector(".border.border-secondary-200"),
      ).toBeTruthy();
    });
  });

  describe("组件可复用性", () => {
    it("应支持同时渲染多个VisitorIntentCard", () => {
      const intents1 = [createMockIntent(1)];
      const intents2 = [createMockIntent(2)];

      const { container } = render(
        <>
          <VisitorIntentCard intents={intents1} onViewDetail={() => {}} />
          <VisitorIntentCard intents={intents2} onViewDetail={() => {}} />
        </>,
      );

      const cards = container.querySelectorAll(".bg-white.rounded-2xl");
      expect(cards).toHaveLength(2);
    });

    it("应支持动态更新intents数据", () => {
      const { rerender } = render(
        <VisitorIntentCard intents={[]} onViewDetail={() => {}} />,
      );

      expect(screen.getByText("暂无访客意图记录")).toBeTruthy();

      const intents = [createMockIntent(1)];
      rerender(<VisitorIntentCard intents={intents} onViewDetail={() => {}} />);

      expect(screen.queryByText("暂无访客意图记录")).toBeNull();
      expect(screen.getByText("访客1")).toBeTruthy();
    });
  });
});
