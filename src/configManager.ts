import fs from 'fs';
import path from 'path';
import { AccountConfig, MultiAccountConfig, ScheduleConfig } from './types';
import { log } from './utils/logger';

export class ConfigManager {
  private configPath: string;
  private config: MultiAccountConfig;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'accounts.json');
    this.config = this.loadConfig();
  }

  /**
   * 加载配置文件
   */
  private loadConfig(): MultiAccountConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        
        // 验证配置格式
        this.validateConfig(config);
        
        log.info(`成功加载配置文件: ${this.configPath}`);
        return config;
      } else {
        // 创建默认配置
        const defaultConfig = this.createDefaultConfig();
        this.saveConfig(defaultConfig);
        log.info(`创建默认配置文件: ${this.configPath}`);
        return defaultConfig;
      }
    } catch (error) {
      log.error('加载配置文件失败:', error instanceof Error ? error.message : String(error));
      log.info('使用默认配置');
      return this.createDefaultConfig();
    }
  }

  /**
   * 创建默认配置
   */
  private createDefaultConfig(): MultiAccountConfig {
    return {
      accounts: [],
      globalSchedule: {
        times: ["08:00", "12:00", "18:00"],
        runOnStart: true
      }
    };
  }

  /**
   * 验证配置格式
   */
  private validateConfig(config: any): void {
    if (!config || typeof config !== 'object') {
      throw new Error('配置文件格式错误');
    }

    if (!Array.isArray(config.accounts)) {
      throw new Error('accounts字段必须是数组');
    }

    for (const account of config.accounts) {
      this.validateAccountConfig(account, config.globalSchedule);
    }

    if (config.globalSchedule) {
      this.validateScheduleConfig(config.globalSchedule);
    }
  }

  /**
   * 验证账号配置
   */
  private validateAccountConfig(account: any, globalSchedule?: any): void {
    if (!account.id || typeof account.id !== 'string') {
      throw new Error('账号ID不能为空且必须是字符串');
    }

    if (!account.cookie || typeof account.cookie !== 'string') {
      throw new Error('账号cookie不能为空且必须是字符串');
    }

    // 如果账号没有schedule配置，应用全局默认配置
    if (!account.schedule || typeof account.schedule !== 'object') {
      if (globalSchedule) {
        account.schedule = { ...globalSchedule };
        log.info(`账号 ${account.id} 使用全局默认执行计划`);
      } else {
        throw new Error('账号执行计划不能为空且没有全局默认配置');
      }
    }

    this.validateScheduleConfig(account.schedule);
  }

  /**
   * 验证执行计划配置
   */
  private validateScheduleConfig(schedule: any): void {
    if (!schedule.times || !Array.isArray(schedule.times)) {
      throw new Error('times字段必须是数组');
    }

    // 验证时间格式
    for (const time of schedule.times) {
      if (!this.isValidTimeFormat(time)) {
        throw new Error(`时间格式错误: ${time}，应为HH:MM格式`);
      }
    }

    if (schedule.runOnStart !== undefined && typeof schedule.runOnStart !== 'boolean') {
      throw new Error('runOnStart字段必须是布尔值');
    }
  }

  /**
   * 验证时间格式 (HH:MM)
   */
  private isValidTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  /**
   * 保存配置到文件
   */
  private saveConfig(config: MultiAccountConfig): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
      log.debug('配置文件已保存');
    } catch (error) {
      log.error('保存配置文件失败:', error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * 获取所有启用的账号
   */
  getEnabledAccounts(): AccountConfig[] {
    return this.config.accounts.filter(account => account.enabled !== false);
  }

  /**
   * 根据ID获取账号配置
   */
  getAccountById(id: string): AccountConfig | undefined {
    return this.config.accounts.find(account => account.id === id);
  }

  /**
   * 添加新账号
   */
  addAccount(account: AccountConfig): void {
    // 检查ID是否已存在
    if (this.config.accounts.some(existing => existing.id === account.id)) {
      throw new Error(`账号ID已存在: ${account.id}`);
    }

    // 应用全局默认配置
    if (this.config.globalSchedule && !account.schedule.times.length) {
      account.schedule.times = [...this.config.globalSchedule.times];
    }

    this.config.accounts.push(account);
    this.saveConfig(this.config);
    log.info(`已添加账号: ${account.name || account.id}`);
  }

  /**
   * 更新账号配置
   */
  updateAccount(id: string, updates: Partial<AccountConfig>): void {
    const accountIndex = this.config.accounts.findIndex(account => account.id === id);
    if (accountIndex === -1) {
      throw new Error(`账号不存在: ${id}`);
    }

    this.config.accounts[accountIndex] = {
      ...this.config.accounts[accountIndex],
      ...updates
    };

    this.saveConfig(this.config);
    log.info(`已更新账号: ${id}`);
  }

  /**
   * 删除账号
   */
  removeAccount(id: string): void {
    const accountIndex = this.config.accounts.findIndex(account => account.id === id);
    if (accountIndex === -1) {
      throw new Error(`账号不存在: ${id}`);
    }

    const account = this.config.accounts[accountIndex];
    this.config.accounts.splice(accountIndex, 1);
    this.saveConfig(this.config);
    log.info(`已删除账号: ${account.name || account.id}`);
  }

  /**
   * 启用/禁用账号
   */
  toggleAccount(id: string, enabled: boolean): void {
    this.updateAccount(id, { enabled });
  }

  /**
   * 获取全局执行计划
   */
  getGlobalSchedule(): ScheduleConfig | undefined {
    return this.config.globalSchedule;
  }

  /**
   * 设置全局执行计划
   */
  setGlobalSchedule(schedule: ScheduleConfig): void {
    this.config.globalSchedule = schedule;
    this.saveConfig(this.config);
    log.info('已更新全局执行计划');
  }

  /**
   * 获取配置文件路径
   */
  getConfigPath(): string {
    return this.configPath;
  }

  /**
   * 重新加载配置
   */
  reloadConfig(): void {
    this.config = this.loadConfig();
  }
} 