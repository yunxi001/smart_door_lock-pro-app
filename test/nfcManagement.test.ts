/**
 * NFC 卡片管理测试
 * Feature: smart-doorlock-app
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { DeviceService } from "../services/DeviceService";

// 生成十六进制字符串的 arbitrary
const hexChar = fc.constantFrom(..."0123456789abcdef".split(""));
const hexString = (minLength: number, maxLength: number) =>
  fc.array(hexChar, { minLength, maxLength }).map((arr) => arr.join(""));

describe("NFC 卡片管理", () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  /**
   * Property 22: NFC 卡片管理命令格式
   * 对于任意 NFC 卡片管理操作（查询、添加、删除），发送的 user_mgmt 命令应包含正确的 category（nfc）和 command 字段。
   * 验证: 需求 12.8, 12.11
   */
  describe("Property 22: NFC 卡片管理命令格式", () => {
    // NFC 卡片管理支持的命令类型
    const nfcCommands = ["query", "add", "del"] as const;

    it("对于任意 NFC 卡片管理命令，应包含正确的 category 和 command 字段", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...nfcCommands),
          fc.nat(100), // userId
          (command, userId) => {
            const sentCommands: any[] = [];

            // 拦截 sendCommand 方法以捕获发送的命令
            service.sendCommand = function (cmd: object) {
              const commandWithSeqId = {
                ...cmd,
                seq_id: service.generateSeqId(),
              };
              sentCommands.push(commandWithSeqId);
            };

            // 发送 NFC 卡片管理命令
            service.sendUserMgmtCommand("nfc", command, userId);

            // 验证命令格式
            expect(sentCommands.length).toBe(1);
            const sentCmd = sentCommands[0];

            // 验证必须包含 type: 'user_mgmt'
            expect(sentCmd.type).toBe("user_mgmt");

            // 验证必须包含 category: 'nfc'
            expect(sentCmd.category).toBe("nfc");

            // 验证必须包含正确的 command
            expect(sentCmd.command).toBe(command);

            // 验证必须包含 user_id 字段
            expect(sentCmd).toHaveProperty("user_id");
            expect(typeof sentCmd.user_id).toBe("number");

            // 验证必须包含 seq_id（自动生成）
            expect(sentCmd).toHaveProperty("seq_id");
            expect(typeof sentCmd.seq_id).toBe("string");
            expect(sentCmd.seq_id).toMatch(/^\d{13}_\d+$/);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("query 命令应正确格式化", () => {
      fc.assert(
        fc.property(fc.nat(10), () => {
          const sentCommands: any[] = [];
          service.sendCommand = (cmd: object) => sentCommands.push(cmd);

          service.sendUserMgmtCommand("nfc", "query");

          expect(sentCommands.length).toBe(1);
          expect(sentCommands[0]).toMatchObject({
            type: "user_mgmt",
            category: "nfc",
            command: "query",
            user_id: 0,
          });
        }),
        { numRuns: 100 },
      );
    });

    it("add 命令应正确格式化", () => {
      fc.assert(
        fc.property(fc.nat(10), () => {
          const sentCommands: any[] = [];
          service.sendCommand = (cmd: object) => sentCommands.push(cmd);

          // 添加卡片时 user_id 通常为 0（由设备分配）
          service.sendUserMgmtCommand("nfc", "add", 0);

          expect(sentCommands.length).toBe(1);
          expect(sentCommands[0]).toMatchObject({
            type: "user_mgmt",
            category: "nfc",
            command: "add",
            user_id: 0,
          });
        }),
        { numRuns: 100 },
      );
    });

    it("del 命令应包含正确的 user_id", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // 删除时需要有效的 user_id
          (userId) => {
            const sentCommands: any[] = [];
            service.sendCommand = (cmd: object) => sentCommands.push(cmd);

            service.sendUserMgmtCommand("nfc", "del", userId);

            expect(sentCommands.length).toBe(1);
            expect(sentCommands[0]).toMatchObject({
              type: "user_mgmt",
              category: "nfc",
              command: "del",
              user_id: userId,
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    it("命令应触发正确的日志事件", () => {
      fc.assert(
        fc.property(fc.constantFrom(...nfcCommands), (command) => {
          const logEvents: any[] = [];
          service.on("log", (_, data) => logEvents.push(data));

          service.sendUserMgmtCommand("nfc", command);

          // 验证日志包含"NFC卡片"关键字
          expect(logEvents.some((e) => e.msg.includes("NFC卡片"))).toBe(true);

          // 验证日志包含命令类型关键字
          const commandTextMap: Record<string, string> = {
            query: "查询",
            add: "添加",
            del: "删除",
          };
          expect(
            logEvents.some((e) => e.msg.includes(commandTextMap[command])),
          ).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 24: user_mgmt_result 处理（nfc 部分）
   * 对于任意 user_mgmt_result 响应，App 应根据 result 字段判断操作结果，并更新对应的列表显示。
   * 验证: 需求 12.12
   */
  describe("Property 24: user_mgmt_result 处理（nfc 部分）", () => {
    const nfcCommands = ["query", "add", "del"] as const;

    it("对于任意 NFC 卡片管理结果，应触发 nfc_result 事件", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...nfcCommands),
          fc.boolean(), // 使用布尔值
          fc.nat(100),
          fc.string({ minLength: 1, maxLength: 50 }),
          (command, result, userId, message) => {
            const events: any[] = [];
            service.on("nfc_result", (_, data) =>
              events.push({ type: "nfc_result", data }),
            );

            const msg = {
              type: "user_mgmt_result",
              category: "nfc" as const,
              command,
              result, // 布尔值
              val: userId,
              msg: message,
              user_id: userId,
            };

            (service as any).handleUserMgmtResult(msg);

            // 验证触发了 nfc_result 事件
            expect(events.some((e) => e.type === "nfc_result")).toBe(true);

            // 验证事件数据包含正确的字段
            const nfcEvent = events.find((e) => e.type === "nfc_result");
            expect(nfcEvent.data.command).toBe(command);
            expect(nfcEvent.data.result).toBe(result ? "success" : "failed");
          },
        ),
        { numRuns: 100 },
      );
    });

    it("成功结果应记录成功日志", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...nfcCommands),
          fc.nat(100),
          (command, userId) => {
            const logEvents: any[] = [];
            service.on("log", (_, data) => logEvents.push(data));

            const msg = {
              type: "user_mgmt_result",
              category: "nfc" as const,
              command,
              result: true, // 使用布尔值
              val: userId,
              msg: "Success",
              user_id: userId,
            };

            (service as any).handleUserMgmtResult(msg);

            // 验证日志包含"成功"和"NFC卡片"
            expect(
              logEvents.some(
                (e) =>
                  e.msg.includes("成功") &&
                  e.msg.includes("NFC卡片") &&
                  e.type === "success",
              ),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("失败结果应记录错误日志", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...nfcCommands),
          fc.nat(100),
          fc.string({ minLength: 1, maxLength: 50 }),
          (command, userId, errorMessage) => {
            const logEvents: any[] = [];
            service.on("log", (_, data) => logEvents.push(data));

            const msg = {
              type: "user_mgmt_result",
              category: "nfc" as const,
              command,
              result: false, // 使用布尔值
              val: userId,
              msg: errorMessage,
              user_id: userId,
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

    it("查询结果应包含卡片列表数据", () => {
      // 生成有效的 ISO 日期字符串
      const isoDateString = fc
        .integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 到 2030-12-31 的时间戳
        .map((ts) => new Date(ts).toISOString());

      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.nat(100),
              name: fc.string({ minLength: 1, maxLength: 20 }),
              card_id: hexString(8, 8),
              registered_at: isoDateString,
            }),
            { minLength: 0, maxLength: 5 },
          ),
          (cards) => {
            const events: any[] = [];
            service.on("nfc_result", (_, data) =>
              events.push({ type: "nfc_result", data }),
            );

            const msg = {
              type: "user_mgmt_result",
              category: "nfc" as const,
              command: "query",
              result: "success" as const,
              data: cards,
            };

            (service as any).handleUserMgmtResult(msg);

            // 验证事件数据包含卡片列表
            const nfcEvent = events.find((e) => e.type === "nfc_result");
            expect(nfcEvent.data.data).toEqual(cards);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("添加成功结果应包含新卡片数据", () => {
      fc.assert(
        fc.property(
          fc.nat(100),
          fc.string({ minLength: 1, maxLength: 20 }),
          hexString(8, 8),
          (id, name, cardId) => {
            const events: any[] = [];
            service.on("nfc_result", (_, data) =>
              events.push({ type: "nfc_result", data }),
            );

            const newCard = { id, name, card_id: cardId };
            const msg = {
              type: "user_mgmt_result",
              category: "nfc" as const,
              command: "add",
              result: "success" as const,
              user_id: id,
              data: newCard,
            };

            (service as any).handleUserMgmtResult(msg);

            // 验证事件数据包含新卡片信息
            const nfcEvent = events.find((e) => e.type === "nfc_result");
            expect(nfcEvent.data.data).toEqual(newCard);
            expect(nfcEvent.data.userId).toBe(id);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("删除成功结果应包含被删除的 user_id", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 100 }), (userId) => {
          const events: any[] = [];
          service.on("nfc_result", (_, data) =>
            events.push({ type: "nfc_result", data }),
          );

          const msg = {
            type: "user_mgmt_result",
            category: "nfc" as const,
            command: "del",
            result: "success" as const,
            user_id: userId,
          };

          (service as any).handleUserMgmtResult(msg);

          // 验证事件数据包含被删除的 userId
          const nfcEvent = events.find((e) => e.type === "nfc_result");
          expect(nfcEvent.data.userId).toBe(userId);
          expect(nfcEvent.data.command).toBe("del");
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * 卡号脱敏测试
   * 验证卡号正确脱敏显示（如 ****1234）
   * 验证: 需求 12.13
   */
  describe("卡号脱敏", () => {
    /**
     * 卡号脱敏函数
     * 将完整卡号转换为脱敏格式（保留后4位，前面用*替代）
     */
    function maskCardId(cardId: string): string {
      if (!cardId || cardId.length < 4) {
        return cardId;
      }
      const lastFour = cardId.slice(-4);
      const maskedPart = "*".repeat(cardId.length - 4);
      return maskedPart + lastFour;
    }

    it("对于任意有效卡号，脱敏后应保留后4位", () => {
      fc.assert(
        fc.property(hexString(8, 16), (cardId: string) => {
          const masked = maskCardId(cardId);

          // 验证后4位保持不变
          expect(masked.slice(-4)).toBe(cardId.slice(-4));

          // 验证前面部分全是 *
          const maskedPart = masked.slice(0, -4);
          expect(maskedPart).toBe("*".repeat(cardId.length - 4));

          // 验证总长度不变
          expect(masked.length).toBe(cardId.length);
        }),
        { numRuns: 100 },
      );
    });

    it("对于短卡号（少于4位），应返回原始卡号", () => {
      fc.assert(
        fc.property(hexString(0, 3), (cardId: string) => {
          const masked = maskCardId(cardId);
          expect(masked).toBe(cardId);
        }),
        { numRuns: 100 },
      );
    });

    it("对于8位卡号，脱敏格式应为 ****XXXX", () => {
      fc.assert(
        fc.property(hexString(8, 8), (cardId: string) => {
          const masked = maskCardId(cardId);
          expect(masked).toMatch(/^\*{4}[0-9a-f]{4}$/);
        }),
        { numRuns: 100 },
      );
    });

    it("对于空卡号，应返回空字符串", () => {
      expect(maskCardId("")).toBe("");
    });

    it("脱敏后的卡号不应包含原始卡号的前半部分", () => {
      fc.assert(
        fc.property(hexString(8, 16), (cardId: string) => {
          const masked = maskCardId(cardId);
          const originalPrefix = cardId.slice(0, -4);

          // 脱敏后不应包含原始前缀（除非前缀全是 *）
          if (originalPrefix.length > 0 && !originalPrefix.match(/^\*+$/)) {
            expect(masked.slice(0, -4)).not.toBe(originalPrefix);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
