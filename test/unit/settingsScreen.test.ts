/**
 * 设置页配色系统测试
 *
 * 验证设置页组件使用了新的配色系统
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("SettingsScreen 配色系统", () => {
  const settingsScreenPath = join(process.cwd(), "screens/SettingsScreen.tsx");
  const content = readFileSync(settingsScreenPath, "utf-8");

  it("应该使用新的 primary 颜色类名", () => {
    // 检查是否使用了 primary 颜色
    expect(content).toMatch(/bg-primary-\d+/);
    expect(content).toMatch(/text-primary-\d+/);
    expect(content).toMatch(/dark:bg-primary-\d+/);
    expect(content).toMatch(/dark:text-primary-\d+/);
  });

  it("应该使用新的 secondary 颜色类名", () => {
    // 检查是否使用了 secondary 颜色
    expect(content).toMatch(/bg-secondary-\d+/);
    expect(content).toMatch(/text-secondary-\d+/);
    expect(content).toMatch(/dark:bg-secondary-\d+/);
    expect(content).toMatch(/dark:text-secondary-\d+/);
  });

  it("应该使用语义化状态颜色", () => {
    // 检查是否使用了 success, warning, error, info 颜色
    expect(content).toMatch(/text-success-\d+/);
    expect(content).toMatch(/text-warning-\d+/);
    expect(content).toMatch(/text-error-\d+/);
    expect(content).toMatch(/text-info-\d+/);
  });

  it("应该为深色模式添加对应类名", () => {
    // 检查深色模式类名
    expect(content).toMatch(/dark:bg-/);
    expect(content).toMatch(/dark:text-/);
    expect(content).toMatch(/dark:border-/);
    expect(content).toMatch(/dark:hover:/);
  });

  it("应该移除旧的 indigo 颜色类名", () => {
    // 检查是否还有旧的 indigo 颜色（应该很少或没有）
    const indigoMatches = content.match(
      /bg-indigo-|text-indigo-|border-indigo-/g,
    );
    // 允许少量遗留（如加载动画等特殊情况），但不应该超过 10 个
    expect(indigoMatches?.length || 0).toBeLessThan(10);
  });

  it("应该移除旧的 slate 颜色类名", () => {
    // 检查是否还有旧的 slate 颜色（应该很少或没有）
    const slateMatches = content.match(/bg-slate-|text-slate-|border-slate-/g);
    // 允许少量遗留（如特殊组件），但不应该超过 15 个
    expect(slateMatches?.length || 0).toBeLessThan(15);
  });

  it("表单输入应该有焦点状态样式", () => {
    // 检查输入框是否有 focus:ring 样式
    expect(content).toMatch(/focus:ring-primary-\d+/);
    expect(content).toMatch(/focus:outline-none/);
  });

  it("按钮应该有悬停状态样式", () => {
    // 检查按钮是否有 hover 样式
    expect(content).toMatch(/hover:bg-primary-\d+/);
    expect(content).toMatch(/hover:bg-secondary-\d+/);
  });

  it("日志记录应该使用语义化颜色", () => {
    // 检查日志颜色映射
    expect(content).toContain("text-error-");
    expect(content).toContain("text-success-");
    expect(content).toContain("text-warning-");
    expect(content).toContain("text-info-");
  });

  it("事件类型映射应该使用新的颜色系统", () => {
    // 检查 eventTypeMap 是否使用了新颜色
    expect(content).toMatch(/eventTypeMap.*bg-info-/s);
    expect(content).toMatch(/eventTypeMap.*bg-warning-/s);
    expect(content).toMatch(/eventTypeMap.*bg-error-/s);
    expect(content).toMatch(/eventTypeMap.*bg-success-/s);
  });

  it("弹窗应该有遮罩层和深色模式样式", () => {
    // 检查弹窗遮罩层
    expect(content).toMatch(/bg-secondary-900\/\d+/);
    expect(content).toMatch(/backdrop-blur/);
    expect(content).toMatch(/dark:bg-secondary-950/);
  });

  it("列表项应该有悬停效果", () => {
    // 检查列表项悬停样式
    expect(content).toMatch(/hover:bg-secondary-\d+/);
    expect(content).toMatch(/dark:hover:bg-secondary-\d+/);
  });
});
