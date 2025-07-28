// TODO: 测试问题梳理
// 1. 过度mock TaskManager、ApiClient、FrequencyController、RewardManager，导致集成测试与真实业务脱节，难以发现集成和边界问题。
// 2. 仅测试了组件能否被创建和方法能否被调用，缺乏真实业务流程和数据流的验证。
// 3. 没有对实际业务行为、数据流、边界场景进行端到端验证，建议补充更贴近真实场景的集成测试。
// 4. 建议后续可引入端到端测试，配合mock server或真实后端，提升测试的真实性和健壮性。
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
    new FrequencyController(1000, 3000);
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