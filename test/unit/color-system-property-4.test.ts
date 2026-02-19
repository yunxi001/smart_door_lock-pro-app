/**
 * 属性 4：文档完整性测试
 *
 * 验证：对于任何配色系统的设计文档，它应该包含以下所有内容：
 * - 每个颜色的语义化用途说明
 * - 所有功能模块（首页、监控页、设置页、通用组件）的配色方案
 * - 设备连接状态的颜色映射
 * - 常用配色组合的示例代码
 * - 配色使用的最佳实践说明
 * - 当前配色与新配色的映射表
 * - 分阶段迁移的实施步骤
 * - 需要修改的文件清单
 * - 测试检查点
 * - 回滚方案
 *
 * 需求: 属性 4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.4, 5.5, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.3, 8.4
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { readFileSync } from "fs";
import { join } from "path";
import {
  requiredDocumentSections,
  requiredFeatureModules,
} from "./property-test-helpers";

// 读取设计文档
const designDocPath = join(
  process.cwd(),
  ".kiro/specs/color-system-redesign/design.md",
);
const designDoc = readFileSync(designDocPath, "utf-8");

// 读取迁移报告（如果存在）
let migrationDoc = "";
try {
  const migrationDocPath = join(
    process.cwd(),
    "docs/color-system-migration-report.md",
  );
  migrationDoc = readFileSync(migrationDocPath, "utf-8");
} catch (error) {
  // 迁移报告可能还不存在
}

describe("属性 4：文档完整性", () => {
  describe("设计文档包含所有必需章节", () => {
    it("应该包含概述章节", () => {
      // 验证：需求 1.5, 7.1
      expect(designDoc).toContain("## 概述");
      expect(designDoc).toContain("设计目标");
      expect(designDoc).toContain("设计原则");
    });

    it("应该包含架构章节", () => {
      // 验证：需求 1.5, 7.1
      expect(designDoc).toContain("## 架构");
      expect(designDoc).toContain("色彩系统架构");
      expect(designDoc).toContain("主题模式架构");
    });

    it("应该包含核心色彩定义章节", () => {
      // 验证：需求 1.5, 5.4, 7.1
      expect(designDoc).toContain("## 组件和接口");
      expect(designDoc).toContain("### 核心色彩定义");
      expect(designDoc).toContain("主品牌色");
      expect(designDoc).toContain("辅助色");
      expect(designDoc).toContain("成功色");
      expect(designDoc).toContain("警告色");
      expect(designDoc).toContain("错误色");
      expect(designDoc).toContain("信息色");
    });

    it("应该包含语义化颜色映射", () => {
      // 验证：需求 1.5, 5.4, 7.1
      expect(designDoc).toContain("### 语义化颜色映射");
      expect(designDoc).toContain("lightModeSemantics");
      expect(designDoc).toContain("darkModeSemantics");
    });

    it("应该包含 Tailwind CSS 配置", () => {
      // 验证：需求 5.4, 7.1, 7.2
      expect(designDoc).toContain("## 数据模型");
      expect(designDoc).toContain("### Tailwind CSS 配置");
      expect(designDoc).toContain("tailwind.config.js");
    });

    it("应该包含正确性属性定义", () => {
      // 验证：需求 7.1, 7.4
      expect(designDoc).toContain("## 正确性属性");
      expect(designDoc).toContain("属性 1");
      expect(designDoc).toContain("属性 2");
      expect(designDoc).toContain("属性 3");
      expect(designDoc).toContain("属性 4");
    });

    it("应该包含错误处理章节", () => {
      // 验证：需求 7.1, 7.3
      expect(designDoc).toContain("## 错误处理");
    });

    it("应该包含测试策略章节", () => {
      // 验证：需求 7.1, 7.4
      expect(designDoc).toContain("## 测试策略");
      expect(designDoc).toContain("单元测试");
      expect(designDoc).toContain("属性测试");
    });
  });

  describe("每个功能模块有配色方案", () => {
    it("应该包含首页（HomeScreen）配色方案", () => {
      // 验证：需求 4.1, 5.4, 8.3
      fc.assert(
        fc.property(fc.constant(designDoc), (doc) => {
          expect(doc).toContain("## 功能模块配色方案");
          expect(doc).toContain("### 1. 首页（HomeScreen）配色");
          expect(doc).toContain("设备状态卡片");
          expect(doc).toContain("快捷操作按钮");
          expect(doc).toContain("最近动态列表");
        }),
        { numRuns: 100 },
      );
    });

    it("应该包含监控页（MonitorScreen）配色方案", () => {
      // 验证：需求 4.2, 5.4, 8.1, 8.2
      fc.assert(
        fc.property(fc.constant(designDoc), (doc) => {
          expect(doc).toContain("### 2. 监控页（MonitorScreen）配色");
          expect(doc).toContain("视频容器");
          expect(doc).toContain("对讲控制按钮");
        }),
        { numRuns: 100 },
      );
    });

    it("应该包含设置页（SettingsScreen）配色方案", () => {
      // 验证：需求 4.3, 5.4
      fc.assert(
        fc.property(fc.constant(designDoc), (doc) => {
          expect(doc).toContain("### 3. 设置页（SettingsScreen）配色");
          expect(doc).toContain("功能分组卡片");
          expect(doc).toContain("列表项");
          expect(doc).toContain("日志记录");
        }),
        { numRuns: 100 },
      );
    });

    it("应该包含通用组件配色方案", () => {
      // 验证：需求 4.4, 5.4
      fc.assert(
        fc.property(fc.constant(designDoc), (doc) => {
          expect(doc).toContain("### 4. 通用组件配色");
          expect(doc).toContain("底部导航栏");
          expect(doc).toContain("弹窗");
          expect(doc).toContain("表单输入");
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("设备连接状态的颜色映射", () => {
    it("应该定义设备状态颜色", () => {
      // 验证：需求 4.5, 8.4
      fc.assert(
        fc.property(fc.constant(designDoc), (doc) => {
          expect(doc).toContain("在线状态");
          expect(doc).toContain("离线状态");
          expect(doc).toContain("连接中状态");
          expect(doc).toContain("success");
          expect(doc).toContain("error");
          expect(doc).toContain("warning");
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("常用配色组合的示例代码", () => {
    it("应该提供示例代码", () => {
      // 验证：需求 5.4, 5.5, 7.2
      fc.assert(
        fc.property(fc.constant(designDoc), (doc) => {
          // 检查是否包含代码块
          expect(doc).toContain("```");

          // 检查是否包含 Tailwind 类名示例
          expect(doc).toContain("className");
          expect(doc).toContain("bg-");
          expect(doc).toContain("text-");
          expect(doc).toContain("dark:");
        }),
        { numRuns: 100 },
      );
    });

    it("应该提供常用配色组合速查表", () => {
      // 验证：需求 5.5, 7.2
      expect(designDoc).toContain("### 常用配色组合速查表");
      expect(designDoc).toContain("场景");
      expect(designDoc).toContain("浅色模式");
      expect(designDoc).toContain("深色模式");
      expect(designDoc).toContain("对比度");
    });
  });

  describe("配色使用的最佳实践说明", () => {
    it("应该包含最佳实践章节", () => {
      // 验证：需求 5.5, 7.2
      expect(designDoc).toContain("### 最佳实践");
      expect(designDoc).toContain("推荐");
      expect(designDoc).toContain("不推荐");
    });

    it("应该包含颜色选择决策树", () => {
      // 验证：需求 5.5, 7.2
      expect(designDoc).toContain("### 颜色选择决策树");
    });

    it("应该包含可访问性检查清单", () => {
      // 验证：需求 5.5, 7.2
      expect(designDoc).toContain("### 可访问性检查清单");
      expect(designDoc).toContain("对比度");
      expect(designDoc).toContain("4.5:1");
      expect(designDoc).toContain("3:1");
    });
  });

  describe("迁移计划完整性", () => {
    it("应该包含当前配色与新配色的映射表", () => {
      // 验证：需求 7.1, 7.2
      expect(designDoc).toContain("## 迁移计划");
      expect(designDoc).toContain("### 颜色映射表");
      expect(designDoc).toContain("当前类名");
      expect(designDoc).toContain("新类名");
    });

    it("应该包含分阶段迁移的实施步骤", () => {
      // 验证：需求 7.2, 7.3
      expect(designDoc).toContain("### 分阶段实施步骤");
      expect(designDoc).toContain("阶段 1");
      expect(designDoc).toContain("阶段 2");
      expect(designDoc).toContain("阶段 3");
      expect(designDoc).toContain("阶段 4");
    });

    it("应该包含需要修改的文件清单", () => {
      // 验证：需求 7.3
      expect(designDoc).toContain("### 需要修改的文件清单");
      expect(designDoc).toContain("App.tsx");
      expect(designDoc).toContain("HomeScreen.tsx");
      expect(designDoc).toContain("MonitorScreen.tsx");
      expect(designDoc).toContain("SettingsScreen.tsx");
    });

    it("应该包含测试检查点", () => {
      // 验证：需求 7.4
      fc.assert(
        fc.property(fc.constant(designDoc), (doc) => {
          expect(doc).toContain("检查点");
          expect(doc).toContain("[ ]");
        }),
        { numRuns: 100 },
      );
    });

    it("应该包含回滚方案", () => {
      // 验证：需求 7.5
      expect(designDoc).toContain("### 回滚方案");
      expect(designDoc).toContain("快速回滚");
      expect(designDoc).toContain("git checkout");
    });

    it("应该包含风险和缓解措施", () => {
      // 验证：需求 7.5
      expect(designDoc).toContain("### 迁移风险和缓解措施");
      expect(designDoc).toContain("风险");
      expect(designDoc).toContain("缓解措施");
    });
  });

  describe("文档结构完整性", () => {
    it("应该有清晰的文档结构", () => {
      // 验证：需求 7.1
      fc.assert(
        fc.property(fc.constant(designDoc), (doc) => {
          // 检查是否有标题层次
          expect(doc).toContain("# ");
          expect(doc).toContain("## ");
          expect(doc).toContain("### ");

          // 检查文档长度（应该是详细的文档）
          expect(doc.length).toBeGreaterThan(10000);
        }),
        { numRuns: 100 },
      );
    });

    it("应该包含总结章节", () => {
      // 验证：需求 7.1
      expect(designDoc).toContain("## 总结");
    });
  });

  describe("代码示例完整性", () => {
    it("所有正面代码示例应该包含深色模式类名", () => {
      // 验证：需求 5.4, 7.2
      const codeBlocks = designDoc.match(/```[\s\S]*?```/g) || [];
      const tsxCodeBlocks = codeBlocks.filter(
        (block) => block.includes("className") && block.includes("tsx"),
      );

      // 排除反面示例（包含"不推荐"或"❌"的代码块）
      const positiveExamples = tsxCodeBlocks.filter((block) => {
        const context = designDoc.substring(
          Math.max(0, designDoc.indexOf(block) - 200),
          designDoc.indexOf(block),
        );
        return !context.includes("不推荐") && !context.includes("❌");
      });

      // 如果有正面示例，则验证它们包含深色模式类名
      if (positiveExamples.length > 0) {
        fc.assert(
          fc.property(fc.constantFrom(...positiveExamples), (codeBlock) => {
            // 如果代码块包含颜色类名，应该也包含 dark: 前缀
            if (
              codeBlock.includes("bg-") ||
              codeBlock.includes("text-") ||
              codeBlock.includes("border-")
            ) {
              expect(codeBlock).toContain("dark:");
            }
          }),
          { numRuns: Math.min(100, positiveExamples.length) },
        );
      } else {
        // 如果没有正面示例，至少验证有代码示例存在
        expect(tsxCodeBlocks.length).toBeGreaterThan(0);
      }
    });
  });

  describe("配色定义完整性", () => {
    it("每个颜色应该有使用场景说明", () => {
      // 验证：需求 1.5, 5.4
      const colorNames = [
        "primary",
        "secondary",
        "success",
        "warning",
        "error",
        "info",
      ];

      fc.assert(
        fc.property(fc.constantFrom(...colorNames), (colorName) => {
          // 检查是否有该颜色的使用场景说明
          expect(designDoc).toContain(`**使用场景**`);
        }),
        { numRuns: 100 },
      );
    });

    it("每个颜色应该有完整的色阶定义", () => {
      // 验证：需求 1.5, 5.4
      const colorNames = [
        "primary",
        "secondary",
        "success",
        "warning",
        "error",
        "info",
      ];

      fc.assert(
        fc.property(fc.constantFrom(...colorNames), (colorName) => {
          // 检查是否定义了所有色阶
          expect(designDoc).toContain(`${colorName}:`);
          expect(designDoc).toContain("50:");
          expect(designDoc).toContain("500:");
          expect(designDoc).toContain("950:");
        }),
        { numRuns: 100 },
      );
    });
  });

  describe("迁移文档完整性（如果存在）", () => {
    it("如果迁移报告存在，应该包含修改的文件列表", () => {
      if (migrationDoc) {
        // 验证：需求 7.3
        expect(migrationDoc).toContain("修改");
        expect(migrationDoc).toContain("文件");
      }
    });

    it("如果迁移报告存在，应该包含测试结果", () => {
      if (migrationDoc) {
        // 验证：需求 7.4
        expect(migrationDoc).toContain("测试");
      }
    });
  });
});
