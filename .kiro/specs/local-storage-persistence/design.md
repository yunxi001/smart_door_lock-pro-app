# 设计文档：本地持久化存储

## 概述

本设计实现智能门锁应用的完整本地持久化存储方案，使用 IndexedDB 统一管理所有应用数据。设计采用分层架构，将现有的分散存储服务整合为统一的 LocalStorageService，提供一致的 CRUD 接口和自动同步机制。

### 设计目标

1. **统一管理**: 整合现有存储服务，提供统一的数据访问接口
2. **快速启动**: 应用启动时立即显示缓存数据，无需等待网络请求
3. **离线能力**: 支持离线查看已缓存的业务数据
4. **自动同步**: 连接服务器后自动同步最新数据
5. **容错降级**: IndexedDB 不可用时降级到纯内存模式
6. **性能优化**: 批量操作、懒加载、索引优化

### 技术选型

- **存储引擎**: IndexedDB（浏览器原生 API）
- **数据库名称**: SmartDoorlockDB
- **数据库版本**: 2（升级现有版本 1）
- **事务模式**: readwrite / readonly
- **索引策略**: 时间戳索引用于范围查询和排序

## 架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                              │
│                   (全局状态管理)                             │
└────────────┬────────────────────────────────────────────────┘
             │
             │ 订阅事件 / 调用方法
             │
┌────────────▼────────────────────────────────────────────────┐
│                   DeviceService                             │
│              (WebSocket 通信服务)                            │
└────────────┬────────────────────────────────────────────────┘
             │
             │ 数据推送事件
             │
┌────────────▼────────────────────────────────────────────────┐
│              LocalStorageService                            │
│           (统一本地存储服务 - 新增)                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  存储管理器 (StorageManager)                         │  │
│  │  - 初始化数据库                                      │  │
│  │  - 版本升级管理                                      │  │
│  │  - 错误处理与降级                                    │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  数据访问层 (Data Access Layer)                      │  │
│  │  - CRUD 操作封装                                     │  │
│  │  - 批量操作支持                                      │  │
│  │  - 事务管理                                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  同步管理器 (SyncManager)                            │  │
│  │  - 缓存加载                                          │  │
│  │  - 数据对比                                          │  │
│  │  - 增量更新                                          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  清理管理器 (CleanupManager)                         │  │
│  │  - 过期数据清理                                      │  │
│  │  - 容量限制管理                                      │  │
│  │  - FIFO 策略执行                                     │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────┬────────────────────────────────────────────────┘
             │
             │ IndexedDB API
             │
┌────────────▼────────────────────────────────────────────────┐
│                      IndexedDB                              │
│                  (浏览器存储引擎)                            │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ deviceStatus │  │   persons    │  │ fingerprints │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   nfcCards   │  │tempPasswords │  │  unlockLogs  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  eventLogs   │  │visitRecords  │  │recentActivities│  │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐                       │
│  │ appSettings  │  │    videos    │                       │
│  └──────────────┘  └──────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

#### 启动流程

```
1. App.tsx 初始化
   ↓
2. LocalStorageService.init()
   ↓
3. 加载所有缓存数据到内存
   ↓
4. 立即渲染 UI（显示缓存数据）
   ↓
5. DeviceService 连接 WebSocket
   ↓
6. 请求服务器最新数据
   ↓
7. 对比并更新本地缓存
   ↓
8. 更新 UI（显示最新数据）
```

#### 数据更新流程

```
1. DeviceService 收到服务器推送
   ↓
2. 触发事件（如 face_response）
   ↓
3. App.tsx 更新内存状态
   ↓
4. LocalStorageService.save()
   ↓
5. 异步写入 IndexedDB
   ↓
6. UI 自动更新（React 状态变化）
```

## 组件和接口

### LocalStorageService

统一的本地存储服务，提供所有数据类型的 CRUD 操作。

```typescript
class LocalStorageService {
  private static instance: LocalStorageService;
  private db: IDBDatabase | null = null;
  private isInitialized: boolean = false;
  private isFallbackMode: boolean = false;

  // 单例模式
  static getInstance(): LocalStorageService;

  // 初始化
  async init(): Promise<void>;

  // 通用 CRUD 操作
  async save<T>(storeName: string, data: T): Promise<void>;
  async saveBatch<T>(storeName: string, dataList: T[]): Promise<void>;
  async get<T>(storeName: string, key: IDBValidKey): Promise<T | null>;
  async getAll<T>(storeName: string): Promise<T[]>;
  async query<T>(
    storeName: string,
    indexName: string,
    range: IDBKeyRange,
  ): Promise<T[]>;
  async delete(storeName: string, key: IDBValidKey): Promise<void>;
  async clear(storeName: string): Promise<void>;

  // 数据同步
  async loadCachedData(): Promise<CachedData>;
  async syncData(storeName: string, serverData: any[]): Promise<void>;

  // 数据清理
  async cleanupExpiredData(): Promise<void>;
  async cleanupByLimit(storeName: string, limit: number): Promise<void>;

  // 工具方法
  isAvailable(): boolean;
  getStorageStats(): Promise<StorageStats>;
}
```

