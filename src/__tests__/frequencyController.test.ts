import { FrequencyController } from '../frequencyController';

describe('FrequencyController', () => {
  let frequencyController: FrequencyController;
  let mockConfigManager: any;

  beforeEach(() => {
    mockConfigManager = {
      getMinDelay: jest.fn().mockReturnValue(1000),
      getMaxDelay: jest.fn().mockReturnValue(3000)
    };

    frequencyController = new FrequencyController(mockConfigManager);
  });

  describe('constructor', () => {
    it('应该正确创建FrequencyController实例', () => {
      expect(frequencyController).toBeInstanceOf(FrequencyController);
      expect(mockConfigManager.getMinDelay).toHaveBeenCalled();
      expect(mockConfigManager.getMaxDelay).toHaveBeenCalled();
    });

    it('应该正确设置延迟范围', () => {
      const delayRange = frequencyController.getDelayRange();
      expect(delayRange.min).toBe(1000);
      expect(delayRange.max).toBe(3000);
    });
  });

  describe('randomDelay', () => {
    it('应该生成指定范围内的随机延迟', async () => {
      jest.useFakeTimers();
      
      const delayPromise = frequencyController.randomDelay();
      
      // 快进时间
      jest.runAllTimers();
      
      await delayPromise;
      
      jest.useRealTimers();
    });

    it('应该处理最小延迟等于最大延迟的情况', async () => {
      mockConfigManager.getMinDelay.mockReturnValue(2000);
      mockConfigManager.getMaxDelay.mockReturnValue(2000);
      
      const newController = new FrequencyController(mockConfigManager);
      
      jest.useFakeTimers();
      
      const delayPromise = newController.randomDelay();
      
      // 快进时间
      jest.runAllTimers();
      
      await delayPromise;
      
      jest.useRealTimers();
    });

    it('应该处理最小延迟大于最大延迟的情况', async () => {
      mockConfigManager.getMinDelay.mockReturnValue(3000);
      mockConfigManager.getMaxDelay.mockReturnValue(1000);
      
      const newController = new FrequencyController(mockConfigManager);
      
      jest.useFakeTimers();
      
      const delayPromise = newController.randomDelay();
      
      // 快进时间
      jest.runAllTimers();
      
      await delayPromise;
      
      jest.useRealTimers();
    });

    it('应该处理零延迟的情况', async () => {
      mockConfigManager.getMinDelay.mockReturnValue(0);
      mockConfigManager.getMaxDelay.mockReturnValue(0);
      
      const newController = new FrequencyController(mockConfigManager);
      
      jest.useFakeTimers();
      
      const delayPromise = newController.randomDelay();
      
      // 快进时间
      jest.runAllTimers();
      
      await delayPromise;
      
      jest.useRealTimers();
    });

    it('应该处理负数延迟的情况', async () => {
      mockConfigManager.getMinDelay.mockReturnValue(-1000);
      mockConfigManager.getMaxDelay.mockReturnValue(-500);
      
      const newController = new FrequencyController(mockConfigManager);
      
      jest.useFakeTimers();
      
      const delayPromise = newController.randomDelay();
      
      // 快进时间
      jest.runAllTimers();
      
      await delayPromise;
      
      jest.useRealTimers();
    });
  });

  describe('setDelayRange', () => {
    it('应该正确设置延迟范围', () => {
      frequencyController.setDelayRange(500, 1500);
      
      const delayRange = frequencyController.getDelayRange();
      expect(delayRange.min).toBe(500);
      expect(delayRange.max).toBe(1500);
    });

    it('应该处理设置相同的最小和最大延迟', () => {
      frequencyController.setDelayRange(1000, 1000);
      
      const delayRange = frequencyController.getDelayRange();
      expect(delayRange.min).toBe(1000);
      expect(delayRange.max).toBe(1000);
    });

    it('应该处理设置最小延迟大于最大延迟', () => {
      frequencyController.setDelayRange(2000, 1000);
      
      const delayRange = frequencyController.getDelayRange();
      expect(delayRange.min).toBe(2000);
      expect(delayRange.max).toBe(1000);
    });

    it('应该处理设置零延迟', () => {
      frequencyController.setDelayRange(0, 0);
      
      const delayRange = frequencyController.getDelayRange();
      expect(delayRange.min).toBe(0);
      expect(delayRange.max).toBe(0);
    });

    it('应该处理设置负数延迟', () => {
      frequencyController.setDelayRange(-1000, -500);
      
      const delayRange = frequencyController.getDelayRange();
      expect(delayRange.min).toBe(-1000);
      expect(delayRange.max).toBe(-500);
    });
  });

  describe('getDelayRange', () => {
    it('应该返回当前的延迟范围', () => {
      const delayRange = frequencyController.getDelayRange();
      expect(delayRange).toEqual({ min: 1000, max: 3000 });
    });

    it('应该返回更新后的延迟范围', () => {
      frequencyController.setDelayRange(500, 1500);
      
      const delayRange = frequencyController.getDelayRange();
      expect(delayRange).toEqual({ min: 500, max: 1500 });
    });
  });

  describe('边界条件测试', () => {
    it('应该处理极大延迟值', async () => {
      frequencyController.setDelayRange(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
      
      jest.useFakeTimers();
      
      const delayPromise = frequencyController.randomDelay();
      
      // 快进时间
      jest.runAllTimers();
      
      await delayPromise;
      
      jest.useRealTimers();
    });

    it('应该处理极小延迟值', async () => {
      frequencyController.setDelayRange(Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
      
      jest.useFakeTimers();
      
      const delayPromise = frequencyController.randomDelay();
      
      // 快进时间
      jest.runAllTimers();
      
      await delayPromise;
      
      jest.useRealTimers();
    });

    it('应该处理浮点数延迟值', async () => {
      frequencyController.setDelayRange(1000.5, 2000.7);
      
      jest.useFakeTimers();
      
      const delayPromise = frequencyController.randomDelay();
      
      // 快进时间
      jest.runAllTimers();
      
      await delayPromise;
      
      jest.useRealTimers();
    });
  });

  describe('配置管理器异常处理', () => {
    it('配置管理器getMinDelay抛出异常时应该使用默认值', () => {
      mockConfigManager.getMinDelay.mockImplementation(() => {
        throw new Error('配置错误');
      });
      
      expect(() => new FrequencyController(mockConfigManager)).toThrow('配置错误');
    });

    it('配置管理器getMaxDelay抛出异常时应该使用默认值', () => {
      mockConfigManager.getMaxDelay.mockImplementation(() => {
        throw new Error('配置错误');
      });
      
      expect(() => new FrequencyController(mockConfigManager)).toThrow('配置错误');
    });

    it('配置管理器返回非数字值时应该正常处理', () => {
      mockConfigManager.getMinDelay.mockReturnValue('1000');
      mockConfigManager.getMaxDelay.mockReturnValue('3000');
      
      const newController = new FrequencyController(mockConfigManager);
      
      const delayRange = newController.getDelayRange();
      expect(delayRange.min).toBe('1000');
      expect(delayRange.max).toBe('3000');
    });

    it('配置管理器返回null值时应该正常处理', () => {
      mockConfigManager.getMinDelay.mockReturnValue(null);
      mockConfigManager.getMaxDelay.mockReturnValue(null);
      
      const newController = new FrequencyController(mockConfigManager);
      
      const delayRange = newController.getDelayRange();
      expect(delayRange.min).toBe(null);
      expect(delayRange.max).toBe(null);
    });

    it('配置管理器返回undefined值时应该正常处理', () => {
      mockConfigManager.getMinDelay.mockReturnValue(undefined);
      mockConfigManager.getMaxDelay.mockReturnValue(undefined);
      
      const newController = new FrequencyController(mockConfigManager);
      
      const delayRange = newController.getDelayRange();
      expect(delayRange.min).toBe(undefined);
      expect(delayRange.max).toBe(undefined);
    });
  });
}); 