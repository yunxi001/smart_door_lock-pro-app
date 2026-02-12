# LocalStorageService 集成功能手动测试指南

## 测试目的

验证 LocalStorageService 已正确集成到应用中，确保以下功能正常工作：

1. 应用启动时加载缓存数据
2. 页面刷新后数据恢复
3. 离线模式下查看历史记录
4. Tab 状态保存和恢复
5. 清空缓存功能

## 测试前准备

1. 启动开发服务器：`npm run dev`
2. 打开浏览器开发者工具（F12）
3. 切换到 Console 标签页查看日志
4. 切换到 Application > IndexedDB 查看数据库

## 测试用例

### 测试 1: 应用启动时加载缓存数据

**目标**: 验证应用启动时能从本地存储加载缓存数据

**步骤**:

1. 打开应用
2. 查看 Console 日志

**预期结果**:

- 看到 "LocalStorageService 初始化成功" 日志
- 看到 "缓存数据加载完成" 日志
- 如果有缓存数据，会看到类似 "已加载 X 条人脸数据" 的日志

**验证方法**:

```javascript
// 在 Console 中执行
const service = await import("./services/LocalStorageService.js");
const cached = await service.localStorageService.loadCachedData();
console.log("缓存数据:", cached);
```

---

### 测试 2: 数据持久化 - 人脸数据

**目标**: 验证人脸数据能正确保存到本地存储

**步骤**:

1. 连接到设备（如果有真实设备）或模拟数据
2. 在设置页面查看人脸列表
3. 打开 Application > IndexedDB > SmartDoorlockDB > persons
4. 查看是否有数据

**预期结果**:

- persons 对象存储中有数据
- 每条数据包含 id, name, relation_type, cachedAt 字段
- Console 中看到 "人脸数据已同步到本地存储" 日志

---

### 测试 3: 页面刷新后数据恢复

**目标**: 验证页面刷新后能恢复之前的数据

**步骤**:

1. 确保应用中有一些数据（人脸、指纹、NFC 卡片等）
2. 记录当前数据数量
3. 按 F5 刷新页面
4. 等待应用加载完成

**预期结果**:

- 页面刷新后，数据立即显示（不需要重新连接设备）
- 数据数量与刷新前一致
- Console 中看到 "已加载 X 条..." 的日志

**验证脚本**:

```javascript
// 刷新前在 Console 执行
const beforeRefresh = {
  persons: document.querySelectorAll("[data-person-id]").length,
  fingerprints: document.querySelectorAll("[data-fingerprint-id]").length,
};
console.log("刷新前数据:", beforeRefresh);
// 然后刷新页面，刷新后再次执行类似的查询对比
```

---

### 测试 4: Tab 状态保存和恢复

**目标**: 验证应用能记住最后浏览的 Tab 页面

**步骤**:

1. 切换到 "监控" Tab
2. 等待 500ms（防抖延迟）
3. 刷新页面

**预期结果**:

- 页面刷新后，自动显示 "监控" Tab
- Console 中看到 "Tab 状态已保存: monitor" 日志
- Console 中看到 "已恢复 Tab 状态: monitor" 日志

**验证方法**:

```javascript
// 在 Console 中执行
const service = await import("./services/LocalStorageService.js");
const currentTab = await service.localStorageService.getSetting("currentTab");
console.log("当前保存的 Tab:", currentTab);
```

---

### 测试 5: 开锁记录持久化

**目标**: 验证开锁记录能保存到本地存储

**步骤**:

1. 触发一次开锁事件（真实设备或模拟）
2. 打开 Application > IndexedDB > SmartDoorlockDB > unlockLogs
3. 查看是否有新记录

**预期结果**:

- unlockLogs 对象存储中有新记录
- 记录包含 id, method, uid, status, timestamp 等字段
- Console 中看到 "开锁记录已保存到本地存储" 日志

---

### 测试 6: 事件记录持久化

**目标**: 验证事件记录能保存到本地存储

**步骤**:

1. 触发一次事件（如门铃、移动检测）
2. 打开 Application > IndexedDB > SmartDoorlockDB > eventLogs
3. 查看是否有新记录

**预期结果**:

- eventLogs 对象存储中有新记录
- 记录包含 id, event, param, timestamp 字段
- Console 中看到 "事件记录已保存到本地存储" 日志

---

### 测试 7: 最近动态持久化

**目标**: 验证最近动态能保存到本地存储

**步骤**:

1. 在首页查看最近动态列表
2. 触发一些事件（开锁、到访等）
3. 刷新页面
4. 查看最近动态是否恢复

**预期结果**:

- 页面刷新后，最近动态列表立即显示
- 动态内容与刷新前一致
- Console 中看到 "已加载 X 条最近动态" 日志

---

### 测试 8: 离线模式下查看历史记录

**目标**: 验证在设备未连接时能查看本地缓存的历史记录

**步骤**:

1. 确保应用中有一些历史记录（开锁记录、事件记录）
2. 断开设备连接（或不连接设备）
3. 进入设置页面
4. 点击 "开锁记录" 或 "事件记录"

