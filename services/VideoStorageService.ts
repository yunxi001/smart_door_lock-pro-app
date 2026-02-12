/**
 * 视频存储服务
 * 负责视频文件的下载、本地存储和管理
 * 使用 IndexedDB 进行本地存储
 * 需求: 15.4, 15.5, 15.6, 15.7, 15.8
 */

import { VideoAttachment, VideoStorageStats, VideoDownloadStatus } from '../types';
import { deviceService } from './DeviceService';

// IndexedDB 数据库配置
const DB_NAME = 'SmartDoorlockVideoDB';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

// 存储配置
const DEFAULT_MAX_STORAGE_BYTES = 1024 * 1024 * 1024; // 1GB
const DEFAULT_CHUNK_SIZE = 1048576; // 1MB

// 下载重试配置
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 2000;

// 事件回调类型
type ProgressCallback = (recordId: number, progress: number) => void;
type CompleteCallback = (recordId: number) => void;
type ErrorCallback = (recordId: number, error: Error) => void;

// 存储的视频记录接口
interface StoredVideo {
  recordId: number;
  recordType: 'unlock_log' | 'event';
  mediaId: number;
  filePath: string;
  fileSize: number;
  duration?: number;
  thumbnailUrl?: string;
  data: ArrayBuffer;      // 视频二进制数据
  createdAt: number;      // 存储时间戳（用于 FIFO 清理）
}

// 下载任务接口
interface DownloadTask {
  attachment: VideoAttachment;
  retryCount: number;
  chunks: ArrayBuffer[];
  totalChunks: number;
  receivedChunks: number;
}

// 下载队列项接口（用于自动下载队列管理）
interface QueuedDownload {
  attachment: VideoAttachment;
  priority: number;       // 优先级（数字越大优先级越高）
  addedAt: number;        // 添加时间戳
}

export class VideoStorageService {
  // 单例实例
  private static instance: VideoStorageService;
  
  // IndexedDB 数据库实例
  private db: IDBDatabase | null = null;
  private isInitialized: boolean = false;
  
  // 存储配置
  private maxStorageBytes: number = DEFAULT_MAX_STORAGE_BYTES;
  
  // 下载队列
  private downloadQueue: Map<number, DownloadTask> = new Map();
  
  // 自动下载队列（需求 14.8, 14.9）
  private autoDownloadQueue: QueuedDownload[] = [];
  private isAutoDownloading: boolean = false;
  private isMonitoringActive: boolean = false;  // 监控模式状态
  
  // 事件回调
  private progressCallbacks: ProgressCallback[] = [];
  private completeCallbacks: CompleteCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  
  // DeviceService 事件取消订阅函数
  private unsubscribers: (() => void)[] = [];

  private constructor() {
    // 私有构造函数，确保单例模式
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): VideoStorageService {
    if (!VideoStorageService.instance) {
      VideoStorageService.instance = new VideoStorageService();
    }
    return VideoStorageService.instance;
  }


  /**
   * 初始化 IndexedDB 存储
   * 需求: 15.6
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB 打开失败:', request.error);
        reject(new Error('无法打开视频存储数据库'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('视频存储数据库初始化成功');
        
        // 订阅 DeviceService 事件
        this.subscribeToDeviceEvents();
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建视频存储对象仓库
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'recordId' });
          
          // 创建索引
          store.createIndex('mediaId', 'mediaId', { unique: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('recordType', 'recordType', { unique: false });
          
          console.log('视频存储对象仓库创建成功');
        }
      };
    });
  }

  /**
   * 订阅 DeviceService 的媒体下载事件
   */
  private subscribeToDeviceEvents(): void {
    // 订阅完整文件下载响应
    const unsubDownload = deviceService.on('media_download', (_, data) => {
      this.handleMediaDownloadResponse(data);
    });
    this.unsubscribers.push(unsubDownload);

    // 订阅分片下载响应
    const unsubChunk = deviceService.on('media_download_chunk', (_, data) => {
      this.handleMediaDownloadChunkResponse(data);
    });
    this.unsubscribers.push(unsubChunk);

    // 订阅监控状态变化（需求 14.9）
    const unsubSystem = deviceService.on('log', (_, data) => {
      this.handleSystemLogForMonitorState(data);
    });
    this.unsubscribers.push(unsubSystem);
  }

