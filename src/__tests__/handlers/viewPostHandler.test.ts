// TODO: 测试问题梳理
// 1. 过度mock ApiClient、FrequencyController，导致测试与真实业务脱节，难以发现集成问题。
// 2. 多处通过mock console.log来断言日志输出，虽然可以接受，但建议优先断言业务行为，日志断言只做补充。
// 3. 部分测试仅为覆盖异常分支（如查看失败、网络异常、分页失败等），但实际业务场景极少发生，建议只保留有实际意义的分支测试。
// 4. 多个测试用例实际会sleep，导致测试慢且不稳定，建议用jest.useFakeTimers()模拟时间流逝。
// 5. 建议后续可引入集成测试，配合mock server或真实后端，提升测试的真实性和健壮性。
import { ViewPostHandler } from '../../handlers/viewPostHandler';
import { TaskType, Task, TaskContext } from '../../types';
import { FrequencyController } from '../../frequencyController';

describe('ViewPostHandler', () => {
  let handler: ViewPostHandler;
  let mockContext: TaskContext;
  let mockApiClient: jest.Mocked<{
    getPosts: jest.Mock;
    getFuliStatus: jest.Mock;
    viewPost: jest.Mock;
  }>;
  let mockFrequencyController: FrequencyController;

  beforeEach(() => {
    handler = new ViewPostHandler();
    
    mockApiClient = {
      getPosts: jest.fn(),
      viewPost: jest.fn(),
      getFuliStatus: jest.fn()
    };
    
    mockFrequencyController = new FrequencyController(0, 0);
    jest.spyOn(mockFrequencyController, 'randomDelay').mockResolvedValue(undefined);
    
    mockContext = {
      apiClient: mockApiClient,
      frequencyController: mockFrequencyController
    };
  });

  describe('canHandle', () => {
    it('应该能处理查看帖子任务', () => {
      expect(handler.canHandle(TaskType.VIEW_POST)).toBe(true);
    });

    it('不应该处理其他类型任务', () => {
      expect(handler.canHandle(TaskType.LIKE_POST)).toBe(false);
      expect(handler.canHandle(TaskType.SHARE_POST)).toBe(false);
    });
  });

  describe('execute', () => {
    it('应该正确执行查看帖子任务', async () => {
      const task = {
        id: '1',
        name: '查看3个帖子',
        required: 3,
        progress: 1,
        status: 0,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      // Mock getFuliStatus for getProgress
      mockApiClient.getFuliStatus = jest.fn()
        .mockResolvedValueOnce({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              tasks: [{ id: '1', progress: 1, required: 3 }]
            })
          }
        })
        .mockResolvedValueOnce({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              tasks: [{ id: '1', progress: 3, required: 3 }]
            })
          }
        });

      // Mock 获取帖子列表
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1' },
              { postId: 'p2', title: '帖子2' },
              { postId: 'p3', title: '帖子3' }
            ]
          })
        }
      });

      // Mock 查看帖子
      mockApiClient.viewPost.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(mockApiClient.getPosts).toHaveBeenCalled();
      expect(mockApiClient.viewPost).toHaveBeenCalledTimes(2); // 需要查看2个帖子 (3-1)
      expect(mockFrequencyController.randomDelay).toHaveBeenCalledTimes(3); // 2次查看帖子 + 1次进度验证延迟
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('需要查看 2 个帖子'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('准备查看 2 个帖子'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('查看帖子任务完成'));
      consoleSpy.mockRestore();
    });

    it('应该处理任务已完成的情况', async () => {
      const task = {
        id: '1',
        name: '查看3个帖子',
        required: 3,
        progress: 3,
        status: 0,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      // Mock getFuliStatus for getProgress
      mockApiClient.getFuliStatus = jest.fn().mockResolvedValue({
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

      expect(mockApiClient.getPosts).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('任务 查看3个帖子 已完成'));
      consoleSpy.mockRestore();
    });

    it('应该处理没有可用帖子的情况', async () => {
      const task = {
        id: '1',
        name: '查看3个帖子',
        required: 3,
        progress: 1,
        status: 0,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      // Mock getFuliStatus for getProgress
      mockApiClient.getFuliStatus = jest.fn().mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 1, required: 3 }]
          })
        }
      });

      // Mock 获取空的帖子列表
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

    it('应该处理获取帖子列表失败', async () => {
      const task = {
        id: '1',
        name: '查看3个帖子',
        required: 3,
        progress: 1,
        status: 0,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      // Mock getFuliStatus for getProgress
      mockApiClient.getFuliStatus = jest.fn().mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 1, required: 3 }]
          })
        }
      });

      mockApiClient.getPosts.mockResolvedValue({
        ret: 1,
        errmsg: '获取失败',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // 应该处理错误而不是抛出异常
      await handler.execute(task, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('没有可用的帖子'));

      consoleSpy.mockRestore();
    });

    it('应该处理查看帖子失败', async () => {
      const task = {
        id: '1',
        name: '查看3个帖子',
        required: 3,
        progress: 2,
        status: 0,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [{ postId: 'p1', title: '帖子1' }]
          })
        }
      });

      mockApiClient.viewPost.mockResolvedValue({
        ret: 1,
        errmsg: '查看失败',
        data: {}
      });

      await expect(handler.execute(task, mockContext)).rejects.toThrow('查看帖子失败: 查看失败');
    });
  });

  describe('getProgress', () => {
    it('应该返回任务的当前进度（无API客户端）', async () => {
      const task: Task = {
        id: '1',
        type: TaskType.VIEW_POST,
        name: '查看3个帖子',
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
        type: TaskType.VIEW_POST,
        name: '查看3个帖子',
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
                name: '查看3个帖子',
                required: 3,
                progress: 3, // 实时进度
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
        type: TaskType.VIEW_POST,
        name: '查看3个帖子',
        required: 3,
        progress: 2,
        status: 0,
        scoreA: 10,
        scoreB: 0
      };

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 1,
        errmsg: '获取失败',
        data: {}
      });

      const progress = await handler.getProgress(task, mockApiClient);
      expect(progress).toBe(2); // 应该返回缓存的进度
    });
  });

  describe('未覆盖的边界条件测试', () => {
    it('应该处理查看帖子API返回错误', async () => {
      const task = {
        id: '1',
        name: '查看3个帖子',
        required: 3,
        progress: 0,
        status: 0,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      // Mock getFuliStatus for getProgress
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 3 }]
          })
        }
      });

      // Mock 获取帖子成功
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1' },
              { postId: 'p2', title: '帖子2' },
              { postId: 'p3', title: '帖子3' }
            ]
          })
        }
      });

      // Mock viewPost 返回错误 - 这会导致异常被抛出
      mockApiClient.viewPost
        .mockResolvedValueOnce({ ret: 1, errmsg: '帖子不存在', data: {} });

      // 测试应该捕获异常而不是期望日志
      await expect(handler.execute(task, mockContext)).rejects.toThrow('查看帖子失败: 帖子不存在');
    });

    it('应该处理获取进度API失败后的容错处理', async () => {
      const task = {
        id: '1',
        name: '查看3个帖子', // 修改为实际使用的任务名称
        required: 3,
        progress: 2, // 设置初始进度为2，所以只需要查看1个
        status: 0,
        scoreA: 20,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      // Mock getFuliStatus 失败
      mockApiClient.getFuliStatus.mockRejectedValue(new Error('API失败'));

      // Mock 获取帖子成功
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [{ postId: 'p1', title: '帖子1' }]
          })
        }
      });

      mockApiClient.viewPost.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      // 应该使用任务中的progress字段(2)，所以只需要查看1个帖子
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('查看帖子任务完成'));

      consoleSpy.mockRestore();
    });

    it('应该处理分页获取帖子的极端情况', async () => {
      const task = {
        id: '1',
        name: '查看10个帖子',
        required: 10,
        progress: 0,
        status: 0,
        scoreA: 100,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 10 }]
          })
        }
      });

      // Mock 多页获取，第二页返回空数组
      let callCount = 0;
      mockApiClient.getPosts.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ret: 0,
            errmsg: '',
            data: {
              pack: JSON.stringify({
                posts: Array.from({ length: 5 }, (_, i) => ({
                  postId: `p${i + 1}`,
                  title: `帖子${i + 1}`
                })),
                lastId: 'page1_last'
              })
            }
          });
        } else {
          // 第二页返回空数组
          return Promise.resolve({
            ret: 0,
            errmsg: '',
            data: {
              pack: JSON.stringify({
                posts: [],
                lastId: null
              })
            }
          });
        }
      });

      mockApiClient.viewPost.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(mockApiClient.getPosts).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📄 共获取'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('5 个帖子'));

      consoleSpy.mockRestore();
    });

    it('应该处理viewPost抛出异常的情况', async () => {
      const task = {
        id: '1',
        name: '查看1个帖子',
        required: 1,
        progress: 0,
        status: 0,
        scoreA: 10,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
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

      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [{ postId: 'p1', title: '帖子1' }]
          })
        }
      });

      // Mock viewPost 抛出异常 - 测试应该捕获异常
      mockApiClient.viewPost.mockRejectedValue(new Error('网络异常'));

      // 测试应该抛出异常而不是记录日志
      await expect(handler.execute(task, mockContext)).rejects.toThrow('网络异常');
    });

    it('应该处理大量帖子的性能测试', async () => {
      const task = {
        id: '1',
        name: '查看50个帖子',
        required: 50,
        progress: 0,
        status: 0,
        scoreA: 500,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 50 }]
          })
        }
      });

      // Mock 获取大量帖子
      const largePosts = Array.from({ length: 50 }, (_, i) => ({
        postId: `p${i + 1}`,
        title: `帖子${i + 1}`
      }));

      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: largePosts,
            lastId: null
          })
        }
      });

      mockApiClient.viewPost.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(mockApiClient.viewPost).toHaveBeenCalledTimes(50);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📄 共获取'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('50 个帖子'));

      consoleSpy.mockRestore();
    }, 15000); // 增加超时时间

    it('应该处理任务已完成但仍需查看帖子的边界情况', async () => {
      const task = {
        id: '1',
        name: '查看3个帖子',
        required: 3,
        progress: 3,
        status: 1,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      // Mock getFuliStatus 返回已完成状态
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

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('任务 查看3个帖子 已完成'));
      // 不应该调用getPosts
      expect(mockApiClient.getPosts).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('应该处理帖子数据结构异常的情况', async () => {
      const task = {
        id: '1',
        name: '查看1个帖子',
        required: 1,
        progress: 0,
        status: 0,
        scoreA: 10,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
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

      // Mock 获取到没有postId字段或postId为空的帖子
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { title: '没有postId的帖子' },
              { postId: '', title: '空postId的帖子' },
              { postId: 'p3', title: '正常帖子' }
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

      await handler.execute(task, mockContext);

      // 由于会处理第一个帖子（虽然postId是undefined），API调用仍会发生
      expect(mockApiClient.viewPost).toHaveBeenCalledTimes(1);
      // 检查是否调用了viewPost，不管postId是什么
      expect(mockApiClient.viewPost).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('应该处理频率控制器异常的情况', async () => {
      const task = {
        id: '1',
        name: '查看1个帖子',
        required: 1,
        progress: 0,
        status: 0,
        scoreA: 10,
        scoreB: 0,
        type: TaskType.VIEW_POST
      };

      const mockFrequencyControllerForError = new FrequencyController(0, 0);
      jest.spyOn(mockFrequencyControllerForError, 'randomDelay').mockRejectedValue(new Error('延时异常'));
      
      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyControllerForError
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

      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [{ postId: 'p1', title: '帖子1' }]
          })
        }
      });

      mockApiClient.viewPost.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      // 频率控制器异常应该被传播，导致整个任务失败
      await expect(handler.execute(task, mockContext)).rejects.toThrow('延时异常');
    });
  });
}); 