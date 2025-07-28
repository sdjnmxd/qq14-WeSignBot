import { AccountExecutor } from '../../accountExecutor';
import { createTestConfigManager } from '../setup/testSetup';
import { AccountConfig } from '../../types';

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

    mockTaskManager = {
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      executeAllTasks: jest.fn().mockResolvedValue(undefined),
      getTasks: jest.fn().mockResolvedValue([
        { id: '1', status: 1 }, // 已完成
        { id: '2', status: 0 }  // 未完成
      ]),
      apiClient: {
        getFuliScores: jest.fn().mockResolvedValue({ 
          ret: 0, 
          data: { pack: JSON.stringify({ scoreA: 100, scoreB: 50 }) } 
        }),
        getSessionWithBindInfo: jest.fn().mockResolvedValue({
          ret: 0,
          data: { bind_info: { role_name: '测试角色' } }
        })
      }
    };

    mockRewardManager = {
      claimAllRewards: jest.fn().mockResolvedValue(undefined),
      apiClient: {
        getFuliStatus: jest.fn().mockResolvedValue({
          ret: 0,
          data: { pack: JSON.stringify({ 
            weekdays: [{ status: 1 }], // 可领取的签到奖励
            tasks: [{ status: 1 }]     // 可领取的任务奖励
          })}
        })
      }
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

  describe('核心业务逻辑', () => {
    it('应该能正常执行账号任务', async () => {
      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.accountId).toBe('test');
      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
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
  });

  describe('统计信息处理', () => {
    it('应该正确获取账号统计信息', async () => {
      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats?.totalTasks).toBe(2);
      expect(result.stats?.completedTasks).toBe(1);
    });

    it('应该处理获取任务列表失败', async () => {
      mockTaskManager.getTasks.mockRejectedValue(new Error('获取任务失败'));
      
      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.totalTasks).toBe(0);
    });

    it('应该处理获取积分信息失败', async () => {
      mockTaskManager.apiClient.getFuliScores.mockRejectedValue(new Error('获取积分失败'));
      
      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.coins).toBe(0);
    });
  });

  describe('奖励统计', () => {
    it('应该正确统计可领取奖励', async () => {
      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.availableRewards).toBe(2); // 1个签到奖励 + 1个任务奖励
    });

    it('应该处理奖励状态获取失败', async () => {
      mockRewardManager.apiClient.getFuliStatus.mockRejectedValue(new Error('获取奖励状态失败'));
      
      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.availableRewards).toBe(0);
    });

    it('应该处理奖励状态返回错误', async () => {
      mockRewardManager.apiClient.getFuliStatus.mockResolvedValue({
        ret: 1,
        errmsg: '获取失败'
      });
      
      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.availableRewards).toBe(0);
    });
  });

  describe('显示逻辑测试', () => {
    it('应该显示有奖励的统计信息', async () => {
      // 设置有奖励的情况
      mockRewardManager.apiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        data: { pack: JSON.stringify({ 
          weekdays: [{ status: 1 }], // 可领取的签到奖励
          tasks: [{ status: 1 }]     // 可领取的任务奖励
        })}
      });

      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.availableRewards).toBe(2);
    });

    it('应该显示任务完成情况', async () => {
      // 设置任务完成的情况
      mockTaskManager.getTasks.mockResolvedValue([
        { id: '1', status: 1 }, // 已完成
        { id: '2', status: 1 }  // 已完成
      ]);

      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.completedTasks).toBe(2);
    });

    it('应该显示积分变化', async () => {
      // 设置积分变化的情况
      mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        data: { pack: JSON.stringify({ scoreA: 200, scoreB: 100 }) }
      });

      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.coins).toBe(200);
      expect(result.stats?.crystals).toBe(100);
    });

    it('应该显示任务完成和奖励领取的情况', async () => {
      // 设置初始状态：1个任务完成，2个奖励可领取
      mockTaskManager.getTasks.mockResolvedValue([
        { id: '1', status: 1 }, // 已完成
        { id: '2', status: 0 }  // 未完成
      ]);
      mockRewardManager.apiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        data: { pack: JSON.stringify({ 
          weekdays: [{ status: 1 }], // 可领取的签到奖励
          tasks: [{ status: 1 }]     // 可领取的任务奖励
        })}
      });

      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.completedTasks).toBe(1);
      expect(result.stats?.availableRewards).toBe(2);
    });

    it('应该显示积分和奖励都增加的情况', async () => {
      // 设置积分和奖励都增加的情况
      mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        data: { pack: JSON.stringify({ scoreA: 300, scoreB: 150 }) }
      });
      mockRewardManager.apiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        data: { pack: JSON.stringify({ 
          weekdays: [{ status: 1 }], // 可领取的签到奖励
          tasks: [{ status: 1 }]     // 可领取的任务奖励
        })}
      });

      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.coins).toBe(300);
      expect(result.stats?.crystals).toBe(150);
      expect(result.stats?.availableRewards).toBe(2);
    });

    it('应该显示无新任务和奖励的情况', async () => {
      // 设置无新任务和奖励的情况
      mockTaskManager.getTasks.mockResolvedValue([
        { id: '1', status: 1 }, // 已完成
        { id: '2', status: 1 }  // 已完成
      ]);
      mockRewardManager.apiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        data: { pack: JSON.stringify({ 
          weekdays: [{ status: 0 }], // 已领取的签到奖励
          tasks: [{ status: 0 }]     // 已领取的任务奖励
        })}
      });

      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.completedTasks).toBe(2);
      expect(result.stats?.availableRewards).toBe(0);
    });
  });

  describe('执行摘要计算', () => {
    it('应该正确计算任务完成情况', () => {
      const executor = new AccountExecutor(configManager);
      const initial = { completedTasks: 2, coins: 100, crystals: 50, availableRewards: 3 };
      const final = { completedTasks: 5, coins: 100, crystals: 50, availableRewards: 3 };
      
      const summary = (executor as any).calculateExecutionSummary(initial, final);
      
      expect(summary.tasksDone).toBe(3);
      expect(summary.coinsGained).toBe(0);
      expect(summary.crystalsGained).toBe(0);
      expect(summary.rewardsGained).toBe(0);
      expect(summary.hasProgress).toBe(true);
    });

    it('应该正确计算奖励领取情况', () => {
      const executor = new AccountExecutor(configManager);
      const initial = { completedTasks: 5, coins: 100, crystals: 50, availableRewards: 3 };
      const final = { completedTasks: 5, coins: 100, crystals: 50, availableRewards: 1 };
      
      const summary = (executor as any).calculateExecutionSummary(initial, final);
      
      expect(summary.tasksDone).toBe(0);
      expect(summary.rewardsGained).toBe(2);
      expect(summary.hasProgress).toBe(true);
    });

    it('应该正确计算货币获得情况', () => {
      const executor = new AccountExecutor(configManager);
      const initial = { completedTasks: 5, coins: 100, crystals: 50, availableRewards: 3 };
      const final = { completedTasks: 5, coins: 150, crystals: 80, availableRewards: 3 };
      
      const summary = (executor as any).calculateExecutionSummary(initial, final);
      
      expect(summary.coinsGained).toBe(50);
      expect(summary.crystalsGained).toBe(30);
      expect(summary.hasProgress).toBe(true);
    });

    it('应该正确识别无进展情况', () => {
      const executor = new AccountExecutor(configManager);
      const initial = { completedTasks: 5, coins: 100, crystals: 50, availableRewards: 3 };
      const final = { completedTasks: 5, coins: 100, crystals: 50, availableRewards: 3 };
      
      const summary = (executor as any).calculateExecutionSummary(initial, final);
      
      expect(summary.tasksDone).toBe(0);
      expect(summary.rewardsGained).toBe(0);
      expect(summary.coinsGained).toBe(0);
      expect(summary.crystalsGained).toBe(0);
      expect(summary.hasProgress).toBe(false);
    });
  });

  describe('错误处理', () => {
    it('应该处理JSON解析错误', async () => {
      mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        data: { pack: 'invalid json' }
      });
      
      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.coins).toBe(0);
    });

    it('应该处理缺少字段的情况', async () => {
      mockTaskManager.apiClient.getFuliScores.mockResolvedValue({
        ret: 0,
        data: { pack: JSON.stringify({}) } // 缺少scoreA和scoreB
      });
      
      const result = await accountExecutor.executeAccount(mockAccount);
      expect(result.success).toBe(true);
      expect(result.stats?.coins).toBe(0);
    });
  });
}); 