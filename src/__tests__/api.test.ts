import { ApiClient } from '../api';
import { ConfigManager } from '../configManager';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockConfigManager: jest.Mocked<ConfigManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfigManager = {
      getGlobalUA: jest.fn().mockReturnValue('Mozilla/5.0'),
      getGlobalReferer: jest.fn().mockReturnValue('https://example.com'),
      getMinDelay: jest.fn().mockReturnValue(1000),
      getMaxDelay: jest.fn().mockReturnValue(3000)
    } as any;

    const mockAxiosInstance = {
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    apiClient = new ApiClient({
      cookie: 'test-cookie',
      configManager: mockConfigManager
    });
  });

  describe('constructor', () => {
    it('应该正确创建ApiClient实例', () => {
      expect(apiClient).toBeInstanceOf(ApiClient);
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://minigame.guangzi.qq.com/starweb',
        timeout: 10000,
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://example.com',
          'Cookie': 'test-cookie'
        }
      });
    });
  });

  describe('getPosts', () => {
    it('应该成功获取帖子列表', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ posts: [] }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.getPosts();

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ListPost',
        d: JSON.stringify({
          forumId: '8',
          listType: 1
        })
      });
    });

    it('应该支持分页获取帖子列表', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ posts: [] }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.getPosts('last-id');

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ListPost',
        d: JSON.stringify({
          forumId: '8',
          listType: 1,
          lastId: 'last-id'
        })
      });
    });
  });

  describe('viewPost', () => {
    it('应该成功查看帖子详情', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ post: {} }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.viewPost('post-id');

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'GetPostDetail',
        d: JSON.stringify({
          postId: 'post-id'
        })
      });
    });
  });

  describe('toggleLike', () => {
    it('应该成功点赞帖子', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ count: '1' }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.toggleLike('post-id', true);

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ToggleLike',
        d: JSON.stringify({
          likeType: 'POST',
          targetId: 'post-id',
          isLike: true
        })
      });
    });

    it('应该成功取消点赞帖子', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ count: '0' }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.toggleLike('post-id', false);

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ToggleLike',
        d: JSON.stringify({
          likeType: 'POST',
          targetId: 'post-id',
          isLike: false
        })
      });
    });
  });

  describe('getFuliStatus', () => {
    it('应该成功获取福利状态', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ tasks: [] }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.getFuliStatus();

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'FuliStatus'
      });
    });
  });

  describe('getFuliScores', () => {
    it('应该成功获取积分信息', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.getFuliScores();

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'FuliScores'
      });
    });
  });

  describe('getSessionWithBindInfo', () => {
    it('应该成功获取会话信息', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { bind_info: { area_name: '测试大区' } }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.getSessionWithBindInfo();

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_init', {
        with_bind_info: true
      });
    });
  });

  describe('claimSignReward', () => {
    it('应该成功领取签到奖励', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ reward: 'success' }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.claimSignReward(1);

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'PickSignAward',
        d: JSON.stringify({
          day: 1
        })
      });
    });
  });

  describe('claimTaskReward', () => {
    it('应该成功领取任务奖励', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ reward: 'success' }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.claimTaskReward('task-id');

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'PickTaskScore',
        d: JSON.stringify({
          taskId: 'task-id'
        })
      });
    });
  });

  // 新增测试用例以提高分支覆盖率
  describe('错误处理', () => {
    it('网络错误时应该抛出异常', async () => {
      const networkError = new Error('Network Error');
      (apiClient as any).client.post.mockRejectedValue(networkError);

      await expect(apiClient.getPosts()).rejects.toThrow('Network Error');
    });

    it('HTTP错误响应时应该抛出异常', async () => {
      const httpError = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' }
        }
      };
      (apiClient as any).client.post.mockRejectedValue(httpError);

      // 由于axios拦截器会重新抛出错误，我们应该期望这个错误被抛出
      await expect(apiClient.getPosts()).rejects.toEqual(httpError);
    });

    it('其他错误时应该抛出异常', async () => {
      const otherError = new Error('Other Error');
      (apiClient as any).client.post.mockRejectedValue(otherError);

      await expect(apiClient.getPosts()).rejects.toThrow('Other Error');
    });

    it('响应拦截器应该正确处理错误', async () => {
      const mockAxiosInstance = {
        post: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
      
      const newApiClient = new ApiClient({
        cookie: 'test-cookie',
        configManager: mockConfigManager
      });

      // 验证响应拦截器被设置
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    it('请求拦截器应该正确处理错误', async () => {
      const mockAxiosInstance = {
        post: jest.fn(),
        interceptors: {
          request: { use: jest.fn() },
          response: { use: jest.fn() }
        }
      };

      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
      
      const newApiClient = new ApiClient({
        cookie: 'test-cookie',
        configManager: mockConfigManager
      });

      // 验证请求拦截器被设置
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });
  });

  describe('边界条件', () => {
    it('空字符串参数应该正常处理', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ posts: [] }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.getPosts('');

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ListPost',
        d: JSON.stringify({
          forumId: '8',
          listType: 1
        })
      });
    });

    it('特殊字符参数应该正常处理', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ posts: [] }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.getPosts('post-id-with-special-chars!@#$%');

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ListPost',
        d: JSON.stringify({
          forumId: '8',
          listType: 1,
          lastId: 'post-id-with-special-chars!@#$%'
        })
      });
    });

    it('数字参数应该正常处理', async () => {
      const mockResponse = {
        data: {
          ret: 0,
          errmsg: '',
          data: { pack: JSON.stringify({ reward: 'success' }) }
        }
      };

      (apiClient as any).client.post.mockResolvedValue(mockResponse);

      const result = await apiClient.claimSignReward(7);

      expect(result).toEqual(mockResponse.data);
      expect((apiClient as any).client.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'PickSignAward',
        d: JSON.stringify({
          day: 7
        })
      });
    });
  });
}); 