/**
 * LocalStorageService 基础功能测试
 * 验证任务 1.1 的实现
 */

import { describe, it, expect, beforeEach } from "vitest";
import { localStorageService } from "@/services/LocalStorageService";

describe("LocalStorageService - 基础类和单例模式", () => {
  it("应该返回单例实例", () => {
    const instance1 = localStorageService;
    const instance2 = localStorageService;

    expect(instance1).toBe(instance2);
  });

  it("应该有正确的数据库名称", () => {
    expect(localStorageService.getDbName()).toBe("SmartDoorlockDB");
  });

  it("应该有正确的数据库版本", () => {
    expect(localStorageService.getDbVersion()).toBe(2);
  });

  it("初始状态下应该未初始化", () => {
    expect(localStorageService.isAvailable()).toBe(false);
  });

  it("初始状态下不应该处于降级模式", () => {
    expect(localStorageService.isInFallbackMode()).toBe(false);
  });

  it("初始状态下数据库实例应该为 null", () => {
    expect(localStorageService.getDb()).toBeNull();
  });
});
