// TODO: 测试问题梳理
// 1. 过度mock ApiClient，所有API请求都被拦截，导致无法发现真实接口和数据格式问题。
// 2. 部分测试仅为覆盖异常分支（如JSON解析失败、API错误、缺少字段等），但实际业务场景极少发生，建议只保留有实际意义的分支测试。
// 3. 多处通过mock console.log来断言日志输出，虽然可以接受，但建议优先断言业务行为，日志断言只做补充。
// 4. 建议后续可引入集成测试，配合mock server或真实后端，提升测试的真实性和健壮性。
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

  describe('claimSignRewards', () => {
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

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimSignRewards();

      expect(mockApiClient.claimSignReward).toHaveBeenCalledWith(1);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('成功领取 1 个签到奖励'));

      consoleSpy.mockRestore();
    });

    it('应该处理没有可领取的签到奖励', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            weekdays: [
              { day: 1, isChecked: true, isGet: true },
              { day: 2, isChecked: false, isGet: false }
            ]
          })
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimSignRewards();

      expect(mockApiClient.claimSignReward).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('没有可领取的签到奖励'));

      consoleSpy.mockRestore();
    });
  });

  describe('claimTaskRewards', () => {
    it('应该成功领取任务奖励', async () => {
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
              },
              {
                id: '2',
                status: 1,
                isGet: true,
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

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimTaskRewards();

      expect(mockApiClient.claimTaskReward).toHaveBeenCalledWith('1');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('成功领取任务1奖励'));

      consoleSpy.mockRestore();
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
                status: 0,
                isGet: false,
                scoreA: 10,
                scoreB: 5
              }
            ]
          })
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimTaskRewards();

      expect(mockApiClient.claimTaskReward).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('没有可领取的任务奖励'));

      consoleSpy.mockRestore();
    });
  });

  describe('claimAllRewards', () => {
    it('应该领取所有奖励', async () => {
      mockApiClient.getFuliStatus
        .mockResolvedValueOnce({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              weekdays: [{ day: 1, isChecked: true, isGet: false }]
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

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimAllRewards();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('所有奖励领取完成'));

      consoleSpy.mockRestore();
    });
  });

  describe('showRewardStatus', () => {
    it('应该显示奖励状态', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            weekdays: [
              { day: 1, isChecked: true, isGet: true },
              { day: 2, isChecked: true, isGet: false },
              { day: 3, isChecked: false, isGet: false }
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

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.showRewardStatus();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('奖励状态'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('签到奖励状态'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('任务奖励状态'));

      consoleSpy.mockRestore();
    });
  });

  describe('分支覆盖和边界条件测试', () => {
    it('应该处理签到奖励领取失败的情况', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            weekdays: [
              { day: 1, status: 1 }, // 可领取
              { day: 2, status: 1 }  // 可领取
            ]
          })
        }
      });

      // 第一次成功，第二次失败
      mockApiClient.claimSignReward
        .mockResolvedValueOnce({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              packageId: 'reward1'
            })
          }
        })
        .mockResolvedValueOnce({
          ret: 1,
          errmsg: '奖励已领取',
          data: {}
        });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimSignRewards();

      expect(mockApiClient.claimSignReward).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('成功领取 1 个签到奖励'));

      consoleSpy.mockRestore();
    });

    it('应该处理所有不同的签到状态', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            weekdays: [
              { day: 1, status: 0 }, // 未签到
              { day: 2, status: 1 }, // 可领取
              { day: 3, status: 2 }, // 已领取
              { day: 4, status: 1 }, // 可领取
              { day: 5, status: 0 }, // 未签到
              { day: 6, status: 2 }, // 已领取
              { day: 7, status: 1 }  // 可领取
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

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimSignRewards();

      // 应该只领取status为1的奖励（第2、4、7天）
      expect(mockApiClient.claimSignReward).toHaveBeenCalledTimes(3);
      expect(mockApiClient.claimSignReward).toHaveBeenCalledWith(2);
      expect(mockApiClient.claimSignReward).toHaveBeenCalledWith(4);
      expect(mockApiClient.claimSignReward).toHaveBeenCalledWith(7);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('成功领取 3 个签到奖励'));

      consoleSpy.mockRestore();
    });

    it('应该处理获取福利状态失败的情况', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 1,
        errmsg: '获取失败',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // 这个方法不会抛出异常，而是记录错误日志
      await rewardManager.claimSignRewards();

      // 检查是否调用了错误日志，匹配实际的调用格式
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/❌.*领取签到奖励失败/),
        expect.stringContaining('获取福利状态失败: 获取失败')
      );

      consoleSpy.mockRestore();
    });

    it('应该处理任务奖励领取失败的情况', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '测试任务1',
                status: 1, // 已完成
                isGet: false, // 未领取
                scoreA: 10,
                scoreB: 0
              },
              {
                id: '2',
                name: '测试任务2',
                status: 1, // 已完成
                isGet: false, // 未领取
                scoreA: 20,
                scoreB: 0
              }
            ]
          })
        }
      });

      // 第一次成功，第二次失败
      mockApiClient.claimTaskReward
        .mockResolvedValueOnce({
          ret: 0,
          errmsg: '',
          data: {
            pack: JSON.stringify({
              taskId: '1',
              scoreA: 10,
              scoreATotal: 100,
              scoreB: 0,
              scoreBTotal: 5
            })
          }
        })
        .mockResolvedValueOnce({
          ret: 1,
          errmsg: '任务奖励领取失败',
          data: {}
        });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimTaskRewards();

      expect(mockApiClient.claimTaskReward).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/✅.*成功领取任务1奖励/));
      // 第二个任务失败，但不会有专门的失败日志，而是会被跳过

      consoleSpy.mockRestore();
    });

    it('应该处理任务状态的所有分支', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '未完成任务',
                status: 0, // 未完成
                isGet: false,
                scoreA: 10,
                scoreB: 0
              },
              {
                id: '2',
                name: '已完成未领取',
                status: 1, // 已完成
                isGet: false, // 未领取
                scoreA: 20,
                scoreB: 0
              },
              {
                id: '3',
                name: '已完成已领取',
                status: 1, // 已完成
                isGet: true, // 已领取
                scoreA: 30,
                scoreB: 0
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
            taskId: '2',
            scoreA: 20,
            scoreATotal: 120,
            scoreB: 0,
            scoreBTotal: 5
          })
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimTaskRewards();

      // 只应该领取任务2的奖励
      expect(mockApiClient.claimTaskReward).toHaveBeenCalledTimes(1);
      expect(mockApiClient.claimTaskReward).toHaveBeenCalledWith('2');

      consoleSpy.mockRestore();
    });

    it('应该处理showRewardStatus的错误情况', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 1,
        errmsg: '网络错误',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.showRewardStatus();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('获取奖励状态失败'));

      consoleSpy.mockRestore();
    });

    it('应该正确显示所有签到状态', async () => {
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
                name: '测试任务',
                status: 1,
                isGet: false,
                scoreA: 10,
                scoreB: 0
              }
            ]
          })
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.showRewardStatus();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📅 签到奖励状态'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('❌ 未签到'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('🎁 可领取'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ 已领取'));

      consoleSpy.mockRestore();
    });

    it('应该处理空的weekdays和tasks数组', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            weekdays: [],
            tasks: []
          })
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimSignRewards();
      await rewardManager.claimTaskRewards();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/ℹ️.*没有可领取的签到奖励/));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/ℹ️.*没有可领取的任务奖励/));

      consoleSpy.mockRestore();
    });

    it('应该处理claimAllRewards中的异常', async () => {
      // Mock claimSignRewards 抛出异常
      const originalMethod = rewardManager.claimSignRewards;
      rewardManager.claimSignRewards = jest.fn().mockRejectedValue(new Error('签到奖励异常'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimAllRewards();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/❌.*领取奖励过程中发生错误/),
        expect.stringContaining('签到奖励异常')
      );

      // 恢复原方法
      rewardManager.claimSignRewards = originalMethod;
      consoleSpy.mockRestore();
    });

    it('应该处理JSON解析错误', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: 'invalid json string'
        }
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // 应该记录错误而不是抛出异常
      await rewardManager.claimSignRewards();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/❌.*领取签到奖励失败/),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('应该处理缺少data.pack字段的情况', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {}
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // 应该记录错误而不是抛出异常
      await rewardManager.claimSignRewards();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/❌.*领取签到奖励失败/),
        expect.anything()
      );

      consoleSpy.mockRestore();
    });

    it('应该处理单个签到奖励领取的异常', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            weekdays: [
              { day: 1, status: 1 }
            ]
          })
        }
      });

      mockApiClient.claimSignReward.mockRejectedValue(new Error('网络异常'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimSignRewards();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/ℹ️.*没有可领取的签到奖励/));

      consoleSpy.mockRestore();
    });

    it('应该处理单个任务奖励领取的异常', async () => {
      mockApiClient.getFuliStatus.mockResolvedValue({
        ret: 0,
        errmsg: '',
        data: {
          pack: JSON.stringify({
            tasks: [
              {
                id: '1',
                name: '测试任务',
                status: 1,
                isGet: false,
                scoreA: 10,
                scoreB: 0
              }
            ]
          })
        }
      });

      mockApiClient.claimTaskReward.mockRejectedValue(new Error('网络异常'));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await rewardManager.claimTaskRewards();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/❌.*领取任务1奖励失败/),
        expect.stringContaining('网络异常')
      );

      consoleSpy.mockRestore();
    });
  });
}); 