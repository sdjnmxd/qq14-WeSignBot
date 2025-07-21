/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 0,  // 调试信息，只在开发模式显示
  INFO = 1,   // 一般信息，正常运行时显示
  SUCCESS = 2, // 成功信息，重要操作成功时显示
  WARN = 3,   // 警告信息
  ERROR = 4   // 错误信息
}

/**
 * 统一日志管理器
 */
export class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel;
  private isDebugMode: boolean;

  private constructor() {
    this.isDebugMode = process.env.NODE_ENV !== 'production';
    this.currentLevel = this.isDebugMode ? LogLevel.DEBUG : LogLevel.INFO;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  /**
   * 调试信息 - 只在开发模式显示
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.DEBUG && this.isDebugMode) {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
    }
  }

  /**
   * 一般信息 - 正常运行时显示
   */
  info(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.INFO) {
      console.log(`ℹ️  ${message}`, ...args);
    }
  }

  /**
   * 成功信息 - 重要操作成功时显示
   */
  success(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.SUCCESS) {
      console.log(`✅ ${message}`, ...args);
    }
  }

  /**
   * 警告信息
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.currentLevel <= LogLevel.WARN) {
      console.log(`⚠️  ${message}`, ...args);
    }
  }

  /**
   * 错误信息
   */
  error(message: string, ...args: unknown[]): void {
    console.log(`❌ ${message}`, ...args);
  }

  /**
   * 任务开始
   */
  taskStart(taskName: string): void {
    this.info(`🚀 开始执行: ${taskName}`);
  }

  /**
   * 任务完成
   */
  taskComplete(taskName: string): void {
    this.success(`✅ 完成: ${taskName}`);
  }

  /**
   * 任务跳过
   */
  taskSkip(taskName: string, reason: string): void {
    this.info(`⏭️  跳过: ${taskName} (${reason})`);
  }

  /**
   * 进度信息
   */
  progress(current: number, total: number, item?: string): void {
    const itemStr = item ? ` - ${item}` : '';
    this.info(`📊 进度: ${current}/${total}${itemStr}`);
  }

  /**
   * 分隔线 - 用于显著的模块分隔
   */
  separator(title?: string): void {
    if (title) {
      console.log(`\n=== ${title} ===`);
    } else {
      console.log('\n---');
    }
  }

  /**
   * 子任务信息 - 带缩进的信息
   */
  subInfo(message: string, ...args: unknown[]): void {
    this.info(`  ${message}`, ...args);
  }

  /**
   * API请求信息 - 只在调试模式显示
   */
  apiRequest(url: string, method: string): void {
    this.debug(`API请求: ${method} ${url}`);
  }

  /**
   * API响应信息 - 只在调试模式显示
   */
  apiResponse(status: number, url: string): void {
    this.debug(`API响应: ${status} ${url}`);
  }

  /**
   * API错误信息
   */
  apiError(url: string, error: string): void {
    this.error(`API错误: ${url} - ${error}`);
  }
}

// 导出单例实例
export const logger = Logger.getInstance();

// 导出便捷方法
export const log = {
  debug: (message: string, ...args: unknown[]) => logger.debug(message, ...args),
  info: (message: string, ...args: unknown[]) => logger.info(message, ...args),
  success: (message: string, ...args: unknown[]) => logger.success(message, ...args),
  warn: (message: string, ...args: unknown[]) => logger.warn(message, ...args),
  error: (message: string, ...args: unknown[]) => logger.error(message, ...args),
  taskStart: (taskName: string) => logger.taskStart(taskName),
  taskComplete: (taskName: string) => logger.taskComplete(taskName),
  taskSkip: (taskName: string, reason: string) => logger.taskSkip(taskName, reason),
  progress: (current: number, total: number, item?: string) => logger.progress(current, total, item),
  separator: (title?: string) => logger.separator(title),
  subInfo: (message: string, ...args: unknown[]) => logger.subInfo(message, ...args),
  apiRequest: (url: string, method: string) => logger.apiRequest(url, method),
  apiResponse: (status: number, url: string) => logger.apiResponse(status, url),
  apiError: (url: string, error: string) => logger.apiError(url, error)
}; 