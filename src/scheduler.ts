import { AccountConfig, ScheduleConfig, AccountExecutionStatus, AccountExecutionResult } from './types';
import { ConfigManager } from './configManager';
import { AccountExecutor } from './accountExecutor';
import { log } from './utils/logger';

export class Scheduler {
  private configManager: ConfigManager;
  private accountExecutor: AccountExecutor;
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private executionStatus: Map<string, AccountExecutionStatus> = new Map();
  private isRunning: boolean = false;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.accountExecutor = new AccountExecutor(configManager);
    this.initializeExecutionStatus();
  }

  /**
   * 初始化执行状态
   */
  private initializeExecutionStatus(): void {
    const accounts = this.configManager.getEnabledAccounts();
    for (const account of accounts) {
      this.executionStatus.set(account.id, {
        accountId: account.id,
        accountName: account.name || account.id,
        executionCount: 0,
        successCount: 0,
        errorCount: 0,
        isRunning: false
      });
    }
  }

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      log.warn('调度器已在运行中');
      return;
    }

    log.info('启动多账号调度器...');
    this.isRunning = true;

    const accounts = this.configManager.getEnabledAccounts();
    if (accounts.length === 0) {
      log.warn('没有启用的账号，请先配置账号信息');
      return;
    }

    log.info(`发现 ${accounts.length} 个启用的账号`);

    // 为每个账号设置定时器
    for (const account of accounts) {
      await this.scheduleAccount(account);
    }

    log.success('调度器启动完成');
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    log.info('停止调度器...');
    this.isRunning = false;

    // 清除所有定时器
    for (const [accountId, timer] of this.timers) {
      clearTimeout(timer);
      this.timers.delete(accountId);
    }

    log.success('调度器已停止');
  }

  /**
   * 为单个账号设置定时器
   */
  private async scheduleAccount(account: AccountConfig): Promise<void> {
    const status = this.executionStatus.get(account.id);
    if (!status) {
      log.error(`账号状态不存在: ${account.id}`);
      return;
    }

    // 检查是否在启动时立即执行
    if (account.schedule.runOnStart) {
      log.info(`账号 ${account.name || account.id} 将在启动时立即执行`);
      setTimeout(() => this.executeAccount(account), 1000); // 延迟1秒执行
    }

    // 设置定时执行
    this.setupAccountTimers(account);
  }

  /**
   * 设置账号的定时器
   */
  private setupAccountTimers(account: AccountConfig): void {
    const status = this.executionStatus.get(account.id);
    if (!status) return;

    // 清除现有定时器
    const existingTimer = this.timers.get(account.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 计算下次执行时间
    const nextExecution = this.calculateNextExecution(account.schedule);
    if (!nextExecution) {
      log.warn(`账号 ${account.name || account.id} 没有有效的执行计划`);
      return;
    }

    const delay = nextExecution.getTime() - Date.now();
    
    if (delay <= 0) {
      // 如果延迟为负数，立即执行
      log.info(`账号 ${account.name || account.id} 立即执行`);
      setTimeout(() => this.executeAccount(account), 1000);
    } else {
      // 设置定时器
      const timer = setTimeout(() => {
        this.executeAccount(account);
        // 执行完成后重新设置定时器
        this.setupAccountTimers(account);
      }, delay);

      this.timers.set(account.id, timer);
      
      const nextTime = nextExecution.toLocaleTimeString('zh-CN', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      log.info(`账号 ${account.name || account.id} 下次执行时间: ${nextTime}`);
    }

    // 更新状态
    status.nextExecution = nextExecution;
    this.executionStatus.set(account.id, status);
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextExecution(schedule: ScheduleConfig): Date | null {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // 当前时间（分钟）

    if (schedule.times && schedule.times.length > 0) {
      // 使用固定时间点
      const timeMinutes = schedule.times.map(time => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
      });

      // 找到下一个执行时间
      const nextTime = timeMinutes.find(time => time > currentTime);
      if (nextTime !== undefined) {
        const nextDate = new Date();
        nextDate.setHours(Math.floor(nextTime / 60), nextTime % 60, 0, 0);
        return nextDate;
      } else {
        // 如果今天没有更多时间点，设置为明天的第一个时间点
        const firstTime = Math.min(...timeMinutes);
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(Math.floor(firstTime / 60), firstTime % 60, 0, 0);
        return nextDate;
      }
    } else if (schedule.interval) {
      // 使用间隔时间
      const nextDate = new Date(now.getTime() + schedule.interval * 60 * 1000);
      return nextDate;
    }

    return null;
  }

  /**
   * 执行单个账号的任务
   */
  private async executeAccount(account: AccountConfig): Promise<void> {
    const status = this.executionStatus.get(account.id);
    if (!status) return;

    if (status.isRunning) {
      log.warn(`账号 ${account.name || account.id} 正在执行中，跳过本次执行`);
      return;
    }

    status.isRunning = true;
    status.lastExecution = new Date();
    status.executionCount++;

    log.info(`开始执行账号: ${account.name || account.id}`);

    try {
      const result = await this.accountExecutor.executeAccount(account);
      
      if (result.success) {
        status.successCount++;
        log.success(`账号 ${account.name || account.id} 执行成功`);
        
        if (result.stats) {
          log.subInfo(`完成任务: ${result.stats.completedTasks}/${result.stats.totalTasks}`);
          log.subInfo(`获得积分: 光之币 +${result.stats.coins}, 友谊水晶 +${result.stats.crystals}`);
        }
      } else {
        status.errorCount++;
        status.lastError = result.error;
        log.error(`账号 ${account.name || account.id} 执行失败: ${result.error}`);
      }
    } catch (error) {
      status.errorCount++;
      status.lastError = error instanceof Error ? error.message : String(error);
      log.error(`账号 ${account.name || account.id} 执行异常:`, status.lastError);
    } finally {
      status.isRunning = false;
      this.executionStatus.set(account.id, status);
    }
  }

  /**
   * 手动执行指定账号
   */
  async executeAccountNow(accountId: string): Promise<AccountExecutionResult | null> {
    const account = this.configManager.getAccountById(accountId);
    if (!account) {
      log.error(`账号不存在: ${accountId}`);
      return null;
    }

    if (!account.enabled) {
      log.warn(`账号已禁用: ${accountId}`);
      return null;
    }

    log.info(`手动执行账号: ${account.name || account.id}`);
    return await this.accountExecutor.executeAccount(account);
  }

  /**
   * 获取所有账号的执行状态
   */
  getExecutionStatus(): AccountExecutionStatus[] {
    return Array.from(this.executionStatus.values());
  }

  /**
   * 获取指定账号的执行状态
   */
  getAccountExecutionStatus(accountId: string): AccountExecutionStatus | undefined {
    return this.executionStatus.get(accountId);
  }

  /**
   * 重新加载配置并重启调度器
   */
  async reload(): Promise<void> {
    log.info('重新加载配置...');
    
    // 停止当前调度器
    this.stop();
    
    // 重新加载配置
    this.configManager.reloadConfig();
    this.initializeExecutionStatus();
    
    // 重新启动调度器
    await this.start();
  }

  /**
   * 检查调度器是否正在运行
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
} 