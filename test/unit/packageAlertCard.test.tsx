/**
 * PackageAlertCard组件测试
 *
 * 测试快递警报卡片组件的显示、数量限制和交互
 * 需求: 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PackageAlertCard from "@/components/PackageAlertCard";
import type { PackageAlert } from "@/types";

// 创建测试用的快递警报数据
const createMockAlert = (
  id: number,
  overrides?: Partial<PackageAlert>,
): PackageAlert => ({
  id,
  device_id: "device_001",
  session_id: `session_${id}`,
  threat_level: "medium",
  action: "taking",
  description: `检测到快递异常行为${id}`,
  photo_path: `/photos/alert_${id}.jpg`,
  photo_thumbnail: `/photos/alert_${id}_thumb.jpg`,
  voice_warning_sent: false,
  notified: false,
  created_at: new Date().toISOString(),
  ts: Date.now() - id * 3600000, // 每个记录相差1小时
  ...overrides,
});

describe("PackageAlertCard组件测试", () => {
  describe("基本渲染", () => {
    it("应显示卡片标题", () => {
      render(<PackageAlertCard alerts={[]} onViewAll={() => {}} />);
      expect(screen.getByText("快递警报")).toBeTruthy();
    });

    it("应包含正确的卡片样式", () => {
      const { container } = render(
        <PackageAlertCard alerts={[]} onViewAll={() => {}} />,
      );

      const card = container.querySelector(".bg-white");
      expect(card).toBeTruthy();
      expect(card?.classList.contains("rounded-2xl")).toBe(true);
      expect(card?.classList.contains("shadow-sm")).toBe(true);
      expect(card?.classList.contains("p-4")).toBe(true);
    });
  });

  describe("空状态显示 (需求 8.4)", () => {
    it("当没有记录时应显示空状态提示", () => {
      render(<PackageAlertCard alerts={[]} onViewAll={() => {}} />);
      expect(screen.getByText("暂无快递警报")).toBeTruthy();
    });

    it("空状态应显示快递图标", () => {
      const { container } = render(
        <PackageAlertCard alerts={[]} onViewAll={() => {}} />,
      );

      // 验证Package图标存在
      const icon = container.querySelector("svg");
      expect(icon).toBeTruthy();
    });

    it("空状态应有正确的样式", () => {
      const { container } = render(
        <PackageAlertCard alerts={[]} onViewAll={() => {}} />,
      );

      const emptyState = screen.getByText("暂无快递警报").parentElement;
      expect(emptyState?.classList.contains("text-center")).toBe(true);
      expect(
        emptyState?.classList.contains("text-secondary-400") ||
          emptyState?.classList.contains("text-secondary-500"),
      ).toBe(true);
    });

    it("当alerts为空数组时应显示空状态", () => {
      render(<PackageAlertCard alerts={[]} onViewAll={() => {}} />);
      expect(screen.getByText("暂无快递警报")).toBeTruthy();
    });

    it("空状态时不应显示查看全部按钮", () => {
      render(<PackageAlertCard alerts={[]} onViewAll={() => {}} />);
      expect(screen.queryByText("查看全部")).toBeNull();
    });
  });

  describe("记录显示 (需求 8.3)", () => {
    it("应显示快递警报记录", () => {
      const alerts = [createMockAlert(1)];
      render(<PackageAlertCard alerts={alerts} onViewAll={() => {}} />);

      expect(screen.getByText("检测到快递异常行为1")).toBeTruthy();
    });

    it("每条记录应包含威胁等级标识", () => {
      const alerts = [
        createMockAlert(1, { threat_level: "low" }),
        createMockAlert(2, { threat_level: "high" }),
      ];
      render(<PackageAlertCard alerts={alerts} onViewAll={() => {}} />);

      expect(screen.getByText("低威胁")).toBeTruthy();
      expect(screen.getByText("高威胁")).toBeTruthy();
    });

    it("每条记录应包含行为类型", () => {
      const alerts = [
        createMockAlert(1, { action: "taking" }),
        createMockAlert(2, { action: "searching" }),
      ];
      render(<PackageAlertCard alerts={alerts} onViewAll={() => {}} />);

      expect(screen.getByText("行为：拿走")).toBeTruthy();
      expect(screen.getByText("行为：翻找")).toBeTruthy();
    });

    it("应正确映射所有行为类型", () => {
      const alerts = [
        createMockAlert(1, { action: "normal" }),
        createMockAlert(2, { action: "passing" }),
        createMockAlert(3, { action: "searching" }),
        createMockAlert(4, { action: "taking" }),
        createMockAlert(5, { action: "damaging" }),
      ];
      render(<PackageAlertCard alerts={alerts} onViewAll={() => {}} />);

      expect(screen.getByText("行为：正常")).toBeTruthy();
      expect(screen.getByText("行为：路过")).toBeTruthy();
      expect(screen.getByText("行为：翻找")).toBeTruthy();
      expect(screen.getByText("行为：拿走")).toBeTruthy();
      expect(screen.getByText("行为：破坏")).toBeTruthy();
    });

    it("每条记录应包含行为描述", () => {
      const alerts = [
        createMockAlert(1, {
          description: "检测到非主人拿走快递",
        }),
      ];
      render(<PackageAlertCard alerts={alerts} onViewAll={() => {}} />);

      expect(screen.getByText("检测到非主人拿走快递")).toBeTruthy();
    });

    it("每条记录应包含时间戳", () => {
      const alerts = [createMockAlert(1)];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      // 验证时钟图标存在
      const clockIcons = container.querySelectorAll("svg");
      expect(clockIcons.length).toBeGreaterThan(0);

      // 验证相对时间文本存在
      const timeText = container.querySelector(".text-xs.text-secondary-500");
      expect(timeText).toBeTruthy();
    });

    it("应显示缩略图（如果有）", () => {
      const alerts = [
        createMockAlert(1, {
          photo_thumbnail: "/photos/alert_1_thumb.jpg",
        }),
      ];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      const thumbnail = container.querySelector("img");
      expect(thumbnail).toBeTruthy();
      expect(thumbnail?.getAttribute("src")).toBe("/photos/alert_1_thumb.jpg");
      expect(thumbnail?.getAttribute("alt")).toBe("警报照片");
    });

    it("当没有缩略图时不应显示图片", () => {
      const alerts = [
        createMockAlert(1, {
          photo_thumbnail: undefined,
        }),
      ];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      const thumbnail = container.querySelector("img");
      expect(thumbnail).toBeNull();
    });
  });

  describe("数量限制 (需求 8.2)", () => {
    it("应最多显示5条记录", () => {
      const alerts = Array.from({ length: 10 }, (_, i) =>
        createMockAlert(i + 1),
      );
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      // 统计渲染的记录卡片数量
      const recordCards = container.querySelectorAll(
        ".border.border-secondary-200.rounded-xl",
      );
      expect(recordCards).toHaveLength(5);
    });

    it("当有3条记录时应显示3条", () => {
      const alerts = Array.from({ length: 3 }, (_, i) =>
        createMockAlert(i + 1),
      );
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      const recordCards = container.querySelectorAll(
        ".border.border-secondary-200.rounded-xl",
      );
      expect(recordCards).toHaveLength(3);
    });

    it("应显示最近的5条记录（按传入顺序）", () => {
      const alerts = Array.from({ length: 10 }, (_, i) =>
        createMockAlert(i + 1, { description: `警报${i + 1}` }),
      );
      render(<PackageAlertCard alerts={alerts} onViewAll={() => {}} />);

      // 验证显示的是前5条
      expect(screen.getByText("警报1")).toBeTruthy();
      expect(screen.getByText("警报2")).toBeTruthy();
      expect(screen.getByText("警报3")).toBeTruthy();
      expect(screen.getByText("警报4")).toBeTruthy();
      expect(screen.getByText("警报5")).toBeTruthy();

      // 验证第6条及以后不显示
      expect(screen.queryByText("警报6")).toBeNull();
      expect(screen.queryByText("警报10")).toBeNull();
    });

    it("当有1条记录时应显示1条", () => {
      const alerts = [createMockAlert(1)];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      const recordCards = container.querySelectorAll(
        ".border.border-secondary-200.rounded-xl",
      );
      expect(recordCards).toHaveLength(1);
    });
  });

  describe("查看全部按钮 (需求 8.5)", () => {
    it("当有记录时应显示查看全部按钮", () => {
      const alerts = [createMockAlert(1)];
      render(<PackageAlertCard alerts={alerts} onViewAll={() => {}} />);

      expect(screen.getByText("查看全部")).toBeTruthy();
    });

    it("点击查看全部按钮应调用onViewAll回调", () => {
      const alerts = [createMockAlert(1)];
      const onViewAll = vi.fn();

      render(<PackageAlertCard alerts={alerts} onViewAll={onViewAll} />);

      const viewAllButton = screen.getByText("查看全部");
      fireEvent.click(viewAllButton);

      expect(onViewAll).toHaveBeenCalledTimes(1);
    });

    it("查看全部按钮应有正确的样式", () => {
      const alerts = [createMockAlert(1)];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      const button = screen.getByText("查看全部").parentElement;
      expect(button?.classList.contains("w-full")).toBe(true);
      expect(button?.classList.contains("text-primary-600")).toBe(true);
      expect(button?.classList.contains("hover:text-primary-700")).toBe(true);
    });

    it("查看全部按钮应包含箭头图标", () => {
      const alerts = [createMockAlert(1)];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      const button = screen.getByText("查看全部").parentElement;
      const icon = button?.querySelector("svg");
      expect(icon).toBeTruthy();
    });
  });

  describe("相对时间格式化", () => {
    it("应显示刚刚（小于1分钟）", () => {
      const alerts = [
        createMockAlert(1, {
          ts: Date.now() - 30000, // 30秒前
        }),
      ];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      expect(container.textContent).toContain("刚刚");
    });

    it("应显示X分钟前", () => {
      const alerts = [
        createMockAlert(1, {
          ts: Date.now() - 5 * 60 * 1000, // 5分钟前
        }),
      ];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      expect(container.textContent).toContain("分钟前");
    });

    it("应显示X小时前", () => {
      const alerts = [
        createMockAlert(1, {
          ts: Date.now() - 2 * 3600 * 1000, // 2小时前
        }),
      ];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      expect(container.textContent).toContain("小时前");
    });

    it("应显示X天前", () => {
      const alerts = [
        createMockAlert(1, {
          ts: Date.now() - 3 * 24 * 3600 * 1000, // 3天前
        }),
      ];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      expect(container.textContent).toContain("天前");
    });
  });

  describe("不同威胁等级显示", () => {
    it("应正确显示所有威胁等级", () => {
      const alerts = [
        createMockAlert(1, { threat_level: "low" }),
        createMockAlert(2, { threat_level: "medium" }),
        createMockAlert(3, { threat_level: "high" }),
      ];
      render(<PackageAlertCard alerts={alerts} onViewAll={() => {}} />);

      expect(screen.getByText("低威胁")).toBeTruthy();
      expect(screen.getByText("中威胁")).toBeTruthy();
      expect(screen.getByText("高威胁")).toBeTruthy();
    });
  });

  describe("布局和样式", () => {
    it("记录列表应有正确的间距", () => {
      const alerts = [createMockAlert(1), createMockAlert(2)];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      const listContainer = container.querySelector(".space-y-3");
      expect(listContainer).toBeTruthy();
    });

    it("行为描述应支持多行显示（line-clamp-2）", () => {
      const alerts = [
        createMockAlert(1, {
          description: "这是一个很长的描述文本".repeat(10),
        }),
      ];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      const description = container.querySelector(".line-clamp-2");
      expect(description).toBeTruthy();
    });

    it("记录卡片应有hover效果", () => {
      const alerts = [createMockAlert(1)];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      const recordCard = container.querySelector(
        ".border.border-secondary-200.rounded-xl",
      );
      expect(recordCard?.classList.contains("hover:bg-secondary-50")).toBe(
        true,
      );
    });

    it("缩略图应有正确的样式", () => {
      const alerts = [
        createMockAlert(1, {
          photo_thumbnail: "/photos/alert_1_thumb.jpg",
        }),
      ];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      const thumbnail = container.querySelector("img");
      expect(thumbnail?.classList.contains("w-full")).toBe(true);
      expect(thumbnail?.classList.contains("h-32")).toBe(true);
      expect(thumbnail?.classList.contains("object-cover")).toBe(true);
      expect(thumbnail?.classList.contains("rounded-lg")).toBe(true);
    });
  });

  describe("边界情况", () => {
    it("应处理空的description", () => {
      const alerts = [createMockAlert(1, { description: "" })];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      // 应该能正常渲染，不会崩溃
      expect(
        container.querySelector(".border.border-secondary-200"),
      ).toBeTruthy();
    });

    it("应处理未知的action类型", () => {
      const alerts = [createMockAlert(1, { action: "unknown" as any })];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      // 应该显示原始action值
      expect(container.textContent).toContain("unknown");
    });

    it("应处理未来的时间戳", () => {
      const alerts = [
        createMockAlert(1, {
          ts: Date.now() + 3600000, // 1小时后
        }),
      ];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      // 应该显示"刚刚"或不崩溃
      expect(
        container.querySelector(".border.border-secondary-200"),
      ).toBeTruthy();
    });

    it("应处理空的photo_path", () => {
      const alerts = [
        createMockAlert(1, {
          photo_path: "",
          photo_thumbnail: undefined,
        }),
      ];
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      // 应该能正常渲染，不显示图片
      expect(container.querySelector("img")).toBeNull();
    });
  });

  describe("组件可复用性", () => {
    it("应支持同时渲染多个PackageAlertCard", () => {
      const alerts1 = [createMockAlert(1)];
      const alerts2 = [createMockAlert(2)];

      const { container } = render(
        <>
          <PackageAlertCard alerts={alerts1} onViewAll={() => {}} />
          <PackageAlertCard alerts={alerts2} onViewAll={() => {}} />
        </>,
      );

      const cards = container.querySelectorAll(".bg-white.rounded-2xl");
      expect(cards).toHaveLength(2);
    });

    it("应支持动态更新alerts数据", () => {
      const { rerender } = render(
        <PackageAlertCard alerts={[]} onViewAll={() => {}} />,
      );

      expect(screen.getByText("暂无快递警报")).toBeTruthy();

      const alerts = [createMockAlert(1)];
      rerender(<PackageAlertCard alerts={alerts} onViewAll={() => {}} />);

      expect(screen.queryByText("暂无快递警报")).toBeNull();
      expect(screen.getByText("检测到快递异常行为1")).toBeTruthy();
    });
  });

  describe("交互体验", () => {
    it("多次点击查看全部按钮应多次调用回调", () => {
      const alerts = [createMockAlert(1)];
      const onViewAll = vi.fn();

      render(<PackageAlertCard alerts={alerts} onViewAll={onViewAll} />);

      const viewAllButton = screen.getByText("查看全部");
      fireEvent.click(viewAllButton);
      fireEvent.click(viewAllButton);
      fireEvent.click(viewAllButton);

      expect(onViewAll).toHaveBeenCalledTimes(3);
    });

    it("应正确处理大量记录的性能", () => {
      const alerts = Array.from({ length: 100 }, (_, i) =>
        createMockAlert(i + 1),
      );
      const { container } = render(
        <PackageAlertCard alerts={alerts} onViewAll={() => {}} />,
      );

      // 应该只渲染5条，不会渲染全部100条
      const recordCards = container.querySelectorAll(
        ".border.border-secondary-200.rounded-xl",
      );
      expect(recordCards).toHaveLength(5);
    });
  });
});