### StorageManager

负责数据库初始化、版本升级和错误处理。

```typescript
class StorageManager {
  async openDatabase(dbName: string, version: number): Promise<IDBDatabase>;
  async upgradeDatabase(
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number,
  ): Promise<void>;
  handleError(error: Error): void;
  enableFallbackMode(): void;
}
```

### SyncManager

负责缓存加载和数据同步。

```typescript
class SyncManager {
  async loadAllCached(): Promise<CachedData>;
  async syncStore<T>(
    storeName: string,
    serverData: T[],
    keyPath: string,
  ): Promise<void>;
  compareData<T>(cached: T[], server: T[], keyPath: string): SyncResult<T>;
}

interface SyncResult<T> {
  toAdd: T[];
  toUpdate: T[];
  toDelete: T[];
}
```

### CleanupManager

负责过期数据清理和容量管理。

```typescript
class CleanupManager {
  async cleanupByAge(storeName: string, maxAgeDays: number): Promise<number>;
  async cleanupByCount(storeName: string, maxCount: number): Promise<number>;
  async cleanupBySize(storeName: string, maxBytes: number): Promise<number>;
  async getStoreSize(storeName: string): Promise<number>;
}
```

### 与现有服务的集成

#### DeviceStatusStorageService（已存在）

保持现有接口不变，内部委托给 LocalStorageService：

```typescript
class DeviceStatusStorageService {
  async saveStatus(deviceId: string, status: DeviceStatus): Promise<void> {
    // 委托给 LocalStorageService
    await localStorageService.save("deviceStatus", { deviceId, ...status });
  }

  async loadStatus(deviceId: string): Promise<LocalDeviceStatus | null> {
    // 委托给 LocalStorageService
    return await localStorageService.get("deviceStatus", deviceId);
  }
}
```

#### VideoStorageService（已存在）

保持现有接口不变，内部使用 LocalStorageService 的 videos 存储：

```typescript
// 无需修改，继续使用独立的 videos 对象存储
// LocalStorageService 在初始化时会保留现有的 videos 存储
```

## 数据模型

### IndexedDB 数据库结构

**数据库名称**: SmartDoorlockDB  
**版本**: 2

#### 对象存储列表

| 存储名称         | 主键     | 索引                           | 说明               |
| ---------------- | -------- | ------------------------------ | ------------------ |
| deviceStatus     | deviceId | lastUpdate                     | 设备状态（已存在） |
| videos           | recordId | mediaId, createdAt, recordType | 视频文件（已存在） |
| persons          | id       | -                              | 人脸列表           |
| fingerprints     | id       | registeredAt                   | 指纹列表           |
| nfcCards         | id       | registeredAt                   | NFC 卡片列表       |
| tempPasswords    | id       | createdAt, isExpired           | 临时密码列表       |
| unlockLogs       | id       | timestamp                      | 开锁记录           |
| eventLogs        | id       | timestamp                      | 事件记录           |
| visitRecords     | id       | timestamp                      | 到访记录           |
| recentActivities | id       | timestamp                      | 最近动态           |
| appSettings      | key      | -                              | 应用设置（键值对） |

### 数据结构定义

#### persons（人脸列表）

```typescript
interface StoredPerson {
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
```

#### fingerprints（指纹列表）

```typescript
interface StoredFingerprint {
  id: number; // 主键
  name: string;
  registeredAt: string; // 索引字段
  cachedAt: number; // 缓存时间戳
}
```

#### nfcCards（NFC 卡片列表）

```typescript
interface StoredNFCCard {
  id: number; // 主键
  name: string;
  cardId: string; // 完整卡号
  maskedCardId: string; // 脱敏卡号
  registeredAt: string; // 索引字段
  cachedAt: number; // 缓存时间戳
}
```

#### tempPasswords（临时密码列表）

```typescript
interface StoredTempPassword {
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
```

#### unlockLogs（开锁记录）

```typescript
interface StoredUnlockLog {
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
```

#### eventLogs（事件记录）

```typescript
interface StoredEventLog {
  id: number; // 主键
  event: string;
  param: number;
  timestamp: string; // 索引字段（用于范围查询）
  cachedAt: number; // 缓存时间戳
}
```

#### visitRecords（到访记录）

```typescript
interface StoredVisitRecord {
  id: number; // 主键（自动生成）
  visit_time: string;
  person_name: string;
  result: string;
  access_granted: boolean;
  timestamp: string; // 索引字段（用于范围查询）
  cachedAt: number; // 缓存时间戳
}
```

#### recentActivities（最近动态）

```typescript
interface StoredActivity {
  id: string; // 主键
  type: "visit" | "unlock" | "event";
  title: string;
  description: string;
  timestamp: string; // 索引字段（用于排序）
  icon?: string;
  cachedAt: number; // 缓存时间戳
}
```

#### appSettings（应用设置）

