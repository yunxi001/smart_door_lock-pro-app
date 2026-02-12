import { Stats, PendingCommand, CommandOptions } from "../types";

type EventCallback = (type: string, data: any) => void;

// ============================================
// 超时和重传配置
// ============================================

// 与设备交互的命令（不重传）
const USER_MGMT_TIMEOUT = 90000; // 用户管理命令: 90秒（需要用户物理操作）
const DEVICE_CONTROL_TIMEOUT = 20000; // 设备控制命令: 20秒
const DEVICE_COMMAND_MAX_RETRIES = 0; // 设备命令不重传

// 与服务器交互的命令（需要重传）
const SERVER_COMMAND_TIMEOUT = 3000; // 服务器命令: 3秒
const SERVER_COMMAND_MAX_RETRIES = 3; // 服务器命令重传3次

export class DeviceService {
  private ws: WebSocket | null = null;
  private listeners: EventCallback[] = [];

  // seq_id 生成器
  private seqCounter: number = 0;
  private lastSeqTimestamp: number = 0;

  // 等待响应的命令队列
  private pendingCommands: Map<string, PendingCommand> = new Map();

  // 查询超时追踪（用于检测服务器断开连接的情况）
  private queryTimeouts: Map<string, number> = new Map();

  // 状态追踪
  private stats: Stats = {
    videoFrames: 0,
    videoFps: 0,
    audioPackets: 0,
    dataReceived: 0,
  };

  // FPS 计算
  private fpsFrameCount = 0;
  private fpsLastTime = 0;
  private fpsInterval: any = null;

  // 音频播放 (Rx) - 此时接收 PCM 16kHz
  private audioContext: AudioContext | null = null;
  private audioGain: GainNode | null = null;
  private nextAudioStartTime: number = 0;
  private isAudioInit = false;

  // 音频对讲 (Tx)
  private audioProcessor: ScriptProcessorNode | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private talkContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;

  // 变声功能
  private voiceChangerEnabled: boolean = true; // 默认开启变声（大叔音色）
  private voiceChangerNodes: {
    lowpass?: BiquadFilterNode;
    highshelf?: BiquadFilterNode;
  } = {};

  constructor() {
    this.startFpsCounter();
  }

  // --- 事件处理 ---
  public on(eventName: string, callback: EventCallback) {
    const listener = (type: string, data: any) => {
      if (type === eventName) {
        callback(type, data);
      }
    };
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emit(type: string, data: any) {
    this.listeners.forEach((cb) => cb(type, data));
  }

  // --- 连接管理 ---
  public connect(url: string, deviceId: string, appId: string) {
    if (this.ws) this.disconnect();

    try {
      this.ws = new WebSocket(url);
      this.ws.binaryType = "arraybuffer";
      this.emit("status", "connecting");

      this.ws.onopen = () => {
        this.emit("log", { msg: "WebSocket 连接已建立", type: "success" });

        // 发送认证握手
        const helloMsg = {
          type: "hello",
          device_id: deviceId,
          app_id: appId,
          client_type: "app",
        };

        console.log("发送认证消息:", JSON.stringify(helloMsg));
        this.ws?.send(JSON.stringify(helloMsg));
        this.emit("log", {
          msg: `已发送认证消息 (device_id: ${deviceId})`,
          type: "info",
        });

        // 初始化音频系统
        this.initAudioSystem();
      };

      this.ws.onmessage = (event) => {
        if (typeof event.data === "string") {
          console.log("收到文本消息:", event.data);
          this.handleTextMessage(event.data);
        } else {
          // 二进制消息不打印（太多）
          this.handleBinaryMessage(event.data);
        }
      };

      this.ws.onerror = (err) => {
        console.error("WebSocket 错误详情:", err);
        this.emit("log", { msg: "WebSocket 发生错误", type: "error" });
      };

      this.ws.onclose = (event) => {
        const reason = event.reason || "未知原因";
        const code = event.code;
        const wasClean = event.wasClean ? "正常" : "异常";

        console.log(
          `WebSocket 关闭 - 代码: ${code}, 原因: ${reason}, 状态: ${wasClean}`,
        );

        // 如果是异常关闭，提供更详细的错误信息
        let errorMsg = `WebSocket 连接已关闭 (代码: ${code}, ${wasClean})`;
        if (reason) {
          errorMsg += `: ${reason}`;
        }

        // 特殊处理：如果是在发送命令后立即断开，可能是服务器端错误
        if (code === 1006 || !wasClean) {
          errorMsg += " - 可能是服务器处理请求时出错";
        }

        this.emit("log", {
          msg: errorMsg,
          type: "warning",
        });
        this.emit("status", "disconnected");
        this.stopTalk();
        this.closeAudioSystem();
      };
    } catch (e: any) {
      this.emit("log", { msg: `连接失败: ${e.message}`, type: "error" });
      this.emit("status", "disconnected");
    }
  }

  public disconnect() {
    this.stopTalk();
    this.closeAudioSystem();
    this.clearAllPendingCommands(); // 清理等待队列
    this.clearAllQueryTimeouts(); // 清理查询超时定时器
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.emit("status", "disconnected");
  }

  /**
   * 生成唯一的 seq_id
   * 格式: {timestamp}_{sequence}
   * 当时间戳变化时，序号重置为 0
   */
  public generateSeqId(): string {
    const timestamp = Date.now();

    // 如果时间戳变化，重置计数器
    if (timestamp !== this.lastSeqTimestamp) {
      this.seqCounter = 0;
      this.lastSeqTimestamp = timestamp;
    }

    const seqId = `${timestamp}_${this.seqCounter}`;
    this.seqCounter++;

    return seqId;
  }

  /**
   * 发送命令并支持确认机制
   * @param command 命令对象
   * @param options 可选参数（回调、超时、重试）
   */
  public sendCommand(command: object, options?: CommandOptions): string | null {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.emit("log", { msg: "发送失败：未连接服务器", type: "error" });
      options?.onError?.("未连接服务器");
      return null;
    }

    const seqId = this.generateSeqId();
    const commandWithSeqId = {
      ...command,
      seq_id: seqId,
    };

    // 根据命令类型自动设置超时和重传策略
    const commandType = (command as any).type;
    const { timeout, maxRetries } = this.getCommandConfig(commandType, options);

    const pendingCommand: PendingCommand = {
      seqId,
      command: commandWithSeqId,
      sentAt: Date.now(),
      retryCount: 0,
      onSuccess: options?.onSuccess,
      onError: options?.onError,
    };

    // 启动超时计时器
    pendingCommand.timeoutId = window.setTimeout(() => {
      this.handleTimeout(seqId, maxRetries);
    }, timeout);

    this.pendingCommands.set(seqId, pendingCommand);

    // 发送命令
    this.ws.send(JSON.stringify(commandWithSeqId));

    // 记录命令发送日志
    this.emit("log", {
      msg: `发送命令: ${commandType} (seq_id: ${seqId})`,
      type: "info",
    });

    return seqId;
  }

