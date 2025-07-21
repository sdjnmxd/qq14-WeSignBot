import { AccountExecutor } from '../../accountExecutor';
import { ConfigManager } from '../../configManager';
import { AccountConfig } from '../../types';

// mock 依赖
jest.mock('../../api', () => ({
  ApiClient: jest.fn().mockImplementation(() => ({
    getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } }),
    getSessionWithBindInfo: jest.fn().mockResolvedValue({ ret: 0, data: {} }),
    getFuliStatus: jest.fn().mockResolvedValue({ ret: 0, data: {} })
  }))
}));
jest.mock('../../taskManager', () => ({
  TaskManager: jest.fn().mockImplementation(() => ({
    verifyLogin: jest.fn().mockResolvedValue(undefined),
    getTasks: jest.fn().mockResolvedValue([]),
    executeAllTasks: jest.fn().mockResolvedValue(undefined),
    apiClient: {
      getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
    }
  }))
}));
jest.mock('../../rewardManager', () => ({
  RewardManager: jest.fn().mockImplementation(() => ({
    claimAllRewards: jest.fn().mockResolvedValue(undefined),
    countAvailableRewards: jest.fn().mockResolvedValue(0)
  }))
}));
jest.mock('../../frequencyController', () => ({
  FrequencyController: jest.fn().mockImplementation(() => ({
    randomDelay: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('AccountExecutor', () => {
  let executor: AccountExecutor;
  let configManager: ConfigManager;
  let mockAccount: AccountConfig;

  beforeEach(() => {
    configManager = new ConfigManager();
    executor = new AccountExecutor(configManager);
    mockAccount = {
      id: 'test',
      cookie: 'cookie',
      name: '测试账号',
      schedule: { times: ['08:00'], runOnStart: true },
      enabled: true
    };
  });

  it('应该能正常执行账号任务', async () => {
    const result = await executor.executeAccount(mockAccount);
    expect(result.accountId).toBe('test');
    expect(result.success).toBe(true);
  });

  it('遇到异常时应该返回失败', async () => {
    // 传入非法账号，触发异常
    const badAccount = { ...mockAccount, cookie: '' };
    const result = await executor.executeAccount(badAccount as any);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('登录失败时应该返回失败', async () => {
    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockRejectedValue(new Error('登录失败')),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
      }
    }));
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(false);
    expect(result.error).toContain('登录失败');
  });

  it('任务执行失败时应该返回失败', async () => {
    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockRejectedValue(new Error('任务失败')),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
      }
    }));
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(false);
    expect(result.error).toContain('任务失败');
  });

  it('奖励领取失败时应该返回失败', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockRejectedValue(new Error('奖励失败')),
      countAvailableRewards: jest.fn().mockResolvedValue(0)
    }));
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(false);
    expect(result.error).toContain('奖励失败');
  });

  it('getAccountStats 异常时应返回默认值', async () => {
    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      getTasks: jest.fn().mockRejectedValue(new Error('任务接口异常')),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 1, data: { pack: '{}' } })
      }
    }));
    // 直接调用私有方法
    const stats = await (executor as any).getAccountStats(new TaskManager(), new (require('../../rewardManager').RewardManager)());
    expect(stats.totalTasks).toBe(0);
    expect(stats.completedTasks).toBe(0);
    expect(stats.availableRewards).toBe(0);
  });

  it('countAvailableRewards 异常时应返回 0', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      apiClient: {
        getFuliStatus: jest.fn().mockRejectedValue(new Error('接口异常'))
      }
    }));
    const count = await (executor as any).countAvailableRewards(new (require('../../rewardManager').RewardManager)());
    expect(count).toBe(0);
  });
}); 