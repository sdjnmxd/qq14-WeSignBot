import { log } from './utils/logger';

/**
 * 简单的频率控制器
 * 提供随机延迟功能，基本上算是模拟真实用户行为
 */
export class FrequencyController {
  private minDelay: number;
  private maxDelay: number;

  /**
   * @param minDelay 构造参数最小延迟（可选）
   * @param maxDelay 构造参数最大延迟（可选）
   * @param configObj 可选，支持 { globalMinDelay, globalMaxDelay } 配置对象
   */
  constructor(configManager: { getMinDelay: () => number; getMaxDelay: () => number }) {
    this.minDelay = configManager.getMinDelay();
    this.maxDelay = configManager.getMaxDelay();
  }

  /**
   * 随机延迟
   */
  async randomDelay(): Promise<void> {
    const delay = Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
    log.debug(`随机延迟 ${delay}ms...`);
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 设置延迟范围
   */
  setDelayRange(minDelay: number, maxDelay: number): void {
    this.minDelay = minDelay;
    this.maxDelay = maxDelay;
    log.debug(`更新延迟范围: ${minDelay}ms - ${maxDelay}ms`);
  }

  /**
   * 获取当前延迟范围
   */
  getDelayRange(): { min: number; max: number } {
    return { min: this.minDelay, max: this.maxDelay };
  }
} 