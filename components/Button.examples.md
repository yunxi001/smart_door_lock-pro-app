# Button 组件使用示例

## 基本用法

### 1. 使用 Button 组件

```tsx
import { Button } from "@/components/Button";

// 主要按钮
<Button variant="primary" onClick={handleSubmit}>
  提交
</Button>

// 次要按钮
<Button variant="secondary" onClick={handleCancel}>
  取消
</Button>

// 危险按钮
<Button variant="error" onClick={handleDelete}>
  删除
</Button>

// 信息按钮
<Button variant="info" onClick={handleInfo}>
  查看详情
</Button>
```

### 2. 不同尺寸

```tsx
// 小尺寸
<Button variant="primary" size="sm">
  小按钮
</Button>

// 中等尺寸（默认）
<Button variant="primary" size="md">
  中等按钮
</Button>

// 大尺寸
<Button variant="primary" size="lg">
  大按钮
</Button>
```

### 3. 全宽按钮

```tsx
<Button variant="primary" fullWidth>
  全宽按钮
</Button>
```

### 4. 禁用状态

```tsx
<Button variant="primary" disabled>
  禁用按钮
</Button>
```

### 5. 带图标的按钮

```tsx
import { Plus } from "lucide-react";

<Button variant="primary">
  <Plus size={20} className="mr-2" />
  添加人脸
</Button>;
```

## 使用样式常量

如果不想使用 Button 组件，可以直接使用样式常量：

```tsx
import {
  primaryButtonStyles,
  secondaryButtonStyles,
  errorButtonStyles,
  infoButtonStyles,
  buttonSizes,
  getButtonClasses,
} from "@/components/buttonStyles";

// 方式 1: 直接使用预定义样式
<button className={`${primaryButtonStyles} ${buttonSizes.md} w-full`}>
  提交
</button>

// 方式 2: 使用辅助函数
<button className={getButtonClasses("primary", "md", true)}>
  提交
</button>
```

## 图标按钮

```tsx
import { iconButtonStyles } from "@/components/buttonStyles";
import { Edit2, Trash2 } from "lucide-react";

// 编辑按钮
<button className={iconButtonStyles.primary}>
  <Edit2 size={18} />
</button>

// 删除按钮
<button className={iconButtonStyles.error}>
  <Trash2 size={18} />
</button>
```

## 虚线边框按钮

用于添加操作：

```tsx
import { dashedButtonStyles } from "@/components/buttonStyles";
import { Plus } from "lucide-react";

<button className={dashedButtonStyles.primary}>
  <Plus size={20} />
  <span>添加人脸</span>
</button>;
```

## 文本按钮

无背景的文本按钮：

```tsx
import { textButtonStyles } from "@/components/buttonStyles";

<button className={textButtonStyles.secondary}>取消</button>;
```

## 实际场景示例

### 表单提交

```tsx
<div className="flex gap-3">
  <Button variant="secondary" onClick={handleCancel}>
    取消
  </Button>
  <Button variant="primary" onClick={handleSubmit} fullWidth>
    提交
  </Button>
</div>
```

### 确认对话框

```tsx
<div className="flex gap-3">
  <Button variant="secondary" onClick={handleClose} fullWidth>
    取消
  </Button>
  <Button variant="error" onClick={handleConfirm} fullWidth>
    确认删除
  </Button>
</div>
```

### 列表操作

```tsx
<div className="flex items-center justify-between">
  <div>
    <h3>张三</h3>
    <p>全天候访问</p>
  </div>
  <div className="flex gap-2">
    <button className={iconButtonStyles.primary}>
      <Edit2 size={18} />
    </button>
    <button className={iconButtonStyles.error}>
      <Trash2 size={18} />
    </button>
  </div>
</div>
```

### 添加项目

```tsx
<button className={dashedButtonStyles.primary}>
  <Plus size={20} />
  <span>添加指纹</span>
</button>
```

## 深色模式

所有按钮样式都自动支持深色模式，无需额外配置。当应用切换到深色模式时（通过在根元素添加 `dark` 类），按钮会自动使用深色模式的颜色。

```tsx
// 自动适配深色模式
<Button variant="primary">提交</Button>
```

## 可访问性

所有按钮都包含：

- 焦点环（focus ring）用于键盘导航
- 禁用状态的视觉反馈
- 适当的对比度（符合 WCAG AA 标准）
- 过渡动画提升用户体验

## 迁移指南

### 从旧样式迁移

```tsx
// 旧样式
<button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold shadow-md active:bg-indigo-700 transition-colors">
  提交
</button>

// 新样式（使用组件）
<Button variant="primary" fullWidth>
  提交
</Button>

// 新样式（使用样式常量）
<button className={getButtonClasses("primary", "lg", true)}>
  提交
</button>
```

### 常见映射

| 旧样式          | 新组件                         |
| --------------- | ------------------------------ |
| `bg-indigo-600` | `<Button variant="primary">`   |
| `bg-slate-100`  | `<Button variant="secondary">` |
| `bg-red-500`    | `<Button variant="error">`     |
| `bg-cyan-500`   | `<Button variant="info">`      |