  /**
   * 根据命令类型获取超时和重传配置
   *
   * 命令分类：
   * 1. 与设备交互的命令（不重传）：
   *    - user_mgmt: 90秒超时，0次重传
   *    - lock_control, dev_control: 20秒超时，0次重传
   *
   * 2. 与服务器交互的命令（需要重传）：
   *    - system, query, face_management, media_download 等: 3秒超时，3次重传
   */
  private getCommandConfig(
    commandType: string,
    options?: CommandOptions,
  ): { timeout: number; maxRetries: number } {
    // 如果用户显式指定了配置，优先使用用户配置
    if (options?.timeout !== undefined && options?.maxRetries !== undefined) {
      return {
        timeout: options.timeout,
        maxRetries: options.maxRetries,
      };
    }

    // 与设备交互的命令（不重传）
    const deviceCommands = ["user_mgmt", "lock_control", "dev_control"];

    if (deviceCommands.includes(commandType)) {
      // 用户管理命令：90秒超时
      if (commandType === "user_mgmt") {
        return {
          timeout: options?.timeout ?? USER_MGMT_TIMEOUT,
          maxRetries: options?.maxRetries ?? DEVICE_COMMAND_MAX_RETRIES,
        };
      }
      // 设备控制命令：20秒超时
      return {
        timeout: options?.timeout ?? DEVICE_CONTROL_TIMEOUT,
        maxRetries: options?.maxRetries ?? DEVICE_COMMAND_MAX_RETRIES,
      };
    }

    // 与服务器交互的命令（需要重传）
    return {
      timeout: options?.timeout ?? SERVER_COMMAND_TIMEOUT,
      maxRetries: options?.maxRetries ?? SERVER_COMMAND_MAX_RETRIES,
    };
  }

