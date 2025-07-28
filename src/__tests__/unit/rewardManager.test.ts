import { RewardManager } from '../../rewardManager';
import { ApiClient } from '../../api';

describe('RewardManager', () => {
  let rewardManager: RewardManager;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    mockApiClient = {
      getFuliStatus: jest.fn(),
      claimSignReward: jest.fn(),
      claimTaskReward: jest.fn()
    } as unknown as jest.Mocked<ApiClient>;

    rewardManager = new RewardManager(mockApiClient);
  });

  describe('签到奖励测试', () => {
    it('应该成功领取签到奖励', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            weekdays: [
              { day: 1, status: 1 }, // 可领取
              { day: 2, status: 2 }, // 已领取
              { day: 3, status: 0 }  // 未签到
            ]
          })
        }
      });

      mockApiClient.claimSignReward.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            packageId: 'reward1'
          })
        }
      });

      await rewardManager.claimSignRewards();

      expect(mockApiClient.claimSignReward).toHaveBeenCalledWith(1);
      expect(mockApiClient.claimSignReward).toHaveBeenCalledTimes(1);
    });

    it('应该处理没有可领取的签到奖励', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            weekdays: [
              { day: 1, status: 2 }, // 已领取
              { day: 2, status: 0 }  // 未签到
            ]
          })
        }
      });

      await rewardManager.claimSignRewards();

      expect(mockApiClient.claimSignReward).not.toHaveBeenCalled();
    });

    it('应该处理获取福利状态失败', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 1,
        errmsg: '获取失败',
        data: {}
      });

      await expect(rewardManager.claimSignRewards()).resolves.not.toThrow();
    });

    it('应该处理签到奖励领取失败', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            weekdays: [{ day: 1, status: 1 }]
          })
        }
      });

      mockApiClient.claimSignReward.mockResolvedValue({
        ret: 1,
        errmsg: '奖励已领取',
        data: {}
      });

      await expect(rewardManager.claimSignRewards()).resolves.not.toThrow();
    });
  });

  describe('任务奖励测试', () => {
    it('应该成功领取任务奖励', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                status: 1, // 已完成
                isGet: false, // 未领取
                scoreA: 10,
                scoreB: 5
              },
              {
                id: '2',
                status: 1, // 已完成
                isGet: true, // 已领取
                scoreA: 20,
                scoreB: 10
              }
            ]
          })
        }
      });

      mockApiClient.claimTaskReward.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            scoreA: 10,
            scoreB: 5,
            scoreATotal: 100,
            scoreBTotal: 50
          })
        }
      });

      await rewardManager.claimTaskRewards();

      expect(mockApiClient.claimTaskReward).toHaveBeenCalledWith('1');
      expect(mockApiClient.claimTaskReward).toHaveBeenCalledTimes(1);
    });

    it('应该处理没有可领取的任务奖励', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                status: 0, // 未完成
                isGet: false,
                scoreA: 10,
                scoreB: 5
              }
            ]
          })
        }
      });

      await rewardManager.claimTaskRewards();

      expect(mockApiClient.claimTaskReward).not.toHaveBeenCalled();
    });

    it('应该处理任务奖励领取失败', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                status: 1,
                isGet: false,
                scoreA: 10,
                scoreB: 5
              }
            ]
          })
        }
      });

      mockApiClient.claimTaskReward.mockResolvedValue({
        ret: 1,
        errmsg: '任务奖励领取失败',
        data: {}
      });

      await expect(rewardManager.claimTaskRewards()).resolves.not.toThrow();
    });
  });

  describe('综合功能测试', () => {
    it('应该领取所有奖励', async () => {
      mockApiClient.getFuliStatus
        .mockResolvedValueOnce({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              weekdays: [{ day: 1, status: 1 }]
            })
          }
        })
        .mockResolvedValueOnce({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              tasks: [
                {
                  id: '1',
                  status: 1,
                  isGet: false,
                  scoreA: 10,
                  scoreB: 5
                }
              ]
            })
          }
        });

      mockApiClient.claimSignReward.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            packageId: 'reward1'
          })
        }
      });

      mockApiClient.claimTaskReward.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            scoreA: 10,
            scoreB: 5,
            scoreATotal: 100,
            scoreBTotal: 50
          })
        }
      });

      await rewardManager.claimAllRewards();

      expect(mockApiClient.claimSignReward).toHaveBeenCalledWith(1);
      expect(mockApiClient.claimTaskReward).toHaveBeenCalledWith('1');
    });

    it('应该显示奖励状态', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            weekdays: [
              { day: 1, status: 0 }, // 未签到
              { day: 2, status: 1 }, // 可领取
              { day: 3, status: 2 }  // 已领取
            ],
            tasks: [
              {
                id: '1',
                status: 1,
                isGet: false,
                scoreA: 10,
                scoreB: 5
              }
            ]
          })
        }
      });

      await expect(rewardManager.showRewardStatus()).resolves.not.toThrow();
    });

    it('应该处理显示奖励状态失败', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 1,
        errmsg: '网络错误',
        data: {}
      });

      await expect(rewardManager.showRewardStatus()).resolves.not.toThrow();
    });
  });

  describe('错误处理测试', () => {
    it('应该处理API调用异常', async () => {
      mockApiClient.getFuliStatus.mockRejectedValue(new Error('网络异常'));

      await expect(rewardManager.claimSignRewards()).resolves.not.toThrow();
    });

    it('应该处理JSON解析错误', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: 'invalid json string'
        }
      });

      await expect(rewardManager.claimSignRewards()).resolves.not.toThrow();
    });

    it('应该处理缺少data.pack字段', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      await expect(rewardManager.claimSignRewards()).resolves.not.toThrow();
    });

    it('应该处理包信息获取失败的情况', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            weekdays: [{ day: 1, status: 1 }]
          })
        }
      });

      mockApiClient.claimSignReward.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            packageId: 'reward1'
          })
        }
      });

      await expect(rewardManager.claimSignRewards()).resolves.not.toThrow();
    });

    it('应该处理任务奖励获取失败', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 1,
        errmsg: '获取失败',
        data: {}
      });

      const result = await (rewardManager as any).getAvailableTaskRewards();
      expect(result).toEqual([]);
    });
  });
}); 