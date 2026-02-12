import React, { useEffect, useRef } from "react";
import {
  Play,
  Square,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Eye,
  WifiOff,
  Maximize,
  Minimize,
} from "lucide-react";
import { Stats, ConnectionStatus, DeviceStatus } from "../types";
import { deviceService } from "../services/DeviceService";

interface Props {
  status: ConnectionStatus;
  deviceStatus: DeviceStatus | null;
  videoSrc: string | null;
  stats: Stats;
  isTalking: boolean;
  onToggleTalk: () => void;
}

export const MonitorScreen: React.FC<Props> = ({
  status,
  deviceStatus,
  videoSrc,
  stats,
  isTalking,
  onToggleTalk,
}) => {
  const [isMuted, setIsMuted] = React.useState(false);
  const [volume, setVolume] = React.useState(80);
  const [isMonitoring, setIsMonitoring] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [voiceChangerEnabled, setVoiceChangerEnabled] = React.useState(true); // 默认开启变声
  const scrollRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  const isConnected = status === "connected";
  // 设备离线判断：WebSocket 未连接 或 设备状态为离线
  const isDeviceOffline =
    !isConnected || (deviceStatus !== null && !deviceStatus.online);
  // 操作可用判断：WebSocket 已连接 且 设备在线
  const isOperationEnabled =
    isConnected && (deviceStatus === null || deviceStatus.online);

  // 音量变更副作用
  useEffect(() => {
    deviceService.setVolume(isMuted ? 0 : volume / 100);
  }, [volume, isMuted]);

  const handleStartMonitor = () => {
    // 重要：用户交互时唤醒音频上下文
    deviceService.resumeAudio();
    deviceService.sendCommand({ type: "system", command: "start_monitor" });
    setIsMonitoring(true);
  };

  const handleStopMonitor = () => {
    deviceService.sendCommand({ type: "system", command: "stop_monitor" });
    setIsMonitoring(false);
  };

  // 监听视频流状态，自动更新监控状态
  React.useEffect(() => {
    if (videoSrc) {
      setIsMonitoring(true);
    } else if (!isConnected) {
      setIsMonitoring(false);
    }
  }, [videoSrc, isConnected]);

  // 全屏状态监听
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // 全屏切换函数
  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await videoContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("全屏切换失败:", err);
    }
  };

  // 变声开关切换
  const toggleVoiceChanger = () => {
    const newState = !voiceChangerEnabled;
    setVoiceChangerEnabled(newState);
    deviceService.setVoiceChanger(newState);
  };

  return (
    <div
      className="flex flex-col h-full space-y-4 bg-secondary-50 dark:bg-secondary-950"
      ref={scrollRef}
    >
      {/* Video Area */}
      <div
        ref={videoContainerRef}
        className="relative w-full aspect-video bg-secondary-950 rounded-2xl overflow-hidden shadow-lg border border-secondary-800"
      >
        {/* 设备离线占位状态 */}
        {isDeviceOffline ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-secondary-950">
            <div className="p-4 bg-secondary-900 rounded-full mb-4">
              <WifiOff size={48} className="text-secondary-500" />
            </div>
            <span className="text-lg font-semibold text-secondary-300">
              设备离线
            </span>
            <span className="text-sm text-secondary-400 mt-2">
              请检查设备网络连接
            </span>
          </div>
        ) : videoSrc ? (
          <img
            src={videoSrc}
            alt="Live Stream"
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-secondary-400">
            <Eye size={48} className="mb-2 opacity-50" />
            <span className="text-sm font-medium">等待视频信号...</span>
          </div>
        )}

        {/* Live Indicator - 仅在设备在线且有视频时显示 */}
        {!isDeviceOffline && videoSrc && (
          <div className="absolute top-3 left-3 flex items-center bg-secondary-900/80 backdrop-blur-sm px-2 py-1 rounded-md">
            <div className="w-2 h-2 rounded-full bg-error-500 animate-pulse mr-2"></div>
            <span className="text-secondary-100 text-xs font-bold tracking-wider">
              直播
            </span>
          </div>
        )}

        {/* Stats Overlay - 仅在设备在线时显示 */}
        {!isDeviceOffline && (
          <div className="absolute top-3 right-3 flex flex-col items-end pointer-events-none">
            <span className="text-success-400 text-xs font-mono bg-secondary-900/80 backdrop-blur-sm px-2 py-1 rounded mb-1">
              {stats.videoFps} FPS
            </span>
            <span className="text-secondary-100 text-[10px] font-mono bg-secondary-900/80 backdrop-blur-sm px-2 py-1 rounded mb-1">
              {(stats.dataReceived / 1024).toFixed(1)} KB
            </span>
            {stats.audioPackets > 0 && (
              <span className="text-info-400 text-[10px] font-mono bg-secondary-900/80 backdrop-blur-sm px-2 py-1 rounded">
                Audio OK
              </span>
            )}
          </div>
        )}

        {/* Fullscreen Button - 仅在设备在线且有视频时显示 */}
        {!isDeviceOffline && videoSrc && (
          <button
            onClick={toggleFullscreen}
            className="absolute bottom-3 right-3 p-2 bg-secondary-900/80 backdrop-blur-sm rounded-lg hover:bg-secondary-800/90 transition-colors pointer-events-auto"
            title={isFullscreen ? "退出全屏" : "全屏显示"}
          >
            {isFullscreen ? (
              <Minimize size={20} className="text-secondary-100" />
            ) : (
              <Maximize size={20} className="text-secondary-100" />
            )}
          </button>
        )}
      </div>

      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleStartMonitor}
          disabled={!isOperationEnabled || isMonitoring}
          className={`flex items-center justify-center space-x-2 py-4 rounded-xl shadow-md transition-all font-semibold ${
            isMonitoring && isOperationEnabled
              ? "bg-secondary-200 text-secondary-400 cursor-not-allowed dark:bg-secondary-800 dark:text-secondary-600"
              : !isOperationEnabled
                ? "bg-secondary-200 text-secondary-400 cursor-not-allowed dark:bg-secondary-800 dark:text-secondary-600"
                : "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-500"
          }`}
        >
          <Play size={20} fill="currentColor" />
          <span>开启监控</span>
        </button>
        <button
          onClick={handleStopMonitor}
          disabled={!isOperationEnabled || !isMonitoring}
          className={`flex items-center justify-center space-x-2 py-4 rounded-xl shadow-sm transition-all font-semibold ${
            !isMonitoring || !isOperationEnabled
              ? "bg-white border border-secondary-200 text-secondary-400 opacity-50 cursor-not-allowed dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-600"
              : "bg-error-500 text-white border-0 hover:bg-error-600 active:bg-error-700 dark:bg-error-600 dark:hover:bg-error-500"
          }`}
        >
          <Square size={20} fill="currentColor" />
          <span>停止</span>
        </button>
      </div>

      {/* Intercom & Audio */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-secondary-100 dark:bg-secondary-900 dark:border-secondary-700">
        <h3 className="text-sm font-bold text-secondary-400 dark:text-secondary-500 uppercase tracking-wider mb-4">
          音画对讲
        </h3>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onToggleTalk}
            disabled={!isOperationEnabled}
            className={`
              flex flex-col items-center justify-center w-24 h-24 rounded-full transition-all duration-300 shadow-lg border-4
              ${
                isTalking
                  ? "bg-info-600 border-info-300 text-white scale-105 animate-pulse ring-4 ring-info-300 dark:bg-info-500 dark:border-info-200 dark:ring-info-800"
                  : "bg-white border-secondary-200 text-secondary-600 hover:border-info-200 hover:bg-info-50 active:bg-info-100 disabled:opacity-50 dark:bg-secondary-800 dark:border-secondary-600 dark:text-secondary-300 dark:hover:border-info-400 dark:hover:bg-secondary-700"
              }
            `}
          >
            {isTalking ? <MicOff size={32} /> : <Mic size={32} />}
            <span className="text-xs font-medium mt-2">
              {isTalking ? "结束对讲" : "按住对讲"}
            </span>
          </button>

          <div className="flex-1 ml-6 space-y-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className={`p-2 rounded-lg transition-colors ${isMuted ? "bg-error-50 text-error-500 dark:bg-error-950 dark:text-error-400" : "bg-secondary-100 text-secondary-600 dark:bg-secondary-800 dark:text-secondary-300"}`}
              >
                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-2 bg-secondary-200 dark:bg-secondary-700 rounded-lg appearance-none cursor-pointer accent-primary-500 dark:accent-primary-400"
              />
              <span className="text-xs text-secondary-500 dark:text-secondary-400 w-8 text-right">
                {volume}%
              </span>
            </div>
            <p className="text-xs text-secondary-400 dark:text-secondary-500 leading-relaxed">
              <span className="font-bold text-primary-500 dark:text-primary-400">
                注意:
              </span>{" "}
              浏览器要求 HTTPS
              环境才能使用麦克风。若无声音，请点击"开启监控"激活音频。
            </p>
          </div>
        </div>

        {/* 变声功能开关 */}
        <div className="pt-4 border-t border-secondary-100 dark:border-secondary-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-secondary-700 dark:text-secondary-300">
                变声模式
              </span>
              <span className="text-xs text-secondary-400 dark:text-secondary-500">
                (大叔音色，增强安全感)
              </span>
            </div>
            <button
              onClick={toggleVoiceChanger}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${voiceChangerEnabled ? "bg-primary-500 dark:bg-primary-600" : "bg-secondary-300 dark:bg-secondary-600"}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${voiceChangerEnabled ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </div>
          <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-2">
            {voiceChangerEnabled
              ? "已开启：您的声音将变为低沉的男声"
              : "已关闭：使用原始声音"}
          </p>
        </div>
      </div>

      {/* Footer spacer for nav */}
      <div className="h-24"></div>
    </div>
  );
};
