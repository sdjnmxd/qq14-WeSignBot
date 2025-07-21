import { ConfigManager } from '../../configManager';

describe('ConfigManager', () => {
  it('应该能实例化 ConfigManager', () => {
    const manager = new ConfigManager();
    expect(manager).toBeInstanceOf(ConfigManager);
  });

  it('应该能获取全局 UA 和 Referer', () => {
    const manager = new ConfigManager();
    expect(typeof manager.getGlobalUA()).toBe('string');
    expect(typeof manager.getGlobalReferer()).toBe('string');
  });

  it('应该能获取延迟范围', () => {
    const manager = new ConfigManager();
    expect(typeof manager.getMinDelay()).toBe('number');
    expect(typeof manager.getMaxDelay()).toBe('number');
  });

  it('配置文件不存在时应使用默认配置', () => {
    const fs = require('fs');
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    const manager = new ConfigManager('not-exist.json');
    expect(manager).toBeInstanceOf(ConfigManager);
    expect(manager.getEnabledAccounts()).toEqual([]);
  });

  it('环境变量优先级高于配置文件', () => {
    process.env.WECHAT_UA = 'env-ua';
    process.env.WECHAT_REFERER = 'env-referer';
    const manager = new ConfigManager();
    expect(manager.getGlobalUA()).toBe('env-ua');
    expect(manager.getGlobalReferer()).toBe('env-referer');
    delete process.env.WECHAT_UA;
    delete process.env.WECHAT_REFERER;
  });
}); 