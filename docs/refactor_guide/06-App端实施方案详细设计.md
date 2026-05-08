# App端协议简化实施方案详细设计

> **版本：** v1.0
> **日期：** 2026-05-05
> **基于：** 重构文档 v6.0 + 缺失分析 v1.0

---

## 📋 方案决策总结

| 决策点          | 选择方案           | 理由                   |
| --------------- | ------------------ | ---------------------- |
| 1. 命令响应匹配 | **单命令模式**     | 简单可靠，符合简化原则 |
| 2. HTTP API     | **补充完整规范**   | 查询功能基础           |
| 3. 二进制流处理 | **保持原有方式**   | BinaryProtocol2 不变   |
| 4. 按钮防抖     | **长耗时操作需要** | 开门2秒、录指纹更长    |
| 5. 错误处理     | **按建议实施**     | 提升用户体验           |
| 6. 进度反馈     | **只回复最终结果** | 简化实现               |

---

## 🎯 核心设计：单命令模式

### 设计原则

**同一时间只允许一个命令在执行中**

- ✅ 避免响应混乱
- ✅ 实现简单
- ✅ 用户体验可接受（通过UI反馈优化）
- ✅ 符合"简化"的设计目标

### 响应匹配策略

不同命令的最终响应消息类型不同：

| 命令类型 | 等待的响应消息 | 原因 |
|---------|--------------|------|
| `lock_control` | `ack` | 执行结果只有成功/失败，ack足够 |
| `dev_control` | `ack` | 发完即回，ack足够 |
| `user_mgmt` (add/del/query) | `user_mgmt_result` | 包含分配的ID、查询数量等关键数据，ack只有code+msg不够 |
| `system` (start/stop_monitor) | `ack` | 执行结果只有成功/失败 |

**原理**：`user_mgmt_result` 携带了操作的具体结果（`val`=分配ID/数量、`msg`=具体描述），这些数据必须在Promise resolve之前拿到。如果让ack来resolve，user_mgmt_result中的详细信息会丢失。

### 实现方案

