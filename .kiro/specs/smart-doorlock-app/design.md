# 设计文档

## 概述

本设计文档描述智能猫眼门锁系统 App 的技术架构和实现方案。App 采用 React + TypeScript 技术栈，通过 WebSocket 与服务器通信，实现实时监控、远程控制、人脸管理等功能。

基于协议规范 v2.2，本次迭代重构 UI 架构为三 Tab 布局，新增首页（Home）作为主操作入口，将人脸管理整合到设置页面。

## 架构

### 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                        App.tsx                          │
│  (全局状态管理、事件订阅、Tab 路由)                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ HomeScreen  │  │MonitorScreen│  │SettingsScreen│    │
│  │  (首页)     │  │  (监控)     │  │  (设置)      │    │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                    BottomNav                            │
│              (底部导航栏组件)                            │
├─────────────────────────────────────────────────────────┤
│                  DeviceService                          │
│  (WebSocket 通信、音频处理、事件分发)                    │
└─────────────────────────────────────────────────────────┘
```

### 状态管理流程

```
DeviceService (事件源)
       ↓ emit
   App.tsx (状态持有者)
       ↓ props
   Screen 组件 (展示层)
```

### 通信架构

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│   App   │◄───────►│ Server  │◄───────►│  ESP32  │
└─────────┘         └─────────┘         └─────────┘
   /ws/app              │                  /ws
     │                  │
     │            ConnectionManager
     │            (设备关联管理)
     │
  DeviceService
  - WebSocket 连接管理
  - 消息序列号生成 (seq_id)
  - 二进制协议解析
  - 音频播放/采集
```

## 组件与接口

### 文件结构

```
├── App.tsx                    # 根组件
├── index.tsx                  # React 入口
├── types.ts                   # TypeScript 类型定义
├── components/
│   ├── BottomNav.tsx          # 底部导航栏
│   └── VisitNotificationModal.tsx  # 到访通知弹窗
├── screens/
│   ├── HomeScreen.tsx         # 首页
│   ├── MonitorScreen.tsx      # 监控页
│   └── SettingsScreen.tsx     # 设置页 (含人脸权限编辑)
└── services/
    ├── DeviceService.ts       # 设备通信服务
    ├── DeviceStatusStorageService.ts  # 设备状态本地持久化 (已实现)
    └── VideoStorageService.ts # 视频存储服务
```

### 组件接口

#### BottomNav

```typescript
interface BottomNavProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

type Tab = 'home' | 'monitor' | 'settings';
```

#### HomeScreen

```typescript
interface HomeScreenProps {
  status: ConnectionStatus;
  deviceStatus: DeviceStatus | null;
  recentActivities: Activity[];
  onUnlock: () => void;
  onLock: () => void;
}

interface DeviceStatus {
  battery: number;      // 电量百分比
  lockState: number;    // 0=锁定, 1=开启
  lightState: number;   // 0=关, 1=开
  lux: number;          // 光照值
  online: boolean;      // 在线状态
}

interface Activity {
  id: string;
  type: 'visit' | 'unlock' | 'event';
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
}
```

#### MonitorScreen

```typescript
interface MonitorScreenProps {
  status: ConnectionStatus;
  videoSrc: string | null;
  stats: Stats;
  isTalking: boolean;
  onToggleTalk: () => void;
}
```

#### SettingsScreen

```typescript
interface SettingsScreenProps {
  logs: LogEntry[];
  status: ConnectionStatus;
  deviceStatus: DeviceStatus | null;
  onClearLogs: () => void;
  onNavigate: (screen: SubScreen) => void;
}

type SubScreen = 
  | 'face-management'
  | 'fingerprint-management'
  | 'nfc-management'
  | 'password-management'
  | 'unlock-logs'
  | 'event-logs'
  | 'visit-records';
```

### DeviceService 接口

