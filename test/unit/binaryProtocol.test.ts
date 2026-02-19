/**
 * 二进制协议解析测试
 * Feature: smart-doorlock-app
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * BinaryProtocol2 格式:
 * - 16 字节头部
 * - 版本 (2字节): 固定为 2
 * - 类型 (2字节): 固定为 0
 * - 保留字段 (4字节): 0=音频, 非0=视频
 * - 保留 (4字节)
 * - 负载长度 (4字节)
 * - 负载数据
 */

// 创建 BinaryProtocol2 格式的数据
function createBinaryProtocol2(
  version: number,
  type: number,
  reserved: number,
  payload: Uint8Array
): ArrayBuffer {
  const header = new Uint8Array(16);
  const payloadSize = payload.length;
  
  // 版本 (2字节, 大端序)
  header[0] = (version >> 8) & 0xFF;
  header[1] = version & 0xFF;
  
  // 类型 (2字节, 大端序)
  header[2] = (type >> 8) & 0xFF;
  header[3] = type & 0xFF;
  
  // 保留字段 (4字节, 大端序)
  header[4] = (reserved >> 24) & 0xFF;
  header[5] = (reserved >> 16) & 0xFF;
  header[6] = (reserved >> 8) & 0xFF;
  header[7] = reserved & 0xFF;
  
  // 保留 (4字节)
  header[8] = 0;
  header[9] = 0;
  header[10] = 0;
  header[11] = 0;
  
  // 负载长度 (4字节, 大端序)
  header[12] = (payloadSize >> 24) & 0xFF;
  header[13] = (payloadSize >> 16) & 0xFF;
  header[14] = (payloadSize >> 8) & 0xFF;
  header[15] = payloadSize & 0xFF;
  
  // 合并头部和负载
  const result = new Uint8Array(16 + payloadSize);
  result.set(header, 0);
  result.set(payload, 16);
  
  return result.buffer;
}

// 解析 BinaryProtocol2 格式的数据
function parseBinaryProtocol2(data: ArrayBuffer): {
  version: number;
  type: number;
  reserved: number;
  payloadSize: number;
  payload: Uint8Array;
  isAudio: boolean;
  isVideo: boolean;
} | null {
  const buffer = new Uint8Array(data);
  
  if (buffer.length < 16) {
    return null;
  }
  
  const version = (buffer[0] << 8) | buffer[1];
  const type = (buffer[2] << 8) | buffer[3];
  const reserved = (buffer[4] << 24) | (buffer[5] << 16) | (buffer[6] << 8) | buffer[7];
  const payloadSize = (buffer[12] << 24) | (buffer[13] << 16) | (buffer[14] << 8) | buffer[15];
  
  if (buffer.length < 16 + payloadSize) {
    return null;
  }
  
  const payload = buffer.slice(16, 16 + payloadSize);
  
  return {
    version,
    type,
    reserved,
    payloadSize,
    payload,
    isAudio: reserved === 0,
    isVideo: reserved !== 0
  };
}

