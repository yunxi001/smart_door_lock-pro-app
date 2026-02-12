/**
 * 按钮样式工具
 *
 * 提供可复用的按钮样式类名常量，供不使用 Button 组件的场景使用
 * 需求: 4.4, 5.4, 6.3
 */

/**
 * 主要按钮样式（科技蓝）
 * 用于主要操作，如提交、确认、开门等
 */
export const primaryButtonStyles = `
  bg-primary-500 text-white
  hover:bg-primary-600 
  active:bg-primary-700
  disabled:bg-secondary-300 disabled:text-secondary-500 disabled:cursor-not-allowed
  dark:bg-primary-600 
  dark:hover:bg-primary-500 
  dark:active:bg-primary-400
  dark:disabled:bg-secondary-700 dark:disabled:text-secondary-500
  font-medium rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
  dark:focus:ring-primary-400
`
  .replace(/\s+/g, " ")
  .trim();

/**
 * 次要按钮样式（智能灰）
 * 用于次要操作，如取消、返回等
 */
export const secondaryButtonStyles = `
  bg-secondary-100 text-secondary-900
  hover:bg-secondary-200 
  active:bg-secondary-300
  disabled:bg-secondary-100 disabled:text-secondary-400 disabled:cursor-not-allowed
  dark:bg-secondary-800 dark:text-secondary-50
  dark:hover:bg-secondary-700 
  dark:active:bg-secondary-600
  dark:disabled:bg-secondary-900 dark:disabled:text-secondary-600
  font-medium rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:ring-offset-2
  dark:focus:ring-secondary-600
`
  .replace(/\s+/g, " ")
  .trim();

/**
 * 危险按钮样式（危险红）
 * 用于危险操作，如删除、拒绝访问等
 */
export const errorButtonStyles = `
  bg-error-500 text-white
  hover:bg-error-600 
  active:bg-error-700
  disabled:bg-secondary-300 disabled:text-secondary-500 disabled:cursor-not-allowed
  dark:bg-error-600 
  dark:hover:bg-error-500 
  dark:active:bg-error-400
  dark:disabled:bg-secondary-700 dark:disabled:text-secondary-500
  font-medium rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2
  dark:focus:ring-error-400
`
  .replace(/\s+/g, " ")
  .trim();

/**
 * 信息按钮样式（信息蓝）
 * 用于信息操作，如查看详情、对讲等
 */
export const infoButtonStyles = `
  bg-info-500 text-white
  hover:bg-info-600 
  active:bg-info-700
  disabled:bg-secondary-300 disabled:text-secondary-500 disabled:cursor-not-allowed
  dark:bg-info-600 
  dark:hover:bg-info-500 
  dark:active:bg-info-400
  dark:disabled:bg-secondary-700 dark:disabled:text-secondary-500
  font-medium rounded-lg
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-info-500 focus:ring-offset-2
  dark:focus:ring-info-400
`
  .replace(/\s+/g, " ")
  .trim();

/**
 * 按钮尺寸样式
 */
export const buttonSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
} as const;

/**
 * 图标按钮样式（圆形）
 * 用于只包含图标的按钮，如编辑、删除等
 */
export const iconButtonStyles = {
  primary: `
    p-2 text-primary-500 
    hover:text-primary-600 hover:bg-primary-50 
    active:bg-primary-100
    rounded-full transition-colors duration-200
    dark:text-primary-400 
    dark:hover:bg-primary-900 
    dark:active:bg-primary-800
  `
    .replace(/\s+/g, " ")
    .trim(),

  secondary: `
    p-2 text-secondary-600 
    hover:text-secondary-900 hover:bg-secondary-100 
    active:bg-secondary-200
    rounded-full transition-colors duration-200
    dark:text-secondary-400 
    dark:hover:text-secondary-100 dark:hover:bg-secondary-800 
    dark:active:bg-secondary-700
  `
    .replace(/\s+/g, " ")
    .trim(),

  error: `
    p-2 text-error-500 
    hover:text-error-600 hover:bg-error-50 
    active:bg-error-100
    rounded-full transition-colors duration-200
    dark:text-error-400 
    dark:hover:bg-error-900 
    dark:active:bg-error-800
  `
    .replace(/\s+/g, " ")
    .trim(),

  info: `
    p-2 text-info-500 
    hover:text-info-600 hover:bg-info-50 
    active:bg-info-100
    rounded-full transition-colors duration-200
    dark:text-info-400 
    dark:hover:bg-info-900 
    dark:active:bg-info-800
  `
    .replace(/\s+/g, " ")
    .trim(),
} as const;

/**
 * 虚线边框按钮样式
 * 用于添加操作，如"添加人脸"、"添加指纹"等
 */
export const dashedButtonStyles = {
  primary: `
    w-full py-4 
    bg-primary-50 text-primary-600 
    hover:bg-primary-100 
    active:bg-primary-200
    rounded-xl font-medium 
    transition-colors duration-200
    flex items-center justify-center space-x-2 
    border-2 border-dashed border-primary-200
    dark:bg-primary-950 dark:text-primary-400 
    dark:hover:bg-primary-900 
    dark:border-primary-800
  `
    .replace(/\s+/g, " ")
    .trim(),

  secondary: `
    w-full py-4 
    bg-secondary-50 text-secondary-600 
    hover:bg-secondary-100 
    active:bg-secondary-200
    rounded-xl font-medium 
    transition-colors duration-200
    flex items-center justify-center space-x-2 
    border-2 border-dashed border-secondary-200
    dark:bg-secondary-900 dark:text-secondary-400 
    dark:hover:bg-secondary-800 
    dark:border-secondary-700
  `
    .replace(/\s+/g, " ")
    .trim(),
} as const;

/**
 * 文本按钮样式（无背景）
 * 用于次要操作，如"取消"、"跳过"等
 */
export const textButtonStyles = {
  primary: `
    text-primary-600 
    hover:text-primary-700 hover:underline
    active:text-primary-800
    transition-colors duration-200
    dark:text-primary-400 
    dark:hover:text-primary-300
  `
    .replace(/\s+/g, " ")
    .trim(),

  secondary: `
    text-secondary-600 
    hover:text-secondary-900 hover:underline
    active:text-secondary-950
    transition-colors duration-200
    dark:text-secondary-400 
    dark:hover:text-secondary-100
  `
    .replace(/\s+/g, " ")
    .trim(),

  error: `
    text-error-600 
    hover:text-error-700 hover:underline
    active:text-error-800
    transition-colors duration-200
    dark:text-error-400 
    dark:hover:text-error-300
  `
    .replace(/\s+/g, " ")
    .trim(),
} as const;

/**
 * 组合按钮样式的辅助函数
 *
 * @param variant - 按钮变体
 * @param size - 按钮尺寸
 * @param fullWidth - 是否全宽
 * @param additionalClasses - 额外的类名
 * @returns 组合后的类名字符串
 *
 * @example
 * const buttonClass = getButtonClasses('primary', 'md', true);
 */
export const getButtonClasses = (
  variant: "primary" | "secondary" | "error" | "info",
  size: "sm" | "md" | "lg" = "md",
  fullWidth: boolean = false,
  additionalClasses: string = "",
): string => {
  const variantStyles = {
    primary: primaryButtonStyles,
    secondary: secondaryButtonStyles,
    error: errorButtonStyles,
    info: infoButtonStyles,
  };

  return `
    ${variantStyles[variant]}
    ${buttonSizes[size]}
    ${fullWidth ? "w-full" : ""}
    ${additionalClasses}
  `
    .replace(/\s+/g, " ")
    .trim();
};
