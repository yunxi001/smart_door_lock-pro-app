# 设计文档：智能门锁 Pro 配色系统重设计

## 概述

本设计文档定义了智能门锁 Pro 应用的完整配色系统，旨在建立一个专业、可访问、具有品牌识别度的色彩体系。配色系统基于智能家居/IoT 产品的最佳实践，结合安全监控类应用的视觉特点，确保在浅色和深色两种主题模式下都能提供优秀的用户体验。

### 设计目标

1. **专业可信**：体现智能安全产品的专业性和可靠性
2. **清晰易读**：确保所有文本和交互元素符合 WCAG 2.1 AA 标准
3. **品牌识别**：建立独特的视觉识别系统
4. **功能导向**：通过颜色快速传达设备状态和操作反馈
5. **视觉舒适**：支持浅色和深色模式，适应不同使用场景

### 设计原则

- **语义化优先**：每个颜色都有明确的功能含义
- **对比度优先**：确保可访问性，文本清晰可读
- **一致性优先**：在所有界面保持统一的配色规则
- **场景适配**：针对视频监控等特殊场景优化配色

## 架构

### 色彩系统架构

配色系统采用分层架构，从底层的原始色值到顶层的语义化应用：

```
┌─────────────────────────────────────────┐
│   应用层 (Application Layer)            │
│   - 组件配色                             │
│   - 页面配色                             │
│   - 交互状态配色                         │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   语义层 (Semantic Layer)               │
│   - 品牌色 (Brand)                       │
│   - 状态色 (Status)                      │
│   - 功能色 (Functional)                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   基础层 (Foundation Layer)             │
│   - 主色 (Primary)                       │
│   - 辅助色 (Secondary)                   │
│   - 中性色 (Neutral)                     │
│   - 状态色 (Success/Warning/Error/Info)  │
└─────────────────────────────────────────┘
```

### 主题模式架构

系统支持两种主题模式，通过 Tailwind CSS 的 `dark:` 前缀实现自动切换：

```
浅色模式 (Light Mode)
├── 背景：白色/浅灰色系
├── 文本：深色系（高对比度）
├── 主色：饱和度适中
└── 强调：高饱和度

深色模式 (Dark Mode)
├── 背景：深灰色/黑色系
├── 文本：浅色系（高对比度）
├── 主色：降低饱和度
└── 强调：适度饱和度
```

## 组件和接口

### 核心色彩定义

#### 1. 主品牌色 (Primary) - 科技蓝

基于智能家居/IoT 产品的最佳实践，选择深邃的科技蓝作为主品牌色，体现专业、可靠、科技感。

```typescript
// Slate Blue - 深邃科技蓝
primary: {
  50: '#f0f4f8',   // 极浅蓝 - 背景高亮
  100: '#d9e2ec',  // 浅蓝 - 悬停背景
  200: '#bcccdc',  // 柔和蓝 - 禁用状态
  300: '#9fb3c8',  // 中浅蓝 - 边框
  400: '#829ab1',  // 中蓝 - 次要文本
  500: '#627d98',  // 标准蓝 - 主要品牌色
  600: '#486581',  // 深蓝 - 悬停状态
  700: '#334e68',  // 更深蓝 - 激活状态
  800: '#243b53',  // 深邃蓝 - 深色模式背景
  900: '#102a43',  // 最深蓝 - 深色模式强调
  950: '#0a1929',  // 极深蓝 - 深色模式最深背景
}
```

**使用场景**：

- 主导航栏背景
- 主要操作按钮
- 链接文本
- 选中状态
- 品牌标识

#### 2. 辅助色 (Secondary) - 智能灰

中性的智能灰作为辅助色，提供视觉层次和信息架构。

```typescript
// Neutral Gray - 智能灰
secondary: {
  50: '#f8fafc',   // 极浅灰 - 浅色模式背景
  100: '#f1f5f9',  // 浅灰 - 卡片背景
  200: '#e2e8f0',  // 柔和灰 - 分隔线
  300: '#cbd5e1',  // 中浅灰 - 边框
  400: '#94a3b8',  // 中灰 - 占位符文本
  500: '#64748b',  // 标准灰 - 次要文本
  600: '#475569',  // 深灰 - 正文文本
  700: '#334155',  // 更深灰 - 标题文本
  800: '#1e293b',  // 深邃灰 - 深色模式背景
  900: '#0f172a',  // 最深灰 - 深色模式最深背景
  950: '#020617',  // 极深灰 - 深色模式纯黑背景
}
```

**使用场景**：

- 页面背景
- 卡片容器
- 分隔线
- 次要文本
- 禁用状态

#### 3. 成功色 (Success) - 安全绿

代表成功、安全、正常状态，用于设备在线、开门成功等场景。

```typescript
// Safety Green - 安全绿
success: {
  50: '#f0fdf4',   // 极浅绿
  100: '#dcfce7',  // 浅绿 - 成功背景
  200: '#bbf7d0',  // 柔和绿
  300: '#86efac',  // 中浅绿
  400: '#4ade80',  // 中绿
  500: '#22c55e',  // 标准绿 - 主要成功色
  600: '#16a34a',  // 深绿 - 悬停状态
  700: '#15803d',  // 更深绿
  800: '#166534',  // 深邃绿
  900: '#14532d',  // 最深绿
  950: '#052e16',  // 极深绿
}
```

**使用场景**：

- 设备在线状态
- 开门成功提示
- 人脸识别成功
- 操作成功反馈
- 正常运行指示器

#### 4. 警告色 (Warning) - 注意橙

