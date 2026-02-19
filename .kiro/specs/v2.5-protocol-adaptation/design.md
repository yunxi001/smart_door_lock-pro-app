# 设计文档：v2.5协议适配

## 概述

本设计文档描述了智能门锁Pro从协议v2.4升级到v2.5的技术实现方案。v2.5协议引入了两大AI功能：访客意图识别和快递看护警报。本次升级将完整支持这些新功能，包括数据接收、存储、查询和UI展示。

### 设计目标

1. 完整实现v2.5协议的新增消息类型和查询接口
2. 提供流畅的用户体验，包括实时通知、历史查询和详情展示
3. 确保数据持久化和性能优化
4. 保持代码可维护性和可测试性

### 技术约束

- 严格遵循v2.5协议规范
- 使用现有的DeviceService事件驱动架构
- 使用IndexedDB进行本地数据持久化
- 使用React Hooks和函数式组件
- 仅使用Tailwind CSS进行样式设计
- 所有UI文本使用中文

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  全局状态管理                                         │   │
│  │  - visitorIntents: VisitorIntent[]                   │   │
│  │  - packageAlerts: PackageAlert[]                     │   │
│  │  - toastMessage: string | null                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  事件订阅                                             │   │
│  │  - deviceService.on('visitor_intent')                │   │
│  │  - deviceService.on('package_alert')                 │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    DeviceService                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  handleTextMessage()                                  │   │
│  │  ├─ visitor_intent_notification → emit('visitor_intent')│
│  │  └─ package_check → emit('package_alert')            │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  查询方法                                             │   │
│  │  - queryVisitorIntents(params)                       │   │
│  │  - queryPackageAlerts(params)                        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                 LocalStorageService                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  IndexedDB v3                                         │   │
│  │  - visitor_intents (id, ts, intent_type)             │   │
│  │  - package_alerts (id, ts, threat_level)             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 数据流设计

#### 实时推送流程

```
Server推送消息
    ↓
DeviceService.handleTextMessage()
    ↓
解析visitor_intent_notification
    ↓
提取package_check (如果存在)
    ↓
emit('visitor_intent') + emit('package_alert')
    ↓
App.tsx订阅事件
    ↓
├─ 更新状态 (visitorIntents / packageAlerts)
├─ 显示Toast通知
└─ 保存到IndexedDB
    ↓
HomeScreen读取最近5条
```

#### 查询流程

```
用户切换到首页
    ↓
App.tsx触发查询
    ↓
DeviceService.queryVisitorIntents()
    ↓
发送query消息 (target: visitor_intents)
    ↓
Server返回query_result
    ↓
DeviceService.handleQueryResult()
    ↓
emit('visitor_intents_query_result')
    ↓
App.tsx合并数据去重
    ↓
更新状态 + 保存到IndexedDB
```

## 组件设计

### 数据层组件

#### DeviceService扩展

**新增方法：**

```typescript
// 查询访客意图历史
public queryVisitorIntents(params: {
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}): string | null

// 查询快递警报历史
public queryPackageAlerts(params: {
  threat_level?: 'low' | 'medium' | 'high';
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}): string | null
```

**消息处理扩展：**

在`handleTextMessage()`中添加新的消息类型分支：

```typescript
else if (msg.type === 'visitor_intent_notification') {
  this.handleVisitorIntentNotification(msg);
}
```

**新增处理方法：**

```typescript
private handleVisitorIntentNotification(msg: any) {
  // 1. 提取访客意图数据
  const visitorIntent = {
    visit_id: msg.visit_id,
    session_id: msg.session_id,
    person_info: msg.person_info,
    intent_summary: msg.intent_summary,
    dialogue_history: msg.dialogue_history,
    ts: msg.ts
  };

  // 2. 触发访客意图事件
  this.emit('visitor_intent', visitorIntent);

  // 3. 如果包含package_check，提取快递警报数据
  if (msg.package_check) {
    const packageAlert = {
      session_id: msg.session_id,
      threat_level: msg.package_check.threat_level,
      action: msg.package_check.action,
      description: msg.package_check.description,
      ts: msg.ts
    };

    // 4. 触发快递警报事件
    this.emit('package_alert', packageAlert);
  }
}
```

**查询结果处理扩展：**

在`handleQueryResult()`中添加新的target分支：

```typescript
else if (msg.target === 'visitor_intents') {
  this.emit('visitor_intents_query_result', msg.data);
}
else if (msg.target === 'package_alerts') {
  this.emit('package_alerts_query_result', msg.data);
}
```

#### LocalStorageService扩展

**数据库升级：**

```typescript
// 升级到版本3
private readonly DB_VERSION = 3;

// 在upgradeDatabase()中添加
if (oldVersion < 3) {
  // 创建visitor_intents表
  const visitorIntentsStore = db.createObjectStore('visitor_intents', {
    keyPath: 'id',
    autoIncrement: true
  });
  visitorIntentsStore.createIndex('ts', 'ts', { unique: false });
  visitorIntentsStore.createIndex('intent_type', 'intent_type', { unique: false });

  // 创建package_alerts表
  const packageAlertsStore = db.createObjectStore('package_alerts', {
    keyPath: 'id',
    autoIncrement: true
  });
  packageAlertsStore.createIndex('ts', 'ts', { unique: false });
  packageAlertsStore.createIndex('threat_level', 'threat_level', { unique: false });
}
```

