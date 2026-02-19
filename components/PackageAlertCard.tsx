import { Clock, ChevronRight, Package } from "lucide-react";
import type { PackageAlert } from "@/types";
import ThreatLevelBadge from "./ThreatLevelBadge";

interface PackageAlertCardProps {
  alerts: PackageAlert[];
  onViewAll: () => void;
}

/**
 * 快递警报卡片组件
 * 显示最近5条快递警报记录
 */
export default function PackageAlertCard({
  alerts,
  onViewAll,
}: PackageAlertCardProps) {
  // 仅显示最近5条记录
  const displayAlerts = alerts.slice(0, 5);

  // 格式化相对时间
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return "刚刚";
  };

  // 行为类型中文映射
  const actionTextMap: Record<string, string> = {
    normal: "正常",
    passing: "路过",
    searching: "翻找",
    taking: "拿走",
    damaging: "破坏",
  };

  return (
    <div
      className="bg-white border border-secondary-200 rounded-2xl p-4 shadow-sm
                      dark:bg-secondary-900 dark:border-secondary-700"
    >
      {/* 卡片标题 */}
      <h3 className="text-sm font-semibold text-secondary-700 mb-3 dark:text-secondary-50">
        快递警报
      </h3>

      {/* 空状态 */}
      {displayAlerts.length === 0 && (
        <div className="py-8 text-center text-secondary-400 dark:text-secondary-500">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无快递警报</p>
        </div>
      )}

      {/* 记录列表 */}
      {displayAlerts.length > 0 && (
        <div className="space-y-3">
          {displayAlerts.map((alert) => (
            <div
              key={alert.id}
              className="border border-secondary-200 rounded-xl p-3 hover:bg-secondary-50 
                         transition-colors
                         dark:border-secondary-700 dark:hover:bg-secondary-800"
            >
              {/* 顶部：威胁等级标识和时间 */}
              <div className="flex items-center justify-between mb-2">
                <ThreatLevelBadge level={alert.threat_level} />
                <div className="flex items-center gap-1 text-xs text-secondary-500 dark:text-secondary-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(alert.ts)}</span>
                </div>
              </div>

              {/* 行为类型 */}
              <div className="text-sm font-medium text-secondary-900 mb-1 dark:text-secondary-50">
                行为：{actionTextMap[alert.action] || alert.action}
              </div>

              {/* 行为描述 */}
              <div className="text-sm text-secondary-600 line-clamp-2 mb-2 dark:text-secondary-300">
                {alert.description}
              </div>

              {/* 缩略图（如果有） */}
              {alert.photo_thumbnail && (
                <div className="mt-2">
                  <img
                    src={alert.photo_thumbnail}
                    alt="警报照片"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 查看全部按钮 */}
      {displayAlerts.length > 0 && (
        <button
          onClick={onViewAll}
          className="w-full mt-4 flex items-center justify-center gap-1 py-2 text-sm 
                     text-primary-600 hover:text-primary-700 hover:bg-primary-50 
                     rounded-xl transition-colors
                     dark:text-primary-400 dark:hover:text-primary-300 dark:hover:bg-primary-950"
        >
          <span>查看全部</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
