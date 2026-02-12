/**
 * 设备状态本地持久化服务
 * 使用 IndexedDB 存储设备状态，支持离线查看上次已知状态
 *
 * 注意：此服务现在委托给 LocalStorageService 进行实际存储操作
 * 保持现有接口不变以确保向后兼容
 */

import { DeviceStatus } from "../types";
import { localStorageService } from "./LocalStorageService";

// 本地存储的设备状态接口
export interface LocalDeviceStatus {
  deviceId: string;
  battery: number;
  lux: number;
  lockState: number;
  lightState: number;
  lastUpdate: number; // 时间戳（毫秒）
}

class DeviceStatusStorageService {
  private static instance: DeviceStatusStorageService;
  private readonly STORE_NAME = "deviceStatus";

  private constructor() {}

  // 获取单例实例
  static getInstance(): DeviceStatusStorageService {
    if (!DeviceStatusStorageService.instance) {
      DeviceStatusStorageService.instance = new DeviceStatusStorageService();
    }
    return DeviceStatusStorageService.instance;
  }

  // 初始化数据库（委托给 LocalStorageService）
  async init(): Promise<void> {
    try {
      await localStorageService.init();
      console.log(
        "DeviceStatusStorageService 初始化成功（使用 LocalStorageService）",
      );
    } catch (error) {
      console.error("DeviceStatusStorageService 初始化失败:", error);
      throw error;
    }
  }

  // 保存设备状态（委托给 LocalStorageService）
  async saveStatus(deviceId: string, status: DeviceStatus): Promise<void> {
    try {
      const localStatus: LocalDeviceStatus = {
        deviceId,
        battery: status.battery,
        lux: status.lux,
        lockState: status.lockState,
        lightState: status.lightState,
        lastUpdate: Date.now(),
      };

      await localStorageService.save(this.STORE_NAME, localStatus);
      console.log("设备状态已保存到本地:", deviceId);
    } catch (error) {
      console.error("保存设备状态失败:", error);
      throw error;
    }
  }

  // 加载设备状态（委托给 LocalStorageService）
  async loadStatus(deviceId: string): Promise<LocalDeviceStatus | null> {
    try {
      const result = await localStorageService.get<LocalDeviceStatus>(
        this.STORE_NAME,
        deviceId,
      );
      if (result) {
        console.log("从本地加载设备状态:", deviceId, result);
      }
      return result;
    } catch (error) {
      console.error("加载设备状态失败:", error);
      throw error;
    }
  }

  // 清除设备状态（委托给 LocalStorageService）
  async clearStatus(deviceId: string): Promise<void> {
    try {
      await localStorageService.delete(this.STORE_NAME, deviceId);
      console.log("设备状态已清除:", deviceId);
    } catch (error) {
      console.error("清除设备状态失败:", error);
      throw error;
    }
  }

  // 获取所有设备状态（委托给 LocalStorageService）
  async getAllStatus(): Promise<LocalDeviceStatus[]> {
    try {
      const result = await localStorageService.getAll<LocalDeviceStatus>(
        this.STORE_NAME,
      );
      return result;
    } catch (error) {
      console.error("获取所有设备状态失败:", error);
      throw error;
    }
  }
}

// 导出单例实例
export const deviceStatusStorage = DeviceStatusStorageService.getInstance();
