/**
 * AudioWorklet 处理器
 * 用于音频对讲功能的音频采集
 * 采样率: 24kHz, 单声道
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  /**
   * 处理音频数据
   * @param {Float32Array[][]} inputs - 输入音频数据
   * @param {Float32Array[][]} outputs - 输出音频数据（未使用）
   * @param {Object} parameters - 参数（未使用）
   * @returns {boolean} - 返回 true 继续处理
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    // 确保有输入数据
    if (input && input.length > 0) {
      const inputData = input[0]; // 获取第一个声道（单声道）
      
      if (inputData && inputData.length > 0) {
        // 将 Float32 转换为 Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // 限制范围在 [-1, 1]
          const s = Math.max(-1, Math.min(1, inputData[i]));
          // 转换为 Int16
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        
        // 发送 PCM 数据到主线程
        this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
      }
    }
    
    // 返回 true 继续处理
    return true;
  }
}

// 注册处理器
registerProcessor('audio-capture-processor', AudioCaptureProcessor);