  /**
   * 处理系统日志以检测监控状态变化
   * 需求 14.9: 在非监控模式下启动后台下载
   */
  private handleSystemLogForMonitorState(data: { msg: string; type: string }): void {
    const { msg } = data;
    
    // 检测监控开始
    if (msg.includes('start_monitor') && msg.includes('成功')) {
      this.setMonitoringActive(true);
    }
    // 检测监控停止
    else if (msg.includes('stop_monitor') && msg.includes('成功')) {
      this.setMonitoringActive(false);
    }
  }

  /**
   * 设置监控状态
   * 当监控停止时，启动自动下载
   */
  public setMonitoringActive(active: boolean): void {
    const wasActive = this.isMonitoringActive;
    this.isMonitoringActive = active;
    
    console.log(`监控状态变化: ${wasActive ? '活跃' : '非活跃'} -> ${active ? '活跃' : '非活跃'}`);
    
    // 当从监控模式切换到非监控模式时，启动自动下载
    if (wasActive && !active) {
      console.log('监控已停止，启动后台自动下载');
      this.startAutoDownload();
    }
    // 当进入监控模式时，暂停自动下载
    else if (!wasActive && active) {
      console.log('监控已启动，暂停后台自动下载');
      this.pauseAutoDownload();
    }
  }

  /**
   * 获取当前监控状态
   */
  public isMonitoring(): boolean {
    return this.isMonitoringActive;
  }

  /**
   * 处理完整文件下载响应
   */
  private async handleMediaDownloadResponse(data: {
    fileId: number;
    status: 'success' | 'error';
    data?: string;
    fileSize?: number;
    fileType?: string;
    error?: string;
  }): Promise<void> {
    const task = this.findTaskByMediaId(data.fileId);
    if (!task) return;

    if (data.status === 'success' && data.data) {
      try {
        // 解码 Base64 数据
        const binaryData = this.base64ToArrayBuffer(data.data);
        
        // 保存到 IndexedDB
        await this.saveVideoToStorage(task.attachment, binaryData);
        
        // 触发完成回调
        this.emitComplete(task.attachment.recordId);
        
        // 从队列中移除
        this.downloadQueue.delete(task.attachment.recordId);
        
        // 处理下一个自动下载任务
        if (this.isAutoDownloading) {
          await this.processNextAutoDownload();
        }
        
      } catch (error) {
        this.handleDownloadError(task, error as Error);
      }
    } else {
      this.handleDownloadError(task, new Error(data.error || '下载失败'));
    }
  }

  /**
   * 处理分片下载响应
   */
  private async handleMediaDownloadChunkResponse(data: {
    fileId: number;
    chunkIndex: number;
    status: 'success' | 'error';
    data?: string;
    chunkSize?: number;
    totalChunks?: number;
    isLast?: boolean;
    error?: string;
  }): Promise<void> {
    const task = this.findTaskByMediaId(data.fileId);
    if (!task) return;

    if (data.status === 'success' && data.data) {
      try {
        // 解码 Base64 分片数据
        const chunkData = this.base64ToArrayBuffer(data.data);
        
        // 存储分片
        task.chunks[data.chunkIndex] = chunkData;
        task.receivedChunks++;
        
        // 更新总分片数
        if (data.totalChunks) {
          task.totalChunks = data.totalChunks;
        }
        
        // 计算并触发进度回调
        const progress = task.totalChunks > 0 
          ? Math.round((task.receivedChunks / task.totalChunks) * 100)
          : 0;
        this.emitProgress(task.attachment.recordId, progress);
        
        // 检查是否完成
        if (data.isLast || task.receivedChunks >= task.totalChunks) {
          // 合并所有分片
          const fullData = this.mergeChunks(task.chunks);
          
          // 保存到 IndexedDB
          await this.saveVideoToStorage(task.attachment, fullData);
          
          // 触发完成回调
          this.emitComplete(task.attachment.recordId);
          
          // 从队列中移除
          this.downloadQueue.delete(task.attachment.recordId);
          
          // 处理下一个自动下载任务
          if (this.isAutoDownloading) {
            await this.processNextAutoDownload();
          }
        } else {
          // 请求下一个分片
          deviceService.sendMediaDownloadChunk(
            task.attachment.mediaId,
            data.chunkIndex + 1,
            DEFAULT_CHUNK_SIZE
          );
        }
        
      } catch (error) {
        this.handleDownloadError(task, error as Error);
      }
    } else {
      this.handleDownloadError(task, new Error(data.error || '分片下载失败'));
    }
  }


