# 实施计划：v2.5协议适配

## 概述

本实施计划将v2.5协议适配功能分解为可执行的编码任务。任务按照"数据层→UI层→集成测试"的顺序组织，确保每个步骤都能增量验证功能。

## 任务列表

- [x] 1. 更新TypeScript类型定义
  - 在types.ts中添加VisitorIntent、PackageAlert、DialogueMessage、PackageCheck接口
  - 添加IntentType、ThreatLevel、ActionType类型别名
  - _需求: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6_

- [x] 2. 升级LocalStorageService数据库
  - [x] 2.1 升级数据库版本到v3
    - 修改DB_VERSION常量为3
    - _需求: 11.1_
  - [x] 2.2 实现数据库升级逻辑
    - 在upgradeDatabase()中添加v2到v3的升级分支
    - 创建visitor_intents ObjectStore（keyPath: id, autoIncrement: true）
    - 创建package_alerts ObjectStore（keyPath: id, autoIncrement: true）
    - 为visitor_intents添加ts和intent_type索引
    - 为package_alerts添加ts和threat_level索引
    - _需求: 11.2, 11.3, 11.4, 11.5, 11.6_
  - [x] 2.3 编写数据库升级单元测试
    - 测试从v2升级到v3
    - 验证ObjectStore和索引创建
    - 测试升级失败降级逻辑
    - _需求: 11.7_

- [x] 3. 实现LocalStorageService CRUD方法
  - [x] 3.1 实现访客意图CRUD方法
    - 实现saveVisitorIntent()方法
    - 实现getVisitorIntents()方法（支持limit参数）
    - 实现deleteVisitorIntent()方法
    - _需求: 12.1, 12.2, 12.5_
  - [x] 3.2 实现快递警报CRUD方法
    - 实现savePackageAlert()方法
    - 实现getPackageAlerts()方法（支持limit参数）
    - 实现deletePackageAlert()方法
    - _需求: 13.1, 13.2, 13.5_
  - [x] 3.3 编写CRUD方法单元测试
    - 测试保存和读取操作
    - 测试数据完整性
    - 测试删除操作
    - _需求: 12.3, 12.4, 13.3, 13.4_

- [x] 4. 扩展LocalStorageService数据清理功能
  - [x] 4.1 更新cleanupExpiredData()方法
    - 添加visitor_intents清理逻辑（30天或1000条）
    - 添加package_alerts清理逻辑（30天或1000条）
    - _需求: 23.1, 23.2, 23.3, 23.4_
  - [x] 4.2 编写数据清理单元测试
    - 测试按时间清理
    - 测试按数量清理
    - 验证清理准确性
    - _需求: 23.1, 23.2, 23.3, 23.4_

- [x] 5. 扩展DeviceService消息处理
  - [x] 5.1 实现visitor_intent_notification消息处理
    - 在handleTextMessage()中添加visitor_intent_notification分支
    - 实现handleVisitorIntentNotification()方法
    - 提取visit_id、session_id、person_info、intent_summary、dialogue_history字段
    - 触发visitor_intent事件
    - 添加错误处理和日志记录
    - _需求: 1.1, 1.2, 1.3, 1.4_
  - [x] 5.2 实现package_check字段提取
    - 在handleVisitorIntentNotification()中检查package_check字段
    - 提取threat_level、action、description字段
    - 触发package_alert事件
    - _需求: 6.1, 6.2, 6.3, 6.5_
  - [x] 5.3 编写消息处理单元测试
    - 测试visitor_intent_notification解析
    - 测试package_check提取
    - 测试事件触发
    - 测试错误处理
    - _需求: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2, 6.3_

