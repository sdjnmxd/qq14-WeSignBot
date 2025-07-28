import dotenv from 'dotenv';
dotenv.config();

import { TaskManager } from './taskManager';
import { RewardManager } from './rewardManager';
import { ApiClient } from './api';
import { FrequencyController } from './frequencyController';
import { TaskStatus } from './types';
import { ConfigManager } from './configManager';
import { Scheduler } from './scheduler';
import { log } from './utils/logger';

// 检查是否使用多账号模式
const USE_MULTI_ACCOUNT = process.env.USE_MULTI_ACCOUNT === 'true';

async function main() {
  try {
    log.info('=== QQ14微信小程序签到脚本 ===');
    
    if (USE_MULTI_ACCOUNT) {
      await runMultiAccountMode();
    } else {
      await runSingleAccountMode();
    }

  } catch (error) {
    log.error('脚本执行失败:');
    log.error(error instanceof Error ? error.message : String(error));
    
    // 如果是配置相关错误，提供更详细的帮助信息
    if (error instanceof Error && (
      error.message.includes('配置文件不存在') || 
      error.message.includes('配置文件格式错误')
    )) {
      log.info('');
      log.info('💡 配置问题解决方案:');
      log.info('1. 确保 accounts.json 文件存在且格式正确');
      log.info('2. 参考 accounts.example.json 的格式');
      log.info('3. 检查 JSON 语法是否正确');
    }
    
    process.exit(1);
  }
}

/**
 * 多账号模式
 */
async function runMultiAccountMode(): Promise<void> {
  log.info('启动多账号模式...');
  
  const configManager = new ConfigManager();
  const scheduler = new Scheduler(configManager);
  
  // 显示调度状态概览
  scheduler.showScheduleStatus();
  
  // 启动调度器
  await scheduler.start();
  
  // 保持程序运行
  log.info('多账号调度器已启动，程序将持续运行...');
  log.info('按 Ctrl+C 停止程序');
  
  // 处理进程退出信号
  process.on('SIGINT', async () => {
    log.info('收到退出信号，正在停止调度器...');
    scheduler.stop();
    log.success('程序已安全退出');
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    log.info('收到终止信号，正在停止调度器...');
    scheduler.stop();
    log.success('程序已安全退出');
    process.exit(0);
  });
  
  // 防止进程意外退出
  process.on('uncaughtException', (error) => {
    log.error('未捕获的异常:', error);
    scheduler.stop();
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log.error('未处理的Promise拒绝:', reason);
    scheduler.stop();
    process.exit(1);
  });
}

/**
 * 单账号模式（向后兼容）
 */
async function runSingleAccountMode(): Promise<void> {
  const startTime = new Date();
  log.info('启动单账号模式...');
  log.info(`开始时间: ${startTime.toLocaleString('zh-CN')}`);
  
  // 配置信息
  const CONFIG = {
    cookie: process.env.COOKIE || ''
  };

  // 检查配置
  if (!CONFIG.cookie) {
    log.error('缺少必要的环境变量，请检查 .env 文件');
    log.error('需要的环境变量: COOKIE');
    log.error('或者设置 USE_MULTI_ACCOUNT=true 使用多账号模式');
    process.exit(1);
  }

  const isDebugMode = process.env.NODE_ENV !== 'production';
  log.info(`运行模式: ${isDebugMode ? 'development' : 'production'}`);
  if (isDebugMode) {
    log.info('调试模式: 开启');
  }

  // 初始化客户端
  const configManager = new ConfigManager();
  const apiClient = new ApiClient({ ...CONFIG, configManager });
  const frequencyController = new FrequencyController(configManager.getMinDelay(), configManager.getMaxDelay());

  // 验证登录态
  log.info('开始验证登录态...');
  const taskManager = new TaskManager(apiClient, frequencyController);
  await taskManager.verifyLogin();

  // 初始化管理器
  const rewardManager = new RewardManager(apiClient);

  // 显示初始状态（简化版）
  log.info('📊 获取当前状态...');
  const initialStats = await getSimpleStats(taskManager, rewardManager);
  displaySimpleStats('初始状态', initialStats);

  // 执行所有任务
  log.info('🚀 开始执行任务...');
  await taskManager.executeAllTasks();

  // 领取所有奖励
  log.info('🎁 领取奖励...');
  await rewardManager.claimAllRewards();

  // 显示最终状态
  log.info('📊 获取最终状态...');
  const finalStats = await getSimpleStats(taskManager, rewardManager);
  displaySimpleStats('最终状态', finalStats);

  // 显示执行摘要
  displayExecutionSummary(initialStats, finalStats);

  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  log.success(`✅ 脚本执行完成！总耗时: ${duration}秒`);
  log.info(`结束时间: ${endTime.toLocaleString('zh-CN')}`);
}

// 获取简化统计信息
async function getSimpleStats(taskManager: TaskManager, rewardManager: RewardManager) {
  const tasks = await taskManager.getTasks();
  // 已完成的任务包括：已完成未领奖(status=1) + 已领奖(status=2)
  const completedTasks = tasks.filter(task => 
    task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CLAIMED
  ).length;
  const availableRewards = await countAvailableRewards(rewardManager);
  
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
}

// 统计可领取奖励数量
async function countAvailableRewards(rewardManager: RewardManager): Promise<number> {
  try {
    const fuliResponse = await rewardManager['apiClient'].getFuliStatus();
    if (fuliResponse.ret !== 0) return 0;
    
    const fuliData = JSON.parse((fuliResponse.data as { pack: string }).pack);
    // 签到奖励：status=1表示可领取
    const signRewards = (fuliData.weekdays || []).filter((w: { status: number }) => w.status === 1).length;
    
    const tasks = fuliData.tasks || [];
    // 任务奖励：只有已完成未领奖(status=1)的任务才算可领取
    const taskRewards = tasks.filter((t: { status: number }) => t.status === TaskStatus.COMPLETED).length;
    
    return signRewards + taskRewards;
  } catch {
    return 0;
  }
}

// 显示简化统计
function displaySimpleStats(title: string, stats: {
  completedTasks: number;
  totalTasks: number;
  coins: number;
  crystals: number;
  availableRewards: number;
}) {
  log.info(`📊 ${title}:`);
  log.subInfo(`任务: ${stats.completedTasks}/${stats.totalTasks} 已完成`);
  log.subInfo(`积分: 光之币 ${stats.coins}, 友谊水晶 ${stats.crystals}`);
  if (stats.availableRewards > 0) {
    log.subInfo(`🎁 可领取奖励: ${stats.availableRewards} 个`);
  }
}

// 显示执行摘要
function displayExecutionSummary(initial: {
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
  log.info('📋 执行摘要:');
  
  const tasksDone = final.completedTasks - initial.completedTasks;
  const coinsGained = final.coins - initial.coins;
  const crystalsGained = final.crystals - initial.crystals;
  const rewardsGained = initial.availableRewards - final.availableRewards;
  
  if (tasksDone > 0) {
    log.subInfo(`✅ 完成任务: ${tasksDone} 个`);
  }
  
  if (rewardsGained > 0) {
    log.subInfo(`🎁 领取奖励: ${rewardsGained} 个`);
  }
  
  if (coinsGained > 0 || crystalsGained > 0) {
    log.subInfo(`💰 获得奖励: +${coinsGained} 光之币, +${crystalsGained} 友谊水晶`);
  }
  
  if (tasksDone === 0 && rewardsGained === 0) {
    log.subInfo(`ℹ️ 没有新的任务或奖励可完成/领取`);
  }
}

main();