import { Shield, AlertTriangle, AlertOctagon } from "lucide-react";
import type { ThreatLevel } from "@/types";

interface ThreatLevelBadgeProps {
  level: ThreatLevel;
}

/**
 * 威胁等级标识组件
 * 根据威胁等级显示对应的颜色、图标和文字
 */
export default function ThreatLevelBadge({ level }: ThreatLevelBadgeProps) {
  // 样式映射
  const styleMap: Record<ThreatLevel, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-orange-100 text-orange-800",
    high: "bg-red-100 text-red-800",
  };

  // 图标映射
  const iconMap: Record<ThreatLevel, React.ReactElement> = {
    low: <Shield className="w-4 h-4" />,
    medium: <AlertTriangle className="w-4 h-4" />,
    high: <AlertOctagon className="w-4 h-4" />,
  };

  // 文本映射
  const textMap: Record<ThreatLevel, string> = {
    low: "低威胁",
    medium: "中威胁",
    high: "高威胁",
  };

  // 处理无效level的情况
  const validLevel = (
    ["low", "medium", "high"].includes(level) ? level : "low"
  ) as ThreatLevel;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styleMap[validLevel]}`}
    >
      {iconMap[validLevel]}
      <span>{textMap[validLevel]}</span>
    </span>
  );
}