```typescript
interface StoredSetting {
  key: string; // 主键
  value: any; // JSON 序列化的值
  updatedAt: number; // 更新时间戳
}

// 预定义的设置键
const SETTING_KEYS = {
  CURRENT_TAB: "currentTab",
  AUTO_DOWNLOAD: "autoDownload",
  VOLUME: "volume",
  NOTIFICATION_ENABLED: "notificationEnabled",
};
```

### 数据清理规则

| 存储名称         | 清理策略     | 限制           |
| ---------------- | ------------ | -------------- |
| unlockLogs       | 时间 + 数量  | 30 天或 500 条 |
| eventLogs        | 时间 + 数量  | 30 天或 500 条 |
| visitRecords     | 时间 + 数量  | 30 天或 200 条 |
| recentActivities | 数量         | 50 条          |
| videos           | 容量（FIFO） | 1GB            |
| 其他             | 无自动清理   | -              |

## 正确性属性

_属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。_

### 属性反思

在编写具体属性之前，我需要识别并消除冗余的属性：

**识别的冗余模式**:

1. **数据类型的重复模式**: 人脸、指纹、NFC、临时密码的持久化需求（2.2-2.5, 3.2-3.5, 4.2-4.5, 5.2-5.5）遵循相同的模式：保存、加载、同步更新、数据完整性。这些可以合并为一个通用的"数据往返"属性。

2. **记录类型的重复模式**: 开锁记录、事件记录、到访记录的持久化需求（6.2-6.4, 7.2-7.4, 8.2-8.4）也遵循相同的模式：保存、容量限制、FIFO 清理。可以合并为通用的"记录管理"属性。

3. **启动加载的重复**: 需求 2.3, 3.3, 9.4, 10.4, 12.1 都是关于启动时加载缓存数据，可以合并为一个"启动加载"属性。

4. **同步更新的重复**: 需求 2.4, 3.4 等关于增删操作的同步，可以合并为一个"实时同步"属性。

**合并后的核心属性**:

1. **数据往返一致性**: 对于任意数据类型，保存后读取应得到相同数据
2. **容量限制管理**: 对于有限制的存储，超过限制时应删除最旧数据
3. **启动缓存加载**: 应用启动时应能立即加载所有缓存数据
4. **实时同步更新**: 数据变更应同步到本地存储
5. **数据完整性保证**: 保存的数据应包含所有必需字段
6. **冲突解决策略**: 数据冲突时以服务器数据为准
7. **降级模式容错**: IndexedDB 不可用时应降级到内存模式
8. **事务原子性**: 批量操作应保证原子性

### 正确性属性

#### 属性 1: 数据往返一致性

*对于任意*支持的数据类型（persons, fingerprints, nfcCards, tempPasswords, unlockLogs, eventLogs, visitRecords, recentActivities, appSettings），保存数据后立即读取应得到等价的数据对象。

**验证需求**: 2.2, 2.5, 3.2, 3.5, 4.2, 4.5, 5.2, 5.5, 6.2, 7.2, 8.2, 9.2, 10.2

#### 属性 2: 容量限制自动清理

*对于任意*有容量限制的存储（unlockLogs 500条, eventLogs 500条, visitRecords 200条, recentActivities 50条），当添加新记录导致超过限制时，最旧的记录应被自动删除，使总数保持在限制内。

**验证需求**: 6.3, 6.4, 7.3, 7.4, 8.3, 8.4, 9.3

#### 属性 3: 时间清理策略

*对于任意*有时间限制的存储（unlockLogs 30天, eventLogs 30天, visitRecords 30天），当记录的时间戳超过限制天数时，该记录应在下次清理时被删除。

**验证需求**: 13.1, 13.2, 13.3

#### 属性 4: 启动缓存加载完整性

*对于任意*已保存的数据类型，应用重新初始化后应能立即从本地存储加载所有缓存数据，且加载的数据应与保存前的数据等价。

**验证需求**: 2.3, 3.3, 9.4, 10.4, 12.1

#### 属性 5: 实时同步更新

*对于任意*数据类型的增删改操作，操作完成后立即查询本地存储，应能反映最新的变更状态。

**验证需求**: 2.4, 3.4, 10.3, 12.4

#### 属性 6: 数据完整性保证

*对于任意*保存的数据对象，读取后应包含所有必需字段，且字段值应与保存时一致（包括嵌套对象和可选字段）。

**验证需求**: 2.5, 3.5, 4.5, 5.5

#### 属性 7: 设置默认值处理

*对于任意*未设置的配置键，读取时应返回预定义的默认值，而不是 null 或 undefined。

**验证需求**: 10.5, 11.4

#### 属性 8: Tab 状态往返

*对于任意*有效的 Tab 值（home, monitor, settings），保存 Tab 状态后重新初始化应用，应恢复到相同的 Tab。

**验证需求**: 11.2, 11.3

#### 属性 9: 数据同步冲突解决

*对于任意*本地缓存数据，当服务器返回不同版本的数据时，同步后本地存储应包含服务器版本的数据。

