import { useState } from "react";
import { ArrowLeft, Filter } from "lucide-react";
import type { PackageAlert, ThreatLevel } from "@/types";
import ThreatLevelBadge from "@/components/ThreatLevelBadge";
import LazyImage from "@/components/LazyImage";

interface PackageAlertScreenProps {
  alerts: PackageAlert[];
  onBack: () => void;
}

/**
 * 快递警报详情页组件
 * 显示快递警报列表，支持威胁等级筛选和分页加载
 */
export default function PackageAlertScreen({
  alerts,
  onBack,
}: PackageAlertScreenProps) {
  // 威胁等级筛选状态
  const [selectedThreatLevel, setSelectedThreatLevel] = useState<
    ThreatLevel | "all"
  >("all");

  // 分页状态
  const [displayCount, setDisplayCount] = useState(10);

  // 筛选改变时重置分页
  const handleFilterChange = (level: ThreatLevel | "all") => {
    setSelectedThreatLevel(level);
    setDisplayCount(10); // 重置为显示前10条
  };

  // 行为类型中文映射
  const actionTextMap: Record<string, string> = {
    normal: "正常",
    passing: "路过",
    searching: "翻找",
    taking: "拿走",
    damaging: "破坏",
  };

  // 格式化时间
  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 筛选警报
  const filteredAlerts =
    selectedThreatLevel === "all"
      ? alerts
      : alerts.filter((alert) => alert.threat_level === selectedThreatLevel);

  // 分页显示
  const displayedAlerts = filteredAlerts.slice(0, displayCount);
  const hasMore = displayCount < filteredAlerts.length;

  // 加载更多
  const loadMore = () => {
    setDisplayCount((prev) => prev + 10);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">快递警报</h1>
        </div>
      </div>

      {/* 威胁等级筛选器 */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">威胁等级</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedThreatLevel === "all"
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            全部
          </button>
          <button
            onClick={() => handleFilterChange("low")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedThreatLevel === "low"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            低威胁
          </button>
          <button
            onClick={() => handleFilterChange("medium")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedThreatLevel === "medium"
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            中威胁
          </button>
          <button
            onClick={() => handleFilterChange("high")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedThreatLevel === "high"
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            高威胁
          </button>
        </div>
      </div>

      {/* 警报列表 */}
      <div className="p-4 space-y-4">
        {displayedAlerts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>暂无符合条件的警报</p>
          </div>
        )}

        {displayedAlerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            {/* 顶部信息栏 */}
            <div className="flex items-center justify-between mb-3">
              <ThreatLevelBadge level={alert.threat_level} />
              <span className="text-sm text-gray-500">
                {formatTimestamp(alert.ts)}
              </span>
            </div>

            {/* 行为分析卡片 */}
            <div className="mb-3">
              <div className="text-sm font-medium text-gray-700 mb-1">
                行为类型：
                <span className="text-gray-900 ml-1">
                  {actionTextMap[alert.action] || alert.action}
                </span>
              </div>
              <div className="text-sm text-gray-600">{alert.description}</div>
            </div>

            {/* 警报照片 */}
            {alert.photo_path && (
              <div className="mb-3">
                <LazyImage
                  src={alert.photo_path}
                  alt="警报照片"
                  className="w-full h-48 rounded-lg"
                />
              </div>
            )}

            {/* 语音警告状态 */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                语音警告：
                {alert.voice_warning_sent ? (
                  <span className="text-green-600 ml-1">已发送</span>
                ) : (
                  <span className="text-gray-400 ml-1">未发送</span>
                )}
              </span>
              <span>
                通知状态：
                {alert.notified ? (
                  <span className="text-green-600 ml-1">已通知</span>
                ) : (
                  <span className="text-gray-400 ml-1">未通知</span>
                )}
              </span>
            </div>
          </div>
        ))}

        {/* 加载更多按钮 */}
        {hasMore && (
          <button
            onClick={loadMore}
            className="w-full py-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            加载更多
          </button>
        )}
      </div>
    </div>
  );
}
