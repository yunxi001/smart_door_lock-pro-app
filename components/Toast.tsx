import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ToastProps {
  message: string;
  type?: "info" | "warning" | "error";
  duration?: number; // 默认3000ms
  onClose: () => void;
}

/**
 * Toast通知组件
 *
 * 功能：
 * - 顶部居中显示临时通知
 * - 自动关闭（默认3000ms）
 * - 手动关闭按钮
 * - 根据type显示不同颜色（info=蓝色、warning=橙色、error=红色）
 * - 渐入渐出动画
 */
export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 3000,
  onClose,
}) => {
  // 自动关闭定时器
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    // 清理定时器
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  // 根据type确定样式
  const getTypeStyles = () => {
    switch (type) {
      case "info":
        return "bg-blue-500 text-white";
      case "warning":
        return "bg-orange-500 text-white";
      case "error":
        return "bg-red-500 text-white";
      default:
        return "bg-blue-500 text-white";
    }
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
      <div
        className={`${getTypeStyles()} rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 min-w-[300px] max-w-[90vw]`}
      >
        {/* 消息内容 */}
        <p className="flex-1 text-sm font-medium break-words">{message}</p>

        {/* 手动关闭按钮 */}
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-80 transition-opacity"
          aria-label="关闭通知"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