**新增CRUD方法：**

```typescript
// 保存访客意图
public async saveVisitorIntent(intent: VisitorIntent): Promise<void>

// 获取最近N条访客意图
public async getVisitorIntents(limit: number = 100): Promise<VisitorIntent[]>

// 删除访客意图
public async deleteVisitorIntent(id: number): Promise<void>

// 保存快递警报
public async savePackageAlert(alert: PackageAlert): Promise<void>

// 获取最近N条快递警报
public async getPackageAlerts(limit: number = 100): Promise<PackageAlert[]>

// 删除快递警报
public async deletePackageAlert(id: number): Promise<void>
```

**数据清理扩展：**

在`cleanupExpiredData()`中添加新表的清理逻辑：

```typescript
// 清理访客意图：30天或1000条
const visitorIntentsAgeDeleted = await this.cleanupByAge("visitor_intents", 30);
const visitorIntentsCountDeleted = await this.cleanupByCount(
  "visitor_intents",
  1000,
);

// 清理快递警报：30天或1000条
const packageAlertsAgeDeleted = await this.cleanupByAge("package_alerts", 30);
const packageAlertsCountDeleted = await this.cleanupByCount(
  "package_alerts",
  1000,
);
```

### UI层组件

#### Toast通知组件

**文件位置：** `components/Toast.tsx`

**Props接口：**

```typescript
interface ToastProps {
  message: string;
  type?: "info" | "warning" | "error";
  duration?: number; // 默认3000ms
  onClose: () => void;
}
```

**实现要点：**

- 使用`useEffect`在挂载时启动定时器
- 定时器到期后调用`onClose`
- 提供手动关闭按钮
- 使用Tailwind CSS实现顶部居中、渐入渐出动画
- 根据type显示不同颜色（info=蓝色，warning=橙色，error=红色）

#### 意图类型标签组件

**文件位置：** `components/IntentTypeBadge.tsx`

**Props接口：**

```typescript
interface IntentTypeBadgeProps {
  type: "delivery" | "visit" | "sales" | "maintenance" | "other";
}
```

**样式映射：**

```typescript
const styleMap = {
  delivery: 'bg-blue-100 text-blue-800',
  visit: 'bg-green-100 text-green-800',
  sales: 'bg-orange-100 text-orange-800',
  maintenance: 'bg-purple-100 text-purple-800',
  other: 'bg-gray-100 text-gray-800'
};

const iconMap = {
  delivery: <Package />,
  visit: <Users />,
  sales: <ShoppingBag />,
  maintenance: <Wrench />,
  other: <HelpCircle />
};
```

#### 威胁等级标识组件

**文件位置：** `components/ThreatLevelBadge.tsx`

**Props接口：**

```typescript
interface ThreatLevelBadgeProps {
  level: "low" | "medium" | "high";
}
```

**样式映射：**

```typescript
const styleMap = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-orange-100 text-orange-800',
  high: 'bg-red-100 text-red-800'
};

const iconMap = {
  low: <Shield />,
  medium: <AlertTriangle />,
  high: <AlertOctagon />
};

const textMap = {
  low: '低威胁',
  medium: '中威胁',
  high: '高威胁'
};
```

#### 聊天气泡组件

**文件位置：** `components/ChatBubble.tsx`

**Props接口：**

```typescript
interface ChatBubbleProps {
  role: "assistant" | "user";
  content: string;
  timestamp?: string;
}
```

**布局设计：**

- `role='assistant'`: 左对齐，灰色背景
- `role='user'`: 右对齐，蓝色背景
- 使用`flex`布局实现对齐
- 气泡最大宽度80%，自动换行
- 可选显示时间戳（小字号，灰色）

**实现示例：**

```typescript
<div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
    role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
  }`}>
    <p className="whitespace-pre-wrap break-words">{content}</p>
    {timestamp && (
      <p className="text-xs mt-1 opacity-70">{timestamp}</p>
    )}
  </div>
