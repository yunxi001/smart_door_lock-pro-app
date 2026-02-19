/**
 * 人脸管理命令验证测试
 * 验证 sendFaceManagement() 方法符合需求 10.1, 10.2, 10.3, 10.4
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DeviceService } from "../services/DeviceService";

describe("任务 10.1: 添加 sendFaceManagement() 方法", () => {
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

  describe("需求 10.1: 方法存在性验证", () => {
    it("sendFaceManagement 方法应该存在", () => {
      expect(typeof service.sendFaceManagement).toBe("function");
    });

    it("sendFaceManagement 方法应该可调用", () => {
      expect(() => {
        service.sendFaceManagement("get_persons");
      }).not.toThrow();
    });
  });

  describe("需求 10.2: 支持五种 action", () => {
    const actions = [
      "register",
      "get_persons",
      "delete_person",
      "update_permission",
      "get_visits",
    ];

    actions.forEach((action) => {
      it(`应该支持 ${action} 操作`, () => {
        sentCommands = [];

        if (action === "register") {
          // register 需要完整的 data
          service.sendFaceManagement(action, {
            name: "测试用户",
            relation_type: "家人",
            images: ["base64_image_data"],
            permission: {
              time_start: "00:00",
              time_end: "23:59",
            },
          });
        } else if (action === "delete_person") {
          // delete_person 需要 person_id
          service.sendFaceManagement(action, { person_id: 1 });
        } else {
          service.sendFaceManagement(action);
        }

        expect(sentCommands.length).toBe(1);
        expect(sentCommands[0].type).toBe("face_management");
        expect(sentCommands[0].action).toBe(action);
      });
    });
  });

  describe("需求 10.3: register 操作字段验证", () => {
    it("register 操作应该包含 name, relation_type, images, permission 字段", () => {
      const registerData = {
        name: "张三",
        relation_type: "家人",
        images: ["base64_image_1", "base64_image_2"],
        permission: {
          time_start: "08:00",
          time_end: "18:00",
        },
      };

      service.sendFaceManagement("register", registerData);

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd.type).toBe("face_management");
      expect(cmd.action).toBe("register");
      expect(cmd.data).toBeDefined();
      expect(cmd.data.name).toBe("张三");
      expect(cmd.data.relation_type).toBe("家人");
      expect(cmd.data.images).toEqual(["base64_image_1", "base64_image_2"]);
      expect(cmd.data.permission).toEqual({
        time_start: "08:00",
        time_end: "18:00",
      });
    });

    it("register 操作缺少必要字段时应该记录错误日志", () => {
      const logEvents: any[] = [];
      service.on("log", (_, data) => logEvents.push(data));

      // 缺少 images 字段
      service.sendFaceManagement("register", {
        name: "张三",
        relation_type: "家人",
        permission: {
          time_start: "08:00",
          time_end: "18:00",
        },
      });

      // 应该不发送命令
      expect(sentCommands.length).toBe(0);

      // 应该记录错误日志
      expect(logEvents.length).toBeGreaterThan(0);
      expect(
        logEvents.some(
          (e) => e.type === "error" && e.msg.includes("缺少必要字段"),
        ),
      ).toBe(true);
    });

    it("register 操作缺少多个字段时应该列出所有缺失字段", () => {
      const logEvents: any[] = [];
      service.on("log", (_, data) => logEvents.push(data));

      // 只提供 name
      service.sendFaceManagement("register", {
        name: "张三",
      });

      expect(sentCommands.length).toBe(0);
      expect(
        logEvents.some(
          (e) =>
            e.type === "error" &&
            e.msg.includes("relation_type") &&
            e.msg.includes("images") &&
            e.msg.includes("permission"),
        ),
      ).toBe(true);
    });
  });

  describe("消息格式验证", () => {
    it("发送的消息应该包含 type 和 action 字段", () => {
      service.sendFaceManagement("get_persons");

      expect(sentCommands.length).toBe(1);
      const cmd = sentCommands[0];

      expect(cmd).toHaveProperty("type");
      expect(cmd).toHaveProperty("action");
      expect(cmd.type).toBe("face_management");
      expect(cmd.action).toBe("get_persons");
    });

    it("当提供 data 参数时，应该包含在消息中", () => {
      const testData = {
        person_id: 123,
        permission: {
          time_start: "09:00",
          time_end: "17:00",
        },
      };

      service.sendFaceManagement("update_permission", testData);

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].data).toEqual(testData);
    });

    it("当未提供 data 参数时，消息中不应该包含 data 字段", () => {
      service.sendFaceManagement("get_persons");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].data).toBeUndefined();
    });
  });

  describe("日志记录验证", () => {
    it("发送命令时应该记录日志", () => {
      const logEvents: any[] = [];
      service.on("log", (_, data) => logEvents.push(data));

      service.sendFaceManagement("get_persons");

      expect(logEvents.length).toBeGreaterThan(0);
      expect(
        logEvents.some(
          (e) => e.msg.includes("人脸管理") && e.msg.includes("获取人员列表"),
        ),
      ).toBe(true);
    });

    it("日志应该包含正确的操作描述", () => {
      const testCases = [
        { action: "register", expected: "注册人脸" },
        { action: "get_persons", expected: "获取人员列表" },
        { action: "delete_person", expected: "删除人员" },
        { action: "update_permission", expected: "更新权限" },
        { action: "get_visits", expected: "获取到访记录" },
      ];

      testCases.forEach(({ action, expected }) => {
        const logEvents: any[] = [];
        service.on("log", (_, data) => logEvents.push(data));

        if (action === "register") {
          service.sendFaceManagement(action, {
            name: "测试",
            relation_type: "家人",
            images: ["img"],
            permission: { time_start: "00:00", time_end: "23:59" },
          });
        } else {
          service.sendFaceManagement(action, {});
        }

        expect(logEvents.some((e) => e.msg.includes(expected))).toBe(true);
      });
    });
  });

  describe("边界情况测试", () => {
    it("应该正确处理空的 data 对象", () => {
      service.sendFaceManagement("get_persons", {});

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].data).toEqual({});
    });

    it("应该正确处理包含额外字段的 data", () => {
      const dataWithExtra = {
        person_id: 1,
        extra_field: "extra_value",
      };

      service.sendFaceManagement("delete_person", dataWithExtra);

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].data).toEqual(dataWithExtra);
    });

    it("应该正确处理未知的 action", () => {
      const logEvents: any[] = [];
      service.on("log", (_, data) => logEvents.push(data));

      service.sendFaceManagement("unknown_action");

      expect(sentCommands.length).toBe(1);
      expect(sentCommands[0].action).toBe("unknown_action");
      // 日志应该显示原始 action 名称
      expect(logEvents.some((e) => e.msg.includes("unknown_action"))).toBe(
        true,
      );
    });
  });
});

describe("任务 10.2: 验证 face_management 响应处理", () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  describe("需求 10.4: handleTextMessage 处理 face_management 响应", () => {
    it("应该触发 face_response 事件", () => {
      const responseEvents: any[] = [];
      service.on("face_response", (_, data) => responseEvents.push(data));

      const mockResponse = {
        type: "face_management",
        action: "register",
        status: "success",
        data: {
          person_id: 123,
        },
      };

      // 模拟接收到 face_management 响应
      (service as any).handleTextMessage(JSON.stringify(mockResponse));

      expect(responseEvents.length).toBe(1);
      expect(responseEvents[0]).toEqual(mockResponse);
    });

    it("应该正确传递响应数据", () => {
      const responseEvents: any[] = [];
      service.on("face_response", (_, data) => responseEvents.push(data));

      const mockResponse = {
        type: "face_management",
        action: "get_persons",
        status: "success",
        data: {
          persons: [
            { id: 1, name: "张三", relation_type: "家人" },
            { id: 2, name: "李四", relation_type: "朋友" },
          ],
        },
      };

      (service as any).handleTextMessage(JSON.stringify(mockResponse));

      expect(responseEvents.length).toBe(1);
      expect(responseEvents[0].action).toBe("get_persons");
      expect(responseEvents[0].data.persons).toHaveLength(2);
    });

    it("应该处理错误响应", () => {
      const responseEvents: any[] = [];
      service.on("face_response", (_, data) => responseEvents.push(data));

      const mockErrorResponse = {
        type: "face_management",
        action: "register",
        status: "error",
        error: "人脸识别失败",
      };

      (service as any).handleTextMessage(JSON.stringify(mockErrorResponse));

      expect(responseEvents.length).toBe(1);
      expect(responseEvents[0].status).toBe("error");
      expect(responseEvents[0].error).toBe("人脸识别失败");
    });

    it("应该处理不同的 action 类型", () => {
      const actions = [
        "register",
        "get_persons",
        "delete_person",
        "update_permission",
        "get_visits",
      ];

      actions.forEach((action) => {
        const responseEvents: any[] = [];
        service.on("face_response", (_, data) => responseEvents.push(data));

        const mockResponse = {
          type: "face_management",
          action,
          status: "success",
        };

        (service as any).handleTextMessage(JSON.stringify(mockResponse));

        expect(responseEvents.length).toBe(1);
        expect(responseEvents[0].action).toBe(action);
      });
    });
  });

  describe("响应数据完整性验证", () => {
    it("register 响应应该包含 person_id", () => {
      const responseEvents: any[] = [];
      service.on("face_response", (_, data) => responseEvents.push(data));

      const mockResponse = {
        type: "face_management",
        action: "register",
        status: "success",
        data: {
          person_id: 456,
        },
      };

      (service as any).handleTextMessage(JSON.stringify(mockResponse));

      expect(responseEvents[0].data.person_id).toBe(456);
    });

    it("get_persons 响应应该包含 persons 数组", () => {
      const responseEvents: any[] = [];
      service.on("face_response", (_, data) => responseEvents.push(data));

      const mockResponse = {
        type: "face_management",
        action: "get_persons",
        status: "success",
        data: {
          persons: [],
        },
      };

      (service as any).handleTextMessage(JSON.stringify(mockResponse));

      expect(Array.isArray(responseEvents[0].data.persons)).toBe(true);
    });

    it("delete_person 响应应该包含 status", () => {
      const responseEvents: any[] = [];
      service.on("face_response", (_, data) => responseEvents.push(data));

      const mockResponse = {
        type: "face_management",
        action: "delete_person",
        status: "success",
      };

      (service as any).handleTextMessage(JSON.stringify(mockResponse));

      expect(responseEvents[0].status).toBe("success");
    });
  });
});
