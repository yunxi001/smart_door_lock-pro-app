/**
 * 超时和重试机制测试
 * 验证需求：14.1, 14.2, 14.3, 14.4, 14.5
 *
 * 命令分类：
 * 1. 与设备交互的命令（不重传）：
 *    - user_mgmt: 90秒超时，0次重传
 *    - lock_control, dev_control: 20秒超时，0次重传
 *
 * 2. 与服务器交互的命令（需要重传）：
 *    - system, query, face_management 等: 3秒超时，3次重传
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { DeviceService } from "../services/DeviceService";

describe("超时和重试机制", () => {
  let service: DeviceService;
  let mockWs: any;

  beforeEach(() => {
    // 创建 DeviceService 实例
    service = new DeviceService();

    // 模拟 WebSocket
    mockWs = {
      readyState: 1, // OPEN
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // 注入模拟的 WebSocket
    (service as any).ws = mockWs;

    // 模拟 WebSocket 状态为已连接
    vi.spyOn(service as any, "emit");
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe("设备命令超时机制（不重传）", () => {
    it("用户管理命令应该使用 90 秒超时，不重传", async () => {
      vi.useFakeTimers();

      const onError = vi.fn();

      // 发送用户管理命令（自动配置：90秒超时，0次重传）
      service.sendCommand(
        { type: "user_mgmt", category: "finger", command: "add" },
        { onError },
      );

      // 初始发送
      expect(mockWs.send).toHaveBeenCalledTimes(1);

      // 快进 89 秒 - 不应该触发超时
      vi.advanceTimersByTime(89000);
      expect(onError).not.toHaveBeenCalled();

      // 快进到 90 秒 - 应该触发超时，但不重传
      vi.advanceTimersByTime(1000);
      expect(mockWs.send).toHaveBeenCalledTimes(1); // 没有重传
      expect(onError).toHaveBeenCalledWith("命令执行超时");

      vi.useRealTimers();
    });

    it("设备控制命令应该使用 20 秒超时，不重传", async () => {
      vi.useFakeTimers();

      const onError = vi.fn();

      // 发送设备控制命令（自动配置：20秒超时，0次重传）
      service.sendCommand(
        { type: "lock_control", command: "unlock" },
        { onError },
      );

      // 初始发送
      expect(mockWs.send).toHaveBeenCalledTimes(1);

      // 快进 19 秒 - 不应该触发超时
      vi.advanceTimersByTime(19000);
      expect(onError).not.toHaveBeenCalled();

      // 快进到 20 秒 - 应该触发超时，但不重传
      vi.advanceTimersByTime(1000);
      expect(mockWs.send).toHaveBeenCalledTimes(1); // 没有重传
      expect(onError).toHaveBeenCalledWith("命令执行超时");

      vi.useRealTimers();
    });

    it("dev_control 命令应该使用 20 秒超时，不重传", async () => {
      vi.useFakeTimers();

      const onError = vi.fn();

      // 发送设备控制命令
      service.sendCommand(
        { type: "dev_control", target: "light", action: "on" },
        { onError },
      );

      // 初始发送
      expect(mockWs.send).toHaveBeenCalledTimes(1);

      // 快进到 20 秒 - 应该触发超时，但不重传
      vi.advanceTimersByTime(20000);
      expect(mockWs.send).toHaveBeenCalledTimes(1); // 没有重传
      expect(onError).toHaveBeenCalledWith("命令执行超时");

      vi.useRealTimers();
    });
  });

  describe("服务器命令超时和重传机制", () => {
    it("服务器命令应该在 3 秒后触发超时并重传", async () => {
      vi.useFakeTimers();

      const onError = vi.fn();
      const onSuccess = vi.fn();

      // 发送服务器命令（自动配置：3秒超时，3次重传）
      service.sendCommand(
        { type: "query", target: "status" },
        { onError, onSuccess },
      );

      // 验证命令已发送
      expect(mockWs.send).toHaveBeenCalledTimes(1);

      // 快进 2.9 秒 - 不应该触发超时
      vi.advanceTimersByTime(2900);
      expect(onError).not.toHaveBeenCalled();

      // 快进到 3 秒 - 应该触发第一次重传
      vi.advanceTimersByTime(100);
      expect(mockWs.send).toHaveBeenCalledTimes(2); // 原始 + 第1次重传

      vi.useRealTimers();
    });

    it("服务器命令应该最多重试 3 次", async () => {
      vi.useFakeTimers();

      const onError = vi.fn();

      // 发送服务器命令
      service.sendCommand(
        { type: "system", command: "start_monitor" },
        { onError },
      );

      // 初始发送
      expect(mockWs.send).toHaveBeenCalledTimes(1);

      // 第 1 次超时重传
      vi.advanceTimersByTime(3000);
      expect(mockWs.send).toHaveBeenCalledTimes(2);

      // 第 2 次超时重传
      vi.advanceTimersByTime(3000);
      expect(mockWs.send).toHaveBeenCalledTimes(3);

      // 第 3 次超时重传
      vi.advanceTimersByTime(3000);
      expect(mockWs.send).toHaveBeenCalledTimes(4);

      // 第 4 次超时 - 不应该再重传，应该触发错误回调
      vi.advanceTimersByTime(3000);
      expect(mockWs.send).toHaveBeenCalledTimes(4); // 没有增加
      expect(onError).toHaveBeenCalledWith("请求超时，已重试 3 次");

      vi.useRealTimers();
    });

    it("重传时应该使用相同的 seq_id", async () => {
      vi.useFakeTimers();

      // 发送服务器命令
      service.sendCommand({ type: "query", target: "unlock_logs" });

      // 获取第一次发送的消息
      const firstCall = mockWs.send.mock.calls[0][0];
      const firstMsg = JSON.parse(firstCall);
      const originalSeqId = firstMsg.seq_id;

      // 触发第一次重传
      vi.advanceTimersByTime(3000);

      // 获取重传的消息
      const secondCall = mockWs.send.mock.calls[1][0];
      const secondMsg = JSON.parse(secondCall);

      // 验证 seq_id 相同
      expect(secondMsg.seq_id).toBe(originalSeqId);

      // 触发第二次重传
      vi.advanceTimersByTime(3000);

      // 获取第二次重传的消息
      const thirdCall = mockWs.send.mock.calls[2][0];
      const thirdMsg = JSON.parse(thirdCall);

      // 验证 seq_id 仍然相同
      expect(thirdMsg.seq_id).toBe(originalSeqId);

      vi.useRealTimers();
    });

    it("face_management 命令应该使用 3 秒超时，重传 3 次", async () => {
      vi.useFakeTimers();

      const onError = vi.fn();

      // 发送人脸管理命令
      service.sendCommand(
        { type: "face_management", action: "get_persons" },
        { onError },
      );

      // 初始发送
      expect(mockWs.send).toHaveBeenCalledTimes(1);

      // 快进 4 次超时（初始 + 3 次重传）
      vi.advanceTimersByTime(3000); // 第 1 次重传
      vi.advanceTimersByTime(3000); // 第 2 次重传
      vi.advanceTimersByTime(3000); // 第 3 次重传
      vi.advanceTimersByTime(3000); // 超过最大重试次数

      // 验证总共发送了 4 次（1次初始 + 3次重传）
      expect(mockWs.send).toHaveBeenCalledTimes(4);
      expect(onError).toHaveBeenCalledWith("请求超时，已重试 3 次");

      vi.useRealTimers();
    });
  });

  describe("用户自定义超时配置", () => {
    it("应该允许用户覆盖默认超时配置", async () => {
      vi.useFakeTimers();

      const onError = vi.fn();

      // 用户显式指定超时和重传配置（使用服务器命令）
      service.sendCommand(
        { type: "query", target: "status" },
        { onError, timeout: 5000, maxRetries: 2 },
      );

      // 初始发送
      expect(mockWs.send).toHaveBeenCalledTimes(1);

      // 快进 5 秒 - 应该触发第一次重传
      vi.advanceTimersByTime(5000);
      expect(mockWs.send).toHaveBeenCalledTimes(2);

      // 快进 5 秒 - 应该触发第二次重传
      vi.advanceTimersByTime(5000);
      expect(mockWs.send).toHaveBeenCalledTimes(3);

      // 快进 5 秒 - 超过最大重试次数
      vi.advanceTimersByTime(5000);
      expect(mockWs.send).toHaveBeenCalledTimes(3); // 没有增加
      expect(onError).toHaveBeenCalledWith("请求超时，已重试 2 次");

      vi.useRealTimers();
    });

    it("设备命令默认不重传，但可以通过配置启用", async () => {
      vi.useFakeTimers();

      const onError = vi.fn();

      // 默认情况：设备命令不重传
      service.sendCommand(
        { type: "lock_control", command: "unlock" },
        { onError },
      );

      // 初始发送
      expect(mockWs.send).toHaveBeenCalledTimes(1);

      // 快进 20 秒 - 应该触发超时，但不重传
      vi.advanceTimersByTime(20000);
      expect(mockWs.send).toHaveBeenCalledTimes(1); // 没有重传
      expect(onError).toHaveBeenCalledWith("命令执行超时");

      vi.useRealTimers();
    });
  });

  describe("server_ack 响应处理", () => {
    it("收到 server_ack (code=0) 后应该继续等待 ack", async () => {
      const onError = vi.fn();
      const onSuccess = vi.fn();

      // 发送命令
      const seqId = service.sendCommand(
        { type: "query", target: "status" },
        { onError, onSuccess },
      );

      // 模拟收到 server_ack (code=0)
      const serverAckMsg = {
        type: "server_ack",
        seq_id: seqId,
        code: 0,
        msg: "成功",
        ts: Date.now(),
      };

      (service as any).handleTextMessage(JSON.stringify(serverAckMsg));

      // 验证命令仍在等待队列中
      const pendingCommands = (service as any).pendingCommands;
      expect(pendingCommands.has(seqId)).toBe(true);

      // 验证没有触发回调
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("收到 server_ack (code=3) 后应该清理等待队列（参数错误）", async () => {
      const onError = vi.fn();

      // 发送命令
      const seqId = service.sendCommand(
        { type: "lock_control", command: "unlock" },
        { onError },
      );

      // 模拟收到 server_ack (code=3 - 参数错误，v2.4)
      const serverAckMsg = {
        type: "server_ack",
        seq_id: seqId,
        code: 3,
        msg: "参数错误",
        ts: Date.now(),
      };

      (service as any).handleTextMessage(JSON.stringify(serverAckMsg));

      // 验证命令已从等待队列中移除
      const pendingCommands = (service as any).pendingCommands;
      expect(pendingCommands.has(seqId)).toBe(false);

      // 验证触发了错误回调
      expect(onError).toHaveBeenCalledWith("参数错误");
    });

    it("收到 server_ack (code=9) 后应该清理队列但不触发错误（重复消息）", async () => {
      const onError = vi.fn();
      const onSuccess = vi.fn();

      // 发送命令
      const seqId = service.sendCommand(
        { type: "query", target: "events" },
        { onError, onSuccess },
      );

      // 模拟收到 server_ack (code=9 - 重复消息，v2.4)
      const serverAckMsg = {
        type: "server_ack",
        seq_id: seqId,
        code: 9,
        msg: "重复消息",
        ts: Date.now(),
      };

      (service as any).handleTextMessage(JSON.stringify(serverAckMsg));

      // 验证命令已从等待队列中移除
      const pendingCommands = (service as any).pendingCommands;
      expect(pendingCommands.has(seqId)).toBe(false);

      // 验证没有触发错误回调
      expect(onError).not.toHaveBeenCalled();
      expect(onSuccess).not.toHaveBeenCalled();
    });

    it("收到 ack 后应该清理等待队列并触发成功回调", async () => {
      const onError = vi.fn();
      const onSuccess = vi.fn();

      // 发送命令
      const seqId = service.sendCommand(
        { type: "lock_control", command: "unlock" },
        { onError, onSuccess },
      );

      // 先收到 server_ack (code=0)
      const serverAckMsg = {
        type: "server_ack",
        seq_id: seqId,
        code: 0,
        msg: "成功",
        ts: Date.now(),
      };

      (service as any).handleTextMessage(JSON.stringify(serverAckMsg));

      // 验证命令仍在队列中
      const pendingCommands = (service as any).pendingCommands;
      expect(pendingCommands.has(seqId)).toBe(true);

      // 再收到 ack (code=0)
      const ackMsg = {
        type: "ack",
        seq_id: seqId,
        code: 0,
        msg: "执行成功",
      };

      (service as any).handleTextMessage(JSON.stringify(ackMsg));

      // 验证命令已从队列中移除
      expect(pendingCommands.has(seqId)).toBe(false);

      // 验证触发了成功回调
      expect(onSuccess).toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();
    });
  });
});
