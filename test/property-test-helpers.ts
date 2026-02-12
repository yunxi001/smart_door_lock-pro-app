/**
 * 属性测试辅助函数
 * 用于配色系统的属性测试
 */

import Color from "color";

/**
 * 颜色配置类型定义
 */
export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface ColorConfig {
  primary: ColorShades;
  secondary: ColorShades;
  success: ColorShades;
  warning: ColorShades;
  error: ColorShades;
  info: ColorShades;
}

/**
 * 完整的颜色配置
 */
export const colorConfig: ColorConfig = {
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
};

/**
 * 所有必需的颜色类别
 */
export const requiredColors = [
  "primary",
  "secondary",
  "success",
  "warning",
  "error",
  "info",
] as const;

/**
 * 所有必需的色阶
 */
export const requiredShades = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
] as const;

/**
 * 验证十六进制颜色格式
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color);
}

/**
 * 计算两个颜色之间的对比度
 * 使用 WCAG 2.1 对比度公式
 * @param color1 第一个颜色（十六进制）
 * @param color2 第二个颜色（十六进制）
 * @returns 对比度值（1-21）
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  try {
    const c1 = Color(color1);
    const c2 = Color(color2);
    return c1.contrast(c2);
  } catch (error) {
    throw new Error(`无法计算对比度: ${color1} 和 ${color2} - ${error}`);
  }
}

/**
 * 获取颜色的 HSL 饱和度
 * @param color 颜色（十六进制）
 * @returns 饱和度值（0-100）
 */
export function getSaturation(color: string): number {
  try {
    const c = Color(color);
    return c.saturationl();
  } catch (error) {
    throw new Error(`无法获取饱和度: ${color} - ${error}`);
  }
}

/**
 * 获取颜色的相对亮度
 * @param color 颜色（十六进制）
 * @returns 相对亮度值（0-1）
 */
export function getRelativeLuminance(color: string): number {
  try {
    const c = Color(color);
    return c.luminosity();
  } catch (error) {
    throw new Error(`无法获取亮度: ${color} - ${error}`);
  }
}

/**
 * 浅色模式推荐的文本颜色
 */
export const lightModeTextColors = [
  colorConfig.secondary[900], // 主要文本
  colorConfig.secondary[700], // 次要文本（改为 700 以提高对比度）
  colorConfig.primary[700], // 品牌色文本（改为 700 以提高对比度）
  colorConfig.success[900], // 成功文本
  colorConfig.warning[900], // 警告文本
  colorConfig.error[900], // 错误文本
  colorConfig.info[900], // 信息文本
];

/**
 * 浅色模式推荐的背景颜色
 */
export const lightModeBackgroundColors = [
  "#ffffff", // 白色背景
  colorConfig.secondary[50], // 页面背景
  colorConfig.secondary[100], // 卡片背景
  colorConfig.success[50], // 成功背景
  colorConfig.warning[50], // 警告背景
  colorConfig.error[50], // 错误背景
  colorConfig.info[50], // 信息背景
];

/**
 * 深色模式推荐的文本颜色
 */
export const darkModeTextColors = [
  colorConfig.secondary[50], // 主要文本
  colorConfig.secondary[200], // 次要文本（改为 200 以提高对比度）
  colorConfig.primary[300], // 品牌色文本（改为 300 以提高对比度）
  colorConfig.success[200], // 成功文本（改为 200 以提高对比度）
  colorConfig.warning[200], // 警告文本（改为 200 以提高对比度）
  colorConfig.error[200], // 错误文本（改为 200 以提高对比度）
  colorConfig.info[200], // 信息文本（改为 200 以提高对比度）
];

/**
 * 深色模式推荐的背景颜色
 */
export const darkModeBackgroundColors = [
  colorConfig.secondary[950], // 页面背景
  colorConfig.secondary[900], // 卡片背景
  colorConfig.secondary[800], // 悬浮背景
  colorConfig.success[950], // 成功背景
  colorConfig.warning[950], // 警告背景
  colorConfig.error[950], // 错误背景
  colorConfig.info[950], // 信息背景
];

/**
 * 文档必需章节列表
 */
export const requiredDocumentSections = [
  "概述",
  "设计目标",
  "设计原则",
  "架构",
  "组件和接口",
  "核心色彩定义",
  "语义化颜色映射",
  "数据模型",
  "正确性属性",
  "错误处理",
  "测试策略",
  "功能模块配色方案",
  "配色使用指南",
  "迁移计划",
];

/**
 * 功能模块列表
 */
export const requiredFeatureModules = [
  "首页（HomeScreen）",
  "监控页（MonitorScreen）",
  "设置页（SettingsScreen）",
  "通用组件",
];
