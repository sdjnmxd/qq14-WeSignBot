import axios from 'axios';
import { ApiClient } from '../../api';
import { createTestConfigManager } from '../setup/testSetup';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let configManager: any;
  let apiClient: ApiClient;

  beforeEach(() => {
    configManager = createTestConfigManager();
    
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

  describe('API方法测试', () => {
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

  describe('错误处理', () => {
    it('应该处理API错误响应', async () => {
      const mockAxiosInstance = mockedAxios.create();
      (mockAxiosInstance.post as jest.Mock).mockRejectedValue(new Error('网络错误'));

      await expect(apiClient.getFuliStatus()).rejects.toThrow('网络错误');
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

    it('应该处理没有config的错误', async () => {
      const mockAxiosInstance = mockedAxios.create();
      const error = new Error('网络连接失败');
      // 没有config属性
      (mockAxiosInstance.post as jest.Mock).mockRejectedValue(error);

      await expect(apiClient.getPosts()).rejects.toThrow('网络连接失败');
    });

    it('应该处理没有response的错误', async () => {
      const mockAxiosInstance = mockedAxios.create();
      const error = new Error('网络连接失败');
      (error as any).config = { url: '/test' };
      // 没有response属性
      (mockAxiosInstance.post as jest.Mock).mockRejectedValue(error);

      await expect(apiClient.getPosts()).rejects.toThrow('网络连接失败');
    });

    it('应该处理没有data的错误响应', async () => {
      const mockAxiosInstance = mockedAxios.create();
      const error = new Error('服务器错误');
      (error as any).config = { url: '/test' };
      (error as any).response = { 
        status: 500
        // 没有data属性
      };
      (mockAxiosInstance.post as jest.Mock).mockRejectedValue(error);

      await expect(apiClient.getPosts()).rejects.toThrow('服务器错误');
    });

    it('应该处理没有errmsg的错误响应', async () => {
      const mockAxiosInstance = mockedAxios.create();
      const error = new Error('服务器错误');
      (error as any).config = { url: '/test' };
      (error as any).response = { 
        status: 500,
        data: {} // 没有errmsg属性
      };
      (mockAxiosInstance.post as jest.Mock).mockRejectedValue(error);

      await expect(apiClient.getPosts()).rejects.toThrow('服务器错误');
    });
  });

  describe('拦截器分支测试', () => {
    it('应该处理请求配置中缺少url的情况', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      // 获取请求拦截器
      const requestInterceptor = (mockAxiosInstance.interceptors.request.use as jest.Mock).mock.calls[0][0];
      
      // 测试缺少url的配置
      const configWithoutUrl = { method: 'POST' };
      const result = requestInterceptor(configWithoutUrl);
      expect(result).toEqual(configWithoutUrl);
    });

    it('应该处理请求配置中缺少method的情况', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      // 获取请求拦截器
      const requestInterceptor = (mockAxiosInstance.interceptors.request.use as jest.Mock).mock.calls[0][0];
      
      // 测试缺少method的配置
      const configWithoutMethod = { url: '/test' };
      const result = requestInterceptor(configWithoutMethod);
      expect(result).toEqual(configWithoutMethod);
    });

    it('应该处理响应配置中缺少url的情况', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      // 获取响应拦截器
      const responseInterceptor = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0][0];
      
      // 测试缺少url的响应配置
      const responseWithoutUrl = { 
        status: 200,
        config: {}, // 没有url
        data: { ret: 0, data: {} } 
      };
      const result = responseInterceptor(responseWithoutUrl);
      expect(result).toEqual(responseWithoutUrl);
    });

    it('应该处理错误响应中缺少config的情况', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      // 获取响应错误处理器
      const responseErrorHandler = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0][1];
      
      // 测试没有config的错误
      const errorWithoutConfig = new Error('网络连接失败');
      await expect(responseErrorHandler(errorWithoutConfig)).rejects.toThrow('网络连接失败');
    });

    it('应该处理错误响应中缺少response的情况', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      // 获取响应错误处理器
      const responseErrorHandler = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0][1];
      
      // 测试有config但没有response的错误
      const errorWithConfig = new Error('网络连接失败');
      (errorWithConfig as any).config = { url: '/test' };
      await expect(responseErrorHandler(errorWithConfig)).rejects.toThrow('网络连接失败');
    });

    it('应该处理错误响应中缺少data的情况', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      // 获取响应错误处理器
      const responseErrorHandler = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0][1];
      
      // 测试有response但没有data的错误
      const errorWithResponse = new Error('服务器错误');
      (errorWithResponse as any).config = { url: '/test' };
      (errorWithResponse as any).response = { 
        status: 500
        // 没有data属性
      };
      await expect(responseErrorHandler(errorWithResponse)).rejects.toThrow('服务器错误');
    });

    it('应该处理错误响应中缺少errmsg的情况', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      // 获取响应错误处理器
      const responseErrorHandler = (mockAxiosInstance.interceptors.response.use as jest.Mock).mock.calls[0][1];
      
      // 测试有data但没有errmsg的错误
      const errorWithData = new Error('服务器错误');
      (errorWithData as any).config = { url: '/test' };
      (errorWithData as any).response = { 
        status: 500,
        data: {} // 没有errmsg属性
      };
      await expect(responseErrorHandler(errorWithData)).rejects.toThrow('服务器错误');
    });

    it('应该处理请求拦截器错误', async () => {
      const mockAxiosInstance = mockedAxios.create();
      
      // 获取请求错误处理器
      const requestErrorHandler = (mockAxiosInstance.interceptors.request.use as jest.Mock).mock.calls[0][1];
      
      // 测试请求拦截器错误处理
      const requestError = new Error('请求配置错误');
      await expect(requestErrorHandler(requestError)).rejects.toThrow('请求配置错误');
    });
  });
}); 