  /**
   * 处理命令超时
   *
   * 重传策略：
   * - 与设备交互的命令（user_mgmt, lock_control, dev_control）：不重传
   * - 与服务器交互的命令：重传时使用相同的 seq_id
   */
  private handleTimeout(seqId: string, maxRetries: number): void {
    const pending = this.pendingCommands.get(seqId);
    if (!pending) return;

    const commandType = (pending.command as any).type;

    if (pending.retryCount < maxRetries) {
      // 重传（使用相同的 seq_id）
      pending.retryCount++;
      this.emit("log", {
        msg: `命令超时，正在重传 (${pending.retryCount}/${maxRetries}, seq_id: ${seqId})`,
        type: "warning",
      });

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // 重传时使用相同的命令对象（包含相同的 seq_id）
        this.ws.send(JSON.stringify(pending.command));

        // 获取该命令类型的超时配置
        const { timeout } = this.getCommandConfig(commandType);

        // 重新启动超时计时器
        pending.timeoutId = window.setTimeout(() => {
          this.handleTimeout(seqId, maxRetries);
        }, timeout);
      } else {
        // 连接已断开
        this.clearPendingCommand(seqId, "连接已断开");
      }
    } else {
      // 超过重试次数或不重传的命令
      if (maxRetries === 0) {
        this.clearPendingCommand(seqId, "命令执行超时");
      } else {
        this.clearPendingCommand(
          seqId,
          "请求超时，已重试 " + maxRetries + " 次",
        );
      }
    }
  }

  /**
   * 清理等待中的命令
   */
  private clearPendingCommand(seqId: string, error?: string): void {
    const pending = this.pendingCommands.get(seqId);
    if (!pending) return;

    // 清除超时计时器
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }

    // 触发错误回调
    if (error) {
      pending.onError?.(error);
      this.emit("log", { msg: `命令失败: ${error}`, type: "error" });
    }

    this.pendingCommands.delete(seqId);
  }

  /**
   * 清理所有等待中的命令（断开连接时调用）
   */
  private clearAllPendingCommands(): void {
    this.pendingCommands.forEach((pending, seqId) => {
      if (pending.timeoutId) {
        clearTimeout(pending.timeoutId);
      }
      pending.onError?.("连接已断开");
    });
    this.pendingCommands.clear();
  }

  /**
   * 清理所有查询超时定时器
   */
  private clearAllQueryTimeouts(): void {
    this.queryTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.queryTimeouts.clear();
  }

  // --- 音频系统 (Web Audio API - PCM Playback) ---

  // 必须在用户交互事件中调用此方法（如点击按钮）
  public async resumeAudio() {
    if (this.audioContext && this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
        this.emit("log", { msg: "音频引擎已激活", type: "success" });
      } catch (e) {
        console.error(e);
      }
    }
  }

  private initAudioSystem() {
    if (this.isAudioInit) return;

    try {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      // 这里的 sampleRate 最好设置为 16000 以匹配输入，但通常浏览器会自动重采样
      this.audioContext = new AudioContext();

      this.audioGain = this.audioContext.createGain();
      this.audioGain.connect(this.audioContext.destination);
      this.audioGain.gain.value = 0.8;

      this.nextAudioStartTime = 0;
      this.isAudioInit = true;

      this.emit("log", {
        msg: "音频系统初始化完成 (等待 PCM 数据)",
        type: "info",
      });
    } catch (e: any) {
      console.error("音频系统初始化失败", e);
      this.emit("log", { msg: `音频初始化失败: ${e.message}`, type: "error" });
    }
  }

  private playPCMAudio(pcmData: Int16Array) {
    if (!this.audioContext || !this.audioGain) return;

    // 尝试在数据到达时恢复上下文（如果浏览器允许）
    if (this.audioContext.state === "suspended") {
      // 注意：某些浏览器必须要求显式点击才能 resume，这里只是尝试
      this.audioContext.resume().catch(() => {});
    }

    // 转换 Int16 -> Float32
    const float32Data = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      float32Data[i] = pcmData[i] / 32768.0;
    }

    const buffer = this.audioContext.createBuffer(1, float32Data.length, 16000);
    buffer.copyToChannel(float32Data, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioGain);

    // 调度播放时间，防止声音重叠或卡顿
    const currentTime = this.audioContext.currentTime;
    // 如果下一帧时间已经过期（网络延迟），重置为当前时间 + 小缓冲
    if (this.nextAudioStartTime < currentTime) {
      this.nextAudioStartTime = currentTime + 0.05; // 50ms 缓冲
    }

    source.start(this.nextAudioStartTime);
    this.nextAudioStartTime += buffer.duration;
  }

  private closeAudioSystem() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isAudioInit = false;
  }

  public setVolume(volume: number) {
    if (this.audioGain) {
      this.audioGain.gain.value = Math.max(0, Math.min(1, volume));
      // 调整音量也是用户意图，顺便尝试唤醒
      this.resumeAudio();
    }
  }

  // --- 音频对讲 (Tx - 麦克风) ---

  /**
   * 设置变声功能开关
   * @param enabled true 开启变声（大叔音色），false 关闭变声（原声）
   */
  public setVoiceChanger(enabled: boolean) {
    this.voiceChangerEnabled = enabled;
    this.emit("log", {
      msg: enabled ? "已开启变声（大叔音色）" : "已关闭变声（原声）",
      type: "info",
    });
  }

  /**
   * 获取变声功能状态
   */
  public getVoiceChangerEnabled(): boolean {
    return this.voiceChangerEnabled;
  }

  /**
   * 创建变声处理节点
   * 实现"大叔音色"效果：低沉、浑厚
   */
  private createVoiceChangerNodes(context: AudioContext): {
    input: AudioNode;
    output: AudioNode;
  } {
    // 低通滤波器：增强低频（100-500Hz），让声音更浑厚
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowshelf";
    lowpass.frequency.value = 400; // 增强 400Hz 以下的频率
    lowpass.gain.value = 6; // 提升 6dB

    // 高频衰减滤波器：削弱高频（3000Hz以上），让声音更低沉
    const highshelf = context.createBiquadFilter();
    highshelf.type = "highshelf";
    highshelf.frequency.value = 2500; // 衰减 2500Hz 以上的频率
    highshelf.gain.value = -8; // 降低 8dB

    // 连接滤波器链
    lowpass.connect(highshelf);

    // 保存节点引用，方便后续清理
    this.voiceChangerNodes = { lowpass, highshelf };

    return {
      input: lowpass,
      output: highshelf,
    };
  }

  public async startTalk() {
    if (this.mediaStream) return;

    // 检查浏览器支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.emit("log", {
        msg: "浏览器无法访问麦克风。请检查权限或是否在 localhost/https 环境下运行。",
        type: "error",
      });
      return;
    }

    try {
      this.resumeAudio(); // 确保 Context 激活

      // 24kHz 采样率与 ESP32 常用配置匹配
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.talkContext = new AudioContext({ sampleRate: 24000 });
      const source = this.talkContext.createMediaStreamSource(this.mediaStream);

      // 创建变声处理链（如果启用）
      let processingInput: AudioNode = source;
      if (this.voiceChangerEnabled) {
        const voiceChanger = this.createVoiceChangerNodes(this.talkContext);
        source.connect(voiceChanger.input);
        processingInput = voiceChanger.output;
      }

      // 检测 AudioWorklet 支持
      const supportsAudioWorklet = "audioWorklet" in this.talkContext;

      if (supportsAudioWorklet) {
        // 使用 AudioWorklet（现代方案）
        try {
          await this.talkContext.audioWorklet.addModule("/audio-processor.js");

          this.audioWorkletNode = new AudioWorkletNode(
            this.talkContext,
            "audio-capture-processor",
          );

          // 监听来自 AudioWorklet 的消息
          this.audioWorkletNode.port.onmessage = (event) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

            // event.data 是 ArrayBuffer (Int16 PCM)
            this.ws.send(event.data);
          };

          processingInput.connect(this.audioWorkletNode);
          this.audioWorkletNode.connect(this.talkContext.destination);

          this.emit("talkState", true);
          const voiceMode = this.voiceChangerEnabled ? "大叔音色" : "原声";
          this.emit("log", {
            msg: `开始对讲 (AudioWorklet, PCM 24kHz, ${voiceMode})`,
            type: "success",
          });
        } catch (workletError) {
          // AudioWorklet 加载失败，降级到 ScriptProcessorNode
          console.warn(
            "AudioWorklet 加载失败，降级到 ScriptProcessorNode:",
            workletError,
          );
          this.startTalkWithScriptProcessor(processingInput);
        }
      } else {
        // 浏览器不支持 AudioWorklet，使用 ScriptProcessorNode（降级方案）
        this.startTalkWithScriptProcessor(processingInput);
      }
    } catch (e: any) {
      console.error(e);
      this.emit("log", {
        msg: `启动麦克风失败: ${e.name} - ${e.message}`,
        type: "error",
      });
      this.stopTalk();
    }
  }

  /**
   * 使用 ScriptProcessorNode 进行音频采集（降级方案）
   * @param source 音频源节点（可能已经过变声处理）
   */
  private startTalkWithScriptProcessor(source: AudioNode) {
    if (!this.talkContext) return;

    this.audioProcessor = this.talkContext.createScriptProcessor(4096, 1, 1);

    this.audioProcessor.onaudioprocess = (e) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // Float32 转 Int16 PCM
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      this.ws.send(pcm16.buffer);
    };

    source.connect(this.audioProcessor);
    this.audioProcessor.connect(this.talkContext.destination);

    this.emit("talkState", true);
    const voiceMode = this.voiceChangerEnabled ? "大叔音色" : "原声";
    this.emit("log", {
      msg: `开始对讲 (ScriptProcessorNode, PCM 24kHz, ${voiceMode})`,
      type: "success",
    });
  }

  public stopTalk() {
    // 清理变声节点
    if (this.voiceChangerNodes.lowpass) {
      this.voiceChangerNodes.lowpass.disconnect();
      this.voiceChangerNodes.lowpass = undefined;
    }
    if (this.voiceChangerNodes.highshelf) {
      this.voiceChangerNodes.highshelf.disconnect();
      this.voiceChangerNodes.highshelf = undefined;
    }

    // 清理 AudioWorklet
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode.port.onmessage = null;
      this.audioWorkletNode = null;
    }

    // 清理 ScriptProcessorNode
    if (this.audioProcessor) {
      this.audioProcessor.disconnect();
      this.audioProcessor = null;
    }

    // 清理 AudioContext
    if (this.talkContext) {
      this.talkContext.close();
      this.talkContext = null;
    }

    // 停止媒体流
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    this.emit("talkState", false);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // 不要在断开连接时发送无意义的日志
      if (this.ws.readyState === WebSocket.OPEN) {
        this.emit("log", { msg: "对讲已结束", type: "info" });
      }
    }
  }

  // --- 消息处理 ---
  private handleTextMessage(data: string) {
    try {
      const msg = JSON.parse(data);

      if (msg.type === "hello") {
        if (msg.status === "ok") {
          this.emit("status", "connected");
          this.emit("log", { msg: "认证成功", type: "success" });
        } else {
          this.emit("log", { msg: `认证失败: ${msg.message}`, type: "error" });
          this.disconnect();
        }
      } else if (msg.type === "server_ack") {
        // 处理服务器确认消息
        this.handleServerAck(msg);
      } else if (msg.type === "device_status") {
        // 处理设备上下线通知
        this.handleDeviceStatus(msg);
      } else if (msg.type === "status_report") {
        // 处理设备状态上报
        this.handleStatusReport(msg);
      } else if (msg.type === "event_report") {
        // 处理事件上报
        this.handleEventReport(msg);
      } else if (msg.type === "log_report") {
        // 处理开锁日志
        this.handleLogReport(msg);
      } else if (msg.type === "door_opened_report") {
        // 处理门已开启上报
        this.handleDoorOpenedReport(msg);
      } else if (msg.type === "password_report") {
        // 处理密码上报
        this.handlePasswordReport(msg);
      } else if (msg.type === "face_management") {
        this.emit("face_response", msg);
      } else if (msg.type === "visit_notification") {
        this.emit("visit", msg.data);
      } else if (msg.type === "user_mgmt_result") {
        // 处理用户管理结果（指纹、NFC、密码）
        this.handleUserMgmtResult(msg);
      } else if (msg.type === "media_download") {
        // 处理媒体下载响应
        this.handleMediaDownload(msg);
      } else if (msg.type === "media_download_chunk") {
        // 处理媒体分片下载响应
        this.handleMediaDownloadChunk(msg);
      } else if (msg.type === "system") {
        const type = msg.status === "success" ? "success" : "error";
        const statusText = msg.status === "success" ? "成功" : "失败";
        this.emit("log", {
          msg: `系统指令: ${msg.command} - ${statusText}`,
          type,
        });
      } else if (msg.type === "query_result") {
        // 处理查询结果
        this.handleQueryResult(msg);
      } else if (msg.type === "ack") {
        // 处理 ESP32 ack 响应
        this.handleAck(msg);
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * 处理 server_ack 消息
   * 协议 v2.4 规范：只用于接收确认，不涉及业务逻辑
   *
   * code=0: 服务器已收到，继续等待 ESP32 ack
   * code=3: 参数错误，清理队列并触发错误
   * code=8: 未认证，清理队列并触发错误
   * code=9: 重复消息，清理队列但不触发错误
   *
   * 注意：设备状态错误（如设备离线、设备忙）应在 ack 响应中返回
   */
  private handleServerAck(msg: {
    type: string;
    seq_id: string;
    code: number;
    msg: string;
    ts: number;
  }) {
    const { seq_id, code, msg: message } = msg;

    // 记录收到的 server_ack 日志（统一格式）
    this.emit("log", {
      msg: `收到响应: server_ack (seq_id: ${seq_id}, code: ${code})`,
      type: "info",
    });

    // 触发 server_ack 事件，供上层组件订阅
    this.emit("server_ack", msg);

    const pending = this.pendingCommands.get(seq_id);
    if (!pending) {
      // 命令不在等待队列中（可能已超时或已处理）
      return;
    }

    // 根据 code 字段处理不同情况（v2.4 协议）
    switch (code) {
      case 0:
        // 成功 - 服务器已收到，继续等待 ESP32 的 ack，不清理队列
        this.emit("log", {
          msg: `服务器已确认命令 (seq_id: ${seq_id})，等待设备执行`,
          type: "info",
        });
        // 不清理队列，保持等待状态
        break;

      case 3:
        // 参数错误
        this.emit("log", {
          msg: `参数错误 (seq_id: ${seq_id})`,
          type: "error",
        });
        this.clearPendingCommand(seq_id, "参数错误");
        break;

      case 8:
        // 未认证
        this.emit("log", {
          msg: `未认证，请重新连接 (seq_id: ${seq_id})`,
          type: "error",
        });
        this.clearPendingCommand(seq_id, "未认证");
        break;

      case 9:
        // 重复消息 - 清理队列但不触发错误回调
        this.emit("log", {
          msg: `检测到重复消息 (seq_id: ${seq_id})`,
          type: "info",
        });
        if (pending.timeoutId) {
          clearTimeout(pending.timeoutId);
        }
        this.pendingCommands.delete(seq_id);
        // 注意：不调用 onError，因为这不是真正的错误
        break;

      default:
        // 未知错误码 - 可能是旧版协议或服务器错误
        this.emit("log", {
          msg: `收到未知响应码: ${code} - ${message} (seq_id: ${seq_id})`,
          type: "warning",
        });
        // 对于未知错误码，清理队列并触发错误
        this.clearPendingCommand(seq_id, `服务器返回未知错误码: ${code}`);
    }
  }

  /**
   * 处理 ESP32 ack 响应
   * 命令执行的最终确认
   *
   * code=0: 执行成功
   * code=1-10: 执行失败，显示对应错误信息
   */
  private handleAck(msg: {
    type: string;
    seq_id: string;
    code: number;
    msg: string;
  }) {
    const { seq_id, code, msg: message } = msg;

    // 记录收到的 ack 日志（统一格式）
    this.emit("log", {
      msg: `收到响应: ack (seq_id: ${seq_id}, code: ${code})`,
      type: "info",
    });

    // 触发 ack 事件，供上层组件订阅
    this.emit("ack", msg);

    const pending = this.pendingCommands.get(seq_id);
    if (!pending) {
      // 命令不在等待队列中（可能已超时或已处理）
      return;
    }

    // 清除超时计时器
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }

    // 根据 code 处理结果
    if (code === 0) {
      // 执行成功
      pending.onSuccess?.();
      this.emit("log", {
        msg: `命令执行成功 (seq_id: ${seq_id})`,
        type: "success",
      });
    } else {
      // 执行失败 - 获取错误描述
      const errorMsg = this.getAckErrorMessage(code, message);
      pending.onError?.(errorMsg);
      this.emit("log", {
        msg: `命令执行失败 (seq_id: ${seq_id}): ${errorMsg}`,
        type: "error",
      });
    }

    // 从等待队列中移除
    this.pendingCommands.delete(seq_id);
  }

  /**
   * 获取 ESP32 ack 错误码对应的中文描述
   * 协议 v2.4 统一错误码范围：0-10
   * 为特定错误码添加用户友好的操作建议
   */
  private getAckErrorMessage(code: number, defaultMsg: string): string {
    const errorMap: Record<number, string> = {
      0: "成功",
      1: "设备离线，请检查网络连接",
      2: "设备忙碌，请稍后重试",
      3: "参数错误，请检查输入",
      4: "设备不支持该操作",
      5: "操作超时，请重试",
      6: "硬件故障，请联系维修",
      7: "存储空间已满，请清理后重试",
      8: "权限不足，请重新认证",
      9: "重复操作，已忽略",
      10: "设备内部错误，请重启设备",
    };
    return errorMap[code] || defaultMsg || `未知错误 (code: ${code})`;
  }

  /**
   * 处理设备上下线通知
   */
  private handleDeviceStatus(msg: {
    type: string;
    status: "online" | "offline";
    device_id: string;
    ts: number;
    reason?: string;
  }) {
    const { status, device_id, reason } = msg;

    // 触发 device_status 事件
    this.emit("device_status", msg);

    if (status === "online") {
      this.emit("log", { msg: `设备 ${device_id} 已上线`, type: "success" });
    } else {
      const reasonText = reason ? ` (${reason})` : "";
      this.emit("log", {
        msg: `设备 ${device_id} 已离线${reasonText}`,
        type: "warning",
      });
    }
  }

  /**
   * 处理设备状态上报
   * 包含电量、光照、锁状态、补光灯状态
   */
  private handleStatusReport(msg: {
    type: string;
    ts: number;
    data: { bat: number; lux: number; lock: number; light: number };
  }) {
    const { data } = msg;

    // 转换为 DeviceStatus 格式并触发事件
    const deviceStatus = {
      battery: data.bat,
      lockState: data.lock,
      lightState: data.light,
      lux: data.lux,
      online: true,
    };

    this.emit("status_report", deviceStatus);
    this.emit("log", {
      msg: `状态更新: 电量 ${data.bat}%, 锁状态 ${data.lock === 0 ? "锁定" : "开启"}`,
      type: "info",
    });
  }

  /**
   * 处理事件上报
   * 包含门铃、PIR触发、撬锁、开门、关门、上锁成功、锁舌报警、低电量等事件
   */
  private handleEventReport(msg: {
    type: string;
    ts: number;
    event: string;
    param: number;
  }) {
    const { event, param } = msg;

    // 触发 event_report 事件
    this.emit("event_report", msg);

    // 根据事件类型生成通知
    let eventText = "";
    let logType: "info" | "warning" | "error" = "info";

    switch (event) {
      case "bell":
        eventText = "有人按门铃";
        logType = "info";
        break;
      case "pir_trigger":
        eventText = "检测到移动";
        logType = "info";
        break;
      case "tamper":
        eventText = "撬锁报警！";
        logType = "error";
        break;
      case "door_open":
        eventText = "门已打开";
        logType = "info";
        break;
      case "door_closed":
        eventText = "门已关闭";
        logType = "info";
        break;
      case "lock_success":
        eventText = "上锁成功";
        logType = "info";
        break;
      case "bolt_alarm":
        eventText = "锁舌上锁失败，请尝试远程上锁";
        logType = "warning";
        break;
      case "low_battery":
        eventText = `低电量警告 (${param}%)`;
        logType = "warning";
        break;
      default:
        eventText = `未知事件: ${event}`;
        logType = "warning";
    }

    this.emit("log", { msg: eventText, type: logType });
  }

  /**
   * 处理开锁日志
   * 根据协议 v2.3 规范，使用 status 和 lock_time 字段
   */
  private handleLogReport(msg: {
    type: string;
    ts: number;
    data: { method: string; uid: number; status: string; lock_time: number };
  }) {
    const { data } = msg;

    // 触发 log_report 事件
    this.emit("log_report", msg);

    // 生成日志消息
    const methodText = this.getUnlockMethodText(data.method);
    const statusText = this.getUnlockStatusText(data.status);
    const logType = data.status === "success" ? "success" : "warning";

    this.emit("log", {
      msg: `开锁记录: ${methodText} - ${statusText}`,
      type: logType,
    });
  }

  /**
   * 获取开锁状态的中文描述
   * status 值：'success' | 'fail' | 'locked'
   */
  private getUnlockStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      success: "成功",
      fail: "失败",
      locked: "超时",
    };
    return statusMap[status] || status;
  }

  /**
   * 获取开锁方式的中文描述
   */
  private getUnlockMethodText(method: string): string {
    const methodMap: Record<string, string> = {
      face: "人脸识别",
      fingerprint: "指纹",
      password: "密码",
      nfc: "NFC卡片",
      remote: "远程开锁",
      temp_code: "临时密码",
      key: "钥匙",
    };
    return methodMap[method] || method;
  }

  /**
   * 处理门已开启上报
   * 包含开门方式和来源（外侧/内侧/未知）
   */
  private handleDoorOpenedReport(msg: {
    type: string;
    ts: number;
    data: { method: string; source: "outside" | "inside" | "unknown" };
  }) {
    const { data } = msg;

    // 触发 door_opened_report 事件
    this.emit("door_opened_report", msg);

    // 生成日志消息
    const methodText = this.getUnlockMethodText(data.method);
    const sourceText = this.getDoorSourceText(data.source);

    this.emit("log", {
      msg: `门已开启: ${methodText} (${sourceText})`,
      type: "info",
    });
  }

  /**
   * 获取开门来源的中文描述
   */
  private getDoorSourceText(source: string): string {
    const sourceMap: Record<string, string> = {
      outside: "外侧",
      inside: "内侧",
      unknown: "未知",
    };
    return sourceMap[source] || source;
  }

  /**
   * 处理密码上报
   * 用于查询密码结果返回，不存储到数据库
   */
  private handlePasswordReport(msg: {
    type: string;
    ts: number;
    data: { password: string };
  }) {
    const { data } = msg;

    // 触发 password_report 事件，将密码数据传递给订阅者
    this.emit("password_report", msg);

    // 记录日志（不显示密码内容）
    this.emit("log", { msg: "收到密码查询结果", type: "info" });
  }

  // ============================================
  // user_mgmt_result 处理 (需求 11.12, 12.12, 13.15)
  // ============================================

  /**
   * 用户管理结果消息接口
   *
   * 服务器返回格式：
   * {
   *   "type": "user_mgmt_result",
   *   "category": "finger" | "nfc" | "password",
   *   "command": "add" | "del" | "query",
   *   "result": true | false,  // 布尔值，表示操作是否成功
   *   "val": number,            // 返回值（如查询数量、新增ID等）
   *   "msg": string             // 消息（如 "Success", "AlreadyExists" 等）
   * }
   */
  private handleUserMgmtResult(msg: {
    type: string;
    category: "finger" | "nfc" | "password";
    command: string;
    result: boolean; // 服务器返回布尔值
    val?: number; // 返回值
    msg?: string; // 消息
    user_id?: number;
    data?: any;
    message?: string;
    progress?: number;
  }): void {
    const {
      category,
      command,
      result,
      val,
      msg: serverMsg,
      user_id,
      data,
      message,
      progress,
    } = msg;

    // 获取类别中文名
    const categoryText = this.getUserMgmtCategoryText(category);
    const commandText = this.getUserMgmtCommandText(command);

    // 转换服务器的布尔值为字符串状态
    const status = result ? "success" : "failed";
    const errorMessage = serverMsg || message || "未知错误";

    // 根据 category 触发对应事件
    switch (category) {
      case "finger":
        this.emit("finger_result", {
          command,
          result: status,
          userId: user_id,
          val,
          data,
          message: errorMessage,
          progress,
        });
        break;
      case "nfc":
        this.emit("nfc_result", {
          command,
          result: status,
          userId: user_id,
          val,
          data,
          message: errorMessage,
          progress,
        });
        break;
      case "password":
        this.emit("password_result", {
          command,
          result: status,
          userId: user_id,
          val,
          data,
          message: errorMessage,
        });
        break;
    }

    // 记录日志
    if (result) {
      // 成功情况
      let successMsg = `${categoryText}${commandText}成功`;

      // 特殊处理某些消息
      if (serverMsg === "AlreadyExists") {
        successMsg = `${categoryText}已存在，跳过重复录入`;
      } else if (command === "query" && val !== undefined) {
        successMsg = `${categoryText}${commandText}成功，共 ${val} 条`;
      }

      this.emit("log", {
        msg: successMsg,
        type: "success",
      });
    } else {
      // 失败情况
      this.emit("log", {
        msg: `${categoryText}${commandText}失败: ${errorMessage}`,
        type: "error",
      });
    }
  }

  // ============================================
  // 媒体下载响应处理 (需求 15.2, 15.3)
  // ============================================

  /**
   * 处理媒体下载响应
   * 解析完整文件下载响应
   */
  private handleMediaDownload(msg: {
    type: string;
    file_id: number;
    status: "success" | "error";
    data?: string; // Base64 编码的文件内容
    file_size?: number;
    file_type?: string;
    error?: string;
  }): void {
    const { file_id, status, data, file_size, file_type, error } = msg;

    // 触发 media_download 事件
    this.emit("media_download", {
      fileId: file_id,
      status,
      data,
      fileSize: file_size,
      fileType: file_type,
      error,
    });

    if (status === "success") {
      const sizeText = file_size ? ` (${this.formatFileSize(file_size)})` : "";
      this.emit("log", { msg: `媒体文件下载完成${sizeText}`, type: "success" });
    } else {
      this.emit("log", {
        msg: `媒体文件下载失败: ${error || "未知错误"}`,
        type: "error",
      });
    }
  }

  /**
   * 处理媒体分片下载响应
   * 解析分片下载响应
   */
  private handleMediaDownloadChunk(msg: {
    type: string;
    file_id: number;
    chunk_index: number;
    status: "success" | "error";
    data?: string; // Base64 编码的分片内容
    chunk_size?: number;
    total_chunks?: number;
    is_last?: boolean;
    error?: string;
  }): void {
    const {
      file_id,
      chunk_index,
      status,
      data,
      chunk_size,
      total_chunks,
      is_last,
      error,
    } = msg;

    // 触发 media_download_chunk 事件
    this.emit("media_download_chunk", {
      fileId: file_id,
      chunkIndex: chunk_index,
      status,
      data,
      chunkSize: chunk_size,
      totalChunks: total_chunks,
      isLast: is_last,
      error,
    });

    if (status === "success") {
      // 计算下载进度
      if (total_chunks && total_chunks > 0) {
        const progress = Math.round(((chunk_index + 1) / total_chunks) * 100);
        this.emit("media_download_progress", {
          fileId: file_id,
          progress,
          chunkIndex: chunk_index,
          totalChunks: total_chunks,
        });
      }

      if (is_last) {
        this.emit("log", {
          msg: `媒体文件分片下载完成 (ID: ${file_id})`,
          type: "success",
        });
      }
    } else {
      this.emit("log", {
        msg: `媒体分片下载失败: ${error || "未知错误"}`,
        type: "error",
      });
    }
  }

  /**
   * 格式化文件大小
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }

  // ============================================
  // 用户管理命令方法 (需求 11.8, 11.11, 12.8, 12.11, 13.7)
  // ============================================

  /**
   * 发送用户管理命令
   * 支持 finger、nfc、password 三种 category
   *
   * 配置：90秒超时，不重传（需要用户物理操作）
   *
   * @param category 管理类别: finger | nfc | password
   * @param command 命令: query | add | del | set
   * @param userId 用户 ID（可选，添加时为 0，删除时为具体 ID）
   * @param payload 附加数据（可选，如密码设置时的新密码）
   * @param userName 用户备注名称（可选，协议 v2.4 新增，仅 add 命令时有效）
   * @returns seq_id 或 null
   */
  public sendUserMgmtCommand(
    category: "finger" | "nfc" | "password",
    command: string,
    userId?: number,
    payload?: string,
    userName?: string,
  ): string | null {
    const msg: Record<string, any> = {
      type: "user_mgmt",
      category,
      command,
      user_id: userId ?? 0,
    };

    // 如果有 payload（如密码设置），添加到消息中
    if (payload !== undefined) {
      msg.payload = payload;
    }

    // 协议 v2.4 新增：如果有 user_name（用户备注），添加到消息中
    // 仅在 add 命令时有效，Server 会将其存储到数据库
    if (userName !== undefined && command === "add") {
      msg.user_name = userName;
    }

    // 用户管理命令会自动使用 90 秒超时，不重传
    const seqId = this.sendCommand(msg, {
      onError: (error) => {
        // 超时或失败时触发错误事件
        this.emit(`${category}_error`, {
          command,
          error,
          category,
        });
      },
    });

    // 记录日志
    const categoryText = this.getUserMgmtCategoryText(category);
    const commandText = this.getUserMgmtCommandText(command);
    const nameText = userName ? ` (${userName})` : "";
    this.emit("log", {
      msg: `发送${categoryText}${commandText}命令${nameText} (90秒超时，不重传)`,
      type: "info",
    });

    return seqId;
  }

  /**
   * 获取用户管理类别的中文描述
   */
  private getUserMgmtCategoryText(category: string): string {
    const categoryMap: Record<string, string> = {
      finger: "指纹",
      nfc: "NFC卡片",
      password: "密码",
    };
    return categoryMap[category] || category;
  }

  /**
   * 获取用户管理命令的中文描述
   */
  private getUserMgmtCommandText(command: string): string {
    const commandMap: Record<string, string> = {
      query: "查询",
      add: "添加",
      del: "删除",
      set: "设置",
    };
    return commandMap[command] || command;
  }

  // ============================================
  // 查询命令方法 (需求 9.1, 9.2, 9.3)
  // ============================================

  /**
   * 发送查询命令
   *
   * 配置：3秒超时，重传3次（与服务器交互）
   *
   * @param target 查询目标: status | status_history | events | unlock_logs | media_files
   * @param data 可选的查询参数（如 limit, offset 等分页参数）
   */
  public sendQuery(target: string, data?: Record<string, any>): void {
    const msg: Record<string, any> = {
      type: "query",
      target,
    };

    // 如果有额外的查询参数，添加到消息中
    if (data) {
      msg.data = data;
    }

    // 记录日志（在发送前记录，确保测试可以捕获）
    const targetText = this.getQueryTargetText(target);
    this.emit("log", {
      msg: `发送查询命令: ${targetText} (3秒超时，重传3次)`,
      type: "info",
    });

    // 发送命令（会自动使用服务器命令配置：3秒超时，重传3次）
    this.sendCommand(msg);
  }

  /**
   * 获取查询目标的中文描述
   */
  private getQueryTargetText(target: string): string {
    const targetMap: Record<string, string> = {
      status: "设备状态",
      status_history: "历史状态",
      events: "事件记录",
      unlock_logs: "开锁日志",
      media_files: "媒体文件列表",
      password: "设备密码",
      doorlock_users: "门锁用户列表",
    };
    return targetMap[target] || target;
  }

  // ============================================
  // 媒体下载命令方法 (需求 15.1)
  // ============================================

  /**
   * 发送媒体下载命令
   *
   * 配置：3秒超时，重传3次（与服务器交互）
   *
   * @param fileIdOrPath 媒体文件 ID 或文件路径
   */
  public sendMediaDownload(fileIdOrPath: number | string): void {
    const msg: Record<string, any> = {
      type: "media_download",
    };

    // 根据参数类型决定使用 file_id 还是 file_path
    if (typeof fileIdOrPath === "number") {
      msg.file_id = fileIdOrPath;
      this.emit("log", {
        msg: `请求下载媒体文件 (ID: ${fileIdOrPath}, 3秒超时，重传3次)`,
        type: "info",
      });
    } else {
      msg.file_path = fileIdOrPath;
      this.emit("log", {
        msg: `请求下载媒体文件 (路径: ${fileIdOrPath}, 3秒超时，重传3次)`,
        type: "info",
      });
    }

    // 会自动使用服务器命令配置：3秒超时，重传3次
    this.sendCommand(msg);
  }

  /**
   * 发送分片下载命令（用于大文件）
   *
   * 配置：3秒超时，重传3次（与服务器交互）
   *
   * @param fileId 媒体文件 ID
   * @param chunkIndex 分片索引（从 0 开始）
   * @param chunkSize 分片大小（默认 1MB）
   */
  public sendMediaDownloadChunk(
    fileId: number,
    chunkIndex: number,
    chunkSize: number = 1048576,
  ): void {
    // 会自动使用服务器命令配置：3秒超时，重传3次
    this.sendCommand({
      type: "media_download_chunk",
      file_id: fileId,
      chunk_index: chunkIndex,
      chunk_size: chunkSize,
    });
    this.emit("log", {
      msg: `请求下载媒体分片 (ID: ${fileId}, 分片: ${chunkIndex}, 3秒超时，重传3次)`,
      type: "info",
    });
  }

  // ============================================
  // 人脸管理命令方法 (需求 10.1, 10.2, 10.3)
  // ============================================

  /**
   * 发送人脸管理命令
   *
   * 配置：3秒超时，重传3次（与服务器交互）
   *
   * @param action 操作类型: register | get_persons | delete_person | update_permission | get_visits
   * @param data 可选的操作数据
   */
  public sendFaceManagement(action: string, data?: Record<string, any>): void {
    const msg: Record<string, any> = {
      type: "face_management",
      action,
    };

    // 如果有额外的数据，添加到消息中
    if (data) {
      msg.data = data;
    }

    // 对于 register 操作，验证必要字段
    if (action === "register" && data) {
      const requiredFields = ["name", "relation_type", "images", "permission"];
      const missingFields = requiredFields.filter((field) => !data[field]);

      if (missingFields.length > 0) {
        this.emit("log", {
          msg: `人脸注册失败：缺少必要字段 ${missingFields.join(", ")}`,
          type: "error",
        });
        return;
      }
    }

    // 会自动使用服务器命令配置：3秒超时，重传3次
    this.sendCommand(msg);

    // 记录日志
    const actionText = this.getFaceManagementActionText(action);
    this.emit("log", {
      msg: `发送人脸管理命令: ${actionText} (3秒超时，重传3次)`,
      type: "info",
    });
  }

  /**
   * 获取人脸管理操作的中文描述
   */
  private getFaceManagementActionText(action: string): string {
    const actionMap: Record<string, string> = {
      register: "注册人脸",
      get_persons: "获取人员列表",
      delete_person: "删除人员",
      update_permission: "更新权限",
      get_visits: "获取到访记录",
    };
    return actionMap[action] || action;
  }

  // ============================================
  // 系统命令方法 (需求 12.1, 12.2, 12.4)
  // ============================================

  /**
   * 发送系统命令
   *
   * 配置：3秒超时，重传3次（与服务器交互）
   *
   * @param command 命令类型: start_monitor | stop_monitor
   * @param data 可选的命令数据（如 start_monitor 的 record 字段）
   */
  public sendSystemCommand(command: string, data?: Record<string, any>): void {
    const msg: Record<string, any> = {
      type: "system",
      command,
    };

    // 如果有额外的数据，添加到消息中
    if (data) {
      Object.assign(msg, data);
    }

    // 会自动使用服务器命令配置：3秒超时，重传3次
    this.sendCommand(msg);

    // 记录日志
    const commandText = this.getSystemCommandText(command);
    this.emit("log", {
      msg: `发送系统命令: ${commandText} (3秒超时，重传3次)`,
      type: "info",
    });
  }

  /**
   * 获取系统命令的中文描述
   */
  private getSystemCommandText(command: string): string {
    const commandMap: Record<string, string> = {
      start_monitor: "启动监控",
      stop_monitor: "停止监控",
    };
    return commandMap[command] || command;
  }

  /**
   * 查询设备密码（从服务器数据库查询）
   * 协议 v2.4 新增接口
   *
   * 配置：3秒超时，重传3次（与服务器交互）
   *
   * @param onSuccess 成功回调，返回密码字符串
   * @param onError 失败回调
   * @returns seq_id 或 null
   */
  public queryPassword(
    onSuccess?: (password: string) => void,
    onError?: (error: string) => void,
  ): string | null {
    // 发送查询命令
    const seqId = this.sendCommand(
      {
        type: "query",
        target: "password",
      },
      {
        onSuccess: () => {
          // 实际的密码数据会通过 password_query_result 事件返回
          // 这里的 onSuccess 只是确认命令发送成功
        },
        onError,
      },
    );

    // 如果提供了成功回调，订阅 password_query_result 事件
    if (onSuccess && seqId) {
      const unsubscribe = this.on("password_query_result", (type, data) => {
        onSuccess(data.password);
        unsubscribe(); // 取消订阅，避免重复触发
      });
    }

    return seqId;
  }

  /**
   * 查询门锁用户列表（从服务器数据库查询）
   * 协议 v2.4 新增接口 - 第 9.7 节
   *
   * 配置：3秒超时，重传3次（与服务器交互）
   *
   * @param userType 用户类型过滤：'finger' | 'nfc' | 'password'，不填则查询所有类型
   * @param limit 返回条数，默认 100，最大 500
   * @param offset 偏移量，默认 0
   * @returns seq_id 或 null
   */
  public queryDoorlockUsers(
    userType?: "finger" | "nfc" | "password",
    limit: number = 100,
    offset: number = 0,
  ): string | null {
    const data: Record<string, any> = {
      limit,
      offset,
    };

    // 如果指定了用户类型，添加过滤条件
    if (userType) {
      data.user_type = userType;
    }

    // 发送查询命令
    const seqId = this.sendCommand({
      type: "query",
      target: "doorlock_users",
      data,
    });

    // 记录日志
    const typeText = userType
      ? this.getUserMgmtCategoryText(userType)
      : "所有类型";
    this.emit("log", {
      msg: `查询门锁用户列表: ${typeText} (3秒超时，重传3次)`,
      type: "info",
    });

    return seqId;
  }

  /**
   * 处理查询结果
   * 解析 query_result 响应并触发对应事件
   *
   * 注意：根据协议 v2.3，响应格式为：
   * {
   *   "type": "query_result",
   *   "target": "unlock_logs",
   *   "status": "success",
   *   "data": {
   *     "records": [...],  // 实际数据在 data.records 中
   *     "total": 201,
   *     "limit": 100,
   *     "offset": 0
   *   }
   * }
   */
  private handleQueryResult(msg: {
    type: string;
    target: string;
    status: "success" | "error";
    data?: any; // 可能是对象（包含 records）或数组
    total?: number;
    error?: string;
  }) {
    const { target, status, error } = msg;
    let { data, total } = msg;

    // 触发 query_result 事件
    this.emit("query_result", msg);

    if (status === "error") {
      this.emit("log", {
        msg: `查询失败: ${error || "未知错误"}`,
        type: "error",
      });
      return;
    }

    // 兼容两种响应格式：
    // 1. 新格式：data 是对象，包含 records、total、limit、offset
    // 2. 旧格式：data 是数组，total 在顶层
    let records: any[] = [];
    if (data) {
      if (Array.isArray(data)) {
        // 旧格式：data 直接是数组
        records = data;
      } else if (data.records && Array.isArray(data.records)) {
        // 新格式：data.records 是数组
        records = data.records;
        // 如果 data 中有 total，使用它
        if (data.total !== undefined) {
          total = data.total;
        }
      }
    }

    // 根据 target 类型触发特定事件
    switch (target) {
      case "status":
        this.emit("status_query_result", {
          data: records,
          total: total || 0,
        });
        this.emit("log", {
          msg: `获取设备状态成功`,
          type: "success",
        });
        break;
      case "status_history":
        this.emit("status_history_result", {
          data: records,
          total: total || 0,
        });
        this.emit("log", {
          msg: `获取历史状态成功，共 ${records.length} 条`,
          type: "success",
        });
        break;
      case "events":
        // 转换服务器返回的字段名称以匹配 App 端类型定义
        // 服务器: event_type, created_at
        // App 端: event, timestamp
        const transformedEvents = records.map((record: any) => ({
          id: record.id,
          event: record.event_type || record.event, // 兼容两种格式
          param: record.param || 0,
          timestamp: record.created_at || record.timestamp, // 兼容两种格式
        }));

        this.emit("events_result", {
          data: transformedEvents,
          total: total || 0,
        });
        this.emit("log", {
          msg: `获取事件记录成功，共 ${transformedEvents.length} 条`,
          type: "success",
        });
        break;
      case "unlock_logs":
        // 转换服务器返回的字段名称以匹配 App 端类型定义
        // 服务器: user_id, result (1/0), created_at
        // App 端: uid, status ('success'/'fail'), timestamp
        const transformedLogs = records.map((record: any) => ({
          id: record.id,
          method: record.method,
          uid: record.user_id || record.uid || 0,
          status:
            record.result === 1
              ? "success"
              : record.result === 0
                ? "fail"
                : record.status || "unknown",
          lock_time: record.lock_time || 0,
          timestamp: record.created_at || record.timestamp,
          user_name: record.user_name,
          // 视频附件字段
          hasVideo: record.has_video || false,
          mediaId: record.media_id,
          videoFilePath: record.video_file_path,
          videoFileSize: record.video_file_size,
          videoDuration: record.video_duration,
          videoThumbnailUrl: record.video_thumbnail_url,
        }));

        this.emit("unlock_logs_result", {
          data: transformedLogs,
          total: total || 0,
        });
        this.emit("log", {
          msg: `获取开锁记录成功，共 ${transformedLogs.length} 条`,
          type: "success",
        });
        break;
      case "media_files":
        this.emit("media_files_result", {
          data: records,
          total: total || 0,
        });
        this.emit("log", {
          msg: `获取媒体文件列表成功，共 ${records.length} 条`,
          type: "success",
        });
        break;
      case "password":
        // 协议 v2.4 新增：密码查询
        // 从服务器数据库查询密码，不存在时返回默认值 "123456"
        const password = data?.password || "123456";
        this.emit("password_query_result", { password });
        this.emit("log", {
          msg: "密码查询成功",
          type: "success",
        });
        break;
      case "doorlock_users":
        // 协议 v2.4 新增：门锁用户列表查询
        // 查询设备的指纹、NFC、密码用户列表
        this.emit("doorlock_users_result", {
          data: records,
          total: total || 0,
        });
        this.emit("log", {
          msg: `获取门锁用户列表成功，共 ${records.length} 条`,
          type: "success",
        });
        break;
      default:
        this.emit("log", { msg: `查询结果: ${target}`, type: "info" });
    }
  }

  private handleBinaryMessage(data: ArrayBuffer) {
    const buffer = new Uint8Array(data);
    this.stats.dataReceived += buffer.length;
    this.emit("stats", { ...this.stats });

    // BinaryProtocol2 解析 (16 字节头部)
    if (buffer.length >= 16) {
      const version = (buffer[0] << 8) | buffer[1];
      const type = (buffer[2] << 8) | buffer[3];
      const reserved =
        (buffer[4] << 24) | (buffer[5] << 16) | (buffer[6] << 8) | buffer[7];
      const payloadSize =
        (buffer[12] << 24) |
        (buffer[13] << 16) |
        (buffer[14] << 8) |
        buffer[15];

      if (version === 2 && type === 0) {
        // 安全检查 payload 长度
        if (buffer.length < 16 + payloadSize) return;

        const payload = buffer.slice(16, 16 + payloadSize);

        if (reserved === 0) {
          // --- 音频数据包 (PCM Int16) ---
          this.stats.audioPackets++;

          // 将 Uint8Array 重新解释为 Int16Array
          // 注意字节序，通常 PCM 是小端序 (Little Endian)
          // 如果服务器发送的是大端序，需要手动转换
          // 这里假设服务器发送的是小端序 (ESP32 标准)
          const pcmData = new Int16Array(
            payload.buffer,
            payload.byteOffset,
            payload.byteLength / 2,
          );
          this.playPCMAudio(pcmData);
        } else {
          // --- 视频数据包 (JPEG) ---
          this.stats.videoFrames++;
          this.fpsFrameCount++;

          const blob = new Blob([payload], { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);
          this.emit("frame", url);
        }
      }
    }
  }

  // --- 统计 ---
  private startFpsCounter() {
    this.fpsLastTime = performance.now();
    this.fpsFrameCount = 0;
    this.fpsInterval = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - this.fpsLastTime) / 1000;
      const fps = elapsed > 0 ? this.fpsFrameCount / elapsed : 0;

      this.stats.videoFps = Number(fps.toFixed(1));
      this.emit("stats", { ...this.stats });

      this.fpsFrameCount = 0;
      this.fpsLastTime = now;
    }, 1000);
  }
}

export const deviceService = new DeviceService();