**预期结果**:

- 能看到之前缓存的历史记录
- 显示 "离线模式" 或 "缓存数据" 标识
- 记录按时间倒序排列

**验证方法**:

```javascript
// 在 Console 中执行
const service = await import("./services/LocalStorageService.js");
const unlockLogs = await service.localStorageService.getAll("unlockLogs");
console.log("开锁记录数量:", unlockLogs.length);
console.log("最新记录:", unlockLogs[0]);
```

---

### 测试 9: 清空缓存功能

**目标**: 验证清空缓存功能正常工作

**步骤**:

1. 确保应用中有一些缓存数据
2. 进入设置页面
3. 找到 "清空缓存" 按钮并点击
4. 确认清空操作
5. 查看 IndexedDB 中的数据

**预期结果**:

- 非关键数据（unlockLogs, eventLogs, visitRecords, recentActivities）被清空
- 关键数据（persons, fingerprints, nfcCards, tempPasswords, appSettings）保留
- 显示清空成功提示

**验证方法**:

```javascript
// 在 Console 中执行
const service = await import("./services/LocalStorageService.js");
await service.localStorageService.clear("unlockLogs");
await service.localStorageService.clear("eventLogs");
await service.localStorageService.clear("visitRecords");
await service.localStorageService.clear("recentActivities");
console.log("缓存已清空");
```

---

### 测试 10: 数据同步机制

**目标**: 验证本地缓存与服务器数据能正确同步

**步骤**:

1. 应用启动时有缓存数据
2. 连接到设备
3. 服务器返回新的数据
4. 查看数据是否更新

**预期结果**:

- 启动时立即显示缓存数据
- 连接成功后，数据更新为服务器最新数据
- Console 中看到 "数据已同步到本地存储" 日志
- IndexedDB 中的数据与服务器数据一致

---

### 测试 11: 降级模式

**目标**: 验证 IndexedDB 不可用时能降级到内存模式

**步骤**:

1. 在 Console 中禁用 IndexedDB：
   ```javascript
   Object.defineProperty(window, "indexedDB", { value: undefined });
   ```
2. 刷新页面
3. 查看应用是否正常运行

**预期结果**:

- 应用继续正常运行
- Console 中看到降级模式警告
- 数据存储在内存中（页面刷新后丢失）

---

## 性能测试

### 测试 12: 应用启动时间

**目标**: 验证添加本地存储后启动时间增加不超过 200ms

**步骤**:

1. 打开 Performance 标签
2. 刷新页面并记录
3. 查看 "LocalStorageService 初始化" 到 "缓存数据加载完成" 的时间

**预期结果**:

- 初始化和加载时间 < 200ms
- 不阻塞 UI 渲染

**测量脚本**:

```javascript
// 在 LocalStorageService.init() 开始时
const startTime = performance.now();

// 在 loadCachedData() 结束时
const endTime = performance.now();
console.log("存储初始化耗时:", endTime - startTime, "ms");
```

---

### 测试 13: 单次存储操作耗时

**目标**: 验证单次存储操作耗时不超过 50ms

**步骤**:

1. 在 Console 中执行：

   ```javascript
   const service = await import("./services/LocalStorageService.js");
   const testData = { id: 999, name: "测试", cachedAt: Date.now() };

   const start = performance.now();
   await service.localStorageService.save("persons", testData);
   const end = performance.now();

   console.log("保存耗时:", end - start, "ms");
   ```

**预期结果**:

- 保存操作耗时 < 50ms
- 不阻塞 UI

---

## 数据完整性测试

### 测试 14: 数据字段完整性

**目标**: 验证保存的数据包含所有必需字段

**步骤**:

1. 保存一条完整的数据记录
2. 从 IndexedDB 中读取
3. 验证所有字段都存在

**验证脚本**:

```javascript
const service = await import("./services/LocalStorageService.js");

// 保存测试数据
const testPerson = {
  id: 999,
  name: "测试用户",
  relation_type: "family",
  permission: {
    time_start: "08:00",
    time_end: "18:00",
  },
};

await service.localStorageService.save("persons", testPerson);

// 读取并验证
const loaded = await service.localStorageService.get("persons", 999);
console.log("保存的数据:", testPerson);
console.log("读取的数据:", loaded);
console.log(
  "字段完整:",
  loaded.id === testPerson.id &&
    loaded.name === testPerson.name &&
    loaded.relation_type === testPerson.relation_type &&
    loaded.permission.time_start === testPerson.permission.time_start,
);
```

---

## 测试总结

完成所有测试后，填写以下检查清单：

- [ ] 测试 1: 应用启动时加载缓存数据 ✅
- [ ] 测试 2: 数据持久化 - 人脸数据 ✅
- [ ] 测试 3: 页面刷新后数据恢复 ✅
- [ ] 测试 4: Tab 状态保存和恢复 ✅
- [ ] 测试 5: 开锁记录持久化 ✅
- [ ] 测试 6: 事件记录持久化 ✅
- [ ] 测试 7: 最近动态持久化 ✅
- [ ] 测试 8: 离线模式下查看历史记录 ✅
- [ ] 测试 9: 清空缓存功能 ✅
- [ ] 测试 10: 数据同步机制 ✅
- [ ] 测试 11: 降级模式 ✅
- [ ] 测试 12: 应用启动时间 < 200ms ✅
- [ ] 测试 13: 单次存储操作 < 50ms ✅
- [ ] 测试 14: 数据字段完整性 ✅

