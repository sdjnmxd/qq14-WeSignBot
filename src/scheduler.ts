import { ConfigManager } from './configManager';
import { AccountExecutor } from './accountExecutor';
import { AccountConfig, AccountExecutionResult } from './types';
import { log } from './utils/logger';
import * as schedule from 'node-schedule';

export class Scheduler {
  private configManager: ConfigManager;
  private accountExecutor: AccountExecutor;
  private jobs: Map<string, schedule.Job[]> = new Map();
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
    for (const [, jobArray] of this.jobs) {
      for (const job of jobArray) {
        job.cancel();
      }
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
    const existingJobs = this.jobs.get(account.id);
    if (existingJobs) {
      for (const job of existingJobs) {
        job.cancel();
      }
    }

    // 解析所有时间点
    const timePoints: { hour: number; minute: number }[] = [];
    
    for (const time of account.schedule.times) {
      const [hour, minute] = time.split(':').map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
        timePoints.push({ hour, minute });
      }
    }

    if (timePoints.length === 0) {
      log.warn(`账号 ${account.name || account.id} 没有有效的执行计划`);
      return;
    }

    // 为每个时间点创建单独的job
    const jobs: schedule.Job[] = [];
    
    for (const timePoint of timePoints) {
      const rule = new schedule.RecurrenceRule();
      rule.hour = timePoint.hour;
      rule.minute = timePoint.minute;
      rule.second = 0;

      const job = schedule.scheduleJob(rule, () => {
        this.executeAccount(account);
      });

      jobs.push(job);
    }

    // 将所有job存储在Map中
    this.jobs.set(account.id, jobs);

