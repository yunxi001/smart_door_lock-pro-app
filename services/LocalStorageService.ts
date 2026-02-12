/**
 * 本地持久化存储服务
 * 使用 IndexedDB 统一管理所有应用数据
 * 支持降级到内存模式
 * 需求: 1.1, 1.3
 */

// ============================================
// 降级存储类 (FallbackStorage)
// ============================================

/**
 * FallbackStorage 类
 * 当 IndexedDB 不可用时使用内存存储
 * 实现与 LocalStorageService 相同的接口
 * 需求: 1.5, 14.1, 14.2, 14.3
 */
class FallbackStorage {
  // 内存存储：Map<storeName, Map<key, data>>
  private memoryStore: Map<string, Map<any, any>> = new Map();

  /**
   * 保存单个数据对象到内存
   */
  async save<T extends Record<string, any>>(
    storeName: string,
    data: T,
  ): Promise<void> {
    if (!this.memoryStore.has(storeName)) {
      this.memoryStore.set(storeName, new Map());
    }
    const store = this.memoryStore.get(storeName)!;

    // 尝试从数据中提取主键
    const key = data.id || data.key || data.deviceId || JSON.stringify(data);
    store.set(key, data);
  }

  /**
   * 批量保存数据对象到内存
   */
  async saveBatch<T extends Record<string, any>>(
    storeName: string,
    dataList: T[],
  ): Promise<void> {
    for (const data of dataList) {
      await this.save(storeName, data);
    }
  }

  /**
   * 从内存获取单个数据对象
   */
  async get<T>(storeName: string, key: any): Promise<T | null> {
    const store = this.memoryStore.get(storeName);
    return store?.get(key) || null;
  }

  /**
   * 从内存获取所有数据对象
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const store = this.memoryStore.get(storeName);
    if (!store) {
      return [];
    }
    return Array.from(store.values());
  }

  /**
   * 从内存删除单个数据对象
   */
  async delete(storeName: string, key: any): Promise<void> {
    const store = this.memoryStore.get(storeName);
    if (store) {
      store.delete(key);
    }
  }

  /**
   * 清空内存中的对象存储
   */
  async clear(storeName: string): Promise<void> {
    this.memoryStore.delete(storeName);
  }

