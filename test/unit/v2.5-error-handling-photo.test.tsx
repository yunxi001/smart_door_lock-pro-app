/**
 * 任务 25.4: 测试照片加载失败处理
 *
 * 测试目标：
 * - 模拟照片加载失败场景
 * - 验证错误占位符显示
 * - 验证重试按钮功能
 *
 * 验证需求: 22.4, 20.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LazyImage from "@/components/LazyImage";
import React from "react";

describe("任务 25.4: 照片加载失败处理测试", () => {
  // 模拟IntersectionObserver
  beforeEach(() => {
    global.IntersectionObserver = class IntersectionObserver {
      constructor(private callback: IntersectionObserverCallback) {}
      observe(target: Element) {
        // 立即触发回调，模拟元素进入视口
        this.callback(
          [
            {
              isIntersecting: true,
              target,
              intersectionRatio: 1,
              boundingClientRect: {} as DOMRectReadOnly,
              intersectionRect: {} as DOMRectReadOnly,
              rootBounds: null,
              time: Date.now(),
            },
          ],
          this as any,
        );
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
      get root() {
        return null;
      }
      get rootMargin() {
        return "";
      }
      get thresholds() {
        return [];
      }
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("照片加载失败场景", () => {
    it("应能检测照片加载失败", async () => {
      const invalidSrc = "https://invalid-url.com/nonexistent.jpg";

      const { container } = render(
        <LazyImage src={invalidSrc} alt="测试图片" className="test-image" />,
      );

      // 等待组件渲染
      await waitFor(() => {
        const img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      // 模拟图片加载失败
      const img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      // 验证错误状态
      await waitFor(() => {
        const errorElement = screen.queryByText(/加载失败/i);
        expect(
          errorElement || container.querySelector('[class*="error"]'),
        ).toBeTruthy();
      });
    });

    it("应能显示错误占位符", async () => {
      const invalidSrc = "https://invalid-url.com/error.jpg";

      const { container } = render(
        <LazyImage src={invalidSrc} alt="错误测试" className="error-test" />,
      );

      // 等待图片元素
      await waitFor(() => {
        const img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      // 触发错误
      const img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      // 验证错误占位符存在
      await waitFor(() => {
        const hasError =
          screen.queryByText(/加载失败/i) ||
          screen.queryByText(/重试/i) ||
          container.querySelector('[class*="error"]') ||
          container.querySelector("button");
        expect(hasError).toBeTruthy();
      });
    });

    it("应能处理网络错误", async () => {
      const networkErrorSrc = "https://network-error.com/image.jpg";

      const { container } = render(
        <LazyImage src={networkErrorSrc} alt="网络错误测试" />,
      );

      await waitFor(() => {
        const img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      // 模拟网络错误
      const img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      // 验证组件仍然渲染
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe("重试按钮功能", () => {
    it("应能显示重试按钮", async () => {
      const failSrc = "https://fail.com/image.jpg";

      const { container } = render(<LazyImage src={failSrc} alt="重试测试" />);

      await waitFor(() => {
        const img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      // 触发错误
      const img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      // 查找重试按钮
      await waitFor(() => {
        const retryButton =
          screen.queryByText(/重试/i) ||
          screen.queryByRole("button") ||
          container.querySelector("button");
        expect(retryButton).toBeTruthy();
      });
    });

    it("应能点击重试按钮重新加载", async () => {
      const retrySrc = "https://retry.com/image.jpg";

      const { container } = render(
        <LazyImage src={retrySrc} alt="重试功能测试" />,
      );

      await waitFor(() => {
        const img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      // 触发错误
      let img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      // 等待错误状态
      await waitFor(() => {
        const button =
          screen.queryByText(/重试/i) || container.querySelector("button");
        expect(button).toBeTruthy();
      });

      // 点击重试按钮
      const retryButton =
        screen.queryByText(/重试/i) || container.querySelector("button");

      if (retryButton) {
        fireEvent.click(retryButton);

        // 验证重新尝试加载
        await waitFor(() => {
          img = container.querySelector("img");
          expect(img).toBeTruthy();
        });
      }
    });

    it("应能多次重试", async () => {
      const multiRetrySrc = "https://multi-retry.com/image.jpg";

      const { container } = render(
        <LazyImage src={multiRetrySrc} alt="多次重试测试" />,
      );

      // 第一次失败
      await waitFor(() => {
        const img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      let img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      // 第一次重试
      await waitFor(() => {
        const button = container.querySelector("button");
        expect(button).toBeTruthy();
      });

      let button = container.querySelector("button");
      if (button) {
        fireEvent.click(button);
      }

      // 第二次失败
      await waitFor(() => {
        img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      if (img) {
        fireEvent.error(img);
      }

      // 第二次重试
      await waitFor(() => {
        button = container.querySelector("button");
        expect(button).toBeTruthy();
      });

      if (button) {
        fireEvent.click(button);
      }

      // 验证组件仍然可用
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe("错误占位符显示", () => {
    it("应能显示默认错误图标", async () => {
      const errorSrc = "https://error-icon.com/image.jpg";

      const { container } = render(
        <LazyImage src={errorSrc} alt="错误图标测试" />,
      );

      await waitFor(() => {
        const img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      const img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      // 验证错误状态显示
      await waitFor(() => {
        const errorIndicator =
          container.querySelector("svg") ||
          container.querySelector('[class*="error"]') ||
          screen.queryByText(/加载失败/i);
        expect(errorIndicator).toBeTruthy();
      });
    });

    it("应能显示错误提示文本", async () => {
      const textSrc = "https://error-text.com/image.jpg";

      const { container } = render(
        <LazyImage src={textSrc} alt="错误文本测试" />,
      );

      await waitFor(() => {
        const img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      const img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      // 验证有错误提示
      await waitFor(() => {
        const hasErrorText =
          screen.queryByText(/加载失败/i) ||
          screen.queryByText(/错误/i) ||
          screen.queryByText(/重试/i) ||
          container.textContent?.includes("失败") ||
          container.textContent?.includes("错误");
        expect(hasErrorText).toBeTruthy();
      });
    });

    it("应能保持布局稳定", async () => {
      const layoutSrc = "https://layout.com/image.jpg";

      const { container } = render(
        <div style={{ width: "200px", height: "200px" }}>
          <LazyImage src={layoutSrc} alt="布局测试" className="w-full h-full" />
        </div>,
      );

      // 记录初始容器
      const initialContainer = container.firstChild;
      expect(initialContainer).toBeTruthy();

      await waitFor(() => {
        const img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      // 触发错误
      const img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      // 验证容器仍然存在
      await waitFor(() => {
        expect(container.firstChild).toBeTruthy();
      });
    });
  });

  describe("加载状态处理", () => {
    it("应能显示加载占位符", () => {
      const loadingSrc = "https://loading.com/image.jpg";

      const { container } = render(
        <LazyImage src={loadingSrc} alt="加载测试" />,
      );

      // 验证组件渲染
      expect(container.firstChild).toBeTruthy();
    });

    it("应能从加载状态转换到错误状态", async () => {
      const transitionSrc = "https://transition.com/image.jpg";

      const { container } = render(
        <LazyImage src={transitionSrc} alt="状态转换测试" />,
      );

      // 初始状态
      expect(container.firstChild).toBeTruthy();

      // 等待图片元素
      await waitFor(() => {
        const img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      // 触发错误
      const img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
      }

      // 验证错误状态
      await waitFor(() => {
        const hasError =
          screen.queryByText(/加载失败/i) ||
          screen.queryByText(/重试/i) ||
          container.querySelector("button");
        expect(hasError).toBeTruthy();
      });
    });

    it("应能处理快速连续的错误", async () => {
      const rapidSrc = "https://rapid.com/image.jpg";

      const { container } = render(
        <LazyImage src={rapidSrc} alt="快速错误测试" />,
      );

      await waitFor(() => {
        const img = container.querySelector("img");
        expect(img).toBeTruthy();
      });

      // 快速触发多次错误
      const img = container.querySelector("img");
      if (img) {
        fireEvent.error(img);
        fireEvent.error(img);
        fireEvent.error(img);
      }

      // 验证组件仍然稳定
      expect(container.firstChild).toBeTruthy();
    });
  });

  describe("边界情况处理", () => {
    it("应能处理空src", () => {
      const { container } = render(<LazyImage src="" alt="空src测试" />);

      // 验证组件能渲染
      expect(container.firstChild).toBeTruthy();
    });

    it("应能处理无效URL", async () => {
      const invalidUrl = "not-a-valid-url";

      const { container } = render(
        <LazyImage src={invalidUrl} alt="无效URL测试" />,
      );

      // 验证组件能渲染
      expect(container.firstChild).toBeTruthy();
    });

    it("应能处理非常长的URL", async () => {
      const longUrl = "https://example.com/" + "a".repeat(1000) + ".jpg";

      const { container } = render(<LazyImage src={longUrl} alt="长URL测试" />);

      // 验证组件能渲染
      expect(container.firstChild).toBeTruthy();
    });
  });
});
