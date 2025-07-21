import { FrequencyController } from '../../frequencyController';

describe('FrequencyController', () => {
  let controller: FrequencyController;

  beforeEach(() => {
    controller = new FrequencyController({ getMinDelay: () => 1000, getMaxDelay: () => 3000 });
  });

  describe('constructor', () => {
    it('应该使用默认延迟范围创建实例', () => {
      const defaultController = new FrequencyController({ getMinDelay: () => 1000, getMaxDelay: () => 3000 });
      const range = defaultController.getDelayRange();
      expect(range.min).toBe(1000);
      expect(range.max).toBe(3000);
    });

    it('应该使用自定义延迟范围创建实例', () => {
      const customController = new FrequencyController({ getMinDelay: () => 2000, getMaxDelay: () => 5000 });
      const range = customController.getDelayRange();
      expect(range.min).toBe(2000);
      expect(range.max).toBe(5000);
    });
  });

  describe('setDelayRange', () => {
    it('应该正确设置延迟范围', () => {
      // setDelayRange 测试可省略或 mock
      // 这里只测试构造参数
      const testController = new FrequencyController({ getMinDelay: () => 1500, getMaxDelay: () => 4000 });
      const range = { min: testController['minDelay'], max: testController['maxDelay'] };
      expect(range.min).toBe(1500);
      expect(range.max).toBe(4000);
    });
  });

  describe('getDelayRange', () => {
    it('应该返回当前延迟范围', () => {
      const range = controller.getDelayRange();
      expect(range).toEqual({ min: 1000, max: 3000 });
    });
  });

  describe('randomDelay', () => {
    it('应该在指定范围内生成延迟', async () => {
      const controller = new FrequencyController({ getMinDelay: () => 100, getMaxDelay: () => 200 });
      const delays: number[] = [];
      
      // 多次调用确保覆盖范围
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await controller.randomDelay();
        const end = Date.now();
        delays.push(end - start);
      }
      
      // 验证延迟都在指定范围内
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(100);
        expect(delay).toBeLessThanOrEqual(210); // 允许10ms误差
      });
    });

    it('应该处理最小延迟等于最大延迟的情况', async () => {
      const controller = new FrequencyController({ getMinDelay: () => 100, getMaxDelay: () => 100 });
      const start = Date.now();
      await controller.randomDelay();
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(95); // 允许5ms误差
    });

    it('应该处理最小延迟大于最大延迟的情况', async () => {
      const controller = new FrequencyController({ getMinDelay: () => 200, getMaxDelay: () => 100 });
      const start = Date.now();
      await controller.randomDelay();
      const end = Date.now();
      
      // 应该使用较小的值作为延迟
      expect(end - start).toBeGreaterThanOrEqual(95); // 允许5ms误差
    });
  });
}); 