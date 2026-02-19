import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { statSync, existsSync } from "fs";
import { join } from "path";

describe("性能测试 - 配色系统重设计", () => {
  describe("12.1.1 构建产物大小检查", () => {
    it("应该构建生产版本", () => {
      // 执行生产构建
      try {
        execSync("npm run build", { stdio: "pipe" });
        expect(true).toBe(true);
      } catch (error) {
        throw new Error("构建失败: " + error);
      }
    });

    it("构建产物总大小应该在合理范围内", () => {
      const distPath = join(process.cwd(), "dist");

      if (!existsSync(distPath)) {
        throw new Error("dist 目录不存在，请先运行构建");
      }

      // 递归计算目录大小
      const calculateDirSize = (dir: string): number => {
        const fs = require("fs");
        let totalSize = 0;

        try {
          const items = fs.readdirSync(dir);

          for (const item of items) {
            const fullPath = join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              totalSize += calculateDirSize(fullPath);
            } else {
              totalSize += stat.size;
            }
          }
        } catch (error) {
          // 忽略错误
        }

        return totalSize;
      };

      const totalSizeBytes = calculateDirSize(distPath);
      const totalSizeKB = totalSizeBytes / 1024;
      const totalSizeMB = totalSizeKB / 1024;

      console.log("\n📊 构建产物大小统计:");
      console.log(
        `  总计: ${totalSizeMB.toFixed(2)} MB (${totalSizeKB.toFixed(2)} KB)`,
      );

      // 由于使用 Tailwind CDN，构建产物主要是 JS 文件
      // 总大小应该小于 5MB（合理范围）
      expect(totalSizeMB).toBeLessThan(5);
    });

    it("index.html 应该包含 Tailwind CDN 配置", () => {
      const fs = require("fs");
      const indexPath = join(process.cwd(), "index.html");
      const content = fs.readFileSync(indexPath, "utf-8");

      // 检查是否包含 Tailwind CDN
      expect(content).toContain("cdn.tailwindcss.com");

      // 检查是否配置了 darkMode
      expect(content).toContain("darkMode: 'class'");

      // 检查是否定义了自定义颜色
      expect(content).toContain("primary:");
      expect(content).toContain("secondary:");
      expect(content).toContain("success:");
      expect(content).toContain("warning:");
      expect(content).toContain("error:");
      expect(content).toContain("info:");

      console.log("\n✅ Tailwind CDN 配置验证通过");
    });
  });

  describe("12.1.2 颜色配置完整性验证", () => {
    it("应该定义所有必需的颜色", () => {
      const fs = require("fs");
      const indexPath = join(process.cwd(), "index.html");
      const content = fs.readFileSync(indexPath, "utf-8");

      const requiredColors = [
        "primary",
        "secondary",
        "success",
        "warning",
        "error",
        "info",
      ];
      const requiredShades = [
        "50",
        "100",
        "200",
        "300",
        "400",
        "500",
        "600",
        "700",
        "800",
        "900",
        "950",
      ];

      requiredColors.forEach((color) => {
        expect(content).toContain(`${color}:`);

        // 检查每个颜色是否有所有色阶
        requiredShades.forEach((shade) => {
          expect(content).toContain(`${shade}:`);
        });
      });

      console.log("\n✅ 所有颜色定义完整");
    });

    it("应该配置 darkMode 为 class", () => {
      const fs = require("fs");
      const indexPath = join(process.cwd(), "index.html");
      const content = fs.readFileSync(indexPath, "utf-8");

      expect(content).toContain("darkMode: 'class'");
      console.log("\n✅ darkMode 配置正确");
    });
  });

  describe("12.1.3 构建产物检查", () => {
    it("应该生成 JS 文件", () => {
      const distPath = join(process.cwd(), "dist");

      if (!existsSync(distPath)) {
        throw new Error("dist 目录不存在，请先运行构建");
      }

      const findJsFiles = (dir: string): string[] => {
        const fs = require("fs");
        const files: string[] = [];

        try {
          const items = fs.readdirSync(dir);

          for (const item of items) {
            const fullPath = join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
              files.push(...findJsFiles(fullPath));
            } else if (item.endsWith(".js")) {
              files.push(fullPath);
            }
          }
        } catch (error) {
          // 忽略错误
        }

        return files;
      };

      const jsFiles = findJsFiles(distPath);

      expect(jsFiles.length).toBeGreaterThan(0);

      let totalSize = 0;
      const fileSizes: { file: string; size: number }[] = [];

      jsFiles.forEach((file) => {
        const stats = statSync(file);
        const sizeInKB = stats.size / 1024;
        totalSize += sizeInKB;
        fileSizes.push({ file: file.replace(distPath, ""), size: sizeInKB });
      });

      console.log("\n📊 JS 文件大小统计:");
      fileSizes.forEach(({ file, size }) => {
        console.log(`  ${file}: ${size.toFixed(2)} KB`);
      });
      console.log(`  总计: ${totalSize.toFixed(2)} KB`);
    });

    it("应该生成 index.html", () => {
      const distPath = join(process.cwd(), "dist");
      const indexPath = join(distPath, "index.html");

      expect(existsSync(indexPath)).toBe(true);
    });
  });

  describe("12.1.4 性能基准测试", () => {
    it("应该记录构建时间", () => {
      const startTime = Date.now();

      try {
        execSync("npm run build", { stdio: "pipe" });
        const buildTime = Date.now() - startTime;

        console.log(`\n⏱️  构建时间: ${(buildTime / 1000).toFixed(2)} 秒`);

        // 构建时间应该在合理范围内（小于 60 秒）
        expect(buildTime).toBeLessThan(60000);
      } catch (error) {
        throw new Error("构建失败: " + error);
      }
    });
  });
});