</div>
```

#### 访客意图卡片组件

**文件位置：** `components/VisitorIntentCard.tsx`

**Props接口：**

```typescript
interface VisitorIntentCardProps {
  intents: VisitorIntent[];
  onViewDetail: (intent: VisitorIntent) => void;
}
```

**布局设计：**

- 卡片标题："最近访客意图"
- 显示最近5条记录
- 每条记录包含：
  - IntentTypeBadge（意图类型标签）
  - 简要总结（intent_summary.summary）
  - 时间戳（相对时间，如"2小时前"）
  - "查看详情"按钮
- 空状态：显示"暂无访客意图记录"

#### 快递警报卡片组件

**文件位置：** `components/PackageAlertCard.tsx`

**Props接口：**

```typescript
interface PackageAlertCardProps {
  alerts: PackageAlert[];
  onViewAll: () => void;
}
```

**布局设计：**

- 卡片标题："快递警报"
- 显示最近5条记录
- 每条记录包含：
  - ThreatLevelBadge（威胁等级标识）
  - 行为类型（action的中文描述）
  - 缩略图（如果有photo_path）
  - 时间戳
- "查看全部"按钮
- 空状态：显示"暂无快递警报"

#### 访客意图详情页

**文件位置：** `screens/VisitorIntentScreen.tsx`

**Props接口：**

```typescript
interface VisitorIntentScreenProps {
  intent: VisitorIntent;
  onBack: () => void;
}
```

**布局结构：**

```
┌─────────────────────────────────────┐
│  [返回] 访客意图详情                 │
├─────────────────────────────────────┤
│  顶部信息栏                          │
│  - 访客姓名: {person_name}           │
│  - 时间: {timestamp}                 │
│  - 意图类型: <IntentTypeBadge />     │
├─────────────────────────────────────┤
│  AI分析摘要                          │
│  - 简要总结: {summary}               │
│  - 详细分析: {ai_analysis}           │
├─────────────────────────────────────┤
│  重要信息 (如果有)                   │
│  - {important_notes[0]}              │
│  - {important_notes[1]}              │
├─────────────────────────────────────┤
│  对话历史                            │
│  <ChatBubble role="assistant" />     │
│  <ChatBubble role="user" />          │
│  <ChatBubble role="assistant" />     │
│  ...                                 │
└─────────────────────────────────────┘
```

**虚拟滚动实现：**

- 使用`react-window`或`react-virtuoso`库
- 仅在对话历史超过50条时启用
- 配置项高度：根据内容动态计算
- 保持滚动位置在底部（最新消息）

#### 快递警报详情页

**文件位置：** `screens/PackageAlertScreen.tsx`

**Props接口：**

```typescript
interface PackageAlertScreenProps {
  alerts: PackageAlert[];
  onBack: () => void;
}
```

**布局结构：**

```
┌─────────────────────────────────────┐
│  [返回] 快递警报                     │
├─────────────────────────────────────┤
│  威胁等级筛选                        │
│  [全部] [低威胁] [中威胁] [高威胁]   │
├─────────────────────────────────────┤
│  警报列表 (分页)                     │
│  ┌───────────────────────────────┐  │
│  │ <ThreatLevelBadge />          │  │
│  │ 时间: 2024-12-11 10:30        │  │
│  │ 行为: 拿走快递                │  │
│  │ [查看照片]                    │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ ...                           │  │
│  └───────────────────────────────┘  │
├─────────────────────────────────────┤
│  [加载更多]                          │
└─────────────────────────────────────┘
```

**照片懒加载实现：**

```typescript
// 使用IntersectionObserver
const imageRef = useRef<HTMLImageElement>(null);

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          // 进入视口，开始加载图片
          setImageSrc(alert.photo_path);
          observer.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "50px" }, // 提前50px开始加载
  );

  if (imageRef.current) {
    observer.observe(imageRef.current);
  }

  return () => observer.disconnect();
}, []);
```

### App.tsx状态管理扩展

**新增状态：**

```typescript
// 访客意图记录
const [visitorIntents, setVisitorIntents] = useState<VisitorIntent[]>([]);

// 快递警报记录
const [packageAlerts, setPackageAlerts] = useState<PackageAlert[]>([]);

// Toast通知
const [toastMessage, setToastMessage] = useState<string | null>(null);
const [toastType, setToastType] = useState<"info" | "warning" | "error">(
  "info",
);
```

**事件订阅扩展：**

```typescript
useEffect(() => {
  // 订阅访客意图事件
  const unsubVisitorIntent = deviceService.on("visitor_intent", (_, data) => {
    // 1. 更新状态
    setVisitorIntents((prev) => [data, ...prev].slice(0, 100));

    // 2. 显示Toast通知
    setToastMessage(
      `新访客: ${data.person_name} - ${data.intent_summary.summary}`,
    );
    setToastType("info");

    // 3. 保存到IndexedDB
    localStorageService.saveVisitorIntent(data);
  });

  // 订阅快递警报事件
  const unsubPackageAlert = deviceService.on("package_alert", (_, data) => {
    // 1. 更新状态
    setPackageAlerts((prev) => [data, ...prev].slice(0, 100));

    // 2. 中威胁及以上显示Toast
    if (data.threat_level === "medium" || data.threat_level === "high") {
      setToastMessage(`快递警报: ${data.description}`);
      setToastType(data.threat_level === "high" ? "error" : "warning");
    }

    // 3. 保存到IndexedDB
    localStorageService.savePackageAlert(data);
  });

  return () => {
    unsubVisitorIntent();
    unsubPackageAlert();
  };
}, []);
```

**数据加载扩展：**

```typescript
useEffect(() => {
  // 从IndexedDB加载缓存数据
  const loadCachedData = async () => {
    const cachedIntents = await localStorageService.getVisitorIntents(100);
    const cachedAlerts = await localStorageService.getPackageAlerts(100);

    setVisitorIntents(cachedIntents);
    setPackageAlerts(cachedAlerts);
  };

  loadCachedData();
}, []);

// 切换到首页时查询最新数据
useEffect(() => {
  if (currentTab === "home" && connectionStatus === "connected") {
    // 查询最近5条访客意图
    deviceService.queryVisitorIntents({ limit: 5 });

    // 查询最近5条快递警报
    deviceService.queryPackageAlerts({ limit: 5 });
  }
}, [currentTab, connectionStatus]);
```

## 数据模型

### TypeScript类型定义

**types.ts新增接口：**

```typescript
// 访客意图记录
export interface VisitorIntent {
  id: number; // IndexedDB自动生成
  visit_id: number; // 服务器visit_id
  session_id: string;
  person_id: number | null;
  person_name: string;
  relation_type: "family" | "friend" | "unknown";
  intent_type: "delivery" | "visit" | "sales" | "maintenance" | "other";
  intent_summary: {
    intent_type: string;
    summary: string;
    important_notes: string[];
    ai_analysis: string;
  };
  dialogue_history: DialogueMessage[];
  package_check?: PackageCheck;
  created_at: string; // ISO 8601格式
  ts: number; // 时间戳（毫秒）
}

