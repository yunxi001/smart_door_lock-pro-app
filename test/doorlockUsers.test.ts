import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeviceService } from "../services/DeviceService";

/**
 * 门锁用户管理测试套件
 * 协议 v2.4 新增功能测试
 *
 * 测试范围：
 * 1. user_mgmt 命令支持 user_name 字段
 * 2. 新增 doorlock_users 查询接口
 */
describe("门锁用户管理 (协议 v2.4)", () => {
  let service: DeviceService;
  let mockWs: any;
  let sentCommands: any[] = [];

  beforeEach(() => {
    sentCommands = [];
    service = new DeviceService();

    // 模拟 WebSocket
    mockWs = {
      readyState: WebSocket.OPEN,
      send: vi.fn((data: string) => {
        sentCommands.push(JSON.parse(data));
      }),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    (service as any).ws = mockWs;
  });

  // ============================================
  // user_mgmt 命令支持 user_name 字段
  // ============================================

  describe("user_mgmt 命令新增 user_name 字段", () => {
    it("添加指纹时应支持 user_name 参数", () => {
      service.sendUserMgmtCommand(
        "finger",
        "add",
        0,
        undefined,
        "张三的右手食指",
      );

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd.type).toBe("user_mgmt");
      expect(cmd.category).toBe("finger");
      expect(cmd.command).toBe("add");
      expect(cmd.user_id).toBe(0);
      expect(cmd.user_name).toBe("张三的右手食指");
    });

    it("添加 NFC 卡片时应支持 user_name 参数", () => {
      service.sendUserMgmtCommand("nfc", "add", 0, undefined, "李四的门禁卡");

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd.type).toBe("user_mgmt");
      expect(cmd.category).toBe("nfc");
      expect(cmd.command).toBe("add");
      expect(cmd.user_name).toBe("李四的门禁卡");
    });

    it("user_name 参数为可选，不传时不应包含该字段", () => {
      service.sendUserMgmtCommand("finger", "add", 0);

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd.type).toBe("user_mgmt");
      expect(cmd.category).toBe("finger");
      expect(cmd.command).toBe("add");
      expect(cmd.user_name).toBeUndefined();
    });

    it("非 add 命令时不应包含 user_name 字段", () => {
      // 查询命令
      service.sendUserMgmtCommand(
        "finger",
        "query",
        undefined,
        undefined,
        "应该被忽略",
      );

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd.command).toBe("query");
      expect(cmd.user_name).toBeUndefined();
    });

    it("删除命令时不应包含 user_name 字段", () => {
      service.sendUserMgmtCommand("finger", "del", 5, undefined, "应该被忽略");

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd.command).toBe("del");
      expect(cmd.user_id).toBe(5);
      expect(cmd.user_name).toBeUndefined();
    });

    it("日志应包含 user_name 信息", () => {
      const logEvents: any[] = [];
      service.on("log", (type, data) => logEvents.push(data));

      service.sendUserMgmtCommand("finger", "add", 0, undefined, "测试指纹");

      const addLog = logEvents.find((log) => log.msg.includes("添加"));
      expect(addLog).toBeDefined();
      expect(addLog.msg).toContain("测试指纹");
    });
  });

  // ============================================
  // doorlock_users 查询接口
  // ============================================

  describe("doorlock_users 查询接口", () => {
    it("queryDoorlockUsers 方法应该存在", () => {
      expect(typeof service.queryDoorlockUsers).toBe("function");
    });

    it("应该发送正确的查询命令（不指定类型）", () => {
      service.queryDoorlockUsers();

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd.type).toBe("query");
      expect(cmd.target).toBe("doorlock_users");
      expect(cmd.data).toBeDefined();
      expect(cmd.data.limit).toBe(100);
      expect(cmd.data.offset).toBe(0);
      expect(cmd.data.user_type).toBeUndefined();
    });

    it("应该支持指定用户类型过滤", () => {
      service.queryDoorlockUsers("finger");

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd.type).toBe("query");
      expect(cmd.target).toBe("doorlock_users");
      expect(cmd.data.user_type).toBe("finger");
    });

    it("应该支持分页参数", () => {
      service.queryDoorlockUsers("nfc", 50, 10);

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd.data.user_type).toBe("nfc");
      expect(cmd.data.limit).toBe(50);
      expect(cmd.data.offset).toBe(10);
    });

    it("应该正确处理查询结果", () => {
      const results: any[] = [];
      service.on("doorlock_users_result", (type, data) => results.push(data));

      // 模拟服务器响应
      const mockResponse = {
        type: "query_result",
        target: "doorlock_users",
        status: "success" as const,
        data: {
          records: [
            {
              id: 1,
              device_id: "AA:BB:CC:DD:EE:FF",
              user_type: "finger",
              user_id: 5,
              user_name: "张三的右手食指",
              user_data: null,
              status: 1,
              created_at: "2024-12-11T10:30:00",
              created_by: "user_12345",
            },
            {
              id: 2,
              device_id: "AA:BB:CC:DD:EE:FF",
              user_type: "nfc",
              user_id: 3,
              user_name: "李四的门禁卡",
              user_data: "1234567890ABCDEF",
              status: 1,
              created_at: "2024-12-11T11:00:00",
              created_by: "user_12345",
            },
          ],
          total: 2,
          limit: 100,
          offset: 0,
        },
      };

      (service as any).handleQueryResult(mockResponse);

      expect(results.length).toBe(1);
      expect(results[0].data.length).toBe(2);
      expect(results[0].total).toBe(2);

      // 验证第一条记录
      const firstUser = results[0].data[0];
      expect(firstUser.user_type).toBe("finger");
      expect(firstUser.user_id).toBe(5);
      expect(firstUser.user_name).toBe("张三的右手食指");

      // 验证第二条记录
      const secondUser = results[0].data[1];
      expect(secondUser.user_type).toBe("nfc");
      expect(secondUser.user_id).toBe(3);
      expect(secondUser.user_name).toBe("李四的门禁卡");
      expect(secondUser.user_data).toBe("1234567890ABCDEF");
    });

    it("应该记录查询日志", () => {
      const logEvents: any[] = [];
      service.on("log", (type, data) => logEvents.push(data));

      service.queryDoorlockUsers("finger");

      const queryLog = logEvents.find((log) =>
        log.msg.includes("查询门锁用户列表"),
      );
      expect(queryLog).toBeDefined();
      expect(queryLog.msg).toContain("指纹");
    });

    it("查询所有类型时日志应显示'所有类型'", () => {
      const logEvents: any[] = [];
      service.on("log", (type, data) => logEvents.push(data));

      service.queryDoorlockUsers();

      const queryLog = logEvents.find((log) =>
        log.msg.includes("查询门锁用户列表"),
      );
      expect(queryLog).toBeDefined();
      expect(queryLog.msg).toContain("所有类型");
    });

    it("应该返回 seq_id", () => {
      const seqId = service.queryDoorlockUsers("finger");

      expect(seqId).toBeDefined();
      expect(typeof seqId).toBe("string");
      expect(seqId).toMatch(/^\d+_\d+$/);
    });
  });

  // ============================================
  // 集成测试
  // ============================================

  describe("集成测试：完整工作流", () => {
    it("应该支持添加指纹并查询用户列表", () => {
      const logEvents: any[] = [];
      service.on("log", (type, data) => logEvents.push(data));

      // 1. 添加指纹（带备注）
      service.sendUserMgmtCommand(
        "finger",
        "add",
        0,
        undefined,
        "王五的左手拇指",
      );

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].user_name).toBe("王五的左手拇指");

      // 2. 模拟添加成功响应
      const addResult = {
        type: "user_mgmt_result",
        category: "finger" as const,
        command: "add",
        result: true,
        val: 6,
        msg: "Success",
      };

      (service as any).handleUserMgmtResult(addResult);

      // 3. 查询用户列表
      service.queryDoorlockUsers("finger");

      expect(sentCommands.length).toBe(2);
      expect(sentCommands[1].type).toBe("query");
      expect(sentCommands[1].target).toBe("doorlock_users");

      // 验证日志
      expect(logEvents.some((log) => log.msg.includes("王五的左手拇指"))).toBe(
        true,
      );
      expect(
        logEvents.some((log) => log.msg.includes("查询门锁用户列表")),
      ).toBe(true);
    });
  });
});
