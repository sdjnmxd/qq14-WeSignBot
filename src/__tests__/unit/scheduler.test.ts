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

    it('应该处理无效的时间格式', async () => {
      const invalidTimeAccount = {
        id: 'invalid-time',
        cookie: 'cookie',
        name: '无效时间账号',
        schedule: { times: ['invalid', '25:70'], runOnStart: true },
        enabled: true
      };
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([invalidTimeAccount]);
      
      await scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
    });

    it('应该处理空的时间数组', async () => {
      const emptyTimeAccount = {
        id: 'empty-time',
        cookie: 'cookie',
        name: '空时间账号',
        schedule: { times: [], runOnStart: true },
        enabled: true
      };
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([emptyTimeAccount]);
      
      await scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
    });

    it('应该处理单个时间点的情况', async () => {
      const singleTimeAccount = {
        id: 'single-time',
        cookie: 'cookie',
        name: '单时间账号',
        schedule: { times: ['10:30'], runOnStart: true },
        enabled: true
      };
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([singleTimeAccount]);
      
      await scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
    });

    it('应该处理多个时间点的情况', async () => {
      const multiTimeAccount = {
        id: 'multi-time',
        cookie: 'cookie',
        name: '多时间账号',
        schedule: { times: ['06:05', '12:00', '17:00'], runOnStart: true },
        enabled: true
      };
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([multiTimeAccount]);
      
      await scheduler.start();
      expect(scheduler.isSchedulerRunning()).toBe(true);
    });

    it('应该处理showScheduleStatus方法', () => {
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
      
      // 测试有账号的情况
      scheduler.showScheduleStatus();
      
      // 测试无账号的情况
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([]);
      scheduler.showScheduleStatus();
    });

    it('应该处理showScheduleStatus方法中的timeDiff <= 0情况', () => {
      const accountWithPastTime = {
        id: 'past-time',
        cookie: 'cookie',
        name: '过去时间账号',
        schedule: { times: ['00:00'], runOnStart: true },
        enabled: true
      };
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([accountWithPastTime]);
      
      // 模拟job返回过去的时间
      const mockJob = {
        nextInvocation: jest.fn().mockReturnValue(new Date(Date.now() - 1000)), // 1秒前
        cancel: jest.fn()
      } as any;
      scheduler['jobs'].set('past-time', [mockJob]);
      
      scheduler.showScheduleStatus();
    });

    it('应该处理showScheduleStatus方法中的nextTime为null情况', () => {
      const accountWithNullTime = {
        id: 'null-time',
        cookie: 'cookie',
        name: '空时间账号',
        schedule: { times: ['10:00'], runOnStart: true },
        enabled: true
      };
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([accountWithNullTime]);
      
      // 模拟job返回null
      const mockJob = {
        nextInvocation: jest.fn().mockReturnValue(null),
        cancel: jest.fn()
      } as any;
      scheduler['jobs'].set('null-time', [mockJob]);
      
      scheduler.showScheduleStatus();
    });

    it('应该处理showScheduleStatus方法中的预计执行时间计算', () => {
      const accountWithoutJob = {
        id: 'no-job',
        cookie: 'cookie',
        name: '无任务账号',
        schedule: { times: ['15:30', '20:00'], runOnStart: true },
        enabled: true
      };
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([accountWithoutJob]);
      
      scheduler.showScheduleStatus();
    });

    it('应该处理showScheduleStatus方法中的timeDiff <= 0情况（预计执行）', () => {
      const accountWithPastTime = {
        id: 'past-time-expected',
        cookie: 'cookie',
        name: '过去时间预计账号',
        schedule: { times: ['00:00'], runOnStart: true },
        enabled: true
      };
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([accountWithPastTime]);
      
      scheduler.showScheduleStatus();
    });

    it('应该处理displayNextExecutionTime方法', async () => {
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
      
      const newScheduler = new Scheduler(configManager);
      await newScheduler.start();
      
      // 测试有job的情况
      const account = mockAccounts[0];
      await newScheduler['executeAccount'](account);
      
      // 测试无job的情况
      const accountWithoutJob = { ...account, id: 'no-job' };
      await newScheduler['executeAccount'](accountWithoutJob);
    });

    it('应该处理executeAccount的成功情况（有stats）', async () => {
      const { AccountExecutor } = require('../../accountExecutor');
      AccountExecutor.mockImplementation(() => ({
        executeAccount: jest.fn().mockResolvedValue({
          accountId: 'test1',
          success: true,
          startTime: new Date(),
          endTime: new Date(),
          duration: 1000,
          error: undefined,
          stats: { 
            totalTasks: 5, 
            completedTasks: 3, 
            availableRewards: 2,
            coins: 100,
            crystals: 50
          }
        })
      }));
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
      
      const newScheduler = new Scheduler(configManager);
      await newScheduler.start();
      
      const account = mockAccounts[0];
      await newScheduler['executeAccount'](account);
    });

    it('应该处理executeAccount的成功情况（无stats）', async () => {
      const { AccountExecutor } = require('../../accountExecutor');
      AccountExecutor.mockImplementation(() => ({
        executeAccount: jest.fn().mockResolvedValue({
          accountId: 'test1',
          success: true,
          startTime: new Date(),
          endTime: new Date(),
          duration: 1000,
          error: undefined,
          stats: undefined
        })
      }));
      
      jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
      
      const newScheduler = new Scheduler(configManager);
      await newScheduler.start();
      
      const account = mockAccounts[0];
      await newScheduler['executeAccount'](account);
    });

    it('应该处理displayNextExecutionTime的nextTime为null的情况', async () => {
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
      
      const newScheduler = new Scheduler(configManager);
      await newScheduler.start();
      
      // 模拟job.nextInvocation()返回null的情况
      const mockJob = {
        nextInvocation: jest.fn().mockReturnValue(null),
        cancel: jest.fn()
      } as any;
      newScheduler['jobs'].set('test1', [mockJob]);
      
      const account = mockAccounts[0];
      await newScheduler['executeAccount'](account);
    });

    it('应该处理calculateNextExecutionTime方法', () => {
      const rule = new (require('node-schedule').RecurrenceRule)();
      rule.hour = 10;
      rule.minute = 30;
      rule.second = 0;
      
      const result = scheduler['calculateNextExecutionTime'](rule, new Date());
      expect(result).toBeDefined();
    });

    it('应该处理calculateNextExecutionTime方法的错误情况', () => {
      // 测试无效的规则
      const invalidRule = new (require('node-schedule').RecurrenceRule)();
      invalidRule.hour = 25; // 无效的小时
      invalidRule.minute = 70; // 无效的分钟
      invalidRule.second = 0;
      
      const result = scheduler['calculateNextExecutionTime'](invalidRule, new Date());
      expect(result).toBeNull();
    });

    it('应该处理calculateNextExecutionTime方法的scheduleJob返回null的情况', () => {
      // Mock schedule.scheduleJob to return null
      const originalScheduleJob = require('node-schedule').scheduleJob;
      require('node-schedule').scheduleJob = jest.fn().mockReturnValue(null);
      
      const rule = new (require('node-schedule').RecurrenceRule)();
      rule.hour = 10;
      rule.minute = 30;
      rule.second = 0;
      
      const result = scheduler['calculateNextExecutionTime'](rule, new Date());
      expect(result).toBeNull();
      
      // Restore original function
      require('node-schedule').scheduleJob = originalScheduleJob;
    });

    it('应该处理calculateNextExecutionTime方法的异常情况', () => {
      // Mock schedule.scheduleJob to throw an error
      const originalScheduleJob = require('node-schedule').scheduleJob;
      require('node-schedule').scheduleJob = jest.fn().mockImplementation(() => {
        throw new Error('Schedule job creation failed');
      });
      
      const rule = new (require('node-schedule').RecurrenceRule)();
      rule.hour = 10;
      rule.minute = 30;
      rule.second = 0;
      
      const result = scheduler['calculateNextExecutionTime'](rule, new Date());
      expect(result).toBeNull();
      
      // Restore original function
      require('node-schedule').scheduleJob = originalScheduleJob;
    });
  });
});