- [x] 6. 实现DeviceService查询方法
  - [x] 6.1 实现queryVisitorIntents()方法
    - 构造query消息（type: query, target: visitor_intents）
    - 支持start_date、end_date、limit、offset参数
    - 使用sendCommand()发送查询请求
    - _需求: 5.1, 5.2_
  - [x] 6.2 实现queryPackageAlerts()方法
    - 构造query消息（type: query, target: package_alerts）
    - 支持threat_level、start_date、end_date、limit、offset参数
    - 使用sendCommand()发送查询请求
    - _需求: 10.1, 10.2_
  - [x] 6.3 扩展handleQueryResult()方法
    - 添加visitor_intents target处理分支
    - 添加package_alerts target处理分支
    - 触发对应的查询结果事件
    - _需求: 5.3, 5.4, 10.3, 10.4_
  - [x] 6.4 编写查询方法单元测试
    - 测试查询消息构造
    - 测试查询结果解析
    - 测试事件触发
    - _需求: 5.1, 5.2, 5.3, 5.4, 10.1, 10.2, 10.3, 10.4_

- [x] 7. 检查点 - 数据层完成
  - 确保所有数据层测试通过
  - 验证DeviceService和LocalStorageService功能正常
  - 如有问题，请向用户反馈

- [x] 8. 创建Toast通知组件
  - [x] 8.1 实现Toast组件
    - 创建components/Toast.tsx文件
    - 定义ToastProps接口（message、type、duration、onClose）
    - 实现自动关闭定时器（默认3000ms）
    - 实现手动关闭按钮
    - 使用Tailwind CSS实现样式（顶部居中、渐入渐出动画）
    - 根据type显示不同颜色（info=蓝色、warning=橙色、error=红色）
    - _需求: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_
  - [x] 8.2 编写Toast组件测试
    - 测试自动关闭功能
    - 测试手动关闭功能
    - 测试不同type的样式
    - _需求: 2.3, 2.4_

- [x] 9. 创建意图类型标签组件
  - [x] 9.1 实现IntentTypeBadge组件
    - 创建components/IntentTypeBadge.tsx文件
    - 定义IntentTypeBadgeProps接口
    - 实现样式映射（delivery=蓝色、visit=绿色、sales=橙色、maintenance=紫色、other=灰色）
    - 实现图标映射（使用lucide-react图标）
    - _需求: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_
  - [x] 9.2 编写IntentTypeBadge组件测试
    - 测试不同type的样式和图标
    - 测试无效type的处理
    - _需求: 14.2, 14.3, 14.4, 14.5, 14.6_

- [x] 10. 创建威胁等级标识组件
  - [x] 10.1 实现ThreatLevelBadge组件
    - 创建components/ThreatLevelBadge.tsx文件
    - 定义ThreatLevelBadgeProps接口
    - 实现样式映射（low=绿色、medium=橙色、high=红色）
    - 实现图标映射（Shield、AlertTriangle、AlertOctagon）
    - 实现文本映射（低威胁、中威胁、高威胁）
    - _需求: 15.1, 15.2, 15.3, 15.4, 15.5_
  - [x] 10.2 编写ThreatLevelBadge组件测试
    - 测试不同level的样式和图标
    - 测试无效level的处理
    - _需求: 15.2, 15.3, 15.4, 15.5_

- [x] 11. 创建聊天气泡组件
  - [x] 11.1 实现ChatBubble组件
    - 创建components/ChatBubble.tsx文件
    - 定义ChatBubbleProps接口（role、content、timestamp）
    - 实现左右对齐逻辑（assistant=左对齐、user=右对齐）
    - 实现背景颜色（assistant=灰色、user=蓝色）
    - 实现文本自动换行
    - 实现可选时间戳显示
    - _需求: 16.1, 16.2, 16.3, 16.4, 16.5_
  - [x] 11.2 编写ChatBubble组件测试
    - 测试不同role的对齐和颜色
    - 测试长文本换行
    - 测试时间戳显示
    - _需求: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 12. 创建访客意图卡片组件
  - [x] 12.1 实现VisitorIntentCard组件
    - 创建components/VisitorIntentCard.tsx文件
    - 定义VisitorIntentCardProps接口
    - 实现卡片标题和布局
    - 显示最近5条记录（使用slice(0, 5)）
    - 每条记录包含IntentTypeBadge、简要总结、时间戳
    - 实现"查看详情"按钮和点击事件
    - 实现空状态提示
    - _需求: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 12.2 编写VisitorIntentCard组件测试
    - 测试数量限制（最多5条）
    - 测试空状态显示
    - 测试点击事件
    - _需求: 3.2, 3.3, 3.4, 3.5_