**验证需求**: 12.3, 16.2

#### 属性 10: 批量操作原子性

*对于任意*批量写入操作，要么所有数据都成功保存，要么所有数据都不保存（事务回滚）。

**验证需求**: 16.1

#### 属性 11: 数据验证拒绝无效输入

*对于任意*无效格式的数据（缺少必需字段、类型错误等），保存操作应被拒绝并返回错误，且不应影响现有数据。

**验证需求**: 16.3

#### 属性 12: 版本升级数据迁移

*对于任意*存在于旧版本数据库中的数据，升级到新版本后，数据应被正确迁移且保持完整性。

**验证需求**: 1.4, 16.4

#### 属性 13: 降级模式功能保持

*对于任意*存储操作，当 IndexedDB 不可用时，系统应降级到内存模式，且基本功能（读写内存数据）应继续工作。

**验证需求**: 1.5, 14.1, 14.2

#### 属性 14: 空间不足自动恢复

*对于任意*导致存储空间不足的写入操作，系统应自动触发清理，清理后如果空间充足则重试写入成功。

**验证需求**: 14.4

#### 属性 15: 分页加载数据完整性

*对于任意*分页查询，所有分页结果合并后应包含完整的数据集，且无重复或遗漏。

**验证需求**: 15.3

#### 属性 16: 缓存标记一致性

*对于任意*从本地存储加载的数据，应包含 cachedAt 时间戳字段，用于区分缓存数据和实时数据。

**验证需求**: 12.5

## 错误处理

### 错误类型

1. **初始化错误**
   - IndexedDB 不支持（旧浏览器）
   - 数据库打开失败
   - 版本升级失败
   - **处理**: 降级到内存模式，记录警告日志

2. **存储操作错误**
   - 写入失败（空间不足、权限问题）
   - 读取失败（数据损坏）
   - 删除失败
   - **处理**: 记录错误日志，返回错误状态，不中断应用

3. **数据验证错误**
   - 缺少必需字段
   - 类型不匹配
   - 格式错误
   - **处理**: 拒绝操作，返回验证错误信息

4. **空间不足错误**
   - 存储配额超限
   - **处理**: 自动清理旧数据，重试操作，失败则提示用户

### 错误恢复策略

```typescript
// 错误处理流程
try {
  await localStorageService.save("persons", data);
} catch (error) {
  if (error instanceof QuotaExceededError) {
    // 空间不足：尝试清理
    await localStorageService.cleanupExpiredData();
    try {
      await localStorageService.save("persons", data);
    } catch (retryError) {
      // 清理后仍失败：提示用户
      showError("存储空间不足，请清理缓存");
      // 降级到内存模式
      saveToMemory("persons", data);
    }
  } else if (error instanceof DatabaseError) {
    // 数据库错误：降级到内存模式
    console.error("数据库错误，降级到内存模式", error);
    localStorageService.enableFallbackMode();
    saveToMemory("persons", data);
  } else {
    // 其他错误：记录日志，继续运行
    console.error("保存数据失败", error);
  }
}
```

### 降级模式

当 IndexedDB 不可用时，系统自动切换到纯内存模式：

- 所有数据存储在 JavaScript 对象中
- 页面刷新后数据丢失
- 显示警告提示用户
- 基本功能继续工作

```typescript
class FallbackStorage {
  private memoryStore: Map<string, Map<any, any>> = new Map();

  async save<T>(storeName: string, data: T): Promise<void> {
    if (!this.memoryStore.has(storeName)) {
      this.memoryStore.set(storeName, new Map());
    }
    const store = this.memoryStore.get(storeName)!;
    const key = (data as any).id || (data as any).key;
    store.set(key, data);
  }

  async get<T>(storeName: string, key: any): Promise<T | null> {
    const store = this.memoryStore.get(storeName);
    return store?.get(key) || null;
  }

  // ... 其他方法
}
```

## 测试策略

### 双重测试方法

本功能采用**单元测试**和**属性测试**相结合的策略：

- **单元测试**: 验证具体示例、边缘情况和错误条件
- **属性测试**: 验证跨所有输入的通用属性
- 两者互补，确保全面覆盖

### 单元测试重点

单元测试应专注于：

1. **具体示例**:
   - 保存和读取特定的人脸数据
   - 保存和读取特定的设置项
   - 数据库结构验证（对象存储是否存在）

2. **边缘情况**:
   - 首次启动（无缓存数据）
   - 空数据集
   - 最大容量边界
   - IndexedDB 不可用

3. **错误条件**:
   - 无效数据格式
   - 存储空间不足
   - 数据库版本冲突
   - 并发写入冲突

4. **集成点**:
   - 与 DeviceService 的事件集成
   - 与 App.tsx 的状态同步
   - 与现有存储服务的兼容性

### 属性测试配置

**测试库**: fast-check（JavaScript/TypeScript 的属性测试库）

**配置要求**:

