/**
 * 按钮组件和样式测试
 *
 * 测试按钮组件的各种变体、尺寸和状态
 * 需求: 4.4, 5.4, 6.3
 */

import { describe, it, expect } from "vitest";
import {
  primaryButtonStyles,
  secondaryButtonStyles,
  errorButtonStyles,
  infoButtonStyles,
  buttonSizes,
  iconButtonStyles,
  dashedButtonStyles,
  textButtonStyles,
  getButtonClasses,
} from "../components/buttonStyles";

describe("按钮样式测试", () => {
  describe("基本按钮样式", () => {
    it("主要按钮样式应包含正确的类名", () => {
      expect(primaryButtonStyles).toContain("bg-primary-500");
      expect(primaryButtonStyles).toContain("text-white");
      expect(primaryButtonStyles).toContain("hover:bg-primary-600");
      expect(primaryButtonStyles).toContain("active:bg-primary-700");
      expect(primaryButtonStyles).toContain("dark:bg-primary-600");
      expect(primaryButtonStyles).toContain("dark:hover:bg-primary-500");
    });

    it("次要按钮样式应包含正确的类名", () => {
      expect(secondaryButtonStyles).toContain("bg-secondary-100");
      expect(secondaryButtonStyles).toContain("text-secondary-900");
      expect(secondaryButtonStyles).toContain("hover:bg-secondary-200");
      expect(secondaryButtonStyles).toContain("dark:bg-secondary-800");
      expect(secondaryButtonStyles).toContain("dark:text-secondary-50");
    });

    it("危险按钮样式应包含正确的类名", () => {
      expect(errorButtonStyles).toContain("bg-error-500");
      expect(errorButtonStyles).toContain("text-white");
      expect(errorButtonStyles).toContain("hover:bg-error-600");
      expect(errorButtonStyles).toContain("dark:bg-error-600");
    });

    it("信息按钮样式应包含正确的类名", () => {
      expect(infoButtonStyles).toContain("bg-info-500");
      expect(infoButtonStyles).toContain("text-white");
      expect(infoButtonStyles).toContain("hover:bg-info-600");
      expect(infoButtonStyles).toContain("dark:bg-info-600");
    });
  });

  describe("按钮尺寸", () => {
    it("应定义三种尺寸", () => {
      expect(buttonSizes.sm).toBeDefined();
      expect(buttonSizes.md).toBeDefined();
      expect(buttonSizes.lg).toBeDefined();
    });

    it("小尺寸应包含正确的 padding", () => {
      expect(buttonSizes.sm).toContain("px-3");
      expect(buttonSizes.sm).toContain("py-1.5");
      expect(buttonSizes.sm).toContain("text-sm");
    });

    it("中等尺寸应包含正确的 padding", () => {
      expect(buttonSizes.md).toContain("px-4");
      expect(buttonSizes.md).toContain("py-2");
      expect(buttonSizes.md).toContain("text-base");
    });

    it("大尺寸应包含正确的 padding", () => {
      expect(buttonSizes.lg).toContain("px-6");
      expect(buttonSizes.lg).toContain("py-3");
      expect(buttonSizes.lg).toContain("text-lg");
    });
  });

  describe("图标按钮样式", () => {
    it("应定义四种变体", () => {
      expect(iconButtonStyles.primary).toBeDefined();
      expect(iconButtonStyles.secondary).toBeDefined();
      expect(iconButtonStyles.error).toBeDefined();
      expect(iconButtonStyles.info).toBeDefined();
    });

    it("主要图标按钮应包含正确的类名", () => {
      expect(iconButtonStyles.primary).toContain("text-primary-500");
      expect(iconButtonStyles.primary).toContain("hover:bg-primary-50");
      expect(iconButtonStyles.primary).toContain("rounded-full");
      expect(iconButtonStyles.primary).toContain("dark:text-primary-400");
    });

    it("错误图标按钮应包含正确的类名", () => {
      expect(iconButtonStyles.error).toContain("text-error-500");
      expect(iconButtonStyles.error).toContain("hover:bg-error-50");
      expect(iconButtonStyles.error).toContain("rounded-full");
    });
  });

  describe("虚线边框按钮样式", () => {
    it("应定义两种变体", () => {
      expect(dashedButtonStyles.primary).toBeDefined();
      expect(dashedButtonStyles.secondary).toBeDefined();
    });

    it("主要虚线按钮应包含正确的类名", () => {
      expect(dashedButtonStyles.primary).toContain("bg-primary-50");
      expect(dashedButtonStyles.primary).toContain("text-primary-600");
      expect(dashedButtonStyles.primary).toContain("border-dashed");
      expect(dashedButtonStyles.primary).toContain("border-primary-200");
      expect(dashedButtonStyles.primary).toContain("dark:bg-primary-950");
    });
  });

  describe("文本按钮样式", () => {
    it("应定义三种变体", () => {
      expect(textButtonStyles.primary).toBeDefined();
      expect(textButtonStyles.secondary).toBeDefined();
      expect(textButtonStyles.error).toBeDefined();
    });

    it("主要文本按钮应包含正确的类名", () => {
      expect(textButtonStyles.primary).toContain("text-primary-600");
      expect(textButtonStyles.primary).toContain("hover:text-primary-700");
      expect(textButtonStyles.primary).toContain("dark:text-primary-400");
    });
  });

  describe("getButtonClasses 辅助函数", () => {
    it("应正确组合主要按钮样式", () => {
      const classes = getButtonClasses("primary", "md", false);
      expect(classes).toContain("bg-primary-500");
      expect(classes).toContain("px-4");
      expect(classes).toContain("py-2");
    });

    it("应正确添加全宽类名", () => {
      const classes = getButtonClasses("primary", "md", true);
      expect(classes).toContain("w-full");
    });

    it("应正确组合次要按钮样式", () => {
      const classes = getButtonClasses("secondary", "sm", false);
      expect(classes).toContain("bg-secondary-100");
      expect(classes).toContain("px-3");
      expect(classes).toContain("py-1.5");
    });

    it("应正确组合危险按钮样式", () => {
      const classes = getButtonClasses("error", "lg", false);
      expect(classes).toContain("bg-error-500");
      expect(classes).toContain("px-6");
      expect(classes).toContain("py-3");
    });

    it("应正确添加额外的类名", () => {
      const classes = getButtonClasses("primary", "md", false, "custom-class");
      expect(classes).toContain("custom-class");
    });
  });

  describe("状态样式", () => {
    it("所有按钮样式应包含悬停状态", () => {
      expect(primaryButtonStyles).toContain("hover:");
      expect(secondaryButtonStyles).toContain("hover:");
      expect(errorButtonStyles).toContain("hover:");
      expect(infoButtonStyles).toContain("hover:");
    });

    it("所有按钮样式应包含激活状态", () => {
      expect(primaryButtonStyles).toContain("active:");
      expect(secondaryButtonStyles).toContain("active:");
      expect(errorButtonStyles).toContain("active:");
      expect(infoButtonStyles).toContain("active:");
    });

    it("所有按钮样式应包含禁用状态", () => {
      expect(primaryButtonStyles).toContain("disabled:");
      expect(secondaryButtonStyles).toContain("disabled:");
      expect(errorButtonStyles).toContain("disabled:");
      expect(infoButtonStyles).toContain("disabled:");
    });

    it("所有按钮样式应包含过渡动画", () => {
      expect(primaryButtonStyles).toContain("transition-colors");
      expect(secondaryButtonStyles).toContain("transition-colors");
      expect(errorButtonStyles).toContain("transition-colors");
      expect(infoButtonStyles).toContain("transition-colors");
    });
  });

  describe("深色模式支持", () => {
    it("所有按钮样式应包含深色模式类名", () => {
      expect(primaryButtonStyles).toContain("dark:");
      expect(secondaryButtonStyles).toContain("dark:");
      expect(errorButtonStyles).toContain("dark:");
      expect(infoButtonStyles).toContain("dark:");
    });

    it("图标按钮应包含深色模式类名", () => {
      expect(iconButtonStyles.primary).toContain("dark:");
      expect(iconButtonStyles.secondary).toContain("dark:");
      expect(iconButtonStyles.error).toContain("dark:");
      expect(iconButtonStyles.info).toContain("dark:");
    });

    it("虚线按钮应包含深色模式类名", () => {
      expect(dashedButtonStyles.primary).toContain("dark:");
      expect(dashedButtonStyles.secondary).toContain("dark:");
    });
  });

  describe("可访问性", () => {
    it("所有按钮样式应包含焦点环", () => {
      expect(primaryButtonStyles).toContain("focus:ring");
      expect(secondaryButtonStyles).toContain("focus:ring");
      expect(errorButtonStyles).toContain("focus:ring");
      expect(infoButtonStyles).toContain("focus:ring");
    });

    it("所有按钮样式应包含圆角", () => {
      expect(primaryButtonStyles).toContain("rounded");
      expect(secondaryButtonStyles).toContain("rounded");
      expect(errorButtonStyles).toContain("rounded");
      expect(infoButtonStyles).toContain("rounded");
    });

    it("禁用按钮应包含 cursor-not-allowed", () => {
      expect(primaryButtonStyles).toContain("disabled:cursor-not-allowed");
      expect(secondaryButtonStyles).toContain("disabled:cursor-not-allowed");
      expect(errorButtonStyles).toContain("disabled:cursor-not-allowed");
      expect(infoButtonStyles).toContain("disabled:cursor-not-allowed");
    });
  });
});