```typescript
class DeviceService {
  // 连接管理
  connect(url: string, deviceId: string, appId: string): void;
  disconnect(): void;
  
  // 命令发送 (自动附加 seq_id)
  sendCommand(command: object): void;
  
  // 事件订阅
  on(eventName: string, callback: EventCallback): () => void;
  
  // 音频控制
  resumeAudio(): Promise<void>;
  setVolume(volume: number): void;
  startTalk(): Promise<void>;
  stopTalk(): void;
}

// 事件类型
type EventName = 
  | 'status'           // 连接状态变化
  | 'log'              // 系统日志
  | 'stats'            // 统计数据
  | 'frame'            // 视频帧
  | 'talkState'        // 对讲状态
  | 'face_response'    // 人脸管理响应
  | 'visit'            // 到访通知
  | 'device_status'    // 设备在线状态
  | 'status_report'    // 设备状态上报
  | 'event_report'     // 事件上报
  | 'log_report'       // 开锁日志
  | 'server_ack'       // 服务器确认
  | 'ack'              // ESP32 确认
  | 'query_result';    // 查询结果
```

## 数据模型

### 消息类型定义

```typescript
// 基础消息结构
interface BaseMessage {
  type: string;
  seq_id?: string;
}

// Hello 认证
interface HelloMessage extends BaseMessage {
  type: 'hello';
  device_id: string;
  app_id: string;
  client_type: 'app';
}

// 锁控命令
interface LockControlMessage extends BaseMessage {
  type: 'lock_control';
  command: 'unlock' | 'lock' | 'temp_code';
  duration?: number;
  code?: string;
  expires?: number;
}

// 设备控制
interface DevControlMessage extends BaseMessage {
  type: 'dev_control';
  target: 'beep' | 'light' | 'oled';
  action?: 'on' | 'off' | 'auto';
  count?: number;
  mode?: 'short' | 'long' | 'alarm';
  icon?: number;
}

// 系统命令
interface SystemMessage extends BaseMessage {
  type: 'system';
  command: 'start_monitor' | 'stop_monitor';
  record?: boolean;
}

// 人脸管理
interface FaceManagementMessage extends BaseMessage {
  type: 'face_management';
  action: 'register' | 'get_persons' | 'delete_person' | 'update_permission' | 'get_visits';
  data?: object;
}

// 数据查询
interface QueryMessage extends BaseMessage {
  type: 'query';
  target: 'status' | 'status_history' | 'events' | 'unlock_logs' | 'media_files';
  data?: {
    limit?: number;
    offset?: number;
    event_type?: string;
    method?: string;
    result?: number;
  };
}
```

### 服务器推送消息

```typescript
// 服务器确认
interface ServerAck {
  type: 'server_ack';
  seq_id: string;
  code: 0 | 1 | 2 | 3 | 4 | 5;
  msg: string;
  ts: number;
}

// 设备状态
interface DeviceStatusPush {
  type: 'device_status';
  status: 'online' | 'offline';
  device_id: string;
  ts: number;
  reason?: string;
}

// 状态上报
interface StatusReport {
  type: 'status_report';
  ts: number;
  data: {
    bat: number;
    lux: number;
    lock: number;
    light: number;
  };
}

// 事件上报
interface EventReport {
  type: 'event_report';
  ts: number;
  event: 'bell' | 'pir_trigger' | 'tamper' | 'door_open' | 'low_battery';
  param: number;
}

// 开锁日志
interface LogReport {
  type: 'log_report';
  ts: number;
  data: {
    method: string;
    uid: number;
    result: boolean;
    fail_count: number;
  };
}

// 到访通知
interface VisitNotification {
  type: 'visit_notification';
  ts: number;
  data: {
    visit_id: number;
    person_id: number | null;
    person_name: string;
    relation: string;
    result: 'known' | 'unknown' | 'no_face';
    access_granted: boolean;
    image: string;
    image_path: string;
  };
}
```

