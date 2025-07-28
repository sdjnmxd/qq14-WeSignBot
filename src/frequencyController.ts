import { log } from './utils/logger';

/**
 * 简单的频率控制器
 * 提供随机延迟功能，基本上算是模拟真实用户行为
 */
export class FrequencyController {
  private minDelay: number;
  private maxDelay: number;

  /**
   * @param minDelay 最小延迟（毫秒）
   * @param maxDelay 最大延迟（毫秒）
   */
  constructor(minDelay: number = 1000, maxDelay: number = 3000) {
    this.validateDelayRange(minDelay, maxDelay);
    this.minDelay = minDelay;
    this.maxDelay = maxDelay;
  }

  /**
   * 验证延迟范围的合理性
   */
  private validateDelayRange(minDelay: number, maxDelay: number): void {
    if (minDelay < 0 || maxDelay < 0) {
      throw new Error('延迟时间不能为负数');
    }
    if (minDelay > maxDelay) {
      throw new Error('最小延迟不能大于最大延迟');
    }
  }

  /**
   * 随机延迟
   */
  async randomDelay(): Promise<void> {
    const delay = this.generateRandomDelay();
    log.debug(`随机延迟 ${delay}ms...`);
    return this.wait(delay);
  }

  /**
   * 生成随机延迟时间（可测试的方法）
   */
  generateRandomDelay(): number {
    return Math.floor(Math.random() * (this.maxDelay - this.minDelay + 1)) + this.minDelay;
  }

  /**
   * 等待指定时间（可测试的方法）
   */
  async wait(delay: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 设置延迟范围
   */
  setDelayRange(minDelay: number, maxDelay: number): void {
    this.validateDelayRange(minDelay, maxDelay);
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