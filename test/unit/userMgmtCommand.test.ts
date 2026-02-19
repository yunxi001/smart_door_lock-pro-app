/**
 * 用户管理命令验证测试
 * 验证 sendUserMgmtCommand() 方法符合需求 8.1, 8.2, 8.3, 8.4
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DeviceService } from "../services/DeviceService";

describe("任务 8.1: 验证 sendUserMgmtCommand() 方法", () => {
  let service: DeviceService;
  let sentCommands: any[] = [];

  beforeEach(() => {
    service = new DeviceService();
    sentCommands = [];

    // Mock sendCommand 方法以捕获发送的命令
    service.sendCommand = (cmd: object) => {
      sentCommands.push(cmd);
      return null;
    };
  });

  describe("需求 8.1: 方法存在性验证", () => {
    it("sendUserMgmtCommand 方法应该存在", () => {
      expect(typeof service.sendUserMgmtCommand).toBe("function");
    });

    it("sendUserMgmtCommand 方法应该可调用", () => {
      expect(() => {
        service.sendUserMgmtCommand("finger", "query");
      }).not.toThrow();
    });
  });

  describe("需求 8.2: 支持三种 category", () => {
    it("应该支持 finger 类别", () => {
      service.sendUserMgmtCommand("finger", "query");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("user_mgmt");
      expect(sentCommands[0].category).toBe("finger");
    });

    it("应该支持 nfc 类别", () => {
      service.sendUserMgmtCommand("nfc", "query");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("user_mgmt");
      expect(sentCommands[0].category).toBe("nfc");
    });

    it("应该支持 password 类别", () => {
      service.sendUserMgmtCommand("password", "query");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("user_mgmt");
      expect(sentCommands[0].category).toBe("password");
    });
  });

  describe("需求 8.3: 支持五种 command", () => {
    const categories: Array<"finger" | "nfc" | "password"> = [
      "finger",
      "nfc",
      "password",
    ];
    const commands = ["add", "del", "clear", "query", "set"];

    commands.forEach((command) => {
      it(`应该支持 ${command} 命令`, () => {
        // 对每个类别测试该命令
        categories.forEach((category) => {
          sentCommands = [];

          if (command === "set" && category === "password") {
            // set 命令需要 payload
            service.sendUserMgmtCommand(category, command, 0, "123456");
          } else if (command === "del") {
            // del 命令需要 user_id
            service.sendUserMgmtCommand(category, command, 1);
          } else {
            service.sendUserMgmtCommand(category, command);
          }

          expect(sentCommands.length).toBe(1);
          expect(sentCommands[0].command).toBe(command);
        });
      });
    });
  });

  describe("需求 8.4: payload 字段在 category=password 且 command=set 时添加", () => {
    it("当 category=password 且 command=set 时，应该包含 payload 字段", () => {
      const testPassword = "test123456";
      service.sendUserMgmtCommand("password", "set", 0, testPassword);

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("user_mgmt");
      expect(sentCommands[0].category).toBe("password");
      expect(sentCommands[0].command).toBe("set");
      expect(sentCommands[0].payload).toBe(testPassword);
    });

    it("当 category=password 但 command≠set 时，不应该包含 payload 字段", () => {
      service.sendUserMgmtCommand("password", "query");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].payload).toBeUndefined();
    });

    it("当 category≠password 时，即使提供 payload 也应该添加", () => {
      // 虽然协议规范主要针对 password，但方法实现允许其他类别也使用 payload
      service.sendUserMgmtCommand("finger", "add", 0, "some_data");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].payload).toBe("some_data");
    });
  });

  describe("消息格式验证", () => {
    it("发送的消息应该包含所有必需字段", () => {
      service.sendUserMgmtCommand("finger", "add", 5);

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd).toHaveProperty("type");
      expect(cmd).toHaveProperty("category");
      expect(cmd).toHaveProperty("command");
      expect(cmd).toHaveProperty("user_id");

      expect(cmd.type).toBe("user_mgmt");
      expect(cmd.category).toBe("finger");
      expect(cmd.command).toBe("add");
      expect(cmd.user_id).toBe(5);
    });

    it("当未提供 userId 时，应该默认为 0", () => {
      service.sendUserMgmtCommand("nfc", "query");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].user_id).toBe(0);
    });

    it("当提供 userId 时，应该使用提供的值", () => {
      service.sendUserMgmtCommand("finger", "del", 123);

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].user_id).toBe(123);
    });
  });

  describe("日志记录验证", () => {
    it("发送命令时应该记录日志", () => {
      const logEvents: any[] = [];
      service.on("log", (_, data) => logEvents.push(data));

      service.sendUserMgmtCommand("finger", "query");

      expect(logEvents.length).toBeGreaterThan(0);
      expect(
        logEvents.some((e) => e.msg.includes("指纹") && e.msg.includes("查询")),
      ).toBe(true);
    });

    it("日志应该包含正确的类别和命令描述", () => {
      const testCases = [
        {
          category: "finger" as const,
          command: "add",
          expectedCategory: "指纹",
          expectedCommand: "添加",
        },
        {
          category: "nfc" as const,
          command: "del",
          expectedCategory: "NFC卡片",
          expectedCommand: "删除",
        },
        {
          category: "password" as const,
          command: "set",
          expectedCategory: "密码",
          expectedCommand: "设置",
        },
      ];

      testCases.forEach(
        ({ category, command, expectedCategory, expectedCommand }) => {
          const logEvents: any[] = [];
          service.on("log", (_, data) => logEvents.push(data));

          if (category === "password" && command === "set") {
            service.sendUserMgmtCommand(category, command, 0, "123456");
          } else {
            service.sendUserMgmtCommand(category, command);
          }

          expect(
            logEvents.some(
              (e) =>
                e.msg.includes(expectedCategory) &&
                e.msg.includes(expectedCommand),
            ),
          ).toBe(true);
        },
      );
    });
  });

  describe("边界情况测试", () => {
    it("应该正确处理 user_id 为 0 的情况", () => {
      service.sendUserMgmtCommand("finger", "add", 0);

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].user_id).toBe(0);
    });

    it("应该正确处理空字符串 payload", () => {
      service.sendUserMgmtCommand("password", "set", 0, "");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].payload).toBe("");
    });

    it("应该正确处理 undefined payload", () => {
      service.sendUserMgmtCommand("password", "query", 0, undefined);

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].payload).toBeUndefined();
    });
  });
});
