/**
 * ChatBubble 组件测试
 * 验证需求: 16.1, 16.2, 16.3, 16.4, 16.5
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import ChatBubble from "@/components/ChatBubble";

describe("ChatBubble 组件", () => {
  describe("基本渲染 (需求 16.1, 16.2, 16.3)", () => {
    it("应正确渲染assistant角色的消息", () => {
      render(<ChatBubble role="assistant" content="你好，我是智能门锁助手" />);
      expect(screen.getByText("你好，我是智能门锁助手")).toBeTruthy();
    });

    it("应正确渲染user角色的消息", () => {
      render(<ChatBubble role="user" content="请帮我开门" />);
      expect(screen.getByText("请帮我开门")).toBeTruthy();
    });

    it("应正确显示消息内容", () => {
      const content = "这是一条测试消息";
      render(<ChatBubble role="assistant" content={content} />);
      expect(screen.getByText(content)).toBeTruthy();
    });
  });

  describe("assistant角色对齐和颜色 (需求 16.1)", () => {
    it("应左对齐显示", () => {
      const { container } = render(
        <ChatBubble role="assistant" content="测试消息" />,
      );

      const wrapper = container.querySelector(".justify-start");
      expect(wrapper).toBeTruthy();
    });

    it("应显示灰色背景", () => {
      const { container } = render(
        <ChatBubble role="assistant" content="测试消息" />,
      );

      const bubble = container.querySelector(".bg-gray-200");
      expect(bubble).toBeTruthy();
    });

    it("应显示深色文字", () => {
      const { container } = render(
        <ChatBubble role="assistant" content="测试消息" />,
      );

      const bubble = container.querySelector(".text-gray-900");
      expect(bubble).toBeTruthy();
    });
  });

  describe("user角色对齐和颜色 (需求 16.2)", () => {
    it("应右对齐显示", () => {
      const { container } = render(
        <ChatBubble role="user" content="测试消息" />,
      );

      const wrapper = container.querySelector(".justify-end");
      expect(wrapper).toBeTruthy();
    });

    it("应显示蓝色背景", () => {
      const { container } = render(
        <ChatBubble role="user" content="测试消息" />,
      );

      const bubble = container.querySelector(".bg-blue-500");
      expect(bubble).toBeTruthy();
    });

    it("应显示白色文字", () => {
      const { container } = render(
        <ChatBubble role="user" content="测试消息" />,
      );

      const bubble = container.querySelector(".text-white");
      expect(bubble).toBeTruthy();
    });
  });

  describe("长文本换行 (需求 16.4)", () => {
    it("应自动换行显示长文本", () => {
      const longContent =
        "这是一条非常长的消息内容，用于测试文本自动换行功能。当文本内容超过气泡最大宽度时，应该自动换行显示，而不是溢出容器。";
      const { container } = render(
        <ChatBubble role="assistant" content={longContent} />,
      );

      // 验证包含whitespace-pre-wrap类（支持换行）
      const textElement = container.querySelector(".whitespace-pre-wrap");
      expect(textElement).toBeTruthy();

      // 验证包含break-words类（支持单词断行）
      const breakWordsElement = container.querySelector(".break-words");
      expect(breakWordsElement).toBeTruthy();

      // 验证内容正确显示
      expect(screen.getByText(longContent)).toBeTruthy();
    });

    it("应保留文本中的换行符", () => {
      const contentWithNewlines = "第一行\n第二行\n第三行";
      const { container } = render(
        <ChatBubble role="user" content={contentWithNewlines} />,
      );

      // whitespace-pre-wrap会保留换行符
      const textElement = container.querySelector(".whitespace-pre-wrap");
      expect(textElement).toBeTruthy();
      expect(textElement?.textContent).toBe(contentWithNewlines);
    });

    it("应限制气泡最大宽度为80%", () => {
      const { container } = render(
        <ChatBubble role="assistant" content="测试消息" />,
      );

      const bubble = container.querySelector(".max-w-\\[80\\%\\]");
      expect(bubble).toBeTruthy();
    });
  });

  describe("时间戳显示 (需求 16.5)", () => {
    it("当提供timestamp时应显示时间戳", () => {
      const timestamp = "2024-12-11 10:30";
      render(
        <ChatBubble
          role="assistant"
          content="测试消息"
          timestamp={timestamp}
        />,
      );

      expect(screen.getByText(timestamp)).toBeTruthy();
    });

    it("当未提供timestamp时不应显示时间戳", () => {
      const { container } = render(
        <ChatBubble role="user" content="测试消息" />,
      );

      // 查找时间戳元素（text-xs类）
      const timestamps = container.querySelectorAll(".text-xs");
      expect(timestamps.length).toBe(0);
    });

    it("时间戳应使用小号字体", () => {
      const { container } = render(
        <ChatBubble role="assistant" content="测试消息" timestamp="10:30" />,
      );

      const timestamp = container.querySelector(".text-xs");
      expect(timestamp).toBeTruthy();
    });

    it("assistant角色的时间戳应有适当的透明度", () => {
      const { container } = render(
        <ChatBubble role="assistant" content="测试消息" timestamp="10:30" />,
      );

      const timestamp = container.querySelector(".opacity-60");
      expect(timestamp).toBeTruthy();
    });

    it("user角色的时间戳应有适当的透明度", () => {
      const { container } = render(
        <ChatBubble role="user" content="测试消息" timestamp="10:30" />,
      );

      const timestamp = container.querySelector(".opacity-70");
      expect(timestamp).toBeTruthy();
    });
  });

  describe("组件结构", () => {
    it("应包含外层flex容器", () => {
      const { container } = render(
        <ChatBubble role="assistant" content="测试消息" />,
      );

      const wrapper = container.querySelector(".flex");
      expect(wrapper).toBeTruthy();
    });

    it("应包含圆角样式", () => {
      const { container } = render(
        <ChatBubble role="user" content="测试消息" />,
      );

      const bubble = container.querySelector(".rounded-lg");
      expect(bubble).toBeTruthy();
    });

    it("应包含适当的内边距", () => {
      const { container } = render(
        <ChatBubble role="assistant" content="测试消息" />,
      );

      const bubble = container.querySelector(".px-4");
      expect(bubble).toBeTruthy();
      expect(bubble?.classList.contains("py-2")).toBe(true);
    });

    it("应包含底部间距", () => {
      const { container } = render(
        <ChatBubble role="user" content="测试消息" />,
      );

      const wrapper = container.querySelector(".mb-2");
      expect(wrapper).toBeTruthy();
    });
  });

  describe("不同角色的一致性", () => {
    const roles: Array<"assistant" | "user"> = ["assistant", "user"];

    it("所有角色都应正确渲染", () => {
      roles.forEach((role) => {
        const { container } = render(
          <ChatBubble role={role} content="测试消息" />,
        );
        const bubble = container.querySelector("div");
        expect(bubble).toBeTruthy();
      });
    });

    it("所有角色都应显示内容", () => {
      roles.forEach((role) => {
        render(<ChatBubble role={role} content={`${role}的消息`} />);
        expect(screen.getByText(`${role}的消息`)).toBeTruthy();
      });
    });

    it("所有角色都应支持时间戳", () => {
      roles.forEach((role) => {
        const { container } = render(
          <ChatBubble role={role} content="测试消息" timestamp="10:30" />,
        );
        // 使用container查询避免多个元素冲突
        const timestamp = container.querySelector(".text-xs");
        expect(timestamp).toBeTruthy();
        expect(timestamp?.textContent).toBe("10:30");
      });
    });
  });

  describe("边界情况", () => {
    it("应正确处理空字符串内容", () => {
      const { container } = render(<ChatBubble role="assistant" content="" />);

      const bubble = container.querySelector(".bg-gray-200");
      expect(bubble).toBeTruthy();
    });

    it("应正确处理特殊字符", () => {
      const specialContent = "特殊字符: <>&\"'";
      render(<ChatBubble role="user" content={specialContent} />);
      expect(screen.getByText(specialContent)).toBeTruthy();
    });

    it("应正确处理多行文本", () => {
      const multilineContent = "第一行\n第二行\n第三行";
      const { container } = render(
        <ChatBubble role="assistant" content={multilineContent} />,
      );
      // 使用textContent验证，因为getByText会规范化空白字符
      const textElement = container.querySelector(".whitespace-pre-wrap");
      expect(textElement?.textContent).toBe(multilineContent);
    });

    it("应正确处理空时间戳字符串", () => {
      const { container } = render(
        <ChatBubble role="user" content="测试消息" timestamp="" />,
      );

      // 空字符串被视为falsy，不会渲染时间戳元素
      const timestamp = container.querySelector(".text-xs");
      expect(timestamp).toBeFalsy();
    });
  });
});
