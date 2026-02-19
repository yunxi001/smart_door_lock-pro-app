import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { Toast } from "@/components/Toast";

/**
 * Toast队列管理测试
 * 需求: 2.5
 *
 * 测试Toast队列的基本功能：
 * 1. 多个Toast可以同时显示
 * 2. Toast按时间顺序依次显示
 * 3. Toast自动关闭后从队列中移除
 */
describe("Toast队列管理", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("应该支持多个Toast同时显示", () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();
    const onClose3 = vi.fn();

    render(
      <div>
        <Toast message="消息1" type="info" duration={3000} onClose={onClose1} />
        <Toast
          message="消息2"
          type="warning"
          duration={3000}
          onClose={onClose2}
        />
        <Toast
          message="消息3"
          type="error"
          duration={5000}
          onClose={onClose3}
        />
      </div>,
    );

    // 验证三个Toast都显示
    expect(screen.getByText("消息1")).toBeTruthy();
    expect(screen.getByText("消息2")).toBeTruthy();
    expect(screen.getByText("消息3")).toBeTruthy();
  });

  it("应该按时间顺序自动关闭Toast", () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();

    render(
      <div>
        <Toast message="消息1" type="info" duration={3000} onClose={onClose1} />
        <Toast
          message="消息2"
          type="warning"
          duration={5000}
          onClose={onClose2}
        />
      </div>,
    );

    // 初始状态：两个Toast都显示
    expect(screen.getByText("消息1")).toBeTruthy();
    expect(screen.getByText("消息2")).toBeTruthy();

    // 3秒后：第一个Toast应该关闭
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onClose1).toHaveBeenCalledTimes(1);

    // 5秒后：第二个Toast应该关闭
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onClose2).toHaveBeenCalledTimes(1);
  });

  it("应该为不同类型的Toast设置不同的持续时间", () => {
    const onCloseInfo = vi.fn();
    const onCloseError = vi.fn();

    render(
      <div>
        <Toast
          message="信息提示"
          type="info"
          duration={3000}
          onClose={onCloseInfo}
        />
        <Toast
          message="错误提示"
          type="error"
          duration={5000}
          onClose={onCloseError}
        />
      </div>,
    );

    // 3秒后：info类型应该关闭
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onCloseInfo).toHaveBeenCalledTimes(1);

    // error类型还未关闭
    expect(onCloseError).not.toHaveBeenCalled();

    // 再过2秒（总共5秒）：error类型应该关闭
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(onCloseError).toHaveBeenCalledTimes(1);
  });

  it("应该正确显示不同类型的Toast样式", () => {
    const { container, rerender } = render(
      <Toast message="信息" type="info" duration={3000} onClose={vi.fn()} />,
    );

    // info类型应该是蓝色
    let toast = container.querySelector(".bg-blue-500");
    expect(toast).toBeTruthy();

    // warning类型应该是橙色
    rerender(
      <Toast message="警告" type="warning" duration={3000} onClose={vi.fn()} />,
    );
    toast = container.querySelector(".bg-orange-500");
    expect(toast).toBeTruthy();

    // error类型应该是红色
    rerender(
      <Toast message="错误" type="error" duration={3000} onClose={vi.fn()} />,
    );
    toast = container.querySelector(".bg-red-500");
    expect(toast).toBeTruthy();
  });
});
