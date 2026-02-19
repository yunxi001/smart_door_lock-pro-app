# 需求文档：v2.5协议适配

## 简介

本文档定义了智能门锁Pro从协议v2.4升级到v2.5的功能需求。v2.5协议引入了两大AI功能：访客意图识别和快递看护警报。这些功能将显著提升用户的安全感和智能化体验。

## 术语表

- **App**: 智能门锁Pro Web应用程序
- **Server**: 智能门锁服务器，负责WebSocket通信和数据存储
- **ESP32**: 智能门锁硬件设备
- **DeviceService**: App中负责WebSocket通信的服务单例
- **LocalStorageService**: App中负责IndexedDB数据持久化的服务
- **Toast**: 顶部弹出的临时通知消息
- **IndexedDB**: 浏览器本地数据库
- **访客意图**: 通过AI分析访客对话得出的访问目的分类
- **快递看护**: 通过AI视觉分析检测快递包裹的异常行为
- **威胁等级**: 快递异常行为的严重程度分类（低/中/高）
- **对话历史**: 访客与门锁AI助手的完整对话记录
- **虚拟滚动**: 仅渲染可见区域内容的性能优化技术
- **懒加载**: 延迟加载图片直到进入视口的性能优化技术

## 需求

### 需求 1: 访客意图推送消息接收

**用户故事**: 作为用户，我希望App能接收并处理访客意图通知消息，以便了解访客的来访目的。

#### 验收标准

1. WHEN Server推送`visitor_intent_notification`消息 THEN THE DeviceService SHALL正确解析消息内容
2. WHEN 接收到访客意图消息 THEN THE DeviceService SHALL提取visit_id、session_id、person_info、intent_summary、dialogue_history和package_check字段
3. WHEN 消息解析成功 THEN THE DeviceService SHALL触发`visitor_intent`事件
4. WHEN 消息格式不正确 THEN THE DeviceService SHALL记录错误日志并跳过该消息
5. WHEN 接收到访客意图消息 THEN THE App SHALL将数据保存到IndexedDB的visitor_intents表

### 需求 2: 访客意图Toast通知

**用户故事**: 作为用户，我希望收到新访客意图时能看到即时通知，以便快速了解访客情况。

#### 验收标准

1. WHEN 接收到新的访客意图消息 THEN THE App SHALL在屏幕顶部显示Toast通知
2. WHEN 显示Toast通知 THEN THE Toast SHALL包含访客姓名和意图类型
3. WHEN Toast显示后 THEN THE Toast SHALL在3秒后自动消失
4. WHEN 用户点击Toast关闭按钮 THEN THE Toast SHALL立即消失
5. WHEN 多个Toast同时触发 THEN THE App SHALL按时间顺序依次显示

### 需求 3: 首页访客意图卡片展示

**用户故事**: 作为用户，我希望在首页看到最近的访客意图记录，以便快速浏览访客情况。

#### 验收标准

1. WHEN 用户打开首页 THEN THE HomeScreen SHALL显示访客意图卡片
2. WHEN 显示访客意图卡片 THEN THE 卡片 SHALL展示最近5条记录
3. WHEN 显示每条记录 THEN THE 记录 SHALL包含意图类型标签、简要总结和时间戳
4. WHEN 没有访客意图记录 THEN THE 卡片 SHALL显示空状态提示
5. WHEN 用户点击"查看详情"按钮 THEN THE App SHALL跳转到访客意图详情页

### 需求 4: 访客意图详情页

**用户故事**: 作为用户，我希望查看访客意图的完整详情，包括对话历史和AI分析，以便全面了解访客情况。

#### 验收标准