  /**
   * 下载视频
   * 需求: 15.4, 15.5
   * @param attachment 视频附件信息
   */
  public async downloadVideo(attachment: VideoAttachment): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // 检查是否已在下载队列中
    if (this.downloadQueue.has(attachment.recordId)) {
      console.log(`视频 ${attachment.recordId} 已在下载队列中`);
      return;
    }

    // 检查是否已下载
    const existingVideo = await this.getVideoByRecordId(attachment.recordId);
    if (existingVideo) {
      console.log(`视频 ${attachment.recordId} 已存在本地存储`);
      this.emitComplete(attachment.recordId);
      return;
    }

    // 检查存储空间
    const stats = await this.getStorageStats();
    if (stats.usedBytes + attachment.fileSize > this.maxStorageBytes) {
      // 尝试清理旧视频
      await this.cleanupOldVideos();
      
      // 再次检查
      const newStats = await this.getStorageStats();
      if (newStats.usedBytes + attachment.fileSize > this.maxStorageBytes) {
        this.emitError(attachment.recordId, new Error('存储空间不足'));
        return;
      }
    }

    // 创建下载任务
    const task: DownloadTask = {
      attachment,
      retryCount: 0,
      chunks: [],
      totalChunks: 0,
      receivedChunks: 0
    };

    this.downloadQueue.set(attachment.recordId, task);
    
    // 触发进度回调（0%）
    this.emitProgress(attachment.recordId, 0);

