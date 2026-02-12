# 需求文档 - 协议对齐

## 介绍

本需求文档旨在确保智能门锁 App 的 DeviceService 实现与服务器通信协议规范 v2.3 完全对齐。通过分析协议文档和当前代码实现,识别出需要修复和完善的功能点。

## 术语表

- **App**: 智能门锁移动应用客户端
- **Server**: WebSocket 服务器,负责转发和处理消息
- **ESP32**: 智能门锁设备端控制器
- **STM32**: 智能门锁硬件执行单元
- **seq_id**: 消息序列号,格式为 `时间戳_序号`
- **server_ack**: 服务器确认消息,表示服务器已收到命令
- **esp32_ack**: ESP32 确认消息,表示 ESP32 已收到命令
- **ack**: 命令执行完成确认,表示 STM32 执行完成
- **DeviceService**: App 端设备通信服务类

## 需求

### 需求 1: 修复 hello 消息缺少 app_id 字段

**用户故事**: 作为开发者,我希望 hello 认证消息包含 app_id 字段,以便服务器能够追踪操作来源并支持审计。

#### 验收标准

1. WHEN App 发送 hello 消息 THEN 消息 SHALL 包含 app_id 字段
2. WHEN app_id 字段缺失 THEN 服务器 SHALL 返回错误响应
3. THE app_id SHALL 使用用户唯一标识符(如设备 UUID 或用户 ID)

### 需求 2: 实现 esp32_ack 消息处理

**用户故事**: 作为用户,我希望能够看到命令的两级确认状态,以便了解命令是否已被设备接收和执行。

#### 验收标准

1. WHEN 收到 esp32_ack 消息 THEN App SHALL 触发 esp32_ack 事件
2. WHEN 收到 esp32_ack 消息 THEN App SHALL 记录日志显示"设备已收到命令"
3. WHEN 收到 esp32_ack 消息 THEN App SHALL 保持命令在等待队列中(等待最终 ack)
4. THE esp32_ack 消息 SHALL 携带原始 seq_id

### 需求 3: 完善 ack 错误码映射

**用户故事**: 作为用户,我希望看到清晰的错误提示信息,以便理解命令失败的原因。

#### 验收标准

1. WHEN 收到 ack 消息且 code 为 0-10 THEN App SHALL 显示对应的中文错误描述
2. THE 错误码映射 SHALL 包含以下错误码:
   - 0: 成功
   - 1: 设备离线
   - 2: 设备忙碌
   - 3: 参数错误
   - 4: 不支持
   - 5: 超时
   - 6: 硬件故障
   - 7: 资源已满
   - 8: 未认证
   - 9: 重复消息
   - 10: 内部错误
3. WHEN 收到未知错误码 THEN App SHALL 显示默认错误消息

### 需求 4: 新增事件类型支持

**用户故事**: 作为用户,我希望收到门锁的所有事件通知,以便及时了解门锁状态变化。

#### 验收标准

1. WHEN 收到 event_report 消息且 event 为 door_closed THEN App SHALL 显示"门已关闭"
2. WHEN 收到 event_report 消息且 event 为 lock_success THEN App SHALL 显示"上锁成功"
3. WHEN 收到 event_report 消息且 event 为 bolt_alarm THEN App SHALL 显示"锁舌上锁失败，请尝试远程上锁"
4. THE bolt_alarm 事件 SHALL 提供远程上锁重试的操作建议
5. THE 事件处理 SHALL 触发对应的 UI 更新

### 需求 5: 实现 door_opened_report 消息处理

**用户故事**: 作为用户,我希望收到门已开启的通知,以便了解门的物理开启事件。

#### 验收标准

1. WHEN 收到 door_opened_report 消息 THEN App SHALL 触发 door_opened_report 事件
2. WHEN 收到 door_opened_report 消息 THEN App SHALL 记录日志显示开门方式和来源
3. THE door_opened_report 消息 SHALL 包含 method 和 source 字段
4. THE source 字段 SHALL 区分 outside(外侧)、inside(内侧)、unknown(未知)

