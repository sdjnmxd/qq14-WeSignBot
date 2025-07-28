// TODO: 测试问题梳理
// 1. 过度mock axios，所有请求都被拦截，导致无法发现真实网络层问题。
// 2. 部分测试仅为覆盖异常分支（如网络超时、服务器错误、无效JSON等），但实际业务场景极少发生，建议只保留有实际意义的分支测试。
// 3. 拦截器相关测试直接调用mock的拦截器函数，属于“白盒测试”，不利于维护和重构。
// 4. 建议后续可引入集成测试，配合mock server或真实后端，提升测试的真实性和健壮性。
import axios from 'axios';
import { ApiClient } from '../../api';
import { mockFuliStatusResponse, MockDataBuilder } from '../fixtures/mockData';
import { ConfigManager } from '../../configManager';


jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let configManager: ConfigManager;
  let apiClient: ApiClient;

  beforeEach(() => {
    configManager = new ConfigManager();
    
    // Mock axios.create
    const mockAxiosInstance = {
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
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    apiClient = new ApiClient({
      cookie: 'test-cookie',
      configManager
    });
  });

  describe('constructor', () => {
    it('应该正确创建axios实例', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://minigame.guangzi.qq.com/starweb',
        timeout: 10000,
        headers: {
          'Cookie': 'test-cookie',
          'User-Agent': expect.any(String),
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Referer': expect.any(String)
        }
      });
    });

    it('应该设置请求和响应拦截器', () => {
      const mockAxiosInstance = mockedAxios.create();
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('getFuliStatus', () => {
    it('应该正确调用福利状态接口', async () => {
      const mockResponse = { data: { ret: 0, data: { pack: '{}' } } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.getFuliStatus();
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'FuliStatus'
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该处理API错误响应', async () => {
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockRejectedValue(new Error('网络错误'));

      await expect(apiClient.getFuliStatus()).rejects.toThrow('网络错误');
    });
  });

  describe('getPosts', () => {
    it('应该正确调用帖子列表接口', async () => {
      const mockResponse = { data: { ret: 0, data: { posts: [] } } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.getPosts();
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ListPost',
        d: JSON.stringify({
          forumId: '8',
          listType: 1
        })
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该支持分页参数', async () => {
      const mockResponse = { data: { ret: 0, data: { posts: [] } } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      await apiClient.getPosts('last-id');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
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
    it('应该正确调用查看帖子接口', async () => {
      const mockResponse = { data: { ret: 0, data: {} } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.viewPost('post-id');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'GetPostDetail',
        d: JSON.stringify({
          postId: 'post-id'
        })
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('toggleLike', () => {
    it('应该正确调用点赞接口', async () => {
      const mockResponse = { data: { ret: 0, data: {} } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.toggleLike('post-id', true);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ToggleLike',
        d: JSON.stringify({
          likeType: 'POST',
          targetId: 'post-id',
          isLike: true
        })
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('应该正确调用取消点赞接口', async () => {
      const mockResponse = { data: { ret: 0, data: {} } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.toggleLike('post-id', false);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'ToggleLike',
        d: JSON.stringify({
          likeType: 'POST',
          targetId: 'post-id',
          isLike: false
        })
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getFuliScores', () => {
    it('应该正确调用积分接口', async () => {
      const mockResponse = { data: { ret: 0, data: { pack: '{"scoreA": 100, "scoreB": 50}' } } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.getFuliScores();
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'FuliScores'
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getSessionWithBindInfo', () => {
    it('应该正确调用会话信息接口', async () => {
      const mockResponse = { data: { ret: 0, data: { bind_info: { area_name: '测试区' } } } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.getSessionWithBindInfo();
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_init', {
        with_bind_info: true
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('claimSignReward', () => {
    it('应该正确调用签到奖励接口', async () => {
      const mockResponse = { data: { ret: 0, data: {} } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.claimSignReward(1);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'PickSignAward',
        d: JSON.stringify({
          day: 1
        })
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('claimTaskReward', () => {
    it('应该正确调用任务奖励接口', async () => {
      const mockResponse = { data: { ret: 0, data: {} } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.claimTaskReward('task-id');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'PickTaskScore',
        d: JSON.stringify({
          taskId: 'task-id'
        })
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('错误处理和边界条件', () => {
    it('应该处理网络超时', async () => {
      const mockAxiosInstance = mockedAxios.create();
      const timeoutError = new Error('timeout of 10000ms exceeded');
      (timeoutError as any).code = 'ECONNABORTED';
      (mockAxiosInstance.post as jest.Mock).mockRejectedValue(timeoutError);

      await expect(apiClient.getPosts()).rejects.toThrow('timeout of 10000ms exceeded');
    });

    it('应该处理服务器错误响应', async () => {
      const mockAxiosInstance = mockedAxios.create();
      const serverError = new Error('Request failed with status code 500');
      (serverError as any).response = {
        status: 500,
        data: { errmsg: '服务器内部错误' }
      };
      (mockAxiosInstance.post as jest.Mock).mockRejectedValue(serverError);

      await expect(apiClient.getPosts()).rejects.toThrow('Request failed with status code 500');
    });

    it('应该处理空响应数据', async () => {
      const mockResponse = { data: null };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.getPosts();
      expect(result).toBeNull();
    });

    it('应该处理无效JSON格式', async () => {
      const mockResponse = { data: { ret: 0, data: { pack: 'invalid json' } } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      // 这应该不会抛出异常，因为JSON解析错误在调用方处理
      const result = await apiClient.getFuliScores();
      expect(result).toEqual(mockResponse.data);
    });

    it('应该处理大数据量帖子列表', async () => {
      const mockResponse = { data: { ret: 0, data: { posts: new Array(1000).fill({}) } } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.getPosts();
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('API功能测试', () => {
    it('应该正确处理成功响应', async () => {
      const mockResponse = { data: { ret: 0, data: { success: true } } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.getPosts();
      expect(result.ret).toBe(0);
      expect((result.data as any).success).toBe(true);
    });

    it('应该正确处理错误响应', async () => {
      const mockResponse = { data: { ret: -1, errmsg: '参数错误' } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await apiClient.getPosts();
      expect(result.ret).toBe(-1);
      expect(result.errmsg).toBe('参数错误');
    });

    it('应该处理网络异常', async () => {
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockRejectedValue(new Error('网络连接失败'));

      await expect(apiClient.getPosts()).rejects.toThrow('网络连接失败');
    });

    it('应该正确传递参数', async () => {
      const mockResponse = { data: { ret: 0, data: {} } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      await apiClient.viewPost('test-post-id');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/7tn8putvbu_p', {
        r: 'GetPostDetail',
        d: JSON.stringify({
          postId: 'test-post-id'
        })
      });
    });
  });

  describe('拦截器测试', () => {
    it('应该记录请求信息', async () => {
      const mockResponse = { data: { ret: 0, data: {} } };
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockResolvedValue(mockResponse);

      // 模拟拦截器调用
      const requestInterceptor = (mockAxiosInstance.interceptors.request.use as jest.Mock).mock.calls[0][0];
      const responseInterceptor = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0][0];

      // 测试请求拦截器
      const requestConfig = { url: '/test', method: 'POST' };
      const result = requestInterceptor(requestConfig);
      expect(result).toEqual(requestConfig);

      // 测试响应拦截器
      const response = { status: 200, config: { url: '/test' } };
      const responseResult = responseInterceptor(response);
      expect(responseResult).toEqual(response);
    });

    it('应该处理请求配置错误', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      // 模拟请求拦截器错误处理
      const requestErrorHandler = (mockAxiosInstance.interceptors.request.use as jest.Mock).mock.calls[0][1];
      const error = new Error('请求配置错误');
      
      await expect(requestErrorHandler(error)).rejects.toThrow('请求配置错误');
    });

    it('应该处理响应错误', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      // 模拟响应拦截器错误处理
      const responseErrorHandler = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0][1];
      const error = new Error('响应错误');
      (error as any).config = { url: '/test' };
      (error as any).response = { 
        status: 500, 
        data: { errmsg: '服务器错误' } 
      };
      
      await expect(responseErrorHandler(error)).rejects.toThrow('响应错误');
    });
  });


}); 