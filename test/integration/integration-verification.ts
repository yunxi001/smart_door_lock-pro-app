/**
 * v2.5协议适配 - 集成验证脚本
 * 任务21: 检查点 - 集成完成
 *
 * 此脚本通过静态分析验证所有组件的集成情况
 */

import * as fs from "fs";
import * as path from "path";

interface CheckResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: CheckResult[] = [];

function checkFileContains(
  filePath: string,
  patterns: string[],
  checkName: string,
): boolean {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const allFound = patterns.every((pattern) => content.includes(pattern));

    results.push({
      name: checkName,
      passed: allFound,
      details: allFound
        ? `✅ 所有必需内容已找到`
        : `❌ 缺少部分内容: ${patterns.filter((p) => !content.includes(p)).join(", ")}`,
    });

    return allFound;
  } catch (error) {
    results.push({
      name: checkName,
      passed: false,
      details: `❌ 文件读取失败: ${error}`,
    });
    return false;
  }
}

console.log("🔍 开始v2.5协议适配集成验证...\n");

// 1. 检查App.tsx状态管理
console.log("📋 检查1: App.tsx状态管理");
checkFileContains(
  "App.tsx",
  [
    "const [visitorIntents, setVisitorIntents] = useState<VisitorIntent[]>([]);",
    "const [packageAlerts, setPackageAlerts] = useState<PackageAlert[]>([]);",
    "const [toastQueue, setToastQueue]",
    "const [currentSubScreen, setCurrentSubScreen]",
    "const [selectedIntent, setSelectedIntent]",
    "const [selectedAlerts, setSelectedAlerts]",
  ],
  "App.tsx - v2.5状态定义",
);

// 2. 检查事件订阅
console.log("📋 检查2: 事件订阅");
checkFileContains(
  "App.tsx",
  [
    'deviceService.on("visitor_intent"',
    'deviceService.on("package_alert"',
    'deviceService.on("visitor_intents_query_result"',
    'deviceService.on("package_alerts_query_result"',
  ],
  "App.tsx - v2.5事件订阅",
);

// 3. 检查数据持久化
console.log("📋 检查3: 数据持久化");
checkFileContains(
  "App.tsx",
  [
    "await localStorageService.saveVisitorIntent",
    "await localStorageService.savePackageAlert",
    "await localStorageService.getVisitorIntents(100)",
    "await localStorageService.getPackageAlerts(100)",
  ],
  "App.tsx - IndexedDB数据持久化",
);

// 4. 检查查询触发
console.log("📋 检查4: 查询触发");
checkFileContains(
  "App.tsx",
  [
    "deviceService.queryVisitorIntents({ limit: 5 })",
    "deviceService.queryPackageAlerts({ limit: 5 })",
    'if (currentTab === "home" && status === "connected")',
  ],
  "App.tsx - 首页查询触发",
);

// 5. 检查导航函数
console.log("📋 检查5: 导航函数");
checkFileContains(
  "App.tsx",
  [
    "const handleViewIntentDetail = (intent: VisitorIntent)",
    "const handleViewAllAlerts = ()",
    "const handleBackToHome = ()",
    'setCurrentSubScreen("visitor-intent-detail")',
    'setCurrentSubScreen("package-alert-detail")',
  ],
  "App.tsx - 详情页导航",
);

// 6. 检查Toast管理
console.log("📋 检查6: Toast管理");
checkFileContains(
  "App.tsx",
  [
    "const addToast = (",
    "const removeToast = (",
    "setToastQueue((prev) => [...prev, { id, message, type }])",
    "{toastQueue.map((toast, index) =>",
  ],
  "App.tsx - Toast队列管理",
);

// 7. 检查HomeScreen集成
console.log("📋 检查7: HomeScreen集成");
checkFileContains(
  "App.tsx",
  [
    "visitorIntents={visitorIntents}",
    "packageAlerts={packageAlerts}",
    "onViewIntentDetail={handleViewIntentDetail}",
    "onViewAllAlerts={handleViewAllAlerts}",
  ],
  "App.tsx - HomeScreen props传递",
);

// 8. 检查详情页路由
console.log("📋 检查8: 详情页路由");
checkFileContains(
  "App.tsx",
  [
    'currentSubScreen === "visitor-intent-detail" && selectedIntent',
    "<VisitorIntentScreen",
    "intent={selectedIntent}",
    "onBack={handleBackToHome}",
    'currentSubScreen === "package-alert-detail"',
    "<PackageAlertScreen",
    "alerts={selectedAlerts}",
  ],
  "App.tsx - 详情页条件渲染",
);

// 9. 检查HomeScreen组件
console.log("📋 检查9: HomeScreen组件");
checkFileContains(
  "screens/HomeScreen.tsx",
  [
    "visitorIntents: VisitorIntent[]",
    "packageAlerts: PackageAlert[]",
    "onViewIntentDetail: (intent: VisitorIntent) => void",
    "onViewAllAlerts: () => void",
    "<VisitorIntentCard",
    "intents={visitorIntents}",
    "onViewDetail={onViewIntentDetail}",
    "<PackageAlertCard",
    "alerts={packageAlerts}",
    "onViewAll={onViewAllAlerts}",
  ],
  "HomeScreen - v2.5组件集成",
);

// 10. 检查类型定义
console.log("📋 检查10: 类型定义");
checkFileContains(
  "types.ts",
  [
    "export interface VisitorIntent",
    "export interface PackageAlert",
    "export interface DialogueMessage",
    "export interface PackageCheck",
    "export type SubScreen",
  ],
  "types.ts - v2.5类型定义",
);

// 输出结果
console.log("\n" + "=".repeat(60));
console.log("📊 验证结果汇总");
console.log("=".repeat(60) + "\n");

const passedCount = results.filter((r) => r.passed).length;
const totalCount = results.length;

results.forEach((result, index) => {
  console.log(`${index + 1}. ${result.name}`);
  console.log(`   ${result.details}\n`);
});

console.log("=".repeat(60));
console.log(`总计: ${passedCount}/${totalCount} 项检查通过`);
console.log("=".repeat(60) + "\n");

if (passedCount === totalCount) {
  console.log("✅ 所有集成检查通过！v2.5协议适配已成功集成。\n");
  process.exit(0);
} else {
  console.log("❌ 部分检查未通过，请检查上述失败项。\n");
  process.exit(1);
}
