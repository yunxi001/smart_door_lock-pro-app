import React, { useState, useRef, useEffect } from "react";
import {
  Wifi,
  Terminal,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  Fingerprint as FingerprintIcon,
  CreditCard,
  KeyRound,
  AlertCircle,
  Users,
  Upload,
  Clock,
  Plus,
  Play,
  Download,
  Video,
  HardDrive,
  Edit2,
  Moon,
  Sun,
} from "lucide-react";
import {
  LogEntry,
  ConnectionStatus,
  SubScreen,
  Person,
  VisitRecord,
  UnlockLog,
  EventLog,
  Fingerprint,
  FingerprintRegistrationStatus,
  NFCCard,
  NFCRegistrationStatus,
  AdminPasswordStatus,
  TempPassword,
  TempPasswordType,
  VideoAttachment,
  VideoStorageStats,
  VideoDownloadStatus,
} from "../types";
import { deviceService } from "../services/DeviceService";
import { videoStorageService } from "../services/VideoStorageService";
import { localStorageService } from "../services/LocalStorageService";

interface Props {
  logs: LogEntry[];
  status: ConnectionStatus;
  persons: Person[];
  visits: VisitRecord[];
  onClearLogs: () => void;
  // 新增功能数据 (任务 17.1)
  fingerprints?: Fingerprint[];
  nfcCards?: NFCCard[];
  tempPasswords?: TempPassword[];
  // 新增回调函数 (任务 17.2)
  onFingerprintAdd?: (name: string) => void;
  onFingerprintDelete?: (id: number) => void;
  onNfcCardAdd?: (name: string) => void;
  onNfcCardDelete?: (id: number) => void;
  onAdminPasswordModify?: (currentPwd: string, newPwd: string) => void;
  onTempPasswordCreate?: (
    name: string,
    type: TempPasswordType,
    options?: { validFrom?: string; validUntil?: string; maxUses?: number },
  ) => void;
  onTempPasswordDelete?: (id: number) => void;
  // 主题切换 (任务 2.3)
  theme?: "light" | "dark";
  onToggleTheme?: () => void;
}

// 菜单项组件
interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  description,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-4 
               hover:bg-secondary-50 transition-colors
               dark:hover:bg-secondary-800"
  >
    <div className="flex items-center space-x-3">
      <div
        className="p-2 bg-secondary-100 rounded-lg text-secondary-600
                      dark:bg-secondary-800 dark:text-secondary-300"
      >
        {icon}
      </div>
      <div className="text-left">
        <div className="font-medium text-secondary-900 dark:text-secondary-50">
          {title}
        </div>
        {description && (
          <div className="text-xs text-secondary-500 dark:text-secondary-400">
            {description}
          </div>
        )}
      </div>
    </div>
    <ChevronRight
      size={20}
      className="text-secondary-400 dark:text-secondary-500"
    />
  </button>
);

// 分组标题组件
const SectionTitle: React.FC<{ title: string }> = ({ title }) => (
  <div
    className="px-4 py-2 text-xs font-bold text-secondary-500 uppercase tracking-wider 
                  bg-secondary-50 dark:bg-secondary-900 dark:text-secondary-400"
  >
    {title}
  </div>
);

// 关系类型映射
const relationTypes = [
  { value: "family", label: "家人" },
  { value: "friend", label: "朋友" },
  { value: "delivery", label: "快递/外卖" },
  { value: "other", label: "其他" },
];

// 开锁方式映射
const unlockMethodMap: Record<string, string> = {
  face: "人脸识别",
  fingerprint: "指纹",
  password: "密码",
  nfc: "NFC卡片",
  remote: "远程开锁",
  temp_code: "临时密码",
  key: "钥匙",
};

// 事件类型映射
const eventTypeMap: Record<string, { label: string; color: string }> = {
  bell: {
    label: "门铃",
    color: "bg-info-100 text-info-700 dark:bg-info-950 dark:text-info-300",
  },
  pir_trigger: {
    label: "移动检测",
    color:
      "bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-300",
  },
  tamper: {
    label: "撬锁报警",
    color: "bg-error-100 text-error-700 dark:bg-error-950 dark:text-error-300",
  },
  door_open: {
    label: "门已打开",
    color:
      "bg-success-100 text-success-700 dark:bg-success-950 dark:text-success-300",
  },
  low_battery: {
    label: "低电量",
    color:
      "bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-300",
  },
};

// 人脸管理子标签类型
type FaceSubTab = "list" | "register";

