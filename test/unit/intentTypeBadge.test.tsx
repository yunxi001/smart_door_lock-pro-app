/**
 * IntentTypeBadge组件测试
 *
 * 测试意图类型标签组件的样式、图标和文本显示
 * 需求: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import IntentTypeBadge from "@/components/IntentTypeBadge";
import type { IntentType } from "@/types";

describe("IntentTypeBadge组件测试", () => {
  describe("基本渲染 (需求 14.1)", () => {
    it("应正确渲染delivery类型标签", () => {
      render(<IntentTypeBadge type="delivery" />);
      expect(screen.getByText("快递配送")).toBeTruthy();
    });

    it("应正确渲染visit类型标签", () => {
      render(<IntentTypeBadge type="visit" />);
      expect(screen.getByText("拜访")).toBeTruthy();
    });

    it("应正确渲染sales类型标签", () => {
      render(<IntentTypeBadge type="sales" />);
      expect(screen.getByText("推销")).toBeTruthy();
    });

    it("应正确渲染maintenance类型标签", () => {
      render(<IntentTypeBadge type="maintenance" />);
      expect(screen.getByText("维修")).toBeTruthy();
    });

    it("应正确渲染other类型标签", () => {
      render(<IntentTypeBadge type="other" />);
      expect(screen.getByText("其他")).toBeTruthy();
    });
  });

  describe("delivery类型样式和图标 (需求 14.2)", () => {
    it("应显示蓝色背景和文字", () => {
      const { container } = render(<IntentTypeBadge type="delivery" />);

      const badge = container.querySelector(".bg-blue-100");
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains("text-blue-800")).toBe(true);
    });

    it("应显示Package图标", () => {
      const { container } = render(<IntentTypeBadge type="delivery" />);

      // lucide-react的图标会渲染为svg
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
      expect(svg?.classList.contains("w-4")).toBe(true);
      expect(svg?.classList.contains("h-4")).toBe(true);
    });
  });

  describe("visit类型样式和图标 (需求 14.3)", () => {
    it("应显示绿色背景和文字", () => {
      const { container } = render(<IntentTypeBadge type="visit" />);

      const badge = container.querySelector(".bg-green-100");
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains("text-green-800")).toBe(true);
    });

    it("应显示Users图标", () => {
      const { container } = render(<IntentTypeBadge type="visit" />);

      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });
  });

  describe("sales类型样式和图标 (需求 14.4)", () => {
    it("应显示橙色背景和文字", () => {
      const { container } = render(<IntentTypeBadge type="sales" />);

      const badge = container.querySelector(".bg-orange-100");
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains("text-orange-800")).toBe(true);
    });

    it("应显示ShoppingBag图标", () => {
      const { container } = render(<IntentTypeBadge type="sales" />);

      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });
  });

  describe("maintenance类型样式和图标 (需求 14.5)", () => {
    it("应显示紫色背景和文字", () => {
      const { container } = render(<IntentTypeBadge type="maintenance" />);

      const badge = container.querySelector(".bg-purple-100");
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains("text-purple-800")).toBe(true);
    });

    it("应显示Wrench图标", () => {
      const { container } = render(<IntentTypeBadge type="maintenance" />);

      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });
  });

  describe("other类型样式和图标 (需求 14.6)", () => {
    it("应显示灰色背景和文字", () => {
      const { container } = render(<IntentTypeBadge type="other" />);

      const badge = container.querySelector(".bg-gray-100");
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains("text-gray-800")).toBe(true);
    });

    it("应显示HelpCircle图标", () => {
      const { container } = render(<IntentTypeBadge type="other" />);

      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });
  });

  describe("样式和布局", () => {
    it("应包含inline-flex布局", () => {
      const { container } = render(<IntentTypeBadge type="delivery" />);

      const badge = container.querySelector(".inline-flex");
      expect(badge).toBeTruthy();
    });

    it("应包含items-center对齐", () => {
      const { container } = render(<IntentTypeBadge type="delivery" />);

      const badge = container.querySelector(".items-center");
      expect(badge).toBeTruthy();
    });

    it("应包含gap-1间距", () => {
      const { container } = render(<IntentTypeBadge type="delivery" />);

      const badge = container.querySelector(".gap-1");
      expect(badge).toBeTruthy();
    });

    it("应包含圆角样式", () => {
      const { container } = render(<IntentTypeBadge type="delivery" />);

      const badge = container.querySelector(".rounded-full");
      expect(badge).toBeTruthy();
    });

    it("应包含padding样式", () => {
      const { container } = render(<IntentTypeBadge type="delivery" />);

      const badge = container.querySelector(".px-2");
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains("py-1")).toBe(true);
    });

    it("应包含文字大小和粗细样式", () => {
      const { container } = render(<IntentTypeBadge type="delivery" />);

      const badge = container.querySelector(".text-xs");
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains("font-medium")).toBe(true);
    });
  });

  describe("所有类型完整性测试", () => {
    const allTypes: IntentType[] = [
      "delivery",
      "visit",
      "sales",
      "maintenance",
      "other",
    ];

    it("应支持所有IntentType类型", () => {
      allTypes.forEach((type) => {
        const { container } = render(<IntentTypeBadge type={type} />);

        // 验证渲染成功
        const badge = container.querySelector("span");
        expect(badge).toBeTruthy();

        // 验证包含图标
        const svg = container.querySelector("svg");
        expect(svg).toBeTruthy();
      });
    });

    it("每种类型应有唯一的背景颜色", () => {
      const colors = allTypes.map((type) => {
        const { container } = render(<IntentTypeBadge type={type} />);
        const badge = container.querySelector("span");

        // 提取背景颜色类名
        const bgClass = Array.from(badge?.classList || []).find((cls) =>
          cls.startsWith("bg-"),
        );
        return bgClass;
      });

      // 验证所有颜色都不同
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(allTypes.length);
    });

    it("每种类型应有对应的中文文本", () => {
      const textMap: Record<IntentType, string> = {
        delivery: "快递配送",
        visit: "拜访",
        sales: "推销",
        maintenance: "维修",
        other: "其他",
      };

      allTypes.forEach((type) => {
        render(<IntentTypeBadge type={type} />);
        expect(screen.getByText(textMap[type])).toBeTruthy();
      });
    });
  });

  describe("组件可复用性", () => {
    it("应支持同时渲染多个不同类型的标签", () => {
      const { container } = render(
        <>
          <IntentTypeBadge type="delivery" />
          <IntentTypeBadge type="visit" />
          <IntentTypeBadge type="sales" />
        </>,
      );

      expect(screen.getByText("快递配送")).toBeTruthy();
      expect(screen.getByText("拜访")).toBeTruthy();
      expect(screen.getByText("推销")).toBeTruthy();

      const badges = container.querySelectorAll("span.inline-flex");
      expect(badges).toHaveLength(3);
    });

    it("应支持同时渲染多个相同类型的标签", () => {
      const { container } = render(
        <>
          <IntentTypeBadge type="delivery" />
          <IntentTypeBadge type="delivery" />
        </>,
      );

      const deliveryTexts = screen.getAllByText("快递配送");
      expect(deliveryTexts).toHaveLength(2);

      const badges = container.querySelectorAll(".bg-blue-100");
      expect(badges).toHaveLength(2);
    });
  });

  describe("TypeScript类型安全", () => {
    it("应只接受有效的IntentType值", () => {
      // 这个测试主要验证TypeScript编译时类型检查
      // 如果传入无效类型，TypeScript会报错
      const validTypes: IntentType[] = [
        "delivery",
        "visit",
        "sales",
        "maintenance",
        "other",
      ];

      validTypes.forEach((type) => {
        const { container } = render(<IntentTypeBadge type={type} />);
        expect(container.querySelector("span")).toBeTruthy();
      });
    });
  });
});