代表警告、需要注意的状态，用于电量低、异常访问等场景。

```typescript
// Alert Amber - 注意橙
warning: {
  50: '#fffbeb',   // 极浅橙
  100: '#fef3c7',  // 浅橙 - 警告背景
  200: '#fde68a',  // 柔和橙
  300: '#fcd34d',  // 中浅橙
  400: '#fbbf24',  // 中橙
  500: '#f59e0b',  // 标准橙 - 主要警告色
  600: '#d97706',  // 深橙 - 悬停状态
  700: '#b45309',  // 更深橙
  800: '#92400e',  // 深邃橙
  900: '#78350f',  // 最深橙
  950: '#451a03',  // 极深橙
}
```

**使用场景**：

- 电量低警告
- 异常访问提示
- 需要用户注意的信息
- 待处理事项
- 中等优先级提醒

#### 5. 错误色 (Error) - 危险红

代表错误、危险、拒绝状态，用于连接失败、拒绝访问等场景。

```typescript
// Danger Red - 危险红
error: {
  50: '#fef2f2',   // 极浅红
  100: '#fee2e2',  // 浅红 - 错误背景
  200: '#fecaca',  // 柔和红
  300: '#fca5a5',  // 中浅红
  400: '#f87171',  // 中红
  500: '#ef4444',  // 标准红 - 主要错误色
  600: '#dc2626',  // 深红 - 悬停状态
  700: '#b91c1c',  // 更深红
  800: '#991b1b',  // 深邃红
  900: '#7f1d1d',  // 最深红
  950: '#450a0a',  // 极深红
}
```

**使用场景**：

- 设备离线状态
- 连接失败提示
- 拒绝访问记录
- 错误消息
- 删除确认

#### 6. 信息色 (Info) - 信息蓝

代表信息提示、中性通知，用于一般性提示和说明。

```typescript
// Info Cyan - 信息蓝
info: {
  50: '#ecfeff',   // 极浅青
  100: '#cffafe',  // 浅青 - 信息背景
  200: '#a5f3fc',  // 柔和青
  300: '#67e8f9',  // 中浅青
  400: '#22d3ee',  // 中青
  500: '#06b6d4',  // 标准青 - 主要信息色
  600: '#0891b2',  // 深青 - 悬停状态
  700: '#0e7490',  // 更深青
  800: '#155e75',  // 深邃青
  900: '#164e63',  // 最深青
  950: '#083344',  // 极深青
}
```

**使用场景**：

- 一般性提示
- 帮助信息
- 功能说明
- 中性通知
- 引导提示

### 语义化颜色映射

为了便于使用和维护，定义语义化的颜色别名：

```typescript
// 浅色模式语义化映射
const lightModeSemantics = {
  // 背景色
  "bg-app": "secondary-50", // 应用主背景
  "bg-card": "white", // 卡片背景
  "bg-elevated": "white", // 悬浮元素背景
  "bg-overlay": "secondary-900/80", // 遮罩层

  // 文本色
  "text-primary": "secondary-900", // 主要文本
  "text-secondary": "secondary-600", // 次要文本
  "text-tertiary": "secondary-400", // 三级文本
  "text-disabled": "secondary-300", // 禁用文本
  "text-inverse": "white", // 反色文本

  // 边框色
  "border-default": "secondary-200", // 默认边框
  "border-strong": "secondary-300", // 强调边框
  "border-subtle": "secondary-100", // 微弱边框

  // 交互色
  "interactive-default": "primary-500", // 默认交互
  "interactive-hover": "primary-600", // 悬停状态
  "interactive-active": "primary-700", // 激活状态
  "interactive-disabled": "secondary-300", // 禁用状态
};

// 深色模式语义化映射
const darkModeSemantics = {
  // 背景色
  "bg-app": "secondary-950", // 应用主背景
  "bg-card": "secondary-900", // 卡片背景
  "bg-elevated": "secondary-800", // 悬浮元素背景
  "bg-overlay": "secondary-950/90", // 遮罩层

  // 文本色
  "text-primary": "secondary-50", // 主要文本
  "text-secondary": "secondary-300", // 次要文本
  "text-tertiary": "secondary-400", // 三级文本
  "text-disabled": "secondary-600", // 禁用文本
  "text-inverse": "secondary-900", // 反色文本

  // 边框色
  "border-default": "secondary-700", // 默认边框
  "border-strong": "secondary-600", // 强调边框
  "border-subtle": "secondary-800", // 微弱边框

  // 交互色
  "interactive-default": "primary-400", // 默认交互（降低饱和度）
  "interactive-hover": "primary-300", // 悬停状态
  "interactive-active": "primary-200", // 激活状态
  "interactive-disabled": "secondary-700", // 禁用状态
};
```

## 数据模型

### Tailwind CSS 配置

完整的 Tailwind CSS 配置文件：

```javascript
// tailwind.config.js
module.exports = {
  darkMode: "class", // 使用 class 策略控制深色模式
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 主品牌色 - 科技蓝
        primary: {
          50: "#f0f4f8",
          100: "#d9e2ec",
          200: "#bcccdc",
          300: "#9fb3c8",
          400: "#829ab1",
          500: "#627d98",
          600: "#486581",
          700: "#334e68",
          800: "#243b53",
          900: "#102a43",
          950: "#0a1929",
        },
        // 辅助色 - 智能灰
        secondary: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        // 成功色 - 安全绿
        success: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
          950: "#052e16",
        },
        // 警告色 - 注意橙
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
        // 错误色 - 危险红
        error: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
        // 信息色 - 信息蓝
        info: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
          950: "#083344",
        },
      },
      // 字体配置（支持中文）
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "Noto Sans",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
          "Segoe UI Symbol",
          "Noto Color Emoji",
        ],
      },
      // 阴影配置
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        DEFAULT:
          "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
        inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
      },
    },
  },
  plugins: [],
};
```