export const SettingsScreen: React.FC<Props> = ({
  logs,
  status,
  persons,
  visits,
  onClearLogs,
  // 新增功能数据 (任务 17.1)
  fingerprints: propFingerprints,
  nfcCards: propNfcCards,
  tempPasswords: propTempPasswords,
  // 新增回调函数 (任务 17.2)
  onFingerprintAdd,
  onFingerprintDelete,
  onNfcCardAdd,
  onNfcCardDelete,
  onAdminPasswordModify,
  onTempPasswordCreate,
  onTempPasswordDelete,
  // 主题切换 (任务 2.3)
  theme = "light",
  onToggleTheme,
}) => {
  const [url, setUrl] = useState("ws://192.168.1.110:8000/ws/app");
  const [deviceId, setDeviceId] = useState("e8:f6:0a:83:8f:50");
  const [subScreen, setSubScreen] = useState<SubScreen | null>(null);

  // 人脸管理状态
  const [faceSubTab, setFaceSubTab] = useState<FaceSubTab>("list");
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("family");
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const [timeStart, setTimeStart] = useState("08:00");
  const [timeEnd, setTimeEnd] = useState("22:00");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 到访记录分页状态
  const [visitPage, setVisitPage] = useState(1);
  const [visitLoading, setVisitLoading] = useState(false);
  const [hasMoreVisits, setHasMoreVisits] = useState(true);
  const PAGE_SIZE = 20;

  // 开锁记录状态
  const [unlockLogs, setUnlockLogs] = useState<UnlockLog[]>([]);
  const [unlockLogsPage, setUnlockLogsPage] = useState(1);
  const [unlockLogsLoading, setUnlockLogsLoading] = useState(false);
  const [hasMoreUnlockLogs, setHasMoreUnlockLogs] = useState(true);
  const [unlockLogsTotal, setUnlockLogsTotal] = useState(0);

  // 事件记录状态
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [eventLogsPage, setEventLogsPage] = useState(1);
  const [eventLogsLoading, setEventLogsLoading] = useState(false);
  const [hasMoreEventLogs, setHasMoreEventLogs] = useState(true);
  const [eventLogsTotal, setEventLogsTotal] = useState(0);

  // 指纹管理状态 - 优先使用 props 数据
  const [fingerprints, setFingerprints] = useState<Fingerprint[]>(
    propFingerprints || [],
  );
  const [fingerprintMaxCount] = useState(10); // 最大容量
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [fingerprintName, setFingerprintName] = useState("");
  const [fingerprintRegStatus, setFingerprintRegStatus] =
    useState<FingerprintRegistrationStatus>({
      status: "idle",
      message: "",
      progress: 0,
    });
  const [showAddFingerprintModal, setShowAddFingerprintModal] = useState(false);

  // NFC 卡片管理状态 - 优先使用 props 数据
  const [nfcCards, setNfcCards] = useState<NFCCard[]>(propNfcCards || []);
  const [nfcMaxCount] = useState(5); // 最大容量
  const [nfcLoading, setNfcLoading] = useState(false);
  const [nfcCardName, setNfcCardName] = useState("");
  const [nfcRegStatus, setNfcRegStatus] = useState<NFCRegistrationStatus>({
    status: "idle",
    message: "",
  });
  const [showAddNfcModal, setShowAddNfcModal] = useState(false);

  // 密码管理状态 - 临时密码优先使用 props 数据
  const [adminPasswordStatus, setAdminPasswordStatus] =
    useState<AdminPasswordStatus>({
      isSet: false,
      lastModifiedAt: undefined,
    });
  const [tempPasswords, setTempPasswords] = useState<TempPassword[]>(
    propTempPasswords || [],
  );
  const [tempPasswordMaxCount] = useState(5); // 最大临时密码数量
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showModifyAdminPasswordModal, setShowModifyAdminPasswordModal] =
    useState(false);
  const [showCreateTempPasswordModal, setShowCreateTempPasswordModal] =
    useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tempPasswordName, setTempPasswordName] = useState("");
  const [tempPasswordType, setTempPasswordType] =
    useState<TempPasswordType>("one_time");
  const [tempPasswordValidFrom, setTempPasswordValidFrom] = useState("");
  const [tempPasswordValidUntil, setTempPasswordValidUntil] = useState("");
  const [tempPasswordMaxUses, setTempPasswordMaxUses] = useState(1);
  const [passwordOperationStatus, setPasswordOperationStatus] = useState<
    "idle" | "processing" | "success" | "failed"
  >("idle");
  const [passwordOperationMessage, setPasswordOperationMessage] = useState("");

  // 视频附件相关状态 (需求 14.1, 14.4, 14.10)
  const [videoDownloadStatus, setVideoDownloadStatus] = useState<
    Map<number, VideoDownloadStatus>
  >(new Map());
  const [videoDownloadProgress, setVideoDownloadProgress] = useState<
    Map<number, number>
  >(new Map());
  const [downloadedVideos, setDownloadedVideos] = useState<Set<number>>(
    new Set(),
  );
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const [playingVideoRecordId, setPlayingVideoRecordId] = useState<
    number | null
  >(null);
  const [storageStats, setStorageStats] = useState<VideoStorageStats | null>(
    null,
  );
  // 注意: showStorageManagement 状态预留用于未来存储管理弹窗功能

  // 人脸权限编辑状态
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [permissionType, setPermissionType] = useState<
    "permanent" | "temporary" | "count_limited"
  >("permanent");
  const [permissionTimeStart, setPermissionTimeStart] = useState("08:00");
  const [permissionTimeEnd, setPermissionTimeEnd] = useState("22:00");
  const [permissionValidFrom, setPermissionValidFrom] = useState("");
  const [permissionValidUntil, setPermissionValidUntil] = useState("");
  const [permissionRemainingCount, setPermissionRemainingCount] = useState(10);
  const [permissionSaving, setPermissionSaving] = useState(false);

  const isConnected = status === "connected";

  // 同步 props 数据到本地状态 (任务 17.1)
  useEffect(() => {
    if (propFingerprints) {
      setFingerprints(propFingerprints);
    }
  }, [propFingerprints]);

  useEffect(() => {
    if (propNfcCards) {
      setNfcCards(propNfcCards);
    }
  }, [propNfcCards]);

  useEffect(() => {
    if (propTempPasswords) {
      setTempPasswords(propTempPasswords);
    }
  }, [propTempPasswords]);

  // 监听人脸管理响应，自动刷新列表
  useEffect(() => {
    const unsubFaceResponse = deviceService.on("face_response", (type, msg) => {
      // 注册或删除成功后，刷新人员列表
      if (
        msg.status === "success" &&
        (msg.action === "register" || msg.action === "delete_person")
      ) {
        deviceService.sendCommand({
          type: "face_management",
          action: "get_persons",
        });
      }
      // 获取到访记录响应后，更新加载状态
      if (msg.action === "get_visits") {
        setVisitLoading(false);
        // 如果返回的数据少于 PAGE_SIZE，说明没有更多数据
        if (msg.data && msg.data.length < PAGE_SIZE) {
          setHasMoreVisits(false);
        }
      }
    });

    // 监听开锁记录查询结果
    const unsubUnlockLogs = deviceService.on(
      "unlock_logs_result",
      (type, result) => {
        setUnlockLogsLoading(false);
        const { data, total } = result;
        setUnlockLogsTotal(total);

        if (unlockLogsPage === 1) {
          setUnlockLogs(data);
        } else {
          setUnlockLogs((prev) => [...prev, ...data]);
        }

        // 如果返回的数据少于 PAGE_SIZE，说明没有更多数据
        if (data.length < PAGE_SIZE) {
          setHasMoreUnlockLogs(false);
        }
      },
    );

    // 监听事件记录查询结果
    const unsubEventLogs = deviceService.on("events_result", (type, result) => {
      setEventLogsLoading(false);
      const { data, total } = result;
      setEventLogsTotal(total);

      if (eventLogsPage === 1) {
        setEventLogs(data);
      } else {
        setEventLogs((prev) => [...prev, ...data]);
      }

      // 如果返回的数据少于 PAGE_SIZE，说明没有更多数据
      if (data.length < PAGE_SIZE) {
        setHasMoreEventLogs(false);
      }
    });

    // 监听指纹管理结果
    const unsubFingerResult = deviceService.on(
      "finger_result",
      (type, result) => {
        const {
          command,
          result: status,
          val,
          data,
          message,
          progress,
        } = result;

        if (command === "query") {
          // 查询指纹列表结果
          setFingerprintLoading(false);
          if (status === "success" && data) {
            // 转换数据格式
            const fingerprintList: Fingerprint[] = (data.list || []).map(
              (item: any) => ({
                id: item.id,
                name: item.name || `指纹 ${item.id}`,
                registeredAt: item.registered_at || new Date().toISOString(),
              }),
            );
            setFingerprints(fingerprintList);
          } else if (status === "failed") {
            alert(`查询指纹列表失败: ${message}`);
          }
        } else if (command === "add") {
          // 添加指纹结果
          if (status === "success") {
            setFingerprintRegStatus({
              status: "success",
              message:
                message === "AlreadyExists"
                  ? "指纹已存在，录入完成"
                  : "指纹录入成功",
              progress: 100,
            });
            // 刷新指纹列表
            deviceService.sendUserMgmtCommand("finger", "query");
            // 延迟关闭弹窗
            setTimeout(() => {
              setShowAddFingerprintModal(false);
              setFingerprintRegStatus({
                status: "idle",
                message: "",
                progress: 0,
              });
              setFingerprintName("");
            }, 1500);
          } else if (status === "failed") {
            setFingerprintRegStatus({
              status: "failed",
              message: message || "指纹录入失败",
              progress: 0,
            });
          } else if (status === "progress") {
            // 录入进度更新
            setFingerprintRegStatus({
              status: "scanning",
              message: message || "请将手指放在指纹传感器上",
              progress: progress || 0,
            });
          }
        } else if (command === "del") {
          // 删除指纹结果
          if (status === "success") {
            // 刷新指纹列表
            deviceService.sendUserMgmtCommand("finger", "query");
          } else if (status === "failed") {
            alert(`删除指纹失败: ${message}`);
          }
        }
      },
    );

    // 监听指纹录入进度
    const unsubFingerProgress = deviceService.on(
      "finger_progress",
      (type, data) => {
        const { progress, message } = data;
        setFingerprintRegStatus((prev) => ({
          ...prev,
          status: "scanning",
          message: message || "请将手指放在指纹传感器上",
          progress: progress || prev.progress,
        }));
      },
    );

    // 监听指纹操作错误（超时等）
    const unsubFingerError = deviceService.on("finger_error", (type, data) => {
      const { command, error } = data;

      if (command === "add") {
        setFingerprintRegStatus({
          status: "failed",
          message: `操作失败: ${error}`,
          progress: 0,
        });
        // 3秒后允许用户重试
        setTimeout(() => {
          setFingerprintRegStatus({
            status: "idle",
            message: "",
            progress: 0,
          });
        }, 3000);
      }
    });

    // 监听 NFC 卡片管理结果
    const unsubNfcResult = deviceService.on("nfc_result", (type, result) => {
      const { command, result: status, val, data, message } = result;

      if (command === "query") {
        // 查询 NFC 卡片列表结果
        setNfcLoading(false);
        if (status === "success" && data) {
          // 转换数据格式，处理卡号脱敏
          const cardList: NFCCard[] = (data.list || []).map((item: any) => ({
            id: item.id,
            name: item.name || `卡片 ${item.id}`,
            cardId: item.card_id || "",
            maskedCardId: maskCardId(item.card_id || ""),
            registeredAt: item.registered_at || new Date().toISOString(),
          }));
          setNfcCards(cardList);
        } else if (status === "failed") {
          alert(`查询NFC卡片列表失败: ${message}`);
        }
      } else if (command === "add") {
        // 添加 NFC 卡片结果
        if (status === "success") {
          setNfcRegStatus({
            status: "success",
            message:
              message === "AlreadyExists"
                ? "NFC卡片已存在，绑定完成"
                : "NFC卡片绑定成功",
          });
          // 刷新卡片列表
          deviceService.sendUserMgmtCommand("nfc", "query");
          // 延迟关闭弹窗
          setTimeout(() => {
            setShowAddNfcModal(false);
            setNfcRegStatus({ status: "idle", message: "" });
            setNfcCardName("");
          }, 1500);
        } else if (status === "failed") {
          setNfcRegStatus({
            status: "failed",
            message: message || "NFC卡片绑定失败",
          });
        } else if (status === "progress") {
          // 读取进度更新
          setNfcRegStatus({
            status: "reading",
            message: message || "请将 NFC 卡片靠近读卡区域",
          });
        }
      } else if (command === "del") {
        // 删除 NFC 卡片结果
        if (status === "success") {
          // 刷新卡片列表
          deviceService.sendUserMgmtCommand("nfc", "query");
        } else if (status === "failed") {
          alert(`删除NFC卡片失败: ${message}`);
        }
      }
    });

    // 监听密码管理结果
    const unsubPasswordResult = deviceService.on(
      "password_result",
      (type, result) => {
        const { command, result: status, data, message } = result;

        if (command === "query") {
          // 查询密码状态结果
          setPasswordLoading(false);
          if (status === "success" && data) {
            // 更新管理员密码状态
            setAdminPasswordStatus({
              isSet: data.admin_set || false,
              lastModifiedAt: data.admin_modified_at,
            });
            // 更新临时密码列表
            const tempList: TempPassword[] = (data.temp_list || []).map(
              (item: any) => ({
                id: item.id,
                name: item.name || `临时密码 ${item.id}`,
                password: item.password || "******",
                type: item.type || "one_time",
                validFrom: item.valid_from,
                validUntil: item.valid_until,
                maxUses: item.max_uses,
                currentUses: item.current_uses || 0,
                createdAt: item.created_at || new Date().toISOString(),
                isExpired: item.is_expired || false,
              }),
            );
            setTempPasswords(tempList);
          } else if (status === "failed") {
            alert(`查询密码状态失败: ${message}`);
          }
        } else if (command === "set") {
          // 修改管理员密码结果
          if (status === "success") {
            setPasswordOperationStatus("success");
            setPasswordOperationMessage("管理员密码修改成功");
            // 刷新密码状态
            deviceService.sendUserMgmtCommand("password", "query");
            // 延迟关闭弹窗
            setTimeout(() => {
              setShowModifyAdminPasswordModal(false);
              resetPasswordForm();
            }, 1500);
          } else if (status === "failed") {
            setPasswordOperationStatus("failed");
            setPasswordOperationMessage(message || "密码修改失败");
          }
        } else if (command === "del") {
          // 删除临时密码结果
          if (status === "success") {
            // 刷新密码列表
            deviceService.sendUserMgmtCommand("password", "query");
          } else if (status === "failed") {
            alert(`删除临时密码失败: ${message}`);
          }
        }
      },
    );

    // 监听 NFC 操作错误（超时等）
    const unsubNfcError = deviceService.on("nfc_error", (type, data) => {
      const { command, error } = data;

      if (command === "add") {
        setNfcRegStatus({
          status: "failed",
          message: `操作失败: ${error}`,
        });
        // 3秒后允许用户重试
        setTimeout(() => {
          setNfcRegStatus({
            status: "idle",
            message: "",
          });
        }, 3000);
      }
    });

    // 监听密码操作错误（超时等）
    const unsubPasswordError = deviceService.on(
      "password_error",
      (type, data) => {
        const { command, error } = data;

        if (command === "set") {
          setPasswordOperationStatus("failed");
          setPasswordOperationMessage(`操作失败: ${error}`);
          // 3秒后允许用户重试
          setTimeout(() => {
            setPasswordOperationStatus("idle");
            setPasswordOperationMessage("");
          }, 3000);
        }
      },
    );

    // 视频下载进度回调
    const unsubVideoProgress = videoStorageService.onDownloadProgress(
      (recordId, progress) => {
        setVideoDownloadProgress((prev) =>
          new Map(prev).set(recordId, progress),
        );
        setVideoDownloadStatus((prev) =>
          new Map(prev).set(recordId, "downloading"),
        );
      },
    );

    // 视频下载完成回调
    const unsubVideoComplete = videoStorageService.onDownloadComplete(
      (recordId) => {
        setVideoDownloadStatus((prev) =>
          new Map(prev).set(recordId, "completed"),
        );
        setDownloadedVideos((prev) => new Set(prev).add(recordId));
        setVideoDownloadProgress((prev) => new Map(prev).set(recordId, 100));
      },
    );

    // 视频下载错误回调
    const unsubVideoError = videoStorageService.onDownloadError(
      (recordId, error) => {
        console.error(`视频 ${recordId} 下载失败:`, error);
        setVideoDownloadStatus((prev) => new Map(prev).set(recordId, "failed"));
      },
    );

    return () => {
      unsubFaceResponse();
      unsubUnlockLogs();
      unsubEventLogs();
      unsubFingerResult();
      unsubFingerProgress();
      unsubFingerError();
      unsubNfcResult();
      unsubNfcError();
      unsubPasswordResult();
      unsubPasswordError();
      unsubVideoProgress();
      unsubVideoComplete();
      unsubVideoError();
    };
  }, [unlockLogsPage, eventLogsPage]);

  const handleConnect = () => {
    if (isConnected) {
      deviceService.disconnect();
    } else {
      // 生成 appId：使用设备 UUID 或用户 ID
      // 这里使用浏览器的 localStorage 存储一个持久化的 appId
      let appId = localStorage.getItem("app_id");
      if (!appId) {
        // 生成一个简单的 UUID
        appId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem("app_id", appId);
      }

      deviceService.connect(url, deviceId, appId);
    }
  };

  // 返回主设置页面
  const handleBack = () => {
    setSubScreen(null);
  };

  // 导航到子页面
  const handleNavigate = async (screen: SubScreen) => {
    setSubScreen(screen);
    // 进入人脸管理时，获取人员列表
    if (screen === "face-management" && isConnected) {
      deviceService.sendCommand({
        type: "face_management",
        action: "get_persons",
      });
    }
    // 进入到访记录时，重置分页状态并获取第一页数据
    if (screen === "visit-records" && isConnected) {
      setVisitPage(1);
      setHasMoreVisits(true);
      setVisitLoading(true);
      deviceService.sendCommand({
        type: "face_management",
        action: "get_visits",
        data: { page: 1, page_size: PAGE_SIZE },
      });
    }
    // 进入开锁记录时，重置分页状态并获取数据
    if (screen === "unlock-logs") {
      setUnlockLogsPage(1);
      setHasMoreUnlockLogs(true);
      setUnlockLogsLoading(true);
      setUnlockLogs([]);

      if (isConnected) {
        // 在线模式：从服务器获取
        deviceService.sendCommand({
          type: "query",
          target: "unlock_logs",
          data: { limit: PAGE_SIZE, offset: 0 },
        });
      } else {
        // 离线模式：从本地存储加载开锁记录
        //
        // 功能：
        // 1. 从 IndexedDB 加载所有缓存的开锁记录
        // 2. 按时间倒序排列（最新的在前）
        // 3. 一次性加载所有数据（不分页）
        //
        // 需求: 6.2, 6.3
        try {
          const logs =
            await localStorageService.getAll<UnlockLog>("unlockLogs");

          // 按时间倒序排列
          logs.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );

          setUnlockLogs(logs);
          setUnlockLogsTotal(logs.length);
          setHasMoreUnlockLogs(false); // 离线模式下一次性加载所有数据
        } catch (error) {
          console.error("从本地存储加载开锁记录失败:", error);
          // 错误不中断应用，显示空列表
        } finally {
          setUnlockLogsLoading(false);
        }
      }
    }
    // 进入事件记录时，重置分页状态并获取数据
    if (screen === "event-logs") {
      setEventLogsPage(1);
      setHasMoreEventLogs(true);
      setEventLogsLoading(true);
      setEventLogs([]);

      if (isConnected) {
        // 在线模式：从服务器获取
        deviceService.sendCommand({
          type: "query",
          target: "events",
          data: { limit: PAGE_SIZE, offset: 0 },
        });
      } else {
        // 离线模式：从本地存储加载事件记录
        //
        // 功能：
        // 1. 从 IndexedDB 加载所有缓存的事件记录
        // 2. 按时间倒序排列（最新的在前）
        // 3. 一次性加载所有数据（不分页）
        //
        // 需求: 7.2, 7.3
        try {
          const logs = await localStorageService.getAll<EventLog>("eventLogs");

          // 按时间倒序排列
          logs.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );

          setEventLogs(logs);
          setEventLogsTotal(logs.length);
          setHasMoreEventLogs(false); // 离线模式下一次性加载所有数据
        } catch (error) {
          console.error("从本地存储加载事件记录失败:", error);
        } finally {
          setEventLogsLoading(false);
        }
      }
    }
    // 进入指纹管理时，获取指纹列表
    if (screen === "fingerprint-management" && isConnected) {
      setFingerprintLoading(true);
      deviceService.sendUserMgmtCommand("finger", "query");
    }
    // 进入 NFC 卡片管理时，获取卡片列表
    if (screen === "nfc-management" && isConnected) {
      setNfcLoading(true);
      deviceService.sendUserMgmtCommand("nfc", "query");
    }
    // 进入密码管理时，获取密码状态
    if (screen === "password-management" && isConnected) {
      setPasswordLoading(true);
      deviceService.sendUserMgmtCommand("password", "query");
    }
  };

  // 到访记录 - 加载更多
  const handleLoadMoreVisits = () => {
    if (visitLoading || !hasMoreVisits || !isConnected) return;

    const nextPage = visitPage + 1;
    setVisitPage(nextPage);
    setVisitLoading(true);
    deviceService.sendCommand({
      type: "face_management",
      action: "get_visits",
      data: { page: nextPage, page_size: PAGE_SIZE },
    });
  };

  // 开锁记录 - 加载更多
  const handleLoadMoreUnlockLogs = () => {
    if (unlockLogsLoading || !hasMoreUnlockLogs || !isConnected) return;

    const nextPage = unlockLogsPage + 1;
    setUnlockLogsPage(nextPage);
    setUnlockLogsLoading(true);
    deviceService.sendCommand({
      type: "query",
      target: "unlock_logs",
      data: { limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE },
    });
  };

  // 事件记录 - 加载更多
  const handleLoadMoreEventLogs = () => {
    if (eventLogsLoading || !hasMoreEventLogs || !isConnected) return;

    const nextPage = eventLogsPage + 1;
    setEventLogsPage(nextPage);
    setEventLogsLoading(true);
    deviceService.sendCommand({
      type: "query",
      target: "events",
      data: { limit: PAGE_SIZE, offset: (nextPage - 1) * PAGE_SIZE },
    });
  };

  // 人脸管理 - 删除人员
  const handleDeletePerson = (id: number) => {
    if (confirm("确定要删除此人员吗？")) {
      deviceService.sendCommand({
        type: "face_management",
        action: "delete_person",
        data: { person_id: id },
      });
    }
  };

  // 人脸管理 - 打开权限编辑弹窗
  const handleEditPermission = (person: Person) => {
    setEditingPerson(person);
    // 初始化表单值
    const perm = person.permission;
    setPermissionType(perm?.permission_type || "permanent");
    setPermissionTimeStart(perm?.time_start || "08:00");
    setPermissionTimeEnd(perm?.time_end || "22:00");
    setPermissionValidFrom(
      perm?.valid_from || new Date().toISOString().split("T")[0],
    );
    setPermissionValidUntil(
      perm?.valid_until ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
    );
    setPermissionRemainingCount(perm?.remaining_count || 10);
    setShowPermissionModal(true);
  };

  // 人脸管理 - 保存权限更新
  const handleSavePermission = () => {
    if (!editingPerson) return;

    setPermissionSaving(true);

    // 构建权限数据
    const permissionData: any = {
      permission_type: permissionType,
      time_start: permissionTimeStart,
      time_end: permissionTimeEnd,
    };

    // 根据权限类型添加额外字段
    if (permissionType === "temporary") {
      permissionData.valid_from = permissionValidFrom;
      permissionData.valid_until = permissionValidUntil;
    } else if (permissionType === "count_limited") {
      permissionData.remaining_count = permissionRemainingCount;
    }

    // 发送更新权限命令
    deviceService.sendCommand({
      type: "face_management",
      action: "update_permission",
      data: {
        person_id: editingPerson.id,
        permission: permissionData,
      },
    });

    // 模拟保存完成（实际应该监听响应）
    setTimeout(() => {
      setPermissionSaving(false);
      setShowPermissionModal(false);
      setEditingPerson(null);
      // 刷新人员列表
      deviceService.sendCommand({
        type: "face_management",
        action: "get_persons",
      });
    }, 500);
  };

  // 人脸管理 - 选择图片
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImgPreview(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 人脸管理 - 注册人员
  const handleRegister = () => {
    if (!name || !imgPreview) {
      alert("请填写姓名并上传照片");
      return;
    }

    // 提取 base64 数据
    const base64 = imgPreview.split(",")[1];

    deviceService.sendCommand({
      type: "face_management",
      action: "register",
      data: {
        name,
        relation_type: relation,
        images: [base64],
        permission: {
          type: "permanent",
          time_start: timeStart,
          time_end: timeEnd,
          day_type: "daily",
        },
      },
    });

    // 重置表单并切换回列表
    setName("");
    setImgPreview(null);
    setFaceSubTab("list");
  };

  // 指纹管理 - 删除指纹 (任务 17.2 - 使用回调函数)
  const handleDeleteFingerprint = (id: number) => {
    if (confirm("确定要删除此指纹吗？")) {
      if (onFingerprintDelete) {
        onFingerprintDelete(id);
      } else {
        deviceService.sendUserMgmtCommand("finger", "del", id);
      }
    }
  };

  // 指纹管理 - 开始录入 (任务 17.2 - 使用回调函数)
  const handleStartFingerprintRegistration = () => {
    if (!fingerprintName.trim()) {
      alert("请输入指纹名称");
      return;
    }

    // 设置录入状态为等待中
    setFingerprintRegStatus({
      status: "waiting",
      message: "请将手指放在指纹传感器上...",
      progress: 0,
    });

    // 发送添加指纹命令
    if (onFingerprintAdd) {
      onFingerprintAdd(fingerprintName);
    } else {
      deviceService.sendUserMgmtCommand("finger", "add", 0, fingerprintName);
    }
  };

  // 指纹管理 - 取消录入
  const handleCancelFingerprintRegistration = () => {
    setShowAddFingerprintModal(false);
    setFingerprintRegStatus({ status: "idle", message: "", progress: 0 });
    setFingerprintName("");
  };

  // NFC 卡片管理 - 删除卡片 (任务 17.2 - 使用回调函数)
  const handleDeleteNfcCard = (id: number) => {
    if (confirm("确定要删除此 NFC 卡片吗？")) {
      if (onNfcCardDelete) {
        onNfcCardDelete(id);
      } else {
        deviceService.sendUserMgmtCommand("nfc", "del", id);
      }
    }
  };

  // NFC 卡片管理 - 开始绑定 (任务 17.2 - 使用回调函数)
  const handleStartNfcRegistration = () => {
    if (!nfcCardName.trim()) {
      alert("请输入卡片名称");
      return;
    }

    // 设置绑定状态为等待中
    setNfcRegStatus({
      status: "waiting",
      message: "请将 NFC 卡片靠近读卡区域...",
    });

    // 发送添加 NFC 卡片命令
    if (onNfcCardAdd) {
      onNfcCardAdd(nfcCardName);
    } else {
      deviceService.sendUserMgmtCommand("nfc", "add", 0, nfcCardName);
    }
  };

  // NFC 卡片管理 - 取消绑定
  const handleCancelNfcRegistration = () => {
    setShowAddNfcModal(false);
    setNfcRegStatus({ status: "idle", message: "" });
    setNfcCardName("");
  };

  // 密码管理 - 重置表单
  const resetPasswordForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setTempPasswordName("");
    setTempPasswordType("one_time");
    setTempPasswordValidFrom("");
    setTempPasswordValidUntil("");
    setTempPasswordMaxUses(1);
    setPasswordOperationStatus("idle");
    setPasswordOperationMessage("");
  };

  // 密码管理 - 修改管理员密码 (任务 17.2 - 使用回调函数)
  const handleModifyAdminPassword = () => {
    // 验证输入
    // 只有在已设置密码的情况下才需要验证当前密码
    if (adminPasswordStatus.isSet && !currentPassword.trim()) {
      alert("请输入当前密码");
      return;
    }
    if (!newPassword.trim()) {
      alert("请输入新密码");
      return;
    }
    if (newPassword.length !== 6 || !/^\d+$/.test(newPassword)) {
      alert("新密码必须是6位数字");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("两次输入的新密码不一致");
      return;
    }

    // 设置处理状态
    setPasswordOperationStatus("processing");
    setPasswordOperationMessage("正在修改密码...");

    // 发送修改密码命令
    if (onAdminPasswordModify) {
      onAdminPasswordModify(currentPassword, newPassword);
    } else {
      deviceService.sendUserMgmtCommand("password", "set", 0, newPassword);
    }
  };

  // 密码管理 - 取消修改管理员密码
  const handleCancelModifyAdminPassword = () => {
    setShowModifyAdminPasswordModal(false);
    resetPasswordForm();
  };

  // 密码管理 - 生成随机6位密码
  const generateRandomPassword = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // 密码管理 - 创建临时密码 (任务 17.2 - 使用回调函数)
  const handleCreateTempPassword = () => {
    // 验证输入
    if (!tempPasswordName.trim()) {
      alert("请输入密码名称");
      return;
    }

    // 根据类型验证额外参数
    if (tempPasswordType === "time_limited") {
      if (!tempPasswordValidFrom || !tempPasswordValidUntil) {
        alert("请设置有效期");
        return;
      }
    }
    if (tempPasswordType === "count_limited") {
      if (tempPasswordMaxUses < 1) {
        alert("使用次数必须大于0");
        return;
      }
    }

    // 生成随机密码
    const password = generateRandomPassword();

    // 计算有效期（秒）
    let expires = 0;
    if (tempPasswordType === "one_time") {
      expires = 24 * 60 * 60; // 一次性密码默认24小时有效
    } else if (tempPasswordType === "time_limited") {
      const validUntilDate = new Date(tempPasswordValidUntil);
      const now = new Date();
      expires = Math.floor((validUntilDate.getTime() - now.getTime()) / 1000);
      if (expires <= 0) {
        alert("结束时间必须晚于当前时间");
        return;
      }
    } else if (tempPasswordType === "count_limited") {
      expires = 7 * 24 * 60 * 60; // 限次密码默认7天有效
    }

    // 设置处理状态
    setPasswordOperationStatus("processing");
    setPasswordOperationMessage("正在创建临时密码...");

    // 使用回调函数或直接发送命令
    if (onTempPasswordCreate) {
      onTempPasswordCreate(tempPasswordName, tempPasswordType, {
        validFrom: tempPasswordValidFrom || undefined,
        validUntil: tempPasswordValidUntil || undefined,
        maxUses:
          tempPasswordType === "count_limited"
            ? tempPasswordMaxUses
            : undefined,
      });
    } else {
      // 发送创建临时密码命令（使用 lock_control）
      deviceService.sendCommand({
        type: "lock_control",
        command: "temp_code",
        code: password,
        expires: expires,
        name: tempPasswordName,
        password_type: tempPasswordType,
        max_uses:
          tempPasswordType === "count_limited"
            ? tempPasswordMaxUses
            : undefined,
      });
    }

    // 模拟成功响应（实际应由服务器响应触发）
    setTimeout(() => {
      setPasswordOperationStatus("success");
      setPasswordOperationMessage(`临时密码创建成功: ${password}`);
      // 刷新密码列表
      deviceService.sendUserMgmtCommand("password", "query");
      // 延迟关闭弹窗
      setTimeout(() => {
        setShowCreateTempPasswordModal(false);
        resetPasswordForm();
      }, 2000);
    }, 1000);
  };

  // 密码管理 - 取消创建临时密码
  const handleCancelCreateTempPassword = () => {
    setShowCreateTempPasswordModal(false);
    resetPasswordForm();
  };

  // 密码管理 - 删除临时密码 (任务 17.2 - 使用回调函数)
  const handleDeleteTempPassword = (id: number) => {
    if (confirm("确定要删除此临时密码吗？")) {
      if (onTempPasswordDelete) {
        onTempPasswordDelete(id);
      } else {
        deviceService.sendUserMgmtCommand("password", "del", id);
      }
    }
  };

  // 密码类型映射
  const tempPasswordTypeMap: Record<TempPasswordType, string> = {
    one_time: "一次性",
    time_limited: "限时",
    count_limited: "限次",
  };

  // 视频附件 - 下载视频 (需求 14.6)
  const handleDownloadVideo = async (log: UnlockLog) => {
    if (!log.hasVideo || !log.mediaId) return;

    // 创建视频附件对象
    const attachment: VideoAttachment = {
      recordId: log.id,
      recordType: "unlock_log",
      mediaId: log.mediaId,
      filePath: log.videoFilePath || "",
      fileSize: log.videoFileSize || 0,
      duration: log.videoDuration,
      thumbnailUrl: log.videoThumbnailUrl,
      downloadStatus: "pending",
      downloadProgress: 0,
    };

    // 设置下载状态
    setVideoDownloadStatus((prev) => new Map(prev).set(log.id, "downloading"));
    setVideoDownloadProgress((prev) => new Map(prev).set(log.id, 0));

    try {
      await videoStorageService.downloadVideo(attachment);
    } catch (error) {
      console.error("下载视频失败:", error);
      setVideoDownloadStatus((prev) => new Map(prev).set(log.id, "failed"));
    }
  };

  // 视频附件 - 播放视频 (需求 14.3)
  const handlePlayVideo = async (log: UnlockLog) => {
    if (!log.hasVideo) return;

    try {
      // 优先使用本地视频
      const localUrl = await videoStorageService.getLocalVideoUrl(log.id);
      if (localUrl) {
        setPlayingVideoUrl(localUrl);
        setPlayingVideoRecordId(log.id);
        return;
      }

      // 如果没有本地视频，使用在线 URL（如果有缩略图 URL，可能有在线视频）
      if (log.videoThumbnailUrl) {
        // 假设视频 URL 与缩略图 URL 类似，只是扩展名不同
        const videoUrl = log.videoThumbnailUrl.replace(
          /\.(jpg|jpeg|png)$/i,
          ".mp4",
        );
        setPlayingVideoUrl(videoUrl);
        setPlayingVideoRecordId(log.id);
      }
    } catch (error) {
      console.error("播放视频失败:", error);
    }
  };

  // 视频附件 - 关闭视频播放
  const handleCloseVideoPlayer = () => {
    // 释放 Blob URL
    if (playingVideoUrl && playingVideoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(playingVideoUrl);
    }
    setPlayingVideoUrl(null);
    setPlayingVideoRecordId(null);
  };

  // 视频附件 - 获取视频下载状态
  const getVideoStatus = (log: UnlockLog): VideoDownloadStatus => {
    if (downloadedVideos.has(log.id)) return "completed";
    return videoDownloadStatus.get(log.id) || "pending";
  };

  // 视频附件 - 获取下载进度
  const getVideoProgress = (recordId: number): number => {
    return videoDownloadProgress.get(recordId) || 0;
  };

  // 视频附件 - 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  // 视频附件 - 加载存储统计 (需求 14.10)
  const loadStorageStats = async () => {
    try {
      const stats = await videoStorageService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error("获取存储统计失败:", error);
    }
  };

  // 视频附件 - 清空所有视频 (需求 14.10)
  const handleClearAllVideos = async () => {
    if (!confirm("确定要清空所有已下载的视频吗？此操作不可恢复。")) return;

    try {
      await videoStorageService.clearAllVideos();
      setDownloadedVideos(new Set());
      setVideoDownloadStatus(new Map());
      setVideoDownloadProgress(new Map());
      await loadStorageStats();
      alert("已清空所有视频");
    } catch (error) {
      console.error("清空视频失败:", error);
      alert("清空视频失败");
    }
  };

  // 清空缓存功能 (任务 9.4)
  const handleClearCache = async () => {
    if (
      !confirm(
        "确定要清空所有缓存数据吗？此操作不可恢复。\n\n将清空：开锁记录、事件记录、到访记录、最近动态",
      )
    )
      return;

    try {
      // 清空所有非关键数据
      await localStorageService.clear("unlockLogs");
      await localStorageService.clear("eventLogs");
      await localStorageService.clear("visitRecords");
      await localStorageService.clear("recentActivities");

      // 清空本地状态
      setUnlockLogs([]);
      setEventLogs([]);
      setUnlockLogsTotal(0);
      setEventLogsTotal(0);

      alert("缓存已清空");
    } catch (error) {
      console.error("清空缓存失败:", error);
      alert("清空缓存失败");
    }
  };

  // 视频附件 - 检查视频是否已下载
  const checkVideoDownloaded = async (recordId: number): Promise<boolean> => {
    try {
      return await videoStorageService.isVideoDownloaded(recordId);
    } catch {
      return false;
    }
  };

  // 初始化时检查已下载的视频
  useEffect(() => {
    const initVideoStorage = async () => {
      try {
        await videoStorageService.initialize();
        await loadStorageStats();

        // 检查开锁记录中哪些视频已下载
        for (const log of unlockLogs) {
          if (log.hasVideo) {
            const isDownloaded = await checkVideoDownloaded(log.id);
            if (isDownloaded) {
              setDownloadedVideos((prev) => new Set(prev).add(log.id));
            }
          }
        }
      } catch (error) {
        console.error("初始化视频存储服务失败:", error);
      }
    };

    initVideoStorage();
  }, [unlockLogs]);

  // 格式化时间显示
  const formatDateTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  // 卡号脱敏处理（显示后4位，前面用*号代替）
  const maskCardId = (cardId: string): string => {
    if (!cardId || cardId.length <= 4) {
      return cardId || "****";
    }
    const lastFour = cardId.slice(-4);
    return `****${lastFour}`;
  };

  // 子页面标题映射
  const subScreenTitles: Record<SubScreen, string> = {
    "face-management": "人脸管理",
    "fingerprint-management": "指纹管理",
    "nfc-management": "NFC 卡片管理",
    "password-management": "密码管理",
    "unlock-logs": "开锁记录",
    "event-logs": "事件记录",
    "visit-records": "到访记录",
  };

  // 渲染子页面占位内容（后续任务会实现具体功能）
  const renderSubScreen = () => {
    if (!subScreen) return null;

    // 人脸管理子页面
    if (subScreen === "face-management") {
      return (
        <div className="flex flex-col h-full">
          {/* 子页面头部 */}
          <div className="flex items-center space-x-3 mb-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-secondary-100 dark:bg-secondary-800 rounded-lg transition-colors"
            >
              <ChevronLeft
                size={24}
                className="text-secondary-600 dark:text-secondary-300"
              />
            </button>
            <h2 className="text-lg font-bold text-secondary-900 dark:text-secondary-50">
              {subScreenTitles[subScreen]}
            </h2>
          </div>

          {/* 子标签导航 */}
          <div
            className="flex bg-secondary-100 p-1 rounded-xl mb-4
                          dark:bg-secondary-800"
          >
            {(["list", "register"] as FaceSubTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setFaceSubTab(t)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  faceSubTab === t
                    ? "bg-white text-primary-600 shadow-sm dark:bg-secondary-900 dark:text-primary-400"
                    : "text-secondary-500 dark:text-secondary-400"
                }`}
              >
                {t === "list" ? "人员列表" : "录入人脸"}
              </button>
            ))}
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {!isConnected && (
              <div
                className="text-center p-8 text-secondary-400 bg-white rounded-xl 
                              border border-dashed border-secondary-300
                              dark:bg-secondary-900 dark:text-secondary-500 dark:border-secondary-700"
              >
                请先连接设备以管理人脸信息。
              </div>
            )}

            {/* 人员列表 */}
            {isConnected && faceSubTab === "list" && (
              <div className="space-y-3">
                {persons.length === 0 && (
                  <p className="text-center text-secondary-400 mt-8 dark:text-secondary-500">
                    暂无录入人脸。
                  </p>
                )}
                {persons.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-secondary-200 
                               flex items-center justify-between
                               dark:bg-secondary-900 dark:border-secondary-700"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center 
                                      text-primary-600 font-bold
                                      dark:bg-primary-900 dark:text-primary-400"
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-secondary-900 dark:text-secondary-50">
                          {p.name}
                        </h4>
                        <div
                          className="flex items-center text-xs text-secondary-500 space-x-2
                                        dark:text-secondary-400"
                        >
                          <span
                            className="px-2 py-0.5 bg-secondary-100 rounded-full
                                           dark:bg-secondary-800"
                          >
                            {relationTypes.find(
                              (r) => r.value === p.relation_type,
                            )?.label || p.relation_type}
                          </span>
                          {p.permission && (
                            <span>
                              {p.permission.time_start}-{p.permission.time_end}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditPermission(p)}
                        className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-full
                                   dark:text-primary-500 dark:hover:text-primary-400 dark:hover:bg-primary-950"
                        title="编辑权限"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeletePerson(p.id)}
                        className="p-2 text-error-400 hover:text-error-600 hover:bg-error-50 rounded-full
                                   dark:text-error-500 dark:hover:text-error-400 dark:hover:bg-error-950"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 录入人脸表单 */}
            {isConnected && faceSubTab === "register" && (
              <div
                className="bg-white p-5 rounded-xl shadow-sm border border-secondary-200 space-y-5
                              dark:bg-secondary-900 dark:border-secondary-700"
              >
                {/* 照片上传 */}
                <div className="text-center">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mx-auto w-24 h-24 rounded-full bg-secondary-50 border-2 border-dashed 
                               border-primary-200 flex flex-col items-center justify-center text-primary-400 
                               cursor-pointer overflow-hidden hover:bg-primary-50 transition-colors
                               dark:bg-secondary-800 dark:border-primary-700 dark:text-primary-500 
                               dark:hover:bg-primary-950"
                  >
                    {imgPreview ? (
                      <img
                        src={imgPreview}
                        className="w-full h-full object-cover"
                        alt="预览"
                      />
                    ) : (
                      <>
                        <Upload size={24} />
                        <span className="text-[10px] mt-1">上传</span>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>

                <div className="space-y-4">
                  {/* 姓名输入 */}
                  <div>
                    <label
                      className="text-xs font-bold text-secondary-500 uppercase
                                      dark:text-secondary-400"
                    >
                      姓名
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setName(e.target.value)
                      }
                      className="w-full mt-1 p-3 bg-secondary-50 border border-secondary-300 rounded-lg 
                                 text-secondary-900 placeholder-secondary-400
                                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                 dark:bg-secondary-800 dark:border-secondary-600
                                 dark:text-secondary-50 dark:placeholder-secondary-500
                                 dark:focus:ring-primary-400"
                      placeholder="请输入姓名"
                    />
                  </div>

                  {/* 关系选择 */}
                  <div>
                    <label
                      className="text-xs font-bold text-secondary-500 uppercase
                                      dark:text-secondary-400"
                    >
                      关系
                    </label>
                    <select
                      value={relation}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setRelation(e.target.value)
                      }
                      className="w-full mt-1 p-3 bg-secondary-50 border border-secondary-300 rounded-lg 
                                 text-secondary-900
                                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                 dark:bg-secondary-800 dark:border-secondary-600
                                 dark:text-secondary-50
                                 dark:focus:ring-primary-400"
                    >
                      {relationTypes.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 通行时段 */}
                  <div>
                    <label
                      className="text-xs font-bold text-secondary-500 uppercase mb-1 block
                                      dark:text-secondary-400"
                    >
                      通行时段
                    </label>
                    <div className="flex space-x-2">
                      <div className="flex-1 relative">
                        <Clock
                          size={16}
                          className="absolute left-3 top-3.5 text-secondary-400 dark:text-secondary-500"
                        />
                        <input
                          type="time"
                          value={timeStart}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setTimeStart(e.target.value)
                          }
                          className="w-full pl-9 p-3 bg-secondary-50 border border-secondary-300 rounded-lg text-sm
                                     text-secondary-900
                                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                     dark:bg-secondary-800 dark:border-secondary-600
                                     dark:text-secondary-50
                                     dark:focus:ring-primary-400"
                        />
                      </div>
                      <div className="flex items-center text-secondary-400 dark:text-secondary-500">
                        -
                      </div>
                      <div className="flex-1 relative">
                        <Clock
                          size={16}
                          className="absolute left-3 top-3.5 text-secondary-400 dark:text-secondary-500"
                        />
                        <input
                          type="time"
                          value={timeEnd}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setTimeEnd(e.target.value)
                          }
                          className="w-full pl-9 p-3 bg-secondary-50 border border-secondary-300 rounded-lg text-sm
                                     text-secondary-900
                                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                     dark:bg-secondary-800 dark:border-secondary-600
                                     dark:text-secondary-50
                                     dark:focus:ring-primary-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 提交按钮 */}
                <button
                  onClick={handleRegister}
                  className="w-full py-3 bg-primary-500 text-white rounded-xl font-semibold shadow-md 
                             hover:bg-primary-600 active:bg-primary-700 transition-colors
                             dark:bg-primary-600 dark:hover:bg-primary-500"
                >
                  录入人脸
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 到访记录子页面
    if (subScreen === "visit-records") {
      return (
        <div className="flex flex-col h-full">
          {/* 子页面头部 */}
          <div className="flex items-center space-x-3 mb-4">
            <button
              onClick={handleBack}
              className="p-2 hover:bg-secondary-100 dark:bg-secondary-800 rounded-lg transition-colors"
            >
              <ChevronLeft
                size={24}
                className="text-secondary-600 dark:text-secondary-300"
              />
            </button>
            <h2 className="text-lg font-bold text-secondary-900 dark:text-secondary-50">
              {subScreenTitles[subScreen]}
            </h2>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {!isConnected && (
              <div className="text-center p-8 text-secondary-400 dark:text-secondary-500 bg-white rounded-xl border border-dashed border-secondary-300 dark:border-secondary-600">
                请先连接设备以查看到访记录。
              </div>
            )}

            {isConnected && (
              <div className="space-y-3">
                {visits.length === 0 && !visitLoading && (
                  <p className="text-center text-secondary-400 mt-8 dark:text-secondary-500">
                    暂无到访记录。
                  </p>
                )}

                {/* 到访记录列表 */}
                {visits.map((v, idx) => (
                  <div
                    key={`${v.visit_time}-${idx}`}
                    className="bg-white p-4 rounded-xl shadow-sm border border-secondary-200 
                               flex items-center justify-between
                               hover:bg-secondary-50 transition-colors
                               dark:bg-secondary-900 dark:border-secondary-700 dark:hover:bg-secondary-800"
                  >
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-secondary-900 dark:text-secondary-50">
                          {v.person_name || "陌生人"}
                        </h4>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            v.access_granted
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {v.access_granted ? "已开门" : "未开门"}
                        </span>
                      </div>
                      <p className="text-xs text-secondary-400 dark:text-secondary-500">
                        {v.visit_time}
                      </p>
                    </div>
                    <div className="text-xs font-medium text-secondary-500 dark:text-secondary-400">
                      {v.result === "known"
                        ? "已识别"
                        : v.result === "unknown"
                          ? "未识别"
                          : "无人脸"}
                    </div>
                  </div>
                ))}

                {/* 加载更多按钮 */}
                {visits.length > 0 && hasMoreVisits && (
                  <button
                    onClick={handleLoadMoreVisits}
                    disabled={visitLoading}
                    className="w-full py-3 bg-secondary-100 text-secondary-600 rounded-xl font-medium 
                               hover:bg-secondary-200 transition-colors disabled:opacity-50
                               dark:bg-secondary-800 dark:text-secondary-300 dark:hover:bg-secondary-700"
                  >
                    {visitLoading ? "加载中..." : "加载更多"}
                  </button>
                )}

                {/* 没有更多数据提示 */}
                {visits.length > 0 && !hasMoreVisits && (
                  <p className="text-center text-secondary-400 text-sm py-2 dark:text-secondary-500">
                    已加载全部记录
                  </p>
                )}

                {/* 初始加载状态 */}
                {visitLoading && visits.length === 0 && (
                  <div className="text-center py-8">
                    <div
                      className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin dark:border-primary-400
                                    dark:border-primary-400"
                    ></div>
                    <p className="text-secondary-400 text-sm mt-2 dark:text-secondary-500">
                      加载中...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // 开锁记录子页面
    if (subScreen === "unlock-logs") {
      return (
        <div className="flex flex-col h-full">
          {/* 子页面头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-secondary-100 dark:bg-secondary-800 rounded-lg transition-colors"
              >
                <ChevronLeft
                  size={24}
                  className="text-secondary-600 dark:text-secondary-300"
                />
              </button>
              <h2 className="text-lg font-bold text-secondary-900 dark:text-secondary-50">
                {subScreenTitles[subScreen]}
              </h2>
              {/* 离线模式标识 */}
              {!isConnected && unlockLogs.length > 0 && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                  离线模式
                </span>
              )}
            </div>
            {unlockLogsTotal > 0 && (
              <span className="text-xs text-secondary-400 dark:text-secondary-500">
                共 {unlockLogsTotal} 条
              </span>
            )}
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {/* 离线模式提示 */}
            {!isConnected && unlockLogs.length === 0 && !unlockLogsLoading && (
              <div className="text-center p-8 text-secondary-400 dark:text-secondary-500 bg-white rounded-xl border border-dashed border-secondary-300 dark:border-secondary-600">
                <p className="mb-2">离线模式</p>
                <p className="text-sm">暂无缓存的开锁记录</p>
              </div>
            )}

            {/* 在线模式且未连接 */}
            {!isConnected && unlockLogs.length === 0 && unlockLogsLoading && (
              <div className="text-center p-8 text-secondary-400 dark:text-secondary-500 bg-white rounded-xl border border-dashed border-secondary-300 dark:border-secondary-600">
                正在加载缓存数据...
              </div>
            )}

            {/* 有数据时显示列表（在线或离线） */}
            {(isConnected || unlockLogs.length > 0) && (
              <div className="space-y-3">
                {unlockLogs.length === 0 && !unlockLogsLoading && (
                  <p className="text-center text-secondary-400 mt-8 dark:text-secondary-500">
                    暂无开锁记录。
                  </p>
                )}

                {/* 开锁记录列表 */}
                {unlockLogs.map((log, idx) => {
                  const videoStatus = getVideoStatus(log);
                  const progress = getVideoProgress(log.id);

                  return (
                    <div
                      key={log.id || idx}
                      className="bg-white p-4 rounded-xl shadow-sm border border-secondary-200
                                 dark:bg-secondary-900 dark:border-secondary-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span
                            className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded
                                           dark:bg-primary-900 dark:text-primary-300"
                          >
                            {unlockMethodMap[log.method] || log.method}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              log.result
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {log.result ? "成功" : "失败"}
                          </span>
                          {/* 视频附件状态标签 (需求 14.1) */}
                          {log.hasVideo && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center space-x-1 ${
                                videoStatus === "completed"
                                  ? "bg-blue-100 text-blue-700"
                                  : videoStatus === "downloading"
                                    ? "bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-300"
                                    : "bg-secondary-100 text-secondary-500 dark:bg-secondary-800 dark:text-secondary-400"
                              }`}
                            >
                              <Video size={10} />
                              <span>
                                {videoStatus === "completed"
                                  ? "已下载"
                                  : videoStatus === "downloading"
                                    ? `${progress}%`
                                    : "有视频"}
                              </span>
                            </span>
                          )}
                        </div>
                        {log.user_name && (
                          <span className="text-sm text-secondary-600 dark:text-secondary-300">
                            {log.user_name}
                          </span>
                        )}
                      </div>

                      {/* 视频缩略图/播放区域 (需求 14.2, 14.3) */}
                      {log.hasVideo && (
                        <div className="mt-3 mb-2">
                          <div
                            className="relative w-full h-24 bg-secondary-100 rounded-lg overflow-hidden cursor-pointer group
                                       dark:bg-secondary-800"
                            onClick={() =>
                              videoStatus === "completed"
                                ? handlePlayVideo(log)
                                : null
                            }
                          >
                            {/* 缩略图 */}
                            {log.videoThumbnailUrl ? (
                              <img
                                src={log.videoThumbnailUrl}
                                alt="视频缩略图"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center bg-secondary-200
                                              dark:bg-secondary-700"
                              >
                                <Video
                                  size={32}
                                  className="text-secondary-400 dark:text-secondary-500"
                                />
                              </div>
                            )}

                            {/* 播放按钮覆盖层 */}
                            {videoStatus === "completed" && (
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                                  <Play
                                    size={24}
                                    className="text-primary-600 ml-1 dark:text-primary-400"
                                  />
                                </div>
                              </div>
                            )}

                            {/* 下载进度条 */}
                            {videoStatus === "downloading" && (
                              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                                <div className="w-3/4 bg-white/30 rounded-full h-2 mb-2">
                                  <div
                                    className="bg-white h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-white text-xs">
                                  {progress}%
                                </span>
                              </div>
                            )}

                            {/* 下载按钮 (需求 14.5, 14.6) */}
                            {videoStatus === "pending" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadVideo(log);
                                }}
                                className="absolute bottom-2 right-2 px-3 py-1.5 bg-primary-600 text-white 
                                           text-xs font-medium rounded-lg flex items-center space-x-1 
                                           hover:bg-primary-700 transition-colors
                                           dark:bg-primary-500 dark:hover:bg-primary-600"
                              >
                                <Download size={14} />
                                <span>下载</span>
                              </button>
                            )}

                            {/* 下载失败重试按钮 */}
                            {videoStatus === "failed" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadVideo(log);
                                }}
                                className="absolute bottom-2 right-2 px-3 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg flex items-center space-x-1 hover:bg-red-600 transition-colors"
                              >
                                <Download size={14} />
                                <span>重试</span>
                              </button>
                            )}

                            {/* 视频时长显示 */}
                            {log.videoDuration && (
                              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                                {Math.floor(log.videoDuration / 60)}:
                                {(log.videoDuration % 60)
                                  .toString()
                                  .padStart(2, "0")}
                              </div>
                            )}
                          </div>

                          {/* 视频文件大小 (需求 14.7) */}
                          {log.videoFileSize && (
                            <div className="mt-1 text-xs text-secondary-400 dark:text-secondary-500">
                              文件大小: {formatFileSize(log.videoFileSize)}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-secondary-400 dark:text-secondary-500">
                        <span>{log.timestamp}</span>
                        {!log.result && log.fail_count > 0 && (
                          <span className="text-red-400">
                            失败 {log.fail_count} 次
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 加载更多按钮 */}
                {unlockLogs.length > 0 && hasMoreUnlockLogs && (
                  <button
                    onClick={handleLoadMoreUnlockLogs}
                    disabled={unlockLogsLoading}
                    className="w-full py-3 bg-secondary-100 text-secondary-600 rounded-xl font-medium 
                               hover:bg-secondary-200 transition-colors disabled:opacity-50
                               dark:bg-secondary-800 dark:text-secondary-300 dark:hover:bg-secondary-700"
                  >
                    {unlockLogsLoading ? "加载中..." : "加载更多"}
                  </button>
                )}

                {/* 没有更多数据提示 */}
                {unlockLogs.length > 0 && !hasMoreUnlockLogs && (
                  <p className="text-center text-secondary-400 text-sm py-2 dark:text-secondary-500">
                    已加载全部记录
                  </p>
                )}

                {/* 初始加载状态 */}
                {unlockLogsLoading && unlockLogs.length === 0 && (
                  <div className="text-center py-8">
                    <div
                      className="inline-block w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin dark:border-primary-400
                                    dark:border-primary-400"
                    ></div>
                    <p className="text-secondary-400 text-sm mt-2 dark:text-secondary-500">
                      加载中...
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 视频播放器弹窗 (需求 14.3) */}
          {playingVideoUrl && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="relative w-full max-w-lg">
                {/* 关闭按钮 */}
                <button
                  onClick={handleCloseVideoPlayer}
                  className="absolute -top-10 right-0 text-white hover:text-secondary-300 transition-colors"
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* 视频播放器 */}
                <video
                  src={playingVideoUrl}
                  controls
                  autoPlay
                  className="w-full rounded-lg shadow-2xl"
                  onEnded={handleCloseVideoPlayer}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 事件记录子页面
    if (subScreen === "event-logs") {
      return (
        <div className="flex flex-col h-full">
          {/* 子页面头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-secondary-100 dark:bg-secondary-800 rounded-lg transition-colors"
              >
                <ChevronLeft
                  size={24}
                  className="text-secondary-600 dark:text-secondary-300"
                />
              </button>
              <h2 className="text-lg font-bold text-secondary-900 dark:text-secondary-50">
                {subScreenTitles[subScreen]}
              </h2>
              {/* 离线模式标识 */}
              {!isConnected && eventLogs.length > 0 && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded">
                  离线模式
                </span>
              )}
            </div>
            {eventLogsTotal > 0 && (
              <span className="text-xs text-secondary-400 dark:text-secondary-500">
                共 {eventLogsTotal} 条
              </span>
            )}
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {/* 离线模式提示 */}
            {!isConnected && eventLogs.length === 0 && !eventLogsLoading && (
              <div className="text-center p-8 text-secondary-400 dark:text-secondary-500 bg-white rounded-xl border border-dashed border-secondary-300 dark:border-secondary-600">
                <p className="mb-2">离线模式</p>
                <p className="text-sm">暂无缓存的事件记录</p>
              </div>
            )}

            {/* 在线模式且未连接 */}
            {!isConnected && eventLogs.length === 0 && eventLogsLoading && (
              <div className="text-center p-8 text-secondary-400 dark:text-secondary-500 bg-white rounded-xl border border-dashed border-secondary-300 dark:border-secondary-600">
                正在加载缓存数据...
              </div>
            )}

            {/* 有数据时显示列表（在线或离线） */}
            {(isConnected || eventLogs.length > 0) && (
              <div className="space-y-3">
                {/* 初始加载状态 */}
                {eventLogsLoading && eventLogs.length === 0 && (
                  <div className="text-center py-8">
                    <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin dark:border-primary-400"></div>
                    <p className="text-secondary-400 dark:text-secondary-500 text-sm mt-2">
                      加载中...
                    </p>
                  </div>
                )}

                {/* 无数据提示 */}
                {eventLogs.length === 0 && !eventLogsLoading && (
                  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-secondary-300 dark:border-secondary-600">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 text-secondary-300" />
                    <p className="text-secondary-400 dark:text-secondary-500 text-sm">
                      暂无事件记录
                    </p>
                  </div>
                )}

                {/* 事件记录列表 */}
                {eventLogs.map((event, idx) => {
                  const eventInfo = eventTypeMap[event.event] || {
                    label: event.event,
                    color:
                      "bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300",
                  };
                  return (
                    <div
                      key={event.id || idx}
                      className="bg-white p-4 rounded-xl shadow-sm border border-secondary-200
                                 dark:bg-secondary-900 dark:border-secondary-700"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${eventInfo.color}`}
                        >
                          {eventInfo.label}
                        </span>
                        {event.event === "low_battery" && event.param > 0 && (
                          <span className="text-sm text-warning-500 font-medium dark:text-warning-400">
                            {event.param}%
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-secondary-400 dark:text-secondary-500">
                        {event.timestamp}
                      </p>
                    </div>
                  );
                })}

                {/* 加载更多按钮 */}
                {eventLogs.length > 0 && hasMoreEventLogs && (
                  <button
                    onClick={handleLoadMoreEventLogs}
                    disabled={eventLogsLoading}
                    className="w-full py-3 bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 rounded-xl font-medium hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors disabled:opacity-50"
                  >
                    {eventLogsLoading ? "加载中..." : "加载更多"}
                  </button>
                )}

                {/* 没有更多数据提示 */}
                {eventLogs.length > 0 && !hasMoreEventLogs && (
                  <p className="text-center text-secondary-400 dark:text-secondary-500 text-sm py-2">
                    已加载全部记录
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    // 指纹管理子页面
    if (subScreen === "fingerprint-management") {
      return (
        <div className="flex flex-col h-full">
          {/* 子页面头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-secondary-100 dark:bg-secondary-800 rounded-lg transition-colors"
              >
                <ChevronLeft
                  size={24}
                  className="text-secondary-600 dark:text-secondary-300"
                />
              </button>
              <h2 className="text-lg font-bold text-secondary-900 dark:text-secondary-50">
                {subScreenTitles[subScreen]}
              </h2>
            </div>
            {/* 容量显示 */}
            <span className="text-xs text-secondary-400 dark:text-secondary-500">
              {fingerprints.length}/{fingerprintMaxCount}
            </span>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {!isConnected && (
              <div className="text-center p-8 text-secondary-400 dark:text-secondary-500 bg-white rounded-xl border border-dashed border-secondary-300 dark:border-secondary-600">
                请先连接设备以管理指纹信息。
              </div>
            )}

            {isConnected && (
              <div className="space-y-3">
                {/* 添加指纹按钮 */}
                {fingerprints.length < fingerprintMaxCount && (
                  <button
                    onClick={() => setShowAddFingerprintModal(true)}
                    className="w-full py-4 bg-primary-50 text-primary-600 rounded-xl font-medium 
                               hover:bg-primary-100 transition-colors flex items-center justify-center space-x-2 
                               border-2 border-dashed border-primary-200
                               dark:bg-primary-950 dark:text-primary-400 dark:hover:bg-primary-900 
                               dark:border-primary-800"
                  >
                    <Plus size={20} />
                    <span>添加指纹</span>
                  </button>
                )}

                {/* 指纹列表 */}
                {fingerprintLoading && fingerprints.length === 0 && (
                  <div className="text-center py-8">
                    <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin dark:border-primary-400"></div>
                    <p className="text-secondary-400 dark:text-secondary-500 text-sm mt-2">
                      加载中...
                    </p>
                  </div>
                )}

                {!fingerprintLoading && fingerprints.length === 0 && (
                  <p className="text-center text-secondary-400 mt-8 dark:text-secondary-500">
                    暂无录入指纹。
                  </p>
                )}

                {fingerprints.map((fp) => (
                  <div
                    key={fp.id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-secondary-200 
                               flex items-center justify-between
                               dark:bg-secondary-900 dark:border-secondary-700"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center 
                                      text-primary-600
                                      dark:bg-primary-900 dark:text-primary-400"
                      >
                        <FingerprintIcon size={20} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-secondary-900 dark:text-secondary-50">
                          {fp.name}
                        </h4>
                        <p className="text-xs text-secondary-400 dark:text-secondary-500">
                          录入时间: {formatDateTime(fp.registeredAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFingerprint(fp.id)}
                      className="p-2 text-error-400 hover:text-error-600 hover:bg-error-50 rounded-full
                                 dark:text-error-500 dark:hover:text-error-400 dark:hover:bg-error-950"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 添加指纹弹窗 */}
          {showAddFingerprintModal && (
            <div
              className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4
                            dark:bg-secondary-950/70"
            >
              <div
                className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5
                              dark:bg-secondary-800"
              >
                <h3
                  className="text-lg font-bold text-secondary-900 text-center
                               dark:text-secondary-50"
                >
                  添加指纹
                </h3>

                {/* 录入状态显示 */}
                {fingerprintRegStatus.status !== "idle" && (
                  <div className="text-center py-4">
                    {/* 状态图标 */}
                    <div
                      className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                        fingerprintRegStatus.status === "success"
                          ? "bg-success-100 text-success-600 dark:bg-success-950 dark:text-success-400"
                          : fingerprintRegStatus.status === "failed"
                            ? "bg-error-100 text-error-600 dark:bg-error-950 dark:text-error-400"
                            : "bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400"
                      }`}
                    >
                      {fingerprintRegStatus.status === "success" ? (
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : fingerprintRegStatus.status === "failed" ? (
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      ) : (
                        <FingerprintIcon
                          size={32}
                          className={
                            fingerprintRegStatus.status === "scanning"
                              ? "animate-pulse"
                              : ""
                          }
                        />
                      )}
                    </div>

                    {/* 状态文本 */}
                    <p
                      className={`text-sm font-medium ${
                        fingerprintRegStatus.status === "success"
                          ? "text-success-600 dark:text-success-400"
                          : fingerprintRegStatus.status === "failed"
                            ? "text-error-600 dark:text-error-400"
                            : "text-secondary-600 dark:text-secondary-300"
                      }`}
                    >
                      {fingerprintRegStatus.message}
                    </p>

                    {/* 进度条 */}
                    {(fingerprintRegStatus.status === "scanning" ||
                      fingerprintRegStatus.status === "waiting") && (
                      <div
                        className="mt-3 w-full bg-secondary-200 rounded-full h-2
                                      dark:bg-secondary-700"
                      >
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300
                                     dark:bg-primary-500"
                          style={{ width: `${fingerprintRegStatus.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 输入表单（仅在 idle 状态显示） */}
                {fingerprintRegStatus.status === "idle" && (
                  <div>
                    <label
                      className="text-xs font-bold text-secondary-500 uppercase
                                      dark:text-secondary-400"
                    >
                      指纹名称
                    </label>
                    <input
                      type="text"
                      value={fingerprintName}
                      onChange={(e) => setFingerprintName(e.target.value)}
                      className="w-full mt-1 p-3 bg-secondary-50 border border-secondary-300 rounded-lg 
                                 text-secondary-900 placeholder-secondary-400
                                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                                 dark:bg-secondary-800 dark:border-secondary-600
                                 dark:text-secondary-50 dark:placeholder-secondary-500
                                 dark:focus:ring-primary-400"
                      placeholder="例如：右手食指"
                    />
                  </div>
                )}

                {/* 按钮区域 */}
                <div className="flex space-x-3">
                  {fingerprintRegStatus.status === "idle" && (
                    <>
                      <button
                        onClick={handleCancelFingerprintRegistration}
                        className="flex-1 py-3 bg-secondary-100 text-secondary-600 rounded-xl font-medium 
                                   hover:bg-secondary-200 transition-colors
                                   dark:bg-secondary-700 dark:text-secondary-300 dark:hover:bg-secondary-600"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleStartFingerprintRegistration}
                        className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium 
                                   hover:bg-primary-700 transition-colors
                                   dark:bg-primary-500 dark:hover:bg-primary-600"
                      >
                        开始录入
                      </button>
                    </>
                  )}

                  {(fingerprintRegStatus.status === "waiting" ||
                    fingerprintRegStatus.status === "scanning") && (
                    <button
                      onClick={handleCancelFingerprintRegistration}
                      className="w-full py-3 bg-secondary-100 text-secondary-600 rounded-xl font-medium 
                                 hover:bg-secondary-200 transition-colors
                                 dark:bg-secondary-700 dark:text-secondary-300 dark:hover:bg-secondary-600"
                    >
                      取消录入
                    </button>
                  )}

                  {(fingerprintRegStatus.status === "success" ||
                    fingerprintRegStatus.status === "failed") && (
                    <button
                      onClick={handleCancelFingerprintRegistration}
                      className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium 
                                 hover:bg-primary-700 transition-colors
                                 dark:bg-primary-500 dark:hover:bg-primary-600"
                    >
                      完成
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // NFC 卡片管理子页面
    if (subScreen === "nfc-management") {
      return (
        <div className="flex flex-col h-full">
          {/* 子页面头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-secondary-100 dark:bg-secondary-800 rounded-lg transition-colors"
              >
                <ChevronLeft
                  size={24}
                  className="text-secondary-600 dark:text-secondary-300"
                />
              </button>
              <h2 className="text-lg font-bold text-secondary-900 dark:text-secondary-50">
                {subScreenTitles[subScreen]}
              </h2>
            </div>
            {/* 容量显示 */}
            <span className="text-xs text-secondary-400 dark:text-secondary-500">
              {nfcCards.length}/{nfcMaxCount}
            </span>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {!isConnected && (
              <div className="text-center p-8 text-secondary-400 dark:text-secondary-500 bg-white rounded-xl border border-dashed border-secondary-300 dark:border-secondary-600">
                请先连接设备以管理 NFC 卡片。
              </div>
            )}

            {isConnected && (
              <div className="space-y-3">
                {/* 添加卡片按钮 */}
                {nfcCards.length < nfcMaxCount && (
                  <button
                    onClick={() => setShowAddNfcModal(true)}
                    className="w-full py-4 bg-primary-50 text-primary-600 rounded-xl font-medium 
                               hover:bg-primary-100 transition-colors flex items-center justify-center space-x-2 
                               border-2 border-dashed border-primary-200
                               dark:bg-primary-950 dark:text-primary-400 dark:hover:bg-primary-900 
                               dark:border-primary-800"
                  >
                    <Plus size={20} />
                    <span>添加卡片</span>
                  </button>
                )}

                {/* 卡片列表 */}
                {nfcLoading && nfcCards.length === 0 && (
                  <div className="text-center py-8">
                    <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin dark:border-primary-400"></div>
                    <p className="text-secondary-400 dark:text-secondary-500 text-sm mt-2">
                      加载中...
                    </p>
                  </div>
                )}

                {!nfcLoading && nfcCards.length === 0 && (
                  <p className="text-center text-secondary-400 mt-8 dark:text-secondary-500">
                    暂无绑定卡片。
                  </p>
                )}

                {nfcCards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-secondary-200 
                               flex items-center justify-between
                               dark:bg-secondary-900 dark:border-secondary-700"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center 
                                      text-primary-600
                                      dark:bg-primary-900 dark:text-primary-400"
                      >
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-secondary-900 dark:text-secondary-50">
                          {card.name}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-secondary-400 dark:text-secondary-500">
                          <span className="font-mono">{card.maskedCardId}</span>
                          <span>·</span>
                          <span>{formatDateTime(card.registeredAt)}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteNfcCard(card.id)}
                      className="p-2 text-error-400 hover:text-error-600 hover:bg-error-50 rounded-full
                                 dark:text-error-500 dark:hover:text-error-400 dark:hover:bg-error-950"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 添加卡片弹窗 */}
          {showAddNfcModal && (
            <div className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 dark:bg-secondary-950/70">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5">
                <h3 className="text-lg font-bold text-secondary-900 dark:text-secondary-50 text-center">
                  NFC 卡片`n{" "}
                </h3>

                {/* 绑定状态显示 */}
                {nfcRegStatus.status !== "idle" && (
                  <div className="text-center py-4">
                    {/* 状态图标 */}
                    <div
                      className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                        nfcRegStatus.status === "success"
                          ? "bg-green-100 text-green-600"
                          : nfcRegStatus.status === "failed"
                            ? "bg-red-100 text-red-600"
                            : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
                      }`}
                    >
                      {nfcRegStatus.status === "success" ? (
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : nfcRegStatus.status === "failed" ? (
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      ) : (
                        <CreditCard
                          size={32}
                          className={
                            nfcRegStatus.status === "reading"
                              ? "animate-pulse"
                              : ""
                          }
                        />
                      )}
                    </div>

                    {/* 状态文本 */}
                    <p
                      className={`text-sm font-medium ${
                        nfcRegStatus.status === "success"
                          ? "text-green-600"
                          : nfcRegStatus.status === "failed"
                            ? "text-red-600"
                            : "text-secondary-600 dark:text-secondary-300"
                      }`}
                    >
                      {nfcRegStatus.message}
                    </p>
                  </div>
                )}

                {/* 输入表单（仅在 idle 状态显示） */}
                {nfcRegStatus.status === "idle" && (
                  <div>
                    <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase">
                      卡片名称
                    </label>
                    <input
                      type="text"
                      value={nfcCardName}
                      onChange={(e) => setNfcCardName(e.target.value)}
                      className="w-full mt-1 p-3 bg-secondary-50 dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:outline-none focus:border-primary-500 dark:border-primary-400"
                      placeholder="例如：门禁卡、工卡"
                    />
                  </div>
                )}

                {/* 按钮区域 */}
                <div className="flex space-x-3">
                  {nfcRegStatus.status === "idle" && (
                    <>
                      <button
                        onClick={handleCancelNfcRegistration}
                        className="flex-1 py-3 bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 rounded-xl font-medium hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleStartNfcRegistration}
                        className="flex-1 py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                      >
                        开始绑定
                      </button>
                    </>
                  )}

                  {(nfcRegStatus.status === "waiting" ||
                    nfcRegStatus.status === "reading") && (
                    <button
                      onClick={handleCancelNfcRegistration}
                      className="w-full py-3 bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 rounded-xl font-medium hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                    >
                      取消绑定
                    </button>
                  )}

                  {(nfcRegStatus.status === "success" ||
                    nfcRegStatus.status === "failed") && (
                    <button
                      onClick={handleCancelNfcRegistration}
                      className="w-full py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                    >
                      完成
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 密码管理子页面
    if (subScreen === "password-management") {
      return (
        <div className="flex flex-col h-full">
          {/* 子页面头部 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBack}
                className="p-2 hover:bg-secondary-100 dark:bg-secondary-800 rounded-lg transition-colors"
              >
                <ChevronLeft
                  size={24}
                  className="text-secondary-600 dark:text-secondary-300"
                />
              </button>
              <h2 className="text-lg font-bold text-secondary-900 dark:text-secondary-50">
                {subScreenTitles[subScreen]}
              </h2>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-y-auto">
            {!isConnected && (
              <div className="text-center p-8 text-secondary-400 dark:text-secondary-500 bg-white rounded-xl border border-dashed border-secondary-300 dark:border-secondary-600">
                请先连接设备以管理密码。
              </div>
            )}

            {isConnected && (
              <div className="space-y-4">
                {/* 管理员密码区域 */}
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
                  <div className="p-4 border-b border-secondary-200 dark:border-secondary-700">
                    <h3 className="font-bold text-secondary-900 dark:text-secondary-50">
                      管理员密码
                    </h3>
                    {!adminPasswordStatus.isSet && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center">
                        <AlertCircle size={12} className="mr-1" />
                        默认密码：123456
                      </p>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-400">
                          <KeyRound size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900 dark:text-secondary-50">
                            {adminPasswordStatus.isSet ? "已设置" : "未设置"}
                          </p>
                          {adminPasswordStatus.lastModifiedAt && (
                            <p className="text-xs text-secondary-400 dark:text-secondary-500">
                              上次修改:{" "}
                              {formatDateTime(
                                adminPasswordStatus.lastModifiedAt,
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowModifyAdminPasswordModal(true)}
                        className="px-4 py-2 bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-100 dark:bg-primary-900 transition-colors"
                      >
                        {adminPasswordStatus.isSet ? "修改密码" : "设置密码"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 临时密码区域 */}
                <div className="bg-white rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
                  <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex items-center justify-between">
                    <h3 className="font-bold text-secondary-900 dark:text-secondary-50">
                      临时密码
                    </h3>
                    <span className="text-xs text-secondary-400 dark:text-secondary-500">
                      {tempPasswords.length}/{tempPasswordMaxCount}
                    </span>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* 创建临时密码按钮 */}
                    {tempPasswords.length < tempPasswordMaxCount && (
                      <button
                        onClick={() => setShowCreateTempPasswordModal(true)}
                        className="w-full py-4 bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 rounded-xl font-medium hover:bg-primary-100 dark:bg-primary-900 transition-colors flex items-center justify-center space-x-2 border-2 border-dashed border-primary-200 dark:border-primary-700"
                      >
                        <Plus size={20} />
                        <span>创建临时密码</span>
                      </button>
                    )}

                    {/* 加载状态 */}
                    {passwordLoading && tempPasswords.length === 0 && (
                      <div className="text-center py-8">
                        <div className="inline-block w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin dark:border-primary-400"></div>
                        <p className="text-secondary-400 dark:text-secondary-500 text-sm mt-2">
                          加载中...
                        </p>
                      </div>
                    )}

                    {/* 空状态 */}
                    {!passwordLoading && tempPasswords.length === 0 && (
                      <p className="text-center text-secondary-400 dark:text-secondary-500 py-4">
                        暂无临时密码
                      </p>
                    )}

                    {/* 临时密码列表 */}
                    {tempPasswords.map((pwd) => (
                      <div
                        key={pwd.id}
                        className={`p-4 rounded-xl border ${
                          pwd.isExpired
                            ? "bg-secondary-50 dark:bg-secondary-900 border-secondary-300 dark:border-secondary-600"
                            : "bg-white border-secondary-200 dark:border-secondary-700 shadow-sm"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h4
                              className={`font-semibold ${pwd.isExpired ? "text-secondary-400 dark:text-secondary-500" : "text-secondary-900 dark:text-secondary-50"}`}
                            >
                              {pwd.name}
                            </h4>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                pwd.isExpired
                                  ? "bg-secondary-200 dark:bg-secondary-700 text-secondary-500 dark:text-secondary-400"
                                  : pwd.type === "one_time"
                                    ? "bg-blue-100 text-blue-700"
                                    : pwd.type === "time_limited"
                                      ? "bg-green-100 text-green-700"
                                      : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {pwd.isExpired
                                ? "已过期"
                                : tempPasswordTypeMap[pwd.type]}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteTempPassword(pwd.id)}
                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        {/* 密码显示 */}
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-mono text-lg tracking-wider text-primary-600 dark:text-primary-400">
                            {pwd.password}
                          </span>
                        </div>

                        {/* 详细信息 */}
                        <div className="text-xs text-secondary-400 dark:text-secondary-500 space-y-1">
                          {pwd.type === "time_limited" && pwd.validUntil && (
                            <p>有效期至: {formatDateTime(pwd.validUntil)}</p>
                          )}
                          {pwd.type === "count_limited" && (
                            <p>
                              使用次数: {pwd.currentUses}/{pwd.maxUses}
                            </p>
                          )}
                          {pwd.type === "one_time" && (
                            <p>使用次数: {pwd.currentUses}/1</p>
                          )}
                          <p>创建时间: {formatDateTime(pwd.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 修改管理员密码弹窗 */}
          {showModifyAdminPasswordModal && (
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
              style={{ zIndex: 9999 }}
            >
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5">
                <h3 className="text-lg font-bold text-secondary-900 dark:text-secondary-50 text-center">
                  {adminPasswordStatus.isSet
                    ? "修改管理员密码"
                    : "设置管理员密码"}
                </h3>

                {/* 操作状态显示 */}
                {passwordOperationStatus !== "idle" && (
                  <div className="text-center py-4">
                    <div
                      className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                        passwordOperationStatus === "success"
                          ? "bg-green-100 text-green-600"
                          : passwordOperationStatus === "failed"
                            ? "bg-red-100 text-red-600"
                            : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
                      }`}
                    >
                      {passwordOperationStatus === "success" ? (
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : passwordOperationStatus === "failed" ? (
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      ) : (
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin dark:border-primary-400"></div>
                      )}
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        passwordOperationStatus === "success"
                          ? "text-green-600"
                          : passwordOperationStatus === "failed"
                            ? "text-red-600"
                            : "text-secondary-600 dark:text-secondary-300"
                      }`}
                    >
                      {passwordOperationMessage}
                    </p>
                  </div>
                )}

                {/* 输入表单 */}
                {passwordOperationStatus === "idle" && (
                  <div className="space-y-4">
                    {adminPasswordStatus.isSet && (
                      <div>
                        <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase">
                          当前密码
                        </label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full mt-1 p-3 bg-secondary-50 dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:outline-none focus:border-primary-500 dark:border-primary-400"
                          placeholder="请输入当前密码"
                          maxLength={6}
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase">
                        新密码
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full mt-1 p-3 bg-secondary-50 dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:outline-none focus:border-primary-500 dark:border-primary-400"
                        placeholder="请输入6位数字密码"
                        maxLength={6}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase">
                        确认新密码
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full mt-1 p-3 bg-secondary-50 dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:outline-none focus:border-primary-500 dark:border-primary-400"
                        placeholder="请再次输入新密码"
                        maxLength={6}
                      />
                    </div>
                  </div>
                )}

                {/* 按钮区域 */}
                <div className="flex space-x-3">
                  {passwordOperationStatus === "idle" && (
                    <>
                      <button
                        onClick={handleCancelModifyAdminPassword}
                        className="flex-1 py-3 bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 rounded-xl font-medium hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleModifyAdminPassword}
                        className="flex-1 py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                      >
                        确认修改
                      </button>
                    </>
                  )}

                  {passwordOperationStatus === "processing" && (
                    <button
                      disabled
                      className="w-full py-3 bg-secondary-100 dark:bg-secondary-800 text-secondary-400 dark:text-secondary-500 rounded-xl font-medium cursor-not-allowed"
                    >
                      处理中...
                    </button>
                  )}

                  {(passwordOperationStatus === "success" ||
                    passwordOperationStatus === "failed") && (
                    <button
                      onClick={handleCancelModifyAdminPassword}
                      className="w-full py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                    >
                      完成
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 创建临时密码弹窗 */}
          {showCreateTempPasswordModal && (
            <div className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 dark:bg-secondary-950/70">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-bold text-secondary-900 dark:text-secondary-50 text-center">
                  创建临时密码
                </h3>

                {/* 操作状态显示 */}
                {passwordOperationStatus !== "idle" && (
                  <div className="text-center py-4">
                    <div
                      className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                        passwordOperationStatus === "success"
                          ? "bg-green-100 text-green-600"
                          : passwordOperationStatus === "failed"
                            ? "bg-red-100 text-red-600"
                            : "bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400"
                      }`}
                    >
                      {passwordOperationStatus === "success" ? (
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : passwordOperationStatus === "failed" ? (
                        <svg
                          className="w-8 h-8"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      ) : (
                        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin dark:border-primary-400"></div>
                      )}
                    </div>
                    <p
                      className={`text-sm font-medium ${
                        passwordOperationStatus === "success"
                          ? "text-green-600"
                          : passwordOperationStatus === "failed"
                            ? "text-red-600"
                            : "text-secondary-600 dark:text-secondary-300"
                      }`}
                    >
                      {passwordOperationMessage}
                    </p>
                    {passwordOperationStatus === "success" && (
                      <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-2">
                        请妥善保管此密码
                      </p>
                    )}
                  </div>
                )}

                {/* 输入表单 */}
                {passwordOperationStatus === "idle" && (
                  <div className="space-y-4">
                    {/* 密码名称 */}
                    <div>
                      <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase">
                        密码名称
                      </label>
                      <input
                        type="text"
                        value={tempPasswordName}
                        onChange={(e) => setTempPasswordName(e.target.value)}
                        className="w-full mt-1 p-3 bg-secondary-50 dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:outline-none focus:border-primary-500 dark:border-primary-400"
                        placeholder="例如：访客密码、临时工密码"
                      />
                    </div>

                    {/* 密码类型 */}
                    <div>
                      <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase">
                        密码类型
                      </label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(
                          [
                            "one_time",
                            "time_limited",
                            "count_limited",
                          ] as TempPasswordType[]
                        ).map((type) => (
                          <button
                            key={type}
                            onClick={() => setTempPasswordType(type)}
                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              tempPasswordType === type
                                ? "bg-primary-600 dark:bg-primary-500 text-white"
                                : "bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700"
                            }`}
                          >
                            {tempPasswordTypeMap[type]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 限时密码 - 有效期设置 */}
                    {tempPasswordType === "time_limited" && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase">
                            开始时间
                          </label>
                          <input
                            type="datetime-local"
                            value={tempPasswordValidFrom}
                            onChange={(e) =>
                              setTempPasswordValidFrom(e.target.value)
                            }
                            className="w-full mt-1 p-3 bg-secondary-50 dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:outline-none focus:border-primary-500 dark:border-primary-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase">
                            结束时间
                          </label>
                          <input
                            type="datetime-local"
                            value={tempPasswordValidUntil}
                            onChange={(e) =>
                              setTempPasswordValidUntil(e.target.value)
                            }
                            className="w-full mt-1 p-3 bg-secondary-50 dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:outline-none focus:border-primary-500 dark:border-primary-400"
                          />
                        </div>
                      </div>
                    )}

                    {/* 限次密码 - 使用次数设置 */}
                    {tempPasswordType === "count_limited" && (
                      <div>
                        <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase">
                          最大使用次数
                        </label>
                        <input
                          type="number"
                          value={tempPasswordMaxUses}
                          onChange={(e) =>
                            setTempPasswordMaxUses(
                              parseInt(e.target.value) || 1,
                            )
                          }
                          min={1}
                          max={100}
                          className="w-full mt-1 p-3 bg-secondary-50 dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-lg focus:outline-none focus:border-primary-500 dark:border-primary-400"
                        />
                      </div>
                    )}

                    {/* 类型说明 */}
                    <div className="text-xs text-secondary-400 dark:text-secondary-500 bg-secondary-50 dark:bg-secondary-900 p-3 rounded-lg">
                      {tempPasswordType === "one_time" &&
                        "一次性密码：使用一次后自动失效，有效期24小时"}
                      {tempPasswordType === "time_limited" &&
                        "限时密码：在指定时间段内可无限次使用"}
                      {tempPasswordType === "count_limited" &&
                        "限次密码：可使用指定次数，有效期7天"}
                    </div>
                  </div>
                )}

                {/* 按钮区域 */}
                <div className="flex space-x-3">
                  {passwordOperationStatus === "idle" && (
                    <>
                      <button
                        onClick={handleCancelCreateTempPassword}
                        className="flex-1 py-3 bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 rounded-xl font-medium hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleCreateTempPassword}
                        className="flex-1 py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                      >
                        创建密码
                      </button>
                    </>
                  )}

                  {passwordOperationStatus === "processing" && (
                    <button
                      disabled
                      className="w-full py-3 bg-secondary-100 dark:bg-secondary-800 text-secondary-400 dark:text-secondary-500 rounded-xl font-medium cursor-not-allowed"
                    >
                      处理中...
                    </button>
                  )}

                  {(passwordOperationStatus === "success" ||
                    passwordOperationStatus === "failed") && (
                    <button
                      onClick={handleCancelCreateTempPassword}
                      className="w-full py-3 bg-primary-600 dark:bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-700 dark:hover:bg-primary-600 transition-colors"
                    >
                      完成
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    // 其他子页面占位
    return (
      <div className="flex flex-col h-full">
        {/* 子页面头部 */}
        <div className="flex items-center space-x-3 mb-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-secondary-100 dark:bg-secondary-800 rounded-lg transition-colors"
          >
            <ChevronLeft
              size={24}
              className="text-secondary-600 dark:text-secondary-300"
            />
          </button>
          <h2 className="text-lg font-bold text-secondary-900 dark:text-secondary-50">
            {subScreenTitles[subScreen]}
          </h2>
        </div>

        {/* 子页面内容占位 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-secondary-400 dark:text-secondary-500">
            <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">功能开发中...</p>
            <p className="text-xs mt-1">{subScreenTitles[subScreen]}</p>
          </div>
        </div>
      </div>
    );
  };

  // 如果有子页面，渲染子页面
  if (subScreen) {
    return (
      <div className="flex flex-col h-full pb-24 overflow-y-auto scrollbar-hide">
        {renderSubScreen()}
      </div>
    );
  }

  // 主设置页面
  return (
    <div className="h-full overflow-y-auto pb-24">
      <div className="space-y-4">
        {/* 连接配置卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div className="flex items-center space-x-2 p-4 border-b border-secondary-200 dark:border-secondary-700 text-primary-600 dark:text-primary-400">
            <Wifi size={20} />
            <h3 className="font-bold">连接配置</h3>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase">
                服务器地址 (WebSocket)
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isConnected}
                className="w-full mt-1 p-3 bg-secondary-50 dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm font-mono focus:outline-none focus:border-primary-500 dark:border-primary-400 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                💡 Android 设备请使用电脑局域网
                IP，例如：ws://192.168.1.100:8000/ws/app
              </p>
            </div>
            <div>
              <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase">
                设备 ID
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                disabled={isConnected}
                className="w-full mt-1 p-3 bg-secondary-50 dark:bg-secondary-900 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm font-mono focus:border-primary-500 dark:border-primary-400 focus:outline-none disabled:opacity-50"
              />
            </div>

            <button
              onClick={handleConnect}
              className={`w-full py-3 rounded-xl font-bold text-white shadow-md transition-all ${
                isConnected
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-primary-600 dark:bg-primary-500 hover:bg-primary-700 dark:hover:bg-primary-600"
              }`}
            >
              {isConnected ? "断开连接" : "连接服务器"}
            </button>
          </div>
        </div>

        {/* 用户管理分组 */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <SectionTitle title="用户管理" />
          <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
            <MenuItem
              icon={<User size={20} />}
              title="人脸管理"
              description="管理授权人员的人脸信息"
              onClick={() => handleNavigate("face-management")}
            />
            <MenuItem
              icon={<FingerprintIcon size={20} />}
              title="指纹管理"
              description="管理授权人员的指纹信息"
              onClick={() => handleNavigate("fingerprint-management")}
            />
            <MenuItem
              icon={<CreditCard size={20} />}
              title="NFC 卡片管理"
              description="管理授权的 NFC 卡片"
              onClick={() => handleNavigate("nfc-management")}
            />
            <MenuItem
              icon={<KeyRound size={20} />}
              title="密码管理"
              description="管理开锁密码"
              onClick={() => handleNavigate("password-management")}
            />
          </div>
        </div>

        {/* 历史记录分组 */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <SectionTitle title="历史记录" />
          <div className="divide-y divide-secondary-100 dark:divide-secondary-800">
            <MenuItem
              icon={<KeyRound size={20} />}
              title="开锁记录"
              description="查看历史开锁记录"
              onClick={() => handleNavigate("unlock-logs")}
            />
            <MenuItem
              icon={<AlertCircle size={20} />}
              title="事件记录"
              description="查看设备事件记录"
              onClick={() => handleNavigate("event-logs")}
            />
            <MenuItem
              icon={<Users size={20} />}
              title="到访记录"
              description="查看访客到访记录"
              onClick={() => handleNavigate("visit-records")}
            />
          </div>
        </div>

        {/* 存储管理分组 (需求 14.10) */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <SectionTitle title="存储管理" />
          <div className="p-4 space-y-4">
            {/* 视频缓存 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg text-secondary-600 dark:text-secondary-300">
                    <HardDrive size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900 dark:text-secondary-50">
                      视频缓存
                    </div>
                    <div className="text-xs text-secondary-500 dark:text-secondary-400">
                      {storageStats ? (
                        <>
                          已用 {formatFileSize(storageStats.usedBytes)} /{" "}
                          {formatFileSize(storageStats.maxBytes)}
                          <span className="ml-2">
                            ({storageStats.fileCount} 个文件)
                          </span>
                        </>
                      ) : (
                        "加载中..."
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClearAllVideos}
                  disabled={!storageStats || storageStats.fileCount === 0}
                  className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  清空视频
                </button>
              </div>

              {/* 存储使用进度条 */}
              {storageStats && (
                <div className="mt-2">
                  <div className="w-full bg-secondary-200 dark:bg-secondary-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        storageStats.usedBytes / storageStats.maxBytes > 0.8
                          ? "bg-red-500"
                          : storageStats.usedBytes / storageStats.maxBytes > 0.5
                            ? "bg-yellow-500"
                            : "bg-primary-600 dark:bg-primary-500"
                      }`}
                      style={{
                        width: `${Math.min((storageStats.usedBytes / storageStats.maxBytes) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-secondary-400 dark:text-secondary-500 mt-1">
                    <span>
                      {Math.round(
                        (storageStats.usedBytes / storageStats.maxBytes) * 100,
                      )}
                      % 已使用
                    </span>
                    <span>
                      剩余{" "}
                      {formatFileSize(
                        storageStats.maxBytes - storageStats.usedBytes,
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 数据缓存 (任务 9.4) */}
            <div className="pt-4 border-t border-secondary-200 dark:border-secondary-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg text-secondary-600 dark:text-secondary-300">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <div className="font-medium text-secondary-900 dark:text-secondary-50">
                      数据缓存
                    </div>
                    <div className="text-xs text-secondary-500 dark:text-secondary-400">
                      清空开锁记录、事件记录等缓存数据
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClearCache}
                  className="px-3 py-1.5 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
                >
                  清空缓存
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 外观设置分组 (任务 2.3) */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <SectionTitle title="外观设置" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-secondary-100 dark:bg-secondary-800 rounded-lg text-secondary-600 dark:text-secondary-300">
                  {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
                </div>
                <div>
                  <div className="font-medium text-secondary-900 dark:text-secondary-50">
                    主题模式
                  </div>
                  <div className="text-xs text-secondary-500 dark:text-secondary-400">
                    当前: {theme === "dark" ? "深色模式" : "浅色模式"}
                  </div>
                </div>
              </div>
              <button
                onClick={onToggleTheme}
                disabled={!onToggleTheme}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  theme === "dark" ? "bg-primary-600" : "bg-secondary-300 dark:bg-secondary-600"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
                    theme === "dark" ? "translate-x-7" : "translate-x-1"
                  }`}
                >
                  {theme === "dark" ? (
                    <Moon size={14} className="m-1 text-primary-600" />
                  ) : (
                    <Sun
                      size={14}
                      className="m-1 text-secondary-600 dark:text-secondary-300"
                    />
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 系统日志卡片 */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 overflow-hidden">
          <div
            className="flex items-center justify-between p-4 border-b border-secondary-200
                          dark:border-secondary-700"
          >
            <div className="flex items-center space-x-2 text-secondary-600 dark:text-secondary-300">
              <Terminal size={20} />
              <h3 className="font-bold">系统日志</h3>
            </div>
            <button
              onClick={onClearLogs}
              className="p-1.5 text-secondary-400 hover:text-secondary-600 hover:bg-secondary-50 rounded-lg
                         dark:text-secondary-500 dark:hover:text-secondary-300 dark:hover:bg-secondary-800"
              title="清空日志"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div
            className="bg-secondary-900 m-4 rounded-lg p-3 font-mono text-xs space-y-1 h-48 overflow-y-auto
                          dark:bg-secondary-950"
          >
            {logs.length === 0 && (
              <span className="text-secondary-600 dark:text-secondary-500">
                暂无日志...
              </span>
            )}
            {logs.map((log) => (
              <div key={log.id} className="break-all">
                <span className="text-secondary-500 dark:text-secondary-400">
                  [{log.timestamp}]
                </span>{" "}
                <span
                  className={`${
                    log.type === "error"
                      ? "text-error-400 dark:text-error-300"
                      : log.type === "success"
                        ? "text-success-400 dark:text-success-300"
                        : log.type === "warning"
                          ? "text-warning-300 dark:text-warning-200"
                          : "text-info-300 dark:text-info-200"
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-secondary-400 py-4 dark:text-secondary-500">
          版本 2.0.2 &bull; 本地部署版
        </div>
      </div>

      {/* 人脸权限编辑弹窗 */}
      {showPermissionModal && editingPerson && (
        <div className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 dark:bg-secondary-950/70">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-secondary-900 dark:text-secondary-50 mb-4">
              编辑权限 - {editingPerson.name}
            </h3>

            {/* 权限类型选择 */}
            <div className="mb-4">
              <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase mb-2 block">
                权限类型
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "permanent", label: "永久" },
                  { value: "temporary", label: "临时" },
                  { value: "count_limited", label: "限次" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setPermissionType(opt.value as typeof permissionType)
                    }
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      permissionType === opt.value
                        ? "bg-primary-600 dark:bg-primary-500 text-white"
                        : "bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-200 dark:hover:bg-secondary-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 每日时间段 */}
            <div className="mb-4">
              <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase mb-2 block">
                每日允许时段
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="time"
                  value={permissionTimeStart}
                  onChange={(e) => setPermissionTimeStart(e.target.value)}
                  className="flex-1 p-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-secondary-400 dark:text-secondary-500">
                  至
                </span>
                <input
                  type="time"
                  value={permissionTimeEnd}
                  onChange={(e) => setPermissionTimeEnd(e.target.value)}
                  className="flex-1 p-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* 临时权限 - 有效期 */}
            {permissionType === "temporary" && (
              <div className="mb-4">
                <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase mb-2 block">
                  有效期
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={permissionValidFrom}
                    onChange={(e) => setPermissionValidFrom(e.target.value)}
                    className="flex-1 p-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-secondary-400 dark:text-secondary-500">
                    至
                  </span>
                  <input
                    type="date"
                    value={permissionValidUntil}
                    onChange={(e) => setPermissionValidUntil(e.target.value)}
                    className="flex-1 p-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}

            {/* 限次权限 - 剩余次数 */}
            {permissionType === "count_limited" && (
              <div className="mb-4">
                <label className="text-xs font-bold text-secondary-500 dark:text-secondary-400 uppercase mb-2 block">
                  剩余次数
                </label>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={permissionRemainingCount}
                  onChange={(e) =>
                    setPermissionRemainingCount(parseInt(e.target.value) || 1)
                  }
                  className="w-full p-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setEditingPerson(null);
                }}
                disabled={permissionSaving}
                className="flex-1 py-3 px-4 border border-secondary-300 dark:border-secondary-600 rounded-xl text-secondary-600 dark:text-secondary-300 font-medium hover:bg-secondary-50 dark:bg-secondary-900 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleSavePermission}
                disabled={permissionSaving}
                className="flex-1 py-3 px-4 bg-primary-600 dark:bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-700 dark:hover:bg-primary-600 disabled:opacity-50"
              >
                {permissionSaving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
