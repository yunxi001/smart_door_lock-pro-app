import React from "react";
import { Home, Camera, Settings } from "lucide-react";
import { Tab } from "../types";

interface Props {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export const BottomNav: React.FC<Props> = ({ currentTab, onTabChange }) => {
  // 导航项配置：首页、监控、设置
  const navItems = [
    { id: "home", icon: Home, label: "首页" },
    { id: "monitor", icon: Camera, label: "监控" },
    { id: "settings", icon: Settings, label: "设置" },
  ] as const;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 
                    bg-white border-t border-secondary-200 
                    dark:bg-secondary-900 dark:border-secondary-700
                    pb-safe pt-2 px-6 h-20 
                    shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] 
                    z-50"
    >
      <div className="flex justify-around items-center h-full pb-2">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id as Tab)}
              className={`flex flex-col items-center justify-center w-16 
                         transition-colors duration-200 ${
                           isActive
                             ? "text-primary-600 dark:text-primary-400"
                             : "text-secondary-600 hover:text-secondary-900 dark:text-secondary-400 dark:hover:text-secondary-100"
                         }`}
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span
                className={`text-xs mt-1 font-medium ${isActive ? "block" : "hidden"}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
