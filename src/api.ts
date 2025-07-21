import axios, { AxiosInstance } from 'axios';
import { log } from './utils/logger';

export interface ApiConfig {
  cookie: string;
}

export interface ApiResponse<T = unknown> {
  ret: number;
  errmsg: string;
  data: T;
}

export class ApiClient {
  private client: AxiosInstance;
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: 'https://minigame.guangzi.qq.com/starweb',
      timeout: 10000,
      headers: {
        'Cookie': config.cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781(0x6700143B) NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF WindowsWechat(0x63090c33)XWEB/14185',
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'Referer': 'https://servicewechat.com/wx9d135ab589f8beb9/21/page-frame.html'
      }
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        log.apiRequest(config.url || '', config.method?.toUpperCase() || '');
        log.debug('请求详情', {
          url: config.url,
          method: config.method,
          headers: config.headers,
          data: config.data
        });
        return config;
      },
      (error) => {
        log.error('请求配置错误:', error.message);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        log.apiResponse(response.status, response.config.url || '');
        log.debug('响应详情', {
          status: response.status,
          data: response.data
        });
        return response;
      },
      (error) => {
        const url = error.config?.url || '未知URL';
        if (error.response) {
          log.apiError(url, `${error.response.status} - ${error.response.data?.errmsg || error.message}`);
          log.debug('错误响应详情', {
            status: error.response.status,
            data: error.response.data
          });
        } else {
          log.apiError(url, error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * 获取帖子列表
   */
  async getPosts(lastId?: string): Promise<ApiResponse> {
    const requestData: {
      forumId: string;
      listType: number;
      lastId?: string;
    } = {
      forumId: '8',
      listType: 1
    };
    
    // 如果提供了 lastId，添加到请求中进行分页
    if (lastId) {
      requestData.lastId = lastId;
    }
    
    const response = await this.client.post('/7tn8putvbu_p', {
      r: 'ListPost',
      d: JSON.stringify(requestData)
    });
    return response.data;
  }

  /**
   * 查看帖子详情
   */
  async viewPost(postId: string): Promise<ApiResponse> {
    const response = await this.client.post('/7tn8putvbu_p', {
      r: 'GetPostDetail',
      d: JSON.stringify({
        postId: postId
      })
    });
    return response.data;
  }

  /**
   * 点赞/取消点赞帖子
   */
  async toggleLike(postId: string, isLike: boolean = true): Promise<ApiResponse> {
    const response = await this.client.post('/7tn8putvbu_p', {
      r: 'ToggleLike',
      d: JSON.stringify({
        likeType: 'POST',
        targetId: postId,
        isLike: isLike
      })
    });
    return response.data;
  }

  /**
   * 获取福利状态
   */
  async getFuliStatus(): Promise<ApiResponse> {
    const response = await this.client.post('/7tn8putvbu_p', {
      r: 'FuliStatus'
    });
    return response.data;
  }

  /**
   * 获取积分信息
   */
  async getFuliScores(): Promise<ApiResponse> {
    const response = await this.client.post('/7tn8putvbu_p', {
      r: 'FuliScores'
    });
    return response.data;
  }

  /**
   * 获取用户会话信息
   */
  async getSessionWithBindInfo(): Promise<ApiResponse> {
    const response = await this.client.post('/7tn8putvbu_init', {
      with_bind_info: true
    });
    return response.data;
  }

  /**
   * 领取签到奖励
   */
  async claimSignReward(day: number): Promise<ApiResponse> {
    const response = await this.client.post('/7tn8putvbu_p', {
      r: 'PickSignAward',
      d: JSON.stringify({
        day: day
      })
    });
    return response.data;
  }

  /**
   * 领取任务奖励
   */
  async claimTaskReward(taskId: string): Promise<ApiResponse> {
    const response = await this.client.post('/7tn8putvbu_p', {
      r: 'PickTaskScore',
      d: JSON.stringify({
        taskId: taskId
      })
    });
    return response.data;
  }
} 