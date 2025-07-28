import { ConfigManager } from '../../configManager';
import { AccountConfig, ScheduleConfig } from '../../types';
import { createTestConfigManager } from '../setup/testSetup';
import fs from 'fs';
import path from 'path';
import { log } from '../../utils/logger';

// Mock fs and path
jest.mock('fs');
jest.mock('path');
jest.mock('../../utils/logger');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  const mockConfigPath = '/test/config.json';

  beforeEach(() => {
    configManager = createTestConfigManager();
  });

  describe('基础功能测试', () => {
    it('应该能实例化 ConfigManager', () => {
      expect(configManager).toBeInstanceOf(ConfigManager);
    });

    it('应该能获取全局 UA 和 Referer', () => {
      expect(configManager.getGlobalUA()).toBe('test-ua');
      expect(configManager.getGlobalReferer()).toBe('test-referer');
    });

    it('应该能获取延迟范围', () => {
      expect(configManager.getMinDelay()).toBe(1000);
      expect(configManager.getMaxDelay()).toBe(3000);
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
  });

  describe('账号管理测试', () => {
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
      expect(configManager.getAccountById('test1')?.name).toBe('更新后的账号');
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
      expect(configManager.getAccountById('test1')?.enabled).toBe(false);
    });
  });

  describe('配置验证测试', () => {
    it('应该验证时间格式', () => {
      expect((configManager as any).isValidTimeFormat('08:00')).toBe(true);
      expect((configManager as any).isValidTimeFormat('25:00')).toBe(false);
    });

    it('应该验证schedule配置', () => {
      const validSchedule: ScheduleConfig = {
        times: ['08:00', '12:00'],
        runOnStart: true
      };
      
      expect(() => {
        (configManager as any).validateScheduleConfig(validSchedule);
      }).not.toThrow();
    });

    it('应该处理配置文件格式错误', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');
      
      expect(() => {
        new ConfigManager();
      }).toThrow('Unexpected token');
    });

    it('应该处理accounts字段不是数组的情况', () => {
      const invalidConfig = {
        accounts: 'not an array',
        globalSchedule: {
          times: ["08:00", "12:00", "18:00"],
          runOnStart: true
        }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));
      
      expect(() => {
        new ConfigManager();
      }).toThrow('accounts字段必须是数组');
    });

    it('应该处理账号ID为空的情况', () => {
      const invalidConfig = {
        accounts: [{
          id: '',
          cookie: 'test-cookie',
          schedule: { times: ['08:00'], runOnStart: true }
        }],
        globalSchedule: {
          times: ["08:00", "12:00", "18:00"],
          runOnStart: true
        }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));
      
      expect(() => {
        new ConfigManager();
      }).toThrow('账号ID不能为空且必须是字符串');
    });

    it('应该处理账号cookie为空的情况', () => {
      const invalidConfig = {
        accounts: [{
          id: 'test1',
          cookie: '',
          schedule: { times: ['08:00'], runOnStart: true }
        }],
        globalSchedule: {
          times: ["08:00", "12:00", "18:00"],
          runOnStart: true
        }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));
      
      expect(() => {
        new ConfigManager();
      }).toThrow('账号cookie不能为空且必须是字符串');
    });

    it('应该处理时间格式错误的情况', () => {
      const invalidConfig = {
        accounts: [{
          id: 'test1',
          cookie: 'test-cookie',
          schedule: { times: ['25:00'], runOnStart: true }
        }],
        globalSchedule: {
          times: ["08:00", "12:00", "18:00"],
          runOnStart: true
        }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));
      
      expect(() => {
        new ConfigManager();
      }).toThrow('时间格式错误: 25:00，应为HH:MM格式');
    });
  });

  describe('环境变量处理测试', () => {
    it('应该处理环境变量为空字符串的情况', () => {
      const originalEnv = process.env;
      process.env.WECHAT_UA = '';
      process.env.WECHAT_REFERER = '';
      process.env.MIN_DELAY_MS = '';
      process.env.MAX_DELAY_MS = '';
      
      // 应该使用配置文件的值
      expect(configManager.getGlobalUA()).toBe('test-ua');
      expect(configManager.getGlobalReferer()).toBe('test-referer');
      expect(configManager.getMinDelay()).toBe(1000);
      expect(configManager.getMaxDelay()).toBe(3000);
      
      process.env = originalEnv;
    });

    it('应该处理环境变量为无效数字的情况', () => {
      const originalEnv = process.env;
      process.env.MIN_DELAY_MS = 'invalid';
      process.env.MAX_DELAY_MS = 'not a number';
      
      // 应该使用配置文件的值
      expect(configManager.getMinDelay()).toBe(1000);
      expect(configManager.getMaxDelay()).toBe(3000);
      
      process.env = originalEnv;
    });

    it('应该处理环境变量为0的情况', () => {
      const originalEnv = process.env;
      process.env.MIN_DELAY_MS = '0';
      process.env.MAX_DELAY_MS = '0';
      
      // 0是有效值，应该被使用
      expect(configManager.getMinDelay()).toBe(0);
      expect(configManager.getMaxDelay()).toBe(0);
      
      process.env = originalEnv;
    });
  });

  describe('全局配置测试', () => {
    it('应该能设置全局执行计划', () => {
      const newSchedule: ScheduleConfig = {
        times: ['09:00', '13:00'],
        runOnStart: false
      };
      
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
      
      configManager.setGlobalSchedule(newSchedule);
      expect(configManager.getGlobalSchedule()).toEqual(newSchedule);
    });

    it('应该能重新加载配置', () => {
      const newConfig = {
        accounts: [],
        globalUA: 'new-ua',
        globalReferer: 'new-referer',
        globalMinDelay: 2000,
        globalMaxDelay: 4000,
        globalSchedule: {
          times: ["09:00", "13:00"],
          runOnStart: false
        }
      };
      
      // 清除环境变量，确保使用配置文件的值
      const originalEnv = process.env;
      delete process.env.WECHAT_UA;
      delete process.env.WECHAT_REFERER;
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(newConfig));
      
      configManager.reloadConfig();
      expect(configManager.getGlobalUA()).toBe('new-ua');
      
      // 恢复环境变量
      process.env = originalEnv;
    });

    it('应该能获取配置文件路径', () => {
      (path.join as jest.Mock).mockReturnValue(mockConfigPath);
      
      const manager = new ConfigManager();
      expect(manager.getConfigPath()).toBe(mockConfigPath);
    });
  });

  describe('错误处理测试', () => {
    it('应该处理配置文件不存在的情况', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      expect(() => {
        new ConfigManager();
      }).toThrow('配置文件不存在');
    });

    it('应该处理saveConfig失败的情况', () => {
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
      
      // saveConfig方法只是记录错误，不会抛出异常
      expect(() => {
        configManager.addAccount(account);
      }).not.toThrow();
      
      // 验证错误被记录了
      expect(log.error).toHaveBeenCalledWith('保存配置文件失败:', '写入失败');
    });

    it('应该处理账号没有schedule且没有全局配置的情况', () => {
      const invalidConfig = {
        accounts: [{
          id: 'test1',
          cookie: 'test-cookie'
          // 没有schedule
        }]
        // 没有globalSchedule
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));
      
      expect(() => {
        new ConfigManager();
      }).toThrow('账号执行计划不能为空且没有全局默认配置');
    });

    it('应该处理runOnStart不是布尔值的情况', () => {
      const invalidConfig = {
        accounts: [{
          id: 'test1',
          cookie: 'test-cookie',
          schedule: { times: ['08:00'], runOnStart: 'not boolean' }
        }],
        globalSchedule: {
          times: ["08:00", "12:00", "18:00"],
          runOnStart: true
        }
      };
      
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(invalidConfig));
      
      expect(() => {
        new ConfigManager();
      }).toThrow('runOnStart字段必须是布尔值');
    });
  });
}); 