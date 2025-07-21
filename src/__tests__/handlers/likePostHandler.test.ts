import { LikePostHandler } from '../../handlers/likePostHandler';
import { TaskType, Task } from '../../types';

describe('LikePostHandler', () => {
  let handler: LikePostHandler;

  let mockApiClient: jest.Mocked<{
    getPosts: jest.Mock;
    toggleLike: jest.Mock;
    getFuliStatus: jest.Mock;
  }>;
  let mockFrequencyController: jest.Mocked<{
    randomDelay: jest.Mock;
  }>;

  beforeEach(() => {
    handler = new LikePostHandler();
    
    mockApiClient = {
      getPosts: jest.fn(),
      toggleLike: jest.fn(),
      getFuliStatus: jest.fn()
    };
    
    mockFrequencyController = {
      randomDelay: jest.fn().mockResolvedValue(undefined)
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
    it('应该正确执行点赞帖子任务', async () => {
      const task = {
        id: '1',
        name: '点赞3次',
        required: 3,
        progress: 1,
        status: 0,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      // Mock 获取帖子，包含足够的未点赞帖子
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1', liked: false },
              { postId: 'p2', title: '帖子2', liked: false }
            ]
          })
        }
      });

      // Mock getFuliStatus for getProgress - 简化进度更新逻辑
      mockApiClient.getFuliStatus
        .mockResolvedValueOnce({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              tasks: [{ id: '1', progress: 1, required: 3 }]
            })
          }
        })
        .mockResolvedValue({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              tasks: [{ id: '1', progress: 3, required: 3 }] // 任务已完成
            })
          }
        });

      // 模拟点赞成功
      mockApiClient.toggleLike.mockResolvedValue({ 
        ret: 0, 
        errmsg: '', 
        data: { pack: JSON.stringify({ count: '111' }) } 
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(mockApiClient.getPosts).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('需要点赞 2 次'));
      
      consoleSpy.mockRestore();
    }, 10000); // 增加超时时间到10秒

    it('应该处理点赞全部失败', async () => {
      const task = {
        id: '1',
        name: '点赞3次',
        required: 3,
        progress: 1,
        status: 0,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };
      
      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };
      
      // Mock getFuliStatus for getProgress - 进度不变
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
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1', liked: false },
              { postId: 'p2', title: '帖子2', liked: false }
            ]
          })
        }
      });
      
      // 模拟所有点赞都失败
      mockApiClient.toggleLike.mockRejectedValue(new Error('点赞失败'));
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await handler.execute(task, mockContext);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('只完成了 0/2 次点赞'));
      
      consoleSpy.mockRestore();
    }, 10000); // 增加超时时间到10秒

    it('应该处理没有可用帖子的情况', async () => {
      const task = {
        id: '1',
        name: '点赞3次',
        required: 3,
        progress: 1,
        status: 0,
        scoreA: 30,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };
      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
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

      mockApiClient.getFuliStatus = jest.fn().mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '点赞3次',
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
        type: TaskType.LIKE_POST,
        name: '点赞3次',
        required: 3,
        progress: 2,
        status: 0,
        scoreA: 10,
        scoreB: 0
      };

      mockApiClient.getFuliStatus = jest.fn().mockResolvedValue({
        ret: 1,
        errmsg: '获取失败',
        data: {}
      });

      const progress = await handler.getProgress(task, mockApiClient);
      expect(progress).toBe(2); // 应该返回缓存的进度
    });
  });

  describe('复杂业务逻辑测试', () => {
    it('应该正确执行策略2：取消点赞再重新点赞', async () => {
      const task = {
        id: '1',
        name: '点赞5次',
        required: 5,
        progress: 0,
        status: 0,
        scoreA: 50,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      // Mock 获取帖子 - 所有帖子都已点赞，需要使用策略2
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1', liked: true },
              { postId: 'p2', title: '帖子2', liked: true },
              { postId: 'p3', title: '帖子3', liked: true }
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
              tasks: [{ id: '1', progress: Math.min(progressCallCount, 5), required: 5 }]
            })
          }
        });
      });

      // Mock 取消点赞和重新点赞
      mockApiClient.toggleLike
        .mockImplementation((postId: string, isLike: boolean) => {
          return Promise.resolve({
            ret: 0,
            errmsg: '',
            data: { pack: JSON.stringify({ count: isLike ? '1' : '0' }) }
          });
        });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('策略2: 取消点赞再重新点赞'));
      expect(mockApiClient.toggleLike).toHaveBeenCalledWith('p1', false); // 取消点赞
      expect(mockApiClient.toggleLike).toHaveBeenCalledWith('p1', true);  // 重新点赞

      consoleSpy.mockRestore();
    }, 15000); // 增加超时时间

    it('应该处理策略1和策略2混合执行', async () => {
      const task = {
        id: '1',
        name: '点赞5次',
        required: 5,
        progress: 0,
        status: 0,
        scoreA: 50,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      // Mock 获取帖子 - 部分已点赞，部分未点赞
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1', liked: false },
              { postId: 'p2', title: '帖子2', liked: false },
              { postId: 'p3', title: '帖子3', liked: true },
              { postId: 'p4', title: '帖子4', liked: true }
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
              tasks: [{ id: '1', progress: Math.min(progressCallCount, 5), required: 5 }]
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

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('策略1: 点赞未点赞的帖子'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('策略2: 取消点赞再重新点赞'));

      consoleSpy.mockRestore();
    }, 15000);

    it('应该正确处理分页获取大量帖子', async () => {
      const task = {
        id: '1',
        name: '点赞12次',  
        required: 12,     
        progress: 0,
        status: 0,
        scoreA: 120,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: {
          randomDelay: jest.fn().mockResolvedValue(undefined)  // 简化延迟
        }
      };

      // Mock 分页获取帖子
      let callCount = 0;
      mockApiClient.getPosts.mockImplementation(() => {
        callCount++;
        
        if (callCount === 1) {
          // 第一页
          return Promise.resolve({
            ret: 0,
            errmsg: '',
            data: {
              pack: JSON.stringify({
                posts: Array.from({ length: 5 }, (_, i) => ({
                  postId: `p${i + 1}`,
                  title: `帖子${i + 1}`,
                  liked: false
                })),
                lastId: 'page1_last'
              })
            }
          });
        } else if (callCount === 2) {
          // 第二页
          return Promise.resolve({
            ret: 0,
            errmsg: '',
            data: {
              pack: JSON.stringify({
                posts: Array.from({ length: 5 }, (_, i) => ({
                  postId: `p${i + 6}`,
                  title: `帖子${i + 6}`,
                  liked: false
                })),
                lastId: 'page2_last'
              })
            }
          });
        } else {
          // 第三页
          return Promise.resolve({
            ret: 0,
            errmsg: '',
            data: {
              pack: JSON.stringify({
                posts: Array.from({ length: 5 }, (_, i) => ({
                  postId: `p${i + 11}`,
                  title: `帖子${i + 11}`,
                  liked: false
                })),
                lastId: null
              })
            }
          });
        }
      });

      // 简化进度Mock
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 12 }]  
          })
        }
      });

      // 简化点赞Mock - 快速成功
      mockApiClient.toggleLike.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ count: '1' }) }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      // 等待足够长时间确保所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(mockApiClient.getPosts).toHaveBeenCalledTimes(3); // 获取了3页
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/📄.*共获取|📄.*总计.*帖子/));

      consoleSpy.mockRestore();
    }, 60000);  // 增加超时时间到60秒

    it('应该处理点赞API返回错误但不抛出异常', async () => {
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

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

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

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 3 }]
          })
        }
      });

      // Mock 点赞API返回错误
      mockApiClient.toggleLike.mockResolvedValue({
        ret: 1,
        errmsg: '点赞失败',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // 应该不抛出异常
      await expect(handler.execute(task, mockContext)).resolves.not.toThrow();

      // 等待足够长时间确保所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 500));

      // 根据实际的日志输出调整期望
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('只完成了'));

      consoleSpy.mockRestore();
    });

    it('应该处理所有帖子都已点赞且取消重新点赞也失败的情况', async () => {
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

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      // Mock 获取帖子 - 所有帖子都已点赞
      mockApiClient.getPosts.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [
              { postId: 'p1', title: '帖子1', liked: true },
              { postId: 'p2', title: '帖子2', liked: true }
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

      // Mock 取消点赞失败
      mockApiClient.toggleLike.mockResolvedValue({
        ret: 1,
        errmsg: '操作失败',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      // 等待足够长时间确保所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('所有帖子都已点赞'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('取消重新点赞策略未能完成任务'));

      consoleSpy.mockRestore();
    });
  });

  describe('边界条件和错误处理', () => {
    it('应该处理获取帖子时的网络错误', async () => {
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

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
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

      // Mock 网络错误
      mockApiClient.getPosts.mockRejectedValue(new Error('Network timeout'));

      await expect(handler.execute(task, mockContext)).rejects.toThrow('Network timeout');
    });

    it('应该处理分页获取帖子时的部分失败', async () => {
      const task = {
        id: '1',
        name: '点赞5次',
        required: 5,
        progress: 0,
        status: 0,
        scoreA: 50,
        scoreB: 0,
        type: TaskType.LIKE_POST
      };

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
      };

      let callCount = 0;
      mockApiClient.getPosts.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // 第一页成功
          return Promise.resolve({
            ret: 0,
            errmsg: '',
            data: {
              pack: JSON.stringify({
                posts: [
                  { postId: 'p1', title: '帖子1', liked: false },
                  { postId: 'p2', title: '帖子2', liked: false }
                ],
                lastId: 'page1_last'
              })
            }
          });
        } else {
          // 第二页失败
          return Promise.resolve({
            ret: 1,
            errmsg: '获取失败',
            data: {}
          });
        }
      });

      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [{ id: '1', progress: 0, required: 5 }]
          })
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('获取第 2 页帖子失败'));

      consoleSpy.mockRestore();
    });

    it('应该处理tryLikePost和tryUnlikePost的异常', async () => {
      // 这个测试直接调用私有方法的公共接口
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

      const mockContext = {
        apiClient: mockApiClient,
        frequencyController: mockFrequencyController
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

      // Mock toggleLike 抛出异常
      mockApiClient.toggleLike.mockRejectedValue(new Error('网络异常'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await handler.execute(task, mockContext);

      // 等待足够长时间确保所有异步操作完成
      await new Promise(resolve => setTimeout(resolve, 500));

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('只完成了 0/1 次点赞'));

      consoleSpy.mockRestore();
    });

    it('应该处理进度检查时的API失败', async () => {
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

      // 测试getFuliStatus失败时使用缓存进度
      mockApiClient.getFuliStatus.mockRejectedValue(new Error('API失败'));

      const progress = await handler.getProgress(task, mockApiClient);
      expect(progress).toBe(0); // 应该返回任务中的progress字段
    });
  });
}); 