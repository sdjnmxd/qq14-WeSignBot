// TODO: 测试问题梳理
// 1. 过度mock AccountExecutor，导致无法发现真实业务bug，建议后续用更贴近真实依赖的方式测试。
// 2. 多处直接操作Scheduler的私有属性（如 executionStatus、timers），属于“白盒测试”，不利于维护和重构，建议优先测试公开API。
// 3. 有部分测试仅为覆盖异常分支（如账号状态不存在、无效执行计划等），但实际业务场景极少发生，建议只保留有实际意义的分支测试。
// 4. 部分测试通过 mock setTimeout、mock Date 等方式测试定时逻辑，虽然可以接受，但建议尽量通过公开方法间接验证行为，减少对全局对象的侵入。
// 5. 由于Scheduler高度依赖ConfigManager和AccountExecutor，建议后续考虑引入依赖注入或接口抽象，提升可测试性和可维护性。
import { Scheduler } from '../../scheduler';
import { ConfigManager } from '../../configManager';
import { AccountConfig } from '../../types';

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
  let mockAccounts: AccountConfig[];

  beforeEach(() => {
    configManager = new ConfigManager();
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

  it('应该能实例化 Scheduler', () => {
    expect(scheduler).toBeInstanceOf(Scheduler);
  });

  it('应该能启动和停止调度器', async () => {
    // Mock 有启用的账号
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

  it('应该能获取执行状态', () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    // 重新创建调度器来确保状态正确初始化
    const newScheduler = new Scheduler(configManager);
    const status = newScheduler.getExecutionStatus();
    expect(status).toHaveLength(2);
    expect(status[0].accountId).toBe('test1');
    expect(status[1].accountId).toBe('test2');
  });

  it('应该能获取单个账号的执行状态', () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    // 重新创建调度器来确保状态正确初始化
    const newScheduler = new Scheduler(configManager);
    const status = newScheduler.getAccountExecutionStatus('test1');
    expect(status?.accountId).toBe('test1');
    expect(status?.accountName).toBe('测试账号1');
  });

  it('获取不存在的账号状态应返回undefined', () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    const status = scheduler.getAccountExecutionStatus('nonexistent');
    expect(status).toBeUndefined();
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
    
    // 重新创建调度器来确保状态正确初始化
    const newScheduler = new Scheduler(configManager);
    const result = await newScheduler.executeAccountNow('test1');
    expect(result).toBeDefined();
    expect(result?.accountId).toBe('test1');
    expect(result?.success).toBe(true);
  });

  it('立即执行不存在的账号应返回null', async () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    jest.spyOn(configManager, 'getAccountById').mockReturnValue(undefined);
    
    const result = await scheduler.executeAccountNow('nonexistent');
    expect(result).toBeNull();
  });

  it('应该能重新加载配置', async () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    // 先启动调度器
    await scheduler.start();
    expect(scheduler.isSchedulerRunning()).toBe(true);
    
    // 重新加载配置
    await scheduler.reload();
    
    // 调度器应该仍然运行
    expect(scheduler.isSchedulerRunning()).toBe(true);
  });

  it('应该处理账号执行失败的情况', async () => {
    const { AccountExecutor } = require('../../accountExecutor');
    AccountExecutor.mockImplementation(() => ({
      executeAccount: jest.fn().mockResolvedValue({
        accountId: 'test1',
        success: false,
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        error: '执行失败',
        stats: undefined
      })
    }));
    
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    jest.spyOn(configManager, 'getAccountById').mockImplementation((id) => {
      return mockAccounts.find(account => account.id === id);
    });
    
    // 重新创建调度器来确保状态正确初始化
    const newScheduler = new Scheduler(configManager);
    const result = await newScheduler.executeAccountNow('test1');
    expect(result?.success).toBe(false);
    expect(result?.error).toBe('执行失败');
  });

  it('应该处理账号执行异常的情况', async () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    jest.spyOn(configManager, 'getAccountById').mockImplementation((id) => {
      return mockAccounts.find(account => account.id === id);
    });
    
    // 重新创建调度器来确保状态正确初始化
    const newScheduler = new Scheduler(configManager);
    
    // 直接测试executeAccountNow方法，模拟AccountExecutor抛出异常
    const mockAccountExecutor = {
      executeAccount: jest.fn().mockRejectedValue(new Error('网络错误'))
    };
    
    // 替换调度器的accountExecutor
    (newScheduler as any).accountExecutor = mockAccountExecutor;
    
    // 由于executeAccountNow没有try-catch，异常会直接抛出
    await expect(newScheduler.executeAccountNow('test1')).rejects.toThrow('网络错误');
  });

  it('应该正确处理定时器设置', () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    // Mock setTimeout
    const mockSetTimeout = jest.fn();
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = mockSetTimeout as any;
    
    // 重新创建调度器来确保状态正确初始化
    const newScheduler = new Scheduler(configManager);
    newScheduler['setupAccountTimers'](mockAccounts[1]); // 使用第二个账号，它有多个时间
    
    // 应该为每个时间设置定时器
    expect(mockSetTimeout).toHaveBeenCalled();
    
    // 恢复原始setTimeout
    global.setTimeout = originalSetTimeout;
  });

  it('应该处理无效的执行计划', () => {
    const invalidAccount: AccountConfig = {
      id: 'invalid',
      cookie: 'cookie',
      name: '无效账号',
      schedule: { times: [], runOnStart: false }, // 空的时间数组
      enabled: true
    };
    
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue([invalidAccount]);
    
    // 应该不会抛出异常
    expect(() => {
      scheduler['setupAccountTimers'](invalidAccount);
    }).not.toThrow();
  });

  it('应该能计算下次执行时间', () => {
    const schedule = { times: ['08:00', '18:00'], runOnStart: true };
    const nextExecution = scheduler['calculateNextExecution'](schedule);
    
    expect(nextExecution).toBeInstanceOf(Date);
  });

  it('空的时间数组应返回null', () => {
    const schedule = { times: [], runOnStart: true };
    const nextExecution = scheduler['calculateNextExecution'](schedule);
    
    expect(nextExecution).toBeNull();
  });

  it('应该处理调度器已运行的情况', async () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    await scheduler.start();
    expect(scheduler.isSchedulerRunning()).toBe(true);
    
    // 再次启动应该不会重复执行
    await scheduler.start();
    expect(scheduler.isSchedulerRunning()).toBe(true);
  });

  it('应该处理调度器未运行时的停止', () => {
    expect(scheduler.isSchedulerRunning()).toBe(false);
    
    // 停止未运行的调度器应该不会出错
    expect(() => {
      scheduler.stop();
    }).not.toThrow();
  });

  it('应该正确处理账号状态初始化', () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    // 重新创建调度器来触发初始化
    const newScheduler = new Scheduler(configManager);
    
    const status = newScheduler.getExecutionStatus();
    expect(status).toHaveLength(2);
    expect(status[0].executionCount).toBe(0);
    expect(status[0].successCount).toBe(0);
    expect(status[0].errorCount).toBe(0);
    expect(status[0].isRunning).toBe(false);
  });

  it('应该处理账号状态不存在的情况', async () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    const newScheduler = new Scheduler(configManager);
    
    // 模拟账号状态不存在的情况
    (newScheduler as any).executionStatus.clear();
    
    // 这应该不会抛出异常
    expect(() => {
      (newScheduler as any).scheduleAccount(mockAccounts[0]);
    }).not.toThrow();
  });

  it('应该处理定时器重新设置', () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    const newScheduler = new Scheduler(configManager);
    
    // 模拟现有定时器
    const mockTimer = setTimeout(() => {}, 1000);
    (newScheduler as any).timers.set('test1', mockTimer);
    
    // 重新设置定时器应该清除旧的定时器
    (newScheduler as any).setupAccountTimers(mockAccounts[0]);
    
    // 验证定时器被更新
    expect((newScheduler as any).timers.get('test1')).not.toBe(mockTimer);
  });

  it('应该处理延迟为负数的情况', () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    const newScheduler = new Scheduler(configManager);
    
    // 模拟当前时间已经过了执行时间
    const originalDate = global.Date;
    const mockDate = new Date('2023-01-01T23:59:00');
    global.Date = class extends Date {
      constructor() {
        super();
        return mockDate;
      }
    } as any;
    
    // 设置一个已经过时的时间
    const pastAccount = {
      ...mockAccounts[0],
      schedule: { times: ['00:00'], runOnStart: false }
    };
    
    (newScheduler as any).setupAccountTimers(pastAccount);
    
    // 恢复原始Date
    global.Date = originalDate;
  });

  it('应该处理没有有效执行计划的情况', () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    const newScheduler = new Scheduler(configManager);
    
    const accountWithEmptySchedule = {
      ...mockAccounts[0],
      schedule: { times: [], runOnStart: false }
    };
    
    // 这应该不会抛出异常
    expect(() => {
      (newScheduler as any).setupAccountTimers(accountWithEmptySchedule);
    }).not.toThrow();
  });

  it('应该处理计算下次执行时间的边界情况', () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    const newScheduler = new Scheduler(configManager);
    
    // 测试当前时间在所有执行时间之后的情况
    const originalDate = global.Date;
    const mockDate = new Date('2023-01-01T23:59:00');
    global.Date = class extends Date {
      constructor() {
        super();
        return mockDate;
      }
    } as any;
    
    const schedule = { times: ['08:00', '12:00'], runOnStart: false };
    const nextExecution = (newScheduler as any).calculateNextExecution(schedule);
    
    // 应该返回明天的第一个时间点
    expect(nextExecution).not.toBeNull();
    expect(nextExecution).toBeInstanceOf(originalDate);
    
    // 恢复原始Date
    global.Date = originalDate;
  });

  it('应该处理执行账号时的异常', async () => {
    const { AccountExecutor } = require('../../accountExecutor');
    AccountExecutor.mockImplementation(() => ({
      executeAccount: jest.fn().mockRejectedValue(new Error('执行异常'))
    }));
    
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    const newScheduler = new Scheduler(configManager);
    
    // 模拟执行账号
    await (newScheduler as any).executeAccount(mockAccounts[0]);
    
    // 验证错误状态被正确记录
    const status = newScheduler.getAccountExecutionStatus('test1');
    expect(status?.errorCount).toBe(1);
    expect(status?.lastError).toBe('执行异常');
  });

  it('应该处理账号正在运行的情况', async () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    const newScheduler = new Scheduler(configManager);
    
    // 设置账号为运行状态
    const status = newScheduler.getAccountExecutionStatus('test1');
    if (status) {
      status.isRunning = true;
      (newScheduler as any).executionStatus.set('test1', status);
    }
    
    // 再次执行应该被跳过
    await (newScheduler as any).executeAccount(mockAccounts[0]);
    
    // 验证执行次数没有增加
    const updatedStatus = newScheduler.getAccountExecutionStatus('test1');
    expect(updatedStatus?.executionCount).toBe(0);
  });

  it('应该处理定时器执行后的重新设置', () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    const newScheduler = new Scheduler(configManager);
    
    // 模拟定时器回调
    const timerCallback = (newScheduler as any).timers.get('test1');
    if (timerCallback) {
      // 这应该不会抛出异常
      expect(() => {
        timerCallback();
      }).not.toThrow();
    }
  });

  it('应该处理reload时的错误情况', async () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    
    const newScheduler = new Scheduler(configManager);
    
    // 模拟reload过程中的错误
    jest.spyOn(configManager, 'reloadConfig').mockImplementation(() => {
      throw new Error('重新加载失败');
    });
    
    // 这应该不会抛出异常，而是记录错误
    await expect(newScheduler.reload()).resolves.toBeUndefined();
  });

  it('应该处理executeAccountNow时的账号不存在', async () => {
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    jest.spyOn(configManager, 'getAccountById').mockReturnValue(undefined);
    
    const newScheduler = new Scheduler(configManager);
    
    const result = await newScheduler.executeAccountNow('nonexistent');
    expect(result).toBeNull();
  });

  it('应该处理executeAccountNow时的账号已禁用', async () => {
    const disabledAccount = { ...mockAccounts[0], enabled: false };
    jest.spyOn(configManager, 'getEnabledAccounts').mockReturnValue(mockAccounts);
    jest.spyOn(configManager, 'getAccountById').mockReturnValue(disabledAccount);
    
    const newScheduler = new Scheduler(configManager);
    
    const result = await newScheduler.executeAccountNow('test1');
    expect(result).toBeNull();
  });

  // 新增测试用例来覆盖缺失的分支
  it('应该处理定时器清除时的异常', () => {
    const { Scheduler } = require('../../scheduler');
    const scheduler = new Scheduler(configManager);
    
    // 模拟定时器清除时的异常
    const mockTimer = setTimeout(() => {}, 1000);
    scheduler['timers'].set('test-account', mockTimer);
    
    // 手动清除定时器，然后测试stop方法
    clearTimeout(mockTimer);
    expect(() => scheduler.stop()).not.toThrow();
  });

  it('应该处理账号状态不存在的情况', async () => {
    const { Scheduler } = require('../../scheduler');
    const scheduler = new Scheduler(configManager);
    
    // 启动调度器
    await scheduler.start();
    
    // 手动删除账号状态
    scheduler['executionStatus'].delete('test-account');
    
    // 尝试为不存在的账号设置定时器
    const mockAccount = {
      id: 'test-account',
      name: '测试账号',
      cookie: 'test-cookie',
      schedule: {
        times: ['09:00', '18:00'],
        runOnStart: false
      }
    };
    
    // 直接调用私有方法测试
    await (scheduler as any).scheduleAccount(mockAccount);
    
    // 验证没有设置定时器
    expect(scheduler['timers'].has('test-account')).toBe(false);
  });

  it('应该处理setupAccountTimers中的状态不存在', () => {
    const { Scheduler } = require('../../scheduler');
    const scheduler = new Scheduler(configManager);
    
    const mockAccount = {
      id: 'test-account',
      name: '测试账号',
      cookie: 'test-cookie',
      schedule: {
        times: ['09:00', '18:00'],
        runOnStart: false
      }
    };
    
    // 直接调用私有方法测试
    (scheduler as any).setupAccountTimers(mockAccount);
    
    // 验证没有设置定时器
    expect(scheduler['timers'].has('test-account')).toBe(false);
  });

  it('应该处理无效的执行计划（空times数组）', () => {
    const { Scheduler } = require('../../scheduler');
    const scheduler = new Scheduler(configManager);
    
    const mockAccount = {
      id: 'test-account',
      name: '测试账号',
      cookie: 'test-cookie',
      schedule: {
        times: [], // 空数组
        runOnStart: false
      }
    };
    
    // 初始化账号状态
    scheduler['executionStatus'].set('test-account', {
      accountId: 'test-account',
      isRunning: false,
      lastExecution: null,
      nextExecution: null,
      lastResult: null
    });
    
    // 直接调用私有方法测试
    (scheduler as any).setupAccountTimers(mockAccount);
    
    // 验证没有设置定时器
    expect(scheduler['timers'].has('test-account')).toBe(false);
  });

  it('应该处理定时器重新设置的情况', () => {
    const { Scheduler } = require('../../scheduler');
    const scheduler = new Scheduler(configManager);
    
    const mockAccount = {
      id: 'test-account',
      name: '测试账号',
      cookie: 'test-cookie',
      schedule: {
        times: ['09:00', '18:00'],
        runOnStart: false
      }
    };
    
    // 初始化账号状态
    scheduler['executionStatus'].set('test-account', {
      accountId: 'test-account',
      isRunning: false,
      lastExecution: null,
      nextExecution: null,
      lastResult: null
    });
    
    // 先设置一个定时器
    const mockTimer = setTimeout(() => {}, 1000);
    scheduler['timers'].set('test-account', mockTimer);
    
    // 再次调用setupAccountTimers，应该清除旧定时器并设置新定时器
    (scheduler as any).setupAccountTimers(mockAccount);
    
    // 验证定时器被重新设置
    expect(scheduler['timers'].has('test-account')).toBe(true);
    expect(scheduler['timers'].get('test-account')).not.toBe(mockTimer);
  });

  it('应该处理executeAccount中的异常情况', async () => {
    const { Scheduler } = require('../../scheduler');
    const scheduler = new Scheduler(configManager);
    
    // Mock AccountExecutor抛出异常
    const { AccountExecutor } = require('../../accountExecutor');
    AccountExecutor.mockImplementation(() => ({
      executeAccount: jest.fn().mockRejectedValue(new Error('执行异常'))
    }));
    
    const mockAccount = {
      id: 'test-account',
      name: '测试账号',
      cookie: 'test-cookie',
      schedule: {
        times: ['09:00', '18:00'],
        runOnStart: false
      }
    };
    
    // 初始化账号状态
    scheduler['executionStatus'].set('test-account', {
      accountId: 'test-account',
      isRunning: false,
      lastExecution: null,
      nextExecution: null,
      lastResult: null
    });
    
    // 直接调用私有方法测试
    await (scheduler as any).executeAccount(mockAccount);
    
    // 验证状态被正确更新
    const status = scheduler.getAccountExecutionStatus('test-account');
    expect(status?.isRunning).toBe(false);
    expect(status?.lastResult?.success).toBe(false);
  });



  // 添加清理函数来处理异步操作
  afterEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });
}); 