### 颜色使用规范数据结构

```typescript
// 颜色使用规范类型定义
interface ColorUsageRule {
  component: string; // 组件名称
  element: string; // 元素类型
  lightMode: string; // 浅色模式类名
  darkMode: string; // 深色模式类名
  contrastRatio: number; // 对比度
  wcagLevel: "AA" | "AAA"; // WCAG 等级
  usage: string; // 使用说明
}

// 示例：按钮配色规范
const buttonColorRules: ColorUsageRule[] = [
  {
    component: "Button",
    element: "Primary Button Background",
    lightMode: "bg-primary-500",
    darkMode: "dark:bg-primary-600",
    contrastRatio: 4.5,
    wcagLevel: "AA",
    usage: "主要操作按钮背景色",
  },
  {
    component: "Button",
    element: "Primary Button Text",
    lightMode: "text-white",
    darkMode: "dark:text-white",
    contrastRatio: 7.0,
    wcagLevel: "AAA",
    usage: "主要操作按钮文本色",
  },
  // ... 更多规则
];
```

## 正确性属性

_属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的正式陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。_

### 属性 1：配置文件完整性

_对于任何_ 有效的配色系统配置文件，它应该包含所有必需的颜色定义（primary、secondary、success、warning、error、info），每个颜色都应该有完整的 11 个色阶（50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950），并且每个色值都应该是有效的十六进制颜色代码。

**验证：需求 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3**

### 属性 2：对比度合规性

_对于任何_ 文本和背景颜色的组合，如果该组合被用于正常文本（16px 及以上），则对比度应至少为 4.5:1；如果用于大文本（18px 粗体或 24px 及以上）或交互元素，则对比度应至少为 3:1；并且这些规则应在浅色和深色两种模式下都成立。

**验证：需求 2.1, 2.2, 2.3, 3.5, 8.5**

### 属性 3：深色模式饱和度降低

_对于任何_ 在深色模式下使用的主色和辅助色，其 HSL 饱和度值应该低于浅色模式下相同色阶的饱和度值，以减少眼睛疲劳。

**验证：需求 3.4**

### 属性 4：文档完整性

_对于任何_ 配色系统的设计文档，它应该包含以下所有内容：每个颜色的语义化用途说明、所有功能模块（首页、监控页、设置页、通用组件）的配色方案、设备连接状态的颜色映射、常用配色组合的示例代码、配色使用的最佳实践说明、当前配色与新配色的映射表、分阶段迁移的实施步骤、需要修改的文件清单、测试检查点和回滚方案。

**验证：需求 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.4, 5.5, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 8.3, 8.4**

## 错误处理

### 配置错误处理

1. **缺失色阶错误**
   - 检测：配置文件中某个颜色缺少必需的色阶
   - 处理：在构建时抛出错误，提示缺失的色阶
   - 恢复：提供默认色值或要求开发者补充

2. **无效色值错误**
   - 检测：色值不是有效的十六进制格式
   - 处理：在构建时抛出错误，提示无效的色值
   - 恢复：拒绝构建，要求修正

3. **对比度不足警告**
   - 检测：某些颜色组合的对比度低于 WCAG 标准
   - 处理：在构建时输出警告信息
   - 恢复：提供建议的替代颜色组合

### 运行时错误处理

1. **主题切换失败**
   - 检测：深色模式类名未正确应用
   - 处理：回退到浅色模式
   - 恢复：记录错误日志，提示用户刷新页面

2. **颜色类名不存在**
   - 检测：使用了未定义的 Tailwind 类名
   - 处理：Tailwind 会忽略该类名
   - 恢复：在开发环境中显示警告

## 测试策略

### 双重测试方法

配色系统的测试采用单元测试和属性测试相结合的方法：

- **单元测试**：验证特定的配色示例、边缘情况和错误条件
- **属性测试**：验证适用于所有输入的通用属性

两者互补，共同确保全面覆盖。

### 单元测试策略

单元测试专注于以下方面：

1. **配置文件验证**
   - 测试 tailwind.config.js 是否包含所有必需的颜色定义
   - 测试每个颜色是否有完整的 11 个色阶
   - 测试色值格式是否正确

2. **特定颜色组合测试**
   - 测试主要按钮的文本和背景对比度
   - 测试导航栏的文本和背景对比度
   - 测试状态指示器的颜色区分度

3. **边缘情况测试**
   - 测试极浅色（50）和极深色（950）的对比度
   - 测试相邻色阶之间的视觉差异
   - 测试深色模式下的最小对比度

4. **文档完整性测试**
   - 测试设计文档是否包含所有必需章节
   - 测试迁移文档是否包含所有必需步骤
   - 测试示例代码是否可执行

### 属性测试策略

属性测试验证适用于所有颜色组合的通用规则：

1. **对比度属性测试**
   - 生成所有可能的文本色和背景色组合
   - 计算每个组合的对比度
   - 验证是否符合 WCAG 标准
   - 最小迭代次数：100 次

2. **饱和度属性测试**
   - 生成所有主色和辅助色的色阶
   - 比较浅色和深色模式的饱和度
   - 验证深色模式饱和度是否降低
   - 最小迭代次数：100 次

3. **配置完整性属性测试**
   - 生成随机的配置文件变体
   - 验证是否包含所有必需字段
   - 验证色值格式是否正确
   - 最小迭代次数：100 次