### 二进制协议 (BinaryProtocol2)

```
┌──────────────────────────────────────────────────────┐
│                    16 字节头部                        │
├────────┬────────┬────────────┬────────┬─────────────┤
│ 版本   │ 类型   │  保留字段   │ 保留   │ 负载长度    │
│ 2字节  │ 2字节  │  4字节     │ 4字节  │ 4字节       │
├────────┴────────┴────────────┴────────┴─────────────┤
│                    负载数据                          │
│              (JPEG 图像 或 PCM 音频)                 │
└──────────────────────────────────────────────────────┘

版本 = 2
类型 = 0
保留字段 = 0 表示音频, 非0 表示视频
```

## 正确性属性

*正确性属性是系统在所有有效执行中都应保持的特征或行为。属性作为人类可读规范与机器可验证正确性保证之间的桥梁。*

### Property 1: 导航切换一致性

*对于任意* Tab 导航项点击，当前显示的屏幕组件应与点击的导航项对应。

**验证: 需求 1.2**

### Property 2: 锁状态显示一致性

*对于任意* 锁状态值（0 或 1），首页显示的锁状态文本应正确映射（0→"已锁定"，1→"已开启"）。

**验证: 需求 2.4**

### Property 3: 最近动态列表长度限制

*对于任意* 数量的到访/开锁记录，首页最近动态列表最多显示 3 条记录。

**验证: 需求 2.9**

### Property 4: 状态推送更新

*对于任意* `status_report` 推送消息，App 应正确解析并更新设备状态（电量、锁状态、补光灯状态、光照值）。

**验证: 需求 2.10, 10.1**

### Property 5: 事件推送处理

*对于任意* `event_report` 推送消息，App 应根据 event 类型（bell/tamper/low_battery 等）生成对应的通知内容。

**验证: 需求 2.11, 10.2, 10.3, 10.4, 10.5**

### Property 6: 开锁日志推送处理

*对于任意* `log_report` 推送消息，App 应正确解析并添加到最近动态列表。

**验证: 需求 2.12, 10.6**

### Property 7: 设备离线状态显示

*对于任意* 离线状态（status !== 'connected'），监控页应显示"设备离线"占位状态，且操作按钮应被禁用。

**验证: 需求 3.10, 7.9**

### Property 8: 二进制协议解析

*对于任意* 符合 BinaryProtocol2 格式的二进制数据，App 应正确解析头部并提取负载（视频 JPEG 或音频 PCM）。

**验证: 需求 3.11, 3.12**

### Property 9: 人员列表项完整性

*对于任意* 人员数据，列表项渲染应包含所有必要信息：头像、姓名、关系类型、权限时段。

**验证: 需求 5.5**

### Property 10: 人脸注册命令格式

*对于任意* 人脸注册表单提交，发送的 `face_management` 命令应包含正确的 action（register）和完整的 data 字段。

**验证: 需求 5.9**

### Property 11: 人脸删除命令格式

*对于任意* 人员删除操作，发送的 `face_management` 命令应包含正确的 action（delete_person）和 person_id。

**验证: 需求 5.11**

### Property 12: 到访记录项完整性

*对于任意* 到访记录数据，列表项渲染应包含所有必要信息：人员姓名、到访时间、识别结果、是否开门。

**验证: 需求 6.4**

### Property 13: 到访通知推送处理

*对于任意* `visit_notification` 推送消息，App 应正确解析并添加到到访记录列表。

**验证: 需求 6.5**

### Property 14: seq_id 自动生成

*对于任意* 通过 `sendCommand` 发送的命令消息，DeviceService 应自动生成并附加 seq_id 字段。

**验证: 需求 7.1**

### Property 15: seq_id 格式规范

*对于任意* 生成的 seq_id，其格式应符合 `app_{timestamp}_{sequence}` 规范。

**验证: 需求 7.2**

### Property 16: server_ack 处理