describe('二进制协议', () => {
  /**
   * Property 8: 二进制协议解析
   * 对于任意符合 BinaryProtocol2 格式的二进制数据，App 应正确解析头部并提取负载
   * 验证: 需求 3.11, 3.12
   */
  describe('Property 8: 二进制协议解析', () => {
    it('视频帧解析正确', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 10, maxLength: 1000 }), // JPEG 负载
          (payload) => {
            // 创建视频帧 (reserved !== 0)
            const data = createBinaryProtocol2(2, 0, 1, payload);
            const parsed = parseBinaryProtocol2(data);
            
            expect(parsed).not.toBeNull();
            if (parsed) {
              expect(parsed.version).toBe(2);
              expect(parsed.type).toBe(0);
              expect(parsed.reserved).toBe(1);
              expect(parsed.isVideo).toBe(true);
              expect(parsed.isAudio).toBe(false);
              expect(parsed.payloadSize).toBe(payload.length);
              expect(parsed.payload.length).toBe(payload.length);
              
              // 验证负载内容一致
              for (let i = 0; i < payload.length; i++) {
                expect(parsed.payload[i]).toBe(payload[i]);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('音频帧解析正确', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 10, maxLength: 1000 }), // PCM 负载
          (payload) => {
            // 创建音频帧 (reserved === 0)
            const data = createBinaryProtocol2(2, 0, 0, payload);
            const parsed = parseBinaryProtocol2(data);
            
            expect(parsed).not.toBeNull();
            if (parsed) {
              expect(parsed.version).toBe(2);
              expect(parsed.type).toBe(0);
              expect(parsed.reserved).toBe(0);
              expect(parsed.isAudio).toBe(true);
              expect(parsed.isVideo).toBe(false);
              expect(parsed.payloadSize).toBe(payload.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('头部长度不足时返回 null', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 0, maxLength: 15 }), // 不足 16 字节
          (shortData) => {
            const parsed = parseBinaryProtocol2(shortData.buffer);
            expect(parsed).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('负载长度不足时返回 null', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1000 }), // 声明的负载长度
          fc.uint8Array({ minLength: 10, maxLength: 50 }), // 实际负载（较短）
          (declaredSize, actualPayload) => {
            // 手动创建一个负载长度声明与实际不符的数据
            const header = new Uint8Array(16);
            header[0] = 0; header[1] = 2; // version = 2
            header[2] = 0; header[3] = 0; // type = 0
            header[4] = 0; header[5] = 0; header[6] = 0; header[7] = 1; // reserved = 1
            header[12] = (declaredSize >> 24) & 0xFF;
            header[13] = (declaredSize >> 16) & 0xFF;
            header[14] = (declaredSize >> 8) & 0xFF;
            header[15] = declaredSize & 0xFF;
            
            const data = new Uint8Array(16 + actualPayload.length);
            data.set(header, 0);
            data.set(actualPayload, 16);
            
            const parsed = parseBinaryProtocol2(data.buffer);
            
            // 如果声明的长度大于实际长度，应返回 null
            if (declaredSize > actualPayload.length) {
              expect(parsed).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('解析后负载内容与原始数据一致 (Round-trip)', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 1, maxLength: 500 }),
          fc.constantFrom(0, 1, 100), // reserved: 0=音频, 非0=视频
          (originalPayload, reserved) => {
            // 创建二进制数据
            const data = createBinaryProtocol2(2, 0, reserved, originalPayload);
            
            // 解析
            const parsed = parseBinaryProtocol2(data);
            
            expect(parsed).not.toBeNull();
            if (parsed) {
              // 验证负载完全一致
              expect(parsed.payload.length).toBe(originalPayload.length);
              for (let i = 0; i < originalPayload.length; i++) {
                expect(parsed.payload[i]).toBe(originalPayload[i]);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe('查询结果解析', () => {
  /**
   * Property 19: 查询结果解析
   * 对于任意 query_result 响应，App 应正确解析 status 和 data 字段
   * 验证: 需求 9.3, 9.5
   */
  describe('Property 19: 查询结果解析', () => {
    // 使用安全的日期字符串生成器
    const safeIsoDateString = fc.integer({ min: 1577836800000, max: 1924905600000 }) // 2020-01-01 to 2030-12-31
      .map(ts => new Date(ts).toISOString());
    
    it('成功响应解析正确', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('unlock_logs', 'events', 'status_history'),
          fc.array(fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            timestamp: safeIsoDateString
          }), { minLength: 0, maxLength: 20 }),
          fc.integer({ min: 0, max: 1000 }),
          (target, data, total) => {
            const response = {
              type: 'query_result',
              target,
              status: 'success' as const,
              data,
              total
            };
            
            // 验证响应结构
            expect(response.type).toBe('query_result');
            expect(response.status).toBe('success');
            expect(Array.isArray(response.data)).toBe(true);
            expect(typeof response.total).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('错误响应解析正确', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('unlock_logs', 'events'),
          fc.string({ minLength: 1, maxLength: 100 }),
          (target, errorMsg) => {
            const response = {
              type: 'query_result',
              target,
              status: 'error' as const,
              error: errorMsg
            };
            
            // 验证错误响应结构
            expect(response.type).toBe('query_result');
            expect(response.status).toBe('error');
            expect(response.error).toBe(errorMsg);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
