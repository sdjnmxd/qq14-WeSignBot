import { TaskManager } from '../../taskManager';
import { ApiClient } from '../../api';
import { FrequencyController } from '../../frequencyController';
import { RewardManager } from '../../rewardManager';
import { TaskType, TaskStatus, Task } from '../../types';

describe('TaskManager', () => {
  let taskManager: TaskManager;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockFrequencyController: jest.Mocked<FrequencyController>;
  let mockRewardManager: jest.Mocked<RewardManager>;

  beforeEach(() => {
    // 创建mock实例
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

    mockRewardManager = {
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      showRewardStatus: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<RewardManager>;

    // 使用依赖注入，便于测试
    taskManager = new TaskManager(mockApiClient, mockFrequencyController, mockRewardManager);
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

      await taskManager.verifyLogin();

      expect(mockApiClient.getFuliScores).toHaveBeenCalled();
      expect(mockApiClient.getSessionWithBindInfo).toHaveBeenCalled();
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

    it('应该过滤无效任务类型', async () => {
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

  describe('任务优化逻辑', () => {
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

      const result = taskManager.optimizeTaskExecution(tasks);

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
      const completedTasks = taskManager.calculateTaskCompletion(tasks, maxTask);

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
      const completedTasks = taskManager.calculateTaskCompletion(tasks, maxTask);

      expect(completedTasks).toHaveLength(2);
      expect(completedTasks[0].progress).toBe(3); // 2 + 4 = 6，但限制为required的3
      expect(completedTasks[1].progress).toBe(5); // 1 + 4 = 5
      expect(completedTasks.every((task: Task) => task.status === TaskStatus.COMPLETED)).toBe(true);
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

      await taskManager.executeAllTasks();

      // 验证API被调用
      expect(mockApiClient.viewPost).toHaveBeenCalled();
      expect(mockRewardManager.claimAllRewards).toHaveBeenCalled();
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

      await taskManager.executeAllTasks();
      
      // 验证只执行了最大的任务（查看10个帖子）
      expect(mockApiClient.viewPost).toHaveBeenCalledTimes(10);
      expect(mockRewardManager.claimAllRewards).toHaveBeenCalled();
    });

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

      await taskManager.executeAllTasks();

      // 当没有任务时，不会调用claimAllRewards
      expect(mockRewardManager.claimAllRewards).not.toHaveBeenCalled();
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

      await taskManager.showTaskStatus();

      expect(mockRewardManager.showRewardStatus).toHaveBeenCalled();
    });
  });

  describe('getTaskTypeName', () => {
    it('应该返回正确的任务类型友好名称', () => {
      expect(taskManager.getTaskTypeName(TaskType.LIKE_POST)).toBe('点赞帖子');
      expect(taskManager.getTaskTypeName(TaskType.VIEW_POST)).toBe('查看帖子');
      expect(taskManager.getTaskTypeName(TaskType.SHARE_POST)).toBe('分享帖子');
      expect(taskManager.getTaskTypeName(TaskType.PUBLISH_POST)).toBe('发布帖子');
      expect(taskManager.getTaskTypeName(TaskType.SIGN_IN)).toBe('签到');
      expect(taskManager.getTaskTypeName(TaskType.VISIT_MINI)).toBe('访问小程序');
      expect(taskManager.getTaskTypeName(TaskType.CREATE_POST)).toBe('创建帖子');
      expect(taskManager.getTaskTypeName(TaskType.CREATE_COMMENT)).toBe('创建评论');
      expect(taskManager.getTaskTypeName('UNKNOWN' as TaskType)).toBe('未知任务');
    });
  });

  describe('依赖注入', () => {
    it('应该支持注入RewardManager', () => {
      const customRewardManager = {
        claimAllRewards: jest.fn().mockResolvedValue(undefined),
        showRewardStatus: jest.fn().mockResolvedValue(undefined)
      } as unknown as RewardManager;

      const taskManagerWithInjection = new TaskManager(
        mockApiClient, 
        mockFrequencyController, 
        customRewardManager
      );

      expect(taskManagerWithInjection.getRewardManager()).toBe(customRewardManager);
    });
  });
}); 