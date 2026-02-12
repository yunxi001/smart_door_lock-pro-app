# 设计文档 - 协议对齐

## 1. 概述

本设计文档描述了如何修改 `DeviceService.ts` 以完全符合智能门锁通信协议规范 v2.3。主要目标包括：

1. **完善消息格式**：添加缺失的 `app_id` 字段，修正字段命名
2. **实现两级确认机制**：正确处理 `server_ack` 和 `esp32_ack`（不转发）以及最终 `ack`
3. **统一错误处理**：实现 0-10 错误码映射和中文提示
4. **新增消息类型**：支持 `door_opened_report`、`password_report` 等新消息
5. **新增事件类型**：支持 `door_closed`、`lock_success`、`bolt_alarm` 等新事件
6. **完善命令支持**：实现 `user_mgmt`、`query`、`face_management`、`media_download` 等命令
7. **修复 seq_id 格式**：确保格式为 `时间戳_序号`（无前缀）
8. **升级音频 API**：使用 AudioWorklet 替代已弃用的 ScriptProcessorNode

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                              │
│  (全局状态管理、事件订阅、UI 路由)                          │
└────────────────────┬────────────────────────────────────────┘
                     │ 订阅事件
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   DeviceService                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  连接管理 (connect, disconnect, hello)               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  消息发送 (sendCommand, generateSeqId)               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  消息接收 (handleTextMessage, handleBinaryMessage)   │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  确认机制 (pendingCommands, timeout, retry)          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  音频系统 (AudioWorklet, PCM 播放/采集)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                     │ WebSocket
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                      WebSocket Server                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 消息流程

#### 命令发送流程
```
App 组件 → sendCommand() → 生成 seq_id → 加入 pendingCommands
         → WebSocket.send() → 启动超时计时器
```

#### 确认响应流程
```
WebSocket.onmessage → handleTextMessage()
  ├─ server_ack (code=0) → 继续等待 ack
  ├─ server_ack (code≠0) → 清理队列，触发错误回调
  └─ ack → 清理队列，触发成功/错误回调
```

#### 事件推送流程
```
WebSocket.onmessage → handleTextMessage()
  ├─ status_report → emit('status_report', data)
  ├─ event_report → emit('event_report', data)
  ├─ log_report → emit('log_report', data)
  ├─ visit_notification → emit('visit', data)
  └─ device_status → emit('device_status', data)
```

## 3. 组件和接口

### 3.1 核心类：DeviceService

**职责**：
- WebSocket 连接管理
- 消息序列号生成和追踪
- 命令发送和确认机制
- 消息解析和事件分发
- 音频播放和对讲
- 统计数据收集

**关键属性**：
```typescript
private ws: WebSocket | null
private listeners: EventCallback[]
private seqCounter: number
private lastSeqTimestamp: number
private pendingCommands: Map<string, PendingCommand>
private audioContext: AudioContext | null
private audioWorkletNode: AudioWorkletNode | null
```

**关键方法**：
```typescript
// 连接管理
connect(url: string, deviceId: string, appId: string): void
disconnect(): void

// 消息发送
generateSeqId(): string
sendCommand(command: object, options?: CommandOptions): string | null

// 消息处理
handleTextMessage(data: string): void
handleServerAck(msg: ServerAckMessage): void
handleAck(msg: AckMessage): void
handleDeviceStatus(msg: DeviceStatusMessage): void
handleStatusReport(msg: StatusReportMessage): void
handleEventReport(msg: EventReportMessage): void
handleLogReport(msg: LogReportMessage): void
handleDoorOpenedReport(msg: DoorOpenedReportMessage): void
handlePasswordReport(msg: PasswordReportMessage): void

// 命令方法
sendLockControl(command: string, duration?: number): void
sendUserMgmt(category: string, command: string, userId?: number, payload?: string): void
sendQuery(target: string, params?: object): void
sendFaceManagement(action: string, data?: object): void
sendMediaDownload(fileId: number): void

// 音频系统
initAudioSystem(): Promise<void>
playPCMAudio(pcmData: Int16Array): void
startTalk(): Promise<void>
stopTalk(): void
```

