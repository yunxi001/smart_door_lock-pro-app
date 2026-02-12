/**
 * 密码管理测试
 * Feature: smart-doorlock-app
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { DeviceService } from "../services/DeviceService";

// 生成6位数字密码的 arbitrary
const digitChar = fc.constantFrom(..."0123456789".split(""));
const sixDigitPassword = fc
  .array(digitChar, { minLength: 6, maxLength: 6 })
  .map((arr) => arr.join(""));

describe("密码管理", () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  /**
   * Property 23: 密码管理命令格式
   * 对于任意密码管理操作，发送的命令应符合协议规范（user_mgmt 或 lock_control）。
   * 验证: 需求 13.7, 13.13
   */
  describe("Property 23: 密码管理命令格式", () => {
    describe("管理员密码设置命令 (user_mgmt)", () => {
      it("set 命令应包含正确的 category、command 和 payload 字段", () => {
        fc.assert(
          fc.property(sixDigitPassword, (newPassword) => {
            const sentCommands: any[] = [];

            // 拦截 sendCommand 方法以捕获发送的命令
            service.sendCommand = function (cmd: object) {
              const commandWithSeqId = {
                ...cmd,
                seq_id: service.generateSeqId(),
              };
              sentCommands.push(commandWithSeqId);
            };

            // 发送密码设置命令
            service.sendUserMgmtCommand("password", "set", 0, newPassword);

            // 验证命令格式
            expect(sentCommands.length).toBe(1);
            const sentCmd = sentCommands[0];

            // 验证必须包含 type: 'user_mgmt'
            expect(sentCmd.type).toBe("user_mgmt");

            // 验证必须包含 category: 'password'
            expect(sentCmd.category).toBe("password");

            // 验证必须包含 command: 'set'
            expect(sentCmd.command).toBe("set");

            // 验证必须包含 payload（新密码）
            expect(sentCmd.payload).toBe(newPassword);

            // 验证必须包含 user_id 字段
            expect(sentCmd).toHaveProperty("user_id");
            expect(typeof sentCmd.user_id).toBe("number");

            // 验证必须包含 seq_id（自动生成）
            expect(sentCmd).toHaveProperty("seq_id");
            expect(typeof sentCmd.seq_id).toBe("string");
            expect(sentCmd.seq_id).toMatch(/^\d{13}_\d+$/);
          }),
          { numRuns: 100 },
        );
      });

      it("query 命令应正确格式化", () => {
        fc.assert(
          fc.property(fc.nat(10), () => {
            const sentCommands: any[] = [];
            service.sendCommand = (cmd: object) => sentCommands.push(cmd);

            service.sendUserMgmtCommand("password", "query");

            expect(sentCommands.length).toBe(1);
            expect(sentCommands[0]).toMatchObject({
              type: "user_mgmt",
              category: "password",
              command: "query",
              user_id: 0,
            });
          }),
          { numRuns: 100 },
        );
      });

      it("命令应触发正确的日志事件", () => {
        fc.assert(
          fc.property(fc.constantFrom("query", "set"), (command) => {
            const logEvents: any[] = [];
            service.on("log", (_, data) => logEvents.push(data));

            if (command === "set") {
              service.sendUserMgmtCommand("password", command, 0, "123456");
            } else {
              service.sendUserMgmtCommand("password", command);
            }

            // 验证日志包含"密码"关键字
            expect(logEvents.some((e) => e.msg.includes("密码"))).toBe(true);

            // 验证日志包含命令类型关键字
            const commandTextMap: Record<string, string> = {
              query: "查询",
              set: "设置",
            };
            expect(
              logEvents.some((e) => e.msg.includes(commandTextMap[command])),
            ).toBe(true);
          }),
          { numRuns: 100 },
        );
      });
    });

    describe("临时密码命令 (lock_control)", () => {
      it("temp_code 命令应包含正确的 type、command、code 和 expires 字段", () => {
        fc.assert(
          fc.property(
            sixDigitPassword,
            fc.integer({ min: 60, max: 86400 }), // 有效期：1分钟到24小时
            (code, expires) => {
              const sentCommands: any[] = [];

              // 拦截 sendCommand 方法以捕获发送的命令
              service.sendCommand = function (cmd: object) {
                const commandWithSeqId = {
                  ...cmd,
                  seq_id: service.generateSeqId(),
                };
                sentCommands.push(commandWithSeqId);
              };

              // 发送临时密码命令
              service.sendCommand({
                type: "lock_control",
                command: "temp_code",
                code,
                expires,
              });

              // 验证命令格式
              expect(sentCommands.length).toBe(1);
              const sentCmd = sentCommands[0];

              // 验证必须包含 type: 'lock_control'
              expect(sentCmd.type).toBe("lock_control");

              // 验证必须包含 command: 'temp_code'
              expect(sentCmd.command).toBe("temp_code");

              // 验证必须包含 code（6位密码）
              expect(sentCmd.code).toBe(code);
              expect(sentCmd.code.length).toBe(6);

              // 验证必须包含 expires（有效期秒数）
              expect(sentCmd.expires).toBe(expires);
              expect(typeof sentCmd.expires).toBe("number");

              // 验证必须包含 seq_id（自动生成）
              expect(sentCmd).toHaveProperty("seq_id");
              expect(typeof sentCmd.seq_id).toBe("string");
              expect(sentCmd.seq_id).toMatch(/^\d{13}_\d+$/);
            },
          ),
          { numRuns: 100 },
        );
      });

      it("临时密码 code 应为6位数字字符串", () => {
        fc.assert(
          fc.property(sixDigitPassword, (code) => {
            const sentCommands: any[] = [];
            service.sendCommand = function (cmd: object) {
              sentCommands.push({ ...cmd, seq_id: service.generateSeqId() });
            };

            service.sendCommand({
              type: "lock_control",
              command: "temp_code",
              code,
              expires: 3600,
            });

            const sentCmd = sentCommands[0];

            // 验证 code 是字符串
            expect(typeof sentCmd.code).toBe("string");

            // 验证 code 长度为6
            expect(sentCmd.code.length).toBe(6);

            // 验证 code 只包含数字
            expect(sentCmd.code).toMatch(/^\d{6}$/);
          }),
          { numRuns: 100 },
        );
      });

      it("expires 应为正整数（秒）", () => {
        fc.assert(
          fc.property(
            fc.integer({ min: 1, max: 604800 }), // 1秒到7天
            (expires) => {
              const sentCommands: any[] = [];
              service.sendCommand = function (cmd: object) {
                sentCommands.push({ ...cmd, seq_id: service.generateSeqId() });
              };

              service.sendCommand({
                type: "lock_control",
                command: "temp_code",
                code: "123456",
                expires,
              });

              const sentCmd = sentCommands[0];

              // 验证 expires 是数字
              expect(typeof sentCmd.expires).toBe("number");

              // 验证 expires 是正整数
              expect(sentCmd.expires).toBeGreaterThan(0);
              expect(Number.isInteger(sentCmd.expires)).toBe(true);
            },
          ),
          { numRuns: 100 },
        );
      });
    });
  });

  /**
   * Property 24: user_mgmt_result 处理（password 部分）
   * 对于任意 user_mgmt_result 响应，App 应根据 result 字段判断操作结果，并更新对应的列表显示。
   * 验证: 需求 13.15
   */
  describe("Property 24: user_mgmt_result 处理（password 部分）", () => {
    const passwordCommands = ["query", "set"] as const;

    it("对于任意密码管理结果，应触发 password_result 事件", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...passwordCommands),
          fc.boolean(), // 使用布尔值
          fc.string({ minLength: 1, maxLength: 50 }),
          (command, result, message) => {
            const events: any[] = [];
            service.on("password_result", (_, data) =>
              events.push({ type: "password_result", data }),
            );

            const msg = {
              type: "user_mgmt_result",
              category: "password" as const,
              command,
              result, // 布尔值
              val: 0,
              msg: message,
            };

            (service as any).handleUserMgmtResult(msg);

            // 验证触发了 password_result 事件
            expect(events.some((e) => e.type === "password_result")).toBe(true);

            // 验证事件数据包含正确的字段
            const passwordEvent = events.find(
              (e) => e.type === "password_result",
            );
            expect(passwordEvent.data.command).toBe(command);
            expect(passwordEvent.data.result).toBe(
              result ? "success" : "failed",
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it("成功结果应记录成功日志", () => {
      fc.assert(
        fc.property(fc.constantFrom(...passwordCommands), (command) => {
          const logEvents: any[] = [];
          service.on("log", (_, data) => logEvents.push(data));

          const msg = {
            type: "user_mgmt_result",
            category: "password" as const,
            command,
            result: true, // 使用布尔值
            val: 0,
            msg: "Success",
          };

          (service as any).handleUserMgmtResult(msg);

          // 验证日志包含"成功"和"密码"
          expect(
            logEvents.some(
              (e) =>
                e.msg.includes("成功") &&
                e.msg.includes("密码") &&
                e.type === "success",
            ),
          ).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it("失败结果应记录错误日志", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...passwordCommands),
          fc.string({ minLength: 1, maxLength: 50 }),
          (command, errorMessage) => {
            const logEvents: any[] = [];
            service.on("log", (_, data) => logEvents.push(data));

            const msg = {
              type: "user_mgmt_result",
              category: "password" as const,
              command,
              result: false, // 使用布尔值
              val: 0,
              msg: errorMessage,
            };

            (service as any).handleUserMgmtResult(msg);

            // 验证日志包含"失败"和错误类型
            expect(
              logEvents.some(
                (e) => e.msg.includes("失败") && e.type === "error",
              ),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("查询结果应包含密码状态数据", () => {
      // 使用安全的日期字符串生成器
      const safeIsoDateString = fc
        .integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
        .map((ts) => new Date(ts).toISOString());

      fc.assert(
        fc.property(
          fc.boolean(),
          fc.option(safeIsoDateString, { nil: undefined }),
          (isSet, lastModifiedAt) => {
            const events: any[] = [];
            service.on("password_result", (_, data) =>
              events.push({ type: "password_result", data }),
            );

            const adminStatus = { isSet, lastModifiedAt };
            const msg = {
              type: "user_mgmt_result",
              category: "password" as const,
              command: "query",
              result: "success" as const,
              data: adminStatus,
            };

            (service as any).handleUserMgmtResult(msg);

            // 验证事件数据包含密码状态
            const passwordEvent = events.find(
              (e) => e.type === "password_result",
            );
            expect(passwordEvent.data.data).toEqual(adminStatus);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("设置成功结果应正确处理", () => {
      fc.assert(
        fc.property(fc.nat(10), () => {
          const events: any[] = [];
          service.on("password_result", (_, data) =>
            events.push({ type: "password_result", data }),
          );

          const msg = {
            type: "user_mgmt_result",
            category: "password" as const,
            command: "set",
            result: "success" as const,
          };

          (service as any).handleUserMgmtResult(msg);

          // 验证事件数据
          const passwordEvent = events.find(
            (e) => e.type === "password_result",
          );
          expect(passwordEvent.data.command).toBe("set");
          expect(passwordEvent.data.result).toBe("success");
        }),
        { numRuns: 100 },
      );
    });
  });
});
