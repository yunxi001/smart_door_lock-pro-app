import { Package, Users, ShoppingBag, Wrench, HelpCircle } from "lucide-react";
import type { IntentType } from "@/types";

interface IntentTypeBadgeProps {
  type: IntentType;
}

/**
 * 意图类型标签组件
 * 根据意图类型显示对应的颜色、图标和文字
 */
export default function IntentTypeBadge({ type }: IntentTypeBadgeProps) {
  // 样式映射
  const styleMap: Record<IntentType, string> = {
    delivery: "bg-blue-100 text-blue-800",
    visit: "bg-green-100 text-green-800",
    sales: "bg-orange-100 text-orange-800",
    maintenance: "bg-purple-100 text-purple-800",
    other: "bg-gray-100 text-gray-800",
  };

  // 图标映射
  const iconMap: Record<IntentType, JSX.Element> = {
    delivery: <Package className="w-4 h-4" />,
    visit: <Users className="w-4 h-4" />,
    sales: <ShoppingBag className="w-4 h-4" />,
    maintenance: <Wrench className="w-4 h-4" />,
    other: <HelpCircle className="w-4 h-4" />,
  };

  // 文本映射
  const textMap: Record<IntentType, string> = {
    delivery: "快递配送",
    visit: "拜访",
    sales: "推销",
    maintenance: "维修",
    other: "其他",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styleMap[type]}`}
    >
      {iconMap[type]}
      <span>{textMap[type]}</span>
    </span>
  );
}