*对于任意* `server_ack` 响应，App 应根据 code 字段（0-5）执行对应的处理逻辑。

**验证: 需求 7.3, 7.4, 7.5, 7.6, 7.7**

### Property 17: 设备控制命令格式

*对于任意* 设备控制操作（开锁、关锁、临时密码、补光灯、门铃），发送的命令应符合协议规范的格式。

**验证: 需求 8.1, 8.2, 8.3, 8.4, 8.5**

### Property 18: 查询命令格式

*对于任意* 数据查询操作，发送的 `query` 命令应包含正确的 target 和可选的分页参数。

**验证: 需求 9.1, 9.2, 9.4**

### Property 19: 查询结果解析

*对于任意* `query_result` 响应，App 应正确解析 status 和 data 字段，错误时显示提示。

**验证: 需求 9.3, 9.5**

### Property 20: 到访通知内容完整性

*对于任意* 到访通知弹窗，应显示完整信息：人员姓名、识别结果、是否开门、抓拍图片。

**验证: 需求 10.7, 10.8**

## 错误处理

### 连接错误

| 错误场景 | 处理方式 |
|---------|---------|
| WebSocket 连接失败 | 显示错误日志，状态设为 disconnected |
| Hello 认证失败 | 显示错误消息，断开连接 |
| 连接意外断开 | 显示警告日志，状态设为 disconnected |

### 命令错误

| server_ack.code | 含义 | 处理方式 |
|-----------------|------|---------|
| 0 | 成功 | 无需特殊处理 |
| 1 | 设备离线 | 显示"设备离线"提示 |
| 2 | 参数错误 | 显示"参数错误"提示 |
| 3 | 未认证 | 显示"未认证"提示，建议重新连接 |
| 4 | 内部错误 | 显示"服务器错误"提示 |
| 5 | 重复消息 | 忽略，无需处理 |

### ESP32 ACK 错误

| ack.code | 含义 | 处理方式 |
|----------|------|---------|
| 0 | 成功 | 显示操作成功提示 |
| 1 | 设备忙碌 | 显示"设备忙碌，请稍后重试" |
| 2 | 参数错误 | 显示"参数错误" |
| 3 | 硬件故障 | 显示"硬件故障" |
| 4 | 超时 | 显示"操作超时" |
| 5 | 未授权 | 显示"未授权" |

## 新增功能设计

### 1. 指纹管理模块

#### 数据模型

```typescript
// types.ts 新增
interface Fingerprint {
  id: number;           // 指纹 ID（设备分配）
  name: string;         // 指纹名称
  registeredAt: string; // 录入时间
}

interface FingerprintRegistrationStatus {
  status: 'idle' | 'waiting' | 'scanning' | 'success' | 'failed';
  message: string;
  progress?: number;    // 多次扫描进度 0-100
}
```

#### 组件设计

```typescript
// screens/FingerprintManagementScreen.tsx
interface FingerprintManagementProps {
  fingerprints: Fingerprint[];
  maxCount: number;     // 最大容量（如 10）
  onAdd: (name: string) => void;
  onDelete: (id: number) => void;
  registrationStatus: FingerprintRegistrationStatus;
}
```

#### 协议交互

```typescript
// 查询指纹列表
{ type: 'user_mgmt', category: 'finger', command: 'query' }

// 添加指纹
{ type: 'user_mgmt', category: 'finger', command: 'add', user_id: 0 }

// 删除指纹
{ type: 'user_mgmt', category: 'finger', command: 'del', user_id: 5 }
```

### 2. NFC 卡片管理模块

#### 数据模型

```typescript
// types.ts 新增
interface NFCCard {
  id: number;           // 卡片 ID（设备分配）
  name: string;         // 卡片名称
  cardId: string;       // 完整卡号（内部存储）
  maskedCardId: string; // 脱敏卡号（显示用，如 ****1234）
  registeredAt: string; // 绑定时间
}

interface NFCRegistrationStatus {
  status: 'idle' | 'waiting' | 'reading' | 'success' | 'failed';
  message: string;
}
```

