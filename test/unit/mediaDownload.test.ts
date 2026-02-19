/**
 * 媒体下载测试
 * Feature: smart-doorlock-app
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fc from "fast-check";
import { DeviceService } from "../services/DeviceService";

describe("媒体下载", () => {
  let service: DeviceService;

  beforeEach(() => {
    service = new DeviceService();
  });

  /**
   * Property 25: 媒体下载命令格式
   * 对于任意媒体下载请求，发送的 media_download 命令应包含正确的 file_id 字段。
   * 验证: 需求 15.1
   */
  describe("Property 25: 媒体下载命令格式", () => {
    it("对于任意 file_id，media_download 命令应包含正确的 type 和 file_id 字段", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // 有效的 file_id
          (fileId) => {
            const sentCommands: any[] = [];

            // 拦截 sendCommand 方法以捕获发送的命令
            service.sendCommand = function (cmd: object) {
              const commandWithSeqId = {
                ...cmd,
                seq_id: service.generateSeqId(),
              };
              sentCommands.push(commandWithSeqId);
            };

            // 发送媒体下载命令
            service.sendMediaDownload(fileId);

            // 验证命令格式
            expect(sentCommands.length).toBe(1);
            const sentCmd = sentCommands[0];

            // 验证必须包含 type: 'media_download'
            expect(sentCmd.type).toBe("media_download");

            // 验证必须包含正确的 file_id
            expect(sentCmd.file_id).toBe(fileId);

            // 验证必须包含 seq_id（自动生成）
            expect(sentCmd).toHaveProperty("seq_id");
            expect(typeof sentCmd.seq_id).toBe("string");
            expect(sentCmd.seq_id).toMatch(/^\d{13}_\d+$/);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("对于任意 file_path，media_download 命令应包含正确的 type 和 file_path 字段", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // 有效的 file_path
          (filePath) => {
            const sentCommands: any[] = [];

            // 拦截 sendCommand 方法以捕获发送的命令
            service.sendCommand = function (cmd: object) {
              const commandWithSeqId = {
                ...cmd,
                seq_id: service.generateSeqId(),
              };
              sentCommands.push(commandWithSeqId);
            };

            // 发送媒体下载命令（使用 file_path）
            service.sendMediaDownload(filePath);

            // 验证命令格式
            expect(sentCommands.length).toBe(1);
            const sentCmd = sentCommands[0];

            // 验证必须包含 type: 'media_download'
            expect(sentCmd.type).toBe("media_download");

            // 验证必须包含正确的 file_path
            expect(sentCmd.file_path).toBe(filePath);

            // 验证不应包含 file_id（使用 file_path 时）
            expect(sentCmd.file_id).toBeUndefined();

            // 验证必须包含 seq_id（自动生成）
            expect(sentCmd).toHaveProperty("seq_id");
            expect(typeof sentCmd.seq_id).toBe("string");
            expect(sentCmd.seq_id).toMatch(/^\d{13}_\d+$/);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("对于任意分片下载参数，media_download_chunk 命令应包含正确的字段", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // file_id
          fc.integer({ min: 0, max: 100 }), // chunk_index
          fc.integer({ min: 1024, max: 10485760 }), // chunk_size (1KB - 10MB)
          (fileId, chunkIndex, chunkSize) => {
            const sentCommands: any[] = [];

            service.sendCommand = function (cmd: object) {
              const commandWithSeqId = {
                ...cmd,
                seq_id: service.generateSeqId(),
              };
              sentCommands.push(commandWithSeqId);
            };

            // 发送分片下载命令
            service.sendMediaDownloadChunk(fileId, chunkIndex, chunkSize);

            // 验证命令格式
            expect(sentCommands.length).toBe(1);
            const sentCmd = sentCommands[0];

            // 验证必须包含 type: 'media_download_chunk'
            expect(sentCmd.type).toBe("media_download_chunk");

            // 验证必须包含正确的 file_id
            expect(sentCmd.file_id).toBe(fileId);

            // 验证必须包含正确的 chunk_index
            expect(sentCmd.chunk_index).toBe(chunkIndex);

            // 验证必须包含正确的 chunk_size
            expect(sentCmd.chunk_size).toBe(chunkSize);

            // 验证必须包含 seq_id
            expect(sentCmd).toHaveProperty("seq_id");
            expect(sentCmd.seq_id).toMatch(/^\d{13}_\d+$/);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("分片下载命令应使用默认 chunk_size（1MB）", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 0, max: 100 }),
          (fileId, chunkIndex) => {
            const sentCommands: any[] = [];

            service.sendCommand = function (cmd: object) {
              sentCommands.push(cmd);
            };

            // 不传 chunkSize 参数
            service.sendMediaDownloadChunk(fileId, chunkIndex);

            expect(sentCommands.length).toBe(1);
            // 默认 chunk_size 应为 1MB (1048576 bytes)
            expect(sentCommands[0].chunk_size).toBe(1048576);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("媒体下载命令应触发正确的日志事件", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000 }), (fileId) => {
          const logEvents: any[] = [];
          service.on("log", (_, data) => logEvents.push(data));

          service.sendMediaDownload(fileId);

          // 验证日志包含"媒体文件"关键字
          expect(logEvents.some((e) => e.msg.includes("媒体文件"))).toBe(true);

          // 验证日志包含 file_id
          expect(logEvents.some((e) => e.msg.includes(String(fileId)))).toBe(
            true,
          );
        }),
        { numRuns: 100 },
      );
    });

    it("分片下载命令应触发正确的日志事件", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 0, max: 100 }),
          (fileId, chunkIndex) => {
            const logEvents: any[] = [];
            service.on("log", (_, data) => logEvents.push(data));

            service.sendMediaDownloadChunk(fileId, chunkIndex);

            // 验证日志包含"媒体分片"关键字
            expect(logEvents.some((e) => e.msg.includes("媒体分片"))).toBe(
              true,
            );

            // 验证日志包含 file_id
            expect(logEvents.some((e) => e.msg.includes(String(fileId)))).toBe(
              true,
            );
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 26: 媒体下载响应处理
   * 对于任意 media_download 响应，App 应正确解析 status 和 data 字段，提取文件内容。
   * 验证: 需求 15.2, 15.3
   */
  describe("Property 26: 媒体下载响应处理", () => {
    it("对于任意成功的媒体下载响应，应触发 media_download 事件并包含正确的数据", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // file_id
          fc.base64String({ minLength: 10, maxLength: 100 }), // Base64 编码的数据
          fc.integer({ min: 100, max: 10000000 }), // file_size
          fc.constantFrom("video/mp4", "video/webm", "image/jpeg"), // file_type
          (fileId, data, fileSize, fileType) => {
            const events: any[] = [];
            service.on("media_download", (_, eventData) =>
              events.push({ type: "media_download", data: eventData }),
            );
            service.on("log", (_, eventData) =>
              events.push({ type: "log", data: eventData }),
            );

            const msg = {
              type: "media_download",
              file_id: fileId,
              status: "success" as const,
              data: data,
              file_size: fileSize,
              file_type: fileType,
            };

            (service as any).handleMediaDownload(msg);

            // 验证触发了 media_download 事件
            const downloadEvent = events.find(
              (e) => e.type === "media_download",
            );
            expect(downloadEvent).toBeDefined();

            // 验证事件数据包含正确的字段
            expect(downloadEvent.data.fileId).toBe(fileId);
            expect(downloadEvent.data.status).toBe("success");
            expect(downloadEvent.data.data).toBe(data);
            expect(downloadEvent.data.fileSize).toBe(fileSize);
            expect(downloadEvent.data.fileType).toBe(fileType);

            // 验证记录了成功日志
            expect(
              events.some(
                (e) =>
                  e.type === "log" &&
                  e.data.msg.includes("下载完成") &&
                  e.data.type === "success",
              ),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("对于任意失败的媒体下载响应，应触发 media_download 事件并记录错误日志", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.string({ minLength: 1, maxLength: 100 }), // 错误消息
          (fileId, errorMessage) => {
            const events: any[] = [];
            service.on("media_download", (_, eventData) =>
              events.push({ type: "media_download", data: eventData }),
            );
            service.on("log", (_, eventData) =>
              events.push({ type: "log", data: eventData }),
            );

            const msg = {
              type: "media_download",
              file_id: fileId,
              status: "error" as const,
              error: errorMessage,
            };

            (service as any).handleMediaDownload(msg);

            // 验证触发了 media_download 事件
            const downloadEvent = events.find(
              (e) => e.type === "media_download",
            );
            expect(downloadEvent).toBeDefined();
            expect(downloadEvent.data.status).toBe("error");
            expect(downloadEvent.data.error).toBe(errorMessage);

            // 验证记录了错误日志
            expect(
              events.some(
                (e) =>
                  e.type === "log" &&
                  e.data.msg.includes("下载失败") &&
                  e.data.type === "error",
              ),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("对于任意成功的分片下载响应，应触发 media_download_chunk 事件", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }), // file_id
          fc.integer({ min: 0, max: 99 }), // chunk_index
          fc.base64String({ minLength: 10, maxLength: 100 }), // Base64 编码的分片数据
          fc.integer({ min: 1024, max: 1048576 }), // chunk_size
          fc.integer({ min: 1, max: 100 }), // total_chunks
          (fileId, chunkIndex, data, chunkSize, totalChunks) => {
            // 确保 chunkIndex < totalChunks
            const validChunkIndex = chunkIndex % totalChunks;
            const isLast = validChunkIndex === totalChunks - 1;

            const events: any[] = [];
            service.on("media_download_chunk", (_, eventData) =>
              events.push({ type: "media_download_chunk", data: eventData }),
            );
            service.on("media_download_progress", (_, eventData) =>
              events.push({ type: "media_download_progress", data: eventData }),
            );

            const msg = {
              type: "media_download_chunk",
              file_id: fileId,
              chunk_index: validChunkIndex,
              status: "success" as const,
              data: data,
              chunk_size: chunkSize,
              total_chunks: totalChunks,
              is_last: isLast,
            };

            (service as any).handleMediaDownloadChunk(msg);

            // 验证触发了 media_download_chunk 事件
            const chunkEvent = events.find(
              (e) => e.type === "media_download_chunk",
            );
            expect(chunkEvent).toBeDefined();
            expect(chunkEvent.data.fileId).toBe(fileId);
            expect(chunkEvent.data.chunkIndex).toBe(validChunkIndex);
            expect(chunkEvent.data.status).toBe("success");
            expect(chunkEvent.data.data).toBe(data);
            expect(chunkEvent.data.totalChunks).toBe(totalChunks);
            expect(chunkEvent.data.isLast).toBe(isLast);

            // 验证触发了进度事件
            const progressEvent = events.find(
              (e) => e.type === "media_download_progress",
            );
            expect(progressEvent).toBeDefined();
            expect(progressEvent.data.fileId).toBe(fileId);

            // 验证进度计算正确
            const expectedProgress = Math.round(
              ((validChunkIndex + 1) / totalChunks) * 100,
            );
            expect(progressEvent.data.progress).toBe(expectedProgress);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("对于最后一个分片，应记录完成日志", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 100 }),
          (fileId, totalChunks) => {
            const events: any[] = [];
            service.on("log", (_, eventData) =>
              events.push({ type: "log", data: eventData }),
            );

            const msg = {
              type: "media_download_chunk",
              file_id: fileId,
              chunk_index: totalChunks - 1, // 最后一个分片
              status: "success" as const,
              data: "base64data",
              chunk_size: 1048576,
              total_chunks: totalChunks,
              is_last: true,
            };

            (service as any).handleMediaDownloadChunk(msg);

            // 验证记录了完成日志
            expect(
              events.some(
                (e) =>
                  e.type === "log" &&
                  e.data.msg.includes("分片下载完成") &&
                  e.data.type === "success",
              ),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("对于失败的分片下载响应，应记录错误日志", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 0, max: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (fileId, chunkIndex, errorMessage) => {
            const events: any[] = [];
            service.on("media_download_chunk", (_, eventData) =>
              events.push({ type: "media_download_chunk", data: eventData }),
            );
            service.on("log", (_, eventData) =>
              events.push({ type: "log", data: eventData }),
            );

            const msg = {
              type: "media_download_chunk",
              file_id: fileId,
              chunk_index: chunkIndex,
              status: "error" as const,
              error: errorMessage,
            };

            (service as any).handleMediaDownloadChunk(msg);

            // 验证触发了 media_download_chunk 事件
            const chunkEvent = events.find(
              (e) => e.type === "media_download_chunk",
            );
            expect(chunkEvent).toBeDefined();
            expect(chunkEvent.data.status).toBe("error");

            // 验证记录了错误日志
            expect(
              events.some(
                (e) =>
                  e.type === "log" &&
                  e.data.msg.includes("分片下载失败") &&
                  e.data.type === "error",
              ),
            ).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("下载进度应正确计算（0-100%）", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 100 }),
          (fileId, totalChunks) => {
            // 测试所有分片的进度计算
            for (
              let chunkIndex = 0;
              chunkIndex < Math.min(totalChunks, 10);
              chunkIndex++
            ) {
              const events: any[] = [];
              service.on("media_download_progress", (_, eventData) =>
                events.push(eventData),
              );

              const msg = {
                type: "media_download_chunk",
                file_id: fileId,
                chunk_index: chunkIndex,
                status: "success" as const,
                data: "base64data",
                chunk_size: 1048576,
                total_chunks: totalChunks,
                is_last: chunkIndex === totalChunks - 1,
              };

              (service as any).handleMediaDownloadChunk(msg);

              // 验证进度在 0-100 范围内
              const progressEvent = events[events.length - 1];
              expect(progressEvent.progress).toBeGreaterThanOrEqual(0);
              expect(progressEvent.progress).toBeLessThanOrEqual(100);

              // 验证进度计算公式正确
              const expectedProgress = Math.round(
                ((chunkIndex + 1) / totalChunks) * 100,
              );
              expect(progressEvent.progress).toBe(expectedProgress);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
