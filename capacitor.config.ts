import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.smartlock.pro",
  appName: "SmartLockPro",
  webDir: "dist",
  server: {
    // 开发测试环境：允许 HTTP 和 ws:// 连接
    // 注意：生产环境应移除此配置，使用默认的 HTTPS
    androidScheme: "http",
    // 允许混合内容（HTTP 页面访问 ws://）
    allowNavigation: ["*"],
  },
};

export default config;
