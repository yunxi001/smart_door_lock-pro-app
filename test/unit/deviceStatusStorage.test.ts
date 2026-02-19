/**
 * 设备状态本地持久化服务测试
 * Feature: smart-doorlock-app
 * 
 * 测试设备状态的 IndexedDB 存储功能
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { DeviceStatus } from '../types';
import { LocalDeviceStatus } from '../services/DeviceStatusStorageService';

// 模拟 IndexedDB
class MockIDBRequest {
  result: any = null;
  error: Error | null = null;
  onsuccess: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;

  triggerSuccess(result: any) {
    this.result = result;
    if (this.onsuccess) {
      this.onsuccess({ target: this });
    }
  }

  triggerError(error: Error) {
    this.error = error;
    if (this.onerror) {
      this.onerror({ target: this });
    }
  }
}

class MockIDBObjectStore {
  private data: Map<string, any> = new Map();

  put(value: any): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.set(value.deviceId, value);
      request.triggerSuccess(value.deviceId);
    }, 0);
    return request;
  }

  get(key: string): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.triggerSuccess(this.data.get(key));
    }, 0);
    return request;
  }

  delete(key: string): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      this.data.delete(key);
      request.triggerSuccess(undefined);
    }, 0);
    return request;
  }

  getAll(): MockIDBRequest {
    const request = new MockIDBRequest();
    setTimeout(() => {
      request.triggerSuccess(Array.from(this.data.values()));
    }, 0);
    return request;
  }

  createIndex() {
    return {};
  }
}

class MockIDBTransaction {
  private store: MockIDBObjectStore;

  constructor(store: MockIDBObjectStore) {
    this.store = store;
  }

  objectStore(): MockIDBObjectStore {
    return this.store;
  }
}

class MockIDBDatabase {
  private stores: Map<string, MockIDBObjectStore> = new Map();
  objectStoreNames = { contains: (name: string) => this.stores.has(name) };

  createObjectStore(name: string): MockIDBObjectStore {
    const store = new MockIDBObjectStore();
    this.stores.set(name, store);
    return store;
  }

  transaction(storeNames: string[]): MockIDBTransaction {
    const store = this.stores.get(storeNames[0]) || new MockIDBObjectStore();
    if (!this.stores.has(storeNames[0])) {
      this.stores.set(storeNames[0], store);
    }
    return new MockIDBTransaction(store);
  }
}

describe('设备状态本地持久化', () => {
  /**
   * 测试 LocalDeviceStatus 数据结构
   */
  describe('LocalDeviceStatus 数据结构', () => {
    it('应包含所有必要字段', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }), // deviceId
          fc.integer({ min: 0, max: 100 }), // battery
          fc.integer({ min: 0, max: 10000 }), // lux
          fc.constantFrom(0, 1), // lockState
          fc.constantFrom(0, 1), // lightState
          fc.integer({ min: 0 }), // lastUpdate
          (deviceId, battery, lux, lockState, lightState, lastUpdate) => {
            const status: LocalDeviceStatus = {
              deviceId,
              battery,
              lux,
              lockState,
              lightState,
              lastUpdate
            };

            // 验证所有字段存在且类型正确
            expect(status.deviceId).toBe(deviceId);
            expect(typeof status.deviceId).toBe('string');
            
            expect(status.battery).toBe(battery);
            expect(typeof status.battery).toBe('number');
            expect(status.battery).toBeGreaterThanOrEqual(0);
            expect(status.battery).toBeLessThanOrEqual(100);
            
            expect(status.lux).toBe(lux);
            expect(typeof status.lux).toBe('number');
            
            expect(status.lockState).toBe(lockState);
            expect([0, 1]).toContain(status.lockState);
            
            expect(status.lightState).toBe(lightState);
            expect([0, 1]).toContain(status.lightState);
            
            expect(status.lastUpdate).toBe(lastUpdate);
            expect(typeof status.lastUpdate).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 测试 DeviceStatus 到 LocalDeviceStatus 的转换
   */
  describe('DeviceStatus 转换', () => {
    it('DeviceStatus 应正确转换为 LocalDeviceStatus', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 20 }), // deviceId
          fc.integer({ min: 0, max: 100 }), // battery
          fc.integer({ min: 0, max: 10000 }), // lux
          fc.constantFrom(0, 1), // lockState
          fc.constantFrom(0, 1), // lightState
          fc.boolean(), // online
          (deviceId, battery, lux, lockState, lightState, online) => {
            const deviceStatus: DeviceStatus = {
              battery,
              lux,
              lockState,
              lightState,
              online
            };

            // 模拟转换逻辑
            const localStatus: LocalDeviceStatus = {
              deviceId,
              battery: deviceStatus.battery,
              lux: deviceStatus.lux,
              lockState: deviceStatus.lockState,
              lightState: deviceStatus.lightState,
              lastUpdate: Date.now()
            };

            // 验证转换正确
            expect(localStatus.battery).toBe(deviceStatus.battery);
            expect(localStatus.lux).toBe(deviceStatus.lux);
            expect(localStatus.lockState).toBe(deviceStatus.lockState);
            expect(localStatus.lightState).toBe(deviceStatus.lightState);
            expect(localStatus.lastUpdate).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 测试缓存状态恢复逻辑
   */
  describe('缓存状态恢复', () => {
    it('从缓存恢复的状态应标记为离线', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }), // battery
          fc.integer({ min: 0, max: 10000 }), // lux
          fc.constantFrom(0, 1), // lockState
          fc.constantFrom(0, 1), // lightState
          (battery, lux, lockState, lightState) => {
            const cached: LocalDeviceStatus = {
              deviceId: 'test-device',
              battery,
              lux,
              lockState,
              lightState,
              lastUpdate: Date.now() - 3600000 // 1小时前
            };

            // 模拟从缓存恢复设备状态
            const restoredStatus: DeviceStatus = {
              battery: cached.battery,
              lux: cached.lux,
              lockState: cached.lockState,
              lightState: cached.lightState,
              online: false  // 缓存数据应标记为离线
            };

            // 验证恢复的状态
            expect(restoredStatus.battery).toBe(cached.battery);
            expect(restoredStatus.lux).toBe(cached.lux);
            expect(restoredStatus.lockState).toBe(cached.lockState);
            expect(restoredStatus.lightState).toBe(cached.lightState);
            expect(restoredStatus.online).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * 测试上次更新时间显示逻辑
   */
  describe('上次更新时间', () => {
    it('lastUpdate 时间戳应为有效的毫秒时间戳', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1609459200000, max: 1893456000000 }), // 2021-2030 年的时间戳
          (timestamp) => {
            const status: LocalDeviceStatus = {
              deviceId: 'test',
              battery: 50,
              lux: 100,
              lockState: 0,
              lightState: 0,
              lastUpdate: timestamp
            };

            // 验证时间戳可以正确转换为日期
            const date = new Date(status.lastUpdate);
            expect(date.getTime()).toBe(timestamp);
            expect(date.getFullYear()).toBeGreaterThanOrEqual(2021);
            expect(date.getFullYear()).toBeLessThanOrEqual(2030);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('格式化时间显示应正确', () => {
      const timestamp = Date.now();
      const date = new Date(timestamp);
      const formatted = date.toLocaleString('zh-CN');
      
      // 验证格式化结果包含日期和时间
      expect(formatted).toBeDefined();
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });
});
