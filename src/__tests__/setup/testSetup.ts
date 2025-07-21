import 'jest';

// 全局测试配置
beforeEach(() => {
  // 清理所有console.log的mock
  jest.clearAllMocks();
  
  // 在测试环境中禁用logger输出，减少噪音
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

// 全局测试工具
export const createMockApiClient = () => ({
  getFuliScores: jest.fn(),
  getSessionWithBindInfo: jest.fn(),
  getFuliStatus: jest.fn(),
  getPosts: jest.fn(),
  viewPost: jest.fn(),
  toggleLike: jest.fn(),
  claimSignReward: jest.fn(),
  claimTaskReward: jest.fn()
});

export const createMockFrequencyController = () => ({
  randomDelay: jest.fn().mockResolvedValue(undefined),
  setDelayRange: jest.fn(),
  getDelayRange: jest.fn().mockReturnValue({ min: 1000, max: 3000 })
});

// 快速Mock，避免实际延迟
export const createFastMockFrequencyController = () => ({
  randomDelay: jest.fn().mockImplementation(() => Promise.resolve()),
  setDelayRange: jest.fn(),
  getDelayRange: jest.fn().mockReturnValue({ min: 0, max: 0 })
});

// 抑制console.log在测试中的输出
export const suppressConsole = () => {
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
  return consoleSpy;
};

// 恢复console.log
export const restoreConsole = (spy: jest.SpyInstance) => {
  spy.mockRestore();
}; 