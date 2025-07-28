import { FrequencyController } from '../../frequencyController';

describe('FrequencyController', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('应该使用默认参数创建实例', () => {
      const controller = new FrequencyController();
      const range = controller.getDelayRange();
      expect(range.min).toBe(1000);
      expect(range.max).toBe(3000);
    });

    it('应该使用自定义参数创建实例', () => {
      const controller = new FrequencyController(2000, 5000);
      const range = controller.getDelayRange();
      expect(range.min).toBe(2000);
      expect(range.max).toBe(5000);
    });

    it('应该验证延迟范围的合理性', () => {
      // 负数延迟
      expect(() => new FrequencyController(-1000, 2000)).toThrow('延迟时间不能为负数');
      expect(() => new FrequencyController(1000, -2000)).toThrow('延迟时间不能为负数');
      
      // 最小延迟大于最大延迟
      expect(() => new FrequencyController(3000, 1000)).toThrow('最小延迟不能大于最大延迟');
    });
  });

  describe('setDelayRange', () => {
    it('应该正确设置延迟范围', () => {
      const controller = new FrequencyController();
      controller.setDelayRange(500, 1500);
      
      const range = controller.getDelayRange();
      expect(range.min).toBe(500);
      expect(range.max).toBe(1500);
    });

    it('应该验证设置延迟范围的合理性', () => {
      const controller = new FrequencyController();
      
      expect(() => controller.setDelayRange(-100, 200)).toThrow('延迟时间不能为负数');
      expect(() => controller.setDelayRange(100, -200)).toThrow('延迟时间不能为负数');
      expect(() => controller.setDelayRange(300, 100)).toThrow('最小延迟不能大于最大延迟');
    });
  });

  describe('getDelayRange', () => {
    it('应该返回当前延迟范围', () => {
      const controller = new FrequencyController(1000, 3000);
      const range = controller.getDelayRange();
      expect(range).toEqual({ min: 1000, max: 3000 });
    });
  });

  describe('generateRandomDelay', () => {
    it('应该在指定范围内生成延迟', () => {
      const controller = new FrequencyController(100, 200);
      const delays: number[] = [];
      
      // 多次调用确保覆盖范围
      for (let i = 0; i < 100; i++) {
        delays.push(controller.generateRandomDelay());
      }
      
      // 验证延迟都在指定范围内
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(100);
        expect(delay).toBeLessThanOrEqual(200);
      });
      
      // 验证至少有一些不同的值（随机性）
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    it('应该处理最小延迟等于最大延迟的情况', () => {
      const controller = new FrequencyController(100, 100);
      const delay = controller.generateRandomDelay();
      expect(delay).toBe(100);
    });
  });

  describe('randomDelay', () => {
    it('应该正确执行延迟', async () => {
      const controller = new FrequencyController(100, 200);
      const delayPromise = controller.randomDelay();
      
      // 快进时间
      jest.runAllTimers();
      
      await delayPromise;
      // 如果没有抛出异常，说明延迟执行成功
    });

    it('应该使用生成的随机延迟时间', async () => {
      const controller = new FrequencyController(100, 200);
      const generateSpy = jest.spyOn(controller, 'generateRandomDelay').mockReturnValue(150);
      const waitSpy = jest.spyOn(controller, 'wait');
      
      const delayPromise = controller.randomDelay();
      jest.runAllTimers();
      await delayPromise;
      
      expect(generateSpy).toHaveBeenCalled();
      expect(waitSpy).toHaveBeenCalledWith(150);
    });
  });


}); 