1. WHEN 用户进入访客意图详情页 THEN THE VisitorIntentScreen SHALL显示顶部信息栏
2. WHEN 显示顶部信息栏 THEN THE 信息栏 SHALL包含访客姓名、时间和意图类型
3. WHEN 显示详情页 THEN THE 页面 SHALL展示AI分析摘要卡片
4. WHEN 显示AI分析摘要 THEN THE 摘要 SHALL包含intent_summary中的summary和ai_analysis字段
5. WHEN intent_summary包含important_notes THEN THE 页面 SHALL高亮显示重要信息列表
6. WHEN 显示对话历史 THEN THE 页面 SHALL使用聊天气泡样式展示dialogue_history
7. WHEN 对话历史超过50条 THEN THE 页面 SHALL使用虚拟滚动优化性能
8. WHEN 用户点击返回按钮 THEN THE App SHALL返回首页

### 需求 5: 访客意图历史查询

**用户故事**: 作为用户，我希望查询历史访客意图记录，以便追溯过往访客情况。

#### 验收标准

1. WHEN 用户请求查询访客意图历史 THEN THE DeviceService SHALL发送query消息，target为visitor_intents
2. WHEN 发送查询请求 THEN THE 请求 SHALL包含start_date、end_date、limit和offset参数
3. WHEN Server返回查询结果 THEN THE DeviceService SHALL解析query_result消息
4. WHEN 查询成功 THEN THE DeviceService SHALL触发visitor_intents_query_result事件
5. WHEN 查询失败 THEN THE App SHALL显示错误提示和重试按钮

### 需求 6: 快递警报推送消息接收

**用户故事**: 作为用户，我希望App能接收并处理快递异常警报消息，以便及时了解快递安全状况。

#### 验收标准

1. WHEN Server推送visitor_intent_notification消息且包含package_check字段 THEN THE DeviceService SHALL提取快递警报信息
2. WHEN 提取快递警报信息 THEN THE DeviceService SHALL解析threat_level、action和description字段
3. WHEN 快递警报解析成功 THEN THE DeviceService SHALL触发package_alert事件
4. WHEN 接收到快递警报消息 THEN THE App SHALL将数据保存到IndexedDB的package_alerts表
5. WHEN package_check字段不存在 THEN THE DeviceService SHALL跳过快递警报处理

### 需求 7: 快递警报Toast通知

**用户故事**: 作为用户，我希望收到快递异常警报时能看到醒目通知，以便及时采取行动。

#### 验收标准

1. WHEN 接收到威胁等级为medium的快递警报 THEN THE App SHALL显示橙色Toast通知
2. WHEN 接收到威胁等级为high的快递警报 THEN THE App SHALL显示红色Toast通知
3. WHEN 接收到威胁等级为low的快递警报 THEN THE App SHALL不显示Toast通知
4. WHEN 显示快递警报Toast THEN THE Toast SHALL包含威胁等级和行为类型
5. WHEN Toast显示后 THEN THE Toast SHALL在5秒后自动消失

### 需求 8: 首页快递警报卡片展示

**用户故事**: 作为用户，我希望在首页看到最近的快递警报记录，以便快速了解快递安全状况。

#### 验收标准

1. WHEN 用户打开首页 THEN THE HomeScreen SHALL显示快递警报卡片
2. WHEN 显示快递警报卡片 THEN THE 卡片 SHALL展示最近5条记录
3. WHEN 显示每条警报记录 THEN THE 记录 SHALL包含威胁等级标识、行为类型、缩略图和时间戳
4. WHEN 没有快递警报记录 THEN THE 卡片 SHALL显示空状态提示
5. WHEN 用户点击"查看全部"按钮 THEN THE App SHALL跳转到快递警报详情页

### 需求 9: 快递警报详情页

**用户故事**: 作为用户，我希望查看快递警报的完整详情，包括照片和行为分析，以便评估快递安全状况。

#### 验收标准

1. WHEN 用户进入快递警报详情页 THEN THE PackageAlertScreen SHALL显示顶部信息栏
2. WHEN 显示顶部信息栏 THEN THE 信息栏 SHALL包含时间和威胁等级标识
3. WHEN 显示详情页 THEN THE 页面 SHALL展示警报照片
4. WHEN 警报照片未进入视口 THEN THE 页面 SHALL不加载照片
5. WHEN 警报照片进入视口 THEN THE 页面 SHALL在200毫秒内开始加载照片
6. WHEN 显示详情页 THEN THE 页面 SHALL展示行为分析卡片
7. WHEN 显示行为分析 THEN THE 卡片 SHALL包含action和description字段
8. WHEN 显示详情页 THEN THE 页面 SHALL展示语音警告状态
9. WHEN 用户点击返回按钮 THEN THE App SHALL返回首页