// 对话消息
export interface DialogueMessage {
  role: "assistant" | "user";
  content: string;
}

// 快递检查结果
export interface PackageCheck {
  threat_level: "low" | "medium" | "high";
  action: "normal" | "passing" | "searching" | "taking" | "damaging";
  description: string;
}

// 快递警报记录
export interface PackageAlert {
  id: number; // IndexedDB自动生成
  device_id: string;
  session_id: string;
  threat_level: "low" | "medium" | "high";
  action: "normal" | "passing" | "searching" | "taking" | "damaging";
  description: string;
  photo_path: string;
  photo_thumbnail?: string; // 前端生成的缩略图路径
  voice_warning_sent: boolean;
  notified: boolean;
  created_at: string; // ISO 8601格式
  ts: number; // 时间戳（毫秒）
}

// 意图类型枚举
export type IntentType =
  | "delivery"
  | "visit"
  | "sales"
  | "maintenance"
  | "other";

// 威胁等级枚举
export type ThreatLevel = "low" | "medium" | "high";

// 行为类型枚举
export type ActionType =
  | "normal"
  | "passing"
  | "searching"
  | "taking"
  | "damaging";
```

### IndexedDB Schema

**数据库版本：** v3

**新增ObjectStore：**

1. **visitor_intents**
   - keyPath: `id` (自动递增)
   - 索引：
     - `ts`: 时间戳索引（用于时间范围查询和排序）
     - `intent_type`: 意图类型索引（用于类型筛选）

2. **package_alerts**
   - keyPath: `id` (自动递增)
   - 索引：
     - `ts`: 时间戳索引（用于时间范围查询和排序）
     - `threat_level`: 威胁等级索引（用于等级筛选）

**数据清理策略：**

- 访客意图：保留最近30天或最多1000条
- 快递警报：保留最近30天或最多1000条
- 在App启动时自动执行清理

## 正确性属性

_正确性属性是对系统行为的形式化描述，用于验证系统是否按预期工作。每个属性都应该能够通过属性测试（Property-Based Testing）进行验证，即对于所有有效输入，属性都应该成立。_

### 消息解析属性

**属性 1: 访客意图消息解析完整性**

*对于任意*有效的visitor_intent_notification消息，解析后应包含所有必需字段（visit_id、session_id、intent_summary、dialogue_history），且字段类型正确

**验证需求: 1.1, 1.2**

**属性 2: 快递警报提取正确性**

*对于任意*包含package_check字段的visitor_intent_notification消息，应正确提取threat_level、action和description字段，且不影响访客意图数据的解析

**验证需求: 6.1, 6.2**

**属性 3: 消息解析错误容忍**

*对于任意*格式错误的visitor_intent_notification消息，系统应记录错误日志但不崩溃，且不触发任何事件

**验证需求: 1.4**

### 事件触发属性

**属性 4: 访客意图事件触发**

*对于任意*成功解析的visitor_intent_notification消息，DeviceService应触发visitor_intent事件，且事件数据与解析结果一致

**验证需求: 1.3**

**属性 5: 快递警报事件触发**

*对于任意*包含package_check的visitor_intent_notification消息，DeviceService应触发package_alert事件，且事件数据与package_check字段一致

**验证需求: 6.3**

### 数据持久化属性

**属性 6: 访客意图持久化完整性**

*对于任意*VisitorIntent对象，保存到IndexedDB后再读取，应得到相同的数据（深度相等）

**验证需求: 1.5, 12.1, 12.2**

**属性 7: 快递警报持久化完整性**

*对于任意*PackageAlert对象，保存到IndexedDB后再读取，应得到相同的数据（深度相等）

**验证需求: 6.4, 13.1, 13.2**

**属性 8: 数据库升级幂等性**

*对于任意*已存在的IndexedDB数据库，多次执行升级操作应产生相同的结果，且不丢失现有数据

**验证需求: 11.2, 11.3, 11.4, 11.5, 11.6**

### 查询属性

**属性 9: 查询消息构造正确性**

*对于任意*查询参数（start_date、end_date、limit、offset），queryVisitorIntents()应构造符合协议规范的query消息，且target字段为visitor_intents

**验证需求: 5.1, 5.2**

**属性 10: 查询结果解析正确性**

*对于任意*有效的query_result消息（target=visitor_intents），handleQueryResult()应正确解析records数组，且触发visitor_intents_query_result事件

**验证需求: 5.3, 5.4**

**属性 11: 快递警报查询参数完整性**

*对于任意*包含threat_level筛选的查询参数，queryPackageAlerts()应正确包含该参数，且不影响其他参数

**验证需求: 10.1, 10.2**

### UI组件属性

**属性 12: Toast自动关闭时间准确性**

*对于任意*duration参数，Toast组件应在duration毫秒后调用onClose回调，误差不超过100ms

**验证需求: 2.3**

**属性 13: 意图类型标签样式一致性**

*对于任意*IntentType值，IntentTypeBadge组件应显示对应的颜色和图标，且样式符合设计规范

**验证需求: 14.2, 14.3, 14.4, 14.5, 14.6**

**属性 14: 威胁等级标识颜色正确性**

*对于任意*ThreatLevel值，ThreatLevelBadge组件应显示对应的颜色（low=绿色，medium=橙色，high=红色）

**验证需求: 15.2, 15.3, 15.4**

**属性 15: 聊天气泡对齐正确性**

*对于任意*role值，ChatBubble组件应正确对齐（assistant=左对齐，user=右对齐），且背景颜色符合设计

**验证需求: 16.1, 16.2**

### 数据展示属性

**属性 16: 首页卡片数量限制**

*对于任意*数量的访客意图记录，VisitorIntentCard应仅显示最近5条，且按时间倒序排列

**验证需求: 3.2, 3.3**

**属性 17: 快递警报卡片数量限制**

*对于任意*数量的快递警报记录，PackageAlertCard应仅显示最近5条，且按时间倒序排列

**验证需求: 8.2, 8.3**

**属性 18: 对话历史顺序保持**

*对于任意*dialogue_history数组，VisitorIntentScreen应按原始顺序显示对话，且不丢失任何消息

**验证需求: 4.6**

### 数据清理属性

**属性 19: 按时间清理准确性**

*对于任意*maxAgeDays参数，cleanupByAge()应删除所有超过该天数的记录，且不删除未超期的记录

**验证需求: 23.3, 23.4**

**属性 20: 按数量清理准确性**

*对于任意*maxCount参数，cleanupByCount()应保留最新的maxCount条记录，且删除其余记录

**验证需求: 23.1, 23.2**

### 错误处理属性

**属性 21: IndexedDB写入失败降级**

*对于任意*导致QuotaExceededError的数据，系统应自动清理旧数据并重试，或降级到内存存储

**验证需求: 22.2**

**属性 22: 查询超时重试**

*对于任意*超时的查询请求，系统应显示错误提示和重试按钮，且不影响其他功能

**验证需求: 22.3, 5.5, 10.5**

**属性 23: 照片加载失败降级**

*对于任意*加载失败的照片，系统应显示错误占位符和重试按钮，且不影响其他内容显示

**验证需求: 22.4, 20.5**

### 性能属性

**属性 24: 虚拟滚动触发条件**

*对于任意*对话历史数组，当长度超过50时应启用虚拟滚动，否则使用普通渲染

**验证需求: 19.1, 19.5**

**属性 25: 懒加载触发时机**

*对于任意*未进入视口的照片，应显示占位符且不加载；进入视口后应在200ms内开始加载

**验证需求: 20.1, 20.2, 20.3**

## 错误处理

### 消息解析错误

**场景：** 收到格式错误的visitor_intent_notification消息

**处理策略：**

1. 使用try-catch捕获JSON解析错误
2. 记录错误日志到console.error
3. 触发log事件，显示错误提示
4. 跳过该消息，不影响后续消息处理

**代码示例：**

```typescript
private handleVisitorIntentNotification(msg: any) {
  try {
    // 验证必需字段
    if (!msg.visit_id || !msg.session_id || !msg.intent_summary) {
      throw new Error('缺少必需字段');
    }

    // 正常处理...
  } catch (error) {
    console.error('访客意图消息解析失败:', error);
    this.emit('log', {
      msg: '访客意图消息格式错误，已跳过',
      type: 'error'
    });
  }
}
```

### IndexedDB错误

**场景1：数据库升级失败**

**处理策略：**

1. 记录错误日志
2. 启用降级模式（FallbackStorage）
3. 显示警告提示："数据将存储在内存中，刷新页面后丢失"

**场景2：存储空间不足（QuotaExceededError）**

**处理策略：**

1. 自动执行数据清理（cleanupExpiredData）
2. 重试保存操作
3. 如果仍失败，显示错误提示："存储空间不足，请手动清理缓存"

**场景3：读取数据失败**

**处理策略：**

1. 记录错误日志
2. 返回空数组或null
3. 显示错误提示："数据加载失败，请重试"

### 网络错误

**场景：** 查询请求超时或失败

**处理策略：**

1. 显示错误Toast："查询失败，请检查网络连接"
2. 提供重试按钮
3. 使用IndexedDB缓存数据作为降级方案

**代码示例：**

```typescript
// 在App.tsx中
const handleQueryError = () => {
  setToastMessage("查询失败，请检查网络连接");
  setToastType("error");

  // 显示重试按钮
  setShowRetryButton(true);
};

