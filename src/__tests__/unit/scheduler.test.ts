import { Scheduler } from '../../scheduler';
import { ConfigManager } from '../../configManager';

describe('Scheduler', () => {
  let configManager: ConfigManager;
  let scheduler: Scheduler;

  beforeEach(() => {
    configManager = new ConfigManager();
    scheduler = new Scheduler(configManager);
  });

  it('应该能实例化 Scheduler', () => {
    expect(scheduler).toBeInstanceOf(Scheduler);
  });

  it('应该能启动和停止调度器', async () => {
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
    await scheduler.start();
    await scheduler.start();
    scheduler.stop();
    scheduler.stop();
    expect(scheduler.isSchedulerRunning()).toBe(false);
  });
}); 