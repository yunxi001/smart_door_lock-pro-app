# 需求文档

## 简介

智能猫眼门锁系统 App 是一款移动优先的 Web 应用，用于控制和监控智能门锁设备。App 通过 WebSocket 与服务器通信，实现实时监控、远程开锁、人脸管理、到访记录等功能。

本次迭代基于协议规范 v2.2，重构 UI 架构为三 Tab 布局（首页、监控、设置），并将人脸管理整合到设置页面的用户管理部分。

## 术语表

- **Device_Service**: WebSocket 通信服务，负责与服务器建立连接、发送命令、接收推送
- **App**: 智能门锁控制应用
- **Server**: 后端服务器，负责消息代理和数据存储
- **ESP32**: 门锁硬件设备
- **seq_id**: 消息序列号，用于消息确认和防重放
- **server_ack**: 服务器确认消息
- **Home_Screen**: 首页屏幕组件
- **Monitor_Screen**: 监控屏幕组件
- **Settings_Screen**: 设置屏幕组件
- **Bottom_Nav**: 底部导航栏组件

## 需求

### 需求 1：底部导航架构

**用户故事：** 作为用户，我希望通过底部导航栏快速切换主要功能页面，以便高效使用 App。

#### 验收标准

1. THE Bottom_Nav SHALL 显示三个导航项：首页（Home）、监控（Monitor）、设置（Settings）
2. WHEN 用户点击导航项 THEN THE App SHALL 切换到对应的屏幕页面
3. THE Bottom_Nav SHALL 高亮显示当前激活的导航项
4. THE Bottom_Nav SHALL 固定在屏幕底部，不随页面滚动

---

### 需求 2：首页功能

**用户故事：** 作为用户，我希望在首页快速查看设备状态并执行常用操作，以便高效管理门锁。

#### 验收标准

1. THE Home_Screen SHALL 在顶部显示设备连接状态（在线/离线）和电量百分比
2. THE Home_Screen SHALL 显示一个醒目的开锁按钮作为核心操作区
3. WHEN 用户点击开锁按钮 THEN THE App SHALL 发送 `lock_control` 命令（command: unlock）
4. THE Home_Screen SHALL 显示当前锁状态文本（已锁定/已开启）
5. THE Home_Screen SHALL 提供快捷功能入口：临时密码、补光灯控制、门铃测试
6. WHEN 用户点击临时密码按钮 THEN THE App SHALL 显示临时密码生成弹窗
7. WHEN 用户生成临时密码 THEN THE App SHALL 发送 `lock_control` 命令（command: temp_code）
8. WHEN 用户点击补光灯按钮 THEN THE App SHALL 发送 `dev_control` 命令（target: light）
9. THE Home_Screen SHALL 显示最近 3 条到访/开锁记录
10. WHEN 服务器推送 `status_report` THEN THE App SHALL 更新首页的设备状态显示
11. WHEN 服务器推送 `event_report` THEN THE App SHALL 在最近动态列表中显示新事件
12. WHEN 服务器推送 `log_report` THEN THE App SHALL 在最近动态列表中显示开锁记录

---

### 需求 3：实时监控功能

**用户故事：** 作为用户，我希望实时查看门外画面并与访客对讲，以便远程确认访客身份。

#### 验收标准

1. THE Monitor_Screen SHALL 显示实时视频流区域（JPEG 帧序列）
2. WHEN 用户点击"开启监控"按钮 THEN THE App SHALL 发送 `system` 命令（command: start_monitor）
3. WHEN 用户点击"停止监控"按钮 THEN THE App SHALL 发送 `system` 命令（command: stop_monitor）
4. THE Monitor_Screen SHALL 显示视频帧率（FPS）和数据接收量统计
5. THE Monitor_Screen SHALL 提供对讲按钮，支持双向语音通话
6. WHEN 用户按下对讲按钮 THEN THE App SHALL 启动麦克风采集并发送 PCM 音频数据
7. WHEN 用户松开对讲按钮 THEN THE App SHALL 停止麦克风采集
8. THE Monitor_Screen SHALL 提供音量控制滑块
9. THE Monitor_Screen SHALL 提供静音开关
10. WHEN 设备离线 THEN THE Monitor_Screen SHALL 显示"设备离线"占位状态
11. WHEN 接收到二进制视频帧 THEN THE App SHALL 解析 BinaryProtocol2 格式并渲染 JPEG 图像
12. WHEN 接收到二进制音频帧 THEN THE App SHALL 解析 PCM 数据并通过 Web Audio API 播放