### 需求 10: 快递警报历史查询

**用户故事**: 作为用户，我希望查询历史快递警报记录，以便追溯快递安全事件。

#### 验收标准

1. WHEN 用户请求查询快递警报历史 THEN THE DeviceService SHALL发送query消息，target为package_alerts
2. WHEN 发送查询请求 THEN THE 请求 SHALL包含threat_level、start_date、end_date、limit和offset参数
3. WHEN Server返回查询结果 THEN THE DeviceService SHALL解析query_result消息
4. WHEN 查询成功 THEN THE DeviceService SHALL触发package_alerts_query_result事件
5. WHEN 查询失败 THEN THE App SHALL显示错误提示和重试按钮

### 需求 11: IndexedDB数据库升级

**用户故事**: 作为开发者，我希望升级IndexedDB数据库结构，以便支持新的访客意图和快递警报数据存储。

#### 验收标准

1. WHEN App初始化LocalStorageService THEN THE 服务 SHALL检测数据库版本
2. WHEN 数据库版本低于3 THEN THE 服务 SHALL执行升级操作
3. WHEN 执行数据库升级 THEN THE 服务 SHALL创建visitor_intents ObjectStore
4. WHEN 执行数据库升级 THEN THE 服务 SHALL创建package_alerts ObjectStore
5. WHEN 创建visitor_intents表 THEN THE 服务 SHALL添加ts和intent_type索引
6. WHEN 创建package_alerts表 THEN THE 服务 SHALL添加ts和threat_level索引
7. WHEN 数据库升级失败 THEN THE 服务 SHALL记录错误日志并使用内存存储降级

### 需求 12: 访客意图数据持久化

**用户故事**: 作为用户，我希望访客意图数据能持久化保存，以便刷新页面后仍能查看历史记录。

#### 验收标准

1. WHEN 接收到新的访客意图消息 THEN THE LocalStorageService SHALL保存数据到visitor_intents表
2. WHEN 保存访客意图数据 THEN THE 服务 SHALL存储完整的VisitorIntent对象
3. WHEN App启动时 THEN THE LocalStorageService SHALL从visitor_intents表加载最近100条记录
4. WHEN 查询访客意图数据 THEN THE 服务 SHALL按时间戳降序返回结果
5. WHEN 删除访客意图记录 THEN THE 服务 SHALL从visitor_intents表移除指定记录

### 需求 13: 快递警报数据持久化

**用户故事**: 作为用户，我希望快递警报数据能持久化保存，以便刷新页面后仍能查看历史记录。

#### 验收标准

1. WHEN 接收到新的快递警报消息 THEN THE LocalStorageService SHALL保存数据到package_alerts表
2. WHEN 保存快递警报数据 THEN THE 服务 SHALL存储完整的PackageAlert对象
3. WHEN App启动时 THEN THE LocalStorageService SHALL从package_alerts表加载最近100条记录
4. WHEN 查询快递警报数据 THEN THE 服务 SHALL按时间戳降序返回结果
5. WHEN 删除快递警报记录 THEN THE 服务 SHALL从package_alerts表移除指定记录

### 需求 14: 意图类型标签组件

**用户故事**: 作为开发者，我希望有一个可复用的意图类型标签组件，以便在多个页面统一展示意图类型。

#### 验收标准

1. WHEN 渲染IntentTypeBadge组件 THEN THE 组件 SHALL根据intent_type显示对应的图标和文字
2. WHEN intent_type为delivery THEN THE 组件 SHALL显示蓝色标签和快递图标
3. WHEN intent_type为visit THEN THE 组件 SHALL显示绿色标签和拜访图标
4. WHEN intent_type为sales THEN THE 组件 SHALL显示橙色标签和推销图标
5. WHEN intent_type为maintenance THEN THE 组件 SHALL显示紫色标签和维修图标
6. WHEN intent_type为other THEN THE 组件 SHALL显示灰色标签和其他图标

