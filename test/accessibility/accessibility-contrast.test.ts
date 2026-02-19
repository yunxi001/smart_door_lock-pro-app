import { describe, it, expect } from "vitest";
import Color from "color";

/**
 * 可访问性测试 - 对比度验证
 * 验证所有文本与背景的对比度符合 WCAG 2.1 AA 标准
 *
 * WCAG 2.1 AA 标准要求：
 * - 正常文本（16px 及以上）：对比度 ≥ 4.5:1
 * - 大文本（18px 粗体或 24px 及以上）：对比度 ≥ 3:1
 * - 交互元素：对比度 ≥ 3:1
 */

// 从 index.html 中提取的颜色定义
const colors = {
  primary: {
    50: "#f0f4f8",
    100: "#d9e2ec",
    200: "#bcccdc",
    300: "#9fb3c8",
    400: "#829ab1",
    500: "#627d98",
    600: "#486581",
    700: "#334e68",
    800: "#243b53",
    900: "#102a43",
    950: "#0a1929",
  },
  secondary: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
  success: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
    950: "#052e16",
  },
  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },
  error: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a",
  },
  info: {
    50: "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4",
    600: "#0891b2",
    700: "#0e7490",
    800: "#155e75",
    900: "#164e63",
    950: "#083344",
  },
};

// 辅助函数：计算对比度
function getContrastRatio(foreground: string, background: string): number {
  const fg = Color(foreground);
  const bg = Color(background);
  return fg.contrast(bg);
}

// 辅助函数：格式化对比度结果
function formatContrastResult(
  fg: string,
  bg: string,
  ratio: number,
  required: number,
): string {
  const pass = ratio >= required ? "✓" : "✗";
  return `${pass} ${fg} on ${bg}: ${ratio.toFixed(2)}:1 (需要 ${required}:1)`;
}