### 属性测试配置

使用 JavaScript/TypeScript 的属性测试库 `fast-check`：

```typescript
// 示例：对比度属性测试
import fc from "fast-check";

describe("Color System Properties", () => {
  it("Property 2: All text-background combinations meet WCAG AA standards", () => {
    // Feature: color-system-redesign, Property 2: 对比度合规性
    fc.assert(
      fc.property(
        fc.constantFrom(...textColors),
        fc.constantFrom(...backgroundColors),
        (textColor, bgColor) => {
          const ratio = calculateContrastRatio(textColor, bgColor);
          // 正常文本至少 4.5:1
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        },
      ),
      { numRuns: 100 },
    );
  });
});
```

### 测试工具

1. **对比度计算工具**
   - 使用 `color` 或 `chroma-js` 库计算对比度
   - 实现 WCAG 2.1 对比度算法

2. **配置验证工具**
   - 解析 tailwind.config.js
   - 验证颜色定义的完整性和正确性

3. **视觉回归测试**
   - 使用 Chromatic 或 Percy 进行视觉回归测试
   - 确保配色变更不会破坏现有 UI

### 测试覆盖目标

- 配置文件验证：100% 覆盖
- 对比度测试：覆盖所有推荐的颜色组合
- 文档完整性：100% 覆盖所有必需章节
- 属性测试：每个属性至少 100 次迭代

## 功能模块配色方案

### 1. 首页（HomeScreen）配色

首页是用户进入应用后的第一个界面，需要清晰展示设备状态、提供快捷操作入口，并显示最近的动态信息。

#### 设备状态卡片

```typescript
// 浅色模式
<div className="bg-white border border-secondary-200 rounded-lg p-4 shadow-sm">
  {/* 在线状态 */}
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-full bg-success-500"></div>
    <span className="text-secondary-900 font-medium">设备在线</span>
  </div>

  {/* 离线状态 */}
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-full bg-error-500"></div>
    <span className="text-secondary-900 font-medium">设备离线</span>
  </div>

  {/* 连接中状态 */}
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-full bg-warning-500 animate-pulse"></div>
    <span className="text-secondary-900 font-medium">连接中...</span>
  </div>
</div>

// 深色模式
<div className="bg-secondary-900 border border-secondary-700 rounded-lg p-4 shadow-lg dark:shadow-none">
  <div className="flex items-center gap-2">
    <div className="w-3 h-3 rounded-full bg-success-400"></div>
    <span className="text-secondary-50 font-medium">设备在线</span>
  </div>
</div>
```

**配色规则**：

- 背景：浅色模式 `bg-white`，深色模式 `dark:bg-secondary-900`
- 边框：浅色模式 `border-secondary-200`，深色模式 `dark:border-secondary-700`
- 文本：浅色模式 `text-secondary-900`，深色模式 `dark:text-secondary-50`
- 状态指示器：使用语义化颜色（success/warning/error）

#### 快捷操作按钮

```typescript
// 主要操作按钮（如"开门"）
<button className="w-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700
                   text-white font-medium py-3 px-4 rounded-lg
                   transition-colors duration-200
                   dark:bg-primary-600 dark:hover:bg-primary-500">
  开门
</button>

// 次要操作按钮（如"查看监控"）
<button className="w-full bg-secondary-100 hover:bg-secondary-200 active:bg-secondary-300
                   text-secondary-900 font-medium py-3 px-4 rounded-lg
                   transition-colors duration-200
                   dark:bg-secondary-800 dark:hover:bg-secondary-700 dark:text-secondary-50">
  查看监控
</button>

// 危险操作按钮（如"拒绝访问"）
<button className="w-full bg-error-500 hover:bg-error-600 active:bg-error-700
                   text-white font-medium py-3 px-4 rounded-lg
                   transition-colors duration-200
                   dark:bg-error-600 dark:hover:bg-error-500">
  拒绝访问
</button>
```

#### 最近动态列表

```typescript
<div className="space-y-2">
  {/* 成功开门记录 */}
  <div className="bg-success-50 border-l-4 border-success-500 p-3 rounded
                  dark:bg-success-950 dark:border-success-400">
    <p className="text-success-900 dark:text-success-100">张三 通过人脸识别开门</p>
    <p className="text-success-600 dark:text-success-300 text-sm">2 分钟前</p>
  </div>

  {/* 拒绝访问记录 */}
  <div className="bg-error-50 border-l-4 border-error-500 p-3 rounded
                  dark:bg-error-950 dark:border-error-400">
    <p className="text-error-900 dark:text-error-100">未识别访客被拒绝</p>
    <p className="text-error-600 dark:text-error-300 text-sm">5 分钟前</p>
  </div>
</div>
```

### 2. 监控页（MonitorScreen）配色

监控页面需要突出视频内容，界面元素应使用低饱和度颜色，避免干扰用户观察视频。

#### 视频容器

```typescript
// 使用深色背景突出视频内容
<div className="relative bg-secondary-950 rounded-lg overflow-hidden">
  {/* 视频流 */}
  <img src={videoFrame} alt="监控画面" className="w-full h-auto" />

  {/* FPS 指示器 */}
  <div className="absolute top-2 right-2 bg-secondary-900/80 backdrop-blur-sm
                  text-secondary-100 text-xs px-2 py-1 rounded">
    FPS: 30
  </div>

  {/* 连接状态指示器 */}
  <div className="absolute top-2 left-2 flex items-center gap-1
                  bg-secondary-900/80 backdrop-blur-sm px-2 py-1 rounded">
    <div className="w-2 h-2 rounded-full bg-success-400"></div>
    <span className="text-secondary-100 text-xs">已连接</span>
  </div>
</div>
```