- 每个属性测试最少 100 次迭代
- 每个测试必须引用设计文档中的属性编号
- 标签格式: `Feature: local-storage-persistence, Property {N}: {属性标题}`

**属性测试重点**:

1. **数据往返属性** (属性 1, 4, 8):
   - 生成随机数据对象
   - 保存后读取
   - 验证等价性

2. **容量限制属性** (属性 2, 3):
   - 生成超过限制数量的记录
   - 验证旧记录被删除
   - 验证总数保持在限制内

3. **同步更新属性** (属性 5, 9):
   - 生成随机操作序列（增删改）
   - 验证每次操作后状态正确

4. **数据完整性属性** (属性 6, 11):
   - 生成包含所有字段的随机数据
   - 验证保存后所有字段完整
   - 生成无效数据，验证被拒绝

5. **事务原子性属性** (属性 10):
   - 生成批量操作
   - 模拟部分失败
   - 验证全部回滚

### 测试数据生成器

使用 fast-check 的生成器创建随机测试数据：

```typescript
import * as fc from "fast-check";

// 人脸数据生成器
const personArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  relation_type: fc.constantFrom("family", "friend", "worker", "other"),
  permission: fc.option(
    fc.record({
      time_start: fc.date().map((d) => d.toISOString()),
      time_end: fc.date().map((d) => d.toISOString()),
      permission_type: fc.constantFrom(
        "permanent",
        "temporary",
        "count_limited",
      ),
    }),
  ),
});

// 开锁记录生成器
const unlockLogArbitrary = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  method: fc.constantFrom("face", "fingerprint", "password", "nfc", "remote"),
  uid: fc.integer({ min: 1, max: 10000 }),
  status: fc.constantFrom("success", "fail", "locked"),
  lock_time: fc.integer({
    min: Date.now() - 30 * 24 * 60 * 60 * 1000,
    max: Date.now(),
  }),
  timestamp: fc.date().map((d) => d.toISOString()),
});

// 设置项生成器
const settingArbitrary = fc.record({
  key: fc.constantFrom(
    "currentTab",
    "autoDownload",
    "volume",
    "notificationEnabled",
  ),
  value: fc.anything(),
});
```

### 测试示例

```typescript
// 属性测试示例：数据往返一致性
describe("Feature: local-storage-persistence, Property 1: 数据往返一致性", () => {
  it("对于任意人脸数据，保存后读取应得到相同数据", async () => {
    await fc.assert(
      fc.asyncProperty(personArbitrary, async (person) => {
        // 保存数据
        await localStorageService.save("persons", person);

        // 读取数据
        const loaded = await localStorageService.get("persons", person.id);

        // 验证等价性（忽略 cachedAt 字段）
        expect(loaded).toMatchObject(person);
      }),
      { numRuns: 100 },
    );
  });
});

// 单元测试示例：边缘情况
describe("LocalStorageService - 边缘情况", () => {
  it("首次启动时应返回空数组", async () => {
    const persons = await localStorageService.getAll("persons");
    expect(persons).toEqual([]);
  });

  it("IndexedDB 不可用时应降级到内存模式", async () => {
    // 模拟 IndexedDB 不可用
    jest.spyOn(window, "indexedDB", "get").mockReturnValue(undefined);

    await localStorageService.init();

    expect(localStorageService.isAvailable()).toBe(false);
    expect(localStorageService.isFallbackMode).toBe(true);
  });
});
```

### 测试覆盖目标

- **代码覆盖率**: 至少 80%
- **属性测试**: 覆盖所有 16 个正确性属性
- **单元测试**: 覆盖所有边缘情况和错误条件
- **集成测试**: 验证与现有服务的兼容性

## 实施注意事项

### 性能考虑

1. **批量操作**: 使用 `saveBatch` 而不是多次 `save`
2. **索引优化**: 为时间戳字段创建索引
3. **懒加载**: 历史记录支持分页加载
4. **异步操作**: 所有 IndexedDB 操作使用 async/await
5. **后台清理**: 数据清理在空闲时执行

### 兼容性考虑

1. **保持现有接口**: DeviceStatusStorageService 和 VideoStorageService 接口不变
2. **渐进式迁移**: 新功能使用 LocalStorageService，旧功能逐步迁移
3. **数据迁移**: 版本升级时自动迁移现有数据
4. **降级支持**: IndexedDB 不可用时自动降级

### 安全考虑

1. **数据验证**: 写入前验证数据格式
2. **敏感数据**: NFC 卡号脱敏存储
3. **配额管理**: 监控存储使用，防止滥用
4. **错误隔离**: 存储错误不影响应用运行

### 维护考虑

1. **日志记录**: 详细记录所有存储操作和错误
2. **调试工具**: 开发模式提供数据查看和导出功能
3. **版本管理**: 清晰的数据库版本升级路径
4. **文档完善**: 详细的 API 文档和使用示例

## 与现有代码的集成

### App.tsx 集成方案

App.tsx 是应用的核心状态管理中心，需要在以下位置集成 LocalStorageService：

#### 1. 初始化阶段

