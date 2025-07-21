import axios from 'axios';
import { ApiClient } from '../../api';
import { mockFuliStatusResponse, MockDataBuilder } from '../fixtures/mockData';
import { ConfigManager } from '../../configManager';


jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: jest.Mocked<{
    post: jest.Mock;
    interceptors: {
      request: { use: jest.Mock };
      response: { use: jest.Mock };
    };
  }>;

  beforeEach(() => {
    mockAxiosInstance = {
      post: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn()
        },
        response: {
          use: jest.fn()
        }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance as unknown as any);

    const config = {
      cookie: 'test-cookie'
    };

    apiClient = new ApiClient({ 
      ...config, 
      configManager: {
        getGlobalUA: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c33)XWEB/14185',
        getGlobalReferer: () => 'https://servicewechat.com/wx9d135ab589f8beb9/21/page-frame.html'
      } as unknown as ConfigManager
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('应该正确创建axios实例', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://minigame.guangzi.qq.com/starweb',
        timeout: 10000,
        headers: expect.objectContaining({
          'Cookie': 'test-cookie',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c33)XWEB/14185',
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Referer': 'https://servicewechat.com/wx9d135ab589f8beb9/21/page-frame.html'
        })
      });
    });
  });

  describe('getFuliStatus', () => {
    it('应该正确调用福利状态接口', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockFuliStatusResponse });

      const result = await apiClient.getFuliStatus();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'FuliStatus'
      });
      expect(result).toEqual(mockFuliStatusResponse);
    });

    it('应该处理API错误响应', async () => {
      const errorResponse = MockDataBuilder.createErrorResponse(1, '服务器错误');
      mockAxiosInstance.post.mockResolvedValue({ data: errorResponse });

      const result = await apiClient.getFuliStatus();

      expect(result).toEqual(errorResponse);
      expect(result.ret).toBe(1);
      expect(result.errmsg).toBe('服务器错误');
    });
  });

  describe('getPosts', () => {
    it('应该正确调用帖子列表接口', async () => {
      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            list: []
          })
        }
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.getPosts();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ListPost',
        d: JSON.stringify({
          forumId: '8',
          listType: 1
        })
      });
      expect(result).toEqual(mockResponse);
    });

    it('应该支持分页参数', async () => {
      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: [],
            lastId: '12345'
          })
        }
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.getPosts('51751');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ListPost',
        d: JSON.stringify({
          forumId: '8',
          listType: 1,
          lastId: '51751'
        })
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('viewPost', () => {
    it('应该正确调用查看帖子接口', async () => {
      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {}
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.viewPost('test-post-id');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'GetPostDetail',
        d: JSON.stringify({
          postId: 'test-post-id'
        })
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('toggleLike', () => {
    it('应该正确调用点赞接口', async () => {
      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {}
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.toggleLike('test-post-id', true);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ToggleLike',
        d: JSON.stringify({
          likeType: 'POST',
          targetId: 'test-post-id',
          isLike: true
        })
      });
      expect(result).toEqual(mockResponse);
    });

    it('应该正确调用取消点赞接口', async () => {
      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {}
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.toggleLike('test-post-id', false);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ToggleLike',
        d: JSON.stringify({
          likeType: 'POST',
          targetId: 'test-post-id',
          isLike: false
        })
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getFuliScores', () => {
    it('应该正确调用积分接口', async () => {
      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            scoreA: '100',
            scoreB: '5'
          })
        }
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.getFuliScores();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'FuliScores'
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getSessionWithBindInfo', () => {
    it('应该正确调用会话信息接口', async () => {
      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {
          bind_info: {
            area_name: '测试区服',
            role_name: '测试角色'
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.getSessionWithBindInfo();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_init', {
        with_bind_info: true
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('claimSignReward', () => {
    it('应该正确调用签到奖励接口', async () => {
      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {}
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.claimSignReward(1);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'PickSignAward',
        d: JSON.stringify({
          day: 1
        })
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('claimTaskReward', () => {
    it('应该正确调用任务奖励接口', async () => {
      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {}
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.claimTaskReward('task1');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'PickTaskScore',
        d: JSON.stringify({
          taskId: 'task1'
        })
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('错误处理和边界条件', () => {
    it('应该处理网络超时', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('timeout'));

      await expect(apiClient.getFuliStatus()).rejects.toThrow('timeout');
    });

    it('应该处理服务器错误响应', async () => {
      const mockErrorResponse = {
        ret: -1,
        errmsg: '服务器内部错误',
        data: null
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockErrorResponse });

      const result = await apiClient.getFuliStatus();
      expect(result.ret).toBe(-1);
      expect(result.errmsg).toBe('服务器内部错误');
    });

    it('应该处理空响应数据', async () => {
      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {
          pack: ''
        }
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.getFuliStatus();
      expect((result.data as { pack: string }).pack).toBe('');
    });

    it('应该处理无效JSON格式', async () => {
      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {
          pack: 'invalid json'
        }
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.getFuliStatus();
      expect((result.data as { pack: string }).pack).toBe('invalid json');
    });

    it('应该处理大数据量帖子列表', async () => {
      const largePosts = Array.from({ length: 1000 }, (_, i) => ({
        postId: `post_${i}`,
        title: `测试帖子 ${i}`,
        liked: false
      }));

      const mockResponse = {
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            posts: largePosts,
            lastId: 'last_1000'
          })
        }
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await apiClient.getPosts();
      expect(result.ret).toBe(0);
      
      const packData = JSON.parse((result.data as { pack: string }).pack);
      expect(packData.posts).toHaveLength(1000);
    });
  });

  describe('API功能测试', () => {
    it('应该正确处理成功响应', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { ret: 0, errmsg: '', data: { pack: '{}' } }
      });

      const result = await apiClient.getFuliStatus();
      expect(result.ret).toBe(0);
      expect(result.errmsg).toBe('');
    });

    it('应该正确处理错误响应', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { ret: 1, errmsg: '请求失败', data: {} }
      });

      const result = await apiClient.getFuliStatus();
      expect(result.ret).toBe(1);
      expect(result.errmsg).toBe('请求失败');
    });

    it('应该处理网络异常', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.post.mockRejectedValue(networkError);

      await expect(apiClient.getFuliStatus()).rejects.toThrow('Network Error');
    });

    it('应该正确传递参数', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { ret: 0, errmsg: '', data: {} }
      });

      await apiClient.getPosts('test-last-id');
      
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          d: expect.stringContaining('test-last-id'),
          r: 'ListPost'
        })
      );
    });
  });
}); 