import { ApiClient } from './api';
import { FrequencyController } from './frequencyController';
import { TaskHandler, TaskType, Task, TaskContext, TaskStatus, parseTaskType, getTaskStatusDescription } from './types';
import { ViewPostHandler } from './handlers/viewPostHandler';
import { LikePostHandler } from './handlers/likePostHandler';
import { RewardManager } from './rewardManager';
import { log } from './utils/logger';

export class TaskManager {
  private handlers: Map<TaskType, TaskHandler> = new Map();
  private rewardManager: RewardManager;

  constructor(
    private apiClient: ApiClient,
    private frequencyController: FrequencyController,
    rewardManager?: RewardManager // 允许注入RewardManager
  ) {
    this.rewardManager = rewardManager || new RewardManager(apiClient);
    this.initializeHandlers();
  }

  private initializeHandlers(): void {
    // 注册任务处理器
    this.handlers.set(TaskType.VIEW_POST, new ViewPostHandler());
    this.handlers.set(TaskType.LIKE_POST, new LikePostHandler());
  }

  /**
   * 验证用户登录态
   */
  async verifyLogin(): Promise<void> {
    log.debug('正在验证登录态...');
    
    try {
      // 获取用户积分信息来验证登录态
      const scoresResponse = await this.apiClient.getFuliScores();
      
      log.debug('积分响应:', scoresResponse);
      
      if (scoresResponse.ret !== 0) {
        throw new Error(`验证失败: ${scoresResponse.errmsg}`);
      }

      // 检查data.pack是否存在
      if (!scoresResponse.data || !(scoresResponse.data as { pack?: string }).pack) {
        throw new Error(`积分数据格式错误: ${JSON.stringify(scoresResponse.data)}`);
      }

      const scoresData = JSON.parse((scoresResponse.data as { pack: string }).pack);
      
      // 获取用户会话信息
      const sessionResponse = await this.apiClient.getSessionWithBindInfo();
      
      log.debug('会话响应:', sessionResponse);
      
      if (sessionResponse.ret !== 0) {
        throw new Error(`获取会话信息失败: ${sessionResponse.errmsg}`);
      }

      log.success('登录态验证成功，用户信息正常');
      log.subInfo(`当前积分: 光之币 ${scoresData.scoreA}, 友谊水晶 ${scoresData.scoreB}`);
      
      // 会话数据的处理稍后再做，先确保积分获取正常
      if (sessionResponse.data && (sessionResponse.data as { bind_info?: { area_name: string; role_name?: string } }).bind_info) {
        const bindInfo = (sessionResponse.data as { bind_info: { area_name: string; role_name?: string } }).bind_info;
        log.subInfo(`绑定大区: ${bindInfo.area_name}`);
        if (bindInfo.role_name) {
          log.subInfo(`角色名称: ${bindInfo.role_name}`);
        }
      } else {
        log.warn('未绑定游戏大区');
      }
    } catch (error) {
      log.error('登录态验证失败:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * 获取所有任务
   */
  async getTasks(): Promise<Task[]> {
    log.debug('获取福利状态...');
    
    const response = await this.apiClient.getFuliStatus();
    
    if (response.ret !== 0) {
      throw new Error(`获取福利状态失败: ${response.errmsg}`);
    }

    const data = JSON.parse((response.data as { pack: string }).pack);
    const tasks: Task[] = data.tasks || [];

    log.debug(`原始任务数量: ${tasks.length}`);
    
    // 将任务类型字符串映射为枚举值，只保留成功映射的任务
    const mappedTasks = tasks
      .map(task => {
        const mappedType = parseTaskType(task.type);
        log.debug(`类型映射: ${task.type} -> ${mappedType || 'undefined'}`);
        return mappedType ? {
          ...task,
          type: mappedType
        } : null;
      })
      .filter((task): task is Task => task !== null);
      
    log.debug(`映射后任务数量: ${mappedTasks.length}`);
    
    return mappedTasks;
  }

  /**
   * 按类型分组并优化任务执行顺序 - 提取为公共方法便于测试
   */
  public optimizeTaskExecution(tasks: Task[]): Map<TaskType, Task[]> {
    const taskGroups = new Map<TaskType, Task[]>();
    
    // 按任务类型分组
    tasks.forEach(task => {
      if (task.status !== TaskStatus.COMPLETED) {
        if (!taskGroups.has(task.type)) {
          taskGroups.set(task.type, []);
        }
        taskGroups.get(task.type)!.push(task);
      }
    });
    
    // 对每组任务按required数量降序排序（先执行最大的任务）
    taskGroups.forEach((taskList) => {
      taskList.sort((a, b) => b.required - a.required);
    });
    
    return taskGroups;
  }

  /**
   * 计算执行最大任务后，其他任务的预期完成情况 - 提取为公共方法便于测试
   */
  public calculateTaskCompletion(tasks: Task[], maxTask: Task): Task[] {
    const completedTasks: Task[] = [];
    
    // 执行最大任务的数量
    const executionCount = maxTask.required - maxTask.progress;
    
    tasks.forEach(task => {
      // 计算执行后的预期进度
      const newProgress = task.progress + executionCount;
      
      if (newProgress >= task.required) {
        completedTasks.push({
          ...task,
          progress: Math.min(newProgress, task.required), // 确保不超过required
          status: TaskStatus.COMPLETED
        });
      }
    });
    
    return completedTasks;
  }

  /**
   * 执行所有任务
   */
  async executeAllTasks(): Promise<void> {
    log.taskStart('任务执行');
    
    try {
      const tasks = await this.getTasks();
      
      if (tasks.length === 0) {
        log.info('没有可执行的任务');
        return;
      }

      log.info(`发现 ${tasks.length} 个任务`);

      // 优化任务执行顺序
      const taskGroups = this.optimizeTaskExecution(tasks);
      
      for (const [taskType, taskList] of taskGroups) {
        if (taskList.length === 0) continue;
        
        const handler = this.handlers.get(taskType);
        if (!handler) {
          log.warn(`未找到处理器，跳过任务类型: ${taskType}`);
          continue;
        }
        
        if (taskList.length === 1) {
          // 只有一个任务，直接执行
          const task = taskList[0];
          log.taskStart(task.name);
          const context: TaskContext = {
            apiClient: this.apiClient,
            frequencyController: this.frequencyController
          };
          await handler.execute(task, context);
          log.taskComplete(task.name);
        } else {
          // 多个同类型任务，优化执行
          log.separator(`优化执行 ${this.getTaskTypeName(taskType)} 任务`);
          
          // 找到需要最大操作量的任务
          const maxTask = taskList[0]; // 已经按required降序排序
          
          // 预测执行最大任务后其他任务的完成情况
          const completedTasks = this.calculateTaskCompletion(taskList, maxTask);
          
          log.info(`检测到 ${taskList.length} 个${this.getTaskTypeName(taskType)}任务:`);
          taskList.forEach(task => {
            log.subInfo(`- ${task.name}: ${task.progress}/${task.required}`);
          });
          
          if (completedTasks.length > 1) {
            log.info(`💡 优化策略: 执行"${maxTask.name}"将同时完成以下任务:`);
            completedTasks.forEach(task => {
              log.subInfo(`✅ ${task.name}`);
            });
          }
          
          // 执行最大的任务
          log.taskStart(maxTask.name);
          const context: TaskContext = {
            apiClient: this.apiClient,
            frequencyController: this.frequencyController
          };
          await handler.execute(maxTask, context);
          log.taskComplete(maxTask.name);
          
          // 标记其他预期完成的任务
          if (completedTasks.length > 1) {
            log.info('🎉 同时完成的任务:');
            completedTasks.slice(1).forEach(task => {
              log.taskComplete(task.name);
            });
          }
        }
      }

      // 执行完任务后领取奖励
      log.info('开始领取奖励...');
      await this.rewardManager.claimAllRewards();
      
      log.taskComplete('任务执行');
    } catch (error) {
      log.error('任务执行失败:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * 获取任务类型的友好名称
   */
  public getTaskTypeName(taskType: TaskType): string {
    switch (taskType) {
      case TaskType.VIEW_POST:
        return '查看帖子';
      case TaskType.LIKE_POST:
        return '点赞帖子';
      case TaskType.SHARE_POST:
        return '分享帖子';
      case TaskType.PUBLISH_POST:
        return '发布帖子';
      case TaskType.SIGN_IN:
        return '签到';
      case TaskType.VISIT_MINI:
        return '访问小程序';
      case TaskType.CREATE_POST:
        return '创建帖子';
      case TaskType.CREATE_COMMENT:
        return '创建评论';
      default:
        return '未知任务';
    }
  }

  /**
   * 显示任务状态
   */
  async showTaskStatus(): Promise<void> {
    try {
      const tasks = await this.getTasks();

      if (tasks.length === 0) {
        log.info('没有可用的任务');
        return;
      }

      // 分类显示任务状态
      const viewPostTasks = tasks.filter(task => task.type === TaskType.VIEW_POST);
      if (viewPostTasks.length > 0) {
        log.separator('查看帖子任务状态');
        viewPostTasks.forEach(task => {
          log.info(`${task.name}`);
          log.subInfo(`进度: ${task.progress}/${task.required}`);
          log.subInfo(`状态: ${getTaskStatusDescription(task.status)}`);
          log.subInfo(`奖励: ${task.scoreA} 光之币, ${task.scoreB} 友谊水晶`);
        });
      }

      const likePostTasks = tasks.filter(task => task.type === TaskType.LIKE_POST);
      if (likePostTasks.length > 0) {
        log.separator('点赞任务状态');
        likePostTasks.forEach(task => {
          log.info(`${task.name}`);
          log.subInfo(`进度: ${task.progress}/${task.required}`);
          log.subInfo(`状态: ${getTaskStatusDescription(task.status)}`);
          log.subInfo(`奖励: ${task.scoreA} 光之币, ${task.scoreB} 友谊水晶`);
        });
      }

      const otherTasks = tasks.filter(task => 
        task.type !== TaskType.VIEW_POST && task.type !== TaskType.LIKE_POST
      );
      if (otherTasks.length > 0) {
        log.separator('其他任务状态');
        otherTasks.forEach(task => {
          log.info(`${task.name} (类型: ${task.type})`);
          log.subInfo(`进度: ${task.progress}/${task.required}`);
          log.subInfo(`状态: ${getTaskStatusDescription(task.status)}`);
          log.subInfo(`奖励: ${task.scoreA} 光之币, ${task.scoreB} 友谊水晶`);
        });
      }

      // 显示奖励状态
      await this.rewardManager.showRewardStatus();
      
    } catch (error) {
      log.error('获取任务状态失败:', error instanceof Error ? error.message : String(error));
    }
  }

  // 暴露getter方法便于测试
  public getRewardManager(): RewardManager {
    return this.rewardManager;
  }
} 