---

### 需求 4：设置页面架构

**用户故事：** 作为用户，我希望在设置页面集中管理设备配置和用户信息，以便统一维护。

#### 验收标准

1. THE Settings_Screen SHALL 显示设备连接配置区域（服务器地址、设备 ID）
2. THE Settings_Screen SHALL 提供连接/断开按钮
3. WHEN 用户点击连接按钮 THEN THE App SHALL 建立 WebSocket 连接并发送 `hello` 认证消息
4. WHEN 用户点击断开按钮 THEN THE App SHALL 关闭 WebSocket 连接
5. THE Settings_Screen SHALL 显示用户管理分组，包含：人脸管理、指纹管理、NFC 卡片管理、密码管理入口
6. THE Settings_Screen SHALL 显示历史记录分组，包含：开锁记录、事件记录、到访记录入口
7. THE Settings_Screen SHALL 显示系统日志区域
8. THE Settings_Screen SHALL 提供清空日志按钮

---

### 需求 5：人脸管理功能

**用户故事：** 作为用户，我希望管理授权人员的人脸信息，以便控制门锁访问权限。

#### 验收标准

1. THE App SHALL 在设置页面的用户管理分组中提供"人脸管理"入口
2. WHEN 用户点击人脸管理入口 THEN THE App SHALL 显示人脸管理子页面
3. THE 人脸管理页面 SHALL 显示已录入人员列表
4. WHEN 页面加载 THEN THE App SHALL 发送 `face_management` 命令（action: get_persons）获取人员列表
5. THE 人员列表项 SHALL 显示：头像、姓名、关系类型、权限时段
6. THE 人脸管理页面 SHALL 提供添加人员按钮
7. WHEN 用户点击添加按钮 THEN THE App SHALL 显示人员录入表单
8. THE 录入表单 SHALL 包含：姓名输入、关系选择、照片上传、通行时段设置
9. WHEN 用户提交录入表单 THEN THE App SHALL 发送 `face_management` 命令（action: register）
10. THE 人员列表项 SHALL 提供删除操作
11. WHEN 用户确认删除 THEN THE App SHALL 发送 `face_management` 命令（action: delete_person）
12. WHEN 服务器返回 `face_management` 响应 THEN THE App SHALL 更新人员列表显示

---

### 需求 6：到访记录功能

**用户故事：** 作为用户，我希望查看历史到访记录，以便了解门锁使用情况。

#### 验收标准

1. THE App SHALL 在设置页面的历史记录分组中提供"到访记录"入口
2. WHEN 用户点击到访记录入口 THEN THE App SHALL 显示到访记录列表
3. WHEN 页面加载 THEN THE App SHALL 发送 `face_management` 命令（action: get_visits）获取记录
4. THE 到访记录项 SHALL 显示：人员姓名、到访时间、识别结果、是否开门
5. WHEN 服务器推送 `visit_notification` THEN THE App SHALL 在到访记录列表中添加新记录
6. THE 到访记录 SHALL 支持分页加载

---

### 需求 7：WebSocket 通信与消息确认

**用户故事：** 作为系统，我需要可靠的消息传输机制，以确保命令正确送达。

#### 验收标准