### 需求 15: 威胁等级标识组件

**用户故事**: 作为开发者，我希望有一个可复用的威胁等级标识组件，以便在多个页面统一展示威胁等级。

#### 验收标准

1. WHEN 渲染ThreatLevelBadge组件 THEN THE 组件 SHALL根据threat_level显示对应的颜色和图标
2. WHEN threat_level为low THEN THE 组件 SHALL显示绿色标识和安全图标
3. WHEN threat_level为medium THEN THE 组件 SHALL显示橙色标识和警告图标
4. WHEN threat_level为high THEN THE 组件 SHALL显示红色标识和危险图标
5. WHEN 组件接收到无效的threat_level THEN THE 组件 SHALL显示灰色标识和未知图标

### 需求 16: 聊天气泡组件

**用户故事**: 作为开发者，我希望有一个可复用的聊天气泡组件，以便展示对话历史和未来的对讲功能。

#### 验收标准

1. WHEN 渲染ChatBubble组件且role为assistant THEN THE 组件 SHALL左对齐显示气泡
2. WHEN 渲染ChatBubble组件且role为user THEN THE 组件 SHALL右对齐显示气泡
3. WHEN 显示聊天气泡 THEN THE 组件 SHALL展示content文本内容
4. WHEN content文本过长 THEN THE 组件 SHALL自动换行
5. WHEN 组件接收到timestamp参数 THEN THE 组件 SHALL在气泡下方显示时间戳

### 需求 17: Toast通知组件

**用户故事**: 作为开发者，我希望有一个可复用的Toast通知组件，以便在多个场景统一展示临时通知。

#### 验收标准

1. WHEN 渲染Toast组件 THEN THE 组件 SHALL在屏幕顶部居中显示
2. WHEN Toast显示后 THEN THE 组件 SHALL在duration毫秒后自动调用onClose回调
3. WHEN 用户点击关闭按钮 THEN THE 组件 SHALL立即调用onClose回调
4. WHEN Toast组件接收到type为warning THEN THE 组件 SHALL显示橙色背景
5. WHEN Toast组件接收到type为error THEN THE 组件 SHALL显示红色背景
6. WHEN Toast组件接收到type为info THEN THE 组件 SHALL显示蓝色背景

### 需求 18: 数据混合更新策略

**用户故事**: 作为用户，我希望App能智能地更新数据，既能接收实时推送，又能在切换页面时查询最新数据。

#### 验收标准

1. WHEN 接收到实时推送消息 THEN THE App SHALL立即更新内存状态并保存到IndexedDB
2. WHEN 用户切换到首页 THEN THE App SHALL查询最近5条访客意图和快递警报
3. WHEN 查询返回的数据已存在于内存中 THEN THE App SHALL合并数据去重
4. WHEN 查询返回新数据 THEN THE App SHALL更新内存状态并保存到IndexedDB
5. WHEN 网络断开时 THEN THE App SHALL仅使用IndexedDB缓存数据

### 需求 19: 虚拟滚动性能优化

**用户故事**: 作为用户，我希望查看长对话历史时页面保持流畅，不会出现卡顿。

#### 验收标准

1. WHEN 对话历史超过50条 THEN THE VisitorIntentScreen SHALL使用虚拟滚动渲染
2. WHEN 使用虚拟滚动 THEN THE 页面 SHALL仅渲染可见区域的对话气泡
3. WHEN 用户滚动对话历史 THEN THE 页面 SHALL动态加载和卸载对话气泡
4. WHEN 渲染100条对话历史 THEN THE 页面 SHALL保持帧率高于50 FPS
5. WHEN 对话历史少于50条 THEN THE 页面 SHALL使用普通渲染