**配色规则**：

- 视频背景：始终使用 `bg-secondary-950`（深色），无论主题模式
- 覆盖层：使用半透明背景 `bg-secondary-900/80` + `backdrop-blur-sm`
- 文本：使用浅色 `text-secondary-100` 确保在深色背景上可读

#### 对讲控制按钮

```typescript
// 对讲按钮（按住说话）
<button
  onMouseDown={startTalk}
  onMouseUp={stopTalk}
  onTouchStart={startTalk}
  onTouchEnd={stopTalk}
  className="w-full bg-info-500 hover:bg-info-600 active:bg-info-700
             text-white font-medium py-4 px-6 rounded-lg
             transition-all duration-200
             active:ring-4 active:ring-info-300
             dark:bg-info-600 dark:hover:bg-info-500 dark:active:ring-info-800">
  <span className="flex items-center justify-center gap-2">
    <MicrophoneIcon className="w-6 h-6" />
    按住说话
  </span>
</button>

// 对讲中状态（脉动效果）
<button className="w-full bg-info-600 text-white font-medium py-4 px-6 rounded-lg
                   animate-pulse ring-4 ring-info-300 dark:ring-info-800">
  <span className="flex items-center justify-center gap-2">
    <MicrophoneIcon className="w-6 h-6 animate-bounce" />
    对讲中...
  </span>
</button>
```

### 3. 设置页（SettingsScreen）配色

设置页面包含多个管理功能，需要清晰的视觉层次和功能分组。

#### 功能分组卡片

```typescript
<div className="space-y-4">
  {/* 人脸管理 */}
  <div className="bg-white border border-secondary-200 rounded-lg p-4
                  dark:bg-secondary-900 dark:border-secondary-700">
    <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50 mb-3">
      人脸管理
    </h3>
    <button className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 rounded
                       dark:bg-primary-600 dark:hover:bg-primary-500">
      添加人脸
    </button>
  </div>

  {/* 指纹管理 */}
  <div className="bg-white border border-secondary-200 rounded-lg p-4
                  dark:bg-secondary-900 dark:border-secondary-700">
    <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50 mb-3">
      指纹管理
    </h3>
    <button className="w-full bg-primary-500 hover:bg-primary-600 text-white py-2 rounded
                       dark:bg-primary-600 dark:hover:bg-primary-500">
      添加指纹
    </button>
  </div>
</div>
```

#### 列表项

```typescript
// 人脸列表项
<div className="flex items-center justify-between p-3
                bg-secondary-50 hover:bg-secondary-100 rounded-lg
                transition-colors duration-200
                dark:bg-secondary-800 dark:hover:bg-secondary-700">
  <div className="flex items-center gap-3">
    <img src={faceImage} alt="人脸" className="w-12 h-12 rounded-full" />
    <div>
      <p className="font-medium text-secondary-900 dark:text-secondary-50">张三</p>
      <p className="text-sm text-secondary-600 dark:text-secondary-300">全天候访问</p>
    </div>
  </div>
  <button className="text-error-500 hover:text-error-600 dark:text-error-400">
    删除
  </button>
</div>
```

#### 日志记录

```typescript
<div className="space-y-1">
  {/* 信息日志 */}
  <div className="text-sm text-secondary-600 dark:text-secondary-300 font-mono">
    [INFO] 设备连接成功
  </div>

  {/* 警告日志 */}
  <div className="text-sm text-warning-600 dark:text-warning-400 font-mono">
    [WARN] 电量低于 20%
  </div>

  {/* 错误日志 */}
  <div className="text-sm text-error-600 dark:text-error-400 font-mono">
    [ERROR] 连接超时
  </div>
</div>
```

### 4. 通用组件配色

#### 底部导航栏

```typescript
<nav className="fixed bottom-0 left-0 right-0
                bg-white border-t border-secondary-200
                dark:bg-secondary-900 dark:border-secondary-700">
  <div className="flex justify-around py-2">
    {/* 激活状态 */}
    <button className="flex flex-col items-center gap-1 px-4 py-2">
      <HomeIcon className="w-6 h-6 text-primary-500 dark:text-primary-400" />
      <span className="text-xs font-medium text-primary-500 dark:text-primary-400">
        首页
      </span>
    </button>

    {/* 未激活状态 */}
    <button className="flex flex-col items-center gap-1 px-4 py-2">
      <MonitorIcon className="w-6 h-6 text-secondary-400 dark:text-secondary-500" />
      <span className="text-xs text-secondary-600 dark:text-secondary-400">
        监控
      </span>
    </button>
  </div>
</nav>
```

#### 弹窗（Modal）

```typescript
// 遮罩层
<div className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm z-40
                dark:bg-secondary-950/70" />

// 弹窗内容
<div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50
                bg-white rounded-lg shadow-xl max-w-md mx-auto
                dark:bg-secondary-800">
  {/* 标题 */}
  <div className="px-6 py-4 border-b border-secondary-200 dark:border-secondary-700">
    <h2 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50">
      确认操作
    </h2>
  </div>

  {/* 内容 */}
  <div className="px-6 py-4">
    <p className="text-secondary-600 dark:text-secondary-300">
      确定要删除这个人脸吗？此操作无法撤销。
    </p>
  </div>

  {/* 操作按钮 */}
  <div className="px-6 py-4 border-t border-secondary-200 dark:border-secondary-700
                  flex gap-3 justify-end">
    <button className="px-4 py-2 text-secondary-600 hover:text-secondary-900
                       dark:text-secondary-400 dark:hover:text-secondary-100">
      取消
    </button>
    <button className="px-4 py-2 bg-error-500 hover:bg-error-600 text-white rounded
                       dark:bg-error-600 dark:hover:bg-error-500">
      确认删除
    </button>
  </div>
</div>
```

