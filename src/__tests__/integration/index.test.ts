import { TaskManager } from '../../taskManager';
import { ApiClient } from '../../api';
import { FrequencyController } from '../../frequencyController';
import { RewardManager } from '../../rewardManager';

// Mock all dependencies
jest.mock('../../taskManager');
jest.mock('../../api');
jest.mock('../../frequencyController');
jest.mock('../../rewardManager');

describe('Index Module', () => {
  let mockTaskManager: jest.Mocked<TaskManager>;
  let mockApiClient: jest.Mocked<ApiClient>;
  let mockFrequencyController: jest.Mocked<FrequencyController>;
  let mockRewardManager: jest.Mocked<RewardManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockApiClient = {} as unknown as jest.Mocked<ApiClient>;
mockFrequencyController = {} as unknown as jest.Mocked<FrequencyController>;
mockRewardManager = {} as unknown as jest.Mocked<RewardManager>;
    
    mockTaskManager = {
      verifyLogin: jest.fn().mockResolvedValue(undefined),
      showTaskStatus: jest.fn().mockResolvedValue(undefined),
      executeAllTasks: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<TaskManager>;

    (ApiClient as jest.MockedClass<typeof ApiClient>).mockImplementation(() => mockApiClient);
    (FrequencyController as jest.MockedClass<typeof FrequencyController>).mockImplementation(() => mockFrequencyController);
    (TaskManager as jest.MockedClass<typeof TaskManager>).mockImplementation(() => mockTaskManager);
    (RewardManager as jest.MockedClass<typeof RewardManager>).mockImplementation(() => mockRewardManager);

    // Mock process.exit
    jest.spyOn(process, 'exit').mockImplementation((() => {}) as jest.MockedFunction<typeof process.exit>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('应该成功创建必要的组件', () => {
    // 测试组件能否正常创建
    const config = {
      authorization: 'test-auth',
      cookie: 'test-cookie',
      unionid: 'test-unionid',
      openid: 'test-openid'
    };

    const mockConfigManager = { getGlobalUA: () => '', getGlobalReferer: () => '' } as unknown as import('../../configManager').ConfigManager;
    const expectedApiConfig = { ...config, configManager: mockConfigManager };

    new ApiClient(expectedApiConfig);
    new FrequencyController({ getMinDelay: () => 1000, getMaxDelay: () => 3000 });
    new TaskManager(mockApiClient, mockFrequencyController);
    new RewardManager(mockApiClient);

    expect(ApiClient).toHaveBeenCalledWith(expect.objectContaining({
      authorization: 'test-auth',
      cookie: 'test-cookie',
      unionid: 'test-unionid',
      openid: 'test-openid',
      configManager: expect.any(Object)
    }));
    expect(FrequencyController).toHaveBeenCalled();
    expect(TaskManager).toHaveBeenCalledWith(mockApiClient, mockFrequencyController);
    expect(RewardManager).toHaveBeenCalledWith(mockApiClient);
  });

  it('应该能正确调用TaskManager的方法', async () => {
    await mockTaskManager.verifyLogin();
    await mockTaskManager.showTaskStatus();
    await mockTaskManager.executeAllTasks();

    expect(mockTaskManager.verifyLogin).toHaveBeenCalled();
    expect(mockTaskManager.showTaskStatus).toHaveBeenCalled();
    expect(mockTaskManager.executeAllTasks).toHaveBeenCalled();
  });

  it('应该能处理错误情况', async () => {
    mockTaskManager.verifyLogin.mockRejectedValue(new Error('登录失败'));

    await expect(mockTaskManager.verifyLogin()).rejects.toThrow('登录失败');
  });
}); 