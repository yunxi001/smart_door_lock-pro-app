/**
 * 属性 1：配置文件完整性测试
 *
 * 验证：对于任何有效的配色系统配置文件，它应该包含所有必需的颜色定义
 * （primary、secondary、success、warning、error、info），每个颜色都应该有
 * 完整的 11 个色阶（50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950），
 * 并且每个色值都应该是有效的十六进制颜色代码。
 *
 * 需求: 属性 1, 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  colorConfig,
  requiredColors,
  requiredShades,
  isValidHexColor,
  type ColorConfig,
} from "./property-test-helpers";

describe("属性 1：配置文件完整性", () => {
  describe("所有颜色定义存在", () => {
    it("应该包含所有必需的颜色类别", () => {
      // 验证：需求 1.1, 1.2, 1.3, 1.4
      fc.assert(
        fc.property(fc.constantFrom(...requiredColors), (colorName) => {
          // 验证颜色类别存在
          expect(colorConfig).toHaveProperty(colorName);
          expect(colorConfig[colorName]).toBeDefined();
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("每个颜色有 11 个色阶", () => {
    it("每个颜色类别应该有完整的 11 个色阶", () => {
      // 验证：需求 1.1, 1.2, 1.3, 1.4
      fc.assert(
        fc.property(fc.constantFrom(...requiredColors), (colorName) => {
          const colorShades = colorConfig[colorName];
          const shadeKeys = Object.keys(colorShades);

          // 验证有 11 个色阶
          expect(shadeKeys).toHaveLength(11);

          // 验证所有必需的色阶都存在
          requiredShades.forEach((shade) => {
            expect(colorShades).toHaveProperty(shade.toString());
          });
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("色值格式正确（十六进制）", () => {
    it("所有色值应该是有效的十六进制颜色代码", () => {
      // 验证：需求 1.1, 1.2, 1.3, 1.4
      fc.assert(
        fc.property(
          fc.constantFrom(...requiredColors),
          fc.constantFrom(...requiredShades),
          (colorName, shade) => {
            const colorValue = colorConfig[colorName][shade];

            // 验证是有效的十六进制格式
            expect(isValidHexColor(colorValue)).toBe(true);

            // 验证格式：#RRGGBB
            expect(colorValue).toMatch(/^#[0-9a-fA-F]{6}$/);

            // 验证不是纯黑或纯白（除了特殊情况）
            if (colorName !== "secondary" || (shade !== 50 && shade !== 950)) {
              expect(colorValue.toLowerCase()).not.toBe("#000000");
              expect(colorValue.toLowerCase()).not.toBe("#ffffff");
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("配置结构完整性", () => {
    it("配置对象应该有正确的类型结构", () => {
      fc.assert(
        fc.property(fc.constantFrom(...requiredColors), (colorName) => {
          const colorShades = colorConfig[colorName];

          // 验证是一个对象
          expect(typeof colorShades).toBe("object");
          expect(colorShades).not.toBeNull();

          // 验证所有值都是字符串
          Object.values(colorShades).forEach((value) => {
            expect(typeof value).toBe("string");
          });
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("色阶数值正确性", () => {
    it("所有色阶键应该是正确的数值", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...requiredColors),
          fc.constantFrom(...requiredShades),
          (colorName, expectedShade) => {
            const colorShades = colorConfig[colorName];
            const shadeKeys = Object.keys(colorShades).map(Number);

            // 验证色阶键包含期望的数值
            expect(shadeKeys).toContain(expectedShade);

            // 验证色阶键是有效的数字
            shadeKeys.forEach((key) => {
              expect(Number.isInteger(key)).toBe(true);
              expect(key).toBeGreaterThanOrEqual(50);
              expect(key).toBeLessThanOrEqual(950);
            });
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("颜色值唯一性", () => {
    it("同一颜色类别中的不同色阶应该有不同的值", () => {
      fc.assert(
        fc.property(fc.constantFrom(...requiredColors), (colorName) => {
          const colorShades = colorConfig[colorName];
          const colorValues = Object.values(colorShades);

          // 验证所有颜色值都是唯一的
          const uniqueValues = new Set(colorValues);
          expect(uniqueValues.size).toBe(colorValues.length);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("配置完整性综合测试", () => {
    it("配置应该满足所有完整性要求", () => {
      fc.assert(
        fc.property(fc.constant(colorConfig), (config) => {
          // 1. 验证有 6 个颜色类别
          expect(Object.keys(config)).toHaveLength(6);

          // 2. 验证每个类别都有 11 个色阶
          Object.values(config).forEach((colorShades) => {
            expect(Object.keys(colorShades)).toHaveLength(11);
          });

          // 3. 验证总共有 66 个颜色值（6 * 11）
          const allColorValues = Object.values(config).flatMap((colorShades) =>
            Object.values(colorShades),
          );
          expect(allColorValues).toHaveLength(66);

          // 4. 验证所有颜色值都是有效的十六进制格式
          allColorValues.forEach((colorValue) => {
            expect(isValidHexColor(colorValue)).toBe(true);
          });
        }),
        { numRuns: 100 },
      );
    });
  });
});
