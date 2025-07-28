// TODO: 测试问题梳理
// 1. 过度mock ApiClient、FrequencyController、RewardManager，导致测试与真实业务脱节，难以发现集成问题。
// 2. 多处直接mock和调用TaskManager的私有方法（如optimizeTaskExecution、calculateTaskCompletion），属于“白盒测试”，不利于维护和重构。
// 3. 部分测试仅为覆盖异常分支（如JSON解析失败、API错误、无效类型等），但实际业务场景极少发生，建议只保留有实际意义的分支测试。
// 4. 多处通过mock console.log来断言日志输出，虽然可以接受，但建议优先断言业务行为，日志断言只做补充。
// 5. 建议后续可引入集成测试，配合mock server或真实后端，提升测试的真实性和健壮性。
import { TaskManager } from '../../taskManager';
import { ApiClient } from '../../api';
import { FrequencyController } from '../../frequencyController';

import { TaskType, TaskStatus, Task } from '../../types';

// Mock the RewardManager
jest.mock('../../rewardManager', () => ({
  RewardManager: jest.fn().mockImplementation(() => ({
    claimAllRewards: jest.fn().mockResolvedValue(undefined),
    showRewardStatus: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('TaskManager', () => {
  let taskManager: TaskManager;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockFrequencyController: jest.Mocked<FrequencyController>;

  beforeEach(() => {
    // Create mock instances
    mockApiClient = {
      getFuliScores: jest.fn(),
      getSessionWithBindInfo: jest.fn(),
      getFuliStatus: jest.fn(),
      getPosts: jest.fn(),
      viewPost: jest.fn(),
      toggleLike: jest.fn(),
      claimSignReward: jest.fn(),
      claimTaskReward: jest.fn()
    } as unknown as jest.Mocked<ApiClient>;

    mockFrequencyController = {
      randomDelay: jest.fn().mockResolvedValue(undefined),
      setDelayRange: jest.fn(),
      getDelayRange: jest.fn().mockReturnValue({ min: 1000, max: 3000 })
    } as unknown as jest.Mocked<FrequencyController>;

    taskManager = new TaskManager(mockApiClient, mockFrequencyController);
  });

  describe('verifyLogin', () => {
    it('应该成功验证登录态', async () => {
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            scoreA: 1000,
            scoreB: 500
          })
        }
      });

      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            bind_info: {
              partition_name: '测试大区',
              role_name: '测试角色'
            }
          })
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await taskManager.verifyLogin();

      expect(mockApiClient.getFuliScores).toHaveBeenCalled();
      expect(mockApiClient.getSessionWithBindInfo).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('登录态验证成功'));

      consoleSpy.mockRestore();
    });

    it('应该处理登录态验证失败', async () => {
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 1,
        errmsg: '验证失败',
        data: {}
      });

      await expect(taskManager.verifyLogin()).rejects.toThrow('验证失败: 验证失败');
    });
  });

  describe('getTasks', () => {
    it('应该正确获取和映射任务', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '查看帖子',
                type: TaskType.VIEW_POST,
                required: 3,
                progress: 1,
                status: TaskStatus.INCOMPLETE,
                scoreA: 10,
                scoreB: 0
              },
              {
                id: '2',
                name: '点赞帖子',
                type: TaskType.LIKE_POST,
                required: 5,
                progress: 2,
                status: TaskStatus.INCOMPLETE,
                scoreA: 20,
                scoreB: 0
              }
            ]
          })
        }
      });

      const tasks = await taskManager.getTasks();

      expect(tasks).toHaveLength(2);
      expect(tasks[0].type).toBe(TaskType.VIEW_POST);
      expect(tasks[1].type).toBe(TaskType.LIKE_POST);
    });

    it('应该处理无效任务类型', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '无效任务',
                type: 'invalid_task_type',
                required: 1,
                progress: 0,
                status: TaskStatus.INCOMPLETE,
                scoreA: 10,
                scoreB: 0
              }
            ]
          })
        }
      });

      const tasks = await taskManager.getTasks();

      expect(tasks).toHaveLength(0); // 无效类型的任务应被过滤
    });
  });

  describe('executeAllTasks', () => {
    it('应该执行所有未完成的任务', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '查看帖子',
                type: TaskType.VIEW_POST,
                required: 3,
                progress: 1,
                status: TaskStatus.INCOMPLETE,
                scoreA: 10,
                scoreB: 0
              },
              {
                id: '2',
                name: '已完成任务',
                type: TaskType.VIEW_POST,
                required: 3,
                progress: 3,
                status: TaskStatus.COMPLETED,
                scoreA: 10,
                scoreB: 0
              }
            ]
          })
        }
      });

      // Mock 查看帖子相关API
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1' },
              { postId: 'p2', title: '帖子2' }
            ]
          })
        }
      });

      mockApiClient.viewPost.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await taskManager.executeAllTasks();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('发现 2 个任务'));

      consoleSpy.mockRestore();
    });

    it('应该优化执行同类型的多个任务', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '查看1个帖子',
                type: TaskType.VIEW_POST,
                required: 1,
                progress: 0,
                status: TaskStatus.INCOMPLETE,
                scoreA: 10,
                scoreB: 0
              },
              {
                id: '2',
                name: '查看3个帖子',
                type: TaskType.VIEW_POST,
                required: 3,
                progress: 0,
                status: TaskStatus.INCOMPLETE,
                scoreA: 30,
                scoreB: 0
              },
              {
                id: '3',
                name: '查看10个帖子',
                type: TaskType.VIEW_POST,
                required: 10,
                progress: 0,
                status: TaskStatus.INCOMPLETE,
                scoreA: 100,
                scoreB: 0
              }
            ]
          })
        }
      });

      // Mock 查看帖子相关API
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: Array.from({ length: 15 }, (_, i) => ({
              postId: `p${i + 1}`,
              title: `帖子${i + 1}`
            }))
          })
        }
      });

      mockApiClient.viewPost.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await taskManager.executeAllTasks();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('发现 3 个任务'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('优化执行 查看帖子 任务'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('检测到 3 个查看帖子任务'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('优化策略: 执行"查看10个帖子"将同时完成以下任务'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎉 同时完成的任务'));
      
      // 验证只执行了最大的任务（查看10个帖子）
      expect(mockApiClient.viewPost).toHaveBeenCalledTimes(10);

      consoleSpy.mockRestore();
    });

    it('应该正确处理部分进度的任务优化', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '查看3个帖子',
                type: TaskType.VIEW_POST,
                required: 3,
                progress: 2, // 已完成2个
                status: TaskStatus.INCOMPLETE,
                scoreA: 30,
                scoreB: 0
              },
              {
                id: '2',
                name: '查看5个帖子',
                type: TaskType.VIEW_POST,
                required: 5,
                progress: 1, // 已完成1个
                status: TaskStatus.INCOMPLETE,
                scoreA: 50,
                scoreB: 0
              }
            ]
          })
        }
      });

      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: Array.from({ length: 10 }, (_, i) => ({
              postId: `p${i + 1}`,
              title: `帖子${i + 1}`
            }))
          })
        }
      });

      mockApiClient.viewPost.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await taskManager.executeAllTasks();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('检测到 2 个查看帖子任务'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('- 查看3个帖子: 2/3'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('- 查看5个帖子: 1/5'));
      
      // 验证执行了4次（5-1=4，查看5个帖子需要再看4个）
      expect(mockApiClient.viewPost).toHaveBeenCalledTimes(4);

      consoleSpy.mockRestore();
    });

    it('应该分别处理不同类型的任务', async () => {
      // 设置简化的任务数据
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '查看1个帖子', // 减少数量避免复杂性
                type: TaskType.VIEW_POST,
                required: 1,
                progress: 0,
                status: TaskStatus.INCOMPLETE,
                scoreA: 10,
                scoreB: 0
              },
              {
                id: '2',
                name: '点赞1个帖子', // 减少数量避免复杂性
                type: TaskType.LIKE_POST,
                required: 1,
                progress: 0,
                status: TaskStatus.INCOMPLETE,
                scoreA: 10,
                scoreB: 0
              }
            ]
          })
        }
      });

      // Mock 帖子数据
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1', liked: false }
            ]
          })
        }
      });

      mockApiClient.viewPost.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      mockApiClient.toggleLike.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ count: '1' }) }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await taskManager.executeAllTasks();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('发现 2 个任务'));
      
      // 验证API被调用
      expect(mockApiClient.viewPost).toHaveBeenCalled();
      expect(mockApiClient.toggleLike).toHaveBeenCalled();

      consoleSpy.mockRestore();
    }, 10000); // 增加超时时间到10秒

    it('应该处理没有任务的情况', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: []
          })
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await taskManager.executeAllTasks();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('没有可执行的任务'));

      consoleSpy.mockRestore();
    });
  });

  describe('showTaskStatus', () => {
    it('应该显示任务状态', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '查看帖子',
                type: TaskType.VIEW_POST,
                required: 3,
                progress: 2,
                status: TaskStatus.INCOMPLETE,
                scoreA: 10,
                scoreB: 0
              }
            ]
          })
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await taskManager.showTaskStatus();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('查看帖子任务状态'));

      consoleSpy.mockRestore();
    });
  });

  describe('任务优化相关方法', () => {
    it('应该正确按类型分组并排序任务', () => {
      const tasks: Task[] = [
        {
          id: '1',
          name: '查看1个帖子',
          type: TaskType.VIEW_POST,
          required: 1,
          progress: 0,
          status: TaskStatus.INCOMPLETE,
          scoreA: 10,
          scoreB: 0
        },
        {
          id: '2',
          name: '查看10个帖子',
          type: TaskType.VIEW_POST,
          required: 10,
          progress: 0,
          status: TaskStatus.INCOMPLETE,
          scoreA: 100,
          scoreB: 0
        },
        {
          id: '3',
          name: '查看3个帖子',
          type: TaskType.VIEW_POST,
          required: 3,
          progress: 0,
          status: TaskStatus.INCOMPLETE,
          scoreA: 30,
          scoreB: 0
        },
        {
          id: '4',
          name: '点赞2个帖子',
          type: TaskType.LIKE_POST,
          required: 2,
          progress: 0,
          status: TaskStatus.INCOMPLETE,
          scoreA: 20,
          scoreB: 0
        },
        {
          id: '5',
          name: '已完成任务',
          type: TaskType.VIEW_POST,
          required: 5,
          progress: 5,
          status: TaskStatus.COMPLETED,
          scoreA: 50,
          scoreB: 0
        }
      ];

      // 仅用于测试私有方法
      const optimizeMethod = (taskManager as any).optimizeTaskExecution.bind(taskManager);
      const result = optimizeMethod(tasks);

      expect(result.size).toBe(2); // VIEW_POST和LIKE_POST两个类型
      
      const viewPostTasks = result.get(TaskType.VIEW_POST);
      expect(viewPostTasks).toBeDefined();
      expect(viewPostTasks!).toHaveLength(3); // 排除已完成的任务
      expect(viewPostTasks![0].name).toBe('查看10个帖子'); // 按required降序排序
      expect(viewPostTasks![1].name).toBe('查看3个帖子');
      expect(viewPostTasks![2].name).toBe('查看1个帖子');
      
      const likePostTasks = result.get(TaskType.LIKE_POST);
      expect(likePostTasks).toBeDefined();
      expect(likePostTasks!).toHaveLength(1);
      expect(likePostTasks![0].name).toBe('点赞2个帖子');
    });

    it('应该正确计算任务完成情况', () => {
      const tasks: Task[] = [
        {
          id: '1',
          name: '查看1个帖子',
          type: TaskType.VIEW_POST,
          required: 1,
          progress: 0,
          status: TaskStatus.INCOMPLETE,
          scoreA: 10,
          scoreB: 0
        },
        {
          id: '2',
          name: '查看3个帖子',
          type: TaskType.VIEW_POST,
          required: 3,
          progress: 0,
          status: TaskStatus.INCOMPLETE,
          scoreA: 30,
          scoreB: 0
        },
        {
          id: '3',
          name: '查看10个帖子',
          type: TaskType.VIEW_POST,
          required: 10,
          progress: 0,
          status: TaskStatus.INCOMPLETE,
          scoreA: 100,
          scoreB: 0
        }
      ];

      const maxTask = tasks[2]; // 查看10个帖子

      // 仅用于测试私有方法
      const calculateMethod = (taskManager as any).calculateTaskCompletion.bind(taskManager);
      const completedTasks = calculateMethod(tasks, maxTask);

      expect(completedTasks).toHaveLength(3); // 所有任务都会被完成
      expect(completedTasks[0].progress).toBe(1); // 查看1个帖子完成
      expect(completedTasks[1].progress).toBe(3); // 查看3个帖子完成
      expect(completedTasks[2].progress).toBe(10); // 查看10个帖子完成
      expect(completedTasks.every((task: Task) => task.status === TaskStatus.COMPLETED)).toBe(true);
    });

    it('应该正确处理部分进度的任务完成计算', () => {
      const tasks: Task[] = [
        {
          id: '1',
          name: '查看3个帖子',
          type: TaskType.VIEW_POST,
          required: 3,
          progress: 2, // 已完成2个
          status: TaskStatus.INCOMPLETE,
          scoreA: 30,
          scoreB: 0
        },
        {
          id: '2',
          name: '查看5个帖子',
          type: TaskType.VIEW_POST,
          required: 5,
          progress: 1, // 已完成1个
          status: TaskStatus.INCOMPLETE,
          scoreA: 50,
          scoreB: 0
        }
      ];

      const maxTask = tasks[1]; // 查看5个帖子，还需要4个

      const calculateMethod = (taskManager as any).calculateTaskCompletion.bind(taskManager);
      const completedTasks = calculateMethod(tasks, maxTask);

      expect(completedTasks).toHaveLength(2);
      expect(completedTasks[0].progress).toBe(3); // 2 + 4 = 6，但限制为required的3
      expect(completedTasks[1].progress).toBe(5); // 1 + 4 = 5
      expect(completedTasks.every((task: Task) => task.status === TaskStatus.COMPLETED)).toBe(true);
    });

    it('应该获取正确的任务类型友好名称', () => {
      const { TaskManager } = require('../../taskManager');
      const taskManager = new TaskManager(mockApiClient, mockFrequencyController);
      
      expect(taskManager['getTaskTypeName'](TaskType.LIKE_POST)).toBe('点赞帖子');
      expect(taskManager['getTaskTypeName'](TaskType.VIEW_POST)).toBe('查看帖子');
      expect(taskManager['getTaskTypeName'](TaskType.SHARE_POST)).toBe('分享帖子');
      expect(taskManager['getTaskTypeName']('unknown' as TaskType)).toBe('未知任务');
    });
  });

  it('应该处理verifyLogin中的积分数据格式错误', async () => {
    const { TaskManager } = require('../../taskManager');
    const taskManager = new TaskManager(mockApiClient, mockFrequencyController);
    
    mockApiClient.getFuliScores.mockResolvedValue({
      ret: 0,
      errmsg: '',
      data: {} // 缺少pack字段
    });
    
    await expect(taskManager.verifyLogin()).rejects.toThrow('积分数据格式错误');
  });

  it('应该处理verifyLogin中的会话信息获取失败', async () => {
    const { TaskManager } = require('../../taskManager');
    const taskManager = new TaskManager(mockApiClient, mockFrequencyController);
    
    mockApiClient.getFuliScores.mockResolvedValue({
      ret: 0,
      errmsg: '',
      data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
    });
    
    mockApiClient.getSessionWithBindInfo.mockResolvedValue({
      ret: 1,
      errmsg: '会话获取失败',
      data: {}
    });
    
    await expect(taskManager.verifyLogin()).rejects.toThrow('获取会话信息失败');
  });

  it('应该处理verifyLogin中的未绑定游戏大区', async () => {
    const { TaskManager } = require('../../taskManager');
    const taskManager = new TaskManager(mockApiClient, mockFrequencyController);
    
    mockApiClient.getFuliScores.mockResolvedValue({
      ret: 0,
      errmsg: '',
      data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
    });
    
    mockApiClient.getSessionWithBindInfo.mockResolvedValue({
      ret: 0,
      errmsg: '',
      data: {} // 没有bind_info
    });
    
    // 这应该不会抛出异常，只是记录警告
    await expect(taskManager.verifyLogin()).resolves.toBeUndefined();
  });

  it('应该处理getTasks中的福利状态获取失败', async () => {
    const { TaskManager } = require('../../taskManager');
    const taskManager = new TaskManager(mockApiClient, mockFrequencyController);
    
    mockApiClient.getFuliStatus.mockResolvedValue({
      ret: 1,
      errmsg: '福利状态获取失败',
      data: {}
    });
    
    await expect(taskManager.getTasks()).rejects.toThrow('获取福利状态失败');
  });

  it('应该处理getTasks中的JSON解析错误', async () => {
    const { TaskManager } = require('../../taskManager');
    const taskManager = new TaskManager(mockApiClient, mockFrequencyController);
    
    mockApiClient.getFuliStatus.mockResolvedValue({
      ret: 0,
      errmsg: '',
      data: { pack: 'invalid json' }
    });
    
    await expect(taskManager.getTasks()).rejects.toThrow();
  });

  it('应该处理getTasks中的无效任务类型', async () => {
    const { TaskManager } = require('../../taskManager');
    const taskManager = new TaskManager(mockApiClient, mockFrequencyController);
    
    mockApiClient.getFuliStatus.mockResolvedValue({
      ret: 0,
      errmsg: '',
      data: { 
        pack: JSON.stringify({
          tasks: [
            { type: 'invalid_type', status: 0, required: 1, current: 0 }
          ]
        })
      }
    });
    
    const tasks = await taskManager.getTasks();
    expect(tasks).toHaveLength(0); // 无效类型应该被过滤掉
  });


}); 