const handleRetry = () => {
  deviceService.queryVisitorIntents({ limit: 5 });
  setShowRetryButton(false);
};
```

### UI渲染错误

**场景：** 组件渲染失败

**处理策略：**

1. 使用React Error Boundary捕获错误
2. 显示友好的错误页面
3. 提供返回首页按钮
4. 记录错误到console.error

## 测试策略

### 单元测试

**DeviceService测试：**

```typescript
// tests/DeviceService.v2.5.test.ts

describe("DeviceService - v2.5协议", () => {
  describe("访客意图消息处理", () => {
    it("应正确解析visitor_intent_notification消息", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        visit_id: 123,
        session_id: "session_123",
        person_info: { person_id: 10, name: "张三", relation_type: "family" },
        intent_summary: {
          intent_type: "delivery",
          summary: "快递员送快递",
          important_notes: [],
          ai_analysis: "...",
        },
        dialogue_history: [],
        ts: Date.now(),
      };

      const service = new DeviceService();
      const emitSpy = jest.spyOn(service as any, "emit");

      (service as any).handleVisitorIntentNotification(mockMessage);

      expect(emitSpy).toHaveBeenCalledWith(
        "visitor_intent",
        expect.objectContaining({
          visit_id: 123,
          session_id: "session_123",
        }),
      );
    });

    it("应正确提取package_check字段", () => {
      const mockMessage = {
        type: "visitor_intent_notification",
        // ... 其他字段
        package_check: {
          threat_level: "high",
          action: "taking",
          description: "检测到非主人拿走快递",
        },
      };

      const service = new DeviceService();
      const emitSpy = jest.spyOn(service as any, "emit");

      (service as any).handleVisitorIntentNotification(mockMessage);

      expect(emitSpy).toHaveBeenCalledWith(
        "package_alert",
        expect.objectContaining({
          threat_level: "high",
          action: "taking",
        }),
      );
    });
  });

  describe("查询方法", () => {
    it("应构造正确的访客意图查询消息", () => {
      const service = new DeviceService();
      const sendCommandSpy = jest.spyOn(service, "sendCommand");

      service.queryVisitorIntents({
        start_date: "2024-12-01",
        end_date: "2024-12-31",
        limit: 20,
        offset: 0,
      });

      expect(sendCommandSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "query",
          target: "visitor_intents",
          data: {
            start_date: "2024-12-01",
            end_date: "2024-12-31",
            limit: 20,
            offset: 0,
          },
        }),
      );
    });
  });
});
```

**LocalStorageService测试：**

```typescript
// tests/LocalStorageService.v2.5.test.ts

