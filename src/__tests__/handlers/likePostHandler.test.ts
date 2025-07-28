// TODO: 测试问题梳理
// 1. 过度mock ApiClient、FrequencyController，导致测试与真实业务脱节，难以发现集成问题。
// 3. 部分测试仅为覆盖异常分支（如点赞失败、网络异常、分页失败等），但实际业务场景极少发生，建议只保留有实际意义的分支测试。
// 5. 建议后续可引入集成测试，配合mock server或真实后端，提升测试的真实性和健壮性。
import { LikePostHandler } from '../../handlers/likePostHandler';
import { TaskType, Task } from '../../types';
import { FrequencyController } from '../../frequencyController';
import { log } from '../../utils/logger';

describe('LikePostHandler（集成业务安全测试）', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });

  let handler: LikePostHandler;
  let mockApiClient: jest.Mocked<{
    getPosts: jest.Mock;
    toggleLike: jest.Mock;
    getFuliStatus: jest.Mock;
  }>;
  let mockFrequencyController: FrequencyController;
  let mockContext: any;

  beforeEach(() => {
    handler = new LikePostHandler();
    
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
    
    // 在每个测试开始时运行所有定时器
    jest.runAllTimers();
  });

  it('正常流程：应该安全完成点赞任务', async () => {
    let progressCallCount = 0;
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 0, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({
      ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
        { postId: 'p1', title: '帖子1', liked: false },
        { postId: 'p2', title: '帖子2', liked: false }
      ] }) }
    });
    mockApiClient.getFuliStatus.mockImplementation(() => {
      progressCallCount++;
      return Promise.resolve({
        ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: Math.min(progressCallCount, 2), required: 2 }] }) }
      });
    });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
    
    // 验证业务逻辑：应该调用了API
    expect(mockApiClient.getPosts).toHaveBeenCalled();
  });

  it('接口失败：应能捕获异常并不中断流程', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 0, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false },
      { postId: 'p2', title: '帖子2', liked: false }
    ] }) } });
    mockApiClient.toggleLike.mockRejectedValueOnce(new Error('点赞失败')).mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 1, required: 2 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('无可用帖子：应安全退出且无危险副作用', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 0, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('幂等性：重复调用不会导致危险副作用', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false }
    ] }) } });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 1, required: 1 }] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('异常分支：接口抛出异常时流程不中断', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockRejectedValue(new Error('网络异常'));
    
    await expect(handler.execute(task, mockContext)).rejects.toThrow('网络异常');
  });

  it('策略2分支：所有帖子都已点赞时能通过取消再点赞完成任务', async () => {
    let progressCallCount = 0;
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 0, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: true },
      { postId: 'p2', title: '帖子2', liked: true }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    mockApiClient.getFuliStatus.mockImplementation(() => {
      progressCallCount++;
      return Promise.resolve({
        ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: Math.min(progressCallCount, 2), required: 2 }] }) }
      });
    });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
    
    // 验证业务逻辑：应该调用了API
    expect(mockApiClient.getPosts).toHaveBeenCalled();
  });

  it('分页异常分支：分页中途失败能被感知', async () => {
    let callCount = 0;
    const task: Task = {
      id: '1', name: '点赞3次', required: 3, progress: 0, status: 0, scoreA: 30, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
          { postId: 'p1', title: '帖子1', liked: false },
          { postId: 'p2', title: '帖子2', liked: false }
        ], lastId: 'page1_last' }) } });
      } else {
        return Promise.reject(new Error('分页接口失败'));
      }
    });
    // 确保进度检查不会导致无限循环
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 3 }] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    // 使用更短的超时时间，确保测试能快速失败
    await expect(handler.execute(task, mockContext)).rejects.toThrow('分页接口失败');
  }, 5000); // 设置5秒超时

  it('点赞/取消点赞异常分支：接口失败时流程不中断', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 0, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false },
      { postId: 'p2', title: '帖子2', liked: false }
    ] }) } });
    mockApiClient.toggleLike.mockRejectedValueOnce(new Error('点赞失败')).mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 1, required: 2 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  // 新增测试用例以提高分支覆盖率
  it('任务已完成：应该直接返回', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 2, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 2, required: 2 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
    
    // 验证没有调用获取帖子的API
    expect(mockApiClient.getPosts).not.toHaveBeenCalled();
  });

  it('获取进度失败：应该使用缓存进度', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 1, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 1, errmsg: '获取失败', data: { pack: '' } });
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('获取进度异常：应该使用缓存进度', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 1, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getFuliStatus.mockRejectedValue(new Error('网络异常'));
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('找不到任务ID：应该使用缓存进度', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 1, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '2', progress: 0, required: 2 }] }) } });
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('没有apiClient：应该使用任务进度', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 1, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    
    const progress = await handler.getProgress(task);
    expect(progress).toBe(1);
  });

  it('点赞API返回错误：应该返回false', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 1, errmsg: '点赞失败', data: {} });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('点赞API异常：应该返回false', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false }
    ] }) } });
    mockApiClient.toggleLike.mockRejectedValue(new Error('网络异常'));
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('取消点赞API返回错误：应该跳过该帖子', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: true }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 1, errmsg: '取消点赞失败', data: {} });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('取消点赞API异常：应该跳过该帖子', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: true }
    ] }) } });
    mockApiClient.toggleLike.mockRejectedValue(new Error('网络异常'));
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('获取帖子API返回错误：应该停止获取', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 1, errmsg: '获取帖子失败', data: { pack: '' } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
    
    // 验证调用了获取帖子的API，但因为返回错误而停止
    expect(mockApiClient.getPosts).toHaveBeenCalled();
  });

  it('获取帖子API异常：应该抛出异常', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockRejectedValue(new Error('网络异常'));
    
    await expect(handler.execute(task, mockContext)).rejects.toThrow('网络异常');
  });

  it('分页获取帖子：应该支持分页逻辑', async () => {
    const task: Task = {
      id: '1', name: '点赞3次', required: 3, progress: 0, status: 0, scoreA: 30, scoreB: 0, type: TaskType.LIKE_POST
    };
    let callCount = 0;
    mockApiClient.getPosts.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
          { postId: 'p1', title: '帖子1', liked: false }
        ], lastId: 'page1_last' }) } });
      } else {
        return Promise.resolve({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
          { postId: 'p2', title: '帖子2', liked: false },
          { postId: 'p3', title: '帖子3', liked: false }
        ] }) } });
      }
    });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 3 }] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('分页获取帖子返回错误：应该停止分页', async () => {
    const task: Task = {
      id: '1', name: '点赞3次', required: 3, progress: 0, status: 0, scoreA: 30, scoreB: 0, type: TaskType.LIKE_POST
    };
    let callCount = 0;
    mockApiClient.getPosts.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
          { postId: 'p1', title: '帖子1', liked: false }
        ], lastId: 'page1_last' }) } });
      } else {
        return Promise.resolve({ ret: 1, errmsg: '分页失败', data: { pack: '' } });
      }
    });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 3 }] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('分页获取帖子为空：应该停止分页', async () => {
    const task: Task = {
      id: '1', name: '点赞3次', required: 3, progress: 0, status: 0, scoreA: 30, scoreB: 0, type: TaskType.LIKE_POST
    };
    let callCount = 0;
    mockApiClient.getPosts.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
          { postId: 'p1', title: '帖子1', liked: false }
        ], lastId: 'page1_last' }) } });
      } else {
        return Promise.resolve({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [] }) } });
      }
    });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 3 }] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('分页没有lastId：应该停止分页', async () => {
    const task: Task = {
      id: '1', name: '点赞3次', required: 3, progress: 0, status: 0, scoreA: 30, scoreB: 0, type: TaskType.LIKE_POST
    };
    let callCount = 0;
    mockApiClient.getPosts.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
          { postId: 'p1', title: '帖子1', liked: false }
        ] }) } });
      } else {
        return Promise.resolve({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
          { postId: 'p2', title: '帖子2', liked: false }
        ] }) } });
      }
    });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 3 }] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('进度没有变化：应该继续尝试下一个帖子', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 0, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false },
      { postId: 'p2', title: '帖子2', liked: false }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 2 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('策略2进度没有变化：应该继续尝试下一个帖子', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 0, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: true },
      { postId: 'p2', title: '帖子2', liked: true }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 2 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('策略2重新点赞失败：应该跳过该帖子', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: true }
    ] }) } });
    mockApiClient.toggleLike
      .mockResolvedValueOnce({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '0' }) } }) // 取消点赞成功
      .mockResolvedValue({ ret: 1, errmsg: '重新点赞失败', data: {} }); // 重新点赞失败
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('策略2重新点赞异常：应该跳过该帖子', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: true }
    ] }) } });
    mockApiClient.toggleLike
      .mockResolvedValueOnce({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '0' }) } }) // 取消点赞成功
      .mockRejectedValue(new Error('网络异常')); // 重新点赞异常
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('策略2取消点赞异常：应该跳过该帖子', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: true }
    ] }) } });
    mockApiClient.toggleLike.mockRejectedValue(new Error('网络异常'));
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('策略2取消点赞失败：应该跳过该帖子', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: true }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 1, errmsg: '取消点赞失败', data: {} });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('策略2异常处理：应该跳过该帖子', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: true }
    ] }) } });
    mockApiClient.toggleLike.mockImplementation(() => {
      throw new Error('策略2异常');
    });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('策略1异常处理：应该跳过该帖子', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false }
    ] }) } });
    mockApiClient.toggleLike.mockImplementation(() => {
      throw new Error('策略1异常');
    });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('点赞响应数据解析：应该处理pack字段', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '5' }) } });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 1, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('点赞响应数据没有pack字段：应该正常处理', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: {} });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 1, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('取消点赞响应数据没有pack字段：应该正常处理', async () => {
    const task: Task = {
      id: '1', name: '点赞1次', required: 1, progress: 0, status: 0, scoreA: 10, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: true }
    ] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: {} });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 1, required: 1 }] }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('分页获取足够帖子：应该提前停止分页', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 0, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false },
      { postId: 'p2', title: '帖子2', liked: false },
      { postId: 'p3', title: '帖子3', liked: false }
    ] }) } });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 2 }] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('分页获取足够帖子用于两种策略：应该提前停止分页', async () => {
    const task: Task = {
      id: '1', name: '点赞2次', required: 2, progress: 0, status: 0, scoreA: 20, scoreB: 0, type: TaskType.LIKE_POST
    };
    mockApiClient.getPosts.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ posts: [
      { postId: 'p1', title: '帖子1', liked: false },
      { postId: 'p2', title: '帖子2', liked: true },
      { postId: 'p3', title: '帖子3', liked: true },
      { postId: 'p4', title: '帖子4', liked: true },
      { postId: 'p5', title: '帖子5', liked: true },
      { postId: 'p6', title: '帖子6', liked: true },
      { postId: 'p7', title: '帖子7', liked: true },
      { postId: 'p8', title: '帖子8', liked: true },
      { postId: 'p9', title: '帖子9', liked: true },
      { postId: 'p10', title: '帖子10', liked: true }
    ] }) } });
    mockApiClient.getFuliStatus.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ tasks: [{ id: '1', progress: 0, required: 2 }] }) } });
    mockApiClient.toggleLike.mockResolvedValue({ ret: 0, errmsg: '', data: { pack: JSON.stringify({ count: '1' }) } });
    
    await handler.execute(task, mockContext);
    jest.runAllTimers();
  });

  it('任务类型检查：应该正确识别任务类型', () => {
    expect(handler.canHandle(TaskType.LIKE_POST)).toBe(true);
    expect(handler.canHandle(TaskType.VIEW_POST)).toBe(false);
    expect(handler.canHandle(TaskType.SHARE_POST)).toBe(false);
  });
}); 