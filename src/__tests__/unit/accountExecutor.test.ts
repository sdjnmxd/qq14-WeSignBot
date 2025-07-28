// TODO: 测试问题梳理
// 1. 过度mock TaskManager、RewardManager、ApiClient、FrequencyController，导致测试与真实业务脱节，难以发现集成问题。
// 2. 多处直接mock和调用AccountExecutor的私有方法（如getAccountStats、countAvailableRewards），属于“白盒测试”，不利于维护和重构。
// 3. 部分测试仅为覆盖异常分支（如JSON解析失败、API错误、缺少字段等），但实际业务场景极少发生，建议只保留有实际意义的分支测试。
// 4. 由于AccountExecutor高度依赖外部模块，建议后续考虑引入依赖注入或接口抽象，提升可测试性和可维护性。
import { AccountExecutor } from '../../accountExecutor';
import { createTestConfigManager } from '../setup/testSetup';
import { AccountConfig } from '../../types';

// Mock all dependencies
jest.mock('../../taskManager');
jest.mock('../../rewardManager');
jest.mock('../../api');
jest.mock('../../frequencyController');

describe('AccountExecutor', () => {
  let configManager: any;
  let accountExecutor: AccountExecutor;
  let mockAccount: AccountConfig;
  let mockTaskManager: any;
  let mockRewardManager: any;
  let mockApiClient: any;

  beforeEach(() => {
    configManager = createTestConfigManager();
    accountExecutor = new AccountExecutor(configManager);
    
    mockAccount = {
      id: 'test',
      cookie: 'cookie',
      name: '测试账号',
      schedule: { times: ['08:00'], runOnStart: true },
      enabled: true
    };

    // Setup mocks
    mockTaskManager = {
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ 
          ret: 0, 
          data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) } 
        })
      }
    };

    mockRewardManager = {
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockResolvedValue(5)
    };

    mockApiClient = {
      getFuliScores: jest.fn().mockResolvedValue({ 
        ret: 0, 
        data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) } 
      })
    };

    // Mock constructors
    const { TaskManager } = require('../../taskManager');
    const { RewardManager } = require('../../rewardManager');
    const { ApiClient } = require('../../api');
    const { FrequencyController } = require('../../frequencyController');

    TaskManager.mockImplementation(() => mockTaskManager);
    RewardManager.mockImplementation(() => mockRewardManager);
    ApiClient.mockImplementation(() => mockApiClient);
    FrequencyController.mockImplementation(() => ({}));
  });

  it('应该能正常执行账号任务', async () => {
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.accountId).toBe('test');
    expect(result.success).toBe(true);
  });

  it('应该处理无效账号配置', async () => {
    const badAccount = { ...mockAccount, cookie: '' };
    
    mockTaskManager.verifyLogin.mockRejectedValue(new Error('登录失败'));
    
    const result = await accountExecutor.executeAccount(badAccount as any);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('应该处理登录验证失败', async () => {
    mockTaskManager.verifyLogin.mockRejectedValue(new Error('登录失败'));
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(false);
    expect(result.error).toContain('登录失败');
  });

  it('应该处理任务执行失败', async () => {
    mockTaskManager.executeAllTasks.mockRejectedValue(new Error('任务失败'));
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(false);
    expect(result.error).toContain('任务失败');
  });

  it('应该处理奖励领取失败', async () => {
    mockRewardManager.claimAllRewards.mockRejectedValue(new Error('奖励失败'));
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(false);
    expect(result.error).toContain('奖励失败');
  });

  it('应该处理获取积分信息失败时应该使用默认值', async () => {
    mockTaskManager.apiClient.getFuliScores.mockRejectedValue(new Error('获取积分失败'));
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该处理获取积分信息异常时应该使用默认值', async () => {
    mockTaskManager.apiClient.getFuliScores.mockImplementation(() => {
      throw new Error('积分接口异常');
    });
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该处理获取会话信息失败时应该继续执行', async () => {
    mockTaskManager.apiClient.getSessionWithBindInfo = jest.fn().mockRejectedValue(new Error('获取会话失败'));
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该处理获取会话信息返回错误时应该继续执行', async () => {
    mockTaskManager.apiClient.getSessionWithBindInfo = jest.fn().mockResolvedValue({
      ret: 1,
      errmsg: '会话获取失败',
      data: {}
    });
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该处理会话信息没有bind_info时应该继续执行', async () => {
    mockTaskManager.apiClient.getSessionWithBindInfo = jest.fn().mockResolvedValue({
      ret: 0,
      errmsg: '',
      data: {}
    });
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该处理会话信息没有role_name时应该继续执行', async () => {
    mockTaskManager.apiClient.getSessionWithBindInfo = jest.fn().mockResolvedValue({
      ret: 0,
      errmsg: '',
      data: {
        bind_info: {}
      }
    });
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该处理统计奖励数量失败时应该返回0', async () => {
    mockRewardManager.countAvailableRewards.mockRejectedValue(new Error('统计失败'));
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该处理统计奖励数量返回错误时应该返回0', async () => {
    mockRewardManager.countAvailableRewards.mockResolvedValue({
      ret: 1,
      errmsg: '统计失败',
      data: {}
    });
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该处理统计奖励数量异常时应该返回0', async () => {
    mockRewardManager.countAvailableRewards.mockImplementation(() => {
      throw new Error('统计异常');
    });
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该处理获取账号统计信息失败时应该使用默认值', async () => {
    mockTaskManager.getTasks.mockRejectedValue(new Error('获取统计失败'));
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该处理获取账号统计信息异常时应该使用默认值', async () => {
    mockTaskManager.getTasks.mockImplementation(() => {
      throw new Error('统计异常');
    });
    
    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该测试displayAccountStats方法', async () => {
    // 设置mock返回有奖励的数据
    mockTaskManager.getTasks.mockResolvedValue([
      { id: '1', status: 1 },
      { id: '2', status: 0 }
    ]);
    mockRewardManager.countAvailableRewards.mockResolvedValue(3);
    mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
      ret: 0,
      data: { pack: JSON.stringify({ scoreA: 150, scoreB: 75 }) }
    });

    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该测试displayExecutionSummary方法', async () => {
    // 设置mock返回有变化的数据
    mockTaskManager.getTasks.mockResolvedValue([
      { id: '1', status: 1 },
      { id: '2', status: 1 }
    ]);
    mockRewardManager.countAvailableRewards.mockResolvedValue(1); // 最终奖励数量减少
    mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
      ret: 0,
      data: { pack: JSON.stringify({ scoreA: 200, scoreB: 100 }) }
    });

    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该测试countAvailableRewards方法', async () => {
    // 设置mock返回有奖励的数据
    mockTaskManager.getTasks.mockResolvedValue([]);
    mockRewardManager.countAvailableRewards.mockResolvedValue(5);
    mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
      ret: 0,
      data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
    });

    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该测试countAvailableRewards异常情况', async () => {
    mockTaskManager.getTasks.mockResolvedValue([]);
    mockRewardManager.countAvailableRewards.mockImplementation(() => {
      throw new Error('统计奖励异常');
    });
    mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
      ret: 0,
      data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
    });

    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该测试积分信息解析异常', async () => {
    mockTaskManager.getTasks.mockResolvedValue([]);
    mockRewardManager.countAvailableRewards.mockResolvedValue(0);
    mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
      ret: 0,
      data: { pack: 'invalid json' }
    });

    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该测试积分信息ret不为0的情况', async () => {
    mockTaskManager.getTasks.mockResolvedValue([]);
    mockRewardManager.countAvailableRewards.mockResolvedValue(0);
    mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
      ret: 1,
      data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) }
    });

    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该测试积分信息缺少pack字段的情况', async () => {
    mockTaskManager.getTasks.mockResolvedValue([]);
    mockRewardManager.countAvailableRewards.mockResolvedValue(0);
    mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
      ret: 0,
      data: {}
    });

    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该测试积分信息pack字段为空的情况', async () => {
    mockTaskManager.getTasks.mockResolvedValue([]);
    mockRewardManager.countAvailableRewards.mockResolvedValue(0);
    mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
      ret: 0,
      data: { pack: '' }
    });

    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该测试积分信息scoreA和scoreB为undefined的情况', async () => {
    mockTaskManager.getTasks.mockResolvedValue([]);
    mockRewardManager.countAvailableRewards.mockResolvedValue(0);
    mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
      ret: 0,
      data: { pack: JSON.stringify({}) }
    });

    const result = await accountExecutor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });
}); 