### 3.2 消息接口定义


#### Hello 消息
```typescript
interface HelloRequest {
  type: 'hello';
  device_id: string;
  app_id: string;
  client_type: 'app';
}

interface HelloResponse {
  type: 'hello';
  status: 'ok' | 'error';
  message?: string;
  device_info?: {
    online: boolean;
    mode: string;
  };
}
```

#### 服务器确认消息
```typescript
interface ServerAckMessage {
  type: 'server_ack';
  seq_id: string;
  code: number;  // 0-5
  msg: string;
  ts: number;
}
```

#### ESP32 确认消息
```typescript
interface AckMessage {
  type: 'ack';
  seq_id: string;
  code: number;  // 0-10
  msg: string;
}
```

#### 设备状态消息
```typescript
interface DeviceStatusMessage {
  type: 'device_status';
  status: 'online' | 'offline';
  device_id: string;
  ts: number;
  reason?: string;
}
```

#### 状态上报消息
```typescript
interface StatusReportMessage {
  type: 'status_report';
  ts: number;
  data: {
    bat: number;
    lux: number;
    lock: number;
    light: number;
  };
}
```

#### 事件上报消息
```typescript
interface EventReportMessage {
  type: 'event_report';
  ts: number;
  event: 'bell' | 'pir_trigger' | 'tamper' | 'door_open' | 'door_closed' | 'lock_success' | 'bolt_alarm' | 'low_battery';
  param: number;
}
```

#### 开锁日志消息
```typescript
interface LogReportMessage {
  type: 'log_report';
  ts: number;
  data: {
    method: string;
    uid: number;
    status: string;  // 'success' | 'fail' | 'locked'
    lock_time: number;
    fail_count: number;
  };
}
```

#### 门已开启消息
```typescript
interface DoorOpenedReportMessage {
  type: 'door_opened_report';
  ts: number;
  data: {
    method: string;
    source: 'outside' | 'inside' | 'unknown';
  };
}
```

#### 密码上报消息
```typescript
interface PasswordReportMessage {
  type: 'password_report';
  ts: number;
  data: {
    password: string;
  };
}
```

## 4. 数据模型

### 4.1 等待命令队列


```typescript
interface PendingCommand {
  seqId: string;
  command: object;
  sentAt: number;
  retryCount: number;
  timeoutId?: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

// 存储结构
private pendingCommands: Map<string, PendingCommand> = new Map();
```

**生命周期**：
1. 发送命令时创建并加入 Map
2. 收到 `server_ack` (code=0) 时保持在 Map 中
3. 收到 `server_ack` (code≠0) 或 `ack` 时从 Map 中移除
4. 超时重传时更新 `retryCount` 和 `timeoutId`
5. 超过最大重试次数时移除

### 4.2 seq_id 生成器

```typescript
private seqCounter: number = 0;
private lastSeqTimestamp: number = 0;

generateSeqId(): string {
  const timestamp = Date.now();
  
  // 如果时间戳变化，重置计数器
  if (timestamp !== this.lastSeqTimestamp) {
    this.seqCounter = 0;
    this.lastSeqTimestamp = timestamp;
  }
  
  const seqId = `${timestamp}_${this.seqCounter}`;
  this.seqCounter++;
  
  return seqId;
}
```

**格式规范**：
- 格式：`{timestamp}_{sequence}`
- timestamp：13 位毫秒级时间戳
- sequence：同一毫秒内从 0 开始递增
- 示例：`1702234567890_0`、`1702234567890_1`

### 4.3 错误码映射