#### 组件设计

```typescript
// screens/NFCCardManagementScreen.tsx
interface NFCCardManagementProps {
  cards: NFCCard[];
  maxCount: number;     // 最大容量（如 5）
  onAdd: (name: string) => void;
  onDelete: (id: number) => void;
  registrationStatus: NFCRegistrationStatus;
}
```

#### 协议交互

```typescript
// 查询 NFC 卡片列表
{ type: 'user_mgmt', category: 'nfc', command: 'query' }

// 添加 NFC 卡片
{ type: 'user_mgmt', category: 'nfc', command: 'add', user_id: 0 }

// 删除 NFC 卡片
{ type: 'user_mgmt', category: 'nfc', command: 'del', user_id: 3 }
```

### 3. 密码管理模块

#### 数据模型

```typescript
// types.ts 新增
interface AdminPasswordStatus {
  isSet: boolean;
  lastModifiedAt?: string;
}

interface TempPassword {
  id: number;
  name: string;
  password: string;     // 6位密码
  type: 'one_time' | 'time_limited' | 'count_limited';
  validFrom?: string;   // 限时密码开始时间
  validUntil?: string;  // 限时密码结束时间
  maxUses?: number;     // 限次密码最大使用次数
  currentUses: number;  // 当前使用次数
  createdAt: string;
  isExpired: boolean;
}

interface CreateTempPasswordRequest {
  name: string;
  type: 'one_time' | 'time_limited' | 'count_limited';
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
}
```

#### 组件设计

```typescript
// screens/PasswordManagementScreen.tsx
interface PasswordManagementProps {
  adminStatus: AdminPasswordStatus;
  tempPasswords: TempPassword[];
  maxTempCount: number; // 最大临时密码数量（如 5）
  onModifyAdmin: (currentPwd: string, newPwd: string) => void;
  onCreateTemp: (request: CreateTempPasswordRequest) => void;
  onDeleteTemp: (id: number) => void;
}
```

#### 协议交互

```typescript
// 修改管理员密码
{ type: 'user_mgmt', category: 'password', command: 'set', payload: '123456' }

// 创建临时密码（使用 lock_control）
{ type: 'lock_control', command: 'temp_code', code: '654321', expires: 3600 }
```

### 4. 视频附件与媒体下载模块

#### 数据模型

```typescript
// types.ts 新增
interface VideoAttachment {
  recordId: number;     // 关联的记录 ID
  recordType: 'unlock_log' | 'event';
  mediaId: number;      // 媒体文件 ID
  filePath: string;     // 服务器文件路径
  fileSize: number;     // 文件大小（字节）
  duration?: number;    // 视频时长（秒）
  thumbnailUrl?: string;// 缩略图 URL
  downloadStatus: 'pending' | 'downloading' | 'completed' | 'failed';
  downloadProgress: number; // 0-100
  localPath?: string;   // 本地存储路径
}

interface VideoStorageStats {
  usedBytes: number;    // 已用空间
  maxBytes: number;     // 最大空间（默认 1GB）
  fileCount: number;    // 文件数量
}
```

#### 服务设计

```typescript
// services/VideoStorageService.ts
class VideoStorageService {
  // 单例实例
  private static instance: VideoStorageService;
  
  // 存储配置
  private maxStorageBytes: number = 1024 * 1024 * 1024; // 1GB
  
  // 下载队列
  private downloadQueue: VideoAttachment[] = [];
  private isDownloading: boolean = false;
  
  // 公共方法
  async getVideoMetadata(recordId: number): Promise<VideoAttachment | null>;
  async downloadVideo(attachment: VideoAttachment): Promise<void>;
  async getLocalVideoUrl(recordId: number): Promise<string | null>;
  async getStorageStats(): Promise<VideoStorageStats>;
  async clearAllVideos(): Promise<void>;
  async cleanupOldVideos(): Promise<void>;
  
  // 事件
  onDownloadProgress(callback: (recordId: number, progress: number) => void): void;
  onDownloadComplete(callback: (recordId: number) => void): void;
  onDownloadError(callback: (recordId: number, error: Error) => void): void;
}
```

