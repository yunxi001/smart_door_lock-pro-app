export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

export interface Stats {
  videoFrames: number;
  videoFps: number;
  audioPackets: number;
  dataReceived: number; // 字节数
}

export interface Person {
  id: number;
  name: string;
  relation_type: string;
  permission?: {
    time_start: string;
    time_end: string;
    permission_type?: "permanent" | "temporary" | "count_limited";
    valid_from?: string;
    valid_until?: string;
    remaining_count?: number;
  };
}

export interface VisitRecord {
  visit_time: string;
  person_name: string;
  result: string;
  access_granted: boolean;
}

// 开锁记录接口
export interface UnlockLog {
  id: number;
  method: string; // 开锁方式: face, fingerprint, password, nfc, remote, temp_code, key
  uid: number; // 用户 ID
  status: string; // 开锁状态: 'success' | 'fail' | 'locked'
  lock_time: number; // 开锁时间戳（毫秒）
  timestamp: string; // 时间戳（格式化字符串）
  user_name?: string; // 用户名称（可选）
  // 向后兼容字段（已弃用，保留以支持旧代码）
  result?: boolean; // @deprecated 使用 status 字段代替
  fail_count?: number; // @deprecated 使用 lock_time 字段代替
  // 视频附件相关字段 (需求 14.1, 14.2)
  hasVideo?: boolean; // 是否有关联视频
  mediaId?: number; // 媒体文件 ID
  videoFilePath?: string; // 视频文件路径
  videoFileSize?: number; // 视频文件大小（字节）
  videoDuration?: number; // 视频时长（秒）
  videoThumbnailUrl?: string; // 视频缩略图 URL
}

// 事件记录接口
export interface EventLog {
  id: number;
  event: string; // 事件类型: bell, pir_trigger, tamper, door_open, low_battery
  param: number; // 事件参数
  timestamp: string; // 时间戳
}

export interface FaceRegistrationData {
  name: string;
  relation_type: string;
  image: string; // base64 without prefix
  time_start: string;
  time_end: string;
}

export type ConnectionStatus = "disconnected" | "connecting" | "connected";

// 更新 Tab 类型为新的三 Tab 布局
export type Tab = "home" | "monitor" | "settings";

// 设备状态接口（电量、锁状态、补光灯、光照值、在线状态）
export interface DeviceStatus {
  battery: number; // 电量百分比
  lockState: number; // 0=锁定, 1=开启
  lightState: number; // 0=关, 1=开
  lux: number; // 光照值
  online: boolean; // 在线状态
}

// 最近动态项接口
export interface Activity {
  id: string;
  type: "visit" | "unlock" | "event";
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
}

// 设置页面子页面导航类型
export type SubScreen =
  | "face-management"
  | "fingerprint-management"
  | "nfc-management"
  | "password-management"
  | "unlock-logs"
  | "event-logs"
  | "visit-records"
  | "visitor-intent-detail" // v2.5 新增：访客意图详情页
  | "package-alert-detail"; // v2.5 新增：快递警报详情页

// ============================================
// 指纹管理类型 (需求 11.3, 11.9)
// ============================================

// 指纹信息接口
export interface Fingerprint {
  id: number; // 指纹 ID（设备分配）
  name: string; // 指纹名称
  registeredAt: string; // 录入时间
}

// 指纹录入状态接口
export interface FingerprintRegistrationStatus {
  status: "idle" | "waiting" | "scanning" | "success" | "failed";
  message: string;
  progress?: number; // 多次扫描进度 0-100
}

// ============================================
// NFC 卡片管理类型 (需求 12.3, 12.9, 12.13)
// ============================================

// NFC 卡片信息接口
export interface NFCCard {
  id: number; // 卡片 ID（设备分配）
  name: string; // 卡片名称
  cardId: string; // 完整卡号（内部存储）
  maskedCardId: string; // 脱敏卡号（显示用，如 ****1234）
  registeredAt: string; // 绑定时间
}