### 需求 6: 实现 password_report 消息处理

**用户故事**: 作为用户,我希望能够查询当前设置的密码,以便确认密码配置。

#### 验收标准

1. WHEN 收到 password_report 消息 THEN App SHALL 触发 password_report 事件
2. WHEN 收到 password_report 消息 THEN App SHALL 将密码数据传递给订阅者
3. THE password_report 消息 SHALL 包含 password 字段
4. THE password_report 消息 SHALL 不存储到数据库(仅用于查询结果返回)

### 需求 7: 修复 log_report 字段名称

**用户故事**: 作为开发者,我希望代码使用协议规范中定义的字段名称,以便保持一致性。

#### 验收标准

1. WHEN 处理 log_report 消息 THEN App SHALL 使用 status 字段(而非 result)
2. WHEN 处理 log_report 消息 THEN App SHALL 使用 lock_time 字段(而非 fail_count)
3. THE status 字段 SHALL 包含以下值: 0=成功, 1=失败, 2=超时
4. THE lock_time 字段 SHALL 为开锁时间戳(毫秒)

### 需求 8: 完善 user_mgmt 命令支持

**用户故事**: 作为用户,我希望能够管理指纹、NFC 卡片和密码,以便配置门锁的访问控制。

#### 验收标准

1. WHEN 发送 user_mgmt 命令 THEN 消息 SHALL 包含 category、command、user_id 字段
2. THE category 字段 SHALL 支持 finger、nfc、password 三种类型
3. THE command 字段 SHALL 支持 add、del、clear、query、set 五种操作
4. WHEN command 为 set 且 category 为 password THEN 消息 SHALL 包含 payload 字段

### 需求 9: 实现 query 命令支持

**用户故事**: 作为用户,我希望能够查询设备状态和历史记录,以便了解门锁的运行情况。

#### 验收标准

1. WHEN 发送 query 命令 THEN 消息 SHALL 包含 target 字段
2. THE target 字段 SHALL 支持以下查询类型:
   - status: 当前设备状态
   - status_history: 历史状态记录
   - events: 事件历史
   - unlock_logs: 开锁日志
   - media_files: 媒体文件列表
3. WHEN target 需要分页参数 THEN 消息 SHALL 包含 limit 和 offset 字段
4. WHEN 收到 query_result 响应 THEN App SHALL 触发对应的结果事件

### 需求 10: 实现 face_management 命令支持

**用户故事**: 作为用户,我希望能够管理人脸识别数据,以便配置授权人员。

#### 验收标准

1. WHEN 发送 face_management 命令 THEN 消息 SHALL 包含 action 字段
2. THE action 字段 SHALL 支持以下操作:
   - register: 注册人脸
   - get_persons: 获取人员列表
   - delete_person: 删除人员
   - update_permission: 更新权限
   - get_visits: 获取到访记录
3. WHEN action 为 register THEN 消息 SHALL 包含 name、relation_type、images、permission 字段
4. WHEN 收到 face_management 响应 THEN App SHALL 触发 face_response 事件

### 需求 11: 完善 media_download 功能

**用户故事**: 作为用户,我希望能够下载人脸图片和录像文件,以便查看历史记录。

#### 验收标准

1. WHEN 发送 media_download 命令 THEN 消息 SHALL 支持通过 file_id 或 file_path 下载
2. WHEN 文件小于 50MB THEN App SHALL 使用完整下载方式
3. WHEN 文件大于 5MB THEN App SHALL 使用分片下载方式
4. WHEN 收到 media_download 响应 THEN App SHALL 解码 Base64 内容并触发下载完成事件

### 需求 12: 实现 system 命令支持

**用户故事**: 作为用户,我希望能够启动和停止监控模式,以便实时查看门锁摄像头画面。

#### 验收标准

1. WHEN 发送 start_monitor 命令 THEN 消息 SHALL 包含 record 字段
2. WHEN 发送 stop_monitor 命令 THEN 消息 SHALL 不包含额外字段
3. WHEN 收到 system 响应 THEN App SHALL 根据 status 字段显示成功或失败
4. THE system 命令 SHALL 使用 sendCommand 方法发送(支持 seq_id 和重试)