1. WHEN App 发送命令消息 THEN THE Device_Service SHALL 自动生成并附加 `seq_id` 字段
2. THE seq_id SHALL 遵循格式：`app_{timestamp}_{sequence}`
3. WHEN 服务器返回 `server_ack` THEN THE App SHALL 根据 `code` 字段判断处理结果
4. IF server_ack.code 为 0 THEN THE App SHALL 视为消息处理成功
5. IF server_ack.code 为 1 THEN THE App SHALL 提示"设备离线"
6. IF server_ack.code 为 2 THEN THE App SHALL 提示"参数错误"
7. IF server_ack.code 为 3 THEN THE App SHALL 提示"未认证"
8. WHEN 服务器推送 `device_status` THEN THE App SHALL 更新设备在线状态显示
9. WHEN device_status.status 为 offline THEN THE App SHALL 禁用需要设备在线的操作按钮

---

### 需求 8：设备控制命令

**用户故事：** 作为用户，我希望远程控制门锁设备的各项功能。

#### 验收标准

1. WHEN 用户执行开锁操作 THEN THE App SHALL 发送 `lock_control` 命令（command: unlock, duration: 5）
2. WHEN 用户执行关锁操作 THEN THE App SHALL 发送 `lock_control` 命令（command: lock）
3. WHEN 用户生成临时密码 THEN THE App SHALL 发送 `lock_control` 命令（command: temp_code, code: 6位密码, expires: 有效期秒数）
4. WHEN 用户控制补光灯 THEN THE App SHALL 发送 `dev_control` 命令（target: light, action: on/off/auto）
5. WHEN 用户触发门铃测试 THEN THE App SHALL 发送 `dev_control` 命令（target: beep, count: 1, mode: short）
6. WHEN 服务器转发 ESP32 的 `ack` 响应 THEN THE App SHALL 根据 code 显示操作结果

---

### 需求 9：数据查询功能

**用户故事：** 作为用户，我希望查询设备历史数据，以便分析使用情况。

#### 验收标准

1. WHEN 用户查看开锁记录 THEN THE App SHALL 发送 `query` 命令（target: unlock_logs）
2. WHEN 用户查看事件记录 THEN THE App SHALL 发送 `query` 命令（target: events）
3. WHEN 服务器返回 `query_result` THEN THE App SHALL 解析并显示记录列表
4. THE 查询结果 SHALL 支持分页参数（limit, offset）
5. IF query_result.status 为 error THEN THE App SHALL 显示错误提示

---

### 需求 10：实时推送处理

**用户故事：** 作为用户，我希望实时收到设备状态变化和事件通知。

#### 验收标准

1. WHEN 服务器推送 `status_report` THEN THE App SHALL 更新设备状态（电量、锁状态、补光灯状态）
2. WHEN 服务器推送 `event_report` THEN THE App SHALL 根据 event 类型显示相应通知
3. IF event 为 bell THEN THE App SHALL 显示门铃通知
4. IF event 为 tamper THEN THE App SHALL 显示撬锁报警通知
5. IF event 为 low_battery THEN THE App SHALL 显示低电量警告
6. WHEN 服务器推送 `log_report` THEN THE App SHALL 记录开锁日志
7. WHEN 服务器推送 `visit_notification` THEN THE App SHALL 显示到访通知弹窗
8. THE 到访通知 SHALL 显示：人员姓名、识别结果、是否开门、抓拍图片

---

### 需求 11：指纹管理功能

**用户故事：** 作为用户，我希望管理门锁上录入的指纹，以便控制授权人员的指纹开锁权限。

#### 验收标准