```typescript
// services/DeviceService.ts

// 响应类型：决定哪个消息类型触发Promise resolve
type ResponseType = 'ack' | 'user_mgmt_result';

export class DeviceService {
  private ws: WebSocket | null = null;
  private listeners: EventCallback[] = [];

  // 单命令模式状态
  private commandInProgress: boolean = false;
  private pendingResolve: ((value: any) => void) | null = null;
  private pendingReject: ((error: any) => void) | null = null;
  private pendingResponseType: ResponseType = 'ack';  // 当前命令等待的响应类型
  private commandTimeout: number | null = null;

  /**
   * 发送命令（单命令模式）
   *
   * @param command 命令对象
   * @param timeout 超时时间（毫秒），默认10秒
   * @param responseType 等待的响应类型，默认 'ack'。user_mgmt命令应传 'user_mgmt_result'
   * @returns Promise，成功时resolve，失败时reject
   */
  public async sendCommand(
    command: object,
    timeout: number = 10000,
    responseType: ResponseType = 'ack',
  ): Promise<void> {
    // 检查是否有命令正在执行
    if (this.commandInProgress) {
      throw new Error("请等待上一个命令完成");
    }

    // 检查连接状态
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("未连接服务器");
    }

    return new Promise((resolve, reject) => {
      this.commandInProgress = true;
      this.pendingResponseType = responseType;
      this.pendingResolve = resolve;
      this.pendingReject = reject;

      // 发送命令（不添加 seq_id）
      this.ws!.send(JSON.stringify(command));

      // 记录日志
      const commandType = (command as any).type;
      this.emit("log", {
        msg: `发送命令: ${commandType}`,
        type: "info",
      });

      // 设置超时
      this.commandTimeout = window.setTimeout(() => {
        this.clearCommandState();
        reject(new Error("命令超时，请重试"));
      }, timeout);
    });
  }

  /**
   * 处理 ack 响应
   * 仅当 pendingResponseType === 'ack' 时触发resolve
   */
  private handleAck(msg: { type: string; code: number; msg: string }) {
    const { code, msg: message } = msg;

    // 记录日志并emit事件（无论是否在等待命令）
    this.emit("log", {
      msg: `收到响应: ack (code: ${code})`,
      type: "info",
    });
    this.emit("ack", msg);

    // 只处理ack类型的命令
    if (!this.commandInProgress || this.pendingResponseType !== 'ack') {
      return;  // 不是在等ack，可能是等待user_mgmt_result的命令
    }

    this.resolveCommand(code === 0, message || (code === 0 ? 'ok' : '命令执行失败'));
  }

  /**
   * 处理 user_mgmt_result 响应
   * 仅当 pendingResponseType === 'user_mgmt_result' 时触发resolve
   */
  private handleUserMgmtResult(msg: {
    type: string;
    category: string;
    command: string;
    result: boolean;
    val?: number;
    msg?: string;
  }): void {
    const { category, command, result, val, msg: serverMsg } = msg;

    // 先emit事件让App.tsx拿到详细信息（val、category等）
    // 根据category分发到不同事件
    switch (category) {
      case 'finger':
        this.emit('finger_result', { command, result: result ? 'success' : 'failed', data: { id: val }, message: serverMsg });
        break;
      case 'nfc':
        this.emit('nfc_result', { command, result: result ? 'success' : 'failed', data: { id: val }, message: serverMsg });
        break;
      case 'password':
        this.emit('password_result', { command, result: result ? 'success' : 'failed', message: serverMsg });
        break;
    }

    // 只处理user_mgmt_result类型的命令
    if (!this.commandInProgress || this.pendingResponseType !== 'user_mgmt_result') {
      return;  // 不是user_mgmt命令或没有命令在执行
    }

    this.resolveCommand(result === true, serverMsg || (result ? '操作成功' : '操作失败'));
  }

  /**
   * 统一的命令结果处理
   */
  private resolveCommand(success: boolean, message: string) {
    if (this.commandTimeout) {
      clearTimeout(this.commandTimeout);
      this.commandTimeout = null;
    }

    if (success) {
      this.emit("log", { msg: "命令执行成功", type: "success" });
      this.pendingResolve?.();
    } else {
      this.emit("log", { msg: `命令执行失败: ${message}`, type: "error" });
      this.pendingReject?.(new Error(message));
    }

    this.clearCommandState();
  }

  /**
   * 清理命令状态
   */
  private clearCommandState() {
    this.commandInProgress = false;
    this.pendingResponseType = 'ack';
    this.pendingResolve = null;
    this.pendingReject = null;
    if (this.commandTimeout) {
      clearTimeout(this.commandTimeout);
      this.commandTimeout = null;
    }
  }

  /**
   * 断开连接时清理状态
   */
  public disconnect() {
    // 如果有命令在执行，触发错误
    if (this.commandInProgress) {
      this.pendingReject?.(new Error("连接已断开"));
      this.clearCommandState();
    }

    // ... 其他断开逻辑
  }
}
```

### 使用示例

```typescript
// screens/MonitorScreen.tsx

async function handleUnlock() {
  try {
    // lock_control 等 ack
    await deviceService.sendCommand(
      { type: "lock_control", command: "unlock" },
      5000,       // 5秒超时
      'ack',      // 等待ack响应
    );
    showToast("开锁成功", "success");
  } catch (error) {
    if (error.message === "请等待上一个命令完成") {
      showToast("请等待上一个操作完成", "warning");
    } else {
      showToast(error.message, "error");
    }
  }
}

async function handleAddFinger() {
  try {
    // user_mgmt 等 user_mgmt_result
    // user_mgmt_result 中包含分配的用户ID等信息
    await deviceService.sendCommand(
      { type: "user_mgmt", category: "finger", command: "add", user_id: 0 },
      90000,               // 90秒超时（录入需要用户按压多次）
      'user_mgmt_result',  // 等待user_mgmt_result响应（包含分配的ID等详细信息）
    );
    showToast("指纹录入成功", "success");
  } catch (error) {
    showToast(error.message, "error");
  }
}
```

---

## ⏱️ 按钮防抖策略

### 防抖时间配置

基于您的需求（长耗时操作需要防抖），制定以下策略：