    // 显示详细的调度信息
    this.displayScheduleInfo(account, jobs);
  }

  /**
   * 显示调度信息
   */
  private displayScheduleInfo(account: AccountConfig, jobs: schedule.Job[]): void {
    const accountName = account.name || account.id;
    const times = account.schedule.times;
    
    log.info(`📅 账号 ${accountName} 调度信息:`);
    log.subInfo(`执行时间: ${times.join(', ')}`);
    
    if (account.schedule.runOnStart) {
      log.subInfo(`启动时执行: 是`);
    }
    
    // 显示下次执行时间
    let nextTime: Date | null = null;
    for (const job of jobs) {
      if (job) {
        const jobNextTime = job.nextInvocation();
        if (jobNextTime && (!nextTime || jobNextTime < nextTime)) {
          nextTime = jobNextTime;
        }
      }
    }
    
    if (nextTime) {
      const now = new Date();
      const timeDiff = nextTime.getTime() - now.getTime();
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      
      log.subInfo(`下次执行: ${nextTime.toLocaleString('zh-CN')}`);
      if (timeDiff > 0) {
        log.subInfo(`距离下次执行: ${hours}小时${minutes}分钟`);
      } else {
        log.subInfo(`即将执行`);
      }
    }
    
    log.subInfo(`定时任务已设置`);
  }

  /**
   * 生成调度规则
   */
  private generateScheduleRule(times: string[]): schedule.RecurrenceRule | null {
    if (!times || times.length === 0) return null;

    // 解析所有时间点
    const timePoints: { hour: number; minute: number }[] = [];
    
    for (const time of times) {
      const [hour, minute] = time.split(':').map(Number);
      if (!isNaN(hour) && !isNaN(minute)) {
        timePoints.push({ hour, minute });
      }
    }

    if (timePoints.length === 0) return null;

    // 如果只有一个时间点，直接使用
    if (timePoints.length === 1) {
      const rule = new schedule.RecurrenceRule();
      rule.hour = timePoints[0].hour;
      rule.minute = timePoints[0].minute;
      rule.second = 0;
      return rule;
    }

    // 如果有多个时间点，需要创建多个规则
    // 对于多个时间点，我们需要为每个时间点创建单独的job
    // 这里先返回null，让setupScheduleJob处理多个时间点
    return null;
  }

  /**
   * 执行单个账号的任务
   */
  private async executeAccount(account: AccountConfig): Promise<void> {
    const startTime = new Date();
    const accountName = account.name || account.id;
    
    log.info(`🕐 开始执行账号: ${accountName} (${startTime.toLocaleString('zh-CN')})`);

    try {
      const result = await this.accountExecutor.executeAccount(account);
      
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      
      if (result.success) {
        log.success(`✅ 账号 ${accountName} 执行成功 (耗时: ${duration}秒)`);
        if (result.stats) {
          log.subInfo(`完成任务: ${result.stats.completedTasks}/${result.stats.totalTasks}`);
          log.subInfo(`获得积分: 光之币 +${result.stats.coins}, 友谊水晶 +${result.stats.crystals}`);
        }
      } else {
        log.error(`❌ 账号 ${accountName} 执行失败 (耗时: ${duration}秒): ${result.error}`);
      }
      
      // 显示下次执行时间
      this.displayNextExecutionTime(account);
      
    } catch (error) {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
      const errorMsg = error instanceof Error ? error.message : String(error);
      log.error(`❌ 账号 ${accountName} 执行异常 (耗时: ${duration}秒):`, errorMsg);
      
      // 显示下次执行时间
      this.displayNextExecutionTime(account);
    }
  }

  /**
   * 显示下次执行时间
   */
  private displayNextExecutionTime(account: AccountConfig): void {
    const jobs = this.jobs.get(account.id);
    if (jobs && jobs.length > 0) {
      const nextTime = jobs[0]?.nextInvocation(); // 假设第一个job是主要job
      if (nextTime) {
        const now = new Date();
        const timeDiff = nextTime.getTime() - now.getTime();
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        log.info(`⏰ 账号 ${account.name || account.id} 下次执行时间: ${nextTime.toLocaleString('zh-CN')}`);
        if (timeDiff > 0) {
          log.subInfo(`距离下次执行: ${hours}小时${minutes}分钟`);
        } else {
          log.subInfo(`即将执行`);
        }
      }
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
    for (const [, jobArray] of this.jobs) {
      for (const job of jobArray) {
        job.cancel();
      }
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

  /**
   * 显示所有账号的调度状态
   */
  showScheduleStatus(): void {
    log.info('📋 调度状态概览:');
    
    const accounts = this.configManager.getEnabledAccounts();
    if (accounts.length === 0) {
      log.info('没有启用的账号');
      return;
    }

    for (const account of accounts) {
      const accountName = account.name || account.id;
      const jobs = this.jobs.get(account.id);
      
      log.info(`账号: ${accountName}`);
      log.subInfo(`执行时间: ${account.schedule.times.join(', ')}`);
      log.subInfo(`启动时执行: ${account.schedule.runOnStart ? '是' : '否'}`);
      
      if (jobs && jobs.length > 0) {
        // 找到所有job中最近的下次执行时间
        let nextTime: Date | null = null;
        for (const job of jobs) {
          if (job) {
            const jobNextTime = job.nextInvocation();
            if (jobNextTime && (!nextTime || jobNextTime < nextTime)) {
              nextTime = jobNextTime;
            }
          }
        }
        
        if (nextTime) {
          const now = new Date();
          const timeDiff = nextTime.getTime() - now.getTime();
          const hours = Math.floor(timeDiff / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          
          log.subInfo(`下次执行: ${nextTime.toLocaleString('zh-CN')}`);
          if (timeDiff > 0) {
            log.subInfo(`距离下次执行: ${hours}小时${minutes}分钟`);
          } else {
            log.subInfo(`即将执行`);
          }
        } else {
          log.subInfo(`定时任务: 已设置但无下次执行时间`);
        }
      } else {
        // 如果任务还没有被创建，显示预计的调度信息
        const timePoints: { hour: number; minute: number }[] = [];
        
        for (const time of account.schedule.times) {
          const [hour, minute] = time.split(':').map(Number);
          if (!isNaN(hour) && !isNaN(minute)) {
            timePoints.push({ hour, minute });
          }
        }

        if (timePoints.length > 0) {
          // 计算最近的下次执行时间
          const now = new Date();
          let nextTime: Date | null = null;
          
          for (const timePoint of timePoints) {
            const rule = new schedule.RecurrenceRule();
            rule.hour = timePoint.hour;
            rule.minute = timePoint.minute;
            rule.second = 0;
            
            const calculatedNextTime = this.calculateNextExecutionTime(rule);
            if (calculatedNextTime && (!nextTime || calculatedNextTime < nextTime)) {
              nextTime = calculatedNextTime;
            }
          }
          
          if (nextTime) {
            const timeDiff = nextTime.getTime() - now.getTime();
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            
            log.subInfo(`预计下次执行: ${nextTime.toLocaleString('zh-CN')}`);
            if (timeDiff > 0) {
              log.subInfo(`距离下次执行: ${hours}小时${minutes}分钟`);
            } else {
              log.subInfo(`即将执行`);
            }
          } else {
            log.subInfo(`定时任务: 待设置`);
          }
        } else {
          log.subInfo(`定时任务: 配置无效`);
        }
      }
      
      log.subInfo('---');
    }
  }

  /**
   * 计算下次执行时间
   */
  private calculateNextExecutionTime(rule: schedule.RecurrenceRule): Date | null {
    try {
      // 创建一个临时的job来计算下次执行时间
      const tempJob = schedule.scheduleJob(rule, () => {});
      if (tempJob) {
        const nextTime = tempJob.nextInvocation();
        tempJob.cancel();
        return nextTime;
      }
    } catch (error) {
      log.debug('计算下次执行时间失败:', error);
    }
    return null;
  }
} 