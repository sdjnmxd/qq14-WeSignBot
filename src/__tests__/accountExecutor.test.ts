import { AccountExecutor } from '../accountExecutor';
import { ConfigManager } from '../configManager';
import { TaskManager } from '../taskManager';
import { RewardManager } from '../rewardManager';
import { ApiClient } from '../api';
import { FrequencyController } from '../frequencyController';

// Mock dependencies
jest.mock('../configManager');
jest.mock('../taskManager');
jest.mock('../rewardManager');
jest.mock('../api');
jest.mock('../frequencyController');

describe('AccountExecutor', () => {
  let accountExecutor: AccountExecutor;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockTaskManager: jest.Mocked<TaskManager>;
  let mockRewardManager: jest.Mocked<RewardManager>;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockFrequencyController: jest.Mocked<FrequencyController>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfigManager = {
      getEnabledAccounts: jest.fn(),
      getAccountById: jest.fn(),
      addAccount: jest.fn(),
      updateAccount: jest.fn(),
      removeAccount: jest.fn(),
      toggleAccount: jest.fn(),
      getGlobalSchedule: jest.fn(),
      setGlobalSchedule: jest.fn(),
      getGlobalUA: jest.fn(),
      getGlobalReferer: jest.fn(),
      getMinDelay: jest.fn(),
      getMaxDelay: jest.fn(),
      getConfigPath: jest.fn(),
      reloadConfig: jest.fn()
    } as any;

    mockApiClient = {
      getFuliScores: jest.fn(),
      getSessionWithBindInfo: jest.fn(),
      getFuliStatus: jest.fn()
    } as any;

    mockFrequencyController = {
      randomDelay: jest.fn()
    } as any;

    mockTaskManager = {
      verifyLogin: jest.fn(),
      getTasks: jest.fn(),
      executeAllTasks: jest.fn(),
      showTaskStatus: jest.fn(),
      apiClient: mockApiClient
    } as any;

    mockRewardManager = {
      claimAllRewards: jest.fn(),
      apiClient: mockApiClient
    } as any;

    // Mock the constructor to return the mocked instances
    (TaskManager as any).mockImplementation(() => mockTaskManager);
    (RewardManager as any).mockImplementation(() => mockRewardManager);

    accountExecutor = new AccountExecutor(mockConfigManager);
  });

  describe('executeAccount', () => {
    const mockAccount = {
      id: 'test-account',
      name: '测试账号',
      cookie: 'test-cookie',
      enabled: true,
      schedule: {
        times: ['08:00', '12:00', '18:00'],
        runOnStart: true
      }
    };

    it('应该成功执行账号任务', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockResolvedValue([]);
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
      });
      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { bind_info: { area_name: '测试大区', role_name: '测试角色' } }
      });

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
      expect(mockTaskManager.verifyLogin).toHaveBeenCalled();
      expect(mockTaskManager.executeAllTasks).toHaveBeenCalled();
      expect(mockRewardManager.claimAllRewards).toHaveBeenCalled();
    });

    it('登录验证失败时应该抛出异常', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockRejectedValue(new Error('登录失败'));

      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(false);
      expect(result.error).toBe('登录失败');
    });

    it('任务执行失败时应该抛出异常', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.executeAllTasks.mockRejectedValue(new Error('任务执行失败'));

      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(false);
      expect(result.error).toBe('任务执行失败');
    });

    it('奖励领取失败时应该抛出异常', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockRejectedValue(new Error('奖励领取失败'));

      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(false);
      expect(result.error).toBe('奖励领取失败');
    });

    // 新增测试用例以提高分支覆盖率
    it('获取积分信息失败时应该使用默认值', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockResolvedValue([]);
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 1,
        errmsg: '获取积分失败',
        data: { pack: '' }
      });
      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { bind_info: { area_name: '测试大区', role_name: '测试角色' } }
      });

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
    });

    it('获取积分信息异常时应该使用默认值', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockResolvedValue([]);
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockRejectedValue(new Error('网络异常'));
      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { bind_info: { area_name: '测试大区', role_name: '测试角色' } }
      });

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
    });

    it('获取会话信息失败时应该继续执行', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockResolvedValue([]);
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
      });
      mockApiClient.getSessionWithBindInfo.mockRejectedValue(new Error('获取会话失败'));

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
    });

    it('获取会话信息返回错误时应该继续执行', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockResolvedValue([]);
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
      });
      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 1,
        errmsg: '获取会话失败',
        data: {}
      });

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
    });

    it('会话信息没有bind_info时应该继续执行', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockResolvedValue([]);
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
      });
      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
    });

    it('会话信息没有role_name时应该继续执行', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockResolvedValue([]);
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
      });
      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { bind_info: { area_name: '测试大区' } }
      });

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
    });

    it('统计奖励数量失败时应该返回0', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockResolvedValue([]);
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
      });
      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { bind_info: { area_name: '测试大区', role_name: '测试角色' } }
      });
      mockApiClient.getFuliStatus.mockRejectedValue(new Error('获取福利状态失败'));

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
    });

    it('统计奖励数量返回错误时应该返回0', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockResolvedValue([]);
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
      });
      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { bind_info: { area_name: '测试大区', role_name: '测试角色' } }
      });
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 1,
        errmsg: '获取福利状态失败',
        data: { pack: '' }
      });

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
    });

    it('统计奖励数量异常时应该返回0', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockResolvedValue([]);
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
      });
      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { bind_info: { area_name: '测试大区', role_name: '测试角色' } }
      });
      mockApiClient.getFuliStatus.mockImplementation(() => {
        throw new Error('统计异常');
      });

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
    });

    it('获取账号统计信息失败时应该使用默认值', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockRejectedValue(new Error('获取任务失败'));
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
      });
      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { bind_info: { area_name: '测试大区', role_name: '测试角色' } }
      });

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
    });

    it('获取账号统计信息异常时应该使用默认值', async () => {
      mockConfigManager.getAccountById.mockReturnValue(mockAccount);
      mockTaskManager.verifyLogin.mockResolvedValue();
      mockTaskManager.getTasks.mockImplementation(() => {
        throw new Error('获取任务异常');
      });
      mockTaskManager.executeAllTasks.mockResolvedValue();
      mockRewardManager.claimAllRewards.mockResolvedValue();
      mockApiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
      });
      mockApiClient.getSessionWithBindInfo.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: { bind_info: { area_name: '测试大区', role_name: '测试角色' } }
      });

      const result = await accountExecutor.executeAccount(mockAccount);

      expect(result.success).toBe(true);
      expect(result.accountName).toBe('测试账号');
    });
  });
}); 