#### server_ack 错误码 (0-5)
```typescript
const SERVER_ACK_ERRORS: Record<number, string> = {
  0: '成功',
  1: '设备离线',
  2: '参数错误',
  3: '未认证',
  4: '服务器内部错误',
  5: '重复消息'
};
```

#### ack 错误码 (0-10)
```typescript
const ACK_ERRORS: Record<number, string> = {
  0: '成功',
  1: '设备离线',
  2: '设备忙碌',
  3: '参数错误',
  4: '不支持',
  5: '超时',
  6: '硬件故障',
  7: '资源已满',
  8: '未认证',
  9: '重复消息',
  10: '内部错误'
};
```

## 5. 正确性属性

### 属性 1: seq_id 唯一性
**描述**：对于任意两个在同一连接会话中发送的命令，它们的 seq_id 必须不同。

**形式化**：
```
For all commands c1, c2 in session S,
  if c1 ≠ c2, then c1.seq_id ≠ c2.seq_id
```

**验证需求**：1.1, 1.2, 13.1, 13.2, 13.3, 13.4, 13.5

**测试策略**：
- Property-based test: 生成 1000 个命令，验证所有 seq_id 唯一
- Example test: 在同一毫秒内发送 10 个命令，验证序号递增

---

### 属性 2: seq_id 格式正确性
**描述**：所有生成的 seq_id 必须符合 `{timestamp}_{sequence}` 格式，且不包含任何前缀。

**形式化**：
```
For all seq_id generated by generateSeqId(),
  seq_id matches /^\d{13}_\d+$/ AND
  seq_id does not contain any prefix
```

**验证需求**：13.1, 13.2, 13.3

**测试策略**：
- Property-based test: 验证所有生成的 seq_id 匹配正则表达式
- Example test: 验证 `1702234567890_0` 格式正确，`app_1702234567890_0` 格式错误

---

### 属性 3: 命令超时重传
**描述**：如果命令发送后在超时时间内未收到 server_ack，则必须重传，最多重传 maxRetries 次。

**形式化**：
```
For all commands c with timeout T and maxRetries R,
  if no server_ack received within T milliseconds,
  then c is retransmitted with same seq_id,
  and retryCount is incremented,
  until retryCount >= R
```

**验证需求**：14.1, 14.2, 14.3, 14.4, 14.5

**测试策略**：
- Example test: 模拟服务器不响应，验证重传 3 次后触发错误回调
- Example test: 验证重传时使用相同的 seq_id

---

### 属性 4: server_ack 处理正确性
**描述**：收到 server_ack 后，根据 code 字段正确处理：code=0 继续等待 ack，code≠0 清理队列并触发错误。

**形式化**：
```
For all server_ack messages m with seq_id s,
  if m.code = 0, then pendingCommands[s] remains in queue
  if m.code ≠ 0, then pendingCommands[s] is removed and onError is called
  if m.code = 5, then pendingCommands[s] is removed but onError is not called
```

**验证需求**：2.1, 2.2, 2.3, 2.4, 18.1, 18.2, 18.3

**测试策略**：
- Example test: 发送命令，收到 server_ack (code=0)，验证命令仍在队列中
- Example test: 发送命令，收到 server_ack (code=1)，验证命令被移除且触发错误回调
- Example test: 发送命令，收到 server_ack (code=5)，验证命令被移除但不触发错误回调

---

### 属性 5: ack 处理正确性
**描述**：收到 ack 后，根据 code 字段触发成功或错误回调，并清理队列。

**形式化**：
```
For all ack messages m with seq_id s,
  pendingCommands[s] is removed from queue AND
  if m.code = 0, then onSuccess is called
  if m.code ≠ 0, then onError is called with error message
```

**验证需求**：3.1, 3.2, 3.3

**测试策略**：
- Example test: 发送命令，收到 ack (code=0)，验证触发 onSuccess 回调
- Example test: 发送命令，收到 ack (code=6)，验证触发 onError 回调并显示"硬件故障"

