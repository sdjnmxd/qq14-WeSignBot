// TODO: 测试问题梳理
// 1. 过度mock ApiClient、FrequencyController，导致测试与真实业务脱节，难以发现集成问题。
// 2. 多处通过mock console.log来断言日志输出，虽然可以接受，但建议优先断言业务行为，日志断言只做补充。
// 3. 部分测试仅为覆盖异常分支（如点赞失败、网络异常、分页失败等），但实际业务场景极少发生，建议只保留有实际意义的分支测试。
// 4. 多个测试用例实际会sleep，导致测试慢且不稳定，建议用jest.useFakeTimers()模拟时间流逝。
// 5. 建议后续可引入集成测试，配合mock server或真实后端，提升测试的真实性和健壮性。
import { UnlikeLikeHandler } from '../../handlers/unlikeLikeHandler';
import { TaskType, Task, TaskContext } from '../../types';
import { FrequencyController } from '../../frequencyController';

describe('UnlikeLikeHandler', () => {
  let handler: UnlikeLikeHandler;
  let mockContext: TaskContext;
  let mockApiClient: jest.Mocked<{
    getPosts: jest.Mock;
    toggleLike: jest.Mock;
    getFuliStatus: jest.Mock;
  }>;
  let mockFrequencyController: FrequencyController;

  beforeEach(() => {
    handler = new UnlikeLikeHandler();
    
    mockApiClient = {
      getPosts: jest.fn(),
      toggleLike: jest.fn(),
      getFuliStatus: jest.fn()
    };
    
    mockFrequencyController = new FrequencyController({
      getMinDelay: () => 0,
      getMaxDelay: () => 0
    });
    jest.spyOn(mockFrequencyController, 'randomDelay').mockResolvedValue(undefined);
    
    mockContext = {
      apiClient: mockApiClient,
      frequencyController: mockFrequencyController
    };
  });

  describe('canHandle', () => {
    it('应该能处理点赞帖子任务', () => {
      expect(handler.canHandle(TaskType.LIKE_POST)).toBe(true);
    });

    it('不应该处理其他类型任务', () => {
      expect(handler.canHandle(TaskType.VIEW_POST)).toBe(false);
      expect(handler.canHandle(TaskType.SHARE_POST)).toBe(false);
    });
  });

  describe('execute', () => {
    it('应该正确执行取消点赞再重新点赞策略', async () => {
      const task = {
        id: '1',
        name: '点赞3次',  
        required: 3,     
        progress: 0,     // 改为0，确保需要完成3次
        status: 0,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      // Mock 获取帖子 - 包含已点赞和未点赞的帖子
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1', liked: true },
              { postId: 'p2', title: '帖子2', liked: true },
              { postId: 'p3', title: '帖子3', liked: false }
            ]
          })
        }
      });

      // Mock getFuliStatus for getProgress
      let progressCallCount = 0;
      mockApiClient.getFuliStatus.mockImplementation(() => {
        progressCallCount++;
        return Promise.resolve({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              tasks: [{ id: '1', progress: Math.min(1 + progressCallCount, 3), required: 3 }]
            })
          }
        });
      });

      // Mock 取消点赞和重新点赞操作
      mockApiClient.toggleLike.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ count: '1' }) }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🧪 开始验证取消点赞再重新点赞策略'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📊 帖子统计'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📋 策略测试结果报告'));

      consoleSpy.mockRestore();
    }, 15000);

    it('应该处理任务已完成的情况', async () => {
      const task = {
        id: '1',
        name: '点赞3次',
        required: 3,
        progress: 3,
        status: 1,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 3, required: 3 }]
          })
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('任务 点赞3次 已完成'));

      consoleSpy.mockRestore();
    });

    it('应该处理没有可用帖子的情况', async () => {
      const task = {
        id: '1',
        name: '点赞3次',
        required: 3,
        progress: 0,
        status: 0,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 3 }]
          })
        }
      });

      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({ posts: [] })
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('没有可用的帖子'));

      consoleSpy.mockRestore();
    });

    it('应该处理策略1：点赞未点赞帖子的情况', async () => {
      const task = {
        id: '1',
        name: '点赞2次',
        required: 2,
        progress: 0,
        status: 0,
        scoreA: 20,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      // Mock 获取帖子 - 包含已点赞的帖子以触发策略1
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1', liked: true },  // 已点赞，会触发策略1
              { postId: 'p2', title: '帖子2', liked: false }
            ]
          })
        }
      });

      let progressCallCount = 0;
      mockApiClient.getFuliStatus.mockImplementation(() => {
        progressCallCount++;
        return Promise.resolve({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              tasks: [{ id: '1', progress: Math.min(progressCallCount, 2), required: 2 }]
            })
          }
        });
      });

      mockApiClient.toggleLike.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ count: '1' }) }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔄 策略1: 测试取消点赞再重新点赞'));

      consoleSpy.mockRestore();
    }, 15000);

    it('应该处理策略2：取消点赞再重新点赞的情况', async () => {
      const task = {
        id: '1',
        name: '点赞2次',
        required: 2,
        progress: 0,
        status: 0,
        scoreA: 20,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      // Mock 获取帖子 - 包含已点赞和未点赞的帖子，需要3次点赞但策略1只能完成1次
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1', liked: true },   // 策略1会处理
              { postId: 'p2', title: '帖子2', liked: false },  // 策略2会处理
              { postId: 'p3', title: '帖子3', liked: false }   // 策略2会处理
            ]
          })
        }
      });

      let progressCallCount = 0;
      mockApiClient.getFuliStatus.mockImplementation(() => {
        progressCallCount++;
        // 模拟进度逐步增加：0 -> 1 -> 2 -> 3，策略1完成1次，策略2需要完成2次
        const currentProgress = Math.min(progressCallCount - 1, 3);
        return Promise.resolve({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              tasks: [{ id: '1', progress: currentProgress, required: 3 }]
            })
          }
        });
      });

      // Mock 取消点赞和重新点赞
      mockApiClient.toggleLike.mockImplementation((postId: string, isLike: boolean) => {
        return Promise.resolve({
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ count: isLike ? '1' : '0' }) }
        });
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🔄 策略2: 点赞未点赞的帖子'));
      // 策略1: 取消点赞p1再重新点赞
      expect(mockApiClient.toggleLike).toHaveBeenCalledWith('p1', false); // 取消点赞
      expect(mockApiClient.toggleLike).toHaveBeenCalledWith('p1', true);  // 重新点赞
      // 策略2: 点赞未点赞的帖子p2或p3
      expect(mockApiClient.toggleLike).toHaveBeenCalledWith(expect.stringMatching(/p[23]/), true);

      consoleSpy.mockRestore();
    }, 15000);

    it('应该处理取消点赞失败的情况', async () => {
      const task = {
        id: '1',
        name: '点赞1次',
        required: 1,
        progress: 0,
        status: 0,
        scoreA: 10,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [{ postId: 'p1', title: '帖子1', liked: true }]
          })
        }
      });

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 1 }]
          })
        }
      });

      // Mock 取消点赞失败
      mockApiClient.toggleLike.mockImplementation((postId: string, isLike: boolean) => {
        if (!isLike) {
          return Promise.resolve({ ret: 1, errmsg: '取消点赞失败', data: {} });
        }
        return Promise.resolve({
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ count: '1' }) }
        });
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📋 策略测试结果报告'));

      consoleSpy.mockRestore();
    });

    it('应该处理重新点赞失败的情况', async () => {
      const task = {
        id: '1',
        name: '点赞1次',
        required: 1,
        progress: 0,
        status: 0,
        scoreA: 10,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [{ postId: 'p1', title: '帖子1', liked: true }]
          })
        }
      });

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 1 }]
          })
        }
      });

      // Mock 取消点赞成功，重新点赞失败
      mockApiClient.toggleLike.mockImplementation((postId: string, isLike: boolean) => {
        if (!isLike) {
          return Promise.resolve({
            ret: 0,
            errmsg: '',
            data: { pack: JSON.stringify({ count: '0' }) }
          });
        } else {
          return Promise.resolve({ ret: 1, errmsg: '重新点赞失败', data: {} });
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📋 策略测试结果报告'));

      consoleSpy.mockRestore();
    });
  });

  describe('getProgress', () => {
    it('应该返回任务的当前进度（无API客户端）', async () => {
      const task: Task = {
        id: '1',
        type: TaskType.LIKE_POST,
        name: '点赞3次',
        required: 3,
        progress: 2,
        status: 0,
        scoreA: 10,
        scoreB: 0
      };

      const progress = await handler.getProgress(task);
      expect(progress).toBe(2);
    });

    it('应该通过API获取实时进度', async () => {
      const task: Task = {
        id: '1',
        type: TaskType.LIKE_POST,
        name: '点赞3次',
        required: 3,
        progress: 2,
        status: 0,
        scoreA: 10,
        scoreB: 0
      };

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '点赞3次',
                required: 3,
                progress: 3,
                status: 1,
                scoreA: 10,
                scoreB: 0
              }
            ]
          })
        }
      });

      const progress = await handler.getProgress(task, mockApiClient);
      expect(progress).toBe(3);
    });

    it('应该在API失败时使用缓存进度', async () => {
      const task: Task = {
        id: '1',
        type: TaskType.LIKE_POST,
        name: '点赞3次',
        required: 3,
        progress: 2,
        status: 0,
        scoreA: 10,
        scoreB: 0
      };

      mockApiClient.getFuliStatus.mockRejectedValue(new Error('API失败'));

      const progress = await handler.getProgress(task, mockApiClient);
      expect(progress).toBe(2);
    });
  });

  describe('错误处理', () => {
    it('应该处理获取帖子时的错误', async () => {
      const task = {
        id: '1',
        name: '点赞1次',
        required: 1,
        progress: 0,
        status: 0,
        scoreA: 10,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 1 }]
          })
        }
      });

      mockApiClient.getPosts.mockRejectedValue(new Error('网络错误'));

      await expect(handler.execute(task, mockContext)).rejects.toThrow('网络错误');
    });

    it('应该处理toggleLike异常', async () => {
      const task = {
        id: '1',
        name: '点赞1次',
        required: 1,
        progress: 0,
        status: 0,
        scoreA: 10,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [{ postId: 'p1', title: '帖子1', liked: false }]
          })
        }
      });

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 1 }]
          })
        }
      });

      mockApiClient.toggleLike.mockRejectedValue(new Error('网络异常'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📋 策略测试结果报告'));

      consoleSpy.mockRestore();
    });
  });
}); 