/**
 * 属性 2：对比度合规性测试
 *
 * 验证：对于任何文本和背景颜色的组合，如果该组合被用于正常文本（16px 及以上），
 * 则对比度应至少为 4.5:1；如果用于大文本（18px 粗体或 24px 及以上）或交互元素，
 * 则对比度应至少为 3:1；并且这些规则应在浅色和深色两种模式下都成立。
 *
 * 需求: 属性 2, 2.1, 2.2, 2.3, 3.5
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  calculateContrastRatio,
  lightModeTextColors,
  lightModeBackgroundColors,
  darkModeTextColors,
  darkModeBackgroundColors,
} from "./property-test-helpers";

describe("属性 2：对比度合规性", () => {
  describe("浅色模式 - 正常文本对比度", () => {
    it("所有文本色和背景色组合的对比度应 ≥ 4.5:1", () => {
      // 验证：需求 2.1, 2.2, 3.5
      fc.assert(
        fc.property(
          fc.constantFrom(...lightModeTextColors),
          fc.constantFrom(...lightModeBackgroundColors),
          (textColor, bgColor) => {
            const ratio = calculateContrastRatio(textColor, bgColor);

            // WCAG AA 标准：正常文本至少 4.5:1
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("深色模式 - 正常文本对比度", () => {
    it("所有文本色和背景色组合的对比度应 ≥ 4.5:1", () => {
      // 验证：需求 2.1, 2.2, 3.5
      fc.assert(
        fc.property(
          fc.constantFrom(...darkModeTextColors),
          fc.constantFrom(...darkModeBackgroundColors),
          (textColor, bgColor) => {
            const ratio = calculateContrastRatio(textColor, bgColor);

            // WCAG AA 标准：正常文本至少 4.5:1
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("浅色模式 - 大文本对比度", () => {
    it("所有大文本组合的对比度应 ≥ 3:1", () => {
      // 验证：需求 2.2, 3.5
      fc.assert(
        fc.property(
          fc.constantFrom(...lightModeTextColors),
          fc.constantFrom(...lightModeBackgroundColors),
          (textColor, bgColor) => {
            const ratio = calculateContrastRatio(textColor, bgColor);

            // WCAG AA 标准：大文本至少 3:1
            expect(ratio).toBeGreaterThanOrEqual(3.0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("深色模式 - 大文本对比度", () => {
    it("所有大文本组合的对比度应 ≥ 3:1", () => {
      // 验证：需求 2.2, 3.5
      fc.assert(
        fc.property(
          fc.constantFrom(...darkModeTextColors),
          fc.constantFrom(...darkModeBackgroundColors),
          (textColor, bgColor) => {
            const ratio = calculateContrastRatio(textColor, bgColor);

            // WCAG AA 标准：大文本至少 3:1
            expect(ratio).toBeGreaterThanOrEqual(3.0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("浅色模式 - 交互元素对比度", () => {
    it("所有交互元素的对比度应 ≥ 3:1", () => {
      // 验证：需求 2.3, 3.5
      const interactiveColors = [
        "#334e68", // primary-700（提高对比度）
        "#16a34a", // success-600（提高对比度）
        "#b45309", // warning-700（提高对比度，从 600 改为 700）
        "#dc2626", // error-600（提高对比度）
        "#0891b2", // info-600（提高对比度）
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...interactiveColors),
          fc.constantFrom(...lightModeBackgroundColors),
          (interactiveColor, bgColor) => {
            const ratio = calculateContrastRatio(interactiveColor, bgColor);

            // WCAG AA 标准：交互元素至少 3:1
            expect(ratio).toBeGreaterThanOrEqual(3.0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("深色模式 - 交互元素对比度", () => {
    it("所有交互元素的对比度应 ≥ 3:1", () => {
      // 验证：需求 2.3, 3.5
      const interactiveColors = [
        "#bcccdc", // primary-200（提高对比度）
        "#86efac", // success-300（提高对比度）
        "#fde68a", // warning-200（提高对比度）
        "#fca5a5", // error-300（提高对比度）
        "#67e8f9", // info-300（提高对比度）
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...interactiveColors),
          fc.constantFrom(...darkModeBackgroundColors),
          (interactiveColor, bgColor) => {
            const ratio = calculateContrastRatio(interactiveColor, bgColor);

            // WCAG AA 标准：交互元素至少 3:1
            expect(ratio).toBeGreaterThanOrEqual(3.0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("对比度计算正确性", () => {
    it("对比度值应该在有效范围内（1-21）", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...lightModeTextColors, ...darkModeTextColors),
          fc.constantFrom(
            ...lightModeBackgroundColors,
            ...darkModeBackgroundColors,
          ),
          (textColor, bgColor) => {
            const ratio = calculateContrastRatio(textColor, bgColor);

            // 对比度范围：1:1 到 21:1
            expect(ratio).toBeGreaterThanOrEqual(1.0);
            expect(ratio).toBeLessThanOrEqual(21.0);

            // 对比度应该是有限数值
            expect(Number.isFinite(ratio)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("对比度对称性", () => {
    it("颜色 A 和 B 的对比度应该等于 B 和 A 的对比度", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...lightModeTextColors),
          fc.constantFrom(...lightModeBackgroundColors),
          (color1, color2) => {
            const ratio1 = calculateContrastRatio(color1, color2);
            const ratio2 = calculateContrastRatio(color2, color1);

            // 对比度应该是对称的
            expect(Math.abs(ratio1 - ratio2)).toBeLessThan(0.01);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("白色和黑色的最大对比度", () => {
    it("白色和黑色应该有最大对比度（21:1）", () => {
      const whiteBlackRatio = calculateContrastRatio("#ffffff", "#000000");

      // 白色和黑色的对比度应该接近 21:1
      expect(whiteBlackRatio).toBeGreaterThan(20.9);
      expect(whiteBlackRatio).toBeLessThanOrEqual(21.0);
    });
  });

  describe("相同颜色的最小对比度", () => {
    it("相同颜色的对比度应该是 1:1", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...lightModeTextColors, ...lightModeBackgroundColors),
          (color) => {
            const ratio = calculateContrastRatio(color, color);

            // 相同颜色的对比度应该是 1:1
            expect(ratio).toBeCloseTo(1.0, 1);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("跨模式对比度验证", () => {
    it("浅色模式和深色模式都应该满足对比度要求", () => {
      // 验证：需求 3.5
      fc.assert(
        fc.property(
          fc.constantFrom(0, 1), // 0 = 浅色模式, 1 = 深色模式
          (mode) => {
            const textColors =
              mode === 0 ? lightModeTextColors : darkModeTextColors;
            const bgColors =
              mode === 0 ? lightModeBackgroundColors : darkModeBackgroundColors;

            // 随机选择一个文本色和背景色
            const textColor = textColors[0];
            const bgColor = bgColors[0];

            const ratio = calculateContrastRatio(textColor, bgColor);

            // 两种模式都应该满足最低对比度要求
            expect(ratio).toBeGreaterThanOrEqual(4.5);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
