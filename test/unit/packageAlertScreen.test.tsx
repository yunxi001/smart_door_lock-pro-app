/**
 * PackageAlertScreen组件测试
 *
 * 测试快递警报详情页的筛选、分页、照片懒加载和返回功能
 * 需求: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PackageAlertScreen from "@/screens/PackageAlertScreen";
import type { PackageAlert } from "@/types";

// 创建测试用的快递警报数据
const createMockAlert = (
  id: number,
  overrides?: Partial<PackageAlert>,
): PackageAlert => ({
  id,
  device_id: "device_001",
  session_id: `session_${id}`,
  threat_level: "medium",
  action: "taking",
  description: `检测到快递异常行为${id}`,
  photo_path: `/photos/alert_${id}.jpg`,
  photo_thumbnail: `/photos/alert_${id}_thumb.jpg`,
  voice_warning_sent: false,
  notified: false,
  created_at: new Date().toISOString(),
  ts: Date.now() - id * 3600000,
  ...overrides,
});

describe("PackageAlertScreen组件测试", () => {
  describe("基本渲染 (需求 9.1)", () => {
    it("应显示顶部导航栏", () => {
      render(<PackageAlertScreen alerts={[]} onBack={() => {}} />);
      expect(screen.getByText("快递警报")).toBeTruthy();
    });

    it("应显示返回按钮", () => {
      const { container } = render(
        <PackageAlertScreen alerts={[]} onBack={() => {}} />,
      );

      const backButton = container.querySelector('button[aria-label="返回"]');
      expect(backButton).toBeTruthy();
    });

    it("应显示威胁等级筛选器", () => {
      render(<PackageAlertScreen alerts={[]} onBack={() => {}} />);

      expect(screen.getByText("威胁等级")).toBeTruthy();
      expect(screen.getByText("全部")).toBeTruthy();
      expect(screen.getByText("低威胁")).toBeTruthy();
      expect(screen.getByText("中威胁")).toBeTruthy();
      expect(screen.getByText("高威胁")).toBeTruthy();
    });

    it("顶部导航栏应有sticky定位", () => {
      const { container } = render(
        <PackageAlertScreen alerts={[]} onBack={() => {}} />,
      );

      const navbar = container.querySelector(".sticky.top-0");
      expect(navbar).toBeTruthy();
    });
  });

  describe("返回按钮 (需求 9.9)", () => {
    it("点击返回按钮应调用onBack回调", () => {
      const onBack = vi.fn();
      const { container } = render(
        <PackageAlertScreen alerts={[]} onBack={onBack} />,
      );

      const backButton = container.querySelector('button[aria-label="返回"]');
      fireEvent.click(backButton!);

      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it("返回按钮应有正确的样式", () => {
      const { container } = render(
        <PackageAlertScreen alerts={[]} onBack={() => {}} />,
      );

      const backButton = container.querySelector('button[aria-label="返回"]');
      expect(backButton?.classList.contains("hover:bg-gray-100")).toBe(true);
      expect(backButton?.classList.contains("rounded-lg")).toBe(true);
    });
  });

  describe("威胁等级筛选 (需求 9.2)", () => {
    // 辅助函数:获取筛选按钮
    const getFilterButton = (text: string) => {
      const buttons = screen.getAllByText(text);
      return buttons.find((el) => el.tagName === "BUTTON") as HTMLElement;
    };

    it("默认应选中全部", () => {
      render(<PackageAlertScreen alerts={[]} onBack={() => {}} />);

      const allButton = screen.getByText("全部");
      expect(allButton.classList.contains("bg-blue-500")).toBe(true);
      expect(allButton.classList.contains("text-white")).toBe(true);
    });

    it("点击低威胁应筛选低威胁警报", () => {
      const alerts = [
        createMockAlert(1, { threat_level: "low", description: "低威胁警报" }),
        createMockAlert(2, {
          threat_level: "medium",
          description: "中威胁警报",
        }),
        createMockAlert(3, { threat_level: "high", description: "高威胁警报" }),
      ];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      const lowButton = getFilterButton("低威胁");
      fireEvent.click(lowButton);

      expect(screen.getByText("低威胁警报")).toBeTruthy();
      expect(screen.queryByText("中威胁警报")).toBeNull();
      expect(screen.queryByText("高威胁警报")).toBeNull();
    });

    it("点击中威胁应筛选中威胁警报", () => {
      const alerts = [
        createMockAlert(1, { threat_level: "low", description: "低威胁警报" }),
        createMockAlert(2, {
          threat_level: "medium",
          description: "中威胁警报",
        }),
        createMockAlert(3, { threat_level: "high", description: "高威胁警报" }),
      ];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      const mediumButton = getFilterButton("中威胁");
      fireEvent.click(mediumButton);

      expect(screen.queryByText("低威胁警报")).toBeNull();
      expect(screen.getByText("中威胁警报")).toBeTruthy();
      expect(screen.queryByText("高威胁警报")).toBeNull();
    });

    it("点击高威胁应筛选高威胁警报", () => {
      const alerts = [
        createMockAlert(1, { threat_level: "low", description: "低威胁警报" }),
        createMockAlert(2, {
          threat_level: "medium",
          description: "中威胁警报",
        }),
        createMockAlert(3, { threat_level: "high", description: "高威胁警报" }),
      ];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      const highButton = getFilterButton("高威胁");
      fireEvent.click(highButton);

      expect(screen.queryByText("低威胁警报")).toBeNull();
      expect(screen.queryByText("中威胁警报")).toBeNull();
      expect(screen.getByText("高威胁警报")).toBeTruthy();
    });

    it("点击全部应显示所有警报", () => {
      const alerts = [
        createMockAlert(1, { threat_level: "low", description: "低威胁警报" }),
        createMockAlert(2, {
          threat_level: "medium",
          description: "中威胁警报",
        }),
        createMockAlert(3, { threat_level: "high", description: "高威胁警报" }),
      ];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      // 先筛选低威胁
      fireEvent.click(getFilterButton("低威胁"));
      expect(screen.queryByText("中威胁警报")).toBeNull();

      // 再点击全部
      fireEvent.click(screen.getByText("全部"));
      expect(screen.getByText("低威胁警报")).toBeTruthy();
      expect(screen.getByText("中威胁警报")).toBeTruthy();
      expect(screen.getByText("高威胁警报")).toBeTruthy();
    });

    it("筛选按钮应有正确的激活样式", () => {
      render(<PackageAlertScreen alerts={[]} onBack={() => {}} />);

      const lowButton = getFilterButton("低威胁");
      fireEvent.click(lowButton);

      // 按钮本身就是元素,不需要parentElement
      expect(lowButton.classList.contains("bg-green-500")).toBe(true);
      expect(lowButton.classList.contains("text-white")).toBe(true);
    });

    it("筛选后显示空状态", () => {
      const alerts = [
        createMockAlert(1, { threat_level: "low", description: "低威胁警报" }),
      ];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      // 筛选高威胁（没有数据）
      fireEvent.click(getFilterButton("高威胁"));
      expect(screen.getByText("暂无符合条件的警报")).toBeTruthy();
    });
  });

  describe("警报列表显示 (需求 9.6, 9.7, 9.8)", () => {
    it("应显示警报列表", () => {
      const alerts = [
        createMockAlert(1, { description: "警报1" }),
        createMockAlert(2, { description: "警报2" }),
      ];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      expect(screen.getByText("警报1")).toBeTruthy();
      expect(screen.getByText("警报2")).toBeTruthy();
    });

    it("每条警报应显示威胁等级标识", () => {
      const alerts = [
        createMockAlert(1, { threat_level: "low" }),
        createMockAlert(2, { threat_level: "high" }),
      ];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      // 应该有多个威胁等级标识（包括筛选器中的）
      const lowThreatBadges = screen.getAllByText("低威胁");
      const highThreatBadges = screen.getAllByText("高威胁");

      expect(lowThreatBadges.length).toBeGreaterThan(0);
      expect(highThreatBadges.length).toBeGreaterThan(0);
    });

    it("每条警报应显示时间戳", () => {
      const alerts = [createMockAlert(1)];
      const { container } = render(
        <PackageAlertScreen alerts={alerts} onBack={() => {}} />,
      );

      // 验证时间戳文本存在
      const timeElements = container.querySelectorAll(".text-sm.text-gray-500");
      expect(timeElements.length).toBeGreaterThan(0);
    });

    it("每条警报应显示行为类型", () => {
      const alerts = [createMockAlert(1, { action: "taking" })];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      expect(screen.getByText(/行为类型/)).toBeTruthy();
      expect(screen.getByText(/拿走/)).toBeTruthy();
    });

    it("每条警报应显示行为描述", () => {
      const alerts = [
        createMockAlert(1, { description: "检测到非主人拿走快递" }),
      ];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      expect(screen.getByText("检测到非主人拿走快递")).toBeTruthy();
    });

    it("每条警报应显示语音警告状态", () => {
      const alerts = [
        createMockAlert(1, { voice_warning_sent: true }),
        createMockAlert(2, { voice_warning_sent: false }),
      ];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      expect(screen.getByText("已发送")).toBeTruthy();
      expect(screen.getByText("未发送")).toBeTruthy();
    });

    it("每条警报应显示通知状态", () => {
      const alerts = [
        createMockAlert(1, { notified: true }),
        createMockAlert(2, { notified: false }),
      ];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      const notifiedElements = screen.getAllByText("已通知");
      const unnotifiedElements = screen.getAllByText("未通知");

      expect(notifiedElements.length).toBeGreaterThan(0);
      expect(unnotifiedElements.length).toBeGreaterThan(0);
    });

    it("空状态应显示提示文本", () => {
      render(<PackageAlertScreen alerts={[]} onBack={() => {}} />);

      expect(screen.getByText("暂无符合条件的警报")).toBeTruthy();
    });
  });

  describe("照片懒加载 (需求 9.3, 9.4, 9.5)", () => {
    it("应使用LazyImage组件加载照片", () => {
      const alerts = [createMockAlert(1, { photo_path: "/photos/test.jpg" })];

      const { container } = render(
        <PackageAlertScreen alerts={alerts} onBack={() => {}} />,
      );

      // 验证LazyImage组件的容器存在
      const lazyImageContainer = container.querySelector(
        ".relative.bg-gray-200",
      );
      expect(lazyImageContainer).toBeTruthy();
    });

    it("当没有photo_path时不应显示图片", () => {
      const alerts = [createMockAlert(1, { photo_path: "" })];

      const { container } = render(
        <PackageAlertScreen alerts={alerts} onBack={() => {}} />,
      );

      // 不应该有LazyImage容器
      const lazyImageContainer = container.querySelector(
        ".relative.bg-gray-200",
      );
      expect(lazyImageContainer).toBeNull();
    });

    it("多个警报应各自加载照片", () => {
      const alerts = [
        createMockAlert(1, { photo_path: "/photos/1.jpg" }),
        createMockAlert(2, { photo_path: "/photos/2.jpg" }),
        createMockAlert(3, { photo_path: "/photos/3.jpg" }),
      ];

      const { container } = render(
        <PackageAlertScreen alerts={alerts} onBack={() => {}} />,
      );

      const lazyImageContainers = container.querySelectorAll(
        ".relative.bg-gray-200",
      );
      expect(lazyImageContainers).toHaveLength(3);
    });
  });

  describe("分页加载 (需求 9.1)", () => {
    it("默认应显示前10条警报", () => {
      const alerts = Array.from({ length: 20 }, (_, i) =>
        createMockAlert(i + 1, { description: `警报${i + 1}` }),
      );

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      // 验证前10条存在
      expect(screen.getByText("警报1")).toBeTruthy();
      expect(screen.getByText("警报10")).toBeTruthy();

      // 验证第11条不存在
      expect(screen.queryByText("警报11")).toBeNull();
    });

    it("当有更多数据时应显示加载更多按钮", () => {
      const alerts = Array.from({ length: 15 }, (_, i) =>
        createMockAlert(i + 1),
      );

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      expect(screen.getByText("加载更多")).toBeTruthy();
    });

    it("当没有更多数据时不应显示加载更多按钮", () => {
      const alerts = Array.from({ length: 5 }, (_, i) =>
        createMockAlert(i + 1),
      );

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      expect(screen.queryByText("加载更多")).toBeNull();
    });

    it("点击加载更多应显示更多警报", () => {
      const alerts = Array.from({ length: 25 }, (_, i) =>
        createMockAlert(i + 1, { description: `警报${i + 1}` }),
      );

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      // 初始只显示前10条
      expect(screen.getByText("警报10")).toBeTruthy();
      expect(screen.queryByText("警报11")).toBeNull();

      // 点击加载更多
      fireEvent.click(screen.getByText("加载更多"));

      // 现在应该显示前20条
      expect(screen.getByText("警报11")).toBeTruthy();
      expect(screen.getByText("警报20")).toBeTruthy();
      expect(screen.queryByText("警报21")).toBeNull();
    });

    it("多次点击加载更多应继续加载", () => {
      const alerts = Array.from({ length: 35 }, (_, i) =>
        createMockAlert(i + 1, { description: `警报${i + 1}` }),
      );

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      // 第一次加载更多
      fireEvent.click(screen.getByText("加载更多"));
      expect(screen.getByText("警报20")).toBeTruthy();

      // 第二次加载更多
      fireEvent.click(screen.getByText("加载更多"));
      expect(screen.getByText("警报30")).toBeTruthy();

      // 第三次加载更多
      fireEvent.click(screen.getByText("加载更多"));
      expect(screen.getByText("警报35")).toBeTruthy();

      // 应该没有更多了
      expect(screen.queryByText("加载更多")).toBeNull();
    });

    it("筛选后分页应重置", () => {
      // 辅助函数
      const getFilterButton = (text: string) => {
        const buttons = screen.getAllByText(text);
        return buttons.find((el) => el.tagName === "BUTTON") as HTMLElement;
      };

      const alerts = Array.from({ length: 25 }, (_, i) =>
        createMockAlert(i + 1, {
          threat_level: i < 15 ? "low" : "high",
          description: `警报${i + 1}`,
        }),
      );

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      // 加载更多
      fireEvent.click(screen.getByText("加载更多"));
      expect(screen.getByText("警报20")).toBeTruthy();

      // 切换筛选
      fireEvent.click(getFilterButton("低威胁"));

      // 应该只显示前10条低威胁警报
      expect(screen.getByText("警报1")).toBeTruthy();
      expect(screen.getByText("警报10")).toBeTruthy();
      expect(screen.queryByText("警报11")).toBeNull();
    });
  });

  describe("时间格式化", () => {
    it("应正确格式化时间戳", () => {
      const now = new Date();
      const alerts = [createMockAlert(1, { ts: now.getTime() })];

      const { container } = render(
        <PackageAlertScreen alerts={alerts} onBack={() => {}} />,
      );

      // 验证时间格式包含年月日时分
      const timeText = container.querySelector(".text-sm.text-gray-500");
      expect(timeText?.textContent).toBeTruthy();
    });
  });

  describe("行为类型映射", () => {
    it("应正确映射所有行为类型", () => {
      const alerts = [
        createMockAlert(1, { action: "normal" }),
        createMockAlert(2, { action: "passing" }),
        createMockAlert(3, { action: "searching" }),
        createMockAlert(4, { action: "taking" }),
        createMockAlert(5, { action: "damaging" }),
      ];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      expect(screen.getByText(/正常/)).toBeTruthy();
      expect(screen.getByText(/路过/)).toBeTruthy();
      expect(screen.getByText(/翻找/)).toBeTruthy();
      expect(screen.getByText(/拿走/)).toBeTruthy();
      expect(screen.getByText(/破坏/)).toBeTruthy();
    });

    it("应处理未知的行为类型", () => {
      const alerts = [createMockAlert(1, { action: "unknown" as any })];

      const { container } = render(
        <PackageAlertScreen alerts={alerts} onBack={() => {}} />,
      );

      // 应该显示原始值
      expect(container.textContent).toContain("unknown");
    });
  });

  describe("布局和样式", () => {
    it("应有正确的背景色", () => {
      const { container } = render(
        <PackageAlertScreen alerts={[]} onBack={() => {}} />,
      );

      const mainContainer = container.querySelector(".min-h-screen.bg-gray-50");
      expect(mainContainer).toBeTruthy();
    });

    it("警报卡片应有正确的样式", () => {
      const alerts = [createMockAlert(1)];
      const { container } = render(
        <PackageAlertScreen alerts={alerts} onBack={() => {}} />,
      );

      const alertCard = container.querySelector(
        ".bg-white.rounded-lg.shadow-sm",
      );
      expect(alertCard).toBeTruthy();
    });

    it("警报列表应有正确的间距", () => {
      const alerts = [createMockAlert(1), createMockAlert(2)];
      const { container } = render(
        <PackageAlertScreen alerts={alerts} onBack={() => {}} />,
      );

      const listContainer = container.querySelector(".space-y-4");
      expect(listContainer).toBeTruthy();
    });
  });

  describe("边界情况", () => {
    it("应处理空的alerts数组", () => {
      render(<PackageAlertScreen alerts={[]} onBack={() => {}} />);

      expect(screen.getByText("暂无符合条件的警报")).toBeTruthy();
    });

    it("应处理单条警报", () => {
      const alerts = [createMockAlert(1)];

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      expect(screen.getByText("检测到快递异常行为1")).toBeTruthy();
      expect(screen.queryByText("加载更多")).toBeNull();
    });

    it("应处理大量警报", () => {
      const alerts = Array.from({ length: 100 }, (_, i) =>
        createMockAlert(i + 1),
      );

      const { container } = render(
        <PackageAlertScreen alerts={alerts} onBack={() => {}} />,
      );

      // 应该只渲染前10条
      const alertCards = container.querySelectorAll(
        ".bg-white.rounded-lg.shadow-sm",
      );
      expect(alertCards.length).toBeLessThanOrEqual(10);
    });

    it("应处理空的description", () => {
      const alerts = [createMockAlert(1, { description: "" })];

      const { container } = render(
        <PackageAlertScreen alerts={alerts} onBack={() => {}} />,
      );

      // 应该能正常渲染
      expect(
        container.querySelector(".bg-white.rounded-lg.shadow-sm"),
      ).toBeTruthy();
    });
  });

  describe("交互体验", () => {
    it("多次点击返回按钮应多次调用回调", () => {
      const onBack = vi.fn();
      const { container } = render(
        <PackageAlertScreen alerts={[]} onBack={onBack} />,
      );

      const backButton = container.querySelector('button[aria-label="返回"]');
      fireEvent.click(backButton!);
      fireEvent.click(backButton!);
      fireEvent.click(backButton!);

      expect(onBack).toHaveBeenCalledTimes(3);
    });

    it("筛选和分页应能正常配合", () => {
      // 辅助函数
      const getFilterButton = (text: string) => {
        const buttons = screen.getAllByText(text);
        return buttons.find((el) => el.tagName === "BUTTON") as HTMLElement;
      };

      const alerts = Array.from({ length: 30 }, (_, i) =>
        createMockAlert(i + 1, {
          threat_level: i < 20 ? "low" : "high",
          description: `警报${i + 1}`,
        }),
      );

      render(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      // 筛选低威胁
      fireEvent.click(getFilterButton("低威胁"));

      // 应该显示前10条低威胁
      expect(screen.getByText("警报1")).toBeTruthy();
      expect(screen.getByText("警报10")).toBeTruthy();

      // 加载更多
      fireEvent.click(screen.getByText("加载更多"));

      // 应该显示前20条低威胁
      expect(screen.getByText("警报20")).toBeTruthy();
      expect(screen.queryByText("警报21")).toBeNull();
    });
  });

  describe("组件可复用性", () => {
    it("应支持动态更新alerts数据", () => {
      const { rerender } = render(
        <PackageAlertScreen alerts={[]} onBack={() => {}} />,
      );

      expect(screen.getByText("暂无符合条件的警报")).toBeTruthy();

      const alerts = [createMockAlert(1)];
      rerender(<PackageAlertScreen alerts={alerts} onBack={() => {}} />);

      expect(screen.queryByText("暂无符合条件的警报")).toBeNull();
      expect(screen.getByText("检测到快递异常行为1")).toBeTruthy();
    });

    it("应支持动态更新onBack回调", () => {
      const onBack1 = vi.fn();
      const onBack2 = vi.fn();

      const { rerender, container } = render(
        <PackageAlertScreen alerts={[]} onBack={onBack1} />,
      );

      const backButton = container.querySelector('button[aria-label="返回"]');
      fireEvent.click(backButton!);
      expect(onBack1).toHaveBeenCalledTimes(1);
      expect(onBack2).toHaveBeenCalledTimes(0);

      rerender(<PackageAlertScreen alerts={[]} onBack={onBack2} />);

      fireEvent.click(backButton!);
      expect(onBack1).toHaveBeenCalledTimes(1);
      expect(onBack2).toHaveBeenCalledTimes(1);
    });
  });
});