describe("LocalStorageService - v2.5升级", () => {
  let service: LocalStorageService;

  beforeEach(async () => {
    service = LocalStorageService.getInstance();
    await service.init();
  });

  describe("数据库升级", () => {
    it("应创建visitor_intents表", async () => {
      const db = service.getDb();
      expect(db?.objectStoreNames.contains("visitor_intents")).toBe(true);
    });

    it("应创建package_alerts表", async () => {
      const db = service.getDb();
      expect(db?.objectStoreNames.contains("package_alerts")).toBe(true);
    });

    it("应为visitor_intents创建索引", async () => {
      const db = service.getDb();
      const transaction = db!.transaction(["visitor_intents"], "readonly");
      const store = transaction.objectStore("visitor_intents");

      expect(store.indexNames.contains("ts")).toBe(true);
      expect(store.indexNames.contains("intent_type")).toBe(true);
    });
  });

  describe("CRUD操作", () => {
    it("应保存并读取访客意图", async () => {
      const mockIntent: VisitorIntent = {
        id: 1,
        visit_id: 123,
        session_id: "session_123",
        person_id: 10,
        person_name: "张三",
        relation_type: "family",
        intent_type: "delivery",
        intent_summary: {
          intent_type: "delivery",
          summary: "快递员送快递",
          important_notes: [],
          ai_analysis: "...",
        },
        dialogue_history: [],
        created_at: new Date().toISOString(),
        ts: Date.now(),
      };

      await service.saveVisitorIntent(mockIntent);
      const intents = await service.getVisitorIntents(10);

      expect(intents).toHaveLength(1);
      expect(intents[0]).toMatchObject({
        visit_id: 123,
        session_id: "session_123",
      });
    });
  });
});
```

### 属性测试

**使用fast-check库进行属性测试：**

```typescript
// tests/properties/visitor-intent.property.test.ts

import fc from "fast-check";

describe("访客意图属性测试", () => {
  it("属性1: 消息解析完整性", () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.constant("visitor_intent_notification"),
          visit_id: fc.integer({ min: 1 }),
          session_id: fc.string(),
          person_info: fc.record({
            person_id: fc.integer({ min: 1 }),
            name: fc.string(),
            relation_type: fc.constantFrom("family", "friend", "unknown"),
          }),
          intent_summary: fc.record({
            intent_type: fc.constantFrom(
              "delivery",
              "visit",
              "sales",
              "maintenance",
              "other",
            ),
            summary: fc.string(),
            important_notes: fc.array(fc.string()),
            ai_analysis: fc.string(),
          }),
          dialogue_history: fc.array(
            fc.record({
              role: fc.constantFrom("assistant", "user"),
              content: fc.string(),
            }),
          ),
          ts: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
        }),
        (message) => {
          const service = new DeviceService();
          let emittedData: any = null;

          service.on("visitor_intent", (_, data) => {
            emittedData = data;
          });

          (service as any).handleVisitorIntentNotification(message);

          // 验证所有必需字段都存在
          expect(emittedData).toBeTruthy();
          expect(emittedData.visit_id).toBe(message.visit_id);
          expect(emittedData.session_id).toBe(message.session_id);
          expect(emittedData.intent_summary).toEqual(message.intent_summary);
          expect(emittedData.dialogue_history).toEqual(
            message.dialogue_history,
          );
        },
      ),
      { numRuns: 100 }, // 运行100次
    );
  });

  it("属性6: 持久化完整性", () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.integer({ min: 1 }),
          visit_id: fc.integer({ min: 1 }),
          session_id: fc.string(),
          person_id: fc.option(fc.integer({ min: 1 }), { nil: null }),
          person_name: fc.string(),
          relation_type: fc.constantFrom("family", "friend", "unknown"),
          intent_type: fc.constantFrom(
            "delivery",
            "visit",
            "sales",
            "maintenance",
            "other",
          ),
          intent_summary: fc.record({
            intent_type: fc.string(),
            summary: fc.string(),
            important_notes: fc.array(fc.string()),
            ai_analysis: fc.string(),
          }),
          dialogue_history: fc.array(
            fc.record({
              role: fc.constantFrom("assistant", "user"),
              content: fc.string(),
            }),
          ),
          created_at: fc.date().map((d) => d.toISOString()),
          ts: fc.integer({ min: Date.now() - 86400000, max: Date.now() }),
        }),
        async (intent) => {
          const service = LocalStorageService.getInstance();
          await service.init();

          // 保存
          await service.saveVisitorIntent(intent);

          // 读取
          const intents = await service.getVisitorIntents(100);
          const savedIntent = intents.find(
            (i) => i.visit_id === intent.visit_id,
          );

          // 验证深度相等
          expect(savedIntent).toEqual(intent);
        },
      ),
      { numRuns: 100 },
    );
  });
});
```

### 集成测试

**完整数据流测试：**

```typescript
// tests/integration/v2.5-flow.test.ts

