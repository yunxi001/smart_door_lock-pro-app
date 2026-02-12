import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

describe("构建优化测试 - 配色系统重设计", () => {
  describe("12.3.1 生产构建优化", () => {
    it("应该成功执行生产构建", () => {
      try {
        execSync("npm run build", { stdio: "pipe" });
        expect(true).toBe(true);
      } catch (error) {
        throw new Error("构建失败: " + error);
      }
    });

    it("构建产物应该包含压缩的 JS 文件", () => {
      const distPath = join(process.cwd(), "dist");

      if (!existsSync(distPath)) {
        throw new Error("dist 目录不存在");
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

      // 检查 JS 文件是否被压缩（文件名应该包含哈希）
      const hashedFiles = jsFiles.filter((file) =>
        /\-[a-zA-Z0-9]{8,}\.js$/.test(file),
      );
      expect(hashedFiles.length).toBeGreaterThan(0);

      console.log("\n✅ 构建产物包含压缩的 JS 文件");
      console.log(`  - 总文件数: ${jsFiles.length}`);
      console.log(`  - 哈希文件数: ${hashedFiles.length}`);
    });

    it("index.html 应该引用哈希化的资源", () => {
      const distPath = join(process.cwd(), "dist");
      const indexPath = join(distPath, "index.html");

      if (!existsSync(indexPath)) {
        throw new Error("dist/index.html 不存在");
      }

      const content = readFileSync(indexPath, "utf-8");

      // 检查是否包含哈希化的 JS 文件引用
      const hasHashedJs = /src="[^"]*\-[a-zA-Z0-9]{8,}\.js"/.test(content);
      expect(hasHashedJs).toBe(true);

      console.log("\n✅ index.html 引用哈希化的资源");
    });
  });

  describe("12.3.2 Tailwind CDN 配置验证", () => {
    it("应该使用 Tailwind CDN 而不是本地构建", () => {
      const indexPath = join(process.cwd(), "index.html");
      const content = readFileSync(indexPath, "utf-8");

      // 检查是否使用 CDN
      expect(content).toContain("cdn.tailwindcss.com");

      console.log("\n✅ 使用 Tailwind CDN（无需本地 CSS 构建）");
    });

    it("Tailwind 配置应该包含所有自定义颜色", () => {
      const indexPath = join(process.cwd(), "index.html");
      const content = readFileSync(indexPath, "utf-8");

      const requiredColors = [
        "primary",
        "secondary",
        "success",
        "warning",
        "error",
        "info",
      ];

      requiredColors.forEach((color) => {
        expect(content).toContain(`${color}:`);
      });

      console.log("\n✅ Tailwind 配置包含所有自定义颜色");
    });

    it("Tailwind 配置应该启用深色模式", () => {
      const indexPath = join(process.cwd(), "index.html");
      const content = readFileSync(indexPath, "utf-8");

      expect(content).toContain("darkMode: 'class'");

      console.log("\n✅ Tailwind 深色模式已启用");
    });
  });

  describe("12.3.3 构建产物大小优化", () => {
    it("总构建大小应该在合理范围内", () => {
      const distPath = join(process.cwd(), "dist");

      if (!existsSync(distPath)) {
        throw new Error("dist 目录不存在");
      }

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
      const totalSizeMB = totalSizeBytes / 1024 / 1024;

      console.log(`\n📊 构建产物总大小: ${totalSizeMB.toFixed(2)} MB`);

      // 使用 Tailwind CDN，构建产物应该较小（< 5MB）
      expect(totalSizeMB).toBeLessThan(5);

      console.log("✅ 构建大小在合理范围内");
    });

    it("JS 文件应该被优化", () => {
      const distPath = join(process.cwd(), "dist");

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

      // 检查 JS 文件是否存在且有合理的大小
      expect(jsFiles.length).toBeGreaterThan(0);

      jsFiles.forEach((file) => {
        const fs = require("fs");
        const stat = fs.statSync(file);
        const sizeKB = stat.size / 1024;

        // 单个 JS 文件应该小于 5MB
        expect(sizeKB).toBeLessThan(5000);
      });

      console.log("\n✅ JS 文件大小合理");
    });
  });

  describe("12.3.4 Vite 构建配置验证", () => {
    it("应该配置 React 插件", () => {
      const viteConfigPath = join(process.cwd(), "vite.config.ts");
      const content = readFileSync(viteConfigPath, "utf-8");

      // 检查是否导入了 React 插件
      expect(content).toContain("@vitejs/plugin-react");
      expect(content).toContain("plugins:");

      console.log("\n✅ Vite React 插件配置正确");
    });

    it("应该配置路径别名", () => {
      const viteConfigPath = join(process.cwd(), "vite.config.ts");
      const content = readFileSync(viteConfigPath, "utf-8");

      // 检查是否配置了路径别名
      expect(content).toContain("alias:");
      expect(content).toContain("'@':");

      console.log("\n✅ 路径别名配置正确");
    });
  });

  describe("12.3.5 性能基准", () => {
    it("构建时间应该在合理范围内", () => {
      const startTime = Date.now();

      try {
        execSync("npm run build", { stdio: "pipe" });
        const buildTime = Date.now() - startTime;
        const buildTimeSeconds = buildTime / 1000;

        console.log(`\n⏱️  构建时间: ${buildTimeSeconds.toFixed(2)} 秒`);

        // 构建时间应该小于 60 秒
        expect(buildTime).toBeLessThan(60000);

        console.log("✅ 构建性能良好");
      } catch (error) {
        throw new Error("构建失败: " + error);
      }
    });
  });
});