---

### 属性 6: 错误码映射完整性
**描述**：所有协议定义的错误码都必须有对应的中文描述。

**形式化**：
```
For all error codes c in range [0, 10],
  ACK_ERRORS[c] is defined AND ACK_ERRORS[c] is a non-empty string
```

**验证需求**：3.1, 3.2, 3.3

**测试策略**：
- Example test: 验证 ACK_ERRORS 包含 0-10 所有错误码
- Example test: 验证每个错误码对应的描述为非空中文字符串

---

### 属性 7: hello 消息包含 app_id
**描述**：发送 hello 消息时必须包含 app_id 字段。

**形式化**：
```
For all hello messages h sent by connect(),
  h.app_id is defined AND h.app_id is a non-empty string
```

**验证需求**：1.1, 1.2, 1.3

**测试策略**：
- Example test: 调用 connect()，验证发送的 hello 消息包含 app_id 字段

---

### 属性 8: 事件类型完整性
**描述**：所有协议定义的事件类型都必须被正确处理并触发对应的日志。

**形式化**：
```
For all event_report messages e with event type t,
  if t in ['bell', 'pir_trigger', 'tamper', 'door_open', 'door_closed', 'lock_success', 'bolt_alarm', 'low_battery'],
  then handleEventReport(e) emits 'log' event with appropriate message
```

**验证需求**：4.1, 4.2, 4.3, 4.4, 4.5

**测试策略**：
- Example test: 模拟收到 door_closed 事件，验证触发"门已关闭"日志
- Example test: 模拟收到 lock_success 事件，验证触发"上锁成功"日志
- Example test: 模拟收到 bolt_alarm 事件，验证触发"锁舌上锁失败，请尝试远程上锁"日志

---

### 属性 9: log_report 字段正确性
**描述**：处理 log_report 消息时必须使用 status 和 lock_time 字段，而非旧版的 result 和 fail_count。

**形式化**：
```
For all log_report messages m,
  handleLogReport(m) reads m.data.status (not m.data.result) AND
  handleLogReport(m) reads m.data.lock_time (not m.data.fail_count)
```

**验证需求**：7.1, 7.2, 7.3, 7.4

**测试策略**：
- Example test: 模拟收到 log_report 消息，验证正确读取 status 字段
- Example test: 验证 status='success' 时显示"成功"，status='fail' 时显示"失败"

---

### 属性 10: 新消息类型支持
**描述**：必须支持 door_opened_report 和 password_report 消息类型。

**形式化**：
```
For all door_opened_report messages m,
  handleTextMessage(m) calls handleDoorOpenedReport(m) AND
  emits 'door_opened_report' event

For all password_report messages m,
  handleTextMessage(m) calls handlePasswordReport(m) AND
  emits 'password_report' event
```

**验证需求**：5.1, 5.2, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4

**测试策略**：
- Example test: 模拟收到 door_opened_report 消息，验证触发对应事件
- Example test: 模拟收到 password_report 消息，验证触发对应事件

---

### 属性 11: 设备上下线通知
**描述**：收到 device_status 消息时必须触发对应的日志和事件。

**形式化**：
```
For all device_status messages m,
  if m.status = 'online', then emit 'log' with "设备已上线"
  if m.status = 'offline', then emit 'log' with "设备已离线"
  AND emit 'device_status' event with m
```

**验证需求**：15.1, 15.2, 15.3, 15.4

**测试策略**：
- Example test: 模拟收到 online 消息，验证触发"设备已上线"日志
- Example test: 模拟收到 offline 消息，验证触发"设备已离线"日志

---

### 属性 12: 命令方法完整性
**描述**：必须提供所有协议定义的命令发送方法。

**形式化**：
```
DeviceService provides methods:
  - sendLockControl(command, duration)
  - sendUserMgmt(category, command, userId, payload)
  - sendQuery(target, params)
  - sendFaceManagement(action, data)
  - sendMediaDownload(fileId)
  - sendMediaDownloadChunk(fileId, chunkIndex, chunkSize)
```

