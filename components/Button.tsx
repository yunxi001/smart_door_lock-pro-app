import React from "react";

/**
 * 按钮变体类型
 * - primary: 主要操作按钮（科技蓝）
 * - secondary: 次要操作按钮（智能灰）
 * - error: 危险操作按钮（危险红）
 * - info: 信息操作按钮（信息蓝）
 */
export type ButtonVariant = "primary" | "secondary" | "error" | "info";

/**
 * 按钮尺寸类型
 * - sm: 小尺寸
 * - md: 中等尺寸（默认）
 * - lg: 大尺寸
 */
export type ButtonSize = "sm" | "md" | "lg";

/**
 * 按钮组件属性接口
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体，默认为 primary */
  variant?: ButtonVariant;
  /** 按钮尺寸，默认为 md */
  size?: ButtonSize;
  /** 是否为全宽按钮 */
  fullWidth?: boolean;
  /** 子元素 */
  children: React.ReactNode;
}

/**
 * 获取按钮变体的样式类名
 * 需求: 4.4, 5.4, 6.3
 */
const getVariantClasses = (variant: ButtonVariant): string => {
  const variants: Record<ButtonVariant, string> = {
    // 主要按钮 - 科技蓝
    primary: `
      bg-primary-500 text-white
      hover:bg-primary-600 
      active:bg-primary-700
      disabled:bg-secondary-300 disabled:text-secondary-500 disabled:cursor-not-allowed
      dark:bg-primary-600 
      dark:hover:bg-primary-500 
      dark:active:bg-primary-400
      dark:disabled:bg-secondary-700 dark:disabled:text-secondary-500
    `,
    // 次要按钮 - 智能灰
    secondary: `
      bg-secondary-100 text-secondary-900
      hover:bg-secondary-200 
      active:bg-secondary-300
      disabled:bg-secondary-100 disabled:text-secondary-400 disabled:cursor-not-allowed
      dark:bg-secondary-800 dark:text-secondary-50
      dark:hover:bg-secondary-700 
      dark:active:bg-secondary-600
      dark:disabled:bg-secondary-900 dark:disabled:text-secondary-600
    `,
    // 危险按钮 - 危险红
    error: `
      bg-error-500 text-white
      hover:bg-error-600 
      active:bg-error-700
      disabled:bg-secondary-300 disabled:text-secondary-500 disabled:cursor-not-allowed
      dark:bg-error-600 
      dark:hover:bg-error-500 
      dark:active:bg-error-400
      dark:disabled:bg-secondary-700 dark:disabled:text-secondary-500
    `,
    // 信息按钮 - 信息蓝
    info: `
      bg-info-500 text-white
      hover:bg-info-600 
      active:bg-info-700
      disabled:bg-secondary-300 disabled:text-secondary-500 disabled:cursor-not-allowed
      dark:bg-info-600 
      dark:hover:bg-info-500 
      dark:active:bg-info-400
      dark:disabled:bg-secondary-700 dark:disabled:text-secondary-500
    `,
  };

  return variants[variant];
};

/**
 * 获取按钮尺寸的样式类名
 */
const getSizeClasses = (size: ButtonSize): string => {
  const sizes: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return sizes[size];
};

/**
 * 可复用按钮组件
 *
 * 支持四种变体：primary（主要）、secondary（次要）、error（危险）、info（信息）
 * 支持三种尺寸：sm（小）、md（中）、lg（大）
 * 支持深色模式自动适配
 * 支持悬停、激活、禁用状态
 *
 * 需求: 4.4, 5.4, 6.3
 *
 * @example
 * // 主要按钮
 * <Button variant="primary" onClick={handleSubmit}>提交</Button>
 *
 * @example
 * // 危险按钮（全宽）
 * <Button variant="error" fullWidth onClick={handleDelete}>删除</Button>
 *
 * @example
 * // 次要按钮（小尺寸）
 * <Button variant="secondary" size="sm" onClick={handleCancel}>取消</Button>
 */
export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  children,
  disabled = false,
  ...props
}) => {
  // 组合所有样式类名
  const buttonClasses = `
    ${getVariantClasses(variant)}
    ${getSizeClasses(size)}
    ${fullWidth ? "w-full" : ""}
    font-medium rounded-lg
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    ${variant === "primary" ? "focus:ring-primary-500 dark:focus:ring-primary-400" : ""}
    ${variant === "secondary" ? "focus:ring-secondary-400 dark:focus:ring-secondary-600" : ""}
    ${variant === "error" ? "focus:ring-error-500 dark:focus:ring-error-400" : ""}
    ${variant === "info" ? "focus:ring-info-500 dark:focus:ring-info-400" : ""}
    ${className}
  `
    .replace(/\s+/g, " ")
    .trim();

  return (
    <button className={buttonClasses} disabled={disabled} {...props}>
      {children}
    </button>
  );
};