#### 协议交互

```typescript
// 查询媒体文件列表
{ 
  type: 'query', 
  target: 'media_files',
  data: { file_type: 'recording', limit: 100 }
}

// 下载媒体文件
{ type: 'media_download', file_id: 101 }

// 分片下载大文件
{ type: 'media_download_chunk', file_id: 100, chunk_index: 0, chunk_size: 1048576 }
```

### 5. DeviceService 扩展

```typescript
// services/DeviceService.ts 新增方法

class DeviceService {
  // 现有方法...
  
  // 用户管理命令
  sendUserMgmtCommand(category: 'finger' | 'nfc' | 'password', command: string, userId?: number, payload?: string): void {
    this.sendCommand({
      type: 'user_mgmt',
      category,
      command,
      user_id: userId ?? 0,
      payload
    });
  }
  
  // 媒体下载命令
  sendMediaDownload(fileId: number): void {
    this.sendCommand({
      type: 'media_download',
      file_id: fileId
    });
  }
  
  // 分片下载命令
  sendMediaDownloadChunk(fileId: number, chunkIndex: number, chunkSize?: number): void {
    this.sendCommand({
      type: 'media_download_chunk',
      file_id: fileId,
      chunk_index: chunkIndex,
      chunk_size: chunkSize ?? 1048576
    });
  }
  
  // 新增事件处理
  private handleUserMgmtResult(msg: UserMgmtResult): void;
  private handleMediaDownload(msg: MediaDownloadResponse): void;
  private handleMediaDownloadChunk(msg: MediaDownloadChunkResponse): void;
}
```

### 6. 设备状态本地持久化服务 (已实现)

#### 数据模型

```typescript
// services/DeviceStatusStorageService.ts
interface LocalDeviceStatus {
  deviceId: string;
  battery: number;
  lux: number;
  lockState: number;
  lightState: number;
  lastUpdate: number;  // 时间戳（毫秒）
}
```

#### 服务设计

```typescript
class DeviceStatusStorageService {
  private static instance: DeviceStatusStorageService;
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'SmartDoorlockDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'deviceStatus';

  // 单例获取
  static getInstance(): DeviceStatusStorageService;
  
  // 初始化数据库
  async init(): Promise<void>;
  
  // 保存设备状态
  async saveStatus(deviceId: string, status: DeviceStatus): Promise<void>;
  
  // 加载设备状态
  async loadStatus(deviceId: string): Promise<LocalDeviceStatus | null>;
  
  // 清除设备状态
  async clearStatus(deviceId: string): Promise<void>;
  
  // 获取所有设备状态
  async getAllStatus(): Promise<LocalDeviceStatus[]>;
}

// 导出单例实例
export const deviceStatusStorage = DeviceStatusStorageService.getInstance();
```

#### 集成流程

```
App 启动
    ↓
deviceStatusStorage.init()
    ↓
deviceStatusStorage.loadStatus(deviceId)
    ↓
设置初始 deviceStatus (标记 online: false)
    ↓
显示缓存状态 + "上次更新时间"

WebSocket 连接成功
    ↓
接收 status_report
    ↓
更新 deviceStatus (标记 online: true)
    ↓
deviceStatusStorage.saveStatus(deviceId, status)
```

### 7. 人脸权限更新功能 (已实现)

#### 扩展的 Person 接口