**验证需求**：8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4, 11.1, 11.2, 11.3, 11.4

**测试策略**：
- Example test: 验证所有方法存在且可调用
- Example test: 调用每个方法，验证发送的消息格式正确

---

### 属性 13: 音频 API 现代化
**描述**：音频对讲功能必须优先使用 AudioWorklet，不支持时降级到 ScriptProcessorNode。

**形式化**：
```
For all audio talk sessions,
  if AudioWorklet is supported, then use AudioWorklet
  else use ScriptProcessorNode
  AND no deprecation warnings are emitted
```

**验证需求**：16.1, 16.2, 16.3, 16.4

**测试策略**：
- Example test: 在支持 AudioWorklet 的浏览器中验证使用 AudioWorklet
- Example test: 模拟不支持 AudioWorklet 的环境，验证降级到 ScriptProcessorNode

---

### 属性 14: 日志记录完整性
**描述**：所有关键操作都必须记录日志，包含必要的上下文信息。

**形式化**：
```
For all commands sent,
  emit 'log' event with type and seq_id

For all responses received,
  emit 'log' event with type, seq_id, and code

For all timeout retries,
  emit 'log' event with retry count
```

**验证需求**：17.1, 17.2, 17.3, 17.4

**测试策略**：
- Example test: 发送命令，验证触发日志事件
- Example test: 收到响应，验证触发日志事件
- Example test: 超时重传，验证触发日志事件

---

### 属性 15: 错误提示友好性
**描述**：所有错误提示必须使用中文，并提供操作建议。

**形式化**：
```
For all error messages,
  message is in Chinese AND
  message provides actionable guidance
```

**验证需求**：19.1, 19.2, 19.3, 19.4, 19.5

**测试策略**：
- Example test: 验证设备离线时提示"请检查网络连接"
- Example test: 验证设备忙碌时提示"请稍后重试"
- Example test: 验证硬件故障时提示"请联系维修"

## 6. 错误处理

### 6.1 连接错误

| 错误场景 | 处理策略 |
|----------|----------|
| WebSocket 连接失败 | 触发 'log' 事件，状态设为 'disconnected' |
| hello 认证失败 | 记录错误日志，断开连接 |
| 设备离线 | 显示"设备离线"提示，禁用操作按钮 |

### 6.2 命令错误

| 错误场景 | 处理策略 |
|----------|----------|
| 未连接服务器 | 立即返回错误，触发 onError 回调 |
| server_ack 返回错误 | 清理等待队列，触发 onError 回调 |
| ack 返回错误 | 清理等待队列，触发 onError 回调，显示错误描述 |
| 命令超时 | 重传最多 3 次，超过后触发 onError 回调 |

### 6.3 消息解析错误

| 错误场景 | 处理策略 |
|----------|----------|
| JSON 解析失败 | 捕获异常，记录错误日志，不中断连接 |
| 未知消息类型 | 记录警告日志，忽略消息 |
| 字段缺失 | 使用默认值或跳过处理 |

### 6.4 音频错误

| 错误场景 | 处理策略 |
|----------|----------|
| 麦克风权限拒绝 | 显示"无法访问麦克风"提示 |
| AudioContext 初始化失败 | 记录错误日志，禁用音频功能 |
| AudioContext suspended | 提示用户点击按钮激活音频 |

## 7. 测试策略

### 7.1 单元测试

**测试目标**：
- seq_id 生成器
- 错误码映射
- 消息解析函数

**测试工具**：Jest + @testing-library/react

