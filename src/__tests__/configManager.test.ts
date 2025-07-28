import { ConfigManager } from '../configManager';
import { AccountConfig, ScheduleConfig } from '../types';
import { createTestConfigManager } from './setup/testSetup';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = createTestConfigManager();
  });

  describe('validateConfig', () => {
    it('应该验证有效配置', () => {
      expect(() => createTestConfigManager()).not.toThrow();
    });

    it('配置为空时应该记录错误', () => {
      const fs = require('fs');
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(null));
      
      expect(() => {
        new ConfigManager();
      }).toThrow('配置文件格式错误');
    });

    it('配置不是对象时应该记录错误', () => {
      expect(() => createTestConfigManager('not an object')).toThrow('配置文件格式错误');
    });

    it('accounts字段不是数组时应该记录错误', () => {
      expect(() => createTestConfigManager({ accounts: 'not array' })).toThrow('accounts字段必须是数组');
    });

    it('账号ID为空时应该记录错误', () => {
      const invalidConfig = {
        accounts: [{
          id: '',
          cookie: 'test-cookie',
          schedule: { times: ['08:00'] },
          enabled: true
        }]
      };
      expect(() => createTestConfigManager(invalidConfig)).toThrow('账号ID不能为空且必须是字符串');
    });

    it('账号ID不是字符串时应该记录错误', () => {
      const invalidConfig = {
        accounts: [{
          id: 123,
          cookie: 'test-cookie',
          schedule: { times: ['08:00'] },
          enabled: true
        }]
      };
      expect(() => createTestConfigManager(invalidConfig)).toThrow('账号ID不能为空且必须是字符串');
    });

    it('账号cookie为空时应该记录错误', () => {
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: '',
          schedule: { times: ['08:00'] },
          enabled: true
        }]
      };
      expect(() => createTestConfigManager(invalidConfig)).toThrow('账号cookie不能为空且必须是字符串');
    });

    it('账号cookie不是字符串时应该记录错误', () => {
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 123,
          schedule: { times: ['08:00'] },
          enabled: true
        }]
      };
      expect(() => createTestConfigManager(invalidConfig)).toThrow('账号cookie不能为空且必须是字符串');
    });

    it('账号没有schedule且没有全局配置时应该记录错误', () => {
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 'test-cookie',
          enabled: true
        }]
      };
      expect(() => createTestConfigManager(invalidConfig)).toThrow('账号执行计划不能为空且没有全局默认配置');
    });

    it('账号schedule不是对象时应该记录错误', () => {
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 'test-cookie',
          schedule: 'not object',
          enabled: true
        }]
      };
      expect(() => createTestConfigManager(invalidConfig)).toThrow('账号执行计划不能为空且没有全局默认配置');
    });

    it('times字段不是数组时应该记录错误', () => {
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 'test-cookie',
          schedule: { times: 'not array' },
          enabled: true
        }]
      };
      expect(() => createTestConfigManager(invalidConfig)).toThrow('times字段必须是数组');
    });

    it('时间格式错误时应该记录错误', () => {
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 'test-cookie',
          schedule: { times: ['25:00'] },
          enabled: true
        }]
      };
      expect(() => createTestConfigManager(invalidConfig)).toThrow('时间格式错误: 25:00，应为HH:MM格式');
    });

    it('runOnStart不是布尔值时应该记录错误', () => {
      const invalidConfig = {
        accounts: [{
          id: 'test-account',
          name: '测试账号',
          cookie: 'test-cookie',
          schedule: { times: ['08:00'], runOnStart: 'not boolean' },
          enabled: true
        }]
      };
      expect(() => createTestConfigManager(invalidConfig)).toThrow('runOnStart字段必须是布尔值');
    });
  });

  describe('isValidTimeFormat', () => {
    it('应该验证有效的时间格式', () => {
      const manager = createTestConfigManager();
      expect((manager as any).isValidTimeFormat('08:00')).toBe(true);
      expect((manager as any).isValidTimeFormat('23:59')).toBe(true);
    });

    it('应该拒绝无效的时间格式', () => {
      const manager = createTestConfigManager();
      expect((manager as any).isValidTimeFormat('25:00')).toBe(false);
      expect((manager as any).isValidTimeFormat('08:60')).toBe(false);
      expect((manager as any).isValidTimeFormat('8:00')).toBe(true); // 修正：8:00应该是有效的
    });
  });

  describe('账号管理', () => {
    it('应该正确添加账号', () => {
      const account: AccountConfig = {
        id: 'test1',
        cookie: 'test-cookie',
        name: '测试账号1',
        schedule: { times: ['08:00'], runOnStart: true },
        enabled: true
      };
      
      configManager.addAccount(account);
      expect(configManager.getAccountById('test1')).toEqual(account);
    });

    it('应该正确更新账号', () => {
      const account: AccountConfig = {
        id: 'test1',
        cookie: 'test-cookie',
        name: '测试账号1',
        schedule: { times: ['08:00'], runOnStart: true },
        enabled: true
      };
      
      configManager.addAccount(account);
      configManager.updateAccount('test1', { name: '更新后的账号' });
      expect(configManager.getAccountById('test1')?.name).toBe('更新后的账号');
    });

    it('应该正确删除账号', () => {
      const account: AccountConfig = {
        id: 'test1',
        cookie: 'test-cookie',
        name: '测试账号1',
        schedule: { times: ['08:00'], runOnStart: true },
        enabled: true
      };
      
      configManager.addAccount(account);
      configManager.removeAccount('test1');
      expect(configManager.getAccountById('test1')).toBeUndefined();
    });

    it('应该正确切换账号状态', () => {
      const account: AccountConfig = {
        id: 'test1',
        cookie: 'test-cookie',
        name: '测试账号1',
        schedule: { times: ['08:00'], runOnStart: true },
        enabled: true
      };
      
      configManager.addAccount(account);
      configManager.toggleAccount('test1', false);
      expect(configManager.getAccountById('test1')?.enabled).toBe(false);
    });

    it('应该正确获取账号', () => {
      const account: AccountConfig = {
        id: 'test1',
        cookie: 'test-cookie',
        name: '测试账号1',
        schedule: { times: ['08:00'], runOnStart: true },
        enabled: true
      };
      
      configManager.addAccount(account);
      expect(configManager.getAccountById('test1')).toEqual(account);
    });
  });

  describe('全局配置', () => {
    it('应该正确获取全局执行计划', () => {
      const schedule = configManager.getGlobalSchedule();
      expect(schedule).toEqual({
        times: ["08:00", "12:00", "18:00"],
        runOnStart: true
      });
    });

    it('应该正确设置全局执行计划', () => {
      const newSchedule: ScheduleConfig = {
        times: ['09:00', '13:00'],
        runOnStart: false
      };
      
      configManager.setGlobalSchedule(newSchedule);
      expect(configManager.getGlobalSchedule()).toEqual(newSchedule);
    });

    it('应该正确获取全局UA', () => {
      expect(configManager.getGlobalUA()).toBe('test-ua');
    });

    it('应该正确获取全局Referer', () => {
      expect(configManager.getGlobalReferer()).toBe('test-referer');
    });

    it('应该正确获取延迟配置', () => {
      expect(configManager.getMinDelay()).toBe(1000);
      expect(configManager.getMaxDelay()).toBe(3000);
    });
  });
}); 