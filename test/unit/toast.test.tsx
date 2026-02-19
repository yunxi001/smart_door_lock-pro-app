/**
 * Toast通知组件测试
 *
 * 测试Toast组件的自动关闭、手动关闭和样式功能
 * 需求: 2.3, 2.4, 17.1, 17.2, 17.3, 17.4, 17.5, 17.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Toast } from "@/components/Toast";

describe("Toast组件测试", () => {
  beforeEach(() => {
    // 使用假定时器
    vi.useFakeTimers();
  });

  afterEach(() => {
    // 清理定时器
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("基本渲染", () => {
    it("应正确渲染Toast消息", () => {
      const onClose = vi.fn();
      render(<Toast message="测试消息" onClose={onClose} />);

      expect(screen.getByText("测试消息")).toBeTruthy();
    });

    it("应显示关闭按钮", () => {
      const onClose = vi.fn();
      render(<Toast message="测试消息" onClose={onClose} />);

      const closeButton = screen.getByRole("button", { name: "关闭通知" });
      expect(closeButton).toBeTruthy();
    });
  });

  describe("自动关闭功能 (需求 2.3, 17.3)", () => {
    it("应在默认3000ms后自动调用onClose", () => {
      const onClose = vi.fn();
      render(<Toast message="测试消息" onClose={onClose} />);

      // 初始状态不应调用onClose
      expect(onClose).not.toHaveBeenCalled();

      // 快进3000ms
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // 应该调用onClose
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("应在自定义duration后自动调用onClose", () => {
      const onClose = vi.fn();
      render(<Toast message="测试消息" duration={5000} onClose={onClose} />);

      // 快进4999ms，不应调用
      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(onClose).not.toHaveBeenCalled();

      // 再快进1ms，应该调用
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("应在短duration后自动调用onClose", () => {
      const onClose = vi.fn();
      render(<Toast message="测试消息" duration={1000} onClose={onClose} />);

      // 快进1000ms
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("手动关闭功能 (需求 2.4, 17.4)", () => {
    it("点击关闭按钮应立即调用onClose", () => {
      const onClose = vi.fn();

      render(<Toast message="测试消息" onClose={onClose} />);

      const closeButton = screen.getByRole("button", { name: "关闭通知" });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("手动关闭应在自动关闭之前生效", () => {
      const onClose = vi.fn();

      render(<Toast message="测试消息" duration={3000} onClose={onClose} />);

      // 快进1000ms
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 手动关闭
      const closeButton = screen.getByRole("button", { name: "关闭通知" });
      fireEvent.click(closeButton);

      // 手动关闭应该立即调用onClose
      expect(onClose).toHaveBeenCalled();
      expect(onClose.mock.calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("不同type的样式 (需求 17.5, 17.6)", () => {
    it("info类型应显示蓝色背景", () => {
      const onClose = vi.fn();
      const { container } = render(
        <Toast message="信息提示" type="info" onClose={onClose} />,
      );

      const toastDiv = container.querySelector(".bg-blue-500");
      expect(toastDiv).toBeTruthy();
      expect(toastDiv?.classList.contains("text-white")).toBe(true);
    });

    it("warning类型应显示橙色背景", () => {
      const onClose = vi.fn();
      const { container } = render(
        <Toast message="警告提示" type="warning" onClose={onClose} />,
      );

      const toastDiv = container.querySelector(".bg-orange-500");
      expect(toastDiv).toBeTruthy();
      expect(toastDiv?.classList.contains("text-white")).toBe(true);
    });

    it("error类型应显示红色背景", () => {
      const onClose = vi.fn();
      const { container } = render(
        <Toast message="错误提示" type="error" onClose={onClose} />,
      );

      const toastDiv = container.querySelector(".bg-red-500");
      expect(toastDiv).toBeTruthy();
      expect(toastDiv?.classList.contains("text-white")).toBe(true);
    });

    it("默认类型应显示蓝色背景", () => {
      const onClose = vi.fn();
      const { container } = render(
        <Toast message="默认提示" onClose={onClose} />,
      );

      const toastDiv = container.querySelector(".bg-blue-500");
      expect(toastDiv).toBeTruthy();
    });
  });

  describe("样式和布局 (需求 17.1)", () => {
    it("应包含顶部居中定位样式", () => {
      const onClose = vi.fn();
      const { container } = render(
        <Toast message="测试消息" onClose={onClose} />,
      );

      const toastContainer = container.querySelector(".fixed");
      expect(toastContainer?.classList.contains("top-4")).toBe(true);
      expect(toastContainer?.classList.contains("left-1/2")).toBe(true);
      expect(toastContainer?.classList.contains("transform")).toBe(true);
      expect(toastContainer?.classList.contains("-translate-x-1/2")).toBe(true);
    });

    it("应包含z-index确保在最上层", () => {
      const onClose = vi.fn();
      const { container } = render(
        <Toast message="测试消息" onClose={onClose} />,
      );

      const toastContainer = container.querySelector(".fixed");
      expect(toastContainer?.classList.contains("z-50")).toBe(true);
    });

    it("应包含渐入动画类", () => {
      const onClose = vi.fn();
      const { container } = render(
        <Toast message="测试消息" onClose={onClose} />,
      );

      const toastContainer = container.querySelector(".animate-fade-in");
      expect(toastContainer).toBeTruthy();
    });

    it("应包含圆角和阴影样式", () => {
      const onClose = vi.fn();
      const { container } = render(
        <Toast message="测试消息" onClose={onClose} />,
      );

      const toastDiv = container.querySelector(".rounded-lg");
      expect(toastDiv).toBeTruthy();
      expect(toastDiv?.classList.contains("shadow-lg")).toBe(true);
    });

    it("应包含最小和最大宽度限制", () => {
      const onClose = vi.fn();
      const { container } = render(
        <Toast message="测试消息" onClose={onClose} />,
      );

      const toastDiv = container.querySelector('[class*="min-w-"]');
      expect(toastDiv).toBeTruthy();
      expect(toastDiv?.classList.contains("max-w-[90vw]")).toBe(true);
    });
  });

  describe("长消息处理", () => {
    it("应正确显示长消息", () => {
      const onClose = vi.fn();
      const longMessage = "这是一条非常长的消息".repeat(10);

      render(<Toast message={longMessage} onClose={onClose} />);

      expect(screen.getByText(longMessage)).toBeTruthy();
    });

    it("消息文本应包含换行样式", () => {
      const onClose = vi.fn();
      const { container } = render(
        <Toast message="测试消息" onClose={onClose} />,
      );

      const messageP = container.querySelector("p.break-words");
      expect(messageP).toBeTruthy();
    });
  });

  describe("组件卸载清理", () => {
    it("组件卸载时应清理定时器", () => {
      const onClose = vi.fn();
      const { unmount } = render(
        <Toast message="测试消息" duration={3000} onClose={onClose} />,
      );

      // 快进1000ms
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // 卸载组件
      unmount();

      // 继续快进，不应调用onClose
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe("多个Toast实例", () => {
    it("应支持同时渲染多个Toast", () => {
      const onClose1 = vi.fn();
      const onClose2 = vi.fn();

      const { container } = render(
        <>
          <Toast message="消息1" type="info" onClose={onClose1} />
          <Toast message="消息2" type="warning" onClose={onClose2} />
        </>,
      );

      expect(screen.getByText("消息1")).toBeTruthy();
      expect(screen.getByText("消息2")).toBeTruthy();

      const toasts = container.querySelectorAll(".fixed");
      expect(toasts).toHaveLength(2);
    });

    it("每个Toast应独立计时", () => {
      const onClose1 = vi.fn();
      const onClose2 = vi.fn();

      render(
        <>
          <Toast message="消息1" duration={2000} onClose={onClose1} />
          <Toast message="消息2" duration={4000} onClose={onClose2} />
        </>,
      );

      // 快进2000ms，第一个应关闭
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onClose1).toHaveBeenCalledTimes(1);
      expect(onClose2).not.toHaveBeenCalled();

      // 再快进2000ms，第二个应关闭
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(onClose2).toHaveBeenCalledTimes(1);
    });
  });

  describe("可访问性", () => {
    it("关闭按钮应有正确的aria-label", () => {
      const onClose = vi.fn();
      render(<Toast message="测试消息" onClose={onClose} />);

      const closeButton = screen.getByRole("button", { name: "关闭通知" });
      expect(closeButton.getAttribute("aria-label")).toBe("关闭通知");
    });

    it("关闭按钮应可点击", () => {
      const onClose = vi.fn();

      render(<Toast message="测试消息" onClose={onClose} />);

      const closeButton = screen.getByRole("button", { name: "关闭通知" });

      // 点击按钮
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