```typescript
// App.tsx
import { localStorageService } from './services/LocalStorageService';

export default function App() {
  // ... 现有状态声明

  // 初始化 LocalStorageService 并加载缓存数据
  useEffect(() => {
    const initStorage = async () => {
      try {
        // 初始化存储服务
        await localStorageService.init();

        // 加载所有缓存数据
        const cached = await localStorageService.loadCachedData();

        // 立即显示缓存数据
        if (cached.persons.length > 0) setPersons(cached.persons);
        if (cached.fingerprints.length > 0) setFingerprints(cached.fingerprints);
        if (cached.nfcCards.length > 0) setNfcCards(cached.nfcCards);
        if (cached.tempPasswords.length > 0) setTempPasswords(cached.tempPasswords);
        if (cached.recentActivities.length > 0) setRecentActivities(cached.recentActivities);

        // 恢复应用设置
        const savedTab = await localStorageService.getSetting('currentTab', 'home');
        setCurrentTab(savedTab);

        console.log('缓存数据加载完成');
      } catch (error) {
        console.error('初始化存储服务失败:', error);
      }
    };

    initStorage();
  }, []);
```

#### 2. 人脸数据同步

```typescript
// 订阅人脸管理响应
const unsubFace = deviceService.on("face_response", async (_, msg) => {
  if (msg.status === "success") {
    if (msg.action === "get_persons") {
      // 更新内存状态
      setPersons(msg.data);

      // 同步到本地存储
      await localStorageService.syncData("persons", msg.data);
    }
    // ... 其他操作
  }
});
```

#### 3. 指纹数据同步

```typescript
// 订阅指纹管理结果
const unsubFingerResult = deviceService.on("finger_result", async (_, data) => {
  const { command, result, data: responseData } = data;

  if (result === "success" && command === "query" && responseData) {
    const fingerprintList = (responseData.list || []).map((item) => ({
      id: item.id,
      name: item.name || `指纹 ${item.id}`,
      registeredAt: item.registered_at || new Date().toISOString(),
    }));

    // 更新内存状态
    setFingerprints(fingerprintList);

    // 同步到本地存储
    await localStorageService.syncData("fingerprints", fingerprintList);
  }
});
```

#### 4. NFC 卡片数据同步

```typescript
// 订阅 NFC 卡片管理结果
const unsubNfcResult = deviceService.on("nfc_result", async (_, data) => {
  const { command, result, data: responseData } = data;

  if (result === "success" && command === "query" && responseData) {
    const cardList = (responseData.list || []).map((item) => ({
      id: item.id,
      name: item.name || `卡片 ${item.id}`,
      cardId: item.card_id || "",
      maskedCardId: item.masked_card_id || maskCardId(item.card_id || ""),
      registeredAt: item.registered_at || new Date().toISOString(),
    }));

    // 更新内存状态
    setNfcCards(cardList);

    // 同步到本地存储
    await localStorageService.syncData("nfcCards", cardList);
  }
});
```

#### 5. 临时密码数据同步

```typescript
// 订阅密码管理结果
const unsubPasswordResult = deviceService.on(
  "password_result",
  async (_, data) => {
    const { command, result, data: responseData } = data;

    if (result === "success" && command === "query" && responseData) {
      const passwordList = (responseData.list || []).map((item) => ({
        id: item.id,
        name: item.name || `临时密码 ${item.id}`,
        password: item.password || "",
        type: item.type || "one_time",
        validFrom: item.valid_from,
        validUntil: item.valid_until,
        maxUses: item.max_uses,
        currentUses: item.current_uses || 0,
        createdAt: item.created_at || new Date().toISOString(),
        isExpired: item.is_expired || false,
      }));

      // 更新内存状态
      setTempPasswords(passwordList);

      // 同步到本地存储
      await localStorageService.syncData("tempPasswords", passwordList);
    }
  },
);
```

#### 6. 开锁记录持久化

```typescript
// 订阅开锁日志
const unsubLogReport = deviceService.on("log_report", async (_, data) => {
  const unlockLog = {
    id: data.data.id || Date.now(),
    method: data.data.method,
    uid: data.data.uid,
    status: data.data.status,
    lock_time: data.data.lock_time,
    timestamp: new Date(data.ts * 1000).toISOString(),
    user_name: data.data.user_name,
    hasVideo: data.data.hasVideo,
    mediaId: data.data.mediaId,
  };

  // 保存到本地存储
  await localStorageService.save("unlockLogs", unlockLog);

  // 创建最近动态
  const activity = {
    id: Math.random().toString(36).substring(2, 11),
    type: "unlock" as const,
    title: methodMap[data.data.method] || data.data.method,
    description: data.data.status === "success" ? "开锁成功" : "开锁失败",
    timestamp: new Date(data.ts * 1000).toISOString(),
  };

  // 更新内存状态
  setRecentActivities((prev) => [activity, ...prev].slice(0, 10));

  // 保存到本地存储
  await localStorageService.save("recentActivities", activity);
});
```

