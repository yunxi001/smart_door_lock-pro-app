import React, { useEffect, useState, useRef } from "react";
import { BottomNav } from "./components/BottomNav";
import {
  VisitNotificationModal,
  VisitNotificationData,
} from "./components/VisitNotificationModal";
import { Toast } from "./components/Toast";
import { HomeScreen } from "./screens/HomeScreen";
import { MonitorScreen } from "./screens/MonitorScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import VisitorIntentScreen from "./screens/VisitorIntentScreen";
import PackageAlertScreen from "./screens/PackageAlertScreen";
import { deviceService } from "./services/DeviceService";
import {
  deviceStatusStorage,
  LocalDeviceStatus,
} from "./services/DeviceStatusStorageService";
import { localStorageService } from "./services/LocalStorageService";
import {
  ConnectionStatus,
  LogEntry,
  Person,
  VisitRecord,
  Stats,
  Tab,
  DeviceStatus,
  Activity,
  Fingerprint,
  NFCCard,
  TempPassword,
  VideoAttachment,
  VisitorIntent,
  PackageAlert,
  SubScreen,
} from "./types";
import { Lock } from "lucide-react";

// 卡号脱敏辅助函数
function maskCardId(cardId: string): string {
  if (!cardId || cardId.length < 4) return "****";
  return "****" + cardId.slice(-4);
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<Tab>("home");
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats>({
    videoFrames: 0,
    videoFps: 0,
    audioPackets: 0,
    dataReceived: 0,
  });
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);

  // 主题状态管理
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // 1. 优先从 localStorage 读取用户偏好
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    // 2. 如果没有保存的偏好，则根据系统偏好设置
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }

    // 3. 默认使用浅色模式
    return "light";
  });

  // 人脸管理数据
  const [persons, setPersons] = useState<Person[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);

  // 设备状态和最近动态
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [lastStatusUpdate, setLastStatusUpdate] = useState<number | null>(null);

  // 当前连接的设备 ID（用于本地存储）
  const [currentDeviceId, setCurrentDeviceId] =
    useState<string>("AA:BB:CC:DD:EE:FF");

  // 指纹管理数据
  const [fingerprints, setFingerprints] = useState<Fingerprint[]>([]);

  // NFC 卡片管理数据
  const [nfcCards, setNfcCards] = useState<NFCCard[]>([]);

  // 临时密码管理数据
  const [tempPasswords, setTempPasswords] = useState<TempPassword[]>([]);

  // 视频附件数据 (预留用于全局视频附件状态管理)
  // 注意: 当前 SettingsScreen 内部有独立的视频下载状态管理
  const [videoAttachments, setVideoAttachments] = useState<VideoAttachment[]>(
    [],
  );

  // ============================================
  // v2.5 协议新增状态 - 访客意图和快递警报
  // ============================================

  // 访客意图记录（保留最近100条）
  const [visitorIntents, setVisitorIntents] = useState<VisitorIntent[]>([]);

  // 快递警报记录（保留最近100条）
  const [packageAlerts, setPackageAlerts] = useState<PackageAlert[]>([]);

  // Toast通知队列（需求: 2.5）
  const [toastQueue, setToastQueue] = useState<
    Array<{
      id: string;
      message: string;
      type: "info" | "warning" | "error";
    }>
  >([]);

  // ============================================
  // v2.5 协议新增路由状态 - 详情页导航
  // ============================================

  // 当前子页面（用于详情页导航）
  const [currentSubScreen, setCurrentSubScreen] = useState<SubScreen | null>(
    null,
  );

  // 选中的访客意图（用于详情页展示）
  const [selectedIntent, setSelectedIntent] = useState<VisitorIntent | null>(
    null,
  );

  // 选中的快递警报列表（用于详情页展示，传递整个列表用于筛选）
  const [selectedAlerts, setSelectedAlerts] = useState<PackageAlert[]>([]);

  // 到访通知弹窗状态
  const [visitNotification, setVisitNotification] =
    useState<VisitNotificationData | null>(null);
  const [showVisitModal, setShowVisitModal] = useState(false);

  // 防止 Blob URL 内存泄漏
  const lastVideoSrcRef = useRef<string | null>(null);

  // Tab 状态保存的防抖定时器
  const tabSaveTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * 初始化 LocalStorageService 并加载缓存数据
   *
   * 功能：
   * 1. 初始化 IndexedDB 数据库
   * 2. 加载所有缓存的业务数据（人脸、指纹、NFC、密码、动态）
   * 3. 立即显示缓存数据，提供快速启动体验
   * 4. 恢复上次的 Tab 状态
   *
   * 需求: 12.1, 11.3
   */
  useEffect(() => {
    const initLocalStorage = async () => {
      try {
        // 初始化存储服务（打开 IndexedDB 数据库）
        await localStorageService.init();
        console.log("LocalStorageService 初始化成功");

        // 加载所有缓存数据（并行加载提高性能）
        const cached = await localStorageService.loadCachedData();

        // 立即显示缓存数据到 UI（无需等待网络请求）
        if (cached.persons.length > 0) {
          setPersons(cached.persons);
          console.log(`已加载 ${cached.persons.length} 条人脸数据`);
        }
        if (cached.fingerprints.length > 0) {
          setFingerprints(cached.fingerprints);
          console.log(`已加载 ${cached.fingerprints.length} 条指纹数据`);
        }
        if (cached.nfcCards.length > 0) {
          setNfcCards(cached.nfcCards);
          console.log(`已加载 ${cached.nfcCards.length} 条 NFC 卡片数据`);
        }
        if (cached.tempPasswords.length > 0) {
          setTempPasswords(cached.tempPasswords);
          console.log(`已加载 ${cached.tempPasswords.length} 条临时密码数据`);
        }
        if (cached.recentActivities.length > 0) {
          setRecentActivities(cached.recentActivities);
          console.log(`已加载 ${cached.recentActivities.length} 条最近动态`);
        }

        // v2.5 新增：加载访客意图和快递警报缓存数据
        // 需求: 18.1, 18.2, 18.3, 18.4, 18.5
        try {
          const cachedVisitorIntents =
            await localStorageService.getVisitorIntents(100);
          if (cachedVisitorIntents.length > 0) {
            setVisitorIntents(cachedVisitorIntents);
            console.log(`已加载 ${cachedVisitorIntents.length} 条访客意图数据`);
          }

          const cachedPackageAlerts =
            await localStorageService.getPackageAlerts(100);
          if (cachedPackageAlerts.length > 0) {
            setPackageAlerts(cachedPackageAlerts);
            console.log(`已加载 ${cachedPackageAlerts.length} 条快递警报数据`);
          }
        } catch (error) {
          console.error("加载访客意图和快递警报缓存失败:", error);
        }

        // 恢复上次的 Tab 状态（用户体验优化）
        const savedTab = await localStorageService.getSetting(
          "currentTab",
          "home",
        );
        setCurrentTab(savedTab as Tab);
        console.log(`已恢复 Tab 状态: ${savedTab}`);

        console.log("缓存数据加载完成");
      } catch (error) {
        console.error("初始化 LocalStorageService 失败:", error);
        // 错误不中断应用，降级到纯内存模式
      }
    };

    initLocalStorage();
  }, []);

  /**
   * 应用主题到 DOM 并监听系统主题变化
   *
   * 功能：
   * 1. 根据 theme 状态更新 document.documentElement 的 class
   * 2. 监听系统主题变化（当用户未设置偏好时自动切换）
   *
   * 需求: 3.1, 3.2
   */
  useEffect(() => {
    // 应用主题到 DOM
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // 监听系统主题变化
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      // 只有当用户没有手动设置偏好时，才跟随系统主题
      const savedTheme = localStorage.getItem("theme");
      if (!savedTheme) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    // 添加监听器（兼容旧版浏览器）
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else {
      // @ts-ignore - 兼容旧版 Safari
      mediaQuery.addListener(handleSystemThemeChange);
    }

    // 清理监听器
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      } else {
        // @ts-ignore - 兼容旧版 Safari
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [theme]);

  // 初始化设备状态存储服务，并加载本地缓存的设备状态
  useEffect(() => {
    const initAndLoadCachedStatus = async () => {
      try {
        await deviceStatusStorage.init();
        const cached = await deviceStatusStorage.loadStatus(currentDeviceId);
        if (cached) {
          // 从本地缓存恢复设备状态
          setDeviceStatus({
            battery: cached.battery,
            lux: cached.lux,
            lockState: cached.lockState,
            lightState: cached.lightState,
            online: false, // 缓存数据标记为离线
          });
          setLastStatusUpdate(cached.lastUpdate);
          console.log("从本地缓存恢复设备状态:", cached);
        }
      } catch (error) {
        console.error("初始化设备状态存储失败:", error);
      }
    };

    initAndLoadCachedStatus();
  }, [currentDeviceId]);

  /**
   * 切换到首页时触发查询
   * 需求: 18.1, 18.2, 18.3, 18.4, 18.5, 22.3
   *
   * 功能：
   * 1. 当用户切换到首页且设备已连接时，查询最新数据
   * 2. 实现查询错误处理和重试逻辑
   */
  useEffect(() => {
    // 只在切换到首页且设备已连接时触发查询
    if (currentTab === "home" && status === "connected") {
      try {
        // 查询最近5条访客意图
        deviceService.queryVisitorIntents({ limit: 5 });

        // 查询最近5条快递警报
        deviceService.queryPackageAlerts({ limit: 5 });

        console.log("已触发访客意图和快递警报查询");
      } catch (error) {
        console.error("触发查询失败:", error);
        // 错误不中断应用，用户可以手动刷新
      }
    }
  }, [currentTab, status]);

  useEffect(() => {
    // 订阅服务事件
    const unsubLog = deviceService.on("log", (_, data) => {
      setLogs((prev: LogEntry[]) => [
        ...prev.slice(-99),
        {
          id: Math.random().toString(36).substring(2, 11),
          timestamp: new Date().toLocaleTimeString(),
          message: data.msg,
          type: data.type,
        },
      ]);
    });

    const unsubStatus = deviceService.on("status", (_, s) => setStatus(s));

    const unsubStats = deviceService.on("stats", (_, s) => setStats(s));

    const unsubFrame = deviceService.on("frame", (_, url) => {
      if (lastVideoSrcRef.current) {
        URL.revokeObjectURL(lastVideoSrcRef.current);
      }
      lastVideoSrcRef.current = url;
      setVideoSrc(url);
    });

    const unsubTalk = deviceService.on("talkState", (_, state) =>
      setIsTalking(state),
    );

    const unsubFace = deviceService.on("face_response", async (_, msg) => {
      if (msg.status === "success") {
        // 处理 get_persons 响应
        if (msg.action === "get_persons") {
          // 更新内存状态
          setPersons(msg.data);

          // 同步到本地存储（增量更新）
          // 对比本地缓存和服务器数据，只更新有变化的部分
          // 需求: 2.2, 2.3, 2.4
          try {
            await localStorageService.syncData("persons", msg.data, "id");
            console.log("人脸数据已同步到本地存储");
          } catch (error) {
            console.error("同步人脸数据失败:", error);
            // 错误不中断应用
          }
        }
        // 处理 get_visits 响应
        if (msg.action === "get_visits") {
          setVisits(msg.data.records || []);
        }
        // 处理 register 响应 - 添加成功日志并重新查询
        if (msg.action === "register") {
          setLogs((prev: LogEntry[]) => [
            ...prev.slice(-99),
            {
              id: Math.random().toString(36).substring(2, 11),
              timestamp: new Date().toLocaleTimeString(),
              message: `人脸注册成功: ${msg.data?.name || "新用户"}`,
              type: "success",
            },
          ]);
          // 重新查询人脸列表以同步到本地
          deviceService.sendFaceManagement("get_persons");
        }
        // 处理 delete_person 响应 - 添加成功日志并重新查询
        if (msg.action === "delete_person") {
          setLogs((prev: LogEntry[]) => [
            ...prev.slice(-99),
            {
              id: Math.random().toString(36).substring(2, 11),
              timestamp: new Date().toLocaleTimeString(),
              message: "人员删除成功",
              type: "success",
            },
          ]);
          // 重新查询人脸列表以同步到本地
          deviceService.sendFaceManagement("get_persons");
        }
      } else {
        // 处理失败响应
        const actionText: Record<string, string> = {
          get_persons: "获取人员列表",
          register: "人脸注册",
          delete_person: "删除人员",
          get_visits: "获取到访记录",
        };
        setLogs((prev: LogEntry[]) => [
          ...prev.slice(-99),
          {
            id: Math.random().toString(36).substring(2, 11),
            timestamp: new Date().toLocaleTimeString(),
            message: `${actionText[msg.action] || msg.action}失败: ${msg.message || "未知错误"}`,
            type: "error",
          },
        ]);
      }
    });

    const unsubVisit = deviceService.on("visit", async (_, data) => {
      const name = data.person_name || "陌生人";
      const result = data.access_granted ? "已开门" : "拒绝访问";
      const msg = `🔔 到访通知: ${name} - ${result}`;

      // 添加特殊日志
      setLogs((prev: LogEntry[]) => [
        ...prev.slice(-99),
        {
          id: Math.random().toString(36).substring(2, 11),
          timestamp: new Date().toLocaleTimeString(),
          message: msg,
          type: "warning",
        },
      ]);

      // 构造完整的 visitRecord 对象
      const visitRecord = {
        id: data.visit_id || Date.now(),
        visit_time: new Date(data.ts * 1000).toISOString(),
        person_name: data.person_name || "陌生人",
        result: data.result || "unknown",
        access_granted: data.access_granted || false,
        timestamp: new Date(data.ts * 1000).toISOString(),
      };

      // 保存到本地存储
      try {
        await localStorageService.save("visitRecords", visitRecord);
        console.log("到访记录已保存到本地存储");
      } catch (error) {
        console.error("保存到访记录失败:", error);
      }

      // 添加到最近动态
      const activity: Activity = {
        id: Math.random().toString(36).substring(2, 11),
        type: "visit",
        title: name,
        description: result,
        timestamp: new Date().toISOString(),
      };
      setRecentActivities((prev: Activity[]) =>
        [activity, ...prev].slice(0, 10),
      );

      // 保存最近动态到本地存储
      try {
        await localStorageService.save("recentActivities", activity);
        console.log("最近动态已保存到本地存储");
      } catch (error) {
        console.error("保存最近动态失败:", error);
      }

      // 显示到访通知弹窗
      const notificationData: VisitNotificationData = {
        visit_id: data.visit_id || 0,
        person_id: data.person_id || null,
        person_name: data.person_name || "陌生人",
        relation: data.relation || "",
        result: data.result || "unknown",
        access_granted: data.access_granted || false,
        image: data.image || "",
        image_path: data.image_path || "",
        timestamp: data.ts || Math.floor(Date.now() / 1000),
      };
      setVisitNotification(notificationData);
      setShowVisitModal(true);
    });

    // 订阅设备状态上报
    const unsubStatusReport = deviceService.on("status_report", (_, data) => {
      const newStatus: DeviceStatus = {
        battery: data.data?.bat ?? data.bat ?? 0,
        lux: data.data?.lux ?? data.lux ?? 0,
        lockState: data.data?.lock ?? data.lock ?? 0,
        lightState: data.data?.light ?? data.light ?? 0,
        online: true,
      };
      setDeviceStatus(newStatus);
      setLastStatusUpdate(Date.now());

      // 保存到本地存储
      deviceStatusStorage
        .saveStatus(currentDeviceId, newStatus)
        .catch((err) => {
          console.error("保存设备状态到本地失败:", err);
        });
    });

    // 订阅设备上下线通知
    const unsubDeviceStatus = deviceService.on("device_status", (_, data) => {
      if (data.status === "online") {
        // 设备上线：如果没有状态则创建默认状态，否则更新在线标志
        setDeviceStatus((prev: DeviceStatus | null) =>
          prev
            ? { ...prev, online: true }
            : {
                battery: 0,
                lux: 0,
                lockState: 0,
                lightState: 0,
                online: true,
              },
        );
      } else {
        // 设备离线：只更新在线标志
        setDeviceStatus((prev: DeviceStatus | null) =>
          prev ? { ...prev, online: false } : null,
        );
      }
    });

    // 订阅事件上报
    const unsubEventReport = deviceService.on(
      "event_report",
      async (_, data) => {
        const eventTextMap: Record<string, string> = {
          bell: "有人按门铃",
          pir_trigger: "检测到移动",
          tamper: "撬锁报警",
          door_open: "门已打开",
          low_battery: "低电量警告",
        };

        // 构造完整的 eventLog 对象
        const eventLog = {
          id: Date.now(),
          event: data.event,
          param: data.param,
          timestamp: new Date(data.ts * 1000).toISOString(),
        };

        // 保存到本地存储
        try {
          await localStorageService.save("eventLogs", eventLog);
          console.log("事件记录已保存到本地存储");
        } catch (error) {
          console.error("保存事件记录失败:", error);
        }

        // 创建最近动态
        const activity: Activity = {
          id: Math.random().toString(36).substring(2, 11),
          type: "event",
          title: eventTextMap[data.event] || data.event,
          description: `参数: ${data.param}`,
          timestamp: new Date(data.ts * 1000).toISOString(),
        };
        setRecentActivities((prev: Activity[]) =>
          [activity, ...prev].slice(0, 10),
        );

        // 保存最近动态到本地存储
        try {
          await localStorageService.save("recentActivities", activity);
          console.log("最近动态已保存到本地存储");
        } catch (error) {
          console.error("保存最近动态失败:", error);
        }
      },
    );

    // 订阅开锁日志
    const unsubLogReport = deviceService.on("log_report", async (_, data) => {
      const methodMap: Record<string, string> = {
        face: "人脸识别",
        fingerprint: "指纹",
        password: "密码",
        nfc: "NFC卡片",
        remote: "远程开锁",
        temp_code: "临时密码",
        key: "钥匙",
      };

      // 构造完整的 unlockLog 对象
      const unlockLog = {
        id: data.data.id || Date.now(),
        method: data.data.method,
        uid: data.data.uid,
        status: data.data.status || (data.data.result ? "success" : "fail"),
        lock_time: data.data.lock_time || data.ts,
        timestamp: new Date(data.ts * 1000).toISOString(),
        user_name: data.data.user_name,
        hasVideo: data.data.hasVideo,
        mediaId: data.data.mediaId,
        videoFilePath: data.data.videoFilePath,
        videoFileSize: data.data.videoFileSize,
        videoDuration: data.data.videoDuration,
        videoThumbnailUrl: data.data.videoThumbnailUrl,
      };

      // 保存到本地存储
      try {
        await localStorageService.save("unlockLogs", unlockLog);
        console.log("开锁记录已保存到本地存储");
      } catch (error) {
        console.error("保存开锁记录失败:", error);
      }

      // 创建最近动态
      const activity: Activity = {
        id: Math.random().toString(36).substring(2, 11),
        type: "unlock",
        title: methodMap[data.data.method] || data.data.method,
        description: data.data.result ? "开锁成功" : "开锁失败",
        timestamp: new Date(data.ts * 1000).toISOString(),
      };
      setRecentActivities((prev: Activity[]) =>
        [activity, ...prev].slice(0, 10),
      );

      // 保存最近动态到本地存储
      try {
        await localStorageService.save("recentActivities", activity);
        console.log("最近动态已保存到本地存储");
      } catch (error) {
        console.error("保存最近动态失败:", error);
      }
    });

    // 订阅 server_ack 事件 - 处理服务器确认消息
    const unsubServerAck = deviceService.on("server_ack", (_, msg) => {
      const { code, msg: message } = msg;

      // 根据 code 字段显示对应提示
      switch (code) {
        case 0:
          // 成功 - 无需额外处理，DeviceService 已记录日志
          break;
        case 1:
          // 设备离线 - 更新设备状态
          setDeviceStatus((prev: DeviceStatus | null) =>
            prev ? { ...prev, online: false } : null,
          );
          break;
        case 2:
          // 参数错误
          setLogs((prev: LogEntry[]) => [
            ...prev.slice(-99),
            {
              id: Math.random().toString(36).substring(2, 11),
              timestamp: new Date().toLocaleTimeString(),
              message: `参数错误: ${message}`,
              type: "error",
            },
          ]);
          break;
        case 3:
          // 未认证
          setLogs((prev: LogEntry[]) => [
            ...prev.slice(-99),
            {
              id: Math.random().toString(36).substring(2, 11),
              timestamp: new Date().toLocaleTimeString(),
              message: "未认证，请重新连接",
              type: "error",
            },
          ]);
          break;
        case 4:
          // 内部错误
          setLogs((prev: LogEntry[]) => [
            ...prev.slice(-99),
            {
              id: Math.random().toString(36).substring(2, 11),
              timestamp: new Date().toLocaleTimeString(),
              message: "服务器内部错误",
              type: "error",
            },
          ]);
          break;
        // case 5: 重复消息 - 忽略
      }
    });

    // 订阅 finger_result 事件 - 处理指纹管理结果
    const unsubFingerResult = deviceService.on(
      "finger_result",
      async (_, data) => {
        const { command, result, data: responseData, message } = data;

        if (result === "success") {
          if (command === "query" && responseData) {
            // 查询成功，更新指纹列表
            const fingerprintList: Fingerprint[] = (
              responseData.list || []
            ).map((item: any) => ({
              id: item.id,
              name: item.name || `指纹 ${item.id}`,
              registeredAt: item.registered_at || new Date().toISOString(),
            }));
            setFingerprints(fingerprintList);
            // 同步到本地存储
            try {
              await localStorageService.syncData(
                "fingerprints",
                fingerprintList,
                "id",
              );
              console.log("指纹数据已同步到本地存储");
            } catch (error) {
              console.error("同步指纹数据失败:", error);
            }
          } else if (command === "add") {
            // 添加成功，重新查询列表
            deviceService.sendUserMgmtCommand("finger", "query");
          } else if (command === "del") {
            // 删除成功，重新查询列表
            deviceService.sendUserMgmtCommand("finger", "query");
          }
        } else if (result === "failed") {
          // 失败时记录日志（DeviceService 已记录，这里可以做额外处理）
          setLogs((prev: LogEntry[]) => [
            ...prev.slice(-99),
            {
              id: Math.random().toString(36).substring(2, 11),
              timestamp: new Date().toLocaleTimeString(),
              message: `指纹操作失败: ${message || "未知错误"}`,
              type: "error",
            },
          ]);
        }
      },
    );

    // 订阅 nfc_result 事件 - 处理 NFC 卡片管理结果
    const unsubNfcResult = deviceService.on("nfc_result", async (_, data) => {
      const { command, result, data: responseData, message } = data;

      if (result === "success") {
        if (command === "query" && responseData) {
          // 查询成功，更新 NFC 卡片列表
          const cardList: NFCCard[] = (responseData.list || []).map(
            (item: any) => ({
              id: item.id,
              name: item.name || `卡片 ${item.id}`,
              cardId: item.card_id || "",
              maskedCardId:
                item.masked_card_id || maskCardId(item.card_id || ""),
              registeredAt: item.registered_at || new Date().toISOString(),
            }),
          );
          setNfcCards(cardList);
          // 同步到本地存储
          try {
            await localStorageService.syncData("nfcCards", cardList, "id");
            console.log("NFC 卡片数据已同步到本地存储");
          } catch (error) {
            console.error("同步 NFC 卡片数据失败:", error);
          }
        } else if (command === "add") {
          // 添加成功，重新查询列表
          deviceService.sendUserMgmtCommand("nfc", "query");
        } else if (command === "del") {
          // 删除成功，重新查询列表
          deviceService.sendUserMgmtCommand("nfc", "query");
        }
      } else if (result === "failed") {
        setLogs((prev: LogEntry[]) => [
          ...prev.slice(-99),
          {
            id: Math.random().toString(36).substring(2, 11),
            timestamp: new Date().toLocaleTimeString(),
            message: `NFC卡片操作失败: ${message || "未知错误"}`,
            type: "error",
          },
        ]);
      }
    });

    // 订阅 password_result 事件 - 处理密码管理结果
    const unsubPasswordResult = deviceService.on(
      "password_result",
      async (_, data) => {
        const { command, result, data: responseData, message } = data;

        if (result === "success") {
          if (command === "query" && responseData) {
            // 查询成功，更新临时密码列表
            const passwordList: TempPassword[] = (responseData.list || []).map(
              (item: any) => ({
                id: item.id,
                name: item.name || `临时密码 ${item.id}`,
                password: item.password || "",
                type: item.type || "one_time",
                validFrom: item.valid_from,
                validUntil: item.valid_until,
                maxUses: item.max_uses,
                currentUses: item.current_uses || 0,
                createdAt: item.created_at || new Date().toISOString(),
                isExpired: item.is_expired || false,
              }),
            );
            setTempPasswords(passwordList);
            // 同步到本地存储
            try {
              await localStorageService.syncData(
                "tempPasswords",
                passwordList,
                "id",
              );
              console.log("临时密码数据已同步到本地存储");
            } catch (error) {
              console.error("同步临时密码数据失败:", error);
            }
          } else if (command === "set") {
            // 密码设置成功
            setLogs((prev: LogEntry[]) => [
              ...prev.slice(-99),
              {
                id: Math.random().toString(36).substring(2, 11),
                timestamp: new Date().toLocaleTimeString(),
                message: "管理员密码修改成功",
                type: "success",
              },
            ]);
          }
        } else if (result === "failed") {
          setLogs((prev: LogEntry[]) => [
            ...prev.slice(-99),
            {
              id: Math.random().toString(36).substring(2, 11),
              timestamp: new Date().toLocaleTimeString(),
              message: `密码操作失败: ${message || "未知错误"}`,
              type: "error",
            },
          ]);
        }
      },
    );

    // 订阅 media_download 事件 - 处理媒体下载结果
    const unsubMediaDownload = deviceService.on("media_download", (_, data) => {
      const { fileId, status, data: fileData, fileSize, error } = data;

      if (status === "success" && fileData) {
        // 下载成功，更新视频附件状态
        setVideoAttachments((prev: VideoAttachment[]) =>
          prev.map((attachment) =>
            attachment.mediaId === fileId
              ? {
                  ...attachment,
                  downloadStatus: "completed",
                  downloadProgress: 100,
                }
              : attachment,
          ),
        );
      } else if (status === "error") {
        // 下载失败，更新状态
        setVideoAttachments((prev: VideoAttachment[]) =>
          prev.map((attachment) =>
            attachment.mediaId === fileId
              ? { ...attachment, downloadStatus: "failed" }
              : attachment,
          ),
        );
      }
    });

    // 订阅 media_download_progress 事件 - 处理下载进度
    const unsubMediaProgress = deviceService.on(
      "media_download_progress",
      (_, data) => {
        const { fileId, progress } = data;

        setVideoAttachments((prev: VideoAttachment[]) =>
          prev.map((attachment) =>
            attachment.mediaId === fileId
              ? {
                  ...attachment,
                  downloadStatus: "downloading",
                  downloadProgress: progress,
                }
              : attachment,
          ),
        );
      },
    );

    // ============================================
    // v2.5 协议新增事件订阅 - 访客意图和快递警报
    // ============================================

    // 订阅访客意图事件
    // 需求: 1.5, 2.1, 2.2, 12.1
    const unsubVisitorIntent = deviceService.on(
      "visitor_intent",
      async (_, data) => {
        try {
          // 构造完整的 VisitorIntent 对象
          const visitorIntent: VisitorIntent = {
            id: 0, // IndexedDB 自动生成
            visit_id: data.visit_id,
            session_id: data.session_id,
            person_id: data.person_info?.person_id || null,
            person_name: data.person_info?.name || "未知访客",
            relation_type: data.person_info?.relation_type || "unknown",
            intent_type: data.intent_summary?.intent_type || "other",
            intent_summary: data.intent_summary,
            dialogue_history: data.dialogue_history || [],
            package_check: data.package_check,
            created_at: new Date().toISOString(),
            ts: data.ts || Date.now(),
          };

          // 1. 更新内存状态（保留最近100条）
          setVisitorIntents((prev) => [visitorIntent, ...prev].slice(0, 100));

          // 2. 显示Toast通知
          const personName = visitorIntent.person_name;
          const summary = visitorIntent.intent_summary?.summary || "新访客到访";
          addToast(`新访客: ${personName} - ${summary}`, "info");

          // 3. 保存到IndexedDB
          await localStorageService.saveVisitorIntent(visitorIntent);
          console.log("访客意图已保存到本地存储");
        } catch (error) {
          console.error("处理访客意图事件失败:", error);
        }
      },
    );

    // 订阅快递警报事件
    // 需求: 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 13.1
    const unsubPackageAlert = deviceService.on(
      "package_alert",
      async (_, data) => {
        try {
          // 构造完整的 PackageAlert 对象
          const packageAlert: PackageAlert = {
            id: 0, // IndexedDB 自动生成
            device_id: currentDeviceId,
            session_id: data.session_id,
            threat_level: data.threat_level,
            action: data.action,
            description: data.description,
            photo_path: data.photo_path || "",
            photo_thumbnail: data.photo_thumbnail,
            voice_warning_sent: data.voice_warning_sent || false,
            notified: false,
            created_at: new Date().toISOString(),
            ts: data.ts || Date.now(),
          };

          // 1. 更新内存状态（保留最近100条）
          setPackageAlerts((prev) => [packageAlert, ...prev].slice(0, 100));

          // 2. 中威胁及以上显示Toast通知
          if (
            packageAlert.threat_level === "medium" ||
            packageAlert.threat_level === "high"
          ) {
            addToast(
              `快递警报: ${packageAlert.description}`,
              packageAlert.threat_level === "high" ? "error" : "warning",
            );
          }

          // 3. 保存到IndexedDB
          await localStorageService.savePackageAlert(packageAlert);
          console.log("快递警报已保存到本地存储");
        } catch (error) {
          console.error("处理快递警报事件失败:", error);
        }
      },
    );

    // 订阅访客意图查询结果事件
    // 需求: 5.4, 10.4, 18.1, 18.2, 18.3, 18.4
    const unsubVisitorIntentsQueryResult = deviceService.on(
      "visitor_intents_query_result",
      async (_, result) => {
        try {
          const records = result.data || [];

          // 数据合并去重逻辑（按session_id去重）
          setVisitorIntents((prev) => {
            const existingSessionIds = new Set(
              prev.map((item) => item.session_id),
            );
            const newRecords = records.filter(
              (record: any) => !existingSessionIds.has(record.session_id),
            );

            // 合并新旧数据，保留最近100条
            return [...newRecords, ...prev].slice(0, 100);
          });

          // 保存新记录到IndexedDB
          for (const record of records) {
            await localStorageService.saveVisitorIntent(record);
          }

          console.log(`访客意图查询结果已处理，共 ${records.length} 条`);
        } catch (error) {
          console.error("处理访客意图查询结果失败:", error);
        }
      },
    );

    // 订阅快递警报查询结果事件
    // 需求: 5.4, 10.4, 18.1, 18.2, 18.3, 18.4
    const unsubPackageAlertsQueryResult = deviceService.on(
      "package_alerts_query_result",
      async (_, result) => {
        try {
          const records = result.data || [];

          // 数据合并去重逻辑（按ts去重）
          setPackageAlerts((prev) => {
            const existingTs = new Set(prev.map((item) => item.ts));
            const newRecords = records.filter(
              (record: any) => !existingTs.has(record.ts),
            );

            // 合并新旧数据，保留最近100条
            return [...newRecords, ...prev].slice(0, 100);
          });

          // 保存新记录到IndexedDB
          for (const record of records) {
            await localStorageService.savePackageAlert(record);
          }

          console.log(`快递警报查询结果已处理，共 ${records.length} 条`);
        } catch (error) {
          console.error("处理快递警报查询结果失败:", error);
        }
      },
    );

    return () => {
      unsubLog();
      unsubStatus();
      unsubStats();
      unsubFrame();
      unsubTalk();
      unsubFace();
      unsubVisit();
      unsubStatusReport();
      unsubDeviceStatus();
      unsubEventReport();
      unsubLogReport();
      unsubServerAck();
      unsubFingerResult();
      unsubNfcResult();
      unsubPasswordResult();
      unsubMediaDownload();
      unsubMediaProgress();
      unsubVisitorIntent();
      unsubPackageAlert();
      unsubVisitorIntentsQueryResult();
      unsubPackageAlertsQueryResult();
      deviceService.disconnect();

      // 清理 Tab 保存定时器
      if (tabSaveTimeout.current) {
        clearTimeout(tabSaveTimeout.current);
      }
    };
  }, []);

  const handleToggleTalk = () => {
    if (isTalking) {
      deviceService.stopTalk();
    } else {
      deviceService.startTalk();
    }
  };

  // 开锁操作
  const handleUnlock = () => {
    deviceService.sendCommand({
      type: "lock_control",
      command: "unlock",
      duration: 5,
    });
  };

  // 关锁操作
  const handleLock = () => {
    deviceService.sendCommand({
      type: "lock_control",
      command: "lock",
    });
  };

  const clearLogs = () => setLogs([]);

  /**
   * 主题切换函数
   *
   * 功能：
   * 1. 切换主题状态（light <-> dark）
   * 2. 更新 document.documentElement 的 class
   * 3. 保存用户偏好到 localStorage
   *
   * 需求: 3.3
   */
  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === "light" ? "dark" : "light";

      // 保存用户偏好到 localStorage
      localStorage.setItem("theme", newTheme);

      // 更新 DOM（这会触发 useEffect，但为了即时反馈也在这里更新）
      const root = document.documentElement;
      if (newTheme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }

      console.log(`主题已切换为: ${newTheme}`);
      return newTheme;
    });
  };

  /**
   * Tab 切换处理函数
   *
   * 功能：
   * 1. 更新当前 Tab 状态
   * 2. 使用防抖策略保存 Tab 状态到本地存储（500ms 延迟）
   * 3. 避免频繁切换时的多次写入操作
   *
   * 需求: 11.2, 11.5
   */
  const handleTabChange = (newTab: Tab) => {
    setCurrentTab(newTab);

    // 清除之前的定时器（防抖）
    if (tabSaveTimeout.current) {
      clearTimeout(tabSaveTimeout.current);
    }

    // 防抖保存（500ms 后执行）
    tabSaveTimeout.current = setTimeout(async () => {
      try {
        await localStorageService.saveSetting("currentTab", newTab);
        console.log(`Tab 状态已保存: ${newTab}`);
      } catch (error) {
        console.error("保存 Tab 状态失败:", error);
        // 错误不中断应用
      }
    }, 500);
  };

  // 关闭到访通知弹窗
  const handleCloseVisitModal = () => {
    setShowVisitModal(false);
    // 延迟清除数据，避免关闭动画时内容消失
    setTimeout(() => setVisitNotification(null), 300);
  };

  // ============================================
  // v2.5 协议新增导航函数 - 详情页切换
  // 需求: 3.5, 4.8, 8.5, 9.9
  // ============================================

  /**
   * 导航到访客意图详情页
   * @param intent 选中的访客意图记录
   */
  const handleViewIntentDetail = (intent: VisitorIntent) => {
    setSelectedIntent(intent);
    setCurrentSubScreen("visitor-intent-detail");
    console.log("导航到访客意图详情页:", intent.session_id);
  };

  /**
   * 导航到快递警报详情页
   */
  const handleViewAllAlerts = () => {
    setSelectedAlerts(packageAlerts);
    setCurrentSubScreen("package-alert-detail");
    console.log("导航到快递警报详情页");
  };

  /**
   * 返回首页
   * 清除子页面状态和选中的数据
   */
  const handleBackToHome = () => {
    setCurrentSubScreen(null);
    setSelectedIntent(null);
    setSelectedAlerts([]);
    console.log("返回首页");
  };

  /**
   * 添加Toast通知到队列
   * 需求: 2.5
   * @param message 通知消息
   * @param type 通知类型
   */
  const addToast = (
    message: string,
    type: "info" | "warning" | "error" = "info",
  ) => {
    const id = Math.random().toString(36).substring(2, 11);
    setToastQueue((prev) => [...prev, { id, message, type }]);
  };

  /**
   * 从队列中移除Toast通知
   * 需求: 2.5
   * @param id Toast的唯一标识
   */
  const removeToast = (id: string) => {
    setToastQueue((prev) => prev.filter((toast) => toast.id !== id));
  };

  // 状态文本映射
  const statusTextMap: Record<ConnectionStatus, string> = {
    connected: "已连接",
    connecting: "连接中",
    disconnected: "未连接",
  };

  return (
    <div className="flex flex-col h-full bg-secondary-50 dark:bg-secondary-950 font-sans">
      {/* 顶部标题栏 */}
      <header className="bg-white border-b border-secondary-200 px-5 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm dark:bg-secondary-900 dark:border-secondary-700">
        <div className="flex items-center space-x-2 text-primary-500 dark:text-primary-400">
          <div className="p-2 bg-primary-50 rounded-lg dark:bg-primary-950">
            <Lock size={20} strokeWidth={3} />
          </div>
          <h1 className="text-lg font-extrabold tracking-tight text-secondary-900 dark:text-secondary-50">
            智能门锁 Pro
          </h1>
        </div>
        <div
          className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
          ${status === "connected" ? "bg-green-100 text-green-700" : "bg-secondary-100 dark:bg-secondary-800 text-secondary-500 dark:text-secondary-400"}`}
        >
          <div
            className={`w-2 h-2 rounded-full ${status === "connected" ? "bg-green-500" : "bg-secondary-400"}`}
          ></div>
          <span>{statusTextMap[status] || status}</span>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-hidden relative p-5">
        {/* 如果有子页面，优先显示子页面 */}
        {currentSubScreen === "visitor-intent-detail" && selectedIntent ? (
          <VisitorIntentScreen
            intent={selectedIntent}
            onBack={handleBackToHome}
          />
        ) : currentSubScreen === "package-alert-detail" ? (
          <PackageAlertScreen
            alerts={selectedAlerts}
            onBack={handleBackToHome}
          />
        ) : (
          <>
            {/* 主 Tab 页面 */}
            {currentTab === "home" && (
              <HomeScreen
                status={status}
                deviceStatus={deviceStatus}
                recentActivities={recentActivities}
                lastStatusUpdate={lastStatusUpdate}
                visitorIntents={visitorIntents}
                packageAlerts={packageAlerts}
                onUnlock={handleUnlock}
                onLock={handleLock}
                onViewIntentDetail={handleViewIntentDetail}
                onViewAllAlerts={handleViewAllAlerts}
              />
            )}
            {currentTab === "monitor" && (
              <MonitorScreen
                status={status}
                deviceStatus={deviceStatus}
                videoSrc={videoSrc}
                stats={stats}
                isTalking={isTalking}
                onToggleTalk={handleToggleTalk}
              />
            )}
            {currentTab === "settings" && (
              <SettingsScreen
                logs={logs}
                status={status}
                persons={persons}
                visits={visits}
                onClearLogs={clearLogs}
                // 新增功能数据 (任务 17.1)
                fingerprints={fingerprints}
                nfcCards={nfcCards}
                tempPasswords={tempPasswords}
                // 新增回调函数 (任务 17.2)
                onFingerprintAdd={(name) => {
                  deviceService.sendUserMgmtCommand("finger", "add", 0, name);
                }}
                onFingerprintDelete={(id) => {
                  deviceService.sendUserMgmtCommand("finger", "del", id);
                }}
                onNfcCardAdd={(name) => {
                  deviceService.sendUserMgmtCommand("nfc", "add", 0, name);
                }}
                onNfcCardDelete={(id) => {
                  deviceService.sendUserMgmtCommand("nfc", "del", id);
                }}
                onAdminPasswordModify={(currentPwd, newPwd) => {
                  deviceService.sendUserMgmtCommand(
                    "password",
                    "set",
                    0,
                    newPwd,
                  );
                }}
                onTempPasswordCreate={(name, type, options) => {
                  // 生成随机6位密码
                  const password = Math.floor(
                    100000 + Math.random() * 900000,
                  ).toString();
                  // 计算有效期
                  let expires = 24 * 60 * 60; // 默认24小时
                  if (type === "time_limited" && options?.validUntil) {
                    const validUntilDate = new Date(options.validUntil);
                    expires = Math.floor(
                      (validUntilDate.getTime() - Date.now()) / 1000,
                    );
                  } else if (type === "count_limited") {
                    expires = 7 * 24 * 60 * 60; // 限次密码默认7天
                  }
                  deviceService.sendCommand({
                    type: "lock_control",
                    command: "temp_code",
                    code: password,
                    expires: expires,
                    name: name,
                    password_type: type,
                    max_uses: options?.maxUses,
                  });
                }}
                onTempPasswordDelete={(id) => {
                  deviceService.sendUserMgmtCommand("password", "del", id);
                }}
                // 主题切换 (任务 2.3)
                theme={theme}
                onToggleTheme={toggleTheme}
              />
            )}
          </>
        )}
      </main>

      {/* 底部导航 */}
      <BottomNav currentTab={currentTab} onTabChange={handleTabChange} />

      {/* 到访通知弹窗 */}
      <VisitNotificationModal
        visible={showVisitModal}
        data={visitNotification}
        onClose={handleCloseVisitModal}
      />

      {/* Toast通知队列 - 需求: 2.1, 2.2, 2.3, 2.4, 2.5 */}
      {toastQueue.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: "fixed",
            top: `${16 + index * 72}px`, // 每个Toast间隔72px（高度+间距）
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.type === "error" ? 5000 : 3000}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
