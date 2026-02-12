# Capacitor 移动端打包规范

## 技术栈

- 原生容器: Capacitor 6.x
- 目标平台: iOS / Android
- Web 构建输出目录: `dist/`

## 关键约束

### WebSocket 连接

- iOS 默认禁止 WS 明文连接，需配置 ATS 例外或使用 `wss://`
- Android 需设置 `usesCleartextTraffic="true"` 或使用 `wss://`
- 生产环境必须使用 `wss://` 加密连接

### 音频与媒体

- Web Audio API 需用户交互后才能播放（浏览器安全策略）
- `getUserMedia` 在 Capacitor WebView 中可用（满足 HTTPS 要求）
- 后台音频需配置原生音频会话

### 必需权限

| 功能     | iOS (Info.plist)                 | Android (AndroidManifest.xml)      |
| -------- | -------------------------------- | ---------------------------------- |
| 对讲     | `NSMicrophoneUsageDescription`   | `RECORD_AUDIO`                     |
| 人脸录入 | `NSCameraUsageDescription`       | `CAMERA`                           |
| 设备连接 | `NSLocalNetworkUsageDescription` | `INTERNET`, `ACCESS_NETWORK_STATE` |

## 开发命令

```bash
npm run build          # 构建 Web
npx cap sync           # 同步到原生项目
npx cap open ios       # 打开 Xcode
npx cap open android   # 打开 Android Studio
```

## 代码规范

- 修改 `capacitor.config.ts` 后必须运行 `npx cap sync`
- 添加新权限时，iOS 和 Android 配置需同步更新
- 使用 Capacitor 插件优先于 Web API（如 `@capacitor/camera` 替代 `getUserMedia` 拍照）