- [x] 13. 创建快递警报卡片组件
  - [x] 13.1 实现PackageAlertCard组件
    - 创建components/PackageAlertCard.tsx文件
    - 定义PackageAlertCardProps接口
    - 实现卡片标题和布局
    - 显示最近5条记录
    - 每条记录包含ThreatLevelBadge、行为类型、缩略图、时间戳
    - 实现"查看全部"按钮和点击事件
    - 实现空状态提示
    - _需求: 8.1, 8.2, 8.3, 8.4, 8.5_
  - [x] 13.2 编写PackageAlertCard组件测试
    - 测试数量限制（最多5条）
    - 测试空状态显示
    - 测试点击事件
    - _需求: 8.2, 8.3, 8.4, 8.5_

- [x] 14. 创建访客意图详情页
  - [x] 14.1 实现VisitorIntentScreen组件
    - 创建screens/VisitorIntentScreen.tsx文件
    - 定义VisitorIntentScreenProps接口
    - 实现顶部信息栏（访客姓名、时间、意图类型）
    - 实现AI分析摘要卡片（summary、ai_analysis）
    - 实现重要信息列表（important_notes）
    - 实现对话历史区域（使用ChatBubble组件）
    - 实现返回按钮
    - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.8_
  - [x] 14.2 实现虚拟滚动优化
    - 安装react-window库（如果未安装）
    - 当对话历史超过50条时启用虚拟滚动
    - 配置FixedSizeList或VariableSizeList
    - 少于50条使用普通渲染
    - _需求: 4.7, 19.1, 19.5_
  - [x] 14.3 编写VisitorIntentScreen组件测试
    - 测试各部分渲染
    - 测试虚拟滚动触发条件
    - 测试返回按钮
    - _需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 15. 创建快递警报详情页
  - [x] 15.1 实现PackageAlertScreen组件
    - 创建screens/PackageAlertScreen.tsx文件
    - 定义PackageAlertScreenProps接口
    - 实现顶部信息栏（时间、威胁等级）
    - 实现威胁等级筛选器（全部、低威胁、中威胁、高威胁）
    - 实现警报列表（分页显示）
    - 实现行为分析卡片
    - 实现语音警告状态显示
    - 实现返回按钮
    - _需求: 9.1, 9.2, 9.6, 9.7, 9.8, 9.9_
  - [x] 15.2 实现照片懒加载
    - 创建LazyImage组件
    - 使用IntersectionObserver API
    - 实现占位符显示
    - 实现加载动画
    - 实现错误处理和重试按钮
    - 配置rootMargin为50px（提前加载）
    - _需求: 9.3, 9.4, 9.5, 20.1, 20.2, 20.3, 20.4, 20.5_
  - [x] 15.3 编写PackageAlertScreen组件测试
    - 测试筛选功能
    - 测试分页加载
    - 测试照片懒加载
    - 测试返回按钮
    - _需求: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

- [x] 16. 检查点 - UI组件完成
  - 确保所有UI组件正常渲染
  - 验证组件样式符合设计规范
  - 如有问题，请向用户反馈

