import React, { useState } from "react";
import {
  Battery,
  Wifi,
  WifiOff,
  Unlock,
  Lock,
  Key,
  Lightbulb,
  Bell,
  ChevronRight,
  User,
  Clock,
} from "lucide-react";
import {
  ConnectionStatus,
  DeviceStatus,
  Activity,
  VisitorIntent,
  PackageAlert,
} from "../types";
import { deviceService } from "../services/DeviceService";
import VisitorIntentCard from "../components/VisitorIntentCard";
import PackageAlertCard from "../components/PackageAlertCard";

interface HomeScreenProps {
  status: ConnectionStatus;
  deviceStatus: DeviceStatus | null;
  recentActivities: Activity[];
  lastStatusUpdate?: number | null; // 上次状态更新时间戳
  visitorIntents: VisitorIntent[]; // 访客意图记录
  packageAlerts: PackageAlert[]; // 快递警报记录
  onUnlock: () => void;
  onLock: () => void;
  onViewAllActivities?: () => void;
  onViewIntentDetail: (intent: VisitorIntent) => void; // 查看访客意图详情
  onViewAllAlerts: () => void; // 查看全部快递警报
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  status,
  deviceStatus,
  recentActivities,
  lastStatusUpdate,
  visitorIntents,
  packageAlerts,
  onUnlock,
  onLock,
  onViewAllActivities,
  onViewIntentDetail,
  onViewAllAlerts,
}) => {
  // 临时密码弹窗状态
  const [showTempCodeModal, setShowTempCodeModal] = useState(false);
  const [tempCode, setTempCode] = useState("");
  const [tempCodeExpires, setTempCodeExpires] = useState(3600); // 默认1小时

  const isConnected = status === "connected";
  const isOnline = deviceStatus?.online ?? false;
  const canOperate = isConnected && isOnline;

  // 锁状态文本映射
  const lockStateText = deviceStatus?.lockState === 1 ? "已开启" : "已锁定";

  // 电量图标颜色
  const getBatteryColor = (battery: number) => {
    if (battery <= 20) return "text-red-500";
    if (battery <= 50) return "text-yellow-500";
    return "text-green-500";
  };

  // 生成6位随机临时密码
  const generateTempCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setTempCode(code);
  };

  // 发送临时密码命令
  const handleSendTempCode = () => {
    if (!tempCode) return;
    deviceService.sendCommand({
      type: "lock_control",
      command: "temp_code",
      code: tempCode,
      expires: tempCodeExpires,
    });
    setShowTempCodeModal(false);
    setTempCode("");
  };

  // 补光灯控制
  const handleLightControl = () => {
    const action = deviceStatus?.lightState === 1 ? "off" : "on";
    deviceService.sendCommand({
      type: "dev_control",
      target: "light",
      action,
    });
  };

  // 门铃测试
  const handleDoorbellTest = () => {
    deviceService.sendCommand({
      type: "dev_control",
      target: "beep",
      count: 1,
      mode: "short",
    });
  };

  // 格式化时间戳
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`;
    return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  // 获取动态图标
  const getActivityIcon = (type: Activity["type"]) => {
    switch (type) {
      case "visit":
        return User;
      case "unlock":
        return Unlock;
      case "event":
        return Bell;
      default:
        return Clock;
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-24">
      {/* 顶部设备状态区域 */}
      <div
        className="bg-white border border-secondary-200 rounded-2xl p-4 mb-4 shadow-sm
                      dark:bg-secondary-900 dark:border-secondary-700"
      >
        <div className="flex items-center justify-between">
          {/* 连接状态 */}
          <div className="flex items-center space-x-2">
            {isConnected ? (
              isOnline ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-success-500 dark:bg-success-400"></div>
                  <span className="text-sm font-medium text-success-600 dark:text-success-400">
                    设备在线
                  </span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-error-500 dark:bg-error-400"></div>
                  <span className="text-sm font-medium text-error-600 dark:text-error-400">
                    设备离线
                  </span>
                </>
              )
            ) : (
              <>
                <div className="w-3 h-3 rounded-full bg-warning-500 animate-pulse dark:bg-warning-400"></div>
                <span className="text-sm font-medium text-warning-600 dark:text-warning-400">
                  连接中...
                </span>
              </>
            )}
          </div>

          {/* 电量显示 */}
          {deviceStatus && (
            <div className="flex items-center space-x-1">
              <Battery
                className={`w-5 h-5 ${getBatteryColor(deviceStatus.battery)}`}
              />
              <span
                className={`text-sm font-medium ${getBatteryColor(deviceStatus.battery)}`}
              >
                {deviceStatus.battery}%
              </span>
            </div>
          )}
        </div>
        {/* 离线时显示上次更新时间 */}
        {deviceStatus && !isOnline && lastStatusUpdate && (
          <div className="mt-2 text-xs text-secondary-400 text-center dark:text-secondary-500">
            上次更新: {new Date(lastStatusUpdate).toLocaleString("zh-CN")}
          </div>
        )}
      </div>

      {/* 核心开锁按钮区域 */}
      <div
        className="bg-white border border-secondary-200 rounded-2xl p-6 mb-4 shadow-sm
                      dark:bg-secondary-900 dark:border-secondary-700"
      >
        <div className="flex flex-col items-center">
          {/* 锁状态图标和按钮 */}
          <button
            onClick={deviceStatus?.lockState === 1 ? onLock : onUnlock}
            disabled={!canOperate}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 ${
              canOperate
                ? deviceStatus?.lockState === 1
                  ? "bg-success-100 hover:bg-success-200 active:scale-95 dark:bg-success-950 dark:hover:bg-success-900"
                  : "bg-primary-100 hover:bg-primary-200 active:scale-95 dark:bg-primary-950 dark:hover:bg-primary-900"
                : "bg-secondary-100 cursor-not-allowed dark:bg-secondary-800"
            }`}
          >
            {deviceStatus?.lockState === 1 ? (
              <Unlock
                className={`w-16 h-16 ${canOperate ? "text-success-600 dark:text-success-400" : "text-secondary-400 dark:text-secondary-600"}`}
              />
            ) : (
              <Lock
                className={`w-16 h-16 ${canOperate ? "text-primary-600 dark:text-primary-400" : "text-secondary-400 dark:text-secondary-600"}`}
              />
            )}
          </button>

          {/* 锁状态文本 */}
          <p
            className={`mt-4 text-lg font-semibold ${
              canOperate
                ? deviceStatus?.lockState === 1
                  ? "text-success-600 dark:text-success-400"
                  : "text-secondary-600 dark:text-secondary-300"
                : "text-secondary-400 dark:text-secondary-600"
            }`}
          >
            {canOperate ? lockStateText : "设备离线"}
          </p>

          {/* 操作提示 */}
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            {canOperate
              ? deviceStatus?.lockState === 1
                ? "点击关锁"
                : "点击开锁"
              : "请先连接设备"}
          </p>
        </div>
      </div>

      {/* 快捷功能区 */}
      <div
        className="bg-white border border-secondary-200 rounded-2xl p-4 mb-4 shadow-sm
                      dark:bg-secondary-900 dark:border-secondary-700"
      >
        <h3 className="text-sm font-semibold text-secondary-700 mb-3 dark:text-secondary-50">
          快捷功能
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {/* 临时密码 */}
          <button
            onClick={() => {
              generateTempCode();
              setShowTempCodeModal(true);
            }}
            disabled={!canOperate}
            className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
              canOperate
                ? "bg-warning-50 hover:bg-warning-100 active:bg-warning-200 dark:bg-warning-950 dark:hover:bg-warning-900"
                : "bg-secondary-50 cursor-not-allowed dark:bg-secondary-800"
            }`}
          >
            <Key
              className={`w-6 h-6 ${canOperate ? "text-warning-600 dark:text-warning-400" : "text-secondary-400 dark:text-secondary-600"}`}
            />
            <span
              className={`text-xs mt-2 font-medium ${canOperate ? "text-warning-700 dark:text-warning-300" : "text-secondary-400 dark:text-secondary-600"}`}
            >
              临时密码
            </span>
          </button>

          {/* 补光灯 */}
          <button
            onClick={handleLightControl}
            disabled={!canOperate}
            className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
              canOperate
                ? deviceStatus?.lightState === 1
                  ? "bg-warning-100 hover:bg-warning-200 dark:bg-warning-900 dark:hover:bg-warning-800"
                  : "bg-secondary-50 hover:bg-secondary-100 dark:bg-secondary-800 dark:hover:bg-secondary-700"
                : "bg-secondary-50 cursor-not-allowed dark:bg-secondary-800"
            }`}
          >
            <Lightbulb
              className={`w-6 h-6 ${
                canOperate
                  ? deviceStatus?.lightState === 1
                    ? "text-warning-500 dark:text-warning-400"
                    : "text-secondary-500 dark:text-secondary-400"
                  : "text-secondary-400 dark:text-secondary-600"
              }`}
            />
            <span
              className={`text-xs mt-2 font-medium ${canOperate ? "text-secondary-700 dark:text-secondary-300" : "text-secondary-400 dark:text-secondary-600"}`}
            >
              补光灯
            </span>
          </button>

          {/* 门铃测试 */}
          <button
            onClick={handleDoorbellTest}
            disabled={!canOperate}
            className={`flex flex-col items-center p-3 rounded-xl transition-colors ${
              canOperate
                ? "bg-info-50 hover:bg-info-100 active:bg-info-200 dark:bg-info-950 dark:hover:bg-info-900"
                : "bg-secondary-50 cursor-not-allowed dark:bg-secondary-800"
            }`}
          >
            <Bell
              className={`w-6 h-6 ${canOperate ? "text-info-600 dark:text-info-400" : "text-secondary-400 dark:text-secondary-600"}`}
            />
            <span
              className={`text-xs mt-2 font-medium ${canOperate ? "text-info-700 dark:text-info-300" : "text-secondary-400 dark:text-secondary-600"}`}
            >
              门铃测试
            </span>
          </button>
        </div>
      </div>

      {/* 最近动态列表 */}
      <div
        className="bg-white border border-secondary-200 rounded-2xl p-4 shadow-sm mb-4
                      dark:bg-secondary-900 dark:border-secondary-700"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-secondary-700 dark:text-secondary-50">
            最近动态
          </h3>
          {recentActivities.length > 0 && onViewAllActivities && (
            <button
              onClick={onViewAllActivities}
              className="flex items-center text-xs text-primary-600 hover:text-primary-700 
                         dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
            >
              查看全部
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {recentActivities.length === 0 ? (
          <div className="py-8 text-center text-secondary-400 dark:text-secondary-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无动态记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivities.slice(0, 3).map((activity) => {
              const IconComponent = getActivityIcon(activity.type);
              const isUnlock = activity.type === "unlock";
              const isVisit = activity.type === "visit";

              return (
                <div
                  key={activity.id}
                  className={`flex items-center p-3 rounded-xl transition-colors ${
                    isUnlock
                      ? "bg-success-50 hover:bg-success-100 dark:bg-success-950 dark:hover:bg-success-900"
                      : isVisit
                        ? "bg-error-50 hover:bg-error-100 dark:bg-error-950 dark:hover:bg-error-900"
                        : "bg-secondary-50 hover:bg-secondary-100 dark:bg-secondary-800 dark:hover:bg-secondary-700"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isUnlock
                        ? "bg-success-100 dark:bg-success-900"
                        : isVisit
                          ? "bg-error-100 dark:bg-error-900"
                          : "bg-info-100 dark:bg-info-900"
                    }`}
                  >
                    <IconComponent
                      className={`w-5 h-5 ${
                        isUnlock
                          ? "text-success-600 dark:text-success-400"
                          : isVisit
                            ? "text-error-600 dark:text-error-400"
                            : "text-info-600 dark:text-info-400"
                      }`}
                    />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-secondary-800 truncate dark:text-secondary-50">
                      {activity.title}
                    </p>
                    <p className="text-xs text-secondary-500 truncate dark:text-secondary-400">
                      {activity.description}
                    </p>
                  </div>
                  <span className="text-xs text-secondary-400 ml-2 whitespace-nowrap dark:text-secondary-500">
                    {formatTimestamp(activity.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 访客意图卡片 */}
      <div className="mb-4">
        <VisitorIntentCard
          intents={visitorIntents}
          onViewDetail={onViewIntentDetail}
        />
      </div>

      {/* 快递警报卡片 */}
      <div className="mb-4">
        <PackageAlertCard alerts={packageAlerts} onViewAll={onViewAllAlerts} />
      </div>

      {/* 临时密码弹窗 */}
      {showTempCodeModal && (
        <div
          className="fixed inset-0 bg-secondary-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4
                        dark:bg-secondary-950/70"
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl
                          dark:bg-secondary-800"
          >
            <h3 className="text-lg font-semibold text-secondary-800 mb-4 dark:text-secondary-50">
              生成临时密码
            </h3>

            {/* 密码显示 */}
            <div
              className="bg-secondary-100 rounded-xl p-4 mb-4 text-center
                            dark:bg-secondary-900"
            >
              <p
                className="text-3xl font-mono font-bold text-primary-600 tracking-widest
                            dark:text-primary-400"
              >
                {tempCode}
              </p>
            </div>

            {/* 有效期选择 */}
            <div className="mb-4">
              <label className="text-sm font-medium text-secondary-700 mb-2 block dark:text-secondary-300">
                有效期
              </label>
              <select
                value={tempCodeExpires}
                onChange={(e) => setTempCodeExpires(Number(e.target.value))}
                className="w-full p-3 border border-secondary-300 rounded-xl text-sm 
                           bg-white text-secondary-900
                           focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-50
                           dark:focus:ring-primary-400"
              >
                <option value={1800}>30分钟</option>
                <option value={3600}>1小时</option>
                <option value={7200}>2小时</option>
                <option value={86400}>24小时</option>
              </select>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowTempCodeModal(false)}
                className="flex-1 py-3 px-4 border border-secondary-200 rounded-xl 
                           text-secondary-600 font-medium hover:bg-secondary-50 transition-colors
                           dark:border-secondary-600 dark:text-secondary-300 dark:hover:bg-secondary-700"
              >
                取消
              </button>
              <button
                onClick={handleSendTempCode}
                className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-xl font-medium 
                           hover:bg-primary-700 transition-colors
                           dark:bg-primary-600 dark:hover:bg-primary-500"
              >
                发送到设备
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