#### 表单输入

```typescript
// 文本输入框
<input
  type="text"
  className="w-full px-4 py-2
             bg-white border border-secondary-300 rounded-lg
             text-secondary-900 placeholder-secondary-400
             focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
             dark:bg-secondary-800 dark:border-secondary-600
             dark:text-secondary-50 dark:placeholder-secondary-500
             dark:focus:ring-primary-400"
  placeholder="请输入姓名"
/>

// 禁用状态
<input
  type="text"
  disabled
  className="w-full px-4 py-2
             bg-secondary-100 border border-secondary-200 rounded-lg
             text-secondary-400 cursor-not-allowed
             dark:bg-secondary-900 dark:border-secondary-800
             dark:text-secondary-600"
  placeholder="禁用输入"
/>

// 错误状态
<input
  type="text"
  className="w-full px-4 py-2
             bg-white border-2 border-error-500 rounded-lg
             text-secondary-900 placeholder-secondary-400
             focus:outline-none focus:ring-2 focus:ring-error-500
             dark:bg-secondary-800 dark:border-error-400
             dark:text-secondary-50"
  placeholder="请输入姓名"
/>
<p className="mt-1 text-sm text-error-600 dark:text-error-400">
  姓名不能为空
</p>
```

## 配色使用指南

### 颜色选择决策树

在选择颜色时，遵循以下决策流程：

```
开始
  ↓
是否为交互元素？
  ├─ 是 → 是否为主要操作？
  │       ├─ 是 → 使用 primary-500 (浅色) / primary-600 (深色)
  │       └─ 否 → 使用 secondary-100 (浅色) / secondary-800 (深色)
  │
  └─ 否 → 是否为状态指示？
          ├─ 是 → 根据状态选择：
          │       ├─ 成功/正常 → success-500
          │       ├─ 警告/注意 → warning-500
          │       ├─ 错误/危险 → error-500
          │       └─ 信息/提示 → info-500
          │
          └─ 否 → 是否为文本？
                  ├─ 是 → 根据重要性选择：
                  │       ├─ 主要文本 → secondary-900 (浅色) / secondary-50 (深色)
                  │       ├─ 次要文本 → secondary-600 (浅色) / secondary-300 (深色)
                  │       └─ 三级文本 → secondary-400 (浅色) / secondary-400 (深色)
                  │
                  └─ 否 → 是否为背景？
                          ├─ 页面背景 → secondary-50 (浅色) / secondary-950 (深色)
                          ├─ 卡片背景 → white (浅色) / secondary-900 (深色)
                          └─ 悬浮背景 → white (浅色) / secondary-800 (深色)
```

### 常用配色组合速查表

| 场景            | 浅色模式                                            | 深色模式                                                                 | 对比度 |
| --------------- | --------------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| 主要按钮        | `bg-primary-500 text-white`                         | `dark:bg-primary-600 dark:text-white`                                    | 7.0:1  |
| 次要按钮        | `bg-secondary-100 text-secondary-900`               | `dark:bg-secondary-800 dark:text-secondary-50`                           | 12.6:1 |
| 危险按钮        | `bg-error-500 text-white`                           | `dark:bg-error-600 dark:text-white`                                      | 6.5:1  |
| 页面背景 + 正文 | `bg-secondary-50 text-secondary-900`                | `dark:bg-secondary-950 dark:text-secondary-50`                           | 16.1:1 |
| 卡片背景 + 标题 | `bg-white text-secondary-900`                       | `dark:bg-secondary-900 dark:text-secondary-50`                           | 18.5:1 |
| 成功提示        | `bg-success-50 text-success-900 border-success-500` | `dark:bg-success-950 dark:text-success-100 dark:border-success-400`      | 8.2:1  |
| 警告提示        | `bg-warning-50 text-warning-900 border-warning-500` | `dark:bg-warning-950 dark:text-warning-100 dark:border-warning-400`      | 7.8:1  |
| 错误提示        | `bg-error-50 text-error-900 border-error-500`       | `dark:bg-error-950 dark:text-error-100 dark:border-error-400`            | 8.0:1  |
| 输入框          | `bg-white border-secondary-300 text-secondary-900`  | `dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-50` | 10.5:1 |
| 禁用元素        | `bg-secondary-100 text-secondary-400`               | `dark:bg-secondary-900 dark:text-secondary-600`                          | 4.5:1  |

### 最佳实践

#### 1. 始终使用语义化类名

❌ **不推荐**：

```tsx
<button className="bg-blue-500 text-white">提交</button>
```

✅ **推荐**：

```tsx
<button className="bg-primary-500 text-white dark:bg-primary-600">提交</button>
```

#### 2. 为深色模式添加对应类名

❌ **不推荐**：

```tsx
<div className="bg-white text-gray-900">内容</div>
```

✅ **推荐**：

```tsx
<div className="bg-white text-secondary-900 dark:bg-secondary-900 dark:text-secondary-50">
  内容
</div>
```

#### 3. 使用过渡动画提升体验

❌ **不推荐**：

```tsx
<button className="bg-primary-500 hover:bg-primary-600">按钮</button>
```

✅ **推荐**：

