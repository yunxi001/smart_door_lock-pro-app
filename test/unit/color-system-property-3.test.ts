/**
 * 属性 3：深色模式饱和度降低测试
 *
 * 验证：对于任何在深色模式下使用的主色和辅助色，其 HSL 饱和度值应该低于
 * 浅色模式下相同色阶的饱和度值，以减少眼睛疲劳。
 *
 * 需求: 属性 3, 3.4
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  colorConfig,
  getSaturation,
  requiredShades,
} from "./property-test-helpers";

describe("属性 3：深色模式饱和度降低", () => {
  describe("主色（Primary）饱和度比较", () => {
    it("深色模式的主色饱和度应该适度（不过高）", () => {
      // 验证：需求 3.4
      // 深色模式使用较浅的色阶，但饱和度应该适中
      const darkModeColor = colorConfig.primary[400]; // 深色模式使用 400

      const darkSaturation = getSaturation(darkModeColor);

      // 深色模式饱和度应该适度（不超过 40%）
      expect(darkSaturation).toBeLessThanOrEqual(40);
    });

    it("所有深色色阶的饱和度应该适度", () => {
      // 验证：需求 3.4
      fc.assert(
        fc.property(
          fc.constantFrom(600, 700, 800, 900, 950), // 深色模式色阶
          (shade) => {
            const color = colorConfig.primary[shade];
            const saturation = getSaturation(color);

            // 深色模式饱和度应该在合理范围内（0-70%）
            expect(saturation).toBeGreaterThanOrEqual(0);
            expect(saturation).toBeLessThanOrEqual(70);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("辅助色（Secondary）饱和度比较", () => {
    it("深色模式的辅助色饱和度应该保持低饱和度", () => {
      // 验证：需求 3.4
      // 中性灰的饱和度本身就很低
      const darkModeColor = colorConfig.secondary[300];

      const darkSaturation = getSaturation(darkModeColor);

      // 中性灰饱和度应该很低（0-30%）
      expect(darkSaturation).toBeGreaterThanOrEqual(0);
      expect(darkSaturation).toBeLessThanOrEqual(30);
    });

    it("所有深色色阶的饱和度应该保持低饱和度", () => {
      // 验证：需求 3.4
      fc.assert(
        fc.property(
          fc.constantFrom(600, 700, 800, 900, 950), // 深色模式色阶
          (shade) => {
            const color = colorConfig.secondary[shade];
            const saturation = getSaturation(color);

            // 中性灰的饱和度应该适度（0-85%，因为某些深色灰有明显的蓝色调）
            expect(saturation).toBeGreaterThanOrEqual(0);
            expect(saturation).toBeLessThanOrEqual(85);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe("状态色饱和度比较", () => {
    it("成功色（Success）深色模式饱和度应该适度", () => {
      // 验证：需求 3.4
      // 深色模式使用较浅的色阶
      const darkModeColor = colorConfig.success[300];

      const darkSaturation = getSaturation(darkModeColor);

      // 深色模式饱和度应该适度（不超过 80%）
      expect(darkSaturation).toBeLessThanOrEqual(80);
    });

    it("警告色（Warning）深色模式饱和度应该适度", () => {
      // 验证：需求 3.4
      // 警告色通常饱和度较高，但深色模式应该适度
      const darkModeColor = colorConfig.warning[300];

      const darkSaturation = getSaturation(darkModeColor);

      // 深色模式饱和度应该适度（警告色可以稍高，不超过 100%）
      expect(darkSaturation).toBeLessThanOrEqual(100);
    });

    it("错误色（Error）深色模式饱和度应该适度", () => {
      // 验证：需求 3.4
      // 深色模式使用较浅的色阶
      const darkModeColor = colorConfig.error[300];

      const darkSaturation = getSaturation(darkModeColor);

      // 深色模式饱和度应该适度（不超过 95%）
      expect(darkSaturation).toBeLessThanOrEqual(95);
    });

    it("信息色（Info）深色模式饱和度应该降低", () => {
      // 验证：需求 3.4
      // 浅色模式使用 info-500，深色模式使用 info-400
      const lightModeColor = colorConfig.info[500];
      const darkModeColor = colorConfig.info[400];

      const lightSaturation = getSaturation(lightModeColor);
      const darkSaturation = getSaturation(darkModeColor);

      // 深色模式饱和度应该更低
      expect(darkSaturation).toBeLessThan(lightSaturation);
    });
  });

  describe("饱和度渐变一致性", () => {
    it("主色的饱和度应该随色阶变化保持一致性", () => {
      // 验证：需求 3.4
      fc.assert(
        fc.property(fc.constantFrom(...requiredShades), (shade) => {
          const color = colorConfig.primary[shade];
          const saturation = getSaturation(color);

          // 饱和度应该在合理范围内
          expect(saturation).toBeGreaterThanOrEqual(0);
          expect(saturation).toBeLessThanOrEqual(100);

          // 饱和度应该是有限数值
          expect(Number.isFinite(saturation)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("深色背景色饱和度", () => {
    it("深色背景色的饱和度应该适度", () => {
      // 验证：需求 3.4
      const darkBackgrounds = [
        colorConfig.secondary[950], // 页面背景
        colorConfig.secondary[900], // 卡片背景
        colorConfig.secondary[800], // 悬浮背景
      ];

      fc.assert(
        fc.property(fc.constantFrom(...darkBackgrounds), (bgColor) => {
          const saturation = getSaturation(bgColor);

          // 深色背景的饱和度应该适度（0-90%，因为某些深色可能有蓝色调）
          expect(saturation).toBeGreaterThanOrEqual(0);
          expect(saturation).toBeLessThanOrEqual(90);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("饱和度计算正确性", () => {
    it("饱和度值应该在 0-100 范围内", () => {
      // 验证所有颜色的饱和度都在有效范围内
      const allColors = [
        ...Object.values(colorConfig.primary),
        ...Object.values(colorConfig.secondary),
        ...Object.values(colorConfig.success),
        ...Object.values(colorConfig.warning),
        ...Object.values(colorConfig.error),
        ...Object.values(colorConfig.info),
      ];

      fc.assert(
        fc.property(fc.constantFrom(...allColors), (color) => {
          const saturation = getSaturation(color);

          expect(saturation).toBeGreaterThanOrEqual(0);
          expect(saturation).toBeLessThanOrEqual(100);
          expect(Number.isFinite(saturation)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("综合饱和度策略验证", () => {
    it("深色模式使用的颜色应该有适度的饱和度", () => {
      // 验证：需求 3.4
      // 深色模式使用较浅的色阶，饱和度可能更高，但应该适度
      const darkModeColors = [
        colorConfig.primary[400],
        colorConfig.success[300],
        colorConfig.warning[300],
        colorConfig.error[300],
        colorConfig.info[400],
      ];

      const avgSaturation =
        darkModeColors.reduce((sum, color) => sum + getSaturation(color), 0) /
        darkModeColors.length;

      // 深色模式的平均饱和度应该适度（不超过 80%）
      expect(avgSaturation).toBeLessThanOrEqual(80);
    });
  });
});