**示例测试**：
```typescript
describe('generateSeqId', () => {
  it('should generate unique seq_id', () => {
    const service = new DeviceService();
    const ids = new Set();
    for (let i = 0; i < 1000; i++) {
      ids.add(service.generateSeqId());
    }
    expect(ids.size).toBe(1000);
  });

  it('should match format {timestamp}_{sequence}', () => {
    const service = new DeviceService();
    const seqId = service.generateSeqId();
    expect(seqId).toMatch(/^\d{13}_\d+$/);
  });
});
```

### 7.2 集成测试

**测试目标**：
- WebSocket 连接流程
- 命令发送和确认机制
- 事件订阅和触发

**测试工具**：Jest + mock WebSocket

**示例测试**：
```typescript
describe('sendCommand with retry', () => {
  it('should retry 3 times on timeout', async () => {
    const mockWs = new MockWebSocket();
    const service = new DeviceService();
    service.connect('ws://test', 'device1', 'app1');
    
    const onError = jest.fn();
    service.sendCommand({ type: 'lock_control' }, { onError, timeout: 100 });
    
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(mockWs.sendCount).toBe(4); // 1 initial + 3 retries
    expect(onError).toHaveBeenCalledWith('请求超时');
  });
});
```

### 7.3 端到端测试

**测试目标**：
- 完整的用户操作流程
- 与真实服务器的交互

**测试工具**：Playwright

**测试场景**：
1. 连接设备 → 发送开锁命令 → 收到确认
2. 注册人脸 → 收到到访通知
3. 查询开锁日志 → 显示记录列表

## 8. 实现计划

### 阶段 1: 核心修复（需求 1-7）
- 修复 hello 消息添加 app_id
- 实现 server_ack 和 ack 处理
- 完善错误码映射
- 新增事件类型支持
- 修复 log_report 字段名称
- 新增 door_opened_report 和 password_report 处理

### 阶段 2: 命令扩展（需求 8-12）
- 实现 user_mgmt 命令
- 实现 query 命令
- 实现 face_management 命令
- 实现 media_download 命令
- 实现 system 命令

### 阶段 3: 优化改进（需求 13-19）
- 修复 seq_id 格式
- 完善超时和重试机制
- 实现设备上下线通知
- 升级音频 API
- 完善日志记录
- 实现防重放机制
- 完善错误提示

### 阶段 4: 测试和文档
- 编写单元测试
- 编写集成测试
- 更新 API 文档
- 编写使用示例

## 9. 风险和缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| AudioWorklet 浏览器兼容性 | 部分浏览器无法使用对讲功能 | 提供 ScriptProcessorNode 降级方案 |
| seq_id 格式变更 | 与旧版服务器不兼容 | 服务器端同时支持新旧格式 |
| 错误码映射不完整 | 显示未知错误 | 提供默认错误消息 |
| 超时重传导致重复执行 | 命令被执行多次 | 服务器端实现防重放机制 |

## 10. 依赖和约束

**依赖**：
- WebSocket API (浏览器原生)
- Web Audio API (浏览器原生)
- MediaDevices API (需 HTTPS 或 localhost)

**约束**：
- 必须在 HTTPS 或 localhost 环境下运行（麦克风权限）
- AudioContext 必须在用户交互后激活（浏览器安全策略）
- WebSocket 连接需要稳定的网络环境

**性能要求**：
- 视频帧率：10 fps
- 音频延迟：< 200ms
- 命令响应时间：< 3s

## 11. 附录

### 11.1 协议版本对比

| 特性 | v2.2 | v2.3 |
|------|------|------|
| 错误码范围 | 不统一 | 统一为 0-10 |
| log_report 字段 | result, fail_count | status, lock_time |
| 新增消息 | - | door_opened_report, password_report |
| 新增事件 | - | door_closed, lock_success, bolt_alarm |
| esp32_ack 转发 | 未明确 | 明确不转发 |

### 11.2 参考文档

- 智能猫眼门锁系统-服务器与App通信协议规范-v2.3.md
- 消息ID机制与工作流程_新版.md
- seq_id使用规范与注意事项_服务器端.md
