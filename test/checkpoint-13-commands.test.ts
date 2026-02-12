/**
 * 检查点 13 - 命令功能验证
 *
 * 本测试文件验证所有命令方法的可用性和消息格式的正确性
 * 确保 DeviceService 实现符合协议规范 v2.3
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DeviceService } from "../services/DeviceService";

describe("检查点 13: 命令功能验证", () => {
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

  describe("1. 所有命令方法可用性验证", () => {
    it("应该提供 sendUserMgmtCommand 方法", () => {
      expect(typeof service.sendUserMgmtCommand).toBe("function");
      expect(() =>
        service.sendUserMgmtCommand("finger", "query"),
      ).not.toThrow();
    });

    it("应该提供 sendQuery 方法", () => {
      expect(typeof service.sendQuery).toBe("function");
      expect(() => service.sendQuery("status")).not.toThrow();
    });

    it("应该提供 sendFaceManagement 方法", () => {
      expect(typeof service.sendFaceManagement).toBe("function");
      expect(() => service.sendFaceManagement("get_persons")).not.toThrow();
    });

    it("应该提供 sendMediaDownload 方法", () => {
      expect(typeof service.sendMediaDownload).toBe("function");
      expect(() => service.sendMediaDownload(1)).not.toThrow();
    });

    it("应该提供 sendMediaDownloadChunk 方法", () => {
      expect(typeof service.sendMediaDownloadChunk).toBe("function");
      expect(() => service.sendMediaDownloadChunk(1, 0)).not.toThrow();
    });

    it("应该提供 sendSystemCommand 方法", () => {
      expect(typeof service.sendSystemCommand).toBe("function");
      expect(() => service.sendSystemCommand("start_monitor")).not.toThrow();
    });
  });

  describe("2. user_mgmt 命令消息格式验证", () => {
    it("消息应该包含 type, category, command, user_id 字段", () => {
      service.sendUserMgmtCommand("finger", "add", 5);

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd.type).toBe("user_mgmt");
      expect(cmd.category).toBe("finger");
      expect(cmd.command).toBe("add");
      expect(cmd.user_id).toBe(5);
    });

    it("应该支持 finger, nfc, password 三种 category", () => {
      const categories: Array<"finger" | "nfc" | "password"> = [
        "finger",
        "nfc",
        "password",
      ];

      categories.forEach((category) => {
        sentCommands = [];
        service.sendUserMgmtCommand(category, "query");

        expect(sentCommands[0].category).toBe(category);
      });
    });

    it("应该支持 add, del, clear, query, set 五种 command", () => {
      const commands = ["add", "del", "clear", "query", "set"];

      commands.forEach((command) => {
        sentCommands = [];

        if (command === "set") {
          service.sendUserMgmtCommand("password", command, 0, "123456");
        } else if (command === "del") {
          service.sendUserMgmtCommand("finger", command, 1);
        } else {
          service.sendUserMgmtCommand("finger", command);
        }

        expect(sentCommands[0].command).toBe(command);
      });
    });

    it("password + set 命令应该包含 payload 字段", () => {
      service.sendUserMgmtCommand("password", "set", 0, "test123");

      expect(sentCommands[0].payload).toBe("test123");
    });
  });

  describe("3. query 命令消息格式验证", () => {
    it("消息应该包含 type 和 target 字段", () => {
      service.sendQuery("status");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("query");
      expect(sentCommands[0].target).toBe("status");
    });

    it("应该支持五种 target 类型", () => {
      const targets = [
        "status",
        "status_history",
        "events",
        "unlock_logs",
        "media_files",
      ];

      targets.forEach((target) => {
        sentCommands = [];
        service.sendQuery(target);

        expect(sentCommands[0].target).toBe(target);
      });
    });

    it("应该支持可选的 data 参数（分页等）", () => {
      service.sendQuery("unlock_logs", { limit: 10, offset: 0 });

      expect(sentCommands[0].data).toEqual({ limit: 10, offset: 0 });
    });
  });

  describe("4. face_management 命令消息格式验证", () => {
    it("消息应该包含 type 和 action 字段", () => {
      service.sendFaceManagement("get_persons");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("face_management");
      expect(sentCommands[0].action).toBe("get_persons");
    });

    it("应该支持五种 action 类型", () => {
      const actions = [
        "register",
        "get_persons",
        "delete_person",
        "update_permission",
        "get_visits",
      ];

      actions.forEach((action) => {
        sentCommands = [];

        if (action === "register") {
          service.sendFaceManagement(action, {
            name: "测试",
            relation_type: "家人",
            images: ["img"],
            permission: { time_start: "00:00", time_end: "23:59" },
          });
        } else {
          service.sendFaceManagement(action);
        }

        expect(sentCommands[0].action).toBe(action);
      });
    });

    it("register 操作应该包含必要字段", () => {
      const registerData = {
        name: "张三",
        relation_type: "家人",
        images: ["base64_image"],
        permission: {
          time_start: "08:00",
          time_end: "18:00",
        },
      };

      service.sendFaceManagement("register", registerData);

      expect(sentCommands[0].data).toEqual(registerData);
    });

    it("register 操作缺少必要字段时不应该发送命令", () => {
      // 缺少 images 字段
      service.sendFaceManagement("register", {
        name: "张三",
        relation_type: "家人",
        permission: { time_start: "08:00", time_end: "18:00" },
      });

      expect(sentCommands.length).toBe(0);
    });
  });

  describe("5. media_download 命令消息格式验证", () => {
    it("应该支持通过 file_id 下载", () => {
      service.sendMediaDownload(123);

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("media_download");
      expect(sentCommands[0].file_id).toBe(123);
    });

    it("应该支持通过 file_path 下载", () => {
      service.sendMediaDownload("/path/to/file.jpg");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("media_download");
      expect(sentCommands[0].file_path).toBe("/path/to/file.jpg");
    });

    it("分片下载应该包含 file_id, chunk_index, chunk_size", () => {
      service.sendMediaDownloadChunk(456, 2, 1048576);

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("media_download_chunk");
      expect(sentCommands[0].file_id).toBe(456);
      expect(sentCommands[0].chunk_index).toBe(2);
      expect(sentCommands[0].chunk_size).toBe(1048576);
    });
  });

  describe("6. system 命令消息格式验证", () => {
    it("start_monitor 命令应该包含 record 字段", () => {
      service.sendSystemCommand("start_monitor", { record: true });

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("system");
      expect(sentCommands[0].command).toBe("start_monitor");
      expect(sentCommands[0].record).toBe(true);
    });

    it("stop_monitor 命令应该不包含额外字段", () => {
      service.sendSystemCommand("stop_monitor");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].type).toBe("system");
      expect(sentCommands[0].command).toBe("stop_monitor");
      expect(sentCommands[0].record).toBeUndefined();
    });
  });

  describe("7. 所有命令都应该通过 sendCommand 发送", () => {
    it("所有命令都应该生成 seq_id", () => {
      // 由于我们 mock 了 sendCommand，这里验证所有命令都调用了 sendCommand
      // 在实际实现中，sendCommand 会添加 seq_id

      const commands = [
        () => service.sendUserMgmtCommand("finger", "query"),
        () => service.sendQuery("status"),
        () => service.sendFaceManagement("get_persons"),
        () => service.sendMediaDownload(1),
        () => service.sendMediaDownloadChunk(1, 0),
        () => service.sendSystemCommand("start_monitor"),
      ];

      commands.forEach((cmd) => {
        sentCommands = [];
        cmd();
        expect(sentCommands.length).toBe(1);
      });
    });
  });

  describe("8. 日志记录验证", () => {
    it("所有命令发送时都应该记录日志", () => {
      const logEvents: any[] = [];
      service.on("log", (_, data) => logEvents.push(data));

      // 测试每个命令
      service.sendUserMgmtCommand("finger", "query");
      service.sendQuery("status");
      service.sendFaceManagement("get_persons");
      service.sendMediaDownload(1);
      service.sendMediaDownloadChunk(1, 0);
      service.sendSystemCommand("start_monitor");

      // 每个命令都应该至少记录一条日志
      expect(logEvents.length).toBeGreaterThanOrEqual(6);
    });

    it("日志应该包含命令类型的中文描述", () => {
      const logEvents: any[] = [];
      service.on("log", (_, data) => logEvents.push(data));

      service.sendUserMgmtCommand("finger", "query");
      expect(logEvents.some((e) => e.msg.includes("指纹"))).toBe(true);

      service.sendQuery("unlock_logs");
      expect(logEvents.some((e) => e.msg.includes("开锁日志"))).toBe(true);

      service.sendFaceManagement("register", {
        name: "测试",
        relation_type: "家人",
        images: ["img"],
        permission: { time_start: "00:00", time_end: "23:59" },
      });
      expect(logEvents.some((e) => e.msg.includes("注册人脸"))).toBe(true);
    });
  });

  describe("9. 响应处理验证", () => {
    it("应该正确处理 user_mgmt_result 响应", () => {
      const events: any[] = [];
      service.on("finger_result", (_, data) => events.push(data));

      const mockResponse = {
        type: "user_mgmt_result",
        category: "finger",
        command: "query",
        result: "success",
        data: { users: [] },
      };

      (service as any).handleTextMessage(JSON.stringify(mockResponse));

      expect(events.length).toBe(1);
    });

    it("应该正确处理 query_result 响应", () => {
      const events: any[] = [];
      service.on("query_result", (_, data) => events.push(data));

      const mockResponse = {
        type: "query_result",
        target: "status",
        status: "success",
        data: [],
      };

      (service as any).handleTextMessage(JSON.stringify(mockResponse));

      expect(events.length).toBe(1);
    });

    it("应该正确处理 face_management 响应", () => {
      const events: any[] = [];
      service.on("face_response", (_, data) => events.push(data));

      const mockResponse = {
        type: "face_management",
        action: "get_persons",
        status: "success",
        data: { persons: [] },
      };

      (service as any).handleTextMessage(JSON.stringify(mockResponse));

      expect(events.length).toBe(1);
    });

    it("应该正确处理 media_download 响应", () => {
      const events: any[] = [];
      service.on("media_download", (_, data) => events.push(data));

      const mockResponse = {
        type: "media_download",
        file_id: 1,
        status: "success",
        data: "base64_data",
      };

      (service as any).handleTextMessage(JSON.stringify(mockResponse));

      expect(events.length).toBe(1);
    });

    it("应该正确处理 system 响应", () => {
      const logEvents: any[] = [];
      service.on("log", (_, data) => logEvents.push(data));

      const mockResponse = {
        type: "system",
        command: "start_monitor",
        status: "success",
      };

      (service as any).handleTextMessage(JSON.stringify(mockResponse));

      expect(
        logEvents.some(
          (e) => e.msg.includes("系统指令") && e.type === "success",
        ),
      ).toBe(true);
    });
  });

  describe("10. 协议规范符合性验证", () => {
    it("所有命令消息都应该包含 type 字段", () => {
      const commands = [
        () => service.sendUserMgmtCommand("finger", "query"),
        () => service.sendQuery("status"),
        () => service.sendFaceManagement("get_persons"),
        () => service.sendMediaDownload(1),
        () => service.sendMediaDownloadChunk(1, 0),
        () => service.sendSystemCommand("start_monitor"),
      ];

      commands.forEach((cmd) => {
        sentCommands = [];
        cmd();
        expect(sentCommands[0]).toHaveProperty("type");
        expect(typeof sentCommands[0].type).toBe("string");
      });
    });

    it("命令类型应该符合协议规范", () => {
      const expectedTypes = [
        {
          cmd: () => service.sendUserMgmtCommand("finger", "query"),
          type: "user_mgmt",
        },
        { cmd: () => service.sendQuery("status"), type: "query" },
        {
          cmd: () => service.sendFaceManagement("get_persons"),
          type: "face_management",
        },
        { cmd: () => service.sendMediaDownload(1), type: "media_download" },
        {
          cmd: () => service.sendMediaDownloadChunk(1, 0),
          type: "media_download_chunk",
        },
        {
          cmd: () => service.sendSystemCommand("start_monitor"),
          type: "system",
        },
      ];

      expectedTypes.forEach(({ cmd, type }) => {
        sentCommands = [];
        cmd();
        expect(sentCommands[0].type).toBe(type);
      });
    });

    it("消息字段命名应该使用下划线格式", () => {
      // 验证字段名使用 snake_case 而非 camelCase
      service.sendUserMgmtCommand("finger", "add", 5);
      expect(sentCommands[0]).toHaveProperty("user_id");
      expect(sentCommands[0]).not.toHaveProperty("userId");

      sentCommands = [];
      service.sendMediaDownload(1);
      expect(sentCommands[0]).toHaveProperty("file_id");
      expect(sentCommands[0]).not.toHaveProperty("fileId");

      sentCommands = [];
      service.sendMediaDownloadChunk(1, 0);
      expect(sentCommands[0]).toHaveProperty("chunk_index");
      expect(sentCommands[0]).not.toHaveProperty("chunkIndex");
    });
  });
});