### 需求 13: 修复 seq_id 格式问题

**用户故事**: 作为开发者,我希望 seq_id 格式符合协议规范,以便服务器能够正确处理消息。

#### 验收标准

1. THE seq_id 格式 SHALL 为 `时间戳_序号`(不包含任何前缀)
2. THE 时间戳 SHALL 为 13 位毫秒级时间戳
3. THE 序号 SHALL 从 0 开始递增
4. WHEN 同一毫秒内发送多个命令 THEN 序号 SHALL 递增
5. WHEN 新的毫秒到来 THEN 序号 SHALL 重置为 0

### 需求 14: 完善命令超时和重试机制

**用户故事**: 作为用户,我希望命令发送失败时能够自动重试,以便提高通信可靠性。

#### 验收标准

1. WHEN 发送命令后 3 秒未收到 server_ack THEN App SHALL 重传命令
2. THE 重传次数 SHALL 最多为 3 次
3. WHEN 重传时 THEN App SHALL 使用相同的 seq_id
4. WHEN 超过最大重试次数 THEN App SHALL 触发错误回调并清理等待队列
5. WHEN 收到 server_ack 且 code 为 0 THEN App SHALL 继续等待 ack(不清理队列)

### 需求 15: 实现设备上下线通知处理

**用户故事**: 作为用户,我希望能够实时了解设备的在线状态,以便判断是否可以操作门锁。

#### 验收标准

1. WHEN 收到 device_status 消息且 status 为 online THEN App SHALL 显示"设备已上线"
2. WHEN 收到 device_status 消息且 status 为 offline THEN App SHALL 显示"设备已离线"
3. WHEN 设备离线 THEN App SHALL 更新 UI 状态(禁用操作按钮)
4. THE device_status 消息 SHALL 包含 device_id、ts、reason(仅 offline 时)字段

### 需求 16: 修复音频 API 弃用警告

**用户故事**: 作为开发者,我希望使用现代化的 Web Audio API,以便避免浏览器兼容性问题。

#### 验收标准

1. THE 音频对讲功能 SHALL 使用 AudioWorklet 替代 ScriptProcessorNode
2. WHEN 浏览器不支持 AudioWorklet THEN App SHALL 降级使用 ScriptProcessorNode
3. THE 音频播放功能 SHALL 保持使用 AudioContext 和 AudioBufferSourceNode
4. THE 代码 SHALL 不产生弃用警告

### 需求 17: 完善日志记录和调试支持

**用户故事**: 作为开发者,我希望能够追踪消息的完整流程,以便调试通信问题。

#### 验收标准

1. WHEN 发送命令 THEN App SHALL 记录日志包含 type 和 seq_id
2. WHEN 收到响应 THEN App SHALL 记录日志包含 type、seq_id 和 code
3. WHEN 命令超时重传 THEN App SHALL 记录日志显示重传次数
4. THE 日志 SHALL 使用统一的格式便于追踪

### 需求 18: 实现防重放机制

**用户故事**: 作为开发者,我希望避免重复处理相同的消息,以便提高系统稳定性。

#### 验收标准

1. WHEN 收到 server_ack 且 code 为 5(重复消息) THEN App SHALL 清理等待队列但不触发错误
2. THE App SHALL 不主动实现防重放检查(由服务器负责)
3. WHEN 重传命令时 THEN App SHALL 使用相同的 seq_id(允许服务器检测重复)

### 需求 19: 完善错误处理和用户提示

**用户故事**: 作为用户,我希望看到清晰的错误提示和操作建议,以便快速解决问题。

#### 验收标准

1. WHEN 命令失败 THEN App SHALL 显示具体的错误原因
2. WHEN 设备离线 THEN App SHALL 提示"请检查网络连接"
3. WHEN 设备忙碌 THEN App SHALL 提示"请稍后重试"
4. WHEN 硬件故障 THEN App SHALL 提示"请联系维修"
5. THE 错误提示 SHALL 使用中文并提供操作建议
