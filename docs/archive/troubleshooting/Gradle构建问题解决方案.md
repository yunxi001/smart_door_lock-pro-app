# Gradle 构建问题解决方案

## 问题描述

构建 Android 项目时出现错误：

```
系统资源不足，无法完成请求的服务
FileSystemException: native-platform-linux-aarch64-0.22-milestone-28.jar
```

## 根本原因

1. **内存不足**：Gradle 守护进程默认分配 1536MB 内存可能过高
2. **文件句柄耗尽**：Windows 系统打开文件数量限制
3. **Gradle 缓存损坏**：缓存文件损坏或不完整
4. **杀毒软件干扰**：实时扫描锁定 JAR 文件

## 已实施的修复

### 1. 优化 Gradle 内存配置

修改 `android/gradle.properties`：

```properties
# 降低内存使用从 1536m 到 1024m
org.gradle.jvmargs=-Xmx1024m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8

# 启用守护进程和配置缓存
org.gradle.daemon=true
org.gradle.configuration-cache=true
```

### 2. 清理 Gradle 缓存

已执行：

```bash
# 停止所有 Gradle 守护进程
./gradlew --stop

# 清理缓存
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\caches"
```

## 进一步解决方案

### 方案 1：关闭杀毒软件（临时）

如果使用 Windows Defender 或其他杀毒软件：

1. 临时关闭实时保护
2. 将 Gradle 缓存目录添加到排除列表：
   - `C:\Users\yunxi\.gradle\`
   - 项目目录 `android\`

### 方案 2：增加系统文件句柄限制

Windows 系统默认限制较低，可以通过注册表修改：

1. 打开注册表编辑器（regedit）
2. 导航到：`HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\Session Manager\SubSystems`
3. 修改 `Windows` 键值，增加 `SharedSection` 参数

**注意**：修改注册表有风险，建议先尝试其他方案。

### 方案 3：使用 Gradle Wrapper 离线模式

如果网络不稳定导致下载失败：

```bash
# 在 android 目录下执行
./gradlew --offline assembleDebug
```

### 方案 4：手动删除损坏的 Gradle 发行版

```powershell
# 删除特定版本的 Gradle
Remove-Item -Recurse -Force "$env:USERPROFILE\.gradle\wrapper\dists\gradle-8.14.3-all"

# 重新下载
./gradlew --version
```

### 方案 5：降级 Gradle 版本

如果问题持续，可以降级到更稳定的版本。

修改 `android/gradle/wrapper/gradle-wrapper.properties`：

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.7-all.zip
```

## 构建命令

清理缓存后，按以下顺序执行：

```bash
# 1. 停止守护进程
cd android
./gradlew --stop

# 2. 清理构建
./gradlew clean

# 3. 同步依赖
./gradlew --refresh-dependencies

# 4. 构建项目
./gradlew assembleDebug
```

## Capacitor 同步

Web 构建完成后同步到原生项目：

```bash
# 在项目根目录执行
npm run build
npx cap sync android
```

## 预防措施

1. **定期清理缓存**：每月清理一次 Gradle 缓存
2. **监控磁盘空间**：确保 C 盘至少有 10GB 可用空间
3. **关闭不必要的程序**：构建时关闭其他占用内存的应用
4. **使用 SSD**：将项目和 Gradle 缓存放在 SSD 上

## 系统要求检查

确保系统满足以下要求：

- **可用内存**：至少 4GB（推荐 8GB）
- **磁盘空间**：至少 10GB 可用空间
- **Java 版本**：JDK 17 或更高（Android Studio 自带）
- **Gradle 版本**：8.7+ （项目使用 8.14.3）

## 常见错误码

| 错误                     | 原因                 | 解决方案                    |
| ------------------------ | -------------------- | --------------------------- |
| FileSystemException      | 文件被锁定或资源不足 | 关闭杀毒软件，清理缓存      |
| OutOfMemoryError         | 内存不足             | 降低 Xmx 参数，关闭其他程序 |
| Could not create service | Gradle 缓存损坏      | 删除 .gradle 目录           |

## 联系支持

如果问题仍未解决：

1. 查看完整日志：`./gradlew build --stacktrace --info`
2. 检查 Android Studio 的 Event Log
3. 查看系统事件查看器（Windows 日志）

## 更新记录

- 2026-01-18：初始版本，优化内存配置，添加故障排除步骤