| 操作类型             | 防抖时间 | 理由                                      |
| -------------------- | -------- | ----------------------------------------- |
| **开锁/关锁**        | 3秒      | 电机转动需要约2秒                         |
| **用户管理（添加）** | 无防抖   | 操作本身耗时长（30-90秒），命令模式已保护 |
| **用户管理（删除）** | 2秒      | 避免误操作                                |
| **蜂鸣器**           | 1秒      | 避免重复响铃                              |
| **OLED显示**         | 1秒      | 避免频繁切换                              |
| **补光灯**           | 1秒      | 避免频繁开关                              |
| **启动/停止监控**    | 2秒      | 避免频繁切换                              |

### 通用防抖Hook

```typescript
// hooks/useCommandDebounce.ts
import { useState, useCallback, useRef } from "react";

interface UseCommandDebounceOptions {
  /** 防抖时间（毫秒），0表示不防抖 */
  debounceMs?: number;
  /** 命令超时时间（毫秒） */
  timeout?: number;
  /** 成功回调 */
  onSuccess?: () => void;
  /** 失败回调 */
  onError?: (error: Error) => void;
}

export function useCommandDebounce(
  command: () => Promise<void>,
  options: UseCommandDebounceOptions = {},
) {
  const { debounceMs = 2000, timeout = 10000, onSuccess, onError } = options;

  const [isExecuting, setIsExecuting] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);

  const execute = useCallback(async () => {
    // 如果正在执行，忽略
    if (isExecuting) {
      return;
    }

    setIsExecuting(true);

    try {
      await command();
      onSuccess?.();
    } catch (error) {
      onError?.(error as Error);
    } finally {
      // 防抖延迟后才允许下次执行
      if (debounceMs > 0) {
        debounceTimerRef.current = window.setTimeout(() => {
          setIsExecuting(false);
        }, debounceMs);
      } else {
        setIsExecuting(false);
      }
    }
  }, [command, debounceMs, isExecuting, onSuccess, onError]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { execute, isExecuting };
}
```

### 使用示例

