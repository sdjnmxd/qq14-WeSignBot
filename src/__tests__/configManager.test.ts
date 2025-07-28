import { ConfigManager } from '../configManager';
import { log } from '../utils/logger';

// Mock logger
jest.mock('../utils/logger');

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let mockLog: jest.Mocked<typeof log>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLog = log as jest.Mocked<typeof log>;
  });

  describe('constructor', () => {
    it('应该使用默认配置文件路径', () => {
      configManager = new ConfigManager();
      expect(configManager.getConfigPath()).toBe('/work/milkfish/qq14-WeSignBot/accounts.json');
    });

    it('应该使用指定的配置文件路径', () => {
      configManager = new ConfigManager('./custom-config.json');
      expect(configManager.getConfigPath()).toBe('./custom-config.json');
    });
  });

  describe('loadConfig', () => {
    it('应该成功加载有效配置文件', () => {
      const mockConfig = {
        accounts: [
          {
            id: 'test-account',
            name: '测试账号',
            cookie: 'test-cookie',
            enabled: true,
            schedule: {
              times: ['08:00', '12:00', '18:00'],
              runOnStart: true
            }
          }
        ],
        globalSchedule: {
          times: ['08:00', '12:00', '18:00'],
          runOnStart: true
        }
      };

      // Mock fs.readFileSync
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));

      configManager = new ConfigManager();
      
      expect(configManager.getEnabledAccounts()).toHaveLength(1);
      expect(configManager.getEnabledAccounts()[0].id).toBe('test-account');
    });

    it('配置文件不存在时应该创建默认配置', () => {
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      configManager = new ConfigManager();
      
      expect(configManager.getEnabledAccounts()).toHaveLength(0);
      expect(mockLog.info).toHaveBeenCalledWith('使用默认配置');
    });

    it('配置文件格式错误时应该使用默认配置', () => {
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue('invalid json');

      configManager = new ConfigManager();
      
      expect(configManager.getEnabledAccounts()).toHaveLength(0);
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
      expect(mockLog.info).toHaveBeenCalledWith('使用默认配置');
    });

    it('配置文件读取异常时应该使用默认配置', () => {
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('读取文件失败');
      });

      configManager = new ConfigManager();
      
      expect(configManager.getEnabledAccounts()).toHaveLength(0);
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
      expect(mockLog.info).toHaveBeenCalledWith('使用默认配置');
    });
  });

  describe('validateConfig', () => {
    it('应该验证有效配置', () => {
      const validConfig = {
        accounts: [
          {
            id: 'test-account',
            name: '测试账号',
            cookie: 'test-cookie',
            enabled: true,
            schedule: {
              times: ['08:00', '12:00', '18:00'],
              runOnStart: true
            }
          }
        ],
        globalSchedule: {
          times: ['08:00', '12:00', '18:00'],
          runOnStart: true
        }
      };

      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(validConfig));

      expect(() => new ConfigManager()).not.toThrow();
    });

    it('配置为空时应该记录错误', () => {
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(null));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });

    it('配置不是对象时应该记录错误', () => {
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify('not an object'));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });

    it('accounts字段不是数组时应该记录错误', () => {
      const fs = require('fs');
      const invalidConfig = {
        accounts: 'not an array'
      };
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });

    it('账号ID为空时应该记录错误', () => {
      const fs = require('fs');
      const invalidConfig = {
        accounts: [{
          id: '',
          name: '测试账号',
          cookie: 'test-cookie',
          schedule: { times: ['08:00'] },
          enabled: true
        }]
      };
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });

    it('账号ID不是字符串时应该记录错误', () => {
      const fs = require('fs');
      const invalidConfig = {
        accounts: [{
          id: 123,
          name: '测试账号',
          cookie: 'test-cookie',
          schedule: { times: ['08:00'] },
          enabled: true
        }]
      };
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });

    it('账号cookie为空时应该记录错误', () => {
      const fs = require('fs');
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: '',
          schedule: { times: ['08:00'] },
          enabled: true
        }]
      };
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });

    it('账号cookie不是字符串时应该记录错误', () => {
      const fs = require('fs');
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 123,
          schedule: { times: ['08:00'] },
          enabled: true
        }]
      };
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });

    it('账号没有schedule且没有全局配置时应该记录错误', () => {
      const fs = require('fs');
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 'test-cookie',
          enabled: true
        }]
      };
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });

    it('账号schedule不是对象时应该记录错误', () => {
      const fs = require('fs');
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 'test-cookie',
          schedule: 'not an object',
          enabled: true
        }]
      };
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });

    it('times字段不是数组时应该记录错误', () => {
      const fs = require('fs');
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 'test-cookie',
          schedule: { times: 'not an array' },
          enabled: true
        }]
      };
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });

    it('时间格式错误时应该记录错误', () => {
      const fs = require('fs');
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 'test-cookie',
          schedule: { times: ['25:00'] },
          enabled: true
        }]
      };
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });

    it('runOnStart不是布尔值时应该记录错误', () => {
      const fs = require('fs');
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 'test-cookie',
          schedule: { times: ['08:00'], runOnStart: 'not boolean' },
          enabled: true
        }]
      };
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(invalidConfig));

      new ConfigManager();
      expect(mockLog.error).toHaveBeenCalledWith('加载配置文件失败:', expect.any(String));
    });
  });

  describe('isValidTimeFormat', () => {
    it('应该验证有效的时间格式', () => {
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ accounts: [] }));

      configManager = new ConfigManager();
      
      // 测试有效时间格式
      expect((configManager as any).isValidTimeFormat('00:00')).toBe(true);
      expect((configManager as any).isValidTimeFormat('12:30')).toBe(true);
      expect((configManager as any).isValidTimeFormat('23:59')).toBe(true);
      expect((configManager as any).isValidTimeFormat('09:05')).toBe(true);
    });

    it('应该拒绝无效的时间格式', () => {
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ accounts: [] }));

      configManager = new ConfigManager();
      
      // 测试无效时间格式
      expect((configManager as any).isValidTimeFormat('24:00')).toBe(false);
      expect((configManager as any).isValidTimeFormat('12:60')).toBe(false);
      expect((configManager as any).isValidTimeFormat('25:00')).toBe(false);
      expect((configManager as any).isValidTimeFormat('12:99')).toBe(false);
      expect((configManager as any).isValidTimeFormat('abc:def')).toBe(false);
      expect((configManager as any).isValidTimeFormat('12:30:45')).toBe(false);
      expect((configManager as any).isValidTimeFormat('12')).toBe(false);
      expect((configManager as any).isValidTimeFormat('')).toBe(false);
    });
  });

  describe('账号管理', () => {
    beforeEach(() => {
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ accounts: [] }));
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      configManager = new ConfigManager();
    });

    it('应该正确添加账号', () => {
      const account = {
        id: 'test-account',
        name: '测试账号',
        cookie: 'test-cookie',
        enabled: true,
        schedule: {
          times: ['08:00', '12:00', '18:00'],
          runOnStart: true
        }
      };

      configManager.addAccount(account);
      
      expect(configManager.getEnabledAccounts()).toHaveLength(1);
      expect(configManager.getEnabledAccounts()[0].id).toBe('test-account');
    });

    it('应该正确更新账号', () => {
      const account = {
        id: 'test-account',
        name: '测试账号',
        cookie: 'test-cookie',
        enabled: true,
        schedule: {
          times: ['08:00', '12:00', '18:00'],
          runOnStart: true
        }
      };

      configManager.addAccount(account);
      configManager.updateAccount('test-account', { name: '更新后的账号' });
      
      expect(configManager.getAccountById('test-account')?.name).toBe('更新后的账号');
    });

    it('应该正确删除账号', () => {
      const account = {
        id: 'test-account',
        name: '测试账号',
        cookie: 'test-cookie',
        enabled: true,
        schedule: {
          times: ['08:00', '12:00', '18:00'],
          runOnStart: true
        }
      };

      configManager.addAccount(account);
      configManager.removeAccount('test-account');
      
      expect(configManager.getEnabledAccounts()).toHaveLength(0);
    });

    it('应该正确切换账号状态', () => {
      const account = {
        id: 'test-account',
        name: '测试账号',
        cookie: 'test-cookie',
        enabled: true,
        schedule: {
          times: ['08:00', '12:00', '18:00'],
          runOnStart: true
        }
      };

      configManager.addAccount(account);
      configManager.toggleAccount('test-account', false);
      
      expect(configManager.getEnabledAccounts()).toHaveLength(0);
    });

    it('应该正确获取账号', () => {
      const account = {
        id: 'test-account',
        name: '测试账号',
        cookie: 'test-cookie',
        enabled: true,
        schedule: {
          times: ['08:00', '12:00', '18:00'],
          runOnStart: true
        }
      };

      configManager.addAccount(account);
      
      expect(configManager.getAccountById('test-account')).toEqual(account);
      expect(configManager.getAccountById('non-existent')).toBeUndefined();
    });
  });

  describe('全局配置', () => {
    beforeEach(() => {
      const fs = require('fs');
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ 
        accounts: [],
        globalSchedule: {
          times: ['08:00', '12:00', '18:00'],
          runOnStart: true
        }
      }));
      jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

      configManager = new ConfigManager();
    });

    it('应该正确获取全局执行计划', () => {
      const globalSchedule = configManager.getGlobalSchedule();
      expect(globalSchedule).toEqual({
        times: ['08:00', '12:00', '18:00'],
        runOnStart: true
      });
    });

    it('应该正确设置全局执行计划', () => {
      const newSchedule = {
        times: ['09:00', '13:00', '19:00'],
        runOnStart: false
      };

      configManager.setGlobalSchedule(newSchedule);
      
      expect(configManager.getGlobalSchedule()).toEqual(newSchedule);
    });

    it('应该正确获取全局UA', () => {
      expect(configManager.getGlobalUA()).toBe('');
    });

    it('应该正确获取全局Referer', () => {
      expect(configManager.getGlobalReferer()).toBe('');
    });

    it('应该正确获取延迟配置', () => {
      expect(configManager.getMinDelay()).toBe(1000);
      expect(configManager.getMaxDelay()).toBe(3000);
    });
  });

  describe('配置重载', () => {
    it('应该正确重载配置', async () => {
      const fs = require('fs');
      
      // 首先设置初始配置
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ 
        accounts: [] 
      }));
      
      const configManager = new ConfigManager();
      expect(configManager.getEnabledAccounts()).toHaveLength(0);
      
      // 然后设置新的配置用于重载
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ 
        accounts: [{ id: 'new-account', name: '新账号', cookie: 'new-cookie', enabled: true, schedule: { times: ['08:00'] } }] 
      }));
      
      configManager.reloadConfig();
      expect(configManager.getEnabledAccounts()).toHaveLength(1);
      expect(configManager.getEnabledAccounts()[0].id).toBe('new-account');
    });
  });
}); 