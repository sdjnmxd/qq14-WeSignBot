// TODO: 测试问题梳理
// 1. 过度mock TaskManager、RewardManager、ApiClient、FrequencyController，导致测试与真实业务脱节，难以发现集成问题。
// 2. 多处直接mock和调用AccountExecutor的私有方法（如getAccountStats、countAvailableRewards），属于“白盒测试”，不利于维护和重构。
// 3. 部分测试仅为覆盖异常分支（如JSON解析失败、API错误、缺少字段等），但实际业务场景极少发生，建议只保留有实际意义的分支测试。
// 4. 由于AccountExecutor高度依赖外部模块，建议后续考虑引入依赖注入或接口抽象，提升可测试性和可维护性。
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
    
    // 覆盖默认的mock，让TaskManager抛出异常
    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockRejectedValue(new Error('Cookie无效')),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
      }
    }));
    
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
    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
      }
    }));
    
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
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockRejectedValue(new Error('统计失败'))
    }));

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
      }
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
  });

  it('应该处理getFuliScores返回错误的情况', async () => {
    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 1, data: { pack: '{}' } })
      }
    }));

    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockResolvedValue(0)
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.coins).toBe(0);
    expect(result.stats?.crystals).toBe(0);
  });

  it('应该处理JSON解析错误的情况', async () => {
    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: 'invalid json' } })
      }
    }));

    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockResolvedValue(0)
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.coins).toBe(0);
    expect(result.stats?.crystals).toBe(0);
  });

  it('应该处理countAvailableRewards中的API错误', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockImplementation(async () => {
        const apiClient = {
          getFuliStatus: jest.fn().mockResolvedValue({ 
            ret: 1, 
            errmsg: 'API错误',
            data: {}
          })
        };
        const rewardManager = { apiClient };
        const executor = new AccountExecutor(configManager);
        return await (executor as any).countAvailableRewards(rewardManager);
      })
    }));

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
      }
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.availableRewards).toBe(0);
  });

  it('应该处理countAvailableRewards中的JSON解析错误', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockImplementation(async () => {
        const apiClient = {
          getFuliStatus: jest.fn().mockResolvedValue({ 
            ret: 0, 
            data: { pack: 'invalid json' }
          })
        };
        const rewardManager = { apiClient };
        const executor = new AccountExecutor(configManager);
        return await (executor as any).countAvailableRewards(rewardManager);
      })
    }));

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
      }
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.availableRewards).toBe(0);
  });

  it('应该正确处理奖励统计', async () => {
    const { RewardManager } = require('../../rewardManager');
    const mockRewardManager = {
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockResolvedValue(4)
    };
    RewardManager.mockImplementation(() => mockRewardManager);

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) } })
      }
    }));

    const executor = new AccountExecutor(configManager);
    
    // Mock countAvailableRewards方法
    jest.spyOn(executor as any, 'countAvailableRewards').mockResolvedValue(4);
    
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.availableRewards).toBe(4); // 2个签到 + 2个任务
    expect(result.stats?.coins).toBe(100);
    expect(result.stats?.crystals).toBe(50);
  });

  it('应该处理空的weekdays和tasks数组', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockImplementation(async () => {
        const apiClient = {
          getFuliStatus: jest.fn().mockResolvedValue({ 
            ret: 0, 
            data: { 
              pack: JSON.stringify({
                weekdays: [],
                tasks: []
              })
            }
          })
        };
        const rewardManager = { apiClient };
        const executor = new AccountExecutor(configManager);
        return await (executor as any).countAvailableRewards(rewardManager);
      })
    }));

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
      }
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.availableRewards).toBe(0);
  });

  it('应该处理缺少data.pack字段的情况', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockImplementation(async () => {
        const apiClient = {
          getFuliStatus: jest.fn().mockResolvedValue({ 
            ret: 0, 
            data: {} // 缺少pack字段
          })
        };
        const rewardManager = { apiClient };
        const executor = new AccountExecutor(configManager);
        return await (executor as any).countAvailableRewards(rewardManager);
      })
    }));

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
      }
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.availableRewards).toBe(0);
  });

  // 新增测试用例来覆盖缺失的分支
  it('应该处理getAccountStats中的积分数据格式错误', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockResolvedValue(0)
    }));

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ 
          ret: 0, 
          data: { pack: 'invalid json' } // 无效的JSON格式
        })
      }
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.coins).toBe(0);
    expect(result.stats?.crystals).toBe(0);
  });

  it('应该处理getAccountStats中的API错误响应', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockResolvedValue(0)
    }));

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ 
          ret: 1, 
          errmsg: 'API错误',
          data: {}
        })
      }
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.coins).toBe(0);
    expect(result.stats?.crystals).toBe(0);
  });

  it('应该处理countAvailableRewards中的API错误', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockImplementation(async () => {
        const apiClient = {
          getFuliStatus: jest.fn().mockResolvedValue({ 
            ret: 1, 
            errmsg: 'API错误',
            data: {}
          })
        };
        const rewardManager = { apiClient };
        const executor = new AccountExecutor(configManager);
        return await (executor as any).countAvailableRewards(rewardManager);
      })
    }));

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
      }
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.availableRewards).toBe(0);
  });

  it('应该处理countAvailableRewards中的JSON解析错误', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockImplementation(async () => {
        const apiClient = {
          getFuliStatus: jest.fn().mockResolvedValue({ 
            ret: 0, 
            data: { pack: 'invalid json' }
          })
        };
        const rewardManager = { apiClient };
        const executor = new AccountExecutor(configManager);
        return await (executor as any).countAvailableRewards(rewardManager);
      })
    }));

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 0, scoreB: 0 }) } })
      }
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.availableRewards).toBe(0);
  });

  it('应该处理displayAccountStats中的奖励显示逻辑', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockResolvedValue(5) // 有可领取奖励
    }));

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) } })
      }
    }));

    const executor = new AccountExecutor(configManager);
    
    // Mock countAvailableRewards方法
    jest.spyOn(executor as any, 'countAvailableRewards').mockResolvedValue(5);
    
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    expect(result.stats?.availableRewards).toBe(5);
  });

  it('应该处理displayExecutionSummary中的各种情况', async () => {
    const { RewardManager } = require('../../rewardManager');
    RewardManager.mockImplementation(() => ({
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      countAvailableRewards: jest.fn().mockResolvedValue(0)
    }));

    const { TaskManager } = require('../../taskManager');
    TaskManager.mockImplementation(() => ({
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([]),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ ret: 0, data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) } })
      }
    }));

    const executor = new AccountExecutor(configManager);
    const result = await executor.executeAccount(mockAccount);
    expect(result.success).toBe(true);
    // 测试没有新任务和奖励的情况
    expect(result.stats?.completedTasks).toBe(0);
    expect(result.stats?.availableRewards).toBe(0);
  });
}); 