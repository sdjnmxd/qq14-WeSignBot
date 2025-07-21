import { ApiClient } from './api';
import { TaskStatus } from './types';
import { log } from './utils/logger';

export interface SignReward {
  day: number;
  isClaimed: boolean;
  packageId: string;
  title?: string;
}

export interface TaskReward {
  taskId: string;
  scoreA: number;
  scoreB: number;
  isClaimed: boolean;
}

export class RewardManager {
  constructor(private apiClient: ApiClient) {}

  /**
   * 领取单个签到奖励
   */
  private async claimSingleSignReward(day: number): Promise<boolean> {
    try {
      const response = await this.apiClient.claimSignReward(day);
      
      if (response.ret === 0) {
        const awardData = JSON.parse(response.data.pack);
        
        // 尝试获取包信息
        try {
          // 这里可以添加获取包信息的逻辑
          const packageInfo = { title: `第${day}天奖励` }; // 简化处理
          log.success(`成功领取第${day}天签到奖励: ${packageInfo.title}`);
        } catch {
          log.success(`成功领取第${day}天签到奖励 (包ID: ${awardData.packageId})`);
        }
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * 领取所有签到奖励
   */
  async claimSignRewards(): Promise<void> {
    log.info('开始领取签到奖励...');
    
    try {
      const fuliResponse = await this.apiClient.getFuliStatus();
      
      if (fuliResponse.ret !== 0) {
        throw new Error(`获取福利状态失败: ${fuliResponse.errmsg}`);
      }

      const fuliData = JSON.parse(fuliResponse.data.pack);
      const weekdays = fuliData.weekdays || [];
      
      let claimedCount = 0;
      
      for (const weekday of weekdays) {
        // 状态说明：
        // status: 0 = 未签到
        // status: 1 = 可领取（已签到但未领取）
        // status: 2 = 已领取
        if (weekday.status === 1) {
          log.info(`发现第${weekday.day}天签到奖励可领取`);
          const success = await this.claimSingleSignReward(weekday.day);
          if (success) {
            claimedCount++;
          } else {
            log.debug(`第${weekday.day}天签到奖励领取失败，可能已领取或网络错误`);
          }
        } else if (weekday.status === 2) {
          log.debug(`第${weekday.day}天签到奖励已领取，跳过`);
        } else if (weekday.status === 0) {
          log.debug(`第${weekday.day}天未签到，跳过`);
        }
      }
      
      if (claimedCount === 0) {
        log.info('没有可领取的签到奖励');
      } else {
        log.success(`成功领取 ${claimedCount} 个签到奖励`);
      }
    } catch (error) {
      log.error('领取签到奖励失败:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 领取单个任务奖励
   */
  private async claimSingleTaskReward(taskId: string): Promise<boolean> {
    try {
      const response = await this.apiClient.claimTaskReward(taskId);
      
      if (response.ret === 0) {
        const scoreData = JSON.parse(response.data.pack);
        log.success(`成功领取任务${taskId}奖励: 光之币${scoreData.scoreA}, 友谊水晶${scoreData.scoreB}`);
        log.subInfo(`当前总积分: 光之币${scoreData.scoreATotal}, 友谊水晶${scoreData.scoreBTotal}`);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      log.error(`领取任务${taskId}奖励失败:`, error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  /**
   * 领取所有任务奖励
   */
  async claimTaskRewards(): Promise<void> {
    log.info('开始领取任务奖励...');
    
    try {
      const rewards = await this.getAvailableTaskRewards();
      
      if (rewards.length === 0) {
        log.info('没有可领取的任务奖励');
        return;
      }

      log.info(`发现 ${rewards.length} 个任务奖励`);
      
      for (const reward of rewards) {
        const success = await this.claimSingleTaskReward(reward.taskId);
        if (success) {
          // 添加延迟避免请求过快
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      log.success('任务奖励处理完成');
    } catch (error) {
      log.error('领取任务奖励失败:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 领取所有奖励
   */
  async claimAllRewards(): Promise<void> {
    log.info('开始领取所有奖励...');
    
    try {
      // 先领取签到奖励
      await this.claimSignRewards();
      
      // 再领取任务奖励
      await this.claimTaskRewards();
      
      log.success('所有奖励领取完成');
    } catch (error) {
      log.error('领取奖励过程中发生错误:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 显示奖励状态
   */
  async showRewardStatus(): Promise<void> {
    try {
      log.separator('奖励状态');
      
      const fuliResponse = await this.apiClient.getFuliStatus();
      if (fuliResponse.ret !== 0) {
        log.error('获取奖励状态失败');
        return;
      }

      const fuliData = JSON.parse(fuliResponse.data.pack);
      
      // 显示签到奖励状态
      log.info('📅 签到奖励状态:');
      const weekdays = fuliData.weekdays || [];
      
      for (const weekday of weekdays) {
        // 状态说明：
        // status: 0 = 未签到
        // status: 1 = 可领取（已签到但未领取）
        // status: 2 = 已领取
        let status = '';
        switch (weekday.status) {
          case 0:
            status = '❌ 未签到';
            break;
          case 1:
            status = '🎁 可领取';
            break;
          case 2:
            status = '✅ 已领取';
            break;
          default:
            status = '❓ 未知状态';
        }
        const rewardName = `第${weekday.day}天奖励`;
        log.subInfo(`第${weekday.day}天: ${status} - ${rewardName}`);
      }

      // 显示任务奖励状态
      log.info('🎯 任务奖励状态:');
      const taskRewards = await this.getAvailableTaskRewards();
      
      if (taskRewards.length === 0) {
        log.subInfo('暂无可领取的任务奖励');
      } else {
        for (const reward of taskRewards) {
          log.subInfo(`任务${reward.taskId}: 光之币${reward.scoreA}, 友谊水晶${reward.scoreB}`);
        }
      }
    } catch (error) {
      log.error('获取奖励状态失败:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 获取可领取的任务奖励
   */
  private async getAvailableTaskRewards(): Promise<TaskReward[]> {
    try {
      const fuliResponse = await this.apiClient.getFuliStatus();
      
      if (fuliResponse.ret !== 0) {
        return [];
      }

      const fuliData = JSON.parse(fuliResponse.data.pack);
      const tasks = fuliData.tasks || [];
      
      // 找出已完成但未领取奖励的任务
      return tasks
                  .filter((task: any) => task.status === TaskStatus.COMPLETED && !task.isGet)
        .map((task: any) => ({
          taskId: task.id,
          scoreA: task.scoreA,
          scoreB: task.scoreB,
          isClaimed: false
        }));
    } catch (error) {
      log.error('获取任务奖励失败:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }
} 