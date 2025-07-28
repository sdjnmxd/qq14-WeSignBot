// TODO: 测试问题梳理
// 1. 过度mock fs 和 path，所有文件操作都被拦截，导致无法发现真实文件系统相关问题。
// 2. 部分测试仅为覆盖异常分支（如写入失败、创建目录失败、无效配置等），但实际业务场景极少发生，建议只保留有实际意义的分支测试。
// 3. 建议后续可引入集成测试，配合真实文件系统或mock-fs等库，提升测试的真实性和健壮性。
import { ConfigManager } from '../../configManager';
import { AccountConfig, ScheduleConfig } from '../../types';
import fs from 'fs';
import path from 'path';

// Mock fs and path
jest.mock('fs');
jest.mock('path');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const mockConfigPath = '/test/config.json';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock path.join
    (path.join as jest.Mock).mockReturnValue(mockConfigPath);
    
    // Mock fs.existsSync to return false initially
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    
    // Mock fs.readFileSync to return default config
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      accounts: [],
      globalUA: 'test-ua',
      globalReferer: 'test-referer',
      globalMinDelay: 1000,
      globalMaxDelay: 3000,
      globalSchedule: {
        times: ["08:00", "12:00", "18:00"],
        runOnStart: true
      }
    }));
    
    configManager = new ConfigManager();
  });

  it('应该能实例化 ConfigManager', () => {
    expect(configManager).toBeInstanceOf(ConfigManager);
  });

  it('应该能获取全局 UA 和 Referer', () => {
    // 重新设置mock，确保返回正确的值
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      accounts: [],
      globalUA: 'test-ua',
      globalReferer: 'test-referer',
      globalMinDelay: 1000,
      globalMaxDelay: 3000,
      globalSchedule: {
        times: ["08:00", "12:00", "18:00"],
        runOnStart: true
      }
    }));
    
    const manager = new ConfigManager();
    expect(manager.getGlobalUA()).toBe('test-ua');
    expect(manager.getGlobalReferer()).toBe('test-referer');
  });

  it('应该能获取延迟范围', () => {
    expect(configManager.getMinDelay()).toBe(1000);
    expect(configManager.getMaxDelay()).toBe(3000);
  });

  it('配置文件不存在时应使用默认配置', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const manager = new ConfigManager();
    expect(manager.getEnabledAccounts()).toEqual([]);
  });

  it('环境变量优先级高于配置文件', () => {
    const originalEnv = process.env;
    process.env.WECHAT_UA = 'env-ua';
    process.env.WECHAT_REFERER = 'env-referer';
    process.env.MIN_DELAY_MS = '2000';
    process.env.MAX_DELAY_MS = '5000';
    
    expect(configManager.getGlobalUA()).toBe('env-ua');
    expect(configManager.getGlobalReferer()).toBe('env-referer');
    expect(configManager.getMinDelay()).toBe(2000);
    expect(configManager.getMaxDelay()).toBe(5000);
    
    process.env = originalEnv;
  });

  it('应该能添加账号', () => {
    const account: AccountConfig = {
      id: 'test1',
      cookie: 'test-cookie',
      name: '测试账号1',
      schedule: { times: ['08:00'], runOnStart: true },
      enabled: true
    };
    
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    
    configManager.addAccount(account);
    expect(configManager.getAccountById('test1')).toEqual(account);
  });

  it('添加重复ID的账号应该抛出异常', () => {
    const account: AccountConfig = {
      id: 'test1',
      cookie: 'test-cookie',
      name: '测试账号1',
      schedule: { times: ['08:00'], runOnStart: true },
      enabled: true
    };
    
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    
    configManager.addAccount(account);
    
    expect(() => {
      configManager.addAccount(account);
    }).toThrow('账号ID已存在: test1');
  });

  it('应该能更新账号', () => {
    const account: AccountConfig = {
      id: 'test1',
      cookie: 'test-cookie',
      name: '测试账号1',
      schedule: { times: ['08:00'], runOnStart: true },
      enabled: true
    };
    
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    
    configManager.addAccount(account);
    configManager.updateAccount('test1', { name: '更新后的账号' });
    
    const updatedAccount = configManager.getAccountById('test1');
    expect(updatedAccount?.name).toBe('更新后的账号');
  });

  it('更新不存在的账号应该抛出异常', () => {
    expect(() => {
      configManager.updateAccount('nonexistent', { name: 'test' });
    }).toThrow('账号不存在: nonexistent');
  });

  it('应该能删除账号', () => {
    const account: AccountConfig = {
      id: 'test1',
      cookie: 'test-cookie',
      name: '测试账号1',
      schedule: { times: ['08:00'], runOnStart: true },
      enabled: true
    };
    
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    
    configManager.addAccount(account);
    configManager.removeAccount('test1');
    
    expect(configManager.getAccountById('test1')).toBeUndefined();
  });

  it('删除不存在的账号应该抛出异常', () => {
    expect(() => {
      configManager.removeAccount('nonexistent');
    }).toThrow('账号不存在: nonexistent');
  });

  it('应该能启用/禁用账号', () => {
    const account: AccountConfig = {
      id: 'test1',
      cookie: 'test-cookie',
      name: '测试账号1',
      schedule: { times: ['08:00'], runOnStart: true },
      enabled: true
    };
    
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    
    configManager.addAccount(account);
    configManager.toggleAccount('test1', false);
    
    const updatedAccount = configManager.getAccountById('test1');
    expect(updatedAccount?.enabled).toBe(false);
  });

  it('应该能设置全局执行计划', () => {
    const schedule: ScheduleConfig = {
      times: ['09:00', '18:00'],
      runOnStart: true
    };
    
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    
    configManager.setGlobalSchedule(schedule);
    expect(configManager.getGlobalSchedule()).toEqual(schedule);
  });

  it('应该验证时间格式', () => {
    const validAccount: AccountConfig = {
      id: 'test1',
      cookie: 'test-cookie',
      name: '测试账号1',
      schedule: { times: ['08:00'], runOnStart: true },
      enabled: true
    };
    
    const invalidAccount: AccountConfig = {
      id: 'test2',
      cookie: 'test-cookie',
      name: '测试账号2',
      schedule: { times: ['25:00'], runOnStart: true }, // 无效时间
      enabled: true
    };
    
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    
    // 有效时间应该成功
    expect(() => {
      configManager.addAccount(validAccount);
    }).not.toThrow();
    
    // 无效时间应该抛出异常
    expect(() => {
      configManager.addAccount(invalidAccount);
    }).toThrow('时间格式错误: 25:00，应为HH:MM格式');
  });

  it('应该验证schedule配置', () => {
    const invalidAccount1: AccountConfig = {
      id: 'test1',
      cookie: 'test-cookie',
      name: '测试账号1',
      schedule: { times: null as any, runOnStart: true }, // 无效times
      enabled: true
    };
    
    const invalidAccount2: AccountConfig = {
      id: 'test2',
      cookie: 'test-cookie',
      name: '测试账号2',
      schedule: { times: ['08:00'], runOnStart: 'invalid' as any }, // 无效runOnStart
      enabled: true
    };
    
    expect(() => {
      configManager.addAccount(invalidAccount1);
    }).toThrow('times字段必须是数组');
    
    expect(() => {
      configManager.addAccount(invalidAccount2);
    }).toThrow('runOnStart字段必须是布尔值');
  });

  it('应该能重新加载配置', () => {
    const newConfig = {
      accounts: [{
        id: 'reloaded',
        cookie: 'test-cookie',
        name: '重新加载的账号',
        schedule: { times: ['08:00'], runOnStart: true },
        enabled: true
      }],
      globalUA: 'reloaded-ua',
      globalReferer: 'reloaded-referer',
      globalMinDelay: 2000,
      globalMaxDelay: 4000,
      globalSchedule: {
        times: ["08:00", "12:00", "18:00"],
        runOnStart: true
      }
    };
    
    // 重新设置mock
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(newConfig));
    
    // 清除环境变量
    const originalEnv = process.env;
    delete process.env.WECHAT_UA;
    delete process.env.WECHAT_REFERER;
    delete process.env.MIN_DELAY_MS;
    delete process.env.MAX_DELAY_MS;
    
    // 重新创建ConfigManager来确保加载新的配置
    const newManager = new ConfigManager();
    
    expect(newManager.getGlobalUA()).toBe('reloaded-ua');
    expect(newManager.getGlobalReferer()).toBe('reloaded-referer');
    expect(newManager.getMinDelay()).toBe(2000);
    expect(newManager.getMaxDelay()).toBe(4000);
    
    process.env = originalEnv;
  });

  it('应该能获取配置文件路径', () => {
    // 确保path.resolve的mock正确设置
    (path.join as jest.Mock).mockReturnValue(mockConfigPath);
    
    // 重新创建ConfigManager来确保path.resolve被正确调用
    const manager = new ConfigManager();
    expect(manager.getConfigPath()).toBe(mockConfigPath);
  });

  it('应该处理保存配置文件失败的情况', () => {
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {
      throw new Error('写入失败');
    });
    
    const account: AccountConfig = {
      id: 'test1',
      cookie: 'test-cookie',
      name: '测试账号1',
      schedule: { times: ['08:00'], runOnStart: true },
      enabled: true
    };
    
    // 应该不会抛出异常，而是记录错误
    expect(() => {
      configManager.addAccount(account);
    }).not.toThrow();
  });

  it('应该处理创建配置目录失败的情况', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => {
      throw new Error('创建目录失败');
    });
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
    
    const account: AccountConfig = {
      id: 'test1',
      cookie: 'test-cookie',
      name: '测试账号1',
      schedule: { times: ['08:00'], runOnStart: true },
      enabled: true
    };
    
    // 应该不会抛出异常，而是记录错误
    expect(() => {
      configManager.addAccount(account);
    }).not.toThrow();
  });
}); 