describe("可访问性测试 - 对比度验证", () => {
  describe("11.1.1 浅色模式 - 正常文本对比度（≥ 4.5:1）", () => {
    it("主要文本 (secondary-900) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.secondary[900], "#ffffff");
      expect(
        ratio,
        formatContrastResult("secondary-900", "white", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("主要文本 (secondary-900) 在 secondary-50 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[900],
        colors.secondary[50],
      );
      expect(
        ratio,
        formatContrastResult("secondary-900", "secondary-50", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("次要文本 (secondary-600) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.secondary[600], "#ffffff");
      expect(
        ratio,
        formatContrastResult("secondary-600", "white", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("次要文本 (secondary-600) 在 secondary-50 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[600],
        colors.secondary[50],
      );
      expect(
        ratio,
        formatContrastResult("secondary-600", "secondary-50", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("成功文本 (success-900) 在 success-50 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.success[900], colors.success[50]);
      expect(
        ratio,
        formatContrastResult("success-900", "success-50", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("警告文本 (warning-900) 在 warning-50 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.warning[900], colors.warning[50]);
      expect(
        ratio,
        formatContrastResult("warning-900", "warning-50", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("错误文本 (error-900) 在 error-50 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.error[900], colors.error[50]);
      expect(
        ratio,
        formatContrastResult("error-900", "error-50", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("11.1.2 深色模式 - 正常文本对比度（≥ 4.5:1）", () => {
    it("主要文本 (secondary-50) 在 secondary-950 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[50],
        colors.secondary[950],
      );
      expect(
        ratio,
        formatContrastResult("secondary-50", "secondary-950", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("主要文本 (secondary-50) 在 secondary-900 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[50],
        colors.secondary[900],
      );
      expect(
        ratio,
        formatContrastResult("secondary-50", "secondary-900", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("次要文本 (secondary-300) 在 secondary-950 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[300],
        colors.secondary[950],
      );
      expect(
        ratio,
        formatContrastResult("secondary-300", "secondary-950", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("次要文本 (secondary-300) 在 secondary-900 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[300],
        colors.secondary[900],
      );
      expect(
        ratio,
        formatContrastResult("secondary-300", "secondary-900", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("成功文本 (success-100) 在 success-950 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.success[100], colors.success[950]);
      expect(
        ratio,
        formatContrastResult("success-100", "success-950", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("警告文本 (warning-100) 在 warning-950 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.warning[100], colors.warning[950]);
      expect(
        ratio,
        formatContrastResult("warning-100", "warning-950", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("错误文本 (error-100) 在 error-950 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.error[100], colors.error[950]);
      expect(
        ratio,
        formatContrastResult("error-100", "error-950", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe("11.1.3 浅色模式 - 大文本对比度（≥ 3:1）", () => {
    it("三级文本 (secondary-400) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.secondary[400], "#ffffff");
      expect(
        ratio,
        formatContrastResult("secondary-400", "white", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("占位符文本 (secondary-400) 在 secondary-50 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[400],
        colors.secondary[50],
      );
      expect(
        ratio,
        formatContrastResult("secondary-400", "secondary-50", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("11.1.4 深色模式 - 大文本对比度（≥ 3:1）", () => {
    it("三级文本 (secondary-400) 在 secondary-950 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[400],
        colors.secondary[950],
      );
      expect(
        ratio,
        formatContrastResult("secondary-400", "secondary-950", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("占位符文本 (secondary-500) 在 secondary-800 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[500],
        colors.secondary[800],
      );
      expect(
        ratio,
        formatContrastResult("secondary-500", "secondary-800", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("11.1.5 浅色模式 - 交互元素对比度（≥ 3:1）", () => {
    it("主要按钮 (primary-500) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.primary[500], "#ffffff");
      expect(
        ratio,
        formatContrastResult("primary-500", "white", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("主要按钮文本 (white) 在 primary-500 背景上应有足够对比度", () => {
      const ratio = getContrastRatio("#ffffff", colors.primary[500]);
      expect(
        ratio,
        formatContrastResult("white", "primary-500", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("成功按钮文本 (white) 在 success-500 背景上应有足够对比度", () => {
      const ratio = getContrastRatio("#ffffff", colors.success[500]);
      expect(
        ratio,
        formatContrastResult("white", "success-500", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("错误按钮文本 (white) 在 error-500 背景上应有足够对比度", () => {
      const ratio = getContrastRatio("#ffffff", colors.error[500]);
      expect(
        ratio,
        formatContrastResult("white", "error-500", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("边框 (secondary-200) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.secondary[200], "#ffffff");
      expect(
        ratio,
        formatContrastResult("secondary-200", "white", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("11.1.6 深色模式 - 交互元素对比度（≥ 3:1）", () => {
    it("主要按钮 (primary-600) 在 secondary-950 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.primary[600],
        colors.secondary[950],
      );
      expect(
        ratio,
        formatContrastResult("primary-600", "secondary-950", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("主要按钮文本 (white) 在 primary-600 背景上应有足够对比度", () => {
      const ratio = getContrastRatio("#ffffff", colors.primary[600]);
      expect(
        ratio,
        formatContrastResult("white", "primary-600", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("成功按钮文本 (white) 在 success-600 背景上应有足够对比度", () => {
      const ratio = getContrastRatio("#ffffff", colors.success[600]);
      expect(
        ratio,
        formatContrastResult("white", "success-600", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("错误按钮文本 (white) 在 error-600 背景上应有足够对比度", () => {
      const ratio = getContrastRatio("#ffffff", colors.error[600]);
      expect(
        ratio,
        formatContrastResult("white", "error-600", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("边框 (secondary-700) 在 secondary-950 背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[700],
        colors.secondary[950],
      );
      expect(
        ratio,
        formatContrastResult("secondary-700", "secondary-950", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("11.1.7 状态指示器对比度", () => {
    it("在线状态 (success-500) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.success[500], "#ffffff");
      expect(
        ratio,
        formatContrastResult("success-500", "white", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("警告状态 (warning-500) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.warning[500], "#ffffff");
      expect(
        ratio,
        formatContrastResult("warning-500", "white", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("错误状态 (error-500) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.error[500], "#ffffff");
      expect(
        ratio,
        formatContrastResult("error-500", "white", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("在线状态 (success-400) 在深色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.success[400],
        colors.secondary[950],
      );
      expect(
        ratio,
        formatContrastResult("success-400", "secondary-950", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("警告状态 (warning-400) 在深色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.warning[400],
        colors.secondary[950],
      );
      expect(
        ratio,
        formatContrastResult("warning-400", "secondary-950", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("错误状态 (error-400) 在深色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.error[400], colors.secondary[950]);
      expect(
        ratio,
        formatContrastResult("error-400", "secondary-950", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("11.1.8 导航栏对比度", () => {
    it("激活状态 (primary-500) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.primary[500], "#ffffff");
      expect(
        ratio,
        formatContrastResult("primary-500", "white", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("未激活状态 (secondary-400) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.secondary[400], "#ffffff");
      expect(
        ratio,
        formatContrastResult("secondary-400", "white", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("激活状态 (primary-400) 在深色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.primary[400],
        colors.secondary[900],
      );
      expect(
        ratio,
        formatContrastResult("primary-400", "secondary-900", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("未激活状态 (secondary-500) 在深色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[500],
        colors.secondary[900],
      );
      expect(
        ratio,
        formatContrastResult("secondary-500", "secondary-900", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("11.1.9 表单输入对比度", () => {
    it("输入框文本 (secondary-900) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.secondary[900], "#ffffff");
      expect(
        ratio,
        formatContrastResult("secondary-900", "white", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("输入框占位符 (secondary-400) 在白色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(colors.secondary[400], "#ffffff");
      expect(
        ratio,
        formatContrastResult("secondary-400", "white", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("输入框文本 (secondary-50) 在深色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[50],
        colors.secondary[800],
      );
      expect(
        ratio,
        formatContrastResult("secondary-50", "secondary-800", ratio, 4.5),
      ).toBeGreaterThanOrEqual(4.5);
    });

    it("输入框占位符 (secondary-500) 在深色背景上应有足够对比度", () => {
      const ratio = getContrastRatio(
        colors.secondary[500],
        colors.secondary[800],
      );
      expect(
        ratio,
        formatContrastResult("secondary-500", "secondary-800", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });

    it("焦点环 (primary-500) 应该可见", () => {
      // 焦点环通常是半透明的，这里测试不透明版本
      const ratio = getContrastRatio(colors.primary[500], "#ffffff");
      expect(
        ratio,
        formatContrastResult("primary-500", "white", ratio, 3.0),
      ).toBeGreaterThanOrEqual(3.0);
    });
  });

  describe("11.1.10 对比度总结报告", () => {
    it("应该生成所有关键颜色组合的对比度报告", () => {
      const report: Array<{
        name: string;
        fg: string;
        bg: string;
        ratio: number;
        required: number;
        pass: boolean;
      }> = [];

      // 浅色模式关键组合
      const lightModeCombinations = [
        {
          name: "主要文本/白色背景",
          fg: colors.secondary[900],
          bg: "#ffffff",
          required: 4.5,
        },
        {
          name: "次要文本/白色背景",
          fg: colors.secondary[600],
          bg: "#ffffff",
          required: 4.5,
        },
        {
          name: "主按钮文本/primary-500",
          fg: "#ffffff",
          bg: colors.primary[500],
          required: 4.5,
        },
        {
          name: "成功文本/success-50",
          fg: colors.success[900],
          bg: colors.success[50],
          required: 4.5,
        },
        {
          name: "警告文本/warning-50",
          fg: colors.warning[900],
          bg: colors.warning[50],
          required: 4.5,
        },
        {
          name: "错误文本/error-50",
          fg: colors.error[900],
          bg: colors.error[50],
          required: 4.5,
        },
      ];

      // 深色模式关键组合
      const darkModeCombinations = [
        {
          name: "主要文本/secondary-950",
          fg: colors.secondary[50],
          bg: colors.secondary[950],
          required: 4.5,
        },
        {
          name: "次要文本/secondary-950",
          fg: colors.secondary[300],
          bg: colors.secondary[950],
          required: 4.5,
        },
        {
          name: "主按钮文本/primary-600",
          fg: "#ffffff",
          bg: colors.primary[600],
          required: 4.5,
        },
        {
          name: "成功文本/success-950",
          fg: colors.success[100],
          bg: colors.success[950],
          required: 4.5,
        },
        {
          name: "警告文本/warning-950",
          fg: colors.warning[100],
          bg: colors.warning[950],
          required: 4.5,
        },
        {
          name: "错误文本/error-950",
          fg: colors.error[100],
          bg: colors.error[950],
          required: 4.5,
        },
      ];

      [...lightModeCombinations, ...darkModeCombinations].forEach((combo) => {
        const ratio = getContrastRatio(combo.fg, combo.bg);
        const pass = ratio >= combo.required;
        report.push({
          name: combo.name,
          fg: combo.fg,
          bg: combo.bg,
          ratio,
          required: combo.required,
          pass,
        });
      });

      // 输出报告
      console.log("\n=== 对比度验证报告 ===\n");
      report.forEach((item) => {
        const status = item.pass ? "✓ 通过" : "✗ 失败";
        console.log(
          `${status} | ${item.name}: ${item.ratio.toFixed(2)}:1 (需要 ${item.required}:1)`,
        );
      });

      const failedTests = report.filter((item) => !item.pass);
      if (failedTests.length > 0) {
        console.log(`\n⚠️  ${failedTests.length} 个测试未通过 WCAG AA 标准\n`);
      } else {
        console.log("\n✓ 所有测试通过 WCAG AA 标准\n");
      }

      // 确保所有测试都通过
      expect(failedTests.length).toBe(0);
    });
  });
});
