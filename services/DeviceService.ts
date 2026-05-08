import { Stats } from "../types";

type EventCallback = (type: string, data: any) => void;

export class DeviceService {
  private ws: WebSocket | null = null;
  private listeners: EventCallback[] = [];

  // 单命令模式状态 (v6.0: 替代 pendingCommands Map)
  private commandInProgress: boolean = false;
  private pendingResolve: (() => void) | null = null;
  private pendingReject: ((error: any) => void) | null = null;
  private pendingResponseType: "ack" | "user_mgmt_result" = "ack";
  private commandTimeoutId: number | null = null;

  // HTTP API token (hello成功后保存，同步给DoorlockApiService)
  private authToken: string | null = null;

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
    this.clearCommandState(); // 清理单命令状态
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.emit("status", "disconnected");
  }

  // ============================================
  // 单命令模式 (v6.0: 替代 seq_id + pendingCommands)
  // ============================================

  /**
   * 发送命令（单命令模式，返回Promise）
   *
   * @param command 命令对象（不添加seq_id，直接发送）
   * @param timeout 超时时间（毫秒），默认10秒
   * @param responseType 等待的响应类型。lock_control/dev_control/system 用 'ack'，user_mgmt 用 'user_mgmt_result'
   */
  public async sendCommand(
    command: object,
    timeout: number = 10000,
    responseType: "ack" | "user_mgmt_result" = "ack",
  ): Promise<void> {
    if (this.commandInProgress) {
      throw new Error("请等待上一个命令完成");
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("未连接服务器");
    }

    return new Promise((resolve, reject) => {
      this.commandInProgress = true;
      this.pendingResponseType = responseType;
      this.pendingResolve = resolve;
      this.pendingReject = reject;

      // 发送命令（v6.0: 不添加 seq_id）
      this.ws!.send(JSON.stringify(command));

      const commandType = (command as any).type;
      this.emit("log", {
        msg: `发送命令: ${commandType}`,
        type: "info",
      });

      // 设置超时
      this.commandTimeoutId = window.setTimeout(() => {
        const errorMsg = "命令执行超时，请重试";
        this.emit("log", { msg: `命令失败: ${errorMsg}`, type: "error" });
        this.clearCommandState();
        reject(new Error(errorMsg));
      }, timeout);
    });
  }

  private resolveCommand(success: boolean, message?: string): void {
    if (this.commandTimeoutId) {
      clearTimeout(this.commandTimeoutId);
      this.commandTimeoutId = null;
    }
    if (success) {
      this.pendingResolve?.();
    } else {
      this.pendingReject?.(new Error(message || "命令执行失败"));
      this.emit("log", {
        msg: `命令执行失败: ${message || "未知错误"}`,
        type: "error",
      });
    }
    this.clearCommandState();
  }

  private clearCommandState(): void {
    if (this.commandTimeoutId) {
      clearTimeout(this.commandTimeoutId);
      this.commandTimeoutId = null;
    }
    this.commandInProgress = false;
    this.pendingResolve = null;
    this.pendingReject = null;
    this.pendingResponseType = "ack";
  }

  /**
   * 获取保存的 authToken（hello认证成功后由 handleTextMessage 设置）
   */
  public getAuthToken(): string | null {
    return this.authToken;
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

  // --- 消息处理 (v6.0 精简版) ---
  private handleTextMessage(data: string) {
    try {
      const msg = JSON.parse(data);

      if (msg.type === "hello") {
        if (msg.status === "ok") {
          // v6.0: 保存 token 用于 HTTP API 认证
          if (msg.token) {
            this.authToken = msg.token;
          }
          this.emit("status", "connected");
          this.emit("log", { msg: "认证成功", type: "success" });
        } else {
          this.emit("log", { msg: `认证失败: ${msg.message}`, type: "error" });
          this.disconnect();
        }
      } else if (msg.type === "device_status") {
        this.handleDeviceStatus(msg);
      } else if (msg.type === "status_report") {
        this.handleStatusReport(msg);
      } else if (msg.type === "event_report") {
        this.handleEventReport(msg);
      } else if (msg.type === "log_report") {
        this.handleLogReport(msg);
      } else if (msg.type === "door_opened_report") {
        this.handleDoorOpenedReport(msg);
      } else if (msg.type === "visit_notification") {
        this.emit("visit", msg.data);
      } else if (msg.type === "visitor_intent_notification") {
        this.handleVisitorIntentNotification(msg);
      } else if (msg.type === "user_mgmt_result") {
        this.handleUserMgmtResult(msg);
      } else if (msg.type === "system") {
        const type = msg.status === "success" ? "success" : "error";
        const statusText = msg.status === "success" ? "成功" : "失败";
        this.emit("log", {
          msg: `系统指令: ${msg.command} - ${statusText}`,
          type,
        });
      } else if (msg.type === "ack") {
        this.handleAck(msg);
      }
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * 处理 ESP32 ack 响应 (v6.0: 单命令模式，无seq_id)
   */
  private handleAck(msg: { type: string; code: number; msg: string }) {
    const { code, msg: message } = msg;

    this.emit("log", {
      msg: `收到响应: ack (code: ${code})`,
      type: "info",
    });
    this.emit("ack", msg);

    // 只处理ack类型的命令
    if (!this.commandInProgress || this.pendingResponseType !== "ack") {
      return;
    }

    this.resolveCommand(code === 0, message || (code === 0 ? "ok" : "命令执行失败"));
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

  // ============================================
  // user_mgmt_result 处理 (v6.0: emit事件 + resolve Promise)

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
    result: boolean;
    val?: number;
    msg?: string;
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

    const categoryText = this.getUserMgmtCategoryText(category);
    const commandText = this.getUserMgmtCommandText(command);

    const status = result ? "success" : "failed";
    const errorMessage = serverMsg || message || "未知错误";

    // 先emit事件（让App.tsx拿到val、category等详细信息更新列表）
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
      let successMsg = `${categoryText}${commandText}成功`;
      if (serverMsg === "AlreadyExists") {
        successMsg = `${categoryText}已存在，跳过重复录入`;
      } else if (command === "query" && val !== undefined) {
        successMsg = `${categoryText}${commandText}成功，共 ${val} 条`;
      }
      this.emit("log", { msg: successMsg, type: "success" });
    } else {
      this.emit("log", {
        msg: `${categoryText}${commandText}失败: ${errorMessage}`,
        type: "error",
      });
    }

    // v6.0: 如果是user_mgmt命令在等待此响应，resolve Promise
    if (this.commandInProgress && this.pendingResponseType === "user_mgmt_result") {
      this.resolveCommand(result, serverMsg);
    }
  }

  // ============================================
  // 用户管理命令方法 (v6.0: async, 等待 user_mgmt_result)
  // ============================================

  /**
   * 发送用户管理命令（async，等待 user_mgmt_result 响应）
   *
   * @param category 管理类别: finger | nfc | password
   * @param command 命令: query | add | del | set
   * @param userId 用户 ID（可选，添加时为 0，删除时为具体 ID）
   * @param payload 附加数据（可选，如密码设置时的新密码）
   * @param userName 用户备注名称（可选，仅 add 命令时有效）
   */
  public async sendUserMgmtCommand(
    category: "finger" | "nfc" | "password",
    command: string,
    userId?: number,
    payload?: string,
    userName?: string,
  ): Promise<void> {
    const msg: Record<string, any> = {
      type: "user_mgmt",
      category,
      command,
      user_id: userId ?? 0,
    };

    if (payload !== undefined) {
      msg.payload = payload;
    }

    if (userName !== undefined && command === "add") {
      msg.user_name = userName;
    }

    const categoryText = this.getUserMgmtCategoryText(category);
    const commandText = this.getUserMgmtCommandText(command);
    const nameText = userName ? ` (${userName})` : "";
    this.emit("log", {
      msg: `发送${categoryText}${commandText}命令${nameText}`,
      type: "info",
    });

    try {
      await this.sendCommand(msg, 90000, "user_mgmt_result");
    } catch (error: any) {
      this.emit(`${category}_error`, { command, error: error.message, category });
      throw error;
    }
  }

  private getUserMgmtCategoryText(category: string): string {
    const categoryMap: Record<string, string> = {
      finger: "指纹", nfc: "NFC卡片", password: "密码",
    };
    return categoryMap[category] || category;
  }

  private getUserMgmtCommandText(command: string): string {
    const commandMap: Record<string, string> = {
      query: "查询", add: "添加", del: "删除", set: "设置",
    };
    return commandMap[command] || command;
  }

  // ============================================
  // 系统命令方法 (v6.0: async)
  // ============================================

  public async sendSystemCommand(
    command: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const msg: Record<string, any> = { type: "system", command };
    if (data) Object.assign(msg, data);

    const commandMap: Record<string, string> = {
      start_monitor: "启动监控", stop_monitor: "停止监控",
    };
    const commandText = commandMap[command] || command;
    this.emit("log", {
      msg: `发送系统命令: ${commandText}`,
      type: "info",
    });

    await this.sendCommand(msg, 10000, "ack");
  }

  /**
   * 处理访客意图通知消息 (v2.5保留)
   *
   * 消息格式：
   * {
   *   type: "visitor_intent_notification",
   *   visit_id: number,
   *   session_id: string,
   *   person_info: { person_id, name, relation_type },
   *   intent_summary: { intent_type, summary, important_notes, ai_analysis },
   *   dialogue_history: [{ role, content }],
   *   package_check?: { threat_level, action, description },
   *   ts: number
   * }
   */
  private handleVisitorIntentNotification(msg: any) {
    try {
      // 验证必需字段
      if (!msg.visit_id || !msg.session_id || !msg.intent_summary) {
        throw new Error("访客意图消息缺少必需字段");
      }

      // 提取访客意图数据
      const visitorIntent = {
        visit_id: msg.visit_id,
        session_id: msg.session_id,
        person_info: msg.person_info || {},
        intent_summary: msg.intent_summary,
        dialogue_history: msg.dialogue_history || [],
        package_check: msg.package_check,
        ts: msg.ts || Date.now(),
      };

      // 触发访客意图事件
      this.emit("visitor_intent", visitorIntent);

      // 记录日志
      const personName = msg.person_info?.name || "未知访客";
      const intentType = msg.intent_summary?.intent_type || "other";
      this.emit("log", {
        msg: `收到访客意图通知: ${personName} - ${intentType}`,
        type: "info",
      });

      // 如果包含 package_check 字段，提取快递警报数据
      if (msg.package_check) {
        const packageAlert = {
          session_id: msg.session_id,
          threat_level: msg.package_check.threat_level,
          action: msg.package_check.action,
          description: msg.package_check.description,
          ts: msg.ts || Date.now(),
        };

        // 触发快递警报事件
        this.emit("package_alert", packageAlert);

        // 记录日志
        const threatLevelText = this.getThreatLevelText(
          msg.package_check.threat_level,
        );
        this.emit("log", {
          msg: `快递警报: ${threatLevelText} - ${msg.package_check.description}`,
          type: msg.package_check.threat_level === "high" ? "error" : "warning",
        });
      }
    } catch (error) {
      console.error("访客意图消息解析失败:", error);
      this.emit("log", {
        msg: "访客意图消息格式错误，已跳过",
        type: "error",
      });
    }
  }

  /**
   * 获取威胁等级的中文描述
   */
  private getThreatLevelText(level: string): string {
    switch (level) {
      case "low":
        return "低威胁";
      case "medium":
        return "中威胁";
      case "high":
        return "高威胁";
      default:
        return "未知威胁";
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