// NFC 卡片绑定状态接口
export interface NFCRegistrationStatus {
  status: "idle" | "waiting" | "reading" | "success" | "failed";
  message: string;
}

// ============================================
// 密码管理类型 (需求 13.3, 13.8, 13.9, 13.12)
// ============================================

// 管理员密码状态接口
export interface AdminPasswordStatus {
  isSet: boolean; // 是否已设置
  lastModifiedAt?: string; // 最后修改时间
}

// 临时密码类型
export type TempPasswordType = "one_time" | "time_limited" | "count_limited";

// 临时密码信息接口
export interface TempPassword {
  id: number;
  name: string;
  password: string; // 6位密码
  type: TempPasswordType;
  validFrom?: string; // 限时密码开始时间
  validUntil?: string; // 限时密码结束时间
  maxUses?: number; // 限次密码最大使用次数
  currentUses: number; // 当前使用次数
  createdAt: string;
  isExpired: boolean;
}

// 创建临时密码请求接口
export interface CreateTempPasswordRequest {
  name: string;
  type: TempPasswordType;
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
}

// ============================================
// 视频附件类型 (需求 14.1, 14.4)
// ============================================

// 视频下载状态类型
export type VideoDownloadStatus =
  | "pending"
  | "downloading"
  | "completed"
  | "failed";

// 视频附件信息接口
export interface VideoAttachment {
  recordId: number; // 关联的记录 ID
  recordType: "unlock_log" | "event";
  mediaId: number; // 媒体文件 ID
  filePath: string; // 服务器文件路径
  fileSize: number; // 文件大小（字节）
  duration?: number; // 视频时长（秒）
  thumbnailUrl?: string; // 缩略图 URL
  downloadStatus: VideoDownloadStatus;
  downloadProgress: number; // 0-100
  localPath?: string; // 本地存储路径
}

// 视频存储统计接口
export interface VideoStorageStats {
  usedBytes: number; // 已用空间
  maxBytes: number; // 最大空间（默认 1GB）
  fileCount: number; // 文件数量
}

// ============================================
// 消息确认机制类型 (ID 机制)
// ============================================

// 等待中的命令接口
export interface PendingCommand {
  seqId: string; // 消息序列号
  command: object; // 原始命令对象
  sentAt: number; // 发送时间戳
  retryCount: number; // 重试次数
  timeoutId?: number; // 超时计时器 ID
  onSuccess?: () => void; // 成功回调
  onError?: (error: string) => void; // 失败回调
}

// sendCommand 可选参数接口
export interface CommandOptions {
  onSuccess?: () => void; // 命令执行成功回调
  onError?: (error: string) => void; // 命令执行失败回调
  timeout?: number; // 超时时间（毫秒），默认 3000
  maxRetries?: number; // 最大重试次数，默认 3
}

// ============================================
// 本地存储数据类型定义 (需求 11.1)
// ============================================

/**
 * 存储的人脸数据
 * 包含 cachedAt 字段用于标记缓存时间
 */
export interface StoredPerson {
  id: number; // 主键
  name: string;
  relation_type: string;
  permission?: {
    time_start: string;
    time_end: string;
    permission_type?: string;
    valid_from?: string;
    valid_until?: string;
    remaining_count?: number;
  };
  cachedAt: number; // 缓存时间戳
}

/**
 * 存储的指纹数据
 * 包含 cachedAt 字段用于标记缓存时间
 */
export interface StoredFingerprint {
  id: number; // 主键
  name: string;
  registeredAt: string; // 索引字段
  cachedAt: number; // 缓存时间戳
}

/**
 * 存储的 NFC 卡片数据
 * 包含 cachedAt 字段用于标记缓存时间
 */
export interface StoredNFCCard {
  id: number; // 主键
  name: string;
  cardId: string; // 完整卡号
  maskedCardId: string; // 脱敏卡号
  registeredAt: string; // 索引字段
  cachedAt: number; // 缓存时间戳
}

