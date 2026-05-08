# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 常用命令

```bash
npm install           # 安装依赖
npm run dev           # 开发服务器 (localhost:3000, 绑定 0.0.0.0)
npm run build         # 生产构建 (输出到 dist/)
npm run preview       # 预览构建结果
npm test              # 运行所有测试
npx vitest --run test/unit           # 仅单元测试
npx vitest --run test/integration    # 仅集成测试
npx vitest --run test/e2e            # 仅端到端测试
```

## 技术栈

| 类别 | 技术 | 关键信息 |
|------|------|----------|
| 构建 | Vite 6.x + React 插件 | 开发服务器端口 3000 |
| 语言 | TypeScript 5.8 | noEmit, bundler 解析, 未启用 strict |
| UI | React 19 | 函数式组件 + Hooks, JSX: react-jsx |
| 样式 | Tailwind CSS (CDN) | `darkMode: 'class'`, 禁止 CSS Modules |
| 图标 | Lucide React | 统一图标库 |
| 移动端 | Capacitor 8 | Android 打包, appId: com.smartlock.pro |
| 测试 | Vitest 4.x | jsdom 环境, fake-indexeddb |
| 存储 | IndexedDB | 数据库名: SmartDoorlockDB |
| 通信 | WebSocket | 二进制协议与 JSON 混合 |

## 路径别名

`@/*` 映射到项目根目录：

```typescript
import { deviceService } from "@/services/DeviceService";
import type { Person } from "@/types";
```

## 核心架构

### 状态管理：事件驱动 + 集中状态

```
DeviceService (事件源 / WebSocket)
       ↓ emit(eventName, data)
   App.tsx (状态持有者，useState)
       ↓ props
   Screen 组件 (展示层)
```

- `DeviceService` 是单例，通过 `on(eventName, callback)` 订阅事件，返回取消订阅函数
- `App.tsx` 持有所有全局状态（连接状态、日志、视频帧、人脸/指纹/NFC/密码列表等），通过 props 向下传递
- 组件不直接持有跨屏幕共享的状态

### WebSocket 通信 (`services/DeviceService.ts`)

- 使用 `seq_id` 机制追踪每条消息的确认/重传
- 两类超时策略：
  - 设备直接命令（锁控/用户管理）：20-90秒超时，不重传（物理操作耗时）
  - 服务器命令：3秒超时，最多重传3次
- 音频：Web Audio API 处理 PCM 播放（16kHz Rx）和采集（24kHz Tx），AudioWorklet 做 Float32→Int16 转换
- 支持 AudioWorklet（优先）和 ScriptProcessorNode（降级）两种音频路径
- 默认启用变声功能（大叔音色），通过 BiquadFilter 实现

### 本地持久化 (`services/LocalStorageService.ts`)

- IndexedDB 主存储 + 内存降级（FallbackStorage 实现相同接口）
- 数据库 `SmartDoorlockDB` 包含9个对象存储
- 历史记录自动清理策略：30天或200-500条限制；视频1GB FIFO
- 启动时异步加载缓存数据，立即可用（无需等网络）
- `syncData()` 支持增量同步（对比本地和服务器数据，只更新差异部分）

### 主题系统

- 浅色/深色双主题，通过 `document.documentElement.classList` 切换 `dark` 类
- 优先读 `localStorage('theme')` 用户偏好，其次 `prefers-color-scheme` 系统偏好
- 所有颜色使用 Tailwind 语义化色板（primary/secondary/success/warning/error/info）
- 对比度符合 WCAG 2.1 AA 标准

## 文件职责速查

| 路径 | 职责 | 何时修改 |
|------|------|----------|
| `App.tsx` | 全局状态、事件订阅、Tab/子页面路由、主题切换 | 添加全局状态或新页面级事件 |
| `types.ts` | 所有共享 TS 接口/类型（~570行） | 添加/修改数据结构 |
| `screens/` | 页面级组件（HomeScreen, MonitorScreen, SettingsScreen, VisitorIntentScreen, PackageAlertScreen） | 修改特定 Tab 功能 |
| `components/` | 可复用 UI 组件（Button, Toast, BottomNav, Badge, Card 等） | 提取/修改跨屏幕共用组件 |
| `services/` | WebSocket、IndexedDB、音频处理、设备状态缓存 | 修改通信协议或存储逻辑 |
| `audio-processor.js` | AudioWorklet 处理器（Float32→Int16 PCM） | 修改音频采集链路 |

## 新增功能的放置规则

- 新 Tab 页面 → `screens/XxxScreen.tsx`
- 新可复用组件 → `components/XxxYyy.tsx`
- 新服务 → `services/XxxService.ts`
- 新类型 → 加入 `types.ts`（集中管理，不拆分为多个类型文件）
- 新测试 → `test/unit/` 或 `test/integration/`，命名 `xxx.test.ts`

## 代码规范

- 组件：函数式组件 + Props interface，React Hooks 管理状态
- 样式：仅使用 Tailwind 类名，禁止内联 `style` 对象和 CSS Modules
- 类型：所有共享类型定义在 `types.ts`，不在组件文件内定义可复用接口
- 服务：单例模式，`export const xxx = new XxxService()`
- 注释：代码注释用中文，变量/函数/类名用英文

## 通信协议

项目遵循 `docs/智能猫眼门锁系统-服务器与App通信协议规范-v2.5.md` 定义的 WebSocket JSON 协议。主要消息类型：

- `sync` / `sync_ack` - 连接握手
- `command` / `command_ack` - 设备控制（锁控、查询）
- `face_mgmt` / `face_response` - 人脸管理
- `user_mgmt` / `*_result` - 用户管理（指纹/NFC/密码）
- `status_report` - 设备状态主动上报
- `event_report` - 事件上报（门铃/移动检测/撬锁等）
- `log_report` - 开锁日志上报
- `media_download` - 视频附件下载
- `visitor_intent` / `package_alert` - v2.5 新增（访客意图识别/快递看护）

## 环境变量

`.env.local` 中配置 `GEMINI_API_KEY`（通过 `vite.config.ts` 注入为 `process.env.GEMINI_API_KEY`）。