  /**
   * 按时间清理过期数据（内存模式下简化实现）
   */
  async cleanupByAge(storeName: string, maxAgeDays: number): Promise<number> {
    const store = this.memoryStore.get(storeName);
    if (!store) {
      return 0;
    }

    const cutoffTime = new Date();
    cutoffTime.setDate(cutoffTime.getDate() - maxAgeDays);
    const cutoffTimestamp = cutoffTime.toISOString();

    let deletedCount = 0;
    for (const [key, value] of store.entries()) {
      if (value.timestamp && value.timestamp < cutoffTimestamp) {
        store.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * 按数量清理数据（内存模式下简化实现）
   */
  async cleanupByCount(storeName: string, maxCount: number): Promise<number> {
    const store = this.memoryStore.get(storeName);
    if (!store) {
      return 0;
    }

    const items = Array.from(store.entries());
    if (items.length <= maxCount) {
      return 0;
    }

    // 按时间戳排序（假设数据有 timestamp 字段）
    items.sort((a, b) => {
      const timeA = a[1].timestamp || "";
      const timeB = b[1].timestamp || "";
      return timeB.localeCompare(timeA); // 倒序（最新的在前）
    });

    // 删除超出限制的旧数据
    let deletedCount = 0;
    for (let i = maxCount; i < items.length; i++) {
      store.delete(items[i][0]);
      deletedCount++;
    }

    return deletedCount;
  }
}

// ============================================
// 类型定义
// ============================================

/**
 * 缓存数据接口
 * 包含所有需要缓存的数据类型
 */
export interface CachedData {
  persons: any[];
  fingerprints: any[];
  nfcCards: any[];
  tempPasswords: any[];
  unlockLogs: any[];
  eventLogs: any[];
  visitRecords: any[];
  recentActivities: any[];
}

/**
 * 同步结果接口
 * 描述本地和服务器数据的差异
 */
interface SyncResult<T> {
  toAdd: T[]; // 需要添加到本地的数据
  toUpdate: T[]; // 需要更新的数据
  toDelete: T[]; // 需要从本地删除的数据
}

/**
 * LocalStorageService 类
 * 提供统一的本地存储服务，管理所有 IndexedDB 操作
 */
class LocalStorageService {
  // 单例实例
  private static instance: LocalStorageService;

  // 数据库配置常量
  private readonly DB_NAME = "SmartDoorlockDB";
  private readonly DB_VERSION = 2;

  // 数据库实例
  private db: IDBDatabase | null = null;

  // 初始化状态
  private isInitialized: boolean = false;

  // 降级模式标志
  private isFallbackMode: boolean = false;

  // 降级存储实例
  private fallbackStorage: FallbackStorage = new FallbackStorage();

  // 私有构造函数，确保单例模式
  private constructor() {}

  /**
   * 获取单例实例
   * @returns LocalStorageService 实例
   */
  public static getInstance(): LocalStorageService {
    if (!LocalStorageService.instance) {
      LocalStorageService.instance = new LocalStorageService();
    }
    return LocalStorageService.instance;
  }

  /**
   * 获取数据库名称
   * @returns 数据库名称
   */
  public getDbName(): string {
    return this.DB_NAME;
  }

  /**
   * 获取数据库版本
   * @returns 数据库版本号
   */
  public getDbVersion(): number {
    return this.DB_VERSION;
  }

  /**
   * 检查服务是否可用
   * @returns 如果 IndexedDB 可用且已初始化返回 true，否则返回 false
   */
  public isAvailable(): boolean {
    return this.isInitialized && !this.isFallbackMode;
  }

  /**
   * 检查是否处于降级模式
   * @returns 如果处于降级模式返回 true
   */
  public isInFallbackMode(): boolean {
    return this.isFallbackMode;
  }

  /**
   * 获取数据库实例
   * @returns 数据库实例或 null
   */
  public getDb(): IDBDatabase | null {
    return this.db;
  }

  /**
   * 初始化数据库
   * 打开 IndexedDB 并创建/升级对象存储
   * 如果失败则降级到内存模式
   * 需求: 1.2, 1.3, 1.4
   */
  public async init(): Promise<void> {
    // 如果已经初始化，直接返回
    if (this.isInitialized) {
      console.log("LocalStorageService 已初始化");
      return;
    }

    // 检查 IndexedDB 是否可用
    if (!window.indexedDB) {
      console.warn("IndexedDB 不可用，降级到内存模式");
      this.enableFallbackMode();
      return;
    }

    try {
      // 打开数据库
      this.db = await this.openDatabase();
      this.isInitialized = true;
      console.log(`数据库 ${this.DB_NAME} v${this.DB_VERSION} 初始化成功`);
    } catch (error) {
      console.error("数据库初始化失败:", error);
      console.warn("降级到内存模式");
      this.enableFallbackMode();
    }
  }

  /**
   * 打开数据库
   * @returns Promise<IDBDatabase>
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      // 数据库升级事件（创建或升级对象存储）
      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion || this.DB_VERSION;

        console.log(`数据库升级: v${oldVersion} -> v${newVersion}`);

        try {
          this.upgradeDatabase(db, oldVersion, newVersion);
        } catch (error) {
          console.error("数据库升级失败:", error);
          reject(error);
        }
      };

      // 成功打开数据库
      request.onsuccess = (event: Event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      // 打开数据库失败
      request.onerror = (event: Event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        reject(error);
      };

      // 数据库被阻塞（通常是其他标签页打开了旧版本）
      request.onblocked = () => {
        console.warn("数据库升级被阻塞，请关闭其他标签页");
      };
    });
  }

  /**
   * 升级数据库结构
   * 创建所有对象存储和索引
   * @param db 数据库实例
   * @param oldVersion 旧版本号
   * @param newVersion 新版本号
   */
  private upgradeDatabase(
    db: IDBDatabase,
    oldVersion: number,
    newVersion: number,
  ): void {
    // 版本 1 -> 版本 2 的升级
    if (oldVersion < 1) {
      // 全新安装，创建所有对象存储
      this.createAllStores(db);
    } else if (oldVersion === 1 && newVersion >= 2) {
      // 从版本 1 升级到版本 2
      // 保留现有的 deviceStatus 和 videos 对象存储
      // 创建新的对象存储
      this.createNewStoresForV2(db);
    }
  }

  /**
   * 创建所有对象存储（全新安装）
   * @param db 数据库实例
   */
  private createAllStores(db: IDBDatabase): void {
    // 1. deviceStatus - 设备状态（已存在于版本 1）
    if (!db.objectStoreNames.contains("deviceStatus")) {
      const deviceStatusStore = db.createObjectStore("deviceStatus", {
        keyPath: "deviceId",
      });
      deviceStatusStore.createIndex("lastUpdate", "lastUpdate", {
        unique: false,
      });
    }

    // 2. videos - 视频文件（已存在于版本 1）
    if (!db.objectStoreNames.contains("videos")) {
      const videosStore = db.createObjectStore("videos", {
        keyPath: "recordId",
      });
      videosStore.createIndex("mediaId", "mediaId", { unique: false });
      videosStore.createIndex("createdAt", "createdAt", { unique: false });
      videosStore.createIndex("recordType", "recordType", { unique: false });
    }

    // 3. persons - 人脸列表
    if (!db.objectStoreNames.contains("persons")) {
      db.createObjectStore("persons", { keyPath: "id" });
    }

    // 4. fingerprints - 指纹列表
    if (!db.objectStoreNames.contains("fingerprints")) {
      const fingerprintsStore = db.createObjectStore("fingerprints", {
        keyPath: "id",
      });
      fingerprintsStore.createIndex("registeredAt", "registeredAt", {
        unique: false,
      });
    }

    // 5. nfcCards - NFC 卡片列表
    if (!db.objectStoreNames.contains("nfcCards")) {
      const nfcCardsStore = db.createObjectStore("nfcCards", {
        keyPath: "id",
      });
      nfcCardsStore.createIndex("registeredAt", "registeredAt", {
        unique: false,
      });
    }

    // 6. tempPasswords - 临时密码列表
    if (!db.objectStoreNames.contains("tempPasswords")) {
      const tempPasswordsStore = db.createObjectStore("tempPasswords", {
        keyPath: "id",
      });
      tempPasswordsStore.createIndex("createdAt", "createdAt", {
        unique: false,
      });
      tempPasswordsStore.createIndex("isExpired", "isExpired", {
        unique: false,
      });
    }

    // 7. unlockLogs - 开锁记录
    if (!db.objectStoreNames.contains("unlockLogs")) {
      const unlockLogsStore = db.createObjectStore("unlockLogs", {
        keyPath: "id",
      });
      unlockLogsStore.createIndex("timestamp", "timestamp", {
        unique: false,
      });
    }

    // 8. eventLogs - 事件记录
    if (!db.objectStoreNames.contains("eventLogs")) {
      const eventLogsStore = db.createObjectStore("eventLogs", {
        keyPath: "id",
      });
      eventLogsStore.createIndex("timestamp", "timestamp", { unique: false });
    }

    // 9. visitRecords - 到访记录
    if (!db.objectStoreNames.contains("visitRecords")) {
      const visitRecordsStore = db.createObjectStore("visitRecords", {
        keyPath: "id",
      });
      visitRecordsStore.createIndex("timestamp", "timestamp", {
        unique: false,
      });
    }

    // 10. recentActivities - 最近动态
    if (!db.objectStoreNames.contains("recentActivities")) {
      const recentActivitiesStore = db.createObjectStore("recentActivities", {
        keyPath: "id",
      });
      recentActivitiesStore.createIndex("timestamp", "timestamp", {
        unique: false,
      });
    }

    // 11. appSettings - 应用设置
    if (!db.objectStoreNames.contains("appSettings")) {
      db.createObjectStore("appSettings", { keyPath: "key" });
    }
  }

  /**
   * 创建版本 2 的新对象存储
   * 保留现有的 deviceStatus 和 videos
   * @param db 数据库实例
   */
  private createNewStoresForV2(db: IDBDatabase): void {
    console.log("从版本 1 升级到版本 2，保留现有数据");

    // 3. persons - 人脸列表
    if (!db.objectStoreNames.contains("persons")) {
      db.createObjectStore("persons", { keyPath: "id" });
    }

    // 4. fingerprints - 指纹列表
    if (!db.objectStoreNames.contains("fingerprints")) {
      const fingerprintsStore = db.createObjectStore("fingerprints", {
        keyPath: "id",
      });
      fingerprintsStore.createIndex("registeredAt", "registeredAt", {
        unique: false,
      });
    }

    // 5. nfcCards - NFC 卡片列表
    if (!db.objectStoreNames.contains("nfcCards")) {
      const nfcCardsStore = db.createObjectStore("nfcCards", {
        keyPath: "id",
      });
      nfcCardsStore.createIndex("registeredAt", "registeredAt", {
        unique: false,
      });
    }

    // 6. tempPasswords - 临时密码列表
    if (!db.objectStoreNames.contains("tempPasswords")) {
      const tempPasswordsStore = db.createObjectStore("tempPasswords", {
        keyPath: "id",
      });
      tempPasswordsStore.createIndex("createdAt", "createdAt", {
        unique: false,
      });
      tempPasswordsStore.createIndex("isExpired", "isExpired", {
        unique: false,
      });
    }

    // 7. unlockLogs - 开锁记录
    if (!db.objectStoreNames.contains("unlockLogs")) {
      const unlockLogsStore = db.createObjectStore("unlockLogs", {
        keyPath: "id",
      });
      unlockLogsStore.createIndex("timestamp", "timestamp", {
        unique: false,
      });
    }

    // 8. eventLogs - 事件记录
    if (!db.objectStoreNames.contains("eventLogs")) {
      const eventLogsStore = db.createObjectStore("eventLogs", {
        keyPath: "id",
      });
      eventLogsStore.createIndex("timestamp", "timestamp", { unique: false });
    }

    // 9. visitRecords - 到访记录
    if (!db.objectStoreNames.contains("visitRecords")) {
      const visitRecordsStore = db.createObjectStore("visitRecords", {
        keyPath: "id",
      });
      visitRecordsStore.createIndex("timestamp", "timestamp", {
        unique: false,
      });
    }

    // 10. recentActivities - 最近动态
    if (!db.objectStoreNames.contains("recentActivities")) {
      const recentActivitiesStore = db.createObjectStore("recentActivities", {
        keyPath: "id",
      });
      recentActivitiesStore.createIndex("timestamp", "timestamp", {
        unique: false,
      });
    }

    // 11. appSettings - 应用设置
    if (!db.objectStoreNames.contains("appSettings")) {
      db.createObjectStore("appSettings", { keyPath: "key" });
    }
  }

  /**
   * 启用降级模式
   * 当 IndexedDB 不可用时切换到纯内存模式
   * 需求: 1.5, 14.1, 14.2, 14.3
   */
  private enableFallbackMode(): void {
    this.isFallbackMode = true;
    this.isInitialized = true;
    console.warn("⚠️ 已启用降级模式，数据将存储在内存中，页面刷新后丢失");
  }

  /**
   * 验证数据对象
   * 检查数据是否包含必需字段
   * @param data 要验证的数据对象
   * @param requiredFields 必需字段列表
   * @returns boolean 如果数据有效返回 true
   * 需求: 14.4, 16.3
   */
  private validateData(
    data: any,
    requiredFields: string[] = [],
  ): { valid: boolean; error?: string } {
    // 检查数据是否为对象
    if (!data || typeof data !== "object") {
      return { valid: false, error: "数据必须是对象类型" };
    }

    // 检查必需字段
    for (const field of requiredFields) {
      if (!(field in data)) {
        return { valid: false, error: `缺少必需字段: ${field}` };
      }
    }

    return { valid: true };
  }

  /**
   * 处理存储空间不足错误
   * 自动清理旧数据并重试
   * @param storeName 对象存储名称
   * @param data 要保存的数据
   * @returns Promise<void>
   * 需求: 14.2, 14.4, 14.5
   */
  private async handleQuotaExceeded<T>(
    storeName: string,
    data: T,
  ): Promise<void> {
    console.warn("存储空间不足，尝试清理旧数据...");

    try {
      // 执行数据清理
      await this.cleanupExpiredData();

      // 重试保存操作
      await this.save(storeName, data);
      console.log("清理后重试保存成功");
    } catch (retryError) {
      console.error("清理后仍无法保存数据:", retryError);
      throw new Error("存储空间不足，请手动清理缓存");
    }
  }

  /**
   * 保存单个数据对象（带错误处理）
   * @param storeName 对象存储名称
   * @param data 要保存的数据对象
   * @param options 选项（是否验证、必需字段）
   * @returns Promise<void>
   * 需求: 14.2, 14.4, 14.5, 16.3
   */
  public async saveWithErrorHandling<T>(
    storeName: string,
    data: T,
    options?: { validate?: boolean; requiredFields?: string[] },
  ): Promise<void> {
    // 数据验证
    if (options?.validate) {
      const validation = this.validateData(data, options.requiredFields);
      if (!validation.valid) {
        console.error("数据验证失败:", validation.error);
        throw new Error(`数据验证失败: ${validation.error}`);
      }
    }

    try {
      await this.save(storeName, data);
    } catch (error: any) {
      // 处理存储空间不足错误
      if (
        error.name === "QuotaExceededError" ||
        error.message?.includes("quota")
      ) {
        await this.handleQuotaExceeded(storeName, data);
      } else {
        // 其他错误：记录日志但不中断应用
        console.error(`保存数据到 ${storeName} 失败:`, error);
        throw error;
      }
    }
  }

  /**
   * 保存单个数据对象
   * @param storeName 对象存储名称
   * @param data 要保存的数据对象
   * @returns Promise<void>
   * 需求: 1.1, 15.1
   */
  public async save<T>(storeName: string, data: T): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("LocalStorageService 未初始化，请先调用 init()");
    }

    if (this.isFallbackMode) {
      // 降级模式：使用内存存储
      return this.fallbackStorage.save(storeName, data as any);
    }

    if (!this.db) {
      throw new Error("数据库实例不可用");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          const error = request.error;
          console.error(`保存数据到 ${storeName} 失败:`, error);
          reject(error);
        };

        transaction.onerror = () => {
          const error = transaction.error;
          console.error(`事务错误 (${storeName}):`, error);
          reject(error);
        };

        transaction.onabort = () => {
          console.error(`事务被中止 (${storeName})`);
          reject(new Error("事务被中止"));
        };
      } catch (error) {
        console.error(`保存数据异常 (${storeName}):`, error);
        reject(error);
      }
    });
  }

  /**
   * 批量保存数据对象
   * @param storeName 对象存储名称
   * @param dataList 要保存的数据对象数组
   * @returns Promise<void>
   * 需求: 15.1
   */
  public async saveBatch<T>(storeName: string, dataList: T[]): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("LocalStorageService 未初始化，请先调用 init()");
    }

    if (this.isFallbackMode) {
      // 降级模式：使用内存存储
      return this.fallbackStorage.saveBatch(storeName, dataList as any);
    }

    if (!this.db) {
      throw new Error("数据库实例不可用");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);

        // 批量添加所有数据
        for (const data of dataList) {
          store.put(data);
        }

        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          reject(transaction.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取单个数据对象
   * @param storeName 对象存储名称
   * @param key 主键值
   * @returns Promise<T | null> 数据对象或 null
   * 需求: 1.1
   */
  public async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
    if (!this.isInitialized) {
      throw new Error("LocalStorageService 未初始化，请先调用 init()");
    }

    if (this.isFallbackMode) {
      // 降级模式：从内存读取
      return this.fallbackStorage.get<T>(storeName, key);
    }

    if (!this.db) {
      throw new Error("数据库实例不可用");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 获取所有数据对象
   * @param storeName 对象存储名称
   * @returns Promise<T[]> 数据对象数组
   * 需求: 1.1
   */
  public async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.isInitialized) {
      throw new Error("LocalStorageService 未初始化，请先调用 init()");
    }

    if (this.isFallbackMode) {
      // 降级模式：从内存读取
      return this.fallbackStorage.getAll<T>(storeName);
    }

    if (!this.db) {
      throw new Error("数据库实例不可用");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 查询数据对象（支持索引和分页）
   * @param storeName 对象存储名称
   * @param indexName 索引名称
   * @param range 查询范围
   * @param options 查询选项（分页参数）
   * @returns Promise<T[]> 数据对象数组
   * 需求: 15.3
   */
  public async query<T>(
    storeName: string,
    indexName: string,
    range?: IDBKeyRange,
    options?: { offset?: number; limit?: number },
  ): Promise<T[]> {
    if (!this.isInitialized) {
      throw new Error("LocalStorageService 未初始化，请先调用 init()");
    }

    if (this.isFallbackMode) {
      // 降级模式：从内存查询
      console.warn("降级模式下从内存查询数据");
      return [];
    }

    if (!this.db) {
      throw new Error("数据库实例不可用");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], "readonly");
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);

        const results: T[] = [];
        const offset = options?.offset || 0;
        const limit = options?.limit;
        let count = 0;

        const request = index.openCursor(range, "prev"); // 倒序（最新的在前）

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
            .result;

          if (cursor) {
            // 跳过 offset 之前的记录
            if (count < offset) {
              count++;
              cursor.continue();
              return;
            }

            // 如果设置了 limit 且已达到限制，停止
            if (limit && results.length >= limit) {
              resolve(results);
              return;
            }

            results.push(cursor.value);
            count++;
            cursor.continue();
          } else {
            // 没有更多记录
            resolve(results);
          }
        };

        request.onerror = () => {
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 删除单个数据对象
   * @param storeName 对象存储名称
   * @param key 主键值
   * @returns Promise<void>
   * 需求: 1.1
   */
  public async delete(storeName: string, key: IDBValidKey): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("LocalStorageService 未初始化，请先调用 init()");
    }

    if (this.isFallbackMode) {
      // 降级模式：从内存删除
      return this.fallbackStorage.delete(storeName, key);
    }

    if (!this.db) {
      throw new Error("数据库实例不可用");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };

        transaction.onerror = () => {
          reject(transaction.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 清空对象存储中的所有数据
   * @param storeName 对象存储名称
   * @returns Promise<void>
   * 需求: 1.1
   */
  public async clear(storeName: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("LocalStorageService 未初始化，请先调用 init()");
    }

    if (this.isFallbackMode) {
      // 降级模式：清空内存
      return this.fallbackStorage.clear(storeName);
    }

    if (!this.db) {
      throw new Error("数据库实例不可用");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };

        transaction.onerror = () => {
          reject(transaction.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================
  // 数据清理方法 (CleanupManager)
  // ============================================

  /**
   * 按时间清理过期数据
   * 删除超过指定天数的记录
   * @param storeName 对象存储名称
   * @param maxAgeDays 最大保留天数
   * @returns Promise<number> 删除的记录数
   * 需求: 13.1, 13.2, 13.3
   */
  public async cleanupByAge(
    storeName: string,
    maxAgeDays: number,
  ): Promise<number> {
    if (!this.isInitialized) {
      throw new Error("LocalStorageService 未初始化，请先调用 init()");
    }

    if (this.isFallbackMode) {
      // 降级模式：使用内存清理
      return this.fallbackStorage.cleanupByAge(storeName, maxAgeDays);
    }

    if (!this.db) {
      throw new Error("数据库实例不可用");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const index = store.index("timestamp");

        // 计算截止时间
        const cutoffTime = new Date();
        cutoffTime.setDate(cutoffTime.getDate() - maxAgeDays);
        const cutoffTimestamp = cutoffTime.toISOString();

        // 查询所有早于截止时间的记录（不包括恰好等于截止时间的记录）
        const range = IDBKeyRange.upperBound(cutoffTimestamp, true);
        const request = index.openCursor(range);

        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
            .result;

          if (cursor) {
            // 删除当前记录
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            // 没有更多记录
            resolve(deletedCount);
          }
        };

        request.onerror = () => {
          reject(request.error);
        };

        transaction.onerror = () => {
          reject(transaction.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 按数量清理数据
   * 保留最新的 N 条记录，删除其余记录
   * @param storeName 对象存储名称
   * @param maxCount 最大保留数量
   * @returns Promise<number> 删除的记录数
   * 需求: 6.3, 6.4, 7.3, 7.4, 8.3, 8.4, 9.3
   */
  public async cleanupByCount(
    storeName: string,
    maxCount: number,
  ): Promise<number> {
    if (!this.isInitialized) {
      throw new Error("LocalStorageService 未初始化，请先调用 init()");
    }

    if (this.isFallbackMode) {
      // 降级模式：使用内存清理
      return this.fallbackStorage.cleanupByCount(storeName, maxCount);
    }

    if (!this.db) {
      throw new Error("数据库实例不可用");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction([storeName], "readwrite");
        const store = transaction.objectStore(storeName);
        const index = store.index("timestamp");

        // 打开游标，按时间倒序遍历（最新的在前）
        const request = index.openCursor(null, "prev");

        let count = 0;
        let deletedCount = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>)
            .result;

          if (cursor) {
            count++;

            // 如果超过最大数量，删除当前记录
            if (count > maxCount) {
              cursor.delete();
              deletedCount++;
            }

            cursor.continue();
          } else {
            // 没有更多记录
            resolve(deletedCount);
          }
        };

        request.onerror = () => {
          reject(request.error);
        };

        transaction.onerror = () => {
          reject(transaction.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 清理过期数据
   * 应用启动时自动调用，根据预设规则清理各类数据
   * 清理规则：
   * - unlockLogs: 30天或500条
   * - eventLogs: 30天或500条
   * - visitRecords: 30天或200条
   * - recentActivities: 50条
   * @returns Promise<void>
   * 需求: 13.1, 13.2, 13.3
   */
  public async cleanupExpiredData(): Promise<void> {
    if (!this.isInitialized) {
      console.warn("LocalStorageService 未初始化，跳过数据清理");
      return;
    }

    console.log("开始清理过期数据...");

    try {
      // 清理开锁记录：30天或500条
      const unlockLogsAgeDeleted = await this.cleanupByAge("unlockLogs", 30);
      const unlockLogsCountDeleted = await this.cleanupByCount(
        "unlockLogs",
        500,
      );

      // 清理事件记录：30天或500条
      const eventLogsAgeDeleted = await this.cleanupByAge("eventLogs", 30);
      const eventLogsCountDeleted = await this.cleanupByCount("eventLogs", 500);

      // 清理到访记录：30天或200条
      const visitRecordsAgeDeleted = await this.cleanupByAge(
        "visitRecords",
        30,
      );
      const visitRecordsCountDeleted = await this.cleanupByCount(
        "visitRecords",
        200,
      );

      // 清理最近动态：50条
      const recentActivitiesDeleted = await this.cleanupByCount(
        "recentActivities",
        50,
      );

      console.log("数据清理完成:", {
        unlockLogs: unlockLogsAgeDeleted + unlockLogsCountDeleted,
        eventLogs: eventLogsAgeDeleted + eventLogsCountDeleted,
        visitRecords: visitRecordsAgeDeleted + visitRecordsCountDeleted,
        recentActivities: recentActivitiesDeleted,
      });
    } catch (error) {
      console.error("数据清理失败:", error);
      // 不抛出错误，避免中断应用启动
    }
  }

  // ============================================
  // 数据同步方法 (SyncManager)
  // ============================================

  /**
   * 加载所有缓存数据
   * 应用启动时调用，立即显示缓存数据
   * @returns Promise<CachedData> 所有缓存的数据
   * 需求: 12.1
   */
  public async loadCachedData(): Promise<CachedData> {
    try {
      const [
        persons,
        fingerprints,
        nfcCards,
        tempPasswords,
        unlockLogs,
        eventLogs,
        visitRecords,
        recentActivities,
      ] = await Promise.all([
        this.getAll("persons"),
        this.getAll("fingerprints"),
        this.getAll("nfcCards"),
        this.getAll("tempPasswords"),
        this.getAll("unlockLogs"),
        this.getAll("eventLogs"),
        this.getAll("visitRecords"),
        this.getAll("recentActivities"),
      ]);

      console.log("缓存数据加载完成");

      return {
        persons,
        fingerprints,
        nfcCards,
        tempPasswords,
        unlockLogs,
        eventLogs,
        visitRecords,
        recentActivities,
      };
    } catch (error) {
      console.error("加载缓存数据失败:", error);
      // 返回空数据，不中断应用
      return {
        persons: [],
        fingerprints: [],
        nfcCards: [],
        tempPasswords: [],
        unlockLogs: [],
        eventLogs: [],
        visitRecords: [],
        recentActivities: [],
      };
    }
  }

  /**
   * 同步服务器数据到本地存储
   * 对比本地和服务器数据，执行增量更新
   * @param storeName 对象存储名称
   * @param serverData 服务器返回的数据数组
   * @param keyPath 主键字段名（默认为 'id'）
   * @returns Promise<void>
   * 需求: 12.3, 12.4
   */
  public async syncData<T extends Record<string, any>>(
    storeName: string,
    serverData: T[],
    keyPath: string = "id",
  ): Promise<void> {
    try {
      // 1. 获取本地缓存数据
      const cachedData = await this.getAll<T>(storeName);

      // 2. 对比数据，找出差异
      const syncResult = this.compareData(cachedData, serverData, keyPath);

      // 3. 为所有服务器数据添加 cachedAt 时间戳
      const dataWithTimestamp = serverData.map((item) => ({
        ...item,
        cachedAt: Date.now(),
      }));

      // 4. 执行增量更新
      if (syncResult.toDelete.length > 0) {
        // 删除本地存在但服务器不存在的数据
        for (const item of syncResult.toDelete) {
          await this.delete(storeName, item[keyPath]);
        }
      }

      if (syncResult.toAdd.length > 0 || syncResult.toUpdate.length > 0) {
        // 批量保存新增和更新的数据
        const toSave = dataWithTimestamp.filter((item) => {
          const key = item[keyPath];
          return (
            syncResult.toAdd.some((a) => a[keyPath] === key) ||
            syncResult.toUpdate.some((u) => u[keyPath] === key)
          );
        });

        if (toSave.length > 0) {
          await this.saveBatch(storeName, toSave);
        }
      }

      console.log(`${storeName} 数据同步完成`);
    } catch (error) {
      console.error(`同步 ${storeName} 数据失败:`, error);
      // 不抛出错误，避免中断应用
    }
  }

  /**
   * 对比本地和服务器数据
   * 找出需要添加、更新、删除的数据
   * @param cached 本地缓存数据
   * @param server 服务器数据
   * @param keyPath 主键字段名
   * @returns SyncResult<T> 同步结果
   * 需求: 12.3, 16.2
   */
  private compareData<T extends Record<string, any>>(
    cached: T[],
    server: T[],
    keyPath: string,
  ): SyncResult<T> {
    const result: SyncResult<T> = {
      toAdd: [],
      toUpdate: [],
      toDelete: [],
    };

    // 创建服务器数据的 Map，便于快速查找
    const serverMap = new Map<any, T>();
    for (const item of server) {
      serverMap.set(item[keyPath], item);
    }

    // 创建本地数据的 Map
    const cachedMap = new Map<any, T>();
    for (const item of cached) {
      cachedMap.set(item[keyPath], item);
    }

    // 1. 找出需要添加和更新的数据
    for (const serverItem of server) {
      const key = serverItem[keyPath];
      const cachedItem = cachedMap.get(key);

      if (!cachedItem) {
        // 本地不存在，需要添加
        result.toAdd.push(serverItem);
      } else {
        // 本地存在，检查是否需要更新
        // 简单对比：如果数据不完全相同，则更新（以服务器数据为准）
        if (this.isDifferent(cachedItem, serverItem)) {
          result.toUpdate.push(serverItem);
        }
      }
    }

    // 2. 找出需要删除的数据（本地存在但服务器不存在）
    for (const cachedItem of cached) {
      const key = cachedItem[keyPath];
      if (!serverMap.has(key)) {
        result.toDelete.push(cachedItem);
      }
    }

    return result;
  }

  /**
   * 判断两个数据对象是否不同
   * 忽略 cachedAt 字段
   * @param cached 本地缓存数据
   * @param server 服务器数据
   * @returns boolean 如果不同返回 true
   */
  private isDifferent(
    cached: Record<string, any>,
    server: Record<string, any>,
  ): boolean {
    // 简单实现：比较 JSON 字符串
    // 忽略 cachedAt 字段
    const cachedCopy = { ...cached };
    delete cachedCopy.cachedAt;

    const serverCopy = { ...server };
    delete serverCopy.cachedAt;

    return JSON.stringify(cachedCopy) !== JSON.stringify(serverCopy);
  }

  // ============================================
  // 应用设置专用方法 (任务 4.1)
  // ============================================

  /**
   * 预设的设置键常量
   * 需求: 10.2, 10.5, 11.1
   */
  public readonly SETTING_KEYS = {
    CURRENT_TAB: "currentTab",
    AUTO_DOWNLOAD: "autoDownload",
    VOLUME: "volume",
    NOTIFICATION_ENABLED: "notificationEnabled",
  } as const;

  /**
   * 默认设置值
   * 需求: 10.5, 11.4
   */
  private readonly DEFAULT_SETTINGS: Record<string, any> = {
    [this.SETTING_KEYS.CURRENT_TAB]: "home",
    [this.SETTING_KEYS.AUTO_DOWNLOAD]: false,
    [this.SETTING_KEYS.VOLUME]: 80,
    [this.SETTING_KEYS.NOTIFICATION_ENABLED]: true,
  };

  /**
   * 保存单个设置项
   * @param key 设置键
   * @param value 设置值
   * @returns Promise<void>
   * 需求: 10.2, 10.3
   */
  public async saveSetting(key: string, value: any): Promise<void> {
    const setting = {
      key,
      value,
      updatedAt: Date.now(),
    };

    try {
      await this.save("appSettings", setting);
    } catch (error) {
      console.error(`保存设置失败 (${key}):`, error);
      throw error;
    }
  }

  /**
   * 获取单个设置项
   * 如果设置不存在，返回默认值
   * @param key 设置键
   * @param defaultValue 默认值（可选，如果未提供则使用预设默认值）
   * @returns Promise<any> 设置值
   * 需求: 10.4, 10.5, 11.4
   */
  public async getSetting(key: string, defaultValue?: any): Promise<any> {
    try {
      const setting = await this.get<{ key: string; value: any }>(
        "appSettings",
        key,
      );

      if (setting) {
        return setting.value;
      }

      // 如果设置不存在，返回默认值
      const finalDefault =
        defaultValue !== undefined ? defaultValue : this.DEFAULT_SETTINGS[key];

      return finalDefault;
    } catch (error) {
      console.error(`获取设置失败 (${key}):`, error);

      // 出错时返回默认值
      const finalDefault =
        defaultValue !== undefined ? defaultValue : this.DEFAULT_SETTINGS[key];
      return finalDefault;
    }
  }

  /**
   * 获取所有设置项
   * @returns Promise<Record<string, any>> 所有设置的键值对
   * 需求: 10.4
   */
  public async getAllSettings(): Promise<Record<string, any>> {
    try {
      const settings = await this.getAll<{ key: string; value: any }>(
        "appSettings",
      );

      // 转换为键值对对象
      const result: Record<string, any> = {};
      for (const setting of settings) {
        result[setting.key] = setting.value;
      }

      return result;
    } catch (error) {
      console.error("获取所有设置失败:", error);
      return {};
    }
  }
}

// 导出单例实例
export const localStorageService = LocalStorageService.getInstance();