/**
 * 存储的临时密码数据
 * 包含 cachedAt 字段用于标记缓存时间
 */
export interface StoredTempPassword {
  id: number; // 主键
  name: string;
  password: string;
  type: "one_time" | "time_limited" | "count_limited";
  validFrom?: string;
  validUntil?: string;
  maxUses?: number;
  currentUses: number;
  createdAt: string; // 索引字段
  isExpired: boolean; // 索引字段
  cachedAt: number; // 缓存时间戳
}

/**
 * 存储的开锁记录
 * 包含 cachedAt 字段用于标记缓存时间
 */
export interface StoredUnlockLog {
  id: number; // 主键
  method: string;
  uid: number;
  status: string;
  lock_time: number;
  timestamp: string; // 索引字段（用于范围查询）
  user_name?: string;
  hasVideo?: boolean;
  mediaId?: number;
  videoFilePath?: string;
  videoFileSize?: number;
  videoDuration?: number;
  videoThumbnailUrl?: string;
  cachedAt: number; // 缓存时间戳
}

/**
 * 存储的事件记录
 * 包含 cachedAt 字段用于标记缓存时间
 */
export interface StoredEventLog {
  id: number; // 主键
  event: string;
  param: number;
  timestamp: string; // 索引字段（用于范围查询）
  cachedAt: number; // 缓存时间戳
}

/**
 * 存储的到访记录
 * 包含 cachedAt 字段用于标记缓存时间
 */
export interface StoredVisitRecord {
  id: number; // 主键（自动生成）
  visit_time: string;
  person_name: string;
  result: string;
  access_granted: boolean;
  timestamp: string; // 索引字段（用于范围查询）
  cachedAt: number; // 缓存时间戳
}

/**
 * 存储的最近动态
 * 包含 cachedAt 字段用于标记缓存时间
 */
export interface StoredActivity {
  id: string; // 主键
  type: "visit" | "unlock" | "event";
  title: string;
  description: string;
  timestamp: string; // 索引字段（用于排序）
  icon?: string;
  cachedAt: number; // 缓存时间戳
}

/**
 * 存储的应用设置
 * 键值对形式
 */
export interface StoredSetting {
  key: string; // 主键
  value: any; // JSON 序列化的值
  updatedAt: number; // 更新时间戳
}

// ============================================
// 存储服务接口类型 (需求 11.2)
// ============================================

/**
 * 缓存数据接口
 * 包含所有需要缓存的数据类型
 */
export interface CachedData {
  persons: any[];
  fingerprints: any[];
  nfcCards: any[];
  tempPasswords: any[];
  unlockLogs: any[];
  eventLogs: any[];
  visitRecords: any[];
  recentActivities: any[];
}

/**
 * 存储统计信息接口
 */
export interface StorageStats {
  usedBytes: number; // 已用空间（字节）
  maxBytes: number; // 最大空间（字节）
  storeCount: number; // 对象存储数量
  stores: {
    [storeName: string]: {
      itemCount: number; // 项目数量
      estimatedSize: number; // 估计大小（字节）
    };
  };
}

/**
 * 同步结果接口
 * 描述本地和服务器数据的差异
 */
export interface SyncResult<T> {
  toAdd: T[]; // 需要添加到本地的数据
  toUpdate: T[]; // 需要更新的数据
  toDelete: T[]; // 需要从本地删除的数据
}

/**
 * 查询选项接口
 * 用于分页查询
 */
export interface QueryOptions {
  offset?: number; // 偏移量（跳过前 N 条）
  limit?: number; // 限制数量（最多返回 N 条）
}

// ============================================
// 协议 v2.4 新增类型
// ============================================

/**
 * 密码查询结果接口
 * 协议 v2.4 新增
 */
export interface PasswordQueryResult {
  password: string; // 设备密码，不存在时返回默认值 "123456"
}

