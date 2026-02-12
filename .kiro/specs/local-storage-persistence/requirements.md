# 需求文档：本地持久化存储

## 简介

智能门锁应用当前仅对设备状态和视频文件进行了持久化存储，大部分业务数据（人脸列表、指纹列表、开锁记录等）存储在内存中，页面刷新后丢失。本需求旨在实现完整的本地持久化方案，使用 IndexedDB 统一管理所有应用数据，提升用户体验和离线能力。

## 术语表

- **LocalStorageService**: 统一的本地存储服务，管理所有 IndexedDB 操作
- **IndexedDB**: 浏览器提供的客户端存储 API，支持大容量结构化数据存储
- **FIFO**: First In First Out，先进先出的数据清理策略
- **数据同步**: 本地缓存与服务器数据的双向更新机制
- **降级模式**: 当 IndexedDB 不可用时，应用回退到纯内存模式运行
- **事务**: IndexedDB 的原子操作单元，保证数据一致性

## 需求

### 需求 1：统一存储服务架构

**用户故事**: 作为开发者，我希望有一个统一的存储服务来管理所有本地数据，以便简化代码维护和保证数据一致性。

#### 验收标准

1. THE LocalStorageService SHALL 提供统一的 CRUD 接口用于所有数据类型
2. WHEN 初始化 LocalStorageService THEN THE System SHALL 整合现有的 DeviceStatusStorageService 和 VideoStorageService
3. THE LocalStorageService SHALL 使用单一 IndexedDB 数据库 "SmartDoorlockDB"
4. THE LocalStorageService SHALL 支持数据库版本升级机制
5. WHEN IndexedDB 不可用 THEN THE System SHALL 降级到纯内存模式并记录警告日志

### 需求 2：人脸数据持久化

**用户故事**: 作为用户，我希望人脸列表数据能够本地保存，这样页面刷新后不需要重新加载。

#### 验收标准

1. THE System SHALL 在 IndexedDB 中创建 "persons" 对象存储
2. WHEN 收到服务器人脸列表响应 THEN THE System SHALL 保存到本地存储
3. WHEN 应用启动 THEN THE System SHALL 从本地存储加载人脸列表
4. WHEN 添加或删除人脸 THEN THE System SHALL 同步更新本地存储
5. THE System SHALL 存储完整的人脸信息（id, name, relation_type, permission）

### 需求 3：指纹数据持久化

**用户故事**: 作为用户，我希望指纹列表数据能够本地保存，这样页面刷新后不需要重新加载。

#### 验收标准

1. THE System SHALL 在 IndexedDB 中创建 "fingerprints" 对象存储
2. WHEN 收到服务器指纹列表响应 THEN THE System SHALL 保存到本地存储
3. WHEN 应用启动 THEN THE System SHALL 从本地存储加载指纹列表
4. WHEN 添加或删除指纹 THEN THE System SHALL 同步更新本地存储
5. THE System SHALL 存储完整的指纹信息（id, name, registeredAt）

### 需求 4：NFC 卡片数据持久化

**用户故事**: 作为用户，我希望 NFC 卡片列表数据能够本地保存，这样页面刷新后不需要重新加载。

#### 验收标准

1. THE System SHALL 在 IndexedDB 中创建 "nfcCards" 对象存储
2. WHEN 收到服务器 NFC 卡片列表响应 THEN THE System SHALL 保存到本地存储
3. WHEN 应用启动 THEN THE System SHALL 从本地存储加载 NFC 卡片列表
4. WHEN 添加或删除 NFC 卡片 THEN THE System SHALL 同步更新本地存储
5. THE System SHALL 存储完整的卡片信息（id, name, cardId, maskedCardId, registeredAt）

### 需求 5：临时密码数据持久化

**用户故事**: 作为用户，我希望临时密码列表数据能够本地保存，这样页面刷新后不需要重新加载。

#### 验收标准

1. THE System SHALL 在 IndexedDB 中创建 "tempPasswords" 对象存储
2. WHEN 收到服务器临时密码列表响应 THEN THE System SHALL 保存到本地存储
3. WHEN 应用启动 THEN THE System SHALL 从本地存储加载临时密码列表
4. WHEN 创建或删除临时密码 THEN THE System SHALL 同步更新本地存储
5. THE System SHALL 存储完整的密码信息（id, name, password, type, validFrom, validUntil, maxUses, currentUses, createdAt, isExpired）

### 需求 6：开锁记录持久化

**用户故事**: 作为用户，我希望查看历史开锁记录，即使在离线状态下也能浏览最近的记录。

#### 验收标准

1. THE System SHALL 在 IndexedDB 中创建 "unlockLogs" 对象存储
2. WHEN 收到开锁日志推送 THEN THE System SHALL 保存到本地存储
3. THE System SHALL 保留最近 30 天或最多 500 条开锁记录
4. WHEN 记录超过限制 THEN THE System SHALL 删除最旧的记录
5. THE System SHALL 创建时间索引以支持高效查询

### 需求 7：事件记录持久化

**用户故事**: 作为用户，我希望查看历史事件记录（门铃、移动检测等），即使在离线状态下也能浏览最近的记录。

#### 验收标准

1. THE System SHALL 在 IndexedDB 中创建 "eventLogs" 对象存储
2. WHEN 收到事件上报 THEN THE System SHALL 保存到本地存储
3. THE System SHALL 保留最近 30 天或最多 500 条事件记录
4. WHEN 记录超过限制 THEN THE System SHALL 删除最旧的记录
5. THE System SHALL 创建时间索引以支持高效查询

### 需求 8：到访记录持久化

**用户故事**: 作为用户，我希望查看历史到访记录，即使在离线状态下也能浏览最近的访客信息。

