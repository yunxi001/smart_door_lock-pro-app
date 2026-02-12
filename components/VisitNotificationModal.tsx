import React from "react";
import { X, User, CheckCircle, XCircle, Camera } from "lucide-react";

// 到访通知数据接口
export interface VisitNotificationData {
  visit_id: number;
  person_id: number | null;
  person_name: string;
  relation: string;
  result: "known" | "unknown" | "no_face";
  access_granted: boolean;
  image: string; // Base64 图片数据
  image_path: string; // 图片路径
  timestamp?: number; // 时间戳
}

interface Props {
  visible: boolean;
  data: VisitNotificationData | null;
  onClose: () => void;
}

/**
 * 到访通知弹窗组件
 * 显示人员姓名、识别结果、是否开门、抓拍图片
 * 需求: 10.7, 10.8
 */
export const VisitNotificationModal: React.FC<Props> = ({
  visible,
  data,
  onClose,
}) => {
  if (!visible || !data) return null;

  // 获取识别结果的中文描述
  const getResultText = (result: string): string => {
    const resultMap: Record<string, string> = {
      known: "已识别",
      unknown: "陌生人",
      no_face: "未检测到人脸",
    };
    return resultMap[result] || result;
  };

  // 获取识别结果的样式
  const getResultStyle = (result: string): string => {
    switch (result) {
      case "known":
        return "bg-success-100 text-success-700 dark:bg-success-950 dark:text-success-100";
      case "unknown":
        return "bg-warning-100 text-warning-700 dark:bg-warning-950 dark:text-warning-100";
      case "no_face":
        return "bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300";
      default:
        return "bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300";
    }
  };

  // 构建图片 URL
  const getImageUrl = (): string => {
    if (data.image) {
      // 如果有 Base64 数据，直接使用
      return data.image.startsWith("data:")
        ? data.image
        : `data:image/jpeg;base64,${data.image}`;
    }
    // 否则使用图片路径
    return data.image_path || "";
  };

  const imageUrl = getImageUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-secondary-900/50 backdrop-blur-sm dark:bg-secondary-950/70"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-[90%] max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in duration-200 dark:bg-secondary-800">
        {/* 头部 */}
        <div className="bg-primary-500 text-white px-4 py-3 flex items-center justify-between dark:bg-primary-600">
          <div className="flex items-center space-x-2">
            <Camera size={20} />
            <span className="font-semibold">到访通知</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 抓拍图片区域 */}
        <div className="relative aspect-[4/3] bg-secondary-100 dark:bg-secondary-900">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="抓拍图片"
              className="w-full h-full object-cover"
              onError={(e) => {
                // 图片加载失败时显示占位图
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-secondary-400 dark:text-secondary-500">
              <div className="text-center">
                <Camera size={48} className="mx-auto mb-2 opacity-50" />
                <span className="text-sm">暂无图片</span>
              </div>
            </div>
          )}

          {/* 识别结果标签 */}
          <div
            className={`absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-medium ${getResultStyle(data.result)}`}
          >
            {getResultText(data.result)}
          </div>
        </div>

        {/* 信息区域 */}
        <div className="p-4 space-y-3">
          {/* 人员信息 */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center dark:bg-primary-900">
              <User
                size={20}
                className="text-primary-600 dark:text-primary-400"
              />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-secondary-900 dark:text-secondary-50">
                {data.person_name || "陌生人"}
              </div>
              {data.relation && (
                <div className="text-sm text-secondary-600 dark:text-secondary-300">
                  {data.relation}
                </div>
              )}
            </div>
          </div>

          {/* 开门状态 */}
          <div
            className={`flex items-center justify-center space-x-2 py-3 rounded-xl ${
              data.access_granted
                ? "bg-success-50 text-success-700 dark:bg-success-950 dark:text-success-100"
                : "bg-error-50 text-error-700 dark:bg-error-950 dark:text-error-100"
            }`}
          >
            {data.access_granted ? (
              <>
                <CheckCircle size={24} />
                <span className="font-semibold text-lg">已开门</span>
              </>
            ) : (
              <>
                <XCircle size={24} />
                <span className="font-semibold text-lg">拒绝访问</span>
              </>
            )}
          </div>

          {/* 时间戳 */}
          {data.timestamp && (
            <div className="text-center text-sm text-secondary-400 dark:text-secondary-500">
              {new Date(data.timestamp * 1000).toLocaleString("zh-CN")}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="px-4 pb-4">
          <button
            onClick={onClose}
            className="w-full py-3 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 active:bg-primary-700 transition-colors dark:bg-primary-600 dark:hover:bg-primary-500"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
