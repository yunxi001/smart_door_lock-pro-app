interface ChatBubbleProps {
  role: "assistant" | "user";
  content: string;
  timestamp?: string;
}

/**
 * 聊天气泡组件
 * 用于展示对话历史，支持左右对齐和可选时间戳
 */
export default function ChatBubble({
  role,
  content,
  timestamp,
}: ChatBubbleProps) {
  return (
    <div
      className={`flex ${role === "user" ? "justify-end" : "justify-start"} mb-2`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          role === "user"
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-900"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        {timestamp && (
          <p
            className={`text-xs mt-1 ${role === "user" ? "opacity-70" : "opacity-60"}`}
          >
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}