#### 7. 事件记录持久化

```typescript
// 订阅事件上报
const unsubEventReport = deviceService.on("event_report", async (_, data) => {
  const eventLog = {
    id: Date.now(),
    event: data.event,
    param: data.param,
    timestamp: new Date(data.ts * 1000).toISOString(),
  };

  // 保存到本地存储
  await localStorageService.save("eventLogs", eventLog);

  // 创建最近动态
  const activity = {
    id: Math.random().toString(36).substring(2, 11),
    type: "event" as const,
    title: eventTextMap[data.event] || data.event,
    description: `参数: ${data.param}`,
    timestamp: new Date(data.ts * 1000).toISOString(),
  };

  // 更新内存状态
  setRecentActivities((prev) => [activity, ...prev].slice(0, 10));

  // 保存到本地存储
  await localStorageService.save("recentActivities", activity);
});
```

#### 8. 到访记录持久化

```typescript
// 订阅到访通知
const unsubVisit = deviceService.on("visit", async (_, data) => {
  const visitRecord = {
    id: Date.now(),
    visit_time: new Date().toISOString(),
    person_name: data.person_name || "陌生人",
    result: data.result || "unknown",
    access_granted: data.access_granted || false,
    timestamp: new Date().toISOString(),
  };

  // 保存到本地存储
  await localStorageService.save("visitRecords", visitRecord);

  // 更新到访列表（如果需要在 UI 中显示）
  setVisits((prev) => [visitRecord, ...prev].slice(0, 200));

  // ... 现有的弹窗逻辑
});
```

#### 9. Tab 状态持久化

```typescript
// 监听 Tab 切换
const handleTabChange = async (newTab: Tab) => {
  setCurrentTab(newTab);

  // 保存到本地存储（防抖 500ms）
  clearTimeout(tabSaveTimeout.current);
  tabSaveTimeout.current = setTimeout(async () => {
    await localStorageService.saveSetting('currentTab', newTab);
  }, 500);
};

// 在组件中使用
<BottomNav currentTab={currentTab} onTabChange={handleTabChange} />
```

### SettingsScreen 集成方案

SettingsScreen 需要显示历史记录，集成方案如下：

#### 1. 开锁记录查询

```typescript
// SettingsScreen.tsx
import { localStorageService } from "@/services/LocalStorageService";

const [unlockLogs, setUnlockLogs] = useState<UnlockLog[]>([]);
const [isLoadingLogs, setIsLoadingLogs] = useState(false);

// 加载开锁记录
const loadUnlockLogs = async () => {
  setIsLoadingLogs(true);
  try {
    // 从本地存储加载
    const logs = await localStorageService.getAll("unlockLogs");

    // 按时间倒序排列
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    setUnlockLogs(logs);
  } catch (error) {
    console.error("加载开锁记录失败:", error);
  } finally {
    setIsLoadingLogs(false);
  }
};

// 组件挂载时加载
useEffect(() => {
  if (subScreen === "unlock-logs") {
    loadUnlockLogs();
  }
}, [subScreen]);
```

#### 2. 事件记录查询

```typescript
const [eventLogs, setEventLogs] = useState<EventLog[]>([]);

const loadEventLogs = async () => {
  try {
    const logs = await localStorageService.getAll("eventLogs");
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    setEventLogs(logs);
  } catch (error) {
    console.error("加载事件记录失败:", error);
  }
};
```

#### 3. 到访记录查询

```typescript
const [visitRecords, setVisitRecords] = useState<VisitRecord[]>([]);

const loadVisitRecords = async () => {
  try {
    const records = await localStorageService.getAll("visitRecords");
    records.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    setVisitRecords(records);
  } catch (error) {
    console.error("加载到访记录失败:", error);
  }
};
```

#### 4. 分页加载支持

```typescript
const [currentPage, setCurrentPage] = useState(1);
const PAGE_SIZE = 20;

const loadUnlockLogsPage = async (page: number) => {
  try {
    // 使用分页查询
    const logs = await localStorageService.query(
      "unlockLogs",
      "timestamp",
      IDBKeyRange.upperBound(new Date().toISOString()),
      { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
    );

    setUnlockLogs((prev) => (page === 1 ? logs : [...prev, ...logs]));
  } catch (error) {
    console.error("加载开锁记录失败:", error);
  }
};
```

#### 5. 清空缓存功能

```typescript
const handleClearCache = async () => {
  if (!confirm("确定要清空所有本地缓存吗？此操作不可恢复。")) {
    return;
  }

  try {
    // 清空所有非关键数据
    await localStorageService.clear("unlockLogs");
    await localStorageService.clear("eventLogs");
    await localStorageService.clear("visitRecords");
    await localStorageService.clear("recentActivities");

    // 重置状态
    setUnlockLogs([]);
    setEventLogs([]);
    setVisitRecords([]);

    alert("缓存已清空");
  } catch (error) {
    console.error("清空缓存失败:", error);
    alert("清空缓存失败，请重试");
  }
};
```