## 常见问题排查

### 问题 1: 数据没有保存

**可能原因**:

- IndexedDB 被浏览器禁用
- 存储空间不足
- 数据格式错误

**排查方法**:

```javascript
// 检查 IndexedDB 是否可用
console.log("IndexedDB 可用:", !!window.indexedDB);

// 检查存储服务状态
const service = await import("./services/LocalStorageService.js");
console.log("服务可用:", service.localStorageService.isAvailable());
console.log("降级模式:", service.localStorageService.isFallbackMode);
```

### 问题 2: 页面刷新后数据丢失

**可能原因**:

- 数据没有正确保存
- 降级模式下运行（内存存储）
- 浏览器清除了 IndexedDB

**排查方法**:

```javascript
// 检查 IndexedDB 中的数据
// 打开 Application > IndexedDB > SmartDoorlockDB
// 查看各个对象存储中是否有数据
```

### 问题 3: 性能问题

**可能原因**:

- 数据量过大
- 频繁的存储操作
- 没有使用批量操作

**优化建议**:

- 使用 `saveBatch` 代替多次 `save`
- 增加防抖延迟
- 定期清理过期数据

---

## 自动化测试脚本

以下是一个完整的自动化测试脚本，可以在 Console 中运行：

```javascript
// 完整的集成测试脚本
async function runIntegrationTests() {
  console.log("🚀 开始集成测试...\n");

  const service = await import("./services/LocalStorageService.js");
  const storage = service.localStorageService;

  let passedTests = 0;
  let failedTests = 0;

  // 测试 1: 初始化
  try {
    await storage.init();
    console.log("✅ 测试 1: 初始化成功");
    passedTests++;
  } catch (error) {
    console.error("❌ 测试 1: 初始化失败", error);
    failedTests++;
  }

  // 测试 2: 保存和读取
  try {
    const testData = { id: 999, name: "测试", cachedAt: Date.now() };
    await storage.save("persons", testData);
    const loaded = await storage.get("persons", 999);
    if (loaded && loaded.name === "测试") {
      console.log("✅ 测试 2: 保存和读取成功");
      passedTests++;
    } else {
      throw new Error("数据不匹配");
    }
  } catch (error) {
    console.error("❌ 测试 2: 保存和读取失败", error);
    failedTests++;
  }

  // 测试 3: 批量操作
  try {
    const testList = [
      { id: 1001, name: "用户1", cachedAt: Date.now() },
      { id: 1002, name: "用户2", cachedAt: Date.now() },
      { id: 1003, name: "用户3", cachedAt: Date.now() },
    ];
    await storage.saveBatch("persons", testList);
    const all = await storage.getAll("persons");
    if (all.length >= 3) {
      console.log("✅ 测试 3: 批量操作成功");
      passedTests++;
    } else {
      throw new Error("批量保存失败");
    }
  } catch (error) {
    console.error("❌ 测试 3: 批量操作失败", error);
    failedTests++;
  }

  // 测试 4: 设置保存和读取
  try {
    await storage.saveSetting("testKey", "testValue");
    const value = await storage.getSetting("testKey");
    if (value === "testValue") {
      console.log("✅ 测试 4: 设置保存和读取成功");
      passedTests++;
    } else {
      throw new Error("设置值不匹配");
    }
  } catch (error) {
    console.error("❌ 测试 4: 设置保存和读取失败", error);
    failedTests++;
  }

  // 测试 5: 缓存数据加载
  try {
    const cached = await storage.loadCachedData();
    if (cached && typeof cached === "object") {
      console.log("✅ 测试 5: 缓存数据加载成功");
      console.log("   - persons:", cached.persons.length);
      console.log("   - fingerprints:", cached.fingerprints.length);
      console.log("   - nfcCards:", cached.nfcCards.length);
      passedTests++;
    } else {
      throw new Error("缓存数据格式错误");
    }
  } catch (error) {
    console.error("❌ 测试 5: 缓存数据加载失败", error);
    failedTests++;
  }

  // 测试总结
  console.log("\n📊 测试总结:");
  console.log(`   通过: ${passedTests}`);
  console.log(`   失败: ${failedTests}`);
  console.log(`   总计: ${passedTests + failedTests}`);

  if (failedTests === 0) {
    console.log("\n🎉 所有测试通过！");
  } else {
    console.log("\n⚠️ 部分测试失败，请检查错误信息");
  }
}

// 运行测试
runIntegrationTests();
```

---

## 结论

完成以上所有测试后，如果所有测试都通过，说明 LocalStorageService 已成功集成到应用中，功能正常。

如有任何测试失败，请参考"常见问题排查"部分进行调试。
