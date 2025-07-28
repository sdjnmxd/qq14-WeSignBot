import { AccountConfig, AccountExecutionResult } from './types';
import { TaskManager } from './taskManager';
import { RewardManager } from './rewardManager';
import { ApiClient } from './api';
import { FrequencyController } from './frequencyController';
import { log } from './utils/logger';
import { ConfigManager } from './configManager';

export class AccountExecutor {
  private configManager: ConfigManager;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  /**
   * 执行单个账号的任务
   */
  async executeAccount(account: AccountConfig): Promise<AccountExecutionResult> {
    const startTime = new Date();
    let success = false;
    let error: string | undefined;
    let stats: AccountExecutionResult['stats'] | undefined;

    try {
      log.info(`=== 执行账号: ${account.name || account.id} ===`);

      // 创建API客户端
      const apiClient = new ApiClient({ cookie: account.cookie, configManager: this.configManager });
      const frequencyController = new FrequencyController(this.configManager.getMinDelay(), this.configManager.getMaxDelay());

      // 创建任务管理器
      const taskManager = new TaskManager(apiClient, frequencyController);

      // 验证登录态
      log.info('验证登录态...');
      await taskManager.verifyLogin();

      // 创建奖励管理器
      const rewardManager = new RewardManager(apiClient);

      // 获取初始状态
      log.info('获取初始状态...');
      const initialStats = await this.getAccountStats(taskManager, rewardManager);
      this.displayAccountStats('初始状态', initialStats, account.name || account.id);

      // 执行所有任务
      log.info('开始执行任务...');
      await taskManager.executeAllTasks();

      // 领取所有奖励
      log.info('领取奖励...');
      await rewardManager.claimAllRewards();

      // 获取最终状态
      log.info('获取最终状态...');
      const finalStats = await this.getAccountStats(taskManager, rewardManager);
      this.displayAccountStats('最终状态', finalStats, account.name || account.id);

      // 显示执行摘要
      this.displayExecutionSummary(initialStats, finalStats, account.name || account.id);

      success = true;
      stats = finalStats;

      log.success(`✅ 账号 ${account.name || account.id} 执行完成！`);

    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      log.error(`账号 ${account.name || account.id} 执行失败:`, error);
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    return {
      accountId: account.id,
      accountName: account.name || account.id,
      success,
      startTime,
      endTime,
      duration,
      error,
      stats
    };
  }

  /**
   * 获取账号统计信息
   */
  private async getAccountStats(taskManager: TaskManager, rewardManager: RewardManager) {
    try {
      const tasks = await taskManager.getTasks();
      const completedTasks = tasks.filter(task => 
        task.status === 1 || task.status === 2 // COMPLETED or CLAIMED
      ).length;
      const availableRewards = await this.countAvailableRewards(rewardManager);
      
      // 获取积分信息
      const fuliResponse = await taskManager['apiClient'].getFuliScores();
      let coins = 0;
      let crystals = 0;
      
      if (fuliResponse.ret === 0) {
        const scoresData = JSON.parse((fuliResponse.data as { pack: string }).pack);
        coins = scoresData.scoreA || 0;
        crystals = scoresData.scoreB || 0;
      }
      
      return {
        totalTasks: tasks.length,
        completedTasks,
        pendingTasks: tasks.length - completedTasks,
        availableRewards,
        coins,
        crystals
      };
    } catch (error) {
      // 返回默认值
      return {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        availableRewards: 0,
        coins: 0,
        crystals: 0
      };
    }
  }

  /**
   * 统计可领取奖励数量
   */
  private async countAvailableRewards(rewardManager: RewardManager): Promise<number> {
    try {
      const fuliResponse = await rewardManager['apiClient'].getFuliStatus();
      if (fuliResponse.ret !== 0) return 0;
      
      const fuliData = JSON.parse((fuliResponse.data as { pack: string }).pack);
      // 签到奖励：status=1表示可领取
      const signRewards = (fuliData.weekdays || []).filter((w: { status: number }) => w.status === 1).length;
      
      const tasks = fuliData.tasks || [];
      // 任务奖励：只有已完成未领奖(status=1)的任务才算可领取
      const taskRewards = tasks.filter((t: { status: number }) => t.status === 1).length;
      
      return signRewards + taskRewards;
    } catch {
      return 0;
    }
  }

  /**
   * 显示账号统计信息
   */
  private displayAccountStats(title: string, stats: {
    completedTasks: number;
    totalTasks: number;
    coins: number;
    crystals: number;
    availableRewards: number;
  }, accountName: string) {
    log.info(`📊 ${accountName} - ${title}:`);
    log.subInfo(`任务: ${stats.completedTasks}/${stats.totalTasks} 已完成`);
    log.subInfo(`积分: 光之币 ${stats.coins}, 友谊水晶 ${stats.crystals}`);
    if (stats.availableRewards > 0) {
      log.subInfo(`🎁 可领取奖励: ${stats.availableRewards} 个`);
    }
  }

  /**
   * 计算执行摘要
   */
  private calculateExecutionSummary(initial: {
    completedTasks: number;
    coins: number;
    crystals: number;
    availableRewards: number;
  }, final: {
    completedTasks: number;
    coins: number;
    crystals: number;
    availableRewards: number;
  }) {
    const tasksDone = final.completedTasks - initial.completedTasks;
    const coinsGained = final.coins - initial.coins;
    const crystalsGained = final.crystals - initial.crystals;
    const rewardsGained = initial.availableRewards - final.availableRewards;
    
    return {
      tasksDone,
      coinsGained,
      crystalsGained,
      rewardsGained,
      hasProgress: tasksDone > 0 || rewardsGained > 0 || coinsGained > 0 || crystalsGained > 0
    };
  }

  /**
   * 显示执行摘要
   */
  private displayExecutionSummary(initial: {
    completedTasks: number;
    coins: number;
    crystals: number;
    availableRewards: number;
  }, final: {
    completedTasks: number;
    coins: number;
    crystals: number;
    availableRewards: number;
  }, accountName: string) {
    log.info(`📋 ${accountName} - 执行摘要:`);
    
    const summary = this.calculateExecutionSummary(initial, final);
    
    if (summary.tasksDone > 0) {
      log.subInfo(`✅ 完成任务: ${summary.tasksDone} 个`);
    }
    
    if (summary.rewardsGained > 0) {
      log.subInfo(`🎁 领取奖励: ${summary.rewardsGained} 个`);
    }
    
    if (summary.coinsGained > 0 || summary.crystalsGained > 0) {
      log.subInfo(`💰 获得奖励: +${summary.coinsGained} 光之币, +${summary.crystalsGained} 友谊水晶`);
    }
    
    if (!summary.hasProgress) {
      log.subInfo(`ℹ️ 没有新的任务或奖励可完成/领取`);
    }
  }
} 