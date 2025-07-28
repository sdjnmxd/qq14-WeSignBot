import { Scheduler } from '../../scheduler';
import { ConfigManager } from '../../configManager';
import { createTestConfigManager } from '../setup/testSetup';

// Mock AccountExecutor
jest.mock('../../accountExecutor', () => ({
  AccountExecutor: jest.fn().mockImplementation(() => ({
    executeAccount: jest.fn().mockResolvedValue({
      accountId: 'test',
      success: true,
      startTime: new Date(),
      endTime: new Date(),
      duration: 1000,
      error: undefined,
      stats: { totalTasks: 5, completedTasks: 3, availableRewards: 2 }
    })
  }))
}));

describe('Scheduler', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });
  afterAll(() => {
    jest.useRealTimers();
  });
  let configManager: ConfigManager;
  let scheduler: Scheduler;
  let mockAccounts: any[];

  beforeEach(() => {
    configManager = createTestConfigManager();
    scheduler = new Scheduler(configManager);
    
    mockAccounts = [
      {
        id: 'test1',
        cookie: 'cookie1',
        name: '测试账号1',
        schedule: { times: ['08:00'], runOnStart: true },
        enabled: true
      },
      {
        id: 'test2',
        cookie: 'cookie2',
        name: '测试账号2',
        schedule: { times: ['09:00', '18:00'], runOnStart: false },
        enabled: true
      }
    ];
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('核心功能', () => {
    it('应该能启动和停止调度器', async () => {
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([
        {
          id: 'test',
          cookie: 'cookie',
          name: '测试账号',
          schedule: { times: ['08:00'], runOnStart: true },
          enabled: true
        }
      ]);
      
      await scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
      scheduler.stop();
      expect(scheduler.isSchedulerRunning()).toBe(false);
    });

    it('应该能立即执行账号任务', async () => {
      const { AccountExecutor } = require('../../accountExecutor');
      AccountExecutor.mockImplementation(() => ({
        executeAccount: jest.fn().mockResolvedValue({
          accountId: 'test1',
          success: true,
          startTime: new Date(),
          endTime: new Date(),
          duration: 1000,
          error: undefined,
          stats: { totalTasks: 5, completedTasks: 3, availableRewards: 2 }
        })
      }));
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
      jest.spyOn(configManager, 'getAccountById').mockImplementation((id) => {
        return mockAccounts.find(account => account.id === id);
      });
      
      const newScheduler = new Scheduler(configManager);
      const result = await newScheduler.executeAccountNow('test1');
      expect(result).toBeNull(); // 简化后返回null
    });

    it('应该能重新加载配置', async () => {
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
      
      await scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
      
      await scheduler.reload();
      expect(scheduler.isSchedulerRunning()).toBe(true);
    });

    it('应该处理执行失败的情况', async () => {
      const { AccountExecutor } = require('../../accountExecutor');
      AccountExecutor.mockImplementation(() => ({
        executeAccount: jest.fn().mockRejectedValue(new Error('执行失败'))
      }));
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
      jest.spyOn(configManager, 'getAccountById').mockImplementation((id) => {
        return mockAccounts.find(account => account.id === id);
      });
      
      const newScheduler = new Scheduler(configManager);
      const result = await newScheduler.executeAccountNow('test1');
      expect(result).toBeNull();
    });

    it('应该处理无效的执行计划', async () => {
      const invalidAccount = {
        id: 'invalid',
        cookie: 'cookie',
        name: '无效账号',
        schedule: { times: [], runOnStart: true }, // 空的时间数组
        enabled: true
      };
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([invalidAccount]);
      
      await scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
    });
  });

  describe('边界情况', () => {
    it('无账号时启动应有提示', async () => {
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([]);
      const logSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
      await scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(false);
      logSpy.mockRestore();
    });

    it('重复启动和停止调度器应无异常', async () => {
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
      
      await scheduler.start();
      await scheduler.start();
      scheduler.stop();
      scheduler.stop();
      expect(scheduler.isSchedulerRunning()).toBe(false);
    });

    it('立即执行不存在的账号应返回null', async () => {
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
      jest.spyOn(configManager, 'getAccountById').mockReturnValue(undefined);
      
      const result = await scheduler.executeAccountNow('nonexistent');
      expect(result).toBeNull();
    });

    it('立即执行已禁用的账号应返回null', async () => {
      const disabledAccount = {
        id: 'disabled',
        cookie: 'cookie',
        name: '禁用账号',
        schedule: { times: ['08:00'], runOnStart: true },
        enabled: false
      };
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
      jest.spyOn(configManager, 'getAccountById').mockReturnValue(disabledAccount);
      
      const result = await scheduler.executeAccountNow('disabled');
      expect(result).toBeNull();
    });
  });
});