---
inclusion: fileMatch
fileMatchPattern: ['**/*.ts', '**/*.tsx', '**/*.json', 'vite.config.ts', 'tsconfig.json']
---

# 技术栈规范

## 核心技术

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 构建工具 | Vite | 6.x | 开发服务器端口 3000 |
| 类型系统 | TypeScript | 5.8 | noEmit 模式，bundler 解析 |
| UI 框架 | React | 19 | 函数式组件 + Hooks |
| 样式 | Tailwind CSS | CDN | 禁止使用 CSS 模块 |
| 图标 | Lucide React | - | 统一图标库 |

## 路径别名

使用 `@/*` 引用项目根目录文件：
```typescript
import { deviceService } from '@/services/DeviceService';
import type { Person } from '@/types';
```

## 浏览器 API 使用

- **WebSocket**: 门锁设备通信，自定义二进制协议
- **Web Audio API**: PCM 音频播放 (16kHz) 和采集 (24kHz)
- **MediaDevices API**: 麦克风访问，需 HTTPS 或 localhost

## TypeScript 配置要点

- Target: ES2022
- JSX: react-jsx (无需手动 import React)
- 未启用 strict 模式
- 启用 experimentalDecorators

## 代码规范

1. **组件**: 使用函数式组件，Props 定义 interface
2. **样式**: 仅使用 Tailwind 类名，不写内联样式对象
3. **状态**: 优先使用 React Hooks (useState, useEffect, useCallback)
4. **类型**: 共享类型定义在 `types.ts`
5. **服务**: 单例模式，通过事件驱动通信

## 常用命令

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器 (localhost:3000)
npm run build    # 生产构建
npm run preview  # 预览构建结果
```

## 环境变量

在 `.env.local` 中配置：
```
GEMINI_API_KEY=your_api_key
```
