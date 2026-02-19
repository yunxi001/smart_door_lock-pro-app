import { Clock, ChevronRight } from "lucide-react";
import type { VisitorIntent } from "@/types";
import IntentTypeBadge from "./IntentTypeBadge";

interface VisitorIntentCardProps {
  intents: VisitorIntent[];
  onViewDetail: (intent: VisitorIntent) => void;
}

/**
 * 访客意图卡片组件
 * 显示最近5条访客意图记录
 */
export default function VisitorIntentCard({
  intents,
  onViewDetail,
}: VisitorIntentCardProps) {
  // 仅显示最近5条记录
  const displayIntents = intents.slice(0, 5);

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

  return (
    <div
      className="bg-white border border-secondary-200 rounded-2xl p-4 shadow-sm
                      dark:bg-secondary-900 dark:border-secondary-700"
    >
      {/* 卡片标题 */}
      <h3 className="text-sm font-semibold text-secondary-700 mb-3 dark:text-secondary-50">
        最近访客意图
      </h3>

      {/* 空状态 */}
      {displayIntents.length === 0 && (
        <div className="py-8 text-center text-secondary-400 dark:text-secondary-500">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无访客意图记录</p>
        </div>
      )}

      {/* 记录列表 */}
      {displayIntents.length > 0 && (
        <div className="space-y-3">
          {displayIntents.map((intent) => (
            <div
              key={intent.id}
              className="border border-secondary-200 rounded-xl p-3 hover:bg-secondary-50 
                         transition-colors cursor-pointer
                         dark:border-secondary-700 dark:hover:bg-secondary-800"
              onClick={() => onViewDetail(intent)}
            >
              {/* 顶部：意图类型标签和时间 */}
              <div className="flex items-center justify-between mb-2">
                <IntentTypeBadge type={intent.intent_type} />
                <div className="flex items-center gap-1 text-xs text-secondary-500 dark:text-secondary-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(intent.ts)}</span>
                </div>
              </div>

              {/* 访客姓名 */}
              <div className="text-sm font-medium text-secondary-900 mb-1 dark:text-secondary-50">
                {intent.person_name}
              </div>

              {/* 简要总结 */}
              <div className="text-sm text-secondary-600 line-clamp-2 mb-2 dark:text-secondary-300">
                {intent.intent_summary.summary}
              </div>

              {/* 查看详情按钮 */}
              <div
                className="flex items-center justify-end text-xs text-primary-600 hover:text-primary-700
                              dark:text-primary-400 dark:hover:text-primary-300"
              >
                <span>查看详情</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