#### 验收标准

1. THE System SHALL 在 IndexedDB 中创建 "visitRecords" 对象存储
2. WHEN 收到到访通知 THEN THE System SHALL 保存到本地存储
3. THE System SHALL 保留最近 30 天或最多 200 条到访记录
4. WHEN 记录超过限制 THEN THE System SHALL 删除最旧的记录
5. THE System SHALL 创建时间索引以支持高效查询

### 需求 9：最近动态持久化

**用户故事**: 作为用户，我希望首页的最近动态能够保存，这样页面刷新后仍能看到最近的活动。

#### 验收标准

1. THE System SHALL 在 IndexedDB 中创建 "recentActivities" 对象存储
2. WHEN 生成新的动态项 THEN THE System SHALL 保存到本地存储
3. THE System SHALL 保留最近 50 条动态记录
4. WHEN 应用启动 THEN THE System SHALL 从本地存储加载最近动态
5. THE System SHALL 按时间倒序排列动态项

### 需求 10：应用设置持久化

**用户故事**: 作为用户，我希望应用设置（如音量、自动下载开关等）能够保存，这样每次打开应用时不需要重新配置。

#### 验收标准

1. THE System SHALL 在 IndexedDB 中创建 "appSettings" 对象存储
2. THE System SHALL 支持存储键值对形式的设置项
3. WHEN 用户修改设置 THEN THE System SHALL 立即保存到本地存储
4. WHEN 应用启动 THEN THE System SHALL 从本地存储加载设置
5. THE System SHALL 提供默认设置值用于首次启动

### 需求 11：当前 Tab 状态持久化

**用户故事**: 作为用户，我希望应用能记住我最后浏览的 Tab 页面，这样重新打开应用时能直接回到之前的位置。

#### 验收标准

1. THE System SHALL 在 appSettings 中存储 currentTab 值
2. WHEN 用户切换 Tab THEN THE System SHALL 保存当前 Tab 到本地存储
3. WHEN 应用启动 THEN THE System SHALL 恢复上次的 Tab 位置
4. IF 本地存储中没有 Tab 记录 THEN THE System SHALL 默认显示 "home" Tab
5. THE System SHALL 在 Tab 切换后 500ms 内完成保存操作

### 需求 12：数据同步机制

**用户故事**: 作为用户，我希望应用能智能地同步本地缓存和服务器数据，既能快速显示又能保证数据最新。

#### 验收标准

1. WHEN 应用启动 THEN THE System SHALL 立即从本地缓存加载数据并显示
2. WHEN WebSocket 连接成功 THEN THE System SHALL 请求服务器最新数据
3. WHEN 收到服务器数据 THEN THE System SHALL 对比并更新本地缓存
4. WHEN 收到服务器推送 THEN THE System SHALL 实时更新内存和本地存储
5. THE System SHALL 在本地数据上标记 "缓存" 状态以区分实时数据

### 需求 13：数据清理策略

**用户故事**: 作为用户，我希望应用能自动清理过期数据，避免占用过多存储空间。

#### 验收标准

1. THE System SHALL 每次启动时检查并清理过期数据
2. WHEN 开锁记录或事件记录超过 30 天 THEN THE System SHALL 自动删除
3. WHEN 操作日志超过 7 天 THEN THE System SHALL 自动删除
4. THE System SHALL 保持视频文件的 FIFO 策略（1GB 限制）
5. THE System SHALL 提供手动清理接口供用户主动清理所有缓存

### 需求 14：错误处理与降级

**用户故事**: 作为用户，即使本地存储出现问题，我也希望应用能继续正常工作。

#### 验收标准

1. WHEN IndexedDB 初始化失败 THEN THE System SHALL 降级到纯内存模式
2. WHEN 存储操作失败 THEN THE System SHALL 记录错误日志但不中断应用流程
3. THE System SHALL 在降级模式下显示提示信息告知用户
4. WHEN 存储空间不足 THEN THE System SHALL 尝试清理旧数据后重试
5. IF 清理后仍空间不足 THEN THE System SHALL 提示用户并停止新数据写入

### 需求 15：性能优化

**用户故事**: 作为用户，我希望数据存储操作不会影响应用的响应速度。

#### 验收标准

1. THE System SHALL 使用批量写入减少 IndexedDB 事务次数
2. THE System SHALL 使用异步操作避免阻塞 UI 线程
3. WHEN 加载历史记录 THEN THE System SHALL 支持分页懒加载
4. THE System SHALL 使用索引优化查询性能
5. THE System SHALL 在后台线程执行数据清理操作

### 需求 16：数据一致性保证

**用户故事**: 作为开发者，我希望确保本地存储的数据一致性，避免数据损坏或冲突。

#### 验收标准

1. THE System SHALL 使用 IndexedDB 事务保证写入操作的原子性
2. WHEN 数据冲突发生 THEN THE System SHALL 以服务器数据为准
3. THE System SHALL 在写入前验证数据格式的有效性
4. WHEN 数据库版本升级 THEN THE System SHALL 迁移现有数据
5. THE System SHALL 提供数据完整性校验机制

### 需求 17：调试支持（可选）

**用户故事**: 作为开发者，我希望能够查看和调试本地存储的数据，以便排查问题。

#### 验收标准

1. WHERE 开发模式启用 THE System SHALL 提供查看本地存储内容的接口
2. WHERE 开发模式启用 THE System SHALL 记录详细的存储操作日志
3. WHERE 开发模式启用 THE System SHALL 提供导出本地数据的功能
4. WHERE 开发模式启用 THE System SHALL 提供清空特定存储的功能
5. WHERE 开发模式启用 THE System SHALL 在控制台显示存储统计信息
