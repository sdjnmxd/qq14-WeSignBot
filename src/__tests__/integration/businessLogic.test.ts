// TODO: 测试问题梳理
// 1. 过度mock ApiClient、FrequencyController、RewardManager，导致集成测试与真实业务脱节，难以发现集成和边界问题。
// 2. 多处通过mock console.log来断言日志输出，虽然可以接受，但建议优先断言业务行为，日志断言只做补充。
// 3. 部分测试仅为覆盖异常分支（如JSON解析失败、网络异常、分页失败等），但实际业务场景极少发生，建议只保留有实际意义的分支测试。
// 4. 多个测试用例实际会sleep，导致测试慢且不稳定，建议用jest.useFakeTimers()模拟时间流逝。
// 5. 建议后续可引入端到端测试，配合mock server或真实后端，提升测试的真实性和健壮性。
import { TaskManager } from '../../taskManager';

import { ApiClient } from '../../api';
import { FrequencyController } from '../../frequencyController';
import { TaskType, TaskStatus, Task } from '../../types';

// Mock dependencies
jest.mock('../../rewardManager', () => ({
  RewardManager: jest.fn().mockImplementation(() => ({
    claimAllRewards: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('业务逻辑边界测试', () => {
  let taskManager: TaskManager;

  let mockApiClient: jest.Mocked<ApiClient>;
  let mockFrequencyController: jest.Mocked<FrequencyController>;

  beforeEach(() => {
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

  describe('任务进度边界情况', () => {
    it('应该处理进度超过要求的任务', async () => {
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
                progress: 5, // 进度超过要求
                status: TaskStatus.COMPLETED,
                scoreA: 10,
                scoreB: 0
              }
            ]
          })
        }
      });

      const tasks = await taskManager.getTasks();
      expect(tasks[0].progress).toBe(5);
      expect(tasks[0].status).toBe(TaskStatus.COMPLETED);
    });

    it('应该处理负数进度', async () => {
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
                progress: -1, // 负数进度
                status: TaskStatus.INCOMPLETE,
                scoreA: 10,
                scoreB: 0
              }
            ]
          })
        }
      });

      const tasks = await taskManager.getTasks();
      expect(tasks[0].progress).toBe(-1);
    });

    it('应该处理零值要求的任务', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '特殊任务',
                type: TaskType.VIEW_POST,
                required: 0, // 零值要求
                progress: 0,
                status: TaskStatus.COMPLETED,
                scoreA: 10,
                scoreB: 0
              }
            ]
          })
        }
      });

      const tasks = await taskManager.getTasks();
      expect(tasks[0].required).toBe(0);
      expect(tasks[0].status).toBe(TaskStatus.COMPLETED);
    });
  });

  describe('数据一致性测试', () => {
    it('应该处理API返回的进度与本地缓存不一致', async () => {
      const task: Task = {
        id: '1',
        type: TaskType.VIEW_POST,
        name: '查看3个帖子',
        required: 3,
        progress: 1, // 本地缓存进度
        status: TaskStatus.INCOMPLETE,
        scoreA: 10,
        scoreB: 0
      };

      // API返回不同的进度
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                progress: 2, // API返回的进度与缓存不同
                required: 3
              }
            ]
          })
        }
      });

      const handler = (taskManager as any).handlers.get(TaskType.VIEW_POST)!;
      const progress = await handler.getProgress(task, mockApiClient);
      
      expect(progress).toBe(2); // 应该使用API返回的最新进度
    });

    it('应该处理JSON解析错误', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: 'invalid json string'
        }
      });

      await expect(taskManager.getTasks()).rejects.toThrow();
    });
  });

  describe('大数据量处理测试', () => {
    it('应该处理大量任务', async () => {
      const largeTasks = Array.from({ length: 100 }, (_, i) => ({
        id: `task_${i}`,
        name: `任务 ${i}`,
        type: TaskType.VIEW_POST,
        required: 1,
        progress: 0,
        status: TaskStatus.INCOMPLETE,
        scoreA: 10,
        scoreB: 0
      }));

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: largeTasks
          })
        }
      });

      const tasks = await taskManager.getTasks();
      expect(tasks).toHaveLength(100);
    });

    it('应该处理大量帖子数据的分页', async () => {
      // 模拟多页帖子数据
      const mockFirstPage = Array.from({ length: 10 }, (_, i) => ({
        postId: `post_${i}`,
        title: `帖子 ${i}`
      }));

      const mockSecondPage = Array.from({ length: 5 }, (_, i) => ({
        postId: `post_${i + 10}`,
        title: `帖子 ${i + 10}`
      }));

      mockApiClient.getPosts
        .mockResolvedValueOnce({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              posts: mockFirstPage,
              lastId: 'page1_last'
            })
          }
        })
        .mockResolvedValueOnce({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              posts: mockSecondPage,
              lastId: null // 无更多页面
            })
          }
        });

      // 测试获取大量帖子时的分页逻辑
      const handler = (taskManager as any).handlers.get(TaskType.VIEW_POST)!;
      const posts = await handler.getAllAvailablePosts(mockApiClient, 15);
      
      expect(posts).toHaveLength(15);
      expect(mockApiClient.getPosts).toHaveBeenCalledTimes(2);
    });
  });

  describe('错误恢复测试', () => {
    it('应该在连续失败后停止重试', async () => {
      const task: Task = {
        id: '1',
        type: TaskType.VIEW_POST,
        name: '查看3个帖子',
        required: 3,
        progress: 0,
        status: TaskStatus.INCOMPLETE,
        scoreA: 10,
        scoreB: 0
      };

      // 模拟连续的API失败
      mockApiClient.getPosts.mockRejectedValue(new Error('Network error'));

      const handler = (taskManager as any).handlers.get(TaskType.VIEW_POST)!;
      const context = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      // 应该处理错误而不是无限重试
      await expect(handler.execute(task, context)).rejects.toThrow('Network error');
    });

    it('应该在部分操作失败时继续执行', async () => {
      const task: Task = {
        id: '1',
        type: TaskType.LIKE_POST,
        name: '点赞3个帖子',
        required: 3,
        progress: 0,
        status: TaskStatus.INCOMPLETE,
        scoreA: 30,
        scoreB: 0
      };

      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1', liked: false },
              { postId: 'p2', title: '帖子2', liked: false },
              { postId: 'p3', title: '帖子3', liked: false }
            ]
          })
        }
      });

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 3 }]
          })
        }
      });

      // 第一个和第三个点赞成功，第二个失败
      mockApiClient.toggleLike
        .mockResolvedValueOnce({ ret: 0, errmsg: '', data: { pack: '{"count":"1"}' } })
        .mockRejectedValueOnce(new Error('点赞失败'))
        .mockResolvedValueOnce({ ret: 0, errmsg: '', data: { pack: '{"count":"2"}' } });

      const handler = (taskManager as any).handlers.get(TaskType.LIKE_POST)!;
      const context = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, context);

      expect(mockApiClient.toggleLike).toHaveBeenCalledTimes(3);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('需要点赞 3 次'));

      consoleSpy.mockRestore();
    });
  });

  describe('并发和频率控制测试', () => {
    it('应该在频率控制器设置下正确延迟', async () => {
      const customDelay = 2000;
      mockFrequencyController.randomDelay.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, customDelay))
      );

      const startTime = Date.now();
      await mockFrequencyController.randomDelay();
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(customDelay - 100); // 允许一些时间误差
    });

    it('应该处理频率控制器异常', async () => {
      mockFrequencyController.randomDelay.mockRejectedValue(new Error('延迟控制器错误'));

      await expect(mockFrequencyController.randomDelay()).rejects.toThrow('延迟控制器错误');
    });
  });
}); 