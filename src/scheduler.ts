import { ConfigManager } from './configManager';
import { AccountExecutor } from './accountExecutor';
import { AccountConfig, AccountExecutionResult } from './types';
import { log } from './utils/logger';
import * as schedule from 'node-schedule';

export class Scheduler {
  private configManager: ConfigManager;
  private accountExecutor: AccountExecutor;
  private jobs: Map<string, schedule.Job> = new Map();
  private isRunning: boolean = false;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.accountExecutor = new AccountExecutor(configManager);
  }

  /**
   * 启动调度器
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      log.warn('调度器已在运行中');
      return;
    }

    const accounts = this.configManager.getEnabledAccounts();
    if (accounts.length === 0) {
      log.warn('没有启用的账号');
      return;
    }

    this.isRunning = true;
    log.info(`启动调度器，管理 ${accounts.length} 个账号`);

    // 为每个账号设置定时任务
    for (const account of accounts) {
      await this.scheduleAccount(account);
    }

    log.success('调度器启动完成');
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (!this.isRunning) return;

    log.info('停止调度器...');
    this.isRunning = false;

    // 停止所有定时任务
    for (const [accountId, job] of this.jobs) {
      job.cancel();
    }
    this.jobs.clear();

    log.success('调度器已停止');
  }

  /**
   * 为单个账号设置定时任务
   */
  private async scheduleAccount(account: AccountConfig): Promise<void> {
    // 检查是否在启动时立即执行
    if (account.schedule.runOnStart) {
      log.info(`账号 ${account.name || account.id} 将在启动时立即执行`);
      setTimeout(() => this.executeAccount(account), 1000);
    }

    // 设置定时执行
    this.setupScheduleJob(account);
  }

  /**
   * 设置定时任务
   */
  private setupScheduleJob(account: AccountConfig): void {
    // 停止现有的定时任务
    const existingJob = this.jobs.get(account.id);
    if (existingJob) {
      existingJob.cancel();
    }

    // 生成定时规则
    const rule = this.generateScheduleRule(account.schedule.times);
    if (!rule) {
      log.warn(`账号 ${account.name || account.id} 没有有效的执行计划`);
      return;
    }

    // 创建定时任务
    const job = schedule.scheduleJob(rule, () => {
      this.executeAccount(account);
    });

    this.jobs.set(account.id, job);
    log.info(`账号 ${account.name || account.id} 定时任务已设置`);
  }

  /**
   * 生成定时规则
   */
  private generateScheduleRule(times: string[]): schedule.RecurrenceRule | null {
    if (!times || times.length === 0) return null;

    const minutes: number[] = [];
    const hours: number[] = [];

    for (const time of times) {
      const [hour, minute] = time.split(':').map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
        hours.push(hour);
        minutes.push(minute);
      }
    }

    if (hours.length === 0) return null;

    const rule = new schedule.RecurrenceRule();
    rule.hour = [...new Set(hours)].sort((a, b) => a - b);
    rule.minute = [...new Set(minutes)].sort((a, b) => a - b);
    rule.second = 0;

    return rule;
  }

  /**
   * 执行单个账号的任务
   */
  private async executeAccount(account: AccountConfig): Promise<void> {
    log.info(`开始执行账号: ${account.name || account.id}`);

    try {
      const result = await this.accountExecutor.executeAccount(account);
      
      if (result.success) {
        log.success(`账号 ${account.name || account.id} 执行成功`);
        if (result.stats) {
          log.subInfo(`完成任务: ${result.stats.completedTasks}/${result.stats.totalTasks}`);
          log.subInfo(`获得积分: 光之币 +${result.stats.coins}, 友谊水晶 +${result.stats.crystals}`);
        }
      } else {
        log.error(`账号 ${account.name || account.id} 执行失败: ${result.error}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`账号 ${account.name || account.id} 执行异常:`, errorMsg);
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

    await this.executeAccount(account);
    return null; // 简化返回，如果需要结果可以调用 accountExecutor.executeAccount
  }

  /**
   * 重新加载配置
   */
  async reload(): Promise<void> {
    log.info('重新加载配置...');
    
    // 停止所有定时任务
    for (const [accountId, job] of this.jobs) {
      job.cancel();
    }
    this.jobs.clear();

    // 重新启动调度器
    if (this.isRunning) {
      await this.start();
    }
  }

  /**
   * 检查调度器是否正在运行
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }
} 