describe("v2.5协议集成测试", () => {
  it("应完成完整的访客意图数据流", async () => {
    // 1. 初始化服务
    const deviceService = new DeviceService();
    const storageService = LocalStorageService.getInstance();
    await storageService.init();

    // 2. 模拟接收消息
    const mockMessage = {
      type: "visitor_intent_notification",
      visit_id: 123,
      session_id: "session_123",
      // ... 完整消息
    };

    let receivedIntent: any = null;
    deviceService.on("visitor_intent", (_, data) => {
      receivedIntent = data;
    });

    // 3. 处理消息
    (deviceService as any).handleTextMessage(JSON.stringify(mockMessage));

    // 4. 验证事件触发
    expect(receivedIntent).toBeTruthy();

    // 5. 保存到IndexedDB
    await storageService.saveVisitorIntent(receivedIntent);

    // 6. 从IndexedDB读取
    const intents = await storageService.getVisitorIntents(10);

    // 7. 验证数据完整性
    expect(intents).toHaveLength(1);
    expect(intents[0].visit_id).toBe(123);
  });
});
```

### 测试覆盖率目标

- DeviceService: > 85%
- LocalStorageService: > 90%
- UI组件: > 75%
- 整体覆盖率: > 80%

## 性能优化

### 虚拟滚动实现

**使用场景：** 对话历史超过50条时

**技术方案：** 使用react-window库

**实现示例：**

```typescript
import { FixedSizeList } from 'react-window';

const VisitorIntentScreen = ({ intent }: VisitorIntentScreenProps) => {
  const dialogueHistory = intent.dialogue_history;
  const useVirtualScroll = dialogueHistory.length > 50;

  if (useVirtualScroll) {
    return (
      <FixedSizeList
        height={600}
        itemCount={dialogueHistory.length}
        itemSize={80} // 根据内容动态调整
        width="100%"
      >
        {({ index, style }) => (
          <div style={style}>
            <ChatBubble
              role={dialogueHistory[index].role}
              content={dialogueHistory[index].content}
            />
          </div>
        )}
      </FixedSizeList>
    );
  }

  // 少于50条使用普通渲染
  return (
    <div>
      {dialogueHistory.map((msg, index) => (
        <ChatBubble key={index} role={msg.role} content={msg.content} />
      ))}
    </div>
  );
};
```

**性能指标：**

- 渲染100条对话：< 100ms
- 滚动帧率：> 50 FPS
- 内存占用：< 50MB

### 照片懒加载实现

**使用场景：** 快递警报照片列表

**技术方案：** IntersectionObserver API

**实现示例：**

```typescript
const LazyImage = ({ src, alt }: { src: string; alt: string }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !imageSrc) {
            // 进入视口，开始加载
            setTimeout(() => {
              setImageSrc(src);
            }, 200); // 200ms延迟
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px', // 提前50px开始加载
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, imageSrc]);

  const handleLoad = () => setIsLoading(false);
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div ref={imgRef} className="relative w-full h-48 bg-gray-200">
      {!imageSrc && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-400">加载中...</span>
        </div>
      )}

      {imageSrc && !hasError && (
        <img
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        />
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-red-500 mb-2">加载失败</span>
          <button
            onClick={() => {
              setHasError(false);
              setImageSrc(null);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            重试
          </button>
        </div>
      )}
    </div>
  );
};
```

### 数据缓存策略

**混合更新策略：**

1. **实时推送优先：** 收到推送消息立即更新UI和IndexedDB
2. **切换查询补充：** 切换到首页时查询最新5条数据
3. **数据去重合并：** 合并推送和查询的数据，按ts去重

**实现示例：**

```typescript
// 在App.tsx中
const mergeAndDeduplicateIntents = (
  existing: VisitorIntent[],
  newData: VisitorIntent[],
): VisitorIntent[] => {
  const merged = [...existing, ...newData];

  // 按session_id去重
  const uniqueMap = new Map<string, VisitorIntent>();
  merged.forEach((intent) => {
    if (
      !uniqueMap.has(intent.session_id) ||
      intent.ts > uniqueMap.get(intent.session_id)!.ts
    ) {
      uniqueMap.set(intent.session_id, intent);
    }
  });

  // 按时间倒序排列
  return Array.from(uniqueMap.values())
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 100); // 保留最近100条
};

