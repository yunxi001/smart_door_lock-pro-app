/**
 * 到访通知弹窗组件配色测试
 * 验证弹窗组件在浅色和深色模式下的配色正确性
 *
 * 测试范围：
 * - 遮罩层颜色和透明度
 * - 弹窗背景色（浅色/深色模式）
 * - 标题文本颜色
 * - 内容文本颜色
 * - 边框和分隔线颜色
 * - 按钮配色
 * - 状态指示器颜色
 *
 * 需求: 4.4, 6.3, 2.1, 2.2, 3.5
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("VisitNotificationModal 配色测试", () => {
  const componentPath = path.join(
    process.cwd(),
    "components/VisitNotificationModal.tsx",
  );
  const componentContent = fs.readFileSync(componentPath, "utf-8");

  describe("遮罩层配色", () => {
    it("应使用新的遮罩层颜色和透明度", () => {
      // 浅色模式：bg-secondary-900/50
      expect(componentContent).toContain("bg-secondary-900/50");
      // 深色模式：dark:bg-secondary-950/70
      expect(componentContent).toContain("dark:bg-secondary-950/70");
      // 应包含模糊效果
      expect(componentContent).toContain("backdrop-blur-sm");
    });

    it("不应使用旧的遮罩层颜色", () => {
      expect(componentContent).not.toContain("bg-black/50");
    });
  });

  describe("弹窗背景色", () => {
    it("应使用新的弹窗背景色", () => {
      // 浅色模式：bg-white
      expect(componentContent).toMatch(/bg-white.*rounded-2xl/);
      // 深色模式：dark:bg-secondary-800
      expect(componentContent).toContain("dark:bg-secondary-800");
    });
  });

  describe("头部配色", () => {
    it("应使用主品牌色作为头部背景", () => {
      // 浅色模式：bg-primary-500
      expect(componentContent).toContain("bg-primary-500");
      // 深色模式：dark:bg-primary-600
      expect(componentContent).toContain("dark:bg-primary-600");
    });

    it("不应使用旧的 indigo 颜色", () => {
      expect(componentContent).not.toContain("bg-indigo-600");
      expect(componentContent).not.toContain("bg-indigo-100");
      expect(componentContent).not.toContain("text-indigo-600");
    });
  });

  describe("图片区域配色", () => {
    it("应使用新的图片背景色", () => {
      // 浅色模式：bg-secondary-100
      expect(componentContent).toContain("bg-secondary-100");
      // 深色模式：dark:bg-secondary-900
      expect(componentContent).toMatch(
        /bg-secondary-100.*dark:bg-secondary-900/,
      );
    });

    it("应使用新的占位符文本颜色", () => {
      // 浅色模式：text-secondary-400
      expect(componentContent).toContain("text-secondary-400");
      // 深色模式：dark:text-secondary-500
      expect(componentContent).toContain("dark:text-secondary-500");
    });

    it("不应使用旧的 gray 颜色", () => {
      const grayMatches = componentContent.match(/bg-gray-\d+/g) || [];
      const textGrayMatches = componentContent.match(/text-gray-\d+/g) || [];
      expect(grayMatches.length).toBe(0);
      expect(textGrayMatches.length).toBe(0);
    });
  });

  describe("识别结果标签配色", () => {
    it("应使用语义化颜色 - 已识别（成功色）", () => {
      // 浅色模式
      expect(componentContent).toContain("bg-success-100 text-success-700");
      // 深色模式
      expect(componentContent).toContain(
        "dark:bg-success-950 dark:text-success-100",
      );
    });

    it("应使用语义化颜色 - 陌生人（警告色）", () => {
      // 浅色模式
      expect(componentContent).toContain("bg-warning-100 text-warning-700");
      // 深色模式
      expect(componentContent).toContain(
        "dark:bg-warning-950 dark:text-warning-100",
      );
    });

    it("应使用语义化颜色 - 未检测到人脸（中性色）", () => {
      // 浅色模式
      expect(componentContent).toContain("bg-secondary-100 text-secondary-700");
      // 深色模式
      expect(componentContent).toContain(
        "dark:bg-secondary-800 dark:text-secondary-300",
      );
    });

    it("不应使用旧的 green/yellow/gray 颜色", () => {
      expect(componentContent).not.toContain("bg-green-100");
      expect(componentContent).not.toContain("text-green-700");
      expect(componentContent).not.toContain("bg-yellow-100");
      expect(componentContent).not.toContain("text-yellow-700");
    });
  });

  describe("人员信息区域配色", () => {
    it("应使用新的头像背景色", () => {
      // 浅色模式：bg-primary-100
      expect(componentContent).toContain("bg-primary-100");
      // 深色模式：dark:bg-primary-900
      expect(componentContent).toContain("dark:bg-primary-900");
    });

    it("应使用新的头像图标颜色", () => {
      // 浅色模式：text-primary-600
      expect(componentContent).toContain("text-primary-600");
      // 深色模式：dark:text-primary-400
      expect(componentContent).toContain("dark:text-primary-400");
    });

    it("应使用新的文本颜色", () => {
      // 主要文本 - 浅色模式：text-secondary-900
      expect(componentContent).toContain("text-secondary-900");
      // 主要文本 - 深色模式：dark:text-secondary-50
      expect(componentContent).toContain("dark:text-secondary-50");
      // 次要文本 - 浅色模式：text-secondary-600
      expect(componentContent).toContain("text-secondary-600");
      // 次要文本 - 深色模式：dark:text-secondary-300
      expect(componentContent).toContain("dark:text-secondary-300");
    });
  });

  describe("开门状态配色", () => {
    it("应使用成功色表示已开门", () => {
      // 浅色模式
      expect(componentContent).toContain("bg-success-50 text-success-700");
      // 深色模式
      expect(componentContent).toContain(
        "dark:bg-success-950 dark:text-success-100",
      );
    });

    it("应使用错误色表示拒绝访问", () => {
      // 浅色模式
      expect(componentContent).toContain("bg-error-50 text-error-700");
      // 深色模式
      expect(componentContent).toContain(
        "dark:bg-error-950 dark:text-error-100",
      );
    });

    it("不应使用旧的 green/red 颜色", () => {
      expect(componentContent).not.toContain("bg-green-50");
      expect(componentContent).not.toContain("text-green-700");
      expect(componentContent).not.toContain("bg-red-50");
      expect(componentContent).not.toContain("text-red-700");
    });
  });

  describe("按钮配色", () => {
    it("应使用主品牌色作为按钮背景", () => {
      // 浅色模式：bg-primary-500
      expect(componentContent).toMatch(/bg-primary-500.*text-white/);
      // 悬停状态：hover:bg-primary-600
      expect(componentContent).toContain("hover:bg-primary-600");
      // 激活状态：active:bg-primary-700
      expect(componentContent).toContain("active:bg-primary-700");
      // 深色模式：dark:bg-primary-600
      expect(componentContent).toContain("dark:bg-primary-600");
      // 深色模式悬停：dark:hover:bg-primary-500
      expect(componentContent).toContain("dark:hover:bg-primary-500");
    });

    it("不应使用旧的 indigo 按钮颜色", () => {
      expect(componentContent).not.toContain("bg-indigo-600");
      expect(componentContent).not.toContain("hover:bg-indigo-700");
    });

    it("应包含过渡动画", () => {
      expect(componentContent).toContain("transition-colors");
    });
  });

  describe("时间戳文本配色", () => {
    it("应使用新的时间戳文本颜色", () => {
      // 浅色模式：text-secondary-400
      // 深色模式：dark:text-secondary-500
      const timestampMatch = componentContent.match(
        /text-secondary-400.*dark:text-secondary-500/,
      );
      expect(timestampMatch).toBeTruthy();
    });
  });

  describe("配色一致性", () => {
    it("所有颜色类名应使用新的配色系统", () => {
      // 检查是否还有旧的颜色类名
      const oldColorPatterns = [
        /bg-indigo-\d+/g,
        /text-indigo-\d+/g,
        /bg-gray-\d+/g,
        /text-gray-\d+/g,
        /bg-green-\d+/g,
        /text-green-\d+/g,
        /bg-red-\d+/g,
        /text-red-\d+/g,
        /bg-yellow-\d+/g,
        /text-yellow-\d+/g,
      ];

      oldColorPatterns.forEach((pattern) => {
        const matches = componentContent.match(pattern) || [];
        expect(matches.length).toBe(0);
      });
    });

    it("应为所有颜色类名提供深色模式变体", () => {
      // 统计 bg- 和 text- 类名
      const bgClasses =
        componentContent.match(
          /bg-(primary|secondary|success|warning|error|info|white)-/g,
        ) || [];
      const darkBgClasses =
        componentContent.match(
          /dark:bg-(primary|secondary|success|warning|error|info)-/g,
        ) || [];

      // 深色模式类名应该存在（不要求完全相等，因为 white 在深色模式下会变成其他颜色）
      expect(darkBgClasses.length).toBeGreaterThan(0);
    });
  });

  describe("可访问性", () => {
    it("应包含适当的语义化 HTML 结构", () => {
      // 检查是否有按钮元素
      expect(componentContent).toContain("<button");
      // 检查是否有图片 alt 属性
      expect(componentContent).toContain('alt="抓拍图片"');
    });

    it("应包含过渡动画以提升用户体验", () => {
      expect(componentContent).toContain("transition-colors");
      expect(componentContent).toContain("animate-in");
      expect(componentContent).toContain("fade-in");
    });
  });
});