    // 根据文件大小决定下载方式
    if (attachment.fileSize > DEFAULT_CHUNK_SIZE) {
      // 大文件使用分片下载
      deviceService.sendMediaDownloadChunk(attachment.mediaId, 0, DEFAULT_CHUNK_SIZE);
    } else {
      // 小文件直接下载
      deviceService.sendMediaDownload(attachment.mediaId);
    }
  }

  /**
   * 处理下载错误，支持重试
   * 需求: 15.5
   */
  private async handleDownloadError(task: DownloadTask, error: Error): Promise<void> {
    task.retryCount++;
    
    if (task.retryCount < MAX_RETRY_COUNT) {
      console.log(`视频 ${task.attachment.recordId} 下载失败，${RETRY_DELAY_MS}ms 后重试 (${task.retryCount}/${MAX_RETRY_COUNT})`);
      
      // 延迟后重试
      setTimeout(() => {
        // 重置分片状态
        task.chunks = [];
        task.receivedChunks = 0;
        
        // 重新开始下载
        if (task.attachment.fileSize > DEFAULT_CHUNK_SIZE) {
          deviceService.sendMediaDownloadChunk(task.attachment.mediaId, 0, DEFAULT_CHUNK_SIZE);
        } else {
          deviceService.sendMediaDownload(task.attachment.mediaId);
        }
      }, RETRY_DELAY_MS);
    } else {
      // 超过重试次数，触发错误回调
      console.error(`视频 ${task.attachment.recordId} 下载失败，已达最大重试次数`);
      this.emitError(task.attachment.recordId, error);
      this.downloadQueue.delete(task.attachment.recordId);
      
      // 处理下一个自动下载任务
      if (this.isAutoDownloading) {
        await this.processNextAutoDownload();
      }
    }
  }

  /**
   * 保存视频到 IndexedDB
   */
  private async saveVideoToStorage(attachment: VideoAttachment, data: ArrayBuffer): Promise<void> {
    if (!this.db) {
      throw new Error('数据库未初始化');
    }

    const storedVideo: StoredVideo = {
      recordId: attachment.recordId,
      recordType: attachment.recordType,
      mediaId: attachment.mediaId,
      filePath: attachment.filePath,
      fileSize: data.byteLength,
      duration: attachment.duration,
      thumbnailUrl: attachment.thumbnailUrl,
      data,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(storedVideo);

      request.onsuccess = () => {
        console.log(`视频 ${attachment.recordId} 保存成功`);
        resolve();
      };

      request.onerror = () => {
        console.error('保存视频失败:', request.error);
        reject(new Error('保存视频失败'));
      };
    });
  }

  /**
   * 根据记录 ID 获取本地视频
   */
  public async getVideoByRecordId(recordId: number): Promise<StoredVideo | null> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(recordId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('获取视频失败'));
      };
    });
  }

  /**
   * 获取本地视频的 Blob URL
   */
  public async getLocalVideoUrl(recordId: number): Promise<string | null> {
    const video = await this.getVideoByRecordId(recordId);
    if (!video) return null;

    const blob = new Blob([video.data], { type: 'video/mp4' });
    return URL.createObjectURL(blob);
  }


  /**
   * 获取存储统计信息
   * 需求: 15.7
   */
  public async getStorageStats(): Promise<VideoStorageStats> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const videos = request.result as StoredVideo[];
        const usedBytes = videos.reduce((sum, video) => sum + video.fileSize, 0);
        
        resolve({
          usedBytes,
          maxBytes: this.maxStorageBytes,
          fileCount: videos.length
        });
      };

      request.onerror = () => {
        reject(new Error('获取存储统计失败'));
      };
    });
  }

  /**
   * 清空所有视频
   * 需求: 15.7
   */
  public async clearAllVideos(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('所有视频已清空');
        resolve();
      };

      request.onerror = () => {
        reject(new Error('清空视频失败'));
      };
    });
  }

  /**
   * 清理旧视频（FIFO 策略）
   * 需求: 15.8
   * 删除最旧的视频直到释放足够空间
   */
  public async cleanupOldVideos(): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    const stats = await this.getStorageStats();
    
    // 如果使用空间未超过 80%，不需要清理
    if (stats.usedBytes < this.maxStorageBytes * 0.8) {
      return;
    }

    // 目标：清理到 60% 以下
    const targetBytes = this.maxStorageBytes * 0.6;
    let currentBytes = stats.usedBytes;

    // 获取所有视频，按创建时间排序（最旧的在前）
    const videos = await this.getAllVideosSortedByCreatedAt();

    for (const video of videos) {
      if (currentBytes <= targetBytes) {
        break;
      }

      await this.deleteVideo(video.recordId);
      currentBytes -= video.fileSize;
      console.log(`清理旧视频 ${video.recordId}，释放 ${this.formatFileSize(video.fileSize)}`);
    }
  }

  /**
   * 获取所有视频，按创建时间排序
   */
  private async getAllVideosSortedByCreatedAt(): Promise<StoredVideo[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      const request = index.getAll();

      request.onsuccess = () => {
        resolve(request.result as StoredVideo[]);
      };

      request.onerror = () => {
        reject(new Error('获取视频列表失败'));
      };
    });
  }

  /**
   * 删除指定视频
   */
  public async deleteVideo(recordId: number): Promise<void> {
    if (!this.db) {
      await this.initialize();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(recordId);

      request.onsuccess = () => {
        console.log(`视频 ${recordId} 已删除`);
        resolve();
      };

      request.onerror = () => {
        reject(new Error('删除视频失败'));
      };
    });
  }

  /**
   * 设置最大存储空间
   */
  public setMaxStorageBytes(bytes: number): void {
    this.maxStorageBytes = bytes;
  }

  /**
   * 检查视频是否已下载
   */
  public async isVideoDownloaded(recordId: number): Promise<boolean> {
    const video = await this.getVideoByRecordId(recordId);
    return video !== null;
  }

  /**
   * 获取视频下载状态
   */
  public getDownloadStatus(recordId: number): VideoDownloadStatus {
    const task = this.downloadQueue.get(recordId);
    if (task) {
      return 'downloading';
    }
    return 'pending';
  }

  /**
   * 获取下载进度
   */
  public getDownloadProgress(recordId: number): number {
    const task = this.downloadQueue.get(recordId);
    if (!task) return 0;
    
    if (task.totalChunks > 0) {
      return Math.round((task.receivedChunks / task.totalChunks) * 100);
    }
    return 0;
  }


  // ============================================
  // 事件回调管理
  // ============================================

  /**
   * 注册下载进度回调
   */
  public onDownloadProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * 注册下载完成回调
   */
  public onDownloadComplete(callback: CompleteCallback): () => void {
    this.completeCallbacks.push(callback);
    return () => {
      this.completeCallbacks = this.completeCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * 注册下载错误回调
   */
  public onDownloadError(callback: ErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }

  private emitProgress(recordId: number, progress: number): void {
    this.progressCallbacks.forEach(cb => cb(recordId, progress));
  }

  private emitComplete(recordId: number): void {
    this.completeCallbacks.forEach(cb => cb(recordId));
  }

  private emitError(recordId: number, error: Error): void {
    this.errorCallbacks.forEach(cb => cb(recordId, error));
  }

  // ============================================
  // 工具方法
  // ============================================

  /**
   * 根据 mediaId 查找下载任务
   */
  private findTaskByMediaId(mediaId: number): DownloadTask | undefined {
    for (const task of this.downloadQueue.values()) {
      if (task.attachment.mediaId === mediaId) {
        return task;
      }
    }
    return undefined;
  }

  /**
   * Base64 转 ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * 合并分片数据
   * 注意: 合并后会清空原始分片数组以释放内存
   */
  private mergeChunks(chunks: ArrayBuffer[]): ArrayBuffer {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const result = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      result.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    // 清空分片数组以释放内存
    chunks.length = 0;
    
    return result.buffer;
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  // ============================================
  // 自动下载队列管理 (需求 14.8, 14.9)
  // ============================================

  /**
   * 添加视频到自动下载队列
   * 需求 14.8: 维护待下载视频队列
   * @param attachment 视频附件信息
   * @param priority 优先级（默认为 0，数字越大优先级越高）
   */
  public async addToAutoDownloadQueue(attachment: VideoAttachment, priority: number = 0): Promise<void> {
    // 检查是否已在队列中
    const existsInQueue = this.autoDownloadQueue.some(
      item => item.attachment.recordId === attachment.recordId
    );
    if (existsInQueue) {
      console.log(`视频 ${attachment.recordId} 已在自动下载队列中`);
      return;
    }

    // 检查是否正在下载
    if (this.downloadQueue.has(attachment.recordId)) {
      console.log(`视频 ${attachment.recordId} 正在下载中`);
      return;
    }

    // 检查是否已下载
    const isDownloaded = await this.isVideoDownloaded(attachment.recordId);
    if (isDownloaded) {
      console.log(`视频 ${attachment.recordId} 已存在本地存储`);
      return;
    }

    // 添加到队列
    const queuedItem: QueuedDownload = {
      attachment,
      priority,
      addedAt: Date.now()
    };
    this.autoDownloadQueue.push(queuedItem);
    
    // 按优先级排序（优先级高的在前，相同优先级按添加时间排序）
    this.sortAutoDownloadQueue();
    
    console.log(`视频 ${attachment.recordId} 已添加到自动下载队列，当前队列长度: ${this.autoDownloadQueue.length}`);

    // 如果不在监控模式且未在自动下载，启动自动下载
    if (!this.isMonitoringActive && !this.isAutoDownloading) {
      this.startAutoDownload();
    }
  }

  /**
   * 批量添加视频到自动下载队列
   * @param attachments 视频附件列表
   * @param basePriority 基础优先级（列表中靠前的项优先级更高）
   */
  public async addBatchToAutoDownloadQueue(attachments: VideoAttachment[], basePriority: number = 0): Promise<void> {
    for (let i = 0; i < attachments.length; i++) {
      // 列表中靠前的项优先级更高
      const priority = basePriority + (attachments.length - i);
      await this.addToAutoDownloadQueue(attachments[i], priority);
    }
  }

  /**
   * 从自动下载队列中移除
   * @param recordId 记录 ID
   */
  public removeFromAutoDownloadQueue(recordId: number): void {
    const index = this.autoDownloadQueue.findIndex(
      item => item.attachment.recordId === recordId
    );
    if (index !== -1) {
      this.autoDownloadQueue.splice(index, 1);
      console.log(`视频 ${recordId} 已从自动下载队列中移除`);
    }
  }

  /**
   * 清空自动下载队列
   */
  public clearAutoDownloadQueue(): void {
    this.autoDownloadQueue = [];
    console.log('自动下载队列已清空');
  }

  /**
   * 获取自动下载队列状态
   */
  public getAutoDownloadQueueStatus(): {
    queueLength: number;
    isDownloading: boolean;
    isMonitoring: boolean;
    currentDownload: VideoAttachment | null;
  } {
    // 获取当前正在下载的项（如果有）
    let currentDownload: VideoAttachment | null = null;
    if (this.downloadQueue.size > 0) {
      const firstTask = this.downloadQueue.values().next().value;
      if (firstTask) {
        currentDownload = firstTask.attachment;
      }
    }

    return {
      queueLength: this.autoDownloadQueue.length,
      isDownloading: this.isAutoDownloading,
      isMonitoring: this.isMonitoringActive,
      currentDownload
    };
  }

  /**
   * 按优先级排序自动下载队列
   * 需求 14.8: 按优先级下载
   */
  private sortAutoDownloadQueue(): void {
    this.autoDownloadQueue.sort((a, b) => {
      // 优先级高的在前
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // 相同优先级，先添加的在前
      return a.addedAt - b.addedAt;
    });
  }

  /**
   * 启动自动下载
   * 需求 14.9: 在非监控模式下启动后台下载
   */
  private async startAutoDownload(): Promise<void> {
    // 如果正在监控或已在自动下载，不启动
    if (this.isMonitoringActive || this.isAutoDownloading) {
      return;
    }

    // 如果队列为空，不启动
    if (this.autoDownloadQueue.length === 0) {
      console.log('自动下载队列为空，无需启动');
      return;
    }

    this.isAutoDownloading = true;
    console.log('开始自动下载，队列长度:', this.autoDownloadQueue.length);

    await this.processNextAutoDownload();
  }

  /**
   * 处理下一个自动下载任务
   */
  private async processNextAutoDownload(): Promise<void> {
    // 检查是否应该继续下载
    if (this.isMonitoringActive) {
      console.log('监控模式已启动，暂停自动下载');
      this.isAutoDownloading = false;
      return;
    }

    // 检查队列是否为空
    if (this.autoDownloadQueue.length === 0) {
      console.log('自动下载队列已清空，下载完成');
      this.isAutoDownloading = false;
      return;
    }

    // 检查是否有正在进行的下载
    if (this.downloadQueue.size > 0) {
      // 等待当前下载完成后再处理下一个
      return;
    }

    // 取出队列中优先级最高的项
    const nextItem = this.autoDownloadQueue.shift();
    if (!nextItem) {
      this.isAutoDownloading = false;
      return;
    }

    console.log(`开始自动下载视频 ${nextItem.attachment.recordId}，优先级: ${nextItem.priority}`);

    try {
      // 开始下载
      await this.downloadVideo(nextItem.attachment);
    } catch (error) {
      console.error(`自动下载视频 ${nextItem.attachment.recordId} 失败:`, error);
      // 继续处理下一个
      await this.processNextAutoDownload();
    }
  }

  /**
   * 暂停自动下载
   */
  private pauseAutoDownload(): void {
    this.isAutoDownloading = false;
    console.log('自动下载已暂停');
  }

  /**
   * 恢复自动下载
   */
  public resumeAutoDownload(): void {
    if (!this.isMonitoringActive && !this.isAutoDownloading && this.autoDownloadQueue.length > 0) {
      console.log('恢复自动下载');
      this.startAutoDownload();
    }
  }

  /**
   * 销毁服务实例
   * 清理事件订阅和数据库连接
   */
  public destroy(): void {
    // 取消所有事件订阅
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    
    // 清空回调
    this.progressCallbacks = [];
    this.completeCallbacks = [];
    this.errorCallbacks = [];
    
    // 关闭数据库连接
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    
    this.isInitialized = false;
    this.downloadQueue.clear();
    
    // 清理自动下载状态
    this.autoDownloadQueue = [];
    this.isAutoDownloading = false;
    this.isMonitoringActive = false;
  }
}

// 导出单例实例
export const videoStorageService = VideoStorageService.getInstance();