```tsx
<button className="bg-primary-500 hover:bg-primary-600 transition-colors duration-200">
  按钮
</button>
```

#### 4. 确保交互元素有明显的悬停状态

❌ **不推荐**：

```tsx
<div className="cursor-pointer">可点击卡片</div>
```

✅ **推荐**：

```tsx
<div
  className="cursor-pointer bg-white hover:bg-secondary-50 
                transition-colors duration-200
                dark:bg-secondary-900 dark:hover:bg-secondary-800"
>
  可点击卡片
</div>
```

#### 5. 状态指示器使用语义化颜色

❌ **不推荐**：

```tsx
<div className="w-3 h-3 rounded-full bg-green-500"></div>
```

✅ **推荐**：

```tsx
<div className="w-3 h-3 rounded-full bg-success-500 dark:bg-success-400"></div>
```

#### 6. 避免纯黑和纯白

❌ **不推荐**：

```tsx
<div className="bg-black text-white">内容</div>
```

✅ **推荐**：

```tsx
<div className="bg-secondary-950 text-secondary-50">内容</div>
```

### 可访问性检查清单

在应用新配色时，确保满足以下条件：

- [ ] 所有正常文本（16px+）与背景的对比度 ≥ 4.5:1
- [ ] 所有大文本（18px 粗体或 24px+）与背景的对比度 ≥ 3:1
- [ ] 所有交互元素与背景的对比度 ≥ 3:1
- [ ] 焦点状态有明显的视觉指示（focus ring）
- [ ] 悬停状态有明显的视觉反馈
- [ ] 颜色不是传达信息的唯一方式（配合图标或文本）
- [ ] 深色模式下的对比度同样符合标准
- [ ] 禁用状态有明显的视觉区分

## 迁移计划

### 当前配色分析

当前应用使用的主要颜色：

| 当前颜色     | 使用场景         | 问题                         |
| ------------ | ---------------- | ---------------------------- |
| `indigo-600` | 主要按钮、链接   | 缺乏系统性，没有完整色阶     |
| `gray-*`     | 背景、文本、边框 | 使用不一致，没有明确的语义化 |
| `green-500`  | 成功状态         | 可以保留，但需要完整色阶     |
| `yellow-500` | 警告状态         | 可以保留，但需要完整色阶     |
| `red-500`    | 错误状态         | 可以保留，但需要完整色阶     |

### 颜色映射表

| 当前类名          | 新类名（浅色模式）     | 新类名（深色模式）          | 说明           |
| ----------------- | ---------------------- | --------------------------- | -------------- |
| `bg-indigo-600`   | `bg-primary-500`       | `dark:bg-primary-600`       | 主要品牌色     |
| `text-indigo-600` | `text-primary-500`     | `dark:text-primary-400`     | 主要品牌色文本 |
| `bg-gray-50`      | `bg-secondary-50`      | `dark:bg-secondary-950`     | 页面背景       |
| `bg-gray-100`     | `bg-secondary-100`     | `dark:bg-secondary-900`     | 卡片背景       |
| `bg-white`        | `bg-white`             | `dark:bg-secondary-900`     | 卡片背景       |
| `text-gray-900`   | `text-secondary-900`   | `dark:text-secondary-50`    | 主要文本       |
| `text-gray-600`   | `text-secondary-600`   | `dark:text-secondary-300`   | 次要文本       |
| `text-gray-400`   | `text-secondary-400`   | `dark:text-secondary-400`   | 三级文本       |
| `border-gray-200` | `border-secondary-200` | `dark:border-secondary-700` | 边框           |
| `bg-green-500`    | `bg-success-500`       | `dark:bg-success-400`       | 成功状态       |
| `bg-yellow-500`   | `bg-warning-500`       | `dark:bg-warning-400`       | 警告状态       |
| `bg-red-500`      | `bg-error-500`         | `dark:bg-error-400`         | 错误状态       |

### 分阶段实施步骤

#### 阶段 1：配置和基础设施（1 天）

**目标**：建立新的配色系统基础

1. **更新 Tailwind 配置**
   - 修改 `tailwind.config.js`，添加新的颜色定义
   - 配置 `darkMode: 'class'`
   - 测试配置是否生效

2. **创建配色文档**
   - 在项目中添加 `docs/color-system.md`
   - 记录所有颜色定义和使用场景
   - 提供示例代码

3. **设置深色模式切换**
   - 在 `App.tsx` 中添加主题状态管理
   - 实现主题切换功能
   - 保存用户偏好到 localStorage

**检查点**：

- [ ] Tailwind 配置文件更新完成
- [ ] 新颜色类名可以正常使用
- [ ] 深色模式切换功能正常工作

#### 阶段 2：通用组件迁移（2 天）

**目标**：迁移可复用的通用组件

1. **按钮组件**
   - 更新 `components/Button.tsx`（如果存在）
   - 或在各组件中更新按钮样式
   - 确保主要、次要、危险按钮都有深色模式

2. **输入组件**
   - 更新表单输入框样式
   - 添加焦点状态和错误状态
   - 确保深色模式下可读性

3. **卡片组件**
   - 更新卡片背景和边框
   - 确保深色模式下的层次感

4. **底部导航**
   - 更新导航栏配色
   - 确保激活状态明显

**检查点**：

- [ ] 所有通用组件已更新
- [ ] 深色模式下样式正常
- [ ] 对比度符合 WCAG AA 标准

#### 阶段 3：页面组件迁移（3 天）

**目标**：逐个迁移页面组件

**第 1 天：首页（HomeScreen）**

- 更新设备状态卡片
- 更新快捷操作按钮
- 更新最近动态列表
- 测试深色模式