1. THE App SHALL 在设置页面的用户管理分组中提供"指纹管理"入口
2. WHEN 用户点击指纹管理入口 THEN THE App SHALL 显示指纹管理子页面
3. THE 指纹管理页面 SHALL 显示已录入指纹列表，包含：指纹名称、录入时间
4. THE 指纹管理页面 SHALL 显示当前指纹数量与最大容量（如 3/10）
5. THE 指纹管理页面 SHALL 提供添加指纹按钮
6. WHEN 用户点击添加按钮 THEN THE App SHALL 显示添加指纹弹窗
7. THE 添加指纹弹窗 SHALL 包含：指纹名称输入、开始录入按钮
8. WHEN 用户点击开始录入 THEN THE App SHALL 发送 `user_mgmt` 命令（category: finger, command: add）
9. THE App SHALL 显示实时录入状态（等待中、录入中、成功、失败）
10. THE 指纹列表项 SHALL 提供删除操作
11. WHEN 用户确认删除 THEN THE App SHALL 发送 `user_mgmt` 命令（category: finger, command: del）
12. WHEN 服务器返回 `user_mgmt_result` THEN THE App SHALL 更新指纹列表显示

---

### 需求 12：NFC 卡片管理功能

**用户故事：** 作为用户，我希望管理门锁上绑定的 NFC 卡片，以便控制授权卡片的开锁权限。

#### 验收标准

1. THE App SHALL 在设置页面的用户管理分组中提供"NFC 卡片管理"入口
2. WHEN 用户点击 NFC 卡片管理入口 THEN THE App SHALL 显示 NFC 卡片管理子页面
3. THE NFC 卡片管理页面 SHALL 显示已绑定卡片列表，包含：卡片名称、脱敏卡号、绑定时间
4. THE NFC 卡片管理页面 SHALL 显示当前卡片数量与最大容量（如 2/5）
5. THE NFC 卡片管理页面 SHALL 提供添加卡片按钮
6. WHEN 用户点击添加按钮 THEN THE App SHALL 显示添加卡片弹窗
7. THE 添加卡片弹窗 SHALL 包含：卡片名称输入、开始绑定按钮
8. WHEN 用户点击开始绑定 THEN THE App SHALL 发送 `user_mgmt` 命令（category: nfc, command: add）
9. THE App SHALL 显示实时绑定状态（等待中、读取中、成功、失败）
10. THE 卡片列表项 SHALL 提供删除操作
11. WHEN 用户确认删除 THEN THE App SHALL 发送 `user_mgmt` 命令（category: nfc, command: del）
12. WHEN 服务器返回 `user_mgmt_result` THEN THE App SHALL 更新卡片列表显示
13. THE 卡号显示 SHALL 进行脱敏处理（如 ****1234）

---

### 需求 13：密码管理功能

**用户故事：** 作为用户，我希望管理门锁的开锁密码，包括管理员密码和临时密码。

#### 验收标准

1. THE App SHALL 在设置页面的用户管理分组中提供"密码管理"入口
2. WHEN 用户点击密码管理入口 THEN THE App SHALL 显示密码管理子页面
3. THE 密码管理页面 SHALL 显示管理员密码状态（已设置/未设置）
4. THE 密码管理页面 SHALL 提供修改管理员密码按钮
5. WHEN 用户点击修改密码 THEN THE App SHALL 显示修改密码弹窗
6. THE 修改密码弹窗 SHALL 包含：当前密码、新密码、确认密码输入
7. WHEN 用户提交修改 THEN THE App SHALL 发送 `user_mgmt` 命令（category: password, command: set）
8. THE 密码管理页面 SHALL 显示临时密码列表
9. THE 临时密码列表项 SHALL 显示：密码名称、有效期、使用次数
10. THE 密码管理页面 SHALL 提供创建临时密码按钮
11. WHEN 用户点击创建临时密码 THEN THE App SHALL 显示创建弹窗
12. THE 创建弹窗 SHALL 支持选择密码类型：一次性、限时、限次
13. WHEN 用户提交创建 THEN THE App SHALL 发送 `lock_control` 命令（command: temp_code）
14. THE 临时密码列表项 SHALL 提供删除操作
15. WHEN 服务器返回响应 THEN THE App SHALL 更新密码列表显示

---

### 需求 14：历史记录视频附件功能

**用户故事：** 作为用户，我希望查看历史记录关联的监控视频，以便回顾事件发生时的情况。