```typescript
// types.ts
interface Person {
  id: number;
  name: string;
  relation_type: string;
  permission?: {
    time_start: string;           // 每日开始时间 HH:MM
    time_end: string;             // 每日结束时间 HH:MM
    permission_type?: 'permanent' | 'temporary' | 'count_limited';
    valid_from?: string;          // 临时权限开始日期 YYYY-MM-DD
    valid_until?: string;         // 临时权限结束日期 YYYY-MM-DD
    remaining_count?: number;     // 限次权限剩余次数
  };
}
```

#### 权限编辑弹窗状态

```typescript
// SettingsScreen.tsx 状态
const [editingPerson, setEditingPerson] = useState<Person | null>(null);
const [permissionType, setPermissionType] = useState<'permanent' | 'temporary' | 'count_limited'>('permanent');
const [timeStart, setTimeStart] = useState('00:00');
const [timeEnd, setTimeEnd] = useState('23:59');
const [validFrom, setValidFrom] = useState('');
const [validUntil, setValidUntil] = useState('');
const [remainingCount, setRemainingCount] = useState(10);
```

#### 协议交互

```typescript
// 更新人脸权限
{
  type: 'face_management',
  action: 'update_permission',
  data: {
    person_id: 1,
    permission: {
      permission_type: 'temporary',
      time_start: '08:00',
      time_end: '18:00',
      valid_from: '2025-01-01',
      valid_until: '2025-12-31'
    }
  }
}
```

## 测试策略

### 单元测试

- 使用 Vitest 作为测试框架
- 测试 DeviceService 的命令生成和消息解析逻辑
- 测试组件的状态映射和渲染逻辑

### 属性测试

- 使用 fast-check 进行属性测试
- 每个属性测试运行至少 100 次迭代
- 测试标签格式: `Feature: smart-doorlock-app, Property N: {property_text}`

### 测试覆盖重点

1. **命令格式验证**: 确保所有发送的命令符合协议规范
2. **消息解析验证**: 确保正确解析服务器推送的各类消息
3. **状态映射验证**: 确保 UI 正确反映设备状态
4. **边界条件**: 测试空数据、最大长度等边界情况

### 新增测试属性

#### Property 21: 指纹管理命令格式
*对于任意* 指纹管理操作（查询、添加、删除），发送的 `user_mgmt` 命令应包含正确的 category（finger）和 command 字段。

#### Property 22: NFC 卡片管理命令格式
*对于任意* NFC 卡片管理操作（查询、添加、删除），发送的 `user_mgmt` 命令应包含正确的 category（nfc）和 command 字段。

#### Property 23: 密码管理命令格式
*对于任意* 密码管理操作，发送的命令应符合协议规范（user_mgmt 或 lock_control）。

#### Property 24: user_mgmt_result 处理
*对于任意* `user_mgmt_result` 响应，App 应根据 result 字段判断操作结果，并更新对应的列表显示。

#### Property 25: 媒体下载命令格式
*对于任意* 媒体下载请求，发送的 `media_download` 命令应包含正确的 file_id 字段。

#### Property 26: 媒体下载响应处理
*对于任意* `media_download` 响应，App 应正确解析 status 和 data 字段，提取文件内容。

#### Property 27: 设备状态本地持久化
*对于任意* `status_report` 推送消息，App 应将设备状态保存到 IndexedDB，并在启动时加载缓存状态。

**验证: 需求 16.2, 16.3**

#### Property 28: 离线状态显示
*对于任意* 离线状态，首页应显示缓存的设备状态数据，并标记"上次更新时间"。

**验证: 需求 16.5, 16.6**

#### Property 29: 人脸权限更新命令格式
*对于任意* 权限更新操作，发送的 `face_management` 命令应包含正确的 action（update_permission）、person_id 和完整的权限数据。

**验证: 需求 17.7, 17.8**

#### Property 30: 权限类型验证
*对于任意* 权限类型（permanent/temporary/count_limited），权限编辑弹窗应显示对应的配置选项。

**验证: 需求 17.3, 17.4, 17.5, 17.6**