- [x] 17. 扩展App.tsx状态管理
  - [x] 17.1 添加新的全局状态
    - 添加visitorIntents状态（useState<VisitorIntent[]>）
    - 添加packageAlerts状态（useState<PackageAlert[]>）
    - 添加toastMessage状态（useState<string | null>）
    - 添加toastType状态（useState<'info' | 'warning' | 'error'>）
    - _需求: 2.1, 2.2, 7.1, 7.2_
  - [x] 17.2 订阅访客意图事件
    - 使用deviceService.on('visitor_intent')订阅事件
    - 更新visitorIntents状态（保留最近100条）
    - 显示Toast通知（包含访客姓名和简要总结）
    - 调用localStorageService.saveVisitorIntent()保存数据
    - _需求: 1.5, 2.1, 2.2, 12.1_
  - [x] 17.3 订阅快递警报事件
    - 使用deviceService.on('package_alert')订阅事件
    - 更新packageAlerts状态（保留最近100条）
    - 中威胁及以上显示Toast通知（橙色或红色）
    - 调用localStorageService.savePackageAlert()保存数据
    - _需求: 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 13.1_
  - [x] 17.4 订阅查询结果事件
    - 订阅visitor_intents_query_result事件
    - 订阅package_alerts_query_result事件
    - 实现数据合并去重逻辑（按session_id或ts）
    - 更新状态并保存到IndexedDB
    - _需求: 5.4, 10.4, 18.1, 18.2, 18.3, 18.4_
  - [x] 17.5 实现数据加载逻辑
    - 在useEffect中从IndexedDB加载缓存数据
    - 切换到首页时触发查询（queryVisitorIntents、queryPackageAlerts）
    - 实现查询错误处理和重试逻辑
    - _需求: 18.1, 18.2, 18.3, 18.4, 18.5, 22.3_

- [x] 18. 更新HomeScreen组件
  - [x] 18.1 集成访客意图卡片
    - 在HomeScreen中引入VisitorIntentCard组件
    - 传递visitorIntents状态（最近5条）
    - 实现onViewDetail回调（切换到详情页）
    - _需求: 3.1, 3.2, 3.3, 3.5_
  - [x] 18.2 集成快递警报卡片
    - 在HomeScreen中引入PackageAlertCard组件
    - 传递packageAlerts状态（最近5条）
    - 实现onViewAll回调（切换到详情页）
    - _需求: 8.1, 8.2, 8.3, 8.5_
  - [x] 18.3 调整布局
    - 将新卡片放置在现有卡片下方
    - 确保移动端布局合理
    - 使用Tailwind CSS调整间距和对齐

- [x] 19. 实现页面路由扩展
  - [x] 19.1 扩展Tab类型
    - 在types.ts中扩展Tab类型（添加visitor_intent_detail、package_alert_detail）
    - 或使用独立的SubScreen类型
    - _需求: 4.8, 9.9_
  - [x] 19.2 在App.tsx中实现路由逻辑
    - 添加currentSubScreen状态
    - 添加selectedIntent状态（用于详情页）
    - 实现页面切换逻辑
    - 实现返回按钮处理
    - _需求: 3.5, 4.8, 8.5, 9.9_

- [x] 20. 实现Toast通知管理
  - [x] 20.1 在App.tsx中渲染Toast组件
    - 根据toastMessage状态条件渲染Toast
    - 传递toastType和duration参数
    - 实现onClose回调（清空toastMessage）
    - _需求: 2.1, 2.2, 2.3, 2.4_
  - [x] 20.2 实现Toast队列管理（可选）
    - 如果需要支持多个Toast同时显示
    - 实现队列逻辑（按时间顺序依次显示）
    - _需求: 2.5_

- [x] 21. 检查点 - 集成完成
  - 确保所有组件正确集成到App.tsx
  - 验证数据流正常（推送→状态→UI→IndexedDB）
  - 测试页面切换和导航
  - 如有问题，请向用户反馈

- [x] 22. 编写属性测试
  - [x] 22.1 编写消息解析属性测试
    - **属性 1: 访客意图消息解析完整性**
    - **验证需求: 1.1, 1.2**
    - 使用fast-check生成随机visitor_intent_notification消息
    - 验证解析后包含所有必需字段
  - [x] 22.2 编写数据持久化属性测试
    - **属性 6: 访客意图持久化完整性**
    - **验证需求: 1.5, 12.1, 12.2**
    - 使用fast-check生成随机VisitorIntent对象
    - 验证保存后读取的数据深度相等
  - [x] 22.3 编写查询属性测试
    - **属性 9: 查询消息构造正确性**
    - **验证需求: 5.1, 5.2**
    - 使用fast-check生成随机查询参数
    - 验证构造的query消息符合协议规范
  - [x] 22.4 编写UI组件属性测试
    - **属性 12: Toast自动关闭时间准确性**
    - **验证需求: 2.3**
    - 使用fast-check生成随机duration参数
    - 验证Toast在指定时间后关闭（误差<100ms）
  - [x] 22.5 编写数据清理属性测试
    - **属性 19: 按时间清理准确性**
    - **验证需求: 23.3, 23.4**
    - 使用fast-check生成随机maxAgeDays参数
    - 验证清理逻辑的准确性