### 需求 20: 照片懒加载优化

**用户故事**: 作为用户，我希望快递警报照片能按需加载，以便节省流量和提升页面加载速度。

#### 验收标准

1. WHEN 警报照片未进入视口 THEN THE PackageAlertScreen SHALL显示占位符
2. WHEN 警报照片进入视口 THEN THE 页面 SHALL使用IntersectionObserver触发加载
3. WHEN 触发照片加载 THEN THE 页面 SHALL在200毫秒内开始请求图片
4. WHEN 照片加载中 THEN THE 页面 SHALL显示加载动画
5. WHEN 照片加载失败 THEN THE 页面 SHALL显示错误占位符和重试按钮

### 需求 21: TypeScript类型定义

**用户故事**: 作为开发者，我希望有完整的TypeScript类型定义，以便在开发时获得类型安全和代码提示。

#### 验收标准

1. WHEN 定义VisitorIntent接口 THEN THE 接口 SHALL包含id、visit_id、session_id、person_id、person_name、relation_type、intent_type、intent_summary、dialogue_history、package_check、created_at和ts字段
2. WHEN 定义PackageAlert接口 THEN THE 接口 SHALL包含id、device_id、session_id、threat_level、action、description、photo_path、photo_thumbnail、voice_warning_sent、notified、created_at和ts字段
3. WHEN 定义DialogueMessage接口 THEN THE 接口 SHALL包含role和content字段
4. WHEN 定义PackageCheck接口 THEN THE 接口 SHALL包含threat_level、action和description字段
5. WHEN 定义IntentType枚举 THEN THE 枚举 SHALL包含delivery、visit、sales、maintenance和other值
6. WHEN 定义ThreatLevel枚举 THEN THE 枚举 SHALL包含low、medium和high值

### 需求 22: 错误处理和降级策略

**用户故事**: 作为用户，我希望在网络异常或数据错误时，App能提供友好的错误提示和降级方案。

#### 验收标准

1. WHEN 消息解析失败 THEN THE DeviceService SHALL记录错误日志并跳过该消息
2. WHEN IndexedDB写入失败 THEN THE LocalStorageService SHALL记录错误并使用内存存储
3. WHEN 查询请求超时 THEN THE App SHALL显示超时提示和重试按钮
4. WHEN 照片加载失败 THEN THE 页面 SHALL显示错误占位符和重试按钮
5. WHEN 数据库升级失败 THEN THE LocalStorageService SHALL降级到内存存储并提示用户

### 需求 23: 数据清理策略

**用户故事**: 作为用户，我希望App能自动清理过期数据，以便避免存储空间不足。

#### 验收标准

1. WHEN IndexedDB中访客意图记录超过1000条 THEN THE LocalStorageService SHALL删除最旧的记录
2. WHEN IndexedDB中快递警报记录超过1000条 THEN THE LocalStorageService SHALL删除最旧的记录
3. WHEN 访客意图记录超过30天 THEN THE LocalStorageService SHALL在App启动时删除过期记录
4. WHEN 快递警报记录超过30天 THEN THE LocalStorageService SHALL在App启动时删除过期记录
5. WHEN 用户手动清除数据 THEN THE App SHALL删除所有访客意图和快递警报记录

### 需求 24: 单元测试覆盖

**用户故事**: 作为开发者，我希望关键逻辑有完整的单元测试覆盖，以便确保代码质量和可维护性。

#### 验收标准

1. WHEN 测试DeviceService消息处理 THEN THE 测试 SHALL覆盖visitor_intent_notification和package_alert消息解析
2. WHEN 测试LocalStorageService数据库升级 THEN THE 测试 SHALL验证visitor_intents和package_alerts表创建
3. WHEN 测试LocalStorageService CRUD操作 THEN THE 测试 SHALL覆盖保存、查询和删除功能
4. WHEN 测试查询方法 THEN THE 测试 SHALL验证query消息构造和query_result解析
5. WHEN 运行所有单元测试 THEN THE 测试覆盖率 SHALL高于80%
