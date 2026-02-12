# Android 权限配置说明

## 核心配置文件

- `android/app/src/main/AndroidManifest.xml` - 权限声明和应用配置
- `android/app/src/main/res/xml/network_security_config.xml` - 网络安全配置

## 网络安全配置

### WebSocket 明文连接支持（测试环境）

为了在 HTTPS 环境（Capacitor WebView）下支持 ws:// 明文 WebSocket 连接，需要配置：

**1. AndroidManifest.xml 中添加：**

```xml
<application
    android:usesCleartextTraffic="true"
    android:networkSecurityConfig="@xml/network_security_config">
```

**2. network_security_config.xml 配置：**

```xml
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
</network-security-config>
```

**⚠️ 安全提示**：

- 此配置仅用于开发测试环境
- 生产环境必须使用 `wss://` 加密连接
- 可通过 `<domain-config>` 限制特定域名使用明文连接

---

## 权限清单

### 核心功能权限 (必需)

| 权限                    | 用途          | 对应功能               | 运行时请求        |
| ----------------------- | ------------- | ---------------------- | ----------------- |
| `INTERNET`              | 网络访问      | WebSocket 连接门锁设备 | ❌ 安装时授予     |
| `ACCESS_NETWORK_STATE`  | 网络状态检测  | 判断设备在线状态       | ❌ 安装时授予     |
| `ACCESS_WIFI_STATE`     | WiFi 状态检测 | 局域网设备发现         | ❌ 安装时授予     |
| `RECORD_AUDIO`          | 麦克风访问    | 双向对讲 - 语音发送    | ✅ 首次使用时请求 |
| `MODIFY_AUDIO_SETTINGS` | 音频设置管理  | 调整对讲音量           | ❌ 安装时授予     |
| `CAMERA`                | 摄像头访问    | 人脸录入拍照           | ✅ 首次使用时请求 |

### 存储权限 (可选)

| 权限                     | 适用版本     | 用途                     |
| ------------------------ | ------------ | ------------------------ |
| `READ_EXTERNAL_STORAGE`  | Android ≤ 12 | 读取相册图片用于人脸录入 |
| `WRITE_EXTERNAL_STORAGE` | Android ≤ 12 | 保存监控截图/录像        |
| `READ_MEDIA_IMAGES`      | Android ≥ 13 | 读取相册图片             |
| `READ_MEDIA_VIDEO`       | Android ≥ 13 | 读取视频文件             |

### 通知权限

| 权限                 | 适用版本     | 用途             |
| -------------------- | ------------ | ---------------- |
| `POST_NOTIFICATIONS` | Android ≥ 13 | 显示到访提醒通知 |
| `VIBRATE`            | 全版本       | 通知振动         |

### 后台服务权限 (可选)

| 权限                            | 适用版本     | 用途                    |
| ------------------------------- | ------------ | ----------------------- |
| `FOREGROUND_SERVICE`            | Android ≥ 9  | 后台保持 WebSocket 连接 |
| `FOREGROUND_SERVICE_CAMERA`     | Android ≥ 14 | 后台访问摄像头          |
| `FOREGROUND_SERVICE_MICROPHONE` | Android ≥ 14 | 后台访问麦克风          |
| `WAKE_LOCK`                     | 全版本       | 监控时保持屏幕常亮      |

## 硬件特性声明

```xml
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
<uses-feature android:name="android.hardware.microphone" android:required="false" />
```

设置 `required="false"` 表示这些硬件不是强制要求,没有摄像头/麦克风的设备也能安装应用(但相关功能不可用)。

## 运行时权限请求时机

### 1. 麦克风权限 (RECORD_AUDIO)

**请求时机**: 用户首次点击"开始对讲"按钮时

**代码位置**: `MonitorScreen.tsx` - `startTalking()` 函数

**提示文案建议**:

```
需要麦克风权限才能与访客对讲
```

### 2. 摄像头权限 (CAMERA)

**请求时机**: 用户在人脸管理页面点击"拍照"按钮时

**代码位置**: `screens/HomeScreen.tsx` - 人脸录入功能

**提示文案建议**:

```
需要摄像头权限才能拍照录入人脸
```

### 3. 通知权限 (POST_NOTIFICATIONS, Android 13+)

**请求时机**: 应用启动时或用户首次收到到访记录时

**提示文案建议**:

```
允许通知以便及时收到访客到访提醒
```

## 网络安全配置

### usesCleartextTraffic

```xml
android:usesCleartextTraffic="true"
```

**用途**: 允许使用明文 WebSocket 连接 (`ws://`)

**安全建议**:

- ✅ 开发/测试环境: 可以使用 `ws://`
- ⚠️ 生产环境: 强烈建议使用 `wss://` 加密连接
- 如果生产环境必须使用 `wss://`,可以移除此配置或设置为 `false`

### 网络安全配置文件 (可选)

如果需要更精细的控制,可以创建 `res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- 仅允许特定域名使用明文连接 -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">192.168.1.0/24</domain>
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
```

然后在 `AndroidManifest.xml` 中引用:

```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

## 版本兼容性

| 配置项            | 最低版本         | 目标版本        | 编译版本 |
| ----------------- | ---------------- | --------------- | -------- |
| minSdkVersion     | 24 (Android 7.0) | -               | -        |
| targetSdkVersion  | -                | 36 (Android 15) | -        |
| compileSdkVersion | -                | -               | 36       |

## 权限配置文件位置

```
android/app/src/main/AndroidManifest.xml
```

## 验证权限配置

构建 APK 后,可以使用以下命令查看应用请求的权限:

```bash
# 查看 APK 权限
aapt dump permissions app-debug.apk

# 或使用 Android Studio
# Build → Analyze APK → 选择 APK 文件 → 查看 AndroidManifest.xml
```

## 常见问题

### Q: 为什么麦克风/摄像头权限请求失败?

A: 确保在 `AndroidManifest.xml` 中已声明对应权限,并在代码中正确调用 `getUserMedia()` API。

### Q: Android 13+ 设备无法显示通知?

A: 需要在运行时请求 `POST_NOTIFICATIONS` 权限,不会自动授予。

### Q: WebSocket 连接失败 (ERR_CLEARTEXT_NOT_PERMITTED)?

A: 检查 `usesCleartextTraffic` 是否设置为 `true`,或改用 `wss://` 连接。

### Q: 后台运行时连接断开?

A: 需要实现前台服务 (Foreground Service) 并声明相应权限,防止系统杀死进程。

## 隐私政策要求

根据 Google Play 政策,使用以下权限需要在隐私政策中说明:

- ✅ 摄像头 (CAMERA) - 说明用于人脸录入
- ✅ 麦克风 (RECORD_AUDIO) - 说明用于双向对讲
- ✅ 位置信息 (如果使用) - 本应用未使用
- ✅ 存储访问 - 说明用于保存监控截图

## 更新日志

- 2025-01-18: 初始版本,添加所有核心功能权限
- 2025-01-18: 添加 Android 13+ 媒体权限和通知权限
- 2025-01-18: 添加前台服务权限以支持后台运行

