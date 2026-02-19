import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeviceService } from "@/services/DeviceService";

/**
 * 密码查询功能测试（协议 v2.4 新增）
 *
 * 测试范围：
 * - 发送密码查询命令
 * - 处理密码查询成功响应
 * - 处理默认密码返回
 * - 事件触发验证
 */
describe("密码查询功能 (v2.4)", () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  it("应该发送 query 命令查询密码", () => {
    // 模拟 WebSocket 连接
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    };
    (service as any).ws = mockWs;

    const seqId = service.queryPassword();

    expect(seqId).toBeTruthy();
    expect(mockWs.send).toHaveBeenCalled();

    // 验证发送的命令格式
    const sentMessage = JSON.parse(mockWs.send.mock.calls[0][0]);
    expect(sentMessage.type).toBe("query");
    expect(sentMessage.target).toBe("password");
    expect(sentMessage.seq_id).toBe(seqId);
  });

  it("应该处理密码查询成功响应", () => {
    const onPasswordResult = vi.fn();
    service.on("password_query_result", onPasswordResult);

    // 模拟服务器响应
    (service as any).handleQueryResult({
      type: "query_result",
      target: "password",
      status: "success",
      data: { password: "654321" },
    });

    expect(onPasswordResult).toHaveBeenCalledWith("password_query_result", {
      password: "654321",
    });
  });

  it("密码不存在时应该返回默认值 123456", () => {
    const onPasswordResult = vi.fn();
    service.on("password_query_result", onPasswordResult);

    // 模拟服务器响应（无密码）
    (service as any).handleQueryResult({
      type: "query_result",
      target: "password",
      status: "success",
      data: { password: "123456" },
    });

    expect(onPasswordResult).toHaveBeenCalledWith("password_query_result", {
      password: "123456",
    });
  });

  it("密码数据为空时应该返回默认值 123456", () => {
    const onPasswordResult = vi.fn();
    service.on("password_query_result", onPasswordResult);

    // 模拟服务器响应（data 为空）
    (service as any).handleQueryResult({
      type: "query_result",
      target: "password",
      status: "success",
      data: {},
    });

    expect(onPasswordResult).toHaveBeenCalledWith("password_query_result", {
      password: "123456",
    });
  });

  it("应该在成功回调中返回密码", async () => {
    // 模拟 WebSocket 连接
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
    };
    (service as any).ws = mockWs;

    // 创建 Promise 来等待回调
    const passwordPromise = new Promise<string>((resolve) => {
      service.queryPassword((password) => {
        resolve(password);
      });
    });

    // 模拟服务器响应
    (service as any).handleQueryResult({
      type: "query_result",
      target: "password",
      status: "success",
      data: { password: "888888" },
    });

    // 等待并验证结果
    const password = await passwordPromise;
    expect(password).toBe("888888");
  });

  it("应该记录密码查询成功日志", () => {
    const logEvents: any[] = [];
    service.on("log", (_, data) => logEvents.push(data));

    // 模拟服务器响应
    (service as any).handleQueryResult({
      type: "query_result",
      target: "password",
      status: "success",
      data: { password: "123456" },
    });

    const successLog = logEvents.find((log) =>
      log.msg.includes("密码查询成功"),
    );
    expect(successLog).toBeDefined();
    expect(successLog.type).toBe("success");
  });

  it("未连接时应该返回 null", () => {
    // 未设置 WebSocket 连接
    const seqId = service.queryPassword();
    expect(seqId).toBeNull();
  });

  it("应该触发 query_result 事件", () => {
    const onQueryResult = vi.fn();
    service.on("query_result", onQueryResult);

    // 模拟服务器响应
    const response = {
      type: "query_result",
      target: "password",
      status: "success",
      data: { password: "999999" },
    };

    (service as any).handleQueryResult(response);

    expect(onQueryResult).toHaveBeenCalledWith("query_result", response);
  });
});
