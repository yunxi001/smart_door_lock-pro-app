import { ArrowLeft } from "lucide-react";
import React from "react";
import type { VisitorIntent } from "@/types";
import IntentTypeBadge from "@/components/IntentTypeBadge";
import ChatBubble from "@/components/ChatBubble";

interface VisitorIntentScreenProps {
  intent: VisitorIntent;
  onBack: () => void;
}

/**
 * 访客意图详情页
 * 显示访客的完整信息、AI分析摘要和对话历史
 */
export default function VisitorIntentScreen({
  intent,
  onBack,
}: VisitorIntentScreenProps) {
  // 格式化时间戳
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={onBack}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">访客意图详情</h1>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4 space-y-4">
        {/* 顶部信息栏 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {intent.person_name}
              </h2>
              <p className="text-sm text-gray-500">
                {formatTimestamp(intent.ts)}
              </p>
            </div>
            <IntentTypeBadge type={intent.intent_type} />
          </div>

          {/* 关系类型 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">关系：</span>
            <span className="text-sm font-medium text-gray-900">
              {intent.relation_type === "family"
                ? "家人"
                : intent.relation_type === "friend"
                  ? "朋友"
                  : "陌生人"}
            </span>
          </div>
        </div>

        {/* AI分析摘要卡片 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            AI分析摘要
          </h3>

          {/* 简要总结 */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">简要总结</p>
            <p className="text-sm text-gray-900">
              {intent.intent_summary.summary}
            </p>
          </div>

          {/* 详细分析 */}
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">详细分析</p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">
              {intent.intent_summary.ai_analysis}
            </p>
          </div>

          {/* 重要信息列表 */}
          {intent.intent_summary.important_notes &&
            intent.intent_summary.important_notes.length > 0 && (
              <div>
                <p className="text-sm text-gray-600 mb-2">重要信息</p>
                <ul className="space-y-2">
                  {intent.intent_summary.important_notes.map((note, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-2 text-sm text-gray-900"
                    >
                      <span className="text-orange-500 font-bold mt-0.5">
                        •
                      </span>
                      <span className="flex-1">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>

        {/* 对话历史区域 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            对话历史
          </h3>

          {/* 对话列表 - 根据数量决定是否使用虚拟滚动 */}
          {intent.dialogue_history.length > 0 ? (
            intent.dialogue_history.length > 50 ? (
              // 超过50条使用虚拟滚动
              <VirtualDialogueList messages={intent.dialogue_history} />
            ) : (
              // 少于50条使用普通渲染
              <div className="space-y-2">
                {intent.dialogue_history.map((message, index) => (
                  <ChatBubble
                    key={index}
                    role={message.role}
                    content={message.content}
                  />
                ))}
              </div>
            )
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              暂无对话记录
            </p>
          )}
        </div>

        {/* 快递检查结果（如果有） */}
        {intent.package_check && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              快递检查结果
            </h3>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">威胁等级：</span>
                <span
                  className={`text-sm font-medium ${
                    intent.package_check.threat_level === "high"
                      ? "text-red-600"
                      : intent.package_check.threat_level === "medium"
                        ? "text-orange-600"
                        : "text-green-600"
                  }`}
                >
                  {intent.package_check.threat_level === "high"
                    ? "高威胁"
                    : intent.package_check.threat_level === "medium"
                      ? "中威胁"
                      : "低威胁"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">行为类型：</span>
                <span className="text-sm font-medium text-gray-900">
                  {intent.package_check.action === "taking"
                    ? "拿走"
                    : intent.package_check.action === "searching"
                      ? "翻找"
                      : intent.package_check.action === "damaging"
                        ? "破坏"
                        : intent.package_check.action === "passing"
                          ? "路过"
                          : "正常"}
                </span>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">行为描述</p>
                <p className="text-sm text-gray-900">
                  {intent.package_check.description}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 虚拟滚动对话列表组件
 * 用于渲染超过50条的对话历史
 */
function VirtualDialogueList({
  messages,
}: {
  messages: Array<{ role: "assistant" | "user"; content: string }>;
}) {
  // 动态导入react-window
  const [FixedSizeList, setFixedSizeList] = React.useState<any>(null);

  React.useEffect(() => {
    import("react-window")
      .then((module) => {
        setFixedSizeList(() => module.FixedSizeList);
      })
      .catch((error) => {
        console.error("Failed to load react-window:", error);
      });
  }, []);

  // 如果FixedSizeList还未加载，显示加载状态或降级到普通渲染
  if (!FixedSizeList) {
    return (
      <div className="space-y-2">
        {messages.map((message, index) => (
          <ChatBubble
            key={index}
            role={message.role}
            content={message.content}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="h-[600px]">
      <FixedSizeList
        height={600}
        itemCount={messages.length}
        itemSize={100}
        width="100%"
      >
        {({ index, style }: { index: number; style: React.CSSProperties }) => (
          <div style={style}>
            <ChatBubble
              role={messages[index].role}
              content={messages[index].content}
            />
          </div>
        )}
      </FixedSizeList>
    </div>
  );
}
