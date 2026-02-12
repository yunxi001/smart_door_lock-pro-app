# Android 构建快速指南

## 当前问题状态

✅ **已完成**：

- Gradle 缓存已清理
- 内存配置已优化（1536m → 1024m）
- 守护进程已停止

⚠️ **需要手动操作**：

- 重新构建项目
- 可能需要关闭杀毒软件

## 立即执行的步骤

### 步骤 1：关闭占用资源的程序

在构建前，关闭以下程序以释放系统资源：

- Chrome/Edge 浏览器（如果打开了很多标签）
- 其他 IDE 或编辑器
- 大型应用程序

### 步骤 2：临时关闭杀毒软件（可选）

如果使用 Windows Defender：

1. 打开 Windows 安全中心
2. 病毒和威胁防护 → 管理设置
3. 临时关闭"实时保护"（构建完成后记得重新开启）

### 步骤 3：在 Android Studio 中构建

**推荐方式**（使用 Android Studio）：

1. 打开 Android Studio
2. 打开项目：`File` → `Open` → 选择 `android` 目录
3. 等待 Gradle 同步完成（可能需要 5-10 分钟）
4. 点击 `Build` → `Clean Project`
5. 点击 `Build` → `Rebuild Project`

### 步骤 4：命令行构建（备选方案）

在 PowerShell 或 CMD 中执行：

```bash
# 进入 android 目录
cd android

# 清理构建
./gradlew clean

# 构建 Debug 版本
./gradlew assembleDebug

# 或构建 Release 版本
./gradlew assembleRelease
```

## 如果仍然失败

### 方案 A：删除并重新下载 Gradle

```powershell
# 删除 Gradle 发行版
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\wrapper\dists\gradle-8.14.3-all"

# 重新下载（会自动触发）
cd android
./gradlew --version
```

### 方案 B：使用更低的内存配置

编辑 `android/gradle.properties`，进一步降低内存：

```properties
org.gradle.jvmargs=-Xmx768m -XX:MaxMetaspaceSize=256m
```

### 方案 C：检查磁盘空间

```powershell
# 检查 C 盘可用空间
Get-PSDrive C
```

确保至少有 10GB 可用空间。

### 方案 D：重启电脑

有时候简单的重启可以解决资源占用问题。

## 完整的 Capacitor 工作流

一旦 Android 构建成功，完整的工作流程是：

```bash
# 1. 构建 Web 应用
npm run build

# 2. 同步到 Android
npx cap sync android

# 3. 打开 Android Studio
npx cap open android

# 4. 在 Android Studio 中运行应用
# 点击绿色的 Run 按钮
```

## 常见问题

### Q: Gradle 同步一直卡住怎么办？

A:

1. 检查网络连接（Gradle 需要下载依赖）
2. 尝试使用国内镜像（修改 `build.gradle`）
3. 使用离线模式：`./gradlew --offline`

### Q: 构建成功但无法运行？

A:

1. 检查 USB 调试是否开启
2. 检查设备是否被 ADB 识别：`adb devices`
3. 尝试重启 ADB：`adb kill-server && adb start-server`

### Q: 如何查看详细的错误日志？

A:

```bash
./gradlew assembleDebug --stacktrace --info > build.log 2>&1
```

然后查看 `build.log` 文件。

## 性能优化建议

### 1. 启用 Gradle 并行构建

在 `gradle.properties` 中添加：

```properties
org.gradle.parallel=true
org.gradle.workers.max=4
```

### 2. 使用本地 Maven 缓存

```properties
org.gradle.caching=true
```

### 3. 排除不需要的 ABI

在 `app/build.gradle` 中：

```gradle
android {
    defaultConfig {
        ndk {
            // 只构建常用架构
            abiFilters 'armeabi-v7a', 'arm64-v8a'
        }
    }
}
```

## 成功标志

构建成功后，你会看到：

```
BUILD SUCCESSFUL in 2m 30s
```

APK 文件位置：

- Debug: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `android/app/build/outputs/apk/release/app-release.apk`

## 下一步

构建成功后：

1. 在真机或模拟器上测试应用
2. 测试 WebSocket 连接（确保使用正确的服务器地址）
3. 测试音频对讲功能（需要麦克风权限）
4. 测试人脸识别功能（需要相机权限）

## 需要帮助？

如果遇到其他问题，请提供：

1. 完整的错误日志
2. `gradle.properties` 文件内容
3. 系统可用内存和磁盘空间
4. Android Studio 版本