```typescript
// screens/MonitorScreen.tsx
import { useCommandDebounce } from '@/hooks/useCommandDebounce';

function MonitorScreen() {
  const [toastMessage, setToastMessage] = useState('');

  // 开锁命令（3秒防抖）
  const { execute: handleUnlock, isExecuting: unlocking } = useCommandDebounce(
    async () => {
      await deviceService.sendCommand(
        { type: 'lock_control', command: 'unlock' },
        5000
      );
    },
    {
      debounceMs: 3000,
      timeout: 5000,
      onSuccess: () => setToastMessage('开锁成功'),
      onError: (error) => setToastMessage(error.message),
    }
  );

  // 蜂鸣器（1秒防抖）
  const { execute: handleBeep, isExecuting: beeping } = useCommandDebounce(
    async () => {
      await deviceService.sendCommand({
        type: 'dev_control',
        target: 'beep',
        count: 3,
        mode: 'alarm',
      });
    },
    {
      debounceMs: 1000,
    }
  );

  // 录入指纹（无防抖，因为操作本身耗时长）
  const { execute: handleAddFinger, isExecuting: addingFinger } = useCommandDebounce(
    async () => {
      await deviceService.sendCommand(
        {
          type: 'user_mgmt',
          category: 'finger',
          command: 'add',
          user_id: 0,
          user_name: '新指纹',
        },
        90000 // 90秒超时
      );
    },
    {
      debounceMs: 0, // 不防抖
      timeout: 90000,
      onSuccess: () => setToastMessage('指纹录入成功'),
      onError: (error) => setToastMessage(error.message),
    }
  );

  return (
    <div className="p-4">
      {/* 开锁按钮 */}
      <button
        onClick={handleUnlock}
        disabled={unlocking}
        className={`px-4 py-2 rounded ${
          unlocking
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
      >
        {unlocking ? '开锁中...' : '开锁'}
      </button>

      {/* 蜂鸣器按钮 */}
      <button
        onClick={handleBeep}
        disabled={beeping}
        className="px-4 py-2 rounded bg-yellow-500 text-white ml-2"
      >
        {beeping ? '响铃中...' : '蜂鸣器'}
      </button>

      {/* 录入指纹按钮 */}
      <button
        onClick={handleAddFinger}
        disabled={addingFinger}
        className="px-4 py-2 rounded bg-green-500 text-white ml-2"
      >
        {addingFinger ? '录入中...' : '录入指纹'}
      </button>

      {/* Toast 提示 */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
```

---

## 🚨 错误处理策略

### 错误分类与处理

```typescript
// utils/errorHandler.ts

export interface CommandError {
  code: number;
  message: string;
  retryable: boolean;
  userAction?: string;
}

/**
 * 解析 ack 错误
 */
export function parseAckError(code: number, msg: string): CommandError {
  // code 0 = 成功（不应该调用此函数）
  // code 1 = 失败，根据 msg 判断具体原因

  // 常见错误模式匹配
  const errorPatterns: Array<{
    pattern: RegExp;
    retryable: boolean;
    userAction?: string;
  }> = [
    {
      pattern: /设备离线|离线|offline/i,
      retryable: false,
      userAction: "请检查设备网络连接",
    },
    {
      pattern: /设备忙|busy/i,
      retryable: true,
      userAction: "请稍后重试",
    },
    {
      pattern: /超时|timeout|无响应/i,
      retryable: true,
      userAction: "请重试",
    },
    {
      pattern: /参数错误|invalid/i,
      retryable: false,
      userAction: "请检查输入参数",
    },
    {
      pattern: /权限|permission|未认证/i,
      retryable: false,
      userAction: "请重新登录",
    },
    {
      pattern: /已满|full/i,
      retryable: false,
      userAction: "请先删除部分数据",
    },
  ];

  // 匹配错误模式
  for (const { pattern, retryable, userAction } of errorPatterns) {
    if (pattern.test(msg)) {
      return {
        code,
        message: msg,
        retryable,
        userAction,
      };
    }
  }

  // 默认错误
  return {
    code,
    message: msg || "命令执行失败",
    retryable: true,
    userAction: "请重试",
  };
}
```

### 错误展示组件

```typescript
// components/ErrorToast.tsx
import { X, AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorToastProps {
  error: CommandError;
  onRetry?: () => void;
  onDismiss: () => void;
}

export function ErrorToast({ error, onRetry, onDismiss }: ErrorToastProps) {
  return (
    <div className="fixed bottom-4 left-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg animate-slide-up">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-medium">{error.message}</div>
          {error.userAction && (
            <div className="text-sm opacity-90 mt-1">{error.userAction}</div>
          )}
        </div>
        <div className="flex gap-2">
          {error.retryable && onRetry && (
            <button
              onClick={onRetry}
              className="p-1 hover:bg-red-600 rounded"
              title="重试"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-red-600 rounded"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 使用示例

```typescript
// screens/MonitorScreen.tsx
import { parseAckError } from '@/utils/errorHandler';
import { ErrorToast } from '@/components/ErrorToast';

function MonitorScreen() {
  const [error, setError] = useState<CommandError | null>(null);
  const [lastCommand, setLastCommand] = useState<() => Promise<void>>();

  const handleUnlock = async () => {
    const command = async () => {
      await deviceService.sendCommand({
        type: 'lock_control',
        command: 'unlock',
      });
    };

    setLastCommand(() => command);

    try {
      await command();
      setError(null);
    } catch (err) {
      // 解析错误
      const parsedError = parseAckError(1, err.message);
      setError(parsedError);
    }
  };

  const handleRetry = () => {
    if (lastCommand) {
      setError(null);
      lastCommand();
    }
  };

  return (
    <div>
      {/* ... 其他UI ... */}

      {/* 错误提示 */}
      {error && (
        <ErrorToast
          error={error}
          onRetry={error.retryable ? handleRetry : undefined}
          onDismiss={() => setError(null)}
        />
      )}
    </div>
  );
}
```

---

## 📊 用户管理进度反馈（简化版）

### 设计决策

根据您的要求：**只回复最终成功或失败**

这意味着：

- ❌ 不显示"请按手指 (1/3)"等中间进度
- ✅ 只在最终完成时显示结果
- ✅ 简化实现，减少UI复杂度

### 实现方案

```typescript
// services/DeviceService.ts

/**
 * 处理用户管理结果（简化版）
 * 只处理最终结果，忽略中间进度
 */
private handleUserMgmtResult(msg: {
  type: string;
  category: 'finger' | 'nfc' | 'password';
  command: string;
  result: boolean;
  val?: number;
  msg?: string;
}): void {
  const { category, command, result, val, msg: serverMsg } = msg;

  // 只处理最终结果（result 为 true 或明确失败）
  // 忽略中间进度消息（result 为 false 但不是最终失败）

  // 判断是否为最终结果
  const isFinalResult =
    result === true || // 成功
    (result === false && serverMsg && serverMsg !== '请按手指' && serverMsg !== '请刷卡'); // 明确失败

  if (!isFinalResult) {
    // 中间进度消息，忽略
    return;
  }

  // 获取类别和命令的中文描述
  const categoryText = this.getUserMgmtCategoryText(category);
  const commandText = this.getUserMgmtCommandText(command);

  // 触发对应事件
  switch (category) {
    case 'finger':
      this.emit('finger_result', {
        command,
        result: result ? 'success' : 'failed',
        userId: val,
        message: serverMsg || (result ? '操作成功' : '操作失败'),
      });
      break;
    case 'nfc':
      this.emit('nfc_result', {
        command,
        result: result ? 'success' : 'failed',
        userId: val,
        message: serverMsg || (result ? '操作成功' : '操作失败'),
      });
      break;
    case 'password':
      this.emit('password_result', {
        command,
        result: result ? 'success' : 'failed',
        message: serverMsg || (result ? '操作成功' : '操作失败'),
      });
      break;
  }

  // 记录日志
  if (result) {
    let successMsg = `${categoryText}${commandText}成功`;
    if (command === 'query' && val !== undefined) {
      successMsg = `${categoryText}${commandText}成功，共 ${val} 条`;
    }
    this.emit('log', { msg: successMsg, type: 'success' });
  } else {
    this.emit('log', {
      msg: `${categoryText}${commandText}失败: ${serverMsg || '未知错误'}`,
      type: 'error',
    });
  }
}
```

### UI 实现

```typescript
// screens/FacesScreen.tsx

function FacesScreen() {
  const [enrolling, setEnrolling] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    // 订阅指纹结果
    const unsubscribe = deviceService.on('finger_result', (type, data) => {
      if (data.command === 'add') {
        setEnrolling(false);
        setResult(data.result === 'success' ? '录入成功' : data.message);
      }
    });

    return unsubscribe;
  }, []);

  const handleAddFinger = async () => {
    setEnrolling(true);
    setResult(null);

    try {
      await deviceService.sendCommand(
        {
          type: 'user_mgmt',
          category: 'finger',
          command: 'add',
          user_id: 0,
          user_name: '新指纹',
        },
        90000 // 90秒超时
      );
    } catch (error) {
      setEnrolling(false);
      setResult(error.message);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleAddFinger}
        disabled={enrolling}
        className={`px-4 py-2 rounded ${
          enrolling
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
      >
        {enrolling ? '录入中，请按照语音提示操作...' : '录入指纹'}
      </button>

      {/* 结果提示 */}
      {result && (
        <div
          className={`mt-4 p-3 rounded ${
            result === '录入成功'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {result}
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 完整的消息处理流程

### 文本消息处理

```typescript
// services/DeviceService.ts

private handleTextMessage(data: string) {
  try {
    const msg = JSON.parse(data);

    // 使用 Map 优化消息分发
    const handler = this.messageHandlers.get(msg.type);
    if (handler) {
      handler.call(this, msg);
    } else {
      console.warn('未知消息类型:', msg.type);
    }
  } catch (e) {
    console.error('消息解析失败:', e);
  }
}

// 消息处理器映射
private messageHandlers = new Map<string, (msg: any) => void>([
  ['hello', this.handleHello],
  ['ack', this.handleAck],
  ['status_report', this.handleStatusReport],
  ['event_report', this.handleEventReport],
  ['log_report', this.handleLogReport],
  ['door_opened_report', this.handleDoorOpenedReport],
  ['user_mgmt_result', this.handleUserMgmtResult],
  ['device_status', this.handleDeviceStatus],
  ['visit_notification', this.handleVisitNotification],
  ['visitor_intent_notification', this.handleVisitorIntentNotification],
]);
```

### 二进制消息处理（保持不变）

```typescript
// services/DeviceService.ts

/**
 * 处理二进制消息（BinaryProtocol2）
 * 此部分保持原有实现不变
 */
private handleBinaryMessage(data: ArrayBuffer) {
  const view = new DataView(data);

  // 解析 BinaryProtocol2 头部
  const version = view.getUint16(0);
  const type = view.getUint16(2);
  const reserved = view.getUint32(4);
  const timestamp = view.getUint32(8);
  const payloadSize = view.getUint32(12);
  const payload = data.slice(16);

  // 统计
  this.stats.dataReceived += data.byteLength;

  if (type === 0 && reserved === 0) {
    // 音频帧（OPUS 或 PCM）
    this.stats.audioPackets++;
    this.handleAudioFrame(payload);
  } else if (type === 0 && reserved !== 0) {
    // 视频帧（JPEG）
    const width = (reserved >> 16) & 0xFFFF;
    const height = reserved & 0xFFFF;
    this.stats.videoFrames++;
    this.fpsFrameCount++;
    this.handleVideoFrame(payload, width, height);
  } else {
    console.warn('未知二进制帧类型:', type);
  }
}

private handleAudioFrame(payload: ArrayBuffer) {
  // 转换为 Int16Array（PCM 16kHz）
  const pcmData = new Int16Array(payload);
  this.playPCMAudio(pcmData);
}

private handleVideoFrame(payload: ArrayBuffer, width: number, height: number) {
  // 创建 Blob URL
  const blob = new Blob([payload], { type: 'image/jpeg' });
  const url = URL.createObjectURL(blob);

  // 触发视频帧事件
  this.emit('videoFrame', { url, width, height });
}
```

---

## 📝 修改清单总结

### DeviceService.ts 需要修改的部分

| 修改项                               | 操作 | 代码行数估算           |
| ------------------------------------ | ---- | ---------------------- |
| 1. 删除 `generateSeqId()`            | 删除 | -20行                  |
| 2. 删除 `pendingCommands` 队列       | 删除 | -100行                 |
| 3. 删除 `handleServerAck()`          | 删除 | -50行                  |
| 4. 简化 `sendCommand()`              | 重写 | +30行                  |
| 5. 简化 `handleAck()`                | 重写 | +20行                  |
| 6. 简化 `handleUserMgmtResult()`     | 修改 | +10行                  |
| 7. 删除超时重传逻辑                  | 删除 | -80行                  |
| 8. 删除 `getCommandConfig()`         | 删除 | -40行                  |
| 9. 删除 `handleTimeout()`            | 删除 | -50行                  |
| 10. 删除 `clearPendingCommand()`     | 删除 | -20行                  |
| 11. 删除 `clearAllPendingCommands()` | 删除 | -10行                  |
| 12. 删除 `getAckErrorMessage()`      | 删除 | -30行                  |
| **总计**                             |      | **净减少约 340行代码** |

### 新增文件

| 文件                          | 用途         | 代码行数估算 |
| ----------------------------- | ------------ | ------------ |
| `hooks/useCommandDebounce.ts` | 通用防抖Hook | 50行         |
| `utils/errorHandler.ts`       | 错误处理工具 | 80行         |
| `components/ErrorToast.tsx`   | 错误提示组件 | 60行         |
| **总计**                      |              | **190行**    |

### 净代码变化

- **删除：** 约 340行
- **新增：** 约 190行
- **净减少：** 约 150行

---

## ✅ 实施优势

1. **代码更简洁**：净减少 150行代码
2. **逻辑更清晰**：单命令模式易于理解和维护
3. **用户体验好**：通过UI反馈（按钮状态、Toast提示）优化体验
4. **风险可控**：保留二进制流处理，只修改文本消息部分
5. **易于测试**：单命令模式更容易编写单元测试

---

## 🎯 下一步行动

1. **确认方案** - 您是否同意此设计？
2. **创建Spec** - 基于此方案创建完整的实施Spec
3. **开始实施** - 按照Spec分阶段实施

您觉得这个方案如何？有需要调整的地方吗？
