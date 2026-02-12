# 组件目录

本目录包含智能门锁 Pro 应用的可复用 UI 组件。

## 组件列表

### Button.tsx

可复用按钮组件，支持四种变体（primary、secondary、error、info）和三种尺寸（sm、md、lg）。

**特性：**

- 完整的深色模式支持
- 悬停、激活、禁用状态
- 符合 WCAG AA 可访问性标准
- 焦点环和键盘导航支持

**使用示例：**

```tsx
import { Button } from "@/components/Button";

<Button variant="primary" onClick={handleSubmit}>
  提交
</Button>;
```

详细文档：[Button.examples.md](./Button.examples.md)

### buttonStyles.ts

按钮样式工具模块，提供预定义的样式常量和辅助函数。

**导出内容：**

- `primaryButtonStyles` - 主要按钮样式
- `secondaryButtonStyles` - 次要按钮样式
- `errorButtonStyles` - 危险按钮样式
- `infoButtonStyles` - 信息按钮样式
- `iconButtonStyles` - 图标按钮样式
- `dashedButtonStyles` - 虚线边框按钮样式
- `textButtonStyles` - 文本按钮样式
- `getButtonClasses()` - 样式组合辅助函数

**使用示例：**

```tsx
import { primaryButtonStyles } from "@/components/buttonStyles";

<button className={primaryButtonStyles}>提交</button>;
```

### BottomNav.tsx

底部导航栏组件，用于在首页、监控、设置三个主页面之间切换。

### VisitNotificationModal.tsx

到访通知弹窗组件，显示访客信息、识别结果和开门状态。

## 测试

按钮组件的测试文件位于 `test/button.test.ts`，包含 30 个测试用例，覆盖：

- 基本按钮样式
- 按钮尺寸
- 图标按钮
- 虚线边框按钮
- 文本按钮
- 状态样式（悬停、激活、禁用）
- 深色模式支持
- 可访问性

运行测试：

```bash
npm test -- button.test.ts --run
```

## 可视化测试

打开 `test-buttons.html` 文件可以在浏览器中查看所有按钮样式的可视化效果，包括：

- 基本按钮变体
- 按钮尺寸
- 按钮状态
- 图标按钮
- 虚线边框按钮
- 文本按钮
- 实际场景示例

## 配色系统

所有组件都遵循智能门锁 Pro 的配色系统规范，详见 `docs/color-system.md`。

## 需求追溯

按钮组件满足以下需求：

- 需求 4.4：为通用组件定义配色方案
- 需求 5.4：提供常用配色组合的示例代码
- 需求 6.3：在关键界面元素中突出品牌色