### DeviceService 集成方案

DeviceService 不需要直接调用 LocalStorageService，但需要确保事件数据格式完整：

#### 事件数据格式增强

```typescript
// DeviceService.ts
// 确保所有事件数据包含必要字段

// 开锁日志事件
this.emit("log_report", {
  ts: timestamp,
  data: {
    id: logId, // 添加唯一 ID
    method: method,
    uid: uid,
    status: status,
    lock_time: lockTime,
    user_name: userName,
    hasVideo: hasVideo,
    mediaId: mediaId,
  },
});

// 事件上报
this.emit("event_report", {
  event: eventType,
  param: param,
  ts: timestamp,
});

// 到访通知
this.emit("visit", {
  visit_id: visitId,
  person_id: personId,
  person_name: personName,
  relation: relation,
  result: result,
  access_granted: accessGranted,
  image: image,
  image_path: imagePath,
  ts: timestamp,
});
```

### 数据流完整示例

以人脸管理为例，完整的数据流如下：

```
1. 应用启动
   ├─ LocalStorageService.init()
   ├─ loadCachedData()
   ├─ setPersons(cached.persons)  // 立即显示缓存
   └─ UI 渲染（显示缓存数据，标记为"缓存"）

2. WebSocket 连接成功
   ├─ DeviceService.connect()
   ├─ 发送 get_persons 命令
   └─ 等待服务器响应

3. 收到服务器响应
   ├─ DeviceService.emit('face_response', data)
   ├─ App.tsx 订阅处理
   ├─ setPersons(data)  // 更新内存状态
   ├─ LocalStorageService.syncData('persons', data)  // 同步到本地
   └─ UI 自动更新（显示最新数据，移除"缓存"标记）

4. 用户添加人脸
   ├─ DeviceService.sendFaceRegister(data)
   ├─ 收到成功响应
   ├─ 重新请求 get_persons
   ├─ 更新内存和本地存储
   └─ UI 自动更新

5. 页面刷新
   ├─ 重复步骤 1-3
   └─ 用户体验：立即看到缓存数据 → 自动更新为最新数据
```

### 错误处理集成

在 App.tsx 中添加全局错误处理：

```typescript
// 监听存储服务错误
useEffect(() => {
  const handleStorageError = (error: Error) => {
    console.error("存储服务错误:", error);

    // 显示用户友好的提示
    if (error.message.includes("QuotaExceeded")) {
      alert("存储空间不足，部分数据可能无法保存。建议清理缓存。");
    } else if (error.message.includes("降级模式")) {
      alert("本地存储不可用，数据将在页面刷新后丢失。");
    }
  };

  localStorageService.on("error", handleStorageError);

  return () => {
    localStorageService.off("error", handleStorageError);
  };
}, []);
```

### 性能优化集成

#### 批量保存优化

```typescript
// 批量保存最近动态
const saveActivitiesBatch = async (activities: Activity[]) => {
  try {
    await localStorageService.saveBatch("recentActivities", activities);
  } catch (error) {
    console.error("批量保存动态失败:", error);
  }
};
```

#### 防抖保存优化

```typescript
// 使用防抖避免频繁写入
const debouncedSave = useCallback(
  debounce(async (storeName: string, data: any) => {
    await localStorageService.save(storeName, data);
  }, 500),
  [],
);
```

### 调试支持集成

在开发模式下添加调试工具：

```typescript
// App.tsx
useEffect(() => {
  if (process.env.NODE_ENV === "development") {
    // 暴露调试接口到全局
    (window as any).debugStorage = {
      getStats: () => localStorageService.getStorageStats(),
      clearAll: () => localStorageService.clearAll(),
      exportData: () => localStorageService.exportAllData(),
      viewStore: (name: string) => localStorageService.getAll(name),
    };

    console.log("调试工具已加载: window.debugStorage");
  }
}, []);
```

### 迁移策略

为了确保平滑过渡，采用以下迁移策略：

1. **第一阶段**: 实现 LocalStorageService，但不影响现有功能
2. **第二阶段**: 在 App.tsx 中添加缓存加载，与现有逻辑并行运行
3. **第三阶段**: 逐步添加数据同步调用，验证功能正常
4. **第四阶段**: 在 SettingsScreen 中使用本地数据，提供离线查看能力
5. **第五阶段**: 完全集成，移除临时代码

### 集成检查清单

实施时需要确保：

- [ ] LocalStorageService 初始化在 App.tsx 最早执行
- [ ] 所有 DeviceService 事件订阅都添加了本地存储同步
- [ ] 缓存数据加载后立即更新 UI 状态
- [ ] 服务器数据到达后覆盖缓存数据
- [ ] SettingsScreen 能够查询和显示本地历史记录
- [ ] Tab 切换能够正确保存和恢复
- [ ] 错误处理不会中断应用运行
- [ ] 降级模式下应用仍可正常使用
- [ ] 开发模式下调试工具可用
- [ ] 所有数据类型都有对应的持久化逻辑