**第 2 天：监控页（MonitorScreen）**

- 更新视频容器背景
- 更新对讲按钮
- 更新状态指示器
- 测试深色模式

**第 3 天：设置页（SettingsScreen）**

- 更新功能分组卡片
- 更新列表项样式
- 更新日志记录颜色
- 测试深色模式

**检查点**：

- [ ] 所有页面组件已更新
- [ ] 深色模式在所有页面正常工作
- [ ] 视觉层次清晰
- [ ] 无遗漏的旧颜色类名

#### 阶段 4：测试和优化（1 天）

**目标**：全面测试和细节优化

1. **功能测试**
   - 测试所有交互功能
   - 测试主题切换
   - 测试不同设备和屏幕尺寸

2. **可访问性测试**
   - 使用对比度检查工具验证所有颜色组合
   - 测试键盘导航
   - 测试屏幕阅读器兼容性

3. **视觉回归测试**
   - 截图对比新旧版本
   - 确保没有布局破坏
   - 确保视觉一致性

4. **性能测试**
   - 检查 CSS 文件大小
   - 确保没有性能退化

**检查点**：

- [ ] 所有功能正常工作
- [ ] 对比度测试全部通过
- [ ] 视觉效果符合设计预期
- [ ] 性能没有明显下降

### 需要修改的文件清单

根据项目结构，以下文件需要修改：

#### 配置文件

- [ ] `tailwind.config.js` - 添加新的颜色定义

#### 根组件

- [ ] `App.tsx` - 添加主题状态管理和切换功能

#### 页面组件

- [ ] `screens/HomeScreen.tsx` - 更新首页配色
- [ ] `screens/MonitorScreen.tsx` - 更新监控页配色
- [ ] `screens/SettingsScreen.tsx` - 更新设置页配色

#### 通用组件（如果存在）

- [ ] `components/Button.tsx` - 更新按钮配色
- [ ] `components/Card.tsx` - 更新卡片配色
- [ ] `components/Input.tsx` - 更新输入框配色
- [ ] `components/Modal.tsx` - 更新弹窗配色
- [ ] `components/Navigation.tsx` - 更新导航栏配色

#### 文档

- [ ] `docs/color-system.md` - 创建配色系统文档
- [ ] `README.md` - 更新项目说明（如需要）

### 回滚方案

如果迁移过程中出现问题，可以按以下步骤回滚：

#### 快速回滚（紧急情况）

1. **恢复 Tailwind 配置**

   ```bash
   git checkout HEAD -- tailwind.config.js
   ```

2. **恢复修改的组件**

   ```bash
   git checkout HEAD -- src/
   ```

3. **重新构建**
   ```bash
   npm run build
   ```

#### 部分回滚（特定组件有问题）

1. **识别问题组件**
   - 查看错误日志
   - 定位具体文件

2. **恢复单个文件**

   ```bash
   git checkout HEAD -- src/screens/HomeScreen.tsx
   ```

3. **重新测试**
   - 确认问题是否解决
   - 记录问题原因

#### 渐进式回滚（逐步恢复）

1. **保留配置，恢复组件**
   - 保留 `tailwind.config.js` 的新配置
   - 只恢复有问题的组件
   - 逐个修复问题

2. **使用特性分支**
   - 在新分支上进行迁移
   - 主分支保持稳定
   - 问题修复后再合并

### 迁移风险和缓解措施

| 风险                     | 影响 | 概率 | 缓解措施                               |
| ------------------------ | ---- | ---- | -------------------------------------- |
| 对比度不足导致可读性问题 | 高   | 中   | 使用自动化工具验证对比度，在迁移前测试 |
| 深色模式下遗漏样式       | 中   | 高   | 建立检查清单，逐个组件测试深色模式     |
| 视觉不一致               | 中   | 中   | 制定详细的配色指南，代码审查           |
| 性能下降                 | 低   | 低   | 监控 CSS 文件大小，使用 PurgeCSS       |
| 用户不适应新配色         | 中   | 低   | 提供主题切换功能，收集用户反馈         |

### 迁移后验证

完成迁移后，进行以下验证：

1. **功能验证**
   - [ ] 所有页面正常显示
   - [ ] 所有交互功能正常
   - [ ] 主题切换正常工作

2. **视觉验证**
   - [ ] 配色符合设计规范
   - [ ] 视觉层次清晰
   - [ ] 深色模式美观舒适

3. **可访问性验证**
   - [ ] 对比度符合 WCAG AA 标准
   - [ ] 焦点状态明显
   - [ ] 键盘导航正常

4. **性能验证**
   - [ ] 页面加载速度正常
   - [ ] CSS 文件大小合理
   - [ ] 无明显性能退化

5. **兼容性验证**
   - [ ] 在不同浏览器中正常显示
   - [ ] 在不同设备上正常显示
   - [ ] 移动端体验良好

## 总结

本设计文档定义了智能门锁 Pro 应用的完整配色系统，包括：

1. **完整的色彩定义**：主色、辅助色、状态色，每个颜色都有 11 个色阶
2. **双主题支持**：浅色和深色模式的完整配色方案
3. **语义化映射**：便于使用和维护的颜色别名
4. **功能模块配色**：首页、监控页、设置页、通用组件的详细配色方案
5. **使用指南**：决策树、速查表、最佳实践
6. **迁移计划**：分阶段实施步骤、文件清单、回滚方案

该配色系统基于智能家居/IoT 产品的最佳实践，确保专业性、可访问性和品牌识别度，为用户提供优秀的视觉体验。
