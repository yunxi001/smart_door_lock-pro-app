---
inclusion: always
---

# 项目结构规范

## 目录结构

```
├── App.tsx              # 根组件：全局状态管理、事件订阅
├── index.tsx            # React 入口
├── index.html           # HTML 模板 (含 Tailwind CDN)
├── types.ts             # 共享 TypeScript 类型定义
├── components/          # 可复用 UI 组件
├── screens/             # 页面级组件 (每个 Tab 一个)
├── services/            # 业务逻辑与外部通信
└── .env.local           # 环境变量
```

## 架构模式

| 模式 | 说明 | 示例 |
|------|------|------|
| 单例服务 | `deviceService` 全局唯一实例 | `import { deviceService } from '@/services/DeviceService'` |
| 事件驱动 | 组件通过 `deviceService.on()` 订阅事件 | `deviceService.on('status', handler)` |
| 集中状态 | App.tsx 持有共享状态 (status, logs, persons, visits) | 通过 props 向下传递 |
| Tab 导航 | `currentTab` 控制三个主屏幕切换 | monitor / faces / settings |

## 文件职责

| 文件/目录 | 职责 | 修改时机 |
|-----------|------|----------|
| `App.tsx` | 全局状态、事件订阅、Tab 路由 | 添加全局状态或新 Tab |
| `components/` | 跨屏幕复用的 UI 组件 | 提取可复用组件 |
| `screens/` | 独立页面逻辑 | 修改特定 Tab 功能 |
| `services/` | WebSocket、音频、业务逻辑 | 修改设备通信协议 |
| `types.ts` | 共享接口定义 | 添加/修改数据结构 |

## 组件规范

- 使用函数式组件 + TypeScript Props 接口
- 使用 React Hooks 管理状态和副作用
- 样式仅使用 Tailwind CSS 类名 (禁止 CSS Modules)
- UI 文本、日志消息使用中文

## 新增文件指南

| 场景 | 放置位置 | 命名规范 |
|------|----------|----------|
| 新 Tab 页面 | `screens/XxxScreen.tsx` | PascalCase + Screen 后缀 |
| 可复用组件 | `components/XxxYyy.tsx` | PascalCase |
| 新服务模块 | `services/XxxService.ts` | PascalCase + Service 后缀 |
| 类型定义 | `types.ts` (集中) | 接口用 PascalCase |

## 状态管理流程

```
DeviceService (事件源)
       ↓ emit
   App.tsx (状态持有者)
       ↓ props
   Screen 组件 (展示层)
```

- 新增全局状态：在 App.tsx 添加 useState，通过 props 传递
- 新增事件类型：在 DeviceService 添加 emit，在 App.tsx 订阅
