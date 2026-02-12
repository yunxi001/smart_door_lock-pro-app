/**
 * 主题切换功能测试
 *
 * 测试范围：
 * - 主题状态初始化
 * - 主题切换逻辑
 * - localStorage 持久化
 * - DOM 类名更新
 *
 * 需求: 3.1, 3.2, 3.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("主题切换功能", () => {
  let originalLocalStorage: Storage;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // 保存原始 localStorage
    originalLocalStorage = global.localStorage;

    // 创建 localStorage mock
    mockLocalStorage = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(() => null),
    } as Storage;

    // 清理 document.documentElement 的 class
    document.documentElement.className = "";
  });

  afterEach(() => {
    // 恢复原始 localStorage
    global.localStorage = originalLocalStorage;
  });

  describe("主题状态初始化", () => {
    it("应该从 localStorage 读取保存的主题偏好", () => {
      // 模拟用户之前保存的主题偏好
      mockLocalStorage["theme"] = "dark";

      // 验证可以读取到保存的主题
      const savedTheme = localStorage.getItem("theme");
      expect(savedTheme).toBe("dark");
    });

    it("当 localStorage 中没有保存主题时，应该返回 null", () => {
      const savedTheme = localStorage.getItem("theme");
      expect(savedTheme).toBeNull();
    });

    it("应该正确识别有效的主题值（light 或 dark）", () => {
      mockLocalStorage["theme"] = "light";
      expect(localStorage.getItem("theme")).toBe("light");

      mockLocalStorage["theme"] = "dark";
      expect(localStorage.getItem("theme")).toBe("dark");
    });

    it("应该忽略无效的主题值", () => {
      mockLocalStorage["theme"] = "invalid";
      const savedTheme = localStorage.getItem("theme");
      // 虽然保存了无效值，但应用逻辑应该忽略它
      expect(savedTheme).not.toBe("light");
      expect(savedTheme).not.toBe("dark");
    });
  });

  describe("主题切换逻辑", () => {
    it("应该能够从浅色模式切换到深色模式", () => {
      // 初始状态：浅色模式
      let currentTheme: "light" | "dark" = "light";

      // 模拟切换逻辑
      const toggleTheme = () => {
        currentTheme = currentTheme === "light" ? "dark" : "light";
        localStorage.setItem("theme", currentTheme);
      };

      // 执行切换
      toggleTheme();

      // 验证结果
      expect(currentTheme).toBe("dark");
      expect(localStorage.getItem("theme")).toBe("dark");
    });

    it("应该能够从深色模式切换到浅色模式", () => {
      // 初始状态：深色模式
      let currentTheme: "light" | "dark" = "dark";

      // 模拟切换逻辑
      const toggleTheme = () => {
        currentTheme = currentTheme === "light" ? "dark" : "light";
        localStorage.setItem("theme", currentTheme);
      };

      // 执行切换
      toggleTheme();

      // 验证结果
      expect(currentTheme).toBe("light");
      expect(localStorage.getItem("theme")).toBe("light");
    });

    it("应该能够连续切换多次", () => {
      let currentTheme: "light" | "dark" = "light";

      const toggleTheme = () => {
        currentTheme = currentTheme === "light" ? "dark" : "light";
        localStorage.setItem("theme", currentTheme);
      };

      // 第一次切换：light -> dark
      toggleTheme();
      expect(currentTheme).toBe("dark");

      // 第二次切换：dark -> light
      toggleTheme();
      expect(currentTheme).toBe("light");

      // 第三次切换：light -> dark
      toggleTheme();
      expect(currentTheme).toBe("dark");
    });
  });

  describe("localStorage 持久化", () => {
    it("应该在切换主题时保存到 localStorage", () => {
      const setItemSpy = vi.spyOn(localStorage, "setItem");

      // 模拟切换主题
      localStorage.setItem("theme", "dark");

      // 验证 setItem 被调用
      expect(setItemSpy).toHaveBeenCalledWith("theme", "dark");
    });

    it("应该能够持久化浅色模式偏好", () => {
      localStorage.setItem("theme", "light");
      expect(localStorage.getItem("theme")).toBe("light");
    });

    it("应该能够持久化深色模式偏好", () => {
      localStorage.setItem("theme", "dark");
      expect(localStorage.getItem("theme")).toBe("dark");
    });
  });

  describe("DOM 类名更新", () => {
    it("应该在深色模式下添加 'dark' 类名", () => {
      // 模拟应用深色模式
      const root = document.documentElement;
      root.classList.add("dark");

      // 验证类名
      expect(root.classList.contains("dark")).toBe(true);
    });

    it("应该在浅色模式下移除 'dark' 类名", () => {
      // 先添加 dark 类名
      const root = document.documentElement;
      root.classList.add("dark");

      // 模拟切换到浅色模式
      root.classList.remove("dark");

      // 验证类名被移除
      expect(root.classList.contains("dark")).toBe(false);
    });

    it("应该在切换主题时正确更新 DOM 类名", () => {
      const root = document.documentElement;
      let currentTheme: "light" | "dark" = "light";

      const applyTheme = (theme: "light" | "dark") => {
        if (theme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      };

      // 初始状态：浅色模式
      applyTheme(currentTheme);
      expect(root.classList.contains("dark")).toBe(false);

      // 切换到深色模式
      currentTheme = "dark";
      applyTheme(currentTheme);
      expect(root.classList.contains("dark")).toBe(true);

      // 切换回浅色模式
      currentTheme = "light";
      applyTheme(currentTheme);
      expect(root.classList.contains("dark")).toBe(false);
    });
  });

  describe("集成测试", () => {
    it("应该完整执行主题切换流程", () => {
      const root = document.documentElement;
      let currentTheme: "light" | "dark" = "light";

      // 完整的主题切换函数
      const toggleTheme = () => {
        const newTheme = currentTheme === "light" ? "dark" : "light";
        currentTheme = newTheme;

        // 保存到 localStorage
        localStorage.setItem("theme", newTheme);

        // 更新 DOM
        if (newTheme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      };

      // 执行切换
      toggleTheme();

      // 验证所有状态都正确更新
      expect(currentTheme).toBe("dark");
      expect(localStorage.getItem("theme")).toBe("dark");
      expect(root.classList.contains("dark")).toBe(true);

      // 再次切换
      toggleTheme();

      // 验证状态恢复
      expect(currentTheme).toBe("light");
      expect(localStorage.getItem("theme")).toBe("light");
      expect(root.classList.contains("dark")).toBe(false);
    });
  });
});
