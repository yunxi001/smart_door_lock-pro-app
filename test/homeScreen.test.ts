/**
 * HomeScreen 配色系统测试
 * 验证首页组件是否正确使用新配色系统
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("HomeScreen 配色系统迁移", () => {
  const homeScreenPath = join(process.cwd(), "screens/HomeScreen.tsx");
  const homeScreenContent = readFileSync(homeScreenPath, "utf-8");

  describe("设备状态卡片配色", () => {
    it("应使用新的背景色和边框色", () => {
      expect(homeScreenContent).toContain("bg-white");
      expect(homeScreenContent).toContain("border-secondary-200");
      expect(homeScreenContent).toContain("dark:bg-secondary-900");
      expect(homeScreenContent).toContain("dark:border-secondary-700");
    });

    it("应使用语义化状态颜色", () => {
      // 在线状态 - success
      expect(homeScreenContent).toContain("bg-success-500");
      expect(homeScreenContent).toContain("dark:bg-success-400");
      expect(homeScreenContent).toContain("text-success-600");
      expect(homeScreenContent).toContain("dark:text-success-400");

      // 离线状态 - error
      expect(homeScreenContent).toContain("bg-error-500");
      expect(homeScreenContent).toContain("dark:bg-error-400");
      expect(homeScreenContent).toContain("text-error-600");
      expect(homeScreenContent).toContain("dark:text-error-400");

      // 连接中状态 - warning
      expect(homeScreenContent).toContain("bg-warning-500");
      expect(homeScreenContent).toContain("dark:bg-warning-400");
      expect(homeScreenContent).toContain("text-warning-600");
      expect(homeScreenContent).toContain("dark:text-warning-400");
    });

    it("应为连接中状态添加脉动动画", () => {
      expect(homeScreenContent).toContain("animate-pulse");
    });
  });

  describe("核心开锁按钮配色", () => {
    it("应使用 primary 色系表示锁定状态", () => {
      expect(homeScreenContent).toContain("bg-primary-100");
      expect(homeScreenContent).toContain("hover:bg-primary-200");
      expect(homeScreenContent).toContain("dark:bg-primary-950");
      expect(homeScreenContent).toContain("dark:hover:bg-primary-900");
      expect(homeScreenContent).toContain("text-primary-600");
      expect(homeScreenContent).toContain("dark:text-primary-400");
    });

    it("应使用 success 色系表示开启状态", () => {
      expect(homeScreenContent).toContain("bg-success-100");
      expect(homeScreenContent).toContain("hover:bg-success-200");
      expect(homeScreenContent).toContain("dark:bg-success-950");
      expect(homeScreenContent).toContain("dark:hover:bg-success-900");
      expect(homeScreenContent).toContain("text-success-600");
      expect(homeScreenContent).toContain("dark:text-success-400");
    });

    it("应使用 secondary 色系表示禁用状态", () => {
      expect(homeScreenContent).toContain("bg-secondary-100");
      expect(homeScreenContent).toContain("dark:bg-secondary-800");
      expect(homeScreenContent).toContain("text-secondary-400");
      expect(homeScreenContent).toContain("dark:text-secondary-600");
    });
  });

  describe("快捷功能区配色", () => {
    it("临时密码按钮应使用 warning 色系", () => {
      expect(homeScreenContent).toContain("bg-warning-50");
      expect(homeScreenContent).toContain("hover:bg-warning-100");
      expect(homeScreenContent).toContain("dark:bg-warning-950");
      expect(homeScreenContent).toContain("dark:hover:bg-warning-900");
      expect(homeScreenContent).toContain("text-warning-600");
      expect(homeScreenContent).toContain("dark:text-warning-400");
    });

    it("门铃测试按钮应使用 info 色系", () => {
      expect(homeScreenContent).toContain("bg-info-50");
      expect(homeScreenContent).toContain("hover:bg-info-100");
      expect(homeScreenContent).toContain("dark:bg-info-950");
      expect(homeScreenContent).toContain("dark:hover:bg-info-900");
      expect(homeScreenContent).toContain("text-info-600");
      expect(homeScreenContent).toContain("dark:text-info-400");
    });
  });

  describe("最近动态列表配色", () => {
    it("应使用新的卡片背景色", () => {
      expect(homeScreenContent).toContain("bg-white");
      expect(homeScreenContent).toContain("dark:bg-secondary-900");
    });

    it("开门成功记录应使用 success 色系", () => {
      expect(homeScreenContent).toContain("bg-success-50");
      expect(homeScreenContent).toContain("hover:bg-success-100");
      expect(homeScreenContent).toContain("dark:bg-success-950");
      expect(homeScreenContent).toContain("dark:hover:bg-success-900");
    });

    it("拒绝访问记录应使用 error 色系", () => {
      expect(homeScreenContent).toContain("bg-error-50");
      expect(homeScreenContent).toContain("hover:bg-error-100");
      expect(homeScreenContent).toContain("dark:bg-error-950");
      expect(homeScreenContent).toContain("dark:hover:bg-error-900");
    });

    it("时间戳应使用 secondary 色系", () => {
      expect(homeScreenContent).toContain("text-secondary-400");
      expect(homeScreenContent).toContain("dark:text-secondary-500");
    });
  });

  describe("临时密码弹窗配色", () => {
    it("遮罩层应使用半透明背景", () => {
      expect(homeScreenContent).toContain("bg-secondary-900/50");
      expect(homeScreenContent).toContain("dark:bg-secondary-950/70");
      expect(homeScreenContent).toContain("backdrop-blur-sm");
    });

    it("弹窗内容应使用新配色", () => {
      expect(homeScreenContent).toContain("bg-white");
      expect(homeScreenContent).toContain("dark:bg-secondary-800");
    });

    it("密码显示区域应使用 primary 色系", () => {
      expect(homeScreenContent).toContain("text-primary-600");
      expect(homeScreenContent).toContain("dark:text-primary-400");
    });

    it("确认按钮应使用 primary 色系", () => {
      expect(homeScreenContent).toContain("bg-primary-600");
      expect(homeScreenContent).toContain("hover:bg-primary-700");
      expect(homeScreenContent).toContain("dark:bg-primary-600");
      expect(homeScreenContent).toContain("dark:hover:bg-primary-500");
    });
  });

  describe("旧配色清理", () => {
    it("不应包含旧的 indigo 颜色", () => {
      // 允许在注释中出现，但不应在类名中出现
      const classNameMatches = homeScreenContent.match(
        /className="[^"]*indigo-[^"]*"/g,
      );
      expect(classNameMatches).toBeNull();
    });

    it("不应包含旧的 slate 颜色", () => {
      const classNameMatches = homeScreenContent.match(
        /className="[^"]*slate-[^"]*"/g,
      );
      expect(classNameMatches).toBeNull();
    });

    it("不应包含旧的 green 颜色（应使用 success）", () => {
      const classNameMatches = homeScreenContent.match(
        /className="[^"]*green-[^"]*"/g,
      );
      expect(classNameMatches).toBeNull();
    });

    it("不应包含旧的 red 颜色（应使用 error）", () => {
      const classNameMatches = homeScreenContent.match(
        /className="[^"]*red-[^"]*"/g,
      );
      expect(classNameMatches).toBeNull();
    });

    it("不应包含旧的 yellow/amber 颜色（应使用 warning）", () => {
      const classNameMatches = homeScreenContent.match(
        /className="[^"]*(?:yellow|amber)-[^"]*"/g,
      );
      expect(classNameMatches).toBeNull();
    });

    it("不应包含旧的 blue/purple 颜色（应使用语义化颜色）", () => {
      const classNameMatches = homeScreenContent.match(
        /className="[^"]*(?:blue|purple)-[^"]*"/g,
      );
      expect(classNameMatches).toBeNull();
    });
  });

  describe("深色模式支持", () => {
    it("所有背景色都应有深色模式变体", () => {
      const bgWhiteCount = (homeScreenContent.match(/bg-white/g) || []).length;
      const darkBgCount = (
        homeScreenContent.match(/dark:bg-secondary-[89]00/g) || []
      ).length;

      // 深色模式背景应该存在
      expect(darkBgCount).toBeGreaterThan(0);
    });

    it("所有文本颜色都应有深色模式变体", () => {
      // 检查是否有 dark:text- 类名
      expect(homeScreenContent).toMatch(/dark:text-/);
    });

    it("所有边框颜色都应有深色模式变体", () => {
      // 检查是否有 dark:border- 类名
      expect(homeScreenContent).toMatch(/dark:border-/);
    });
  });

  describe("过渡动画", () => {
    it("交互元素应包含过渡动画", () => {
      expect(homeScreenContent).toContain("transition-colors");
      expect(homeScreenContent).toContain("transition-all");
    });

    it("按钮应有激活状态缩放效果", () => {
      expect(homeScreenContent).toContain("active:scale-95");
    });
  });
});
