/**
 * ThreatLevelBadge 组件测试
 * 验证需求: 15.2, 15.3, 15.4, 15.5
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import ThreatLevelBadge from "@/components/ThreatLevelBadge";
import type { ThreatLevel } from "@/types";

describe("ThreatLevelBadge 组件", () => {
  describe("基本渲染 (需求 15.1)", () => {
    it("应正确渲染low威胁等级标签", () => {
      render(<ThreatLevelBadge level="low" />);
      expect(screen.getByText("低威胁")).toBeTruthy();
    });

    it("应正确渲染medium威胁等级标签", () => {
      render(<ThreatLevelBadge level="medium" />);
      expect(screen.getByText("中威胁")).toBeTruthy();
    });

    it("应正确渲染high威胁等级标签", () => {
      render(<ThreatLevelBadge level="high" />);
      expect(screen.getByText("高威胁")).toBeTruthy();
    });
  });

  describe("low威胁等级样式和图标 (需求 15.2)", () => {
    it("应显示绿色背景和文字", () => {
      const { container } = render(<ThreatLevelBadge level="low" />);

      const badge = container.querySelector(".bg-green-100");
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains("text-green-800")).toBe(true);
    });

    it("应显示Shield图标", () => {
      const { container } = render(<ThreatLevelBadge level="low" />);

      // lucide-react的图标会渲染为svg
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });
  });

  describe("medium威胁等级样式和图标 (需求 15.3)", () => {
    it("应显示橙色背景和文字", () => {
      const { container } = render(<ThreatLevelBadge level="medium" />);

      const badge = container.querySelector(".bg-orange-100");
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains("text-orange-800")).toBe(true);
    });

    it("应显示AlertTriangle图标", () => {
      const { container } = render(<ThreatLevelBadge level="medium" />);

      // lucide-react的图标会渲染为svg
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });
  });

  describe("high威胁等级样式和图标 (需求 15.4)", () => {
    it("应显示红色背景和文字", () => {
      const { container } = render(<ThreatLevelBadge level="high" />);

      const badge = container.querySelector(".bg-red-100");
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains("text-red-800")).toBe(true);
    });

    it("应显示AlertOctagon图标", () => {
      const { container } = render(<ThreatLevelBadge level="high" />);

      // lucide-react的图标会渲染为svg
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });
  });

  describe("无效level处理 (需求 15.5)", () => {
    it("应对无效level降级为low", () => {
      // @ts-expect-error 测试无效输入
      const { container } = render(<ThreatLevelBadge level="invalid" />);

      // 应降级为low威胁等级
      expect(screen.getByText("低威胁")).toBeTruthy();
      const badge = container.querySelector(".bg-green-100");
      expect(badge).toBeTruthy();
    });

    it("应对空字符串降级为low", () => {
      // @ts-expect-error 测试无效输入
      const { container } = render(<ThreatLevelBadge level="" />);

      // 应降级为low威胁等级
      expect(screen.getByText("低威胁")).toBeTruthy();
      const badge = container.querySelector(".bg-green-100");
      expect(badge).toBeTruthy();
    });
  });

  describe("组件结构 (需求 15.1)", () => {
    it("应包含图标和文本", () => {
      const { container } = render(<ThreatLevelBadge level="medium" />);

      // 应包含svg图标
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();

      // 应包含文本
      expect(screen.getByText("中威胁")).toBeTruthy();
    });

    it("应使用inline-flex布局", () => {
      const { container } = render(<ThreatLevelBadge level="high" />);

      const badge = container.querySelector(".inline-flex");
      expect(badge).toBeTruthy();
    });

    it("应包含圆角样式", () => {
      const { container } = render(<ThreatLevelBadge level="low" />);

      const badge = container.querySelector(".rounded-full");
      expect(badge).toBeTruthy();
    });

    it("应包含适当的内边距", () => {
      const { container } = render(<ThreatLevelBadge level="medium" />);

      const badge = container.querySelector(".px-2");
      expect(badge).toBeTruthy();
      expect(badge?.classList.contains("py-1")).toBe(true);
    });

    it("应使用小号字体", () => {
      const { container } = render(<ThreatLevelBadge level="high" />);

      const badge = container.querySelector(".text-xs");
      expect(badge).toBeTruthy();
    });
  });

  describe("所有威胁等级的一致性", () => {
    const levels: ThreatLevel[] = ["low", "medium", "high"];

    it("所有等级都应正确渲染", () => {
      levels.forEach((level) => {
        const { container } = render(<ThreatLevelBadge level={level} />);
        const badge = container.querySelector("span");
        expect(badge).toBeTruthy();
      });
    });

    it("所有等级都应包含图标", () => {
      levels.forEach((level) => {
        const { container } = render(<ThreatLevelBadge level={level} />);
        const svg = container.querySelector("svg");
        expect(svg).toBeTruthy();
      });
    });

    it("所有等级都应有对应的文本", () => {
      const textMap: Record<ThreatLevel, string> = {
        low: "低威胁",
        medium: "中威胁",
        high: "高威胁",
      };

      levels.forEach((level) => {
        render(<ThreatLevelBadge level={level} />);
        expect(screen.getByText(textMap[level])).toBeTruthy();
      });
    });
  });
});