/**
 * 媒体下载策略接口
 * 协议 v2.4 新增
 */
export interface MediaDownloadStrategy {
  method: "full" | "chunk"; // 下载方式：完整下载或分片下载
  chunkSize?: number; // 分片大小（字节），仅 chunk 模式有效
  warning?: string; // 警告信息（如文件较大）
}

/**
 * 门锁用户信息接口
 * 协议 v2.4 新增 - 第 9.7 节
 */
export interface DoorlockUser {
  id: number; // 数据库记录 ID
  device_id: string; // 设备 MAC 地址
  user_type: "finger" | "nfc" | "password"; // 用户类型
  user_id: number; // ESP32 分配的用户 ID（指纹/NFC 的槽位 ID）
  user_name: string; // 用户备注名称
  user_data?: string; // 额外数据（如 NFC 卡号）
  status: number; // 状态：0=已删除，1=正常
  created_at: string; // 创建时间
  created_by: string; // 创建者 app_id
}

/**
 * 门锁用户查询结果接口
 * 协议 v2.4 新增
 */
export interface DoorlockUsersQueryResult {
  records: DoorlockUser[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================
// 协议 v2.5 新增类型 - 访客意图识别和快递看护
// ============================================

/**
 * 意图类型枚举
 * 协议 v2.5 新增
 */
export type IntentType =
  | "delivery" // 快递配送
  | "visit" // 拜访
  | "sales" // 推销
  | "maintenance" // 维修
  | "other"; // 其他

/**
 * 威胁等级枚举
 * 协议 v2.5 新增
 */
export type ThreatLevel = "low" | "medium" | "high";

/**
 * 行为类型枚举
 * 协议 v2.5 新增
 */
export type ActionType =
  | "normal" // 正常
  | "passing" // 路过
  | "searching" // 翻找
  | "taking" // 拿走
  | "damaging"; // 破坏

/**
 * 对话消息接口
 * 协议 v2.5 新增
 */
export interface DialogueMessage {
  role: "assistant" | "user"; // 角色：AI助手或用户
  content: string; // 对话内容
}

/**
 * 快递检查结果接口
 * 协议 v2.5 新增
 */
export interface PackageCheck {
  threat_level: ThreatLevel; // 威胁等级
  action: ActionType; // 行为类型
  description: string; // 行为描述
}

/**
 * 访客意图记录接口
 * 协议 v2.5 新增
 */
export interface VisitorIntent {
  id: number; // IndexedDB自动生成的主键
  visit_id: number; // 服务器visit_id
  session_id: string; // 会话ID
  person_id: number | null; // 人员ID（可能为空）
  person_name: string; // 访客姓名
  relation_type: "family" | "friend" | "unknown"; // 关系类型
  intent_type: IntentType; // 意图类型
  intent_summary: {
    intent_type: string; // 意图类型字符串
    summary: string; // 简要总结
    important_notes: string[]; // 重要信息列表
    ai_analysis: string; // AI详细分析
  };
  dialogue_history: DialogueMessage[]; // 对话历史
  package_check?: PackageCheck; // 快递检查结果（可选）
  created_at: string; // 创建时间（ISO 8601格式）
  ts: number; // 时间戳（毫秒）
}

/**
 * 快递警报记录接口
 * 协议 v2.5 新增
 */
export interface PackageAlert {
  id: number; // IndexedDB自动生成的主键
  device_id: string; // 设备ID
  session_id: string; // 会话ID
  threat_level: ThreatLevel; // 威胁等级
  action: ActionType; // 行为类型
  description: string; // 行为描述
  photo_path: string; // 照片路径
  photo_thumbnail?: string; // 缩略图路径（前端生成）
  voice_warning_sent: boolean; // 是否已发送语音警告
  notified: boolean; // 是否已通知用户
  created_at: string; // 创建时间（ISO 8601格式）
  ts: number; // 时间戳（毫秒）
}