- [x] 23. 编写集成测试
  - [x] 23.1 编写完整数据流集成测试
    - 测试从消息接收到UI显示的完整流程
    - 测试从推送到IndexedDB保存的完整流程
    - 测试查询和数据合并逻辑
  - [x] 23.2 编写错误场景集成测试
    - 测试消息解析错误处理
    - 测试IndexedDB写入失败降级
    - 测试查询超时重试
    - 测试照片加载失败降级

- [x] 24. 性能优化和验证
  - [x] 24.1 验证虚拟滚动性能
    - 准备100+条对话历史测试数据
    - 验证渲染时间<100ms
    - 验证滚动帧率>50 FPS
    - _需求: 19.4_
  - [x] 24.2 验证照片懒加载性能
    - 准备多张测试照片
    - 验证未进入视口时不加载
    - 验证进入视口后200ms内开始加载
    - _需求: 20.1, 20.2, 20.3_
  - [x] 24.3 验证IndexedDB性能
    - 测试批量保存操作耗时
    - 测试查询操作耗时
    - 确保操作耗时<1000ms

- [x] 25. 错误处理和降级测试
  - [x] 25.1 测试数据库升级失败降级
    - 模拟数据库升级失败场景
    - 验证降级到内存模式
    - 验证基本功能不受影响
    - _需求: 11.7, 22.5_
  - [x] 25.2 测试存储空间不足处理
    - 模拟QuotaExceededError
    - 验证自动清理和重试逻辑
    - 验证错误提示显示
    - _需求: 22.2_
  - [x] 25.3 测试网络错误处理
    - 模拟查询超时场景
    - 验证错误提示和重试按钮
    - 验证使用缓存数据降级
    - _需求: 22.3, 5.5, 10.5_
  - [x] 25.4 测试照片加载失败处理
    - 模拟照片加载失败场景
    - 验证错误占位符显示
    - 验证重试按钮功能
    - _需求: 22.4, 20.5_

- [x] 26. 最终检查点 - 功能验收
  - 确保所有测试通过（单元测试、属性测试、集成测试）
  - 验证所有需求都已实现
  - 手动测试完整用户流程
  - 检查代码质量（无TypeScript错误、无ESLint警告）
  - 验证性能指标达标
  - 如有问题，请向用户反馈

## 注意事项

1. **任务标记说明：**
   - `[ ]`: 必须实现的任务
   - 所有任务均为必选，包括测试任务

2. **测试策略：**
   - 单元测试覆盖关键逻辑（DeviceService、LocalStorageService）
   - 属性测试验证通用正确性（使用fast-check）
   - 集成测试验证完整数据流
   - 手动测试验证用户体验

3. **开发顺序：**
   - 优先完成数据层（任务1-7）
   - 然后完成UI层（任务8-16）
   - 最后完成集成和测试（任务17-26）

4. **依赖关系：**
   - 任务2依赖任务1（类型定义）
   - 任务5依赖任务1（类型定义）
   - 任务8-15依赖任务1（类型定义）
   - 任务17依赖任务2-6（数据层）和任务8-15（UI层）

5. **性能要求：**
   - 虚拟滚动：100条对话渲染<100ms，滚动帧率>50 FPS
   - 照片懒加载：进入视口后200ms内开始加载
   - IndexedDB操作：单次操作<1000ms

6. **错误处理：**
   - 所有异步操作都应有try-catch
   - 所有错误都应记录日志
   - 关键错误应显示用户友好的提示
   - 提供降级方案（内存存储、缓存数据）