#### 验收标准

1. THE 开锁记录列表项 SHALL 显示视频附件状态（有视频/无视频）
2. IF 记录有关联视频 THEN THE 列表项 SHALL 显示视频缩略图或播放图标
3. WHEN 用户点击视频区域 THEN THE App SHALL 播放关联的监控视频
4. THE App SHALL 显示视频下载状态（未下载、下载中、已下载）
5. IF 视频未下载 THEN THE App SHALL 显示下载按钮
6. WHEN 用户点击下载 THEN THE App SHALL 发送 `media_download` 命令获取视频
7. THE App SHALL 显示下载进度（百分比和文件大小）
8. WHEN 下载完成 THEN THE App SHALL 将视频保存到本地存储
9. THE App SHALL 在非监控模式下自动下载未缓存的视频
10. THE App SHALL 提供存储管理功能，显示已用空间和清理选项

---

### 需求 15：媒体下载协议实现

**用户故事：** 作为系统，我需要实现媒体文件下载功能，以支持视频附件的获取和存储。

#### 验收标准

1. THE DeviceService SHALL 实现 `media_download` 命令发送
2. THE App SHALL 正确解析 `media_download` 响应，提取文件数据
3. THE App SHALL 支持 Base64 编码的文件内容解码
4. THE App SHALL 实现下载进度追踪
5. THE App SHALL 处理下载失败情况，支持重试
6. THE App SHALL 实现本地文件存储（使用 IndexedDB 或 FileSystem API）
7. THE App SHALL 实现存储配额管理（默认 1GB 上限）
8. THE App SHALL 实现过期文件自动清理（FIFO 策略）

---

### 需求 16：设备状态本地持久化

**用户故事：** 作为用户，我希望在设备离线时仍能查看上次已知的设备状态，以便了解设备最后的运行情况。

#### 验收标准

1. THE App SHALL 使用 IndexedDB 存储设备状态数据
2. WHEN 服务器推送 `status_report` THEN THE App SHALL 将状态保存到本地存储
3. WHEN App 启动时 THEN THE App SHALL 从本地存储加载缓存的设备状态
4. THE 本地存储的状态 SHALL 包含：电量、锁状态、补光灯状态、光照值、最后更新时间
5. WHEN 设备离线 THEN THE Home_Screen SHALL 显示缓存的状态数据并标记为"离线"
6. THE Home_Screen SHALL 显示"上次更新时间"以指示数据的时效性
7. THE DeviceStatusStorageService SHALL 实现单例模式
8. THE DeviceStatusStorageService SHALL 提供 saveStatus、loadStatus、clearStatus 方法

---

### 需求 17：人脸权限更新功能

**用户故事：** 作为用户，我希望修改已录入人员的通行权限，以便灵活控制门锁访问时段和次数。

#### 验收标准

1. THE 人员列表项 SHALL 提供编辑权限按钮
2. WHEN 用户点击编辑按钮 THEN THE App SHALL 显示权限编辑弹窗
3. THE 权限编辑弹窗 SHALL 支持三种权限类型：永久权限、临时权限、限次权限
4. IF 权限类型为永久权限 THEN THE 弹窗 SHALL 显示每日通行时段设置（开始时间、结束时间）
5. IF 权限类型为临时权限 THEN THE 弹窗 SHALL 显示有效期设置（开始日期、结束日期）和每日通行时段
6. IF 权限类型为限次权限 THEN THE 弹窗 SHALL 显示剩余次数设置和每日通行时段
7. WHEN 用户提交权限修改 THEN THE App SHALL 发送 `face_management` 命令（action: update_permission）
8. THE update_permission 命令 SHALL 包含 person_id 和完整的权限数据
9. WHEN 服务器返回成功响应 THEN THE App SHALL 更新人员列表中的权限显示
10. THE Person 接口 SHALL 扩展 permission 字段以支持 permission_type、valid_from、valid_until、remaining_count