// 订阅查询结果
useEffect(() => {
  const unsub = deviceService.on("visitor_intents_query_result", (_, data) => {
    setVisitorIntents((prev) => mergeAndDeduplicateIntents(prev, data.records));
  });

  return unsub;
}, []);
```

### IndexedDB批量操作优化

**场景：** 初始化时加载大量数据

**优化方案：** 使用事务批量读取

**实现示例：**

```typescript
public async loadCachedData(): Promise<{
  intents: VisitorIntent[];
  alerts: PackageAlert[];
}> {
  if (!this.db) {
    throw new Error('数据库未初始化');
  }

  return new Promise((resolve, reject) => {
    // 使用单个事务读取多个表
    const transaction = this.db!.transaction(
      ['visitor_intents', 'package_alerts'],
      'readonly'
    );

    const intentsStore = transaction.objectStore('visitor_intents');
    const alertsStore = transaction.objectStore('package_alerts');

    const intentsRequest = intentsStore.getAll();
    const alertsRequest = alertsStore.getAll();

    let intents: VisitorIntent[] = [];
    let alerts: PackageAlert[] = [];

    intentsRequest.onsuccess = () => {
      intents = intentsRequest.result;
    };

    alertsRequest.onsuccess = () => {
      alerts = alertsRequest.result;
    };

    transaction.oncomplete = () => {
      resolve({ intents, alerts });
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}
```

## 安全考虑

### 数据验证

**输入验证：**

```typescript
// 验证访客意图消息
const validateVisitorIntentMessage = (msg: any): boolean => {
  if (!msg.visit_id || typeof msg.visit_id !== "number") return false;
  if (!msg.session_id || typeof msg.session_id !== "string") return false;
  if (!msg.intent_summary || typeof msg.intent_summary !== "object")
    return false;
  if (!Array.isArray(msg.dialogue_history)) return false;

  return true;
};
```

### XSS防护

**内容转义：**

```typescript
// 在ChatBubble组件中
const sanitizeContent = (content: string): string => {
  // React默认会转义文本内容，但如果使用dangerouslySetInnerHTML需要额外处理
  return content
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};
```

### 存储空间管理

**配额检查：**

```typescript
// 检查存储空间
const checkStorageQuota = async (): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> => {
  if ("storage" in navigator && "estimate" in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;

    return { usage, quota, percentage };
  }

  return { usage: 0, quota: 0, percentage: 0 };
};

// 在App启动时检查
useEffect(() => {
  checkStorageQuota().then(({ percentage }) => {
    if (percentage > 80) {
      console.warn("存储空间使用超过80%，建议清理数据");
      // 自动执行清理
      localStorageService.cleanupExpiredData();
    }
  });
}, []);
```

## 部署注意事项

### 数据库版本管理

**升级策略：**

1. 用户首次打开App时自动升级到v3
2. 保留v2的所有数据（deviceStatus、videos等）
3. 新增v3的表（visitor_intents、package_alerts）
4. 升级失败时降级到内存模式，不影响基本功能

**回滚策略：**

- 如果需要回滚到v2.4，新增的表会被忽略
- 旧功能不受影响
- 建议在升级前备份IndexedDB数据

### 浏览器兼容性

**最低要求：**

- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

**降级方案：**

- 不支持IndexedDB：使用内存存储
- 不支持IntersectionObserver：直接加载所有图片
- 不支持AudioWorklet：使用ScriptProcessorNode

### 性能监控

**关键指标：**

```typescript
// 监控IndexedDB操作耗时
const measureDBOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
): Promise<T> => {
  const startTime = performance.now();

  try {
    const result = await operation();
    const duration = performance.now() - startTime;

    console.log(`[性能] ${operationName}: ${duration.toFixed(2)}ms`);

    if (duration > 1000) {
      console.warn(
        `[性能警告] ${operationName}耗时过长: ${duration.toFixed(2)}ms`,
      );
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(
      `[性能] ${operationName}失败: ${duration.toFixed(2)}ms`,
      error,
    );
    throw error;
  }
};

// 使用示例
await measureDBOperation(
  () => localStorageService.saveVisitorIntent(intent),
  "保存访客意图",
);
```

## 总结

本设计文档详细描述了v2.5协议适配的完整技术方案，包括：

1. **架构设计**：基于现有的事件驱动架构，扩展DeviceService和LocalStorageService
2. **数据模型**：定义了VisitorIntent和PackageAlert接口，升级IndexedDB到v3
3. **UI组件**：设计了Toast、IntentTypeBadge、ThreatLevelBadge、ChatBubble等可复用组件
4. **性能优化**：实现了虚拟滚动、照片懒加载和数据缓存策略
5. **错误处理**：提供了完善的错误处理和降级方案
6. **测试策略**：包含单元测试、属性测试和集成测试

该设计严格遵循v2.5协议规范，保持了代码的可维护性和可测试性，为后续的实现提供了清晰的指导。
