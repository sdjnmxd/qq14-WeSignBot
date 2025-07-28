import { TaskHandler, TaskType, Task, TaskContext } from '../types';
import { log } from '../utils/logger';

export class UnlikeLikeHandler implements TaskHandler {
  canHandle(taskType: TaskType): boolean {
    return taskType === TaskType.LIKE_POST;
  }

  async execute(task: Task, context: TaskContext): Promise<void> {
    const { apiClient, frequencyController } = context;
    
    log.info(`🧪 开始验证取消点赞再重新点赞策略: ${task.name}`);
    
    // 获取当前进度
    const currentProgress = await this.getProgress(task, apiClient);
    const remainingCount = task.required - currentProgress;
    
    if (remainingCount <= 0) {
      log.info(`任务 ${task.name} 已完成`);
      return;
    }

    log.info(`需要完成 ${remainingCount} 次点赞任务`);
    
    // 获取帖子列表
    const posts = await this.getPosts(apiClient);
    if (!posts || posts.length === 0) {
      log.warn('没有可用的帖子');
      return;
    }

    log.debug(`获取到 ${posts.length} 个帖子`);
    
    // 找到已点赞的帖子（用于测试取消点赞再重新点赞）
    const likedPosts = posts.filter(post => post.liked);
    const unlikedPosts = posts.filter(post => !post.liked);
    
    log.info(`📊 帖子统计: 总数${posts.length}, 已点赞${likedPosts.length}, 未点赞${unlikedPosts.length}`);
    
    let completedCount = 0;
    
    // 策略1: 如果有已点赞的帖子，先尝试"取消点赞->重新点赞"策略
    if (likedPosts.length > 0 && completedCount < remainingCount) {
      log.info(`🔄 策略1: 测试取消点赞再重新点赞 (${Math.min(likedPosts.length, remainingCount - completedCount)} 个帖子)`);
      
      const testCount = Math.min(likedPosts.length, remainingCount - completedCount);
      
      for (let i = 0; i < testCount; i++) {
        const post = likedPosts[i];
        log.info(`🧪 测试帖子 ${i + 1}/${testCount}: ${post.title}`);
        
        try {
          // 记录操作前的进度
          const progressBefore = await this.getProgress(task, apiClient);
          
          // 步骤1: 取消点赞
          log.debug(`  🔄 步骤1: 取消点赞 ${post.postId}`);
          const unlikeResult = await this.tryToggleLike(post.postId, false, apiClient);
          
          if (unlikeResult) {
            log.debug(`  ✅ 取消点赞成功`);
            
            // 等待一下
            await frequencyController.randomDelay();
            
            // 步骤2: 重新点赞
            log.debug(`  🔄 步骤2: 重新点赞 ${post.postId}`);
            const likeResult = await this.tryToggleLike(post.postId, true, apiClient);
            
            if (likeResult) {
              log.debug(`  ✅ 重新点赞成功`);
              
              // 等待并检查进度是否有变化
              await frequencyController.randomDelay();
              
              const progressAfter = await this.getProgress(task, apiClient);
              
              if (progressAfter > progressBefore) {
                completedCount++;
                log.success(`  🎉 进度增加! ${progressBefore} -> ${progressAfter} (+${progressAfter - progressBefore})`);
              } else {
                log.warn(`  ⚠️  进度未变化: ${progressBefore} -> ${progressAfter}`);
              }
            } else {
              log.warn(`  ❌ 重新点赞失败`);
            }
          } else {
            log.warn(`  ❌ 取消点赞失败`);
          }
          
          await frequencyController.randomDelay();
          
        } catch (error) {
          log.error(`测试帖子 ${post.title} 时出错: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    
    // 策略2: 如果还需要更多进度，尝试点赞未点赞的帖子
    if (completedCount < remainingCount && unlikedPosts.length > 0) {
      log.info(`🔄 策略2: 点赞未点赞的帖子 (还需要 ${remainingCount - completedCount} 次)`);
      
      const normalLikeCount = Math.min(unlikedPosts.length, remainingCount - completedCount);
      
      for (let i = 0; i < normalLikeCount; i++) {
        const post = unlikedPosts[i];
        log.debug(`  📍 点赞帖子 ${i + 1}/${normalLikeCount}: ${post.title}`);
        
        try {
          const progressBefore = await this.getProgress(task, apiClient);
          
          const likeResult = await this.tryToggleLike(post.postId, true, apiClient);
          
          if (likeResult) {
            await frequencyController.randomDelay();
            
            const progressAfter = await this.getProgress(task, apiClient);
            
            if (progressAfter > progressBefore) {
              completedCount++;
              log.info(`  ✅ 正常点赞成功，进度: ${progressBefore} -> ${progressAfter}`);
            }
          }
          
          await frequencyController.randomDelay();
          
        } catch (error) {
          log.error(`点赞帖子 ${post.title} 时出错: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    
    // 最终报告
    const finalProgress = await this.getProgress(task, apiClient);
    
    log.info(`\n📋 策略测试结果报告:`);
    log.info(`  初始进度: ${currentProgress}/${task.required}`);
    log.info(`  最终进度: ${finalProgress}/${task.required}`);
    log.info(`  进度增加: ${finalProgress - currentProgress}`);
    log.info(`  操作成功: ${completedCount} 次`);
    
    if (finalProgress >= task.required) {
      log.success(`🎉 任务完成！`);
    } else if (finalProgress > currentProgress) {
      log.info(`📈 策略部分有效，建议继续使用`);
    } else {
      log.warn(`❌ 策略无效或需要调整`);
    }
  }

  async getProgress(task: Task, apiClient?: unknown): Promise<number> {
    if (!apiClient) {
      return task.progress;
    }
    
    try {
      const response = await (apiClient as { getFuliStatus: () => Promise<{ ret: number; errmsg: string; data: { pack: string } }> }).getFuliStatus();
      
      if (response.ret !== 0) {
        log.debug(`获取福利状态失败: ${response.errmsg}，使用缓存进度`);
        return task.progress;
      }
      
      const data = JSON.parse(response.data.pack);
      const tasks = data.tasks || [];
      
      const currentTask = tasks.find((t: { id: string }) => t.id === task.id);
      
      if (currentTask) {
        return currentTask.progress;
      } else {
        return task.progress;
      }
    } catch (error) {
      log.debug(`获取实时进度失败: ${error instanceof Error ? error.message : String(error)}，使用缓存进度`);
      return task.progress;
    }
  }

  private async getPosts(apiClient: unknown): Promise<Array<{
    postId: string;
    title: string;
    liked: boolean;
  }>> {
    log.debug('获取帖子列表...');
    const response = await (apiClient as { getPosts: () => Promise<{ ret: number; errmsg: string; data: { pack: string } }> }).getPosts();
    
    if (response.ret !== 0) {
      throw new Error(`获取帖子列表失败: ${response.errmsg}`);
    }

    const postsData = JSON.parse(response.data.pack);
    return postsData.posts || [];
  }

  private async tryToggleLike(postId: string, isLike: boolean, apiClient: unknown): Promise<boolean> {
    try {
      const action = isLike ? '点赞' : '取消点赞';
      log.debug(`尝试${action}帖子: ${postId}`);
      
      const response = await (apiClient as { toggleLike: (postId: string, isLike: boolean) => Promise<{ ret: number; errmsg: string; data: { pack?: string } }> }).toggleLike(postId, isLike);
      
      log.debug(`${action}API响应: ret=${response.ret}, errmsg="${response.errmsg}"`);
      
      if (response.ret !== 0) {
        log.debug(`${action}失败: ${response.errmsg}`);
        return false;
      }

      if (response.data && response.data.pack) {
        const resultData = JSON.parse(response.data.pack);
        log.debug(`${action}成功，响应数据: ${JSON.stringify(resultData)}`);
        
        if (resultData.count !== undefined) {
          const count = parseInt(resultData.count);
          log.debug(`当前点赞数: ${count}`);
        }
      }
      
      return true;
    } catch (error) {
      const action = isLike ? '点赞' : '取消点赞';
      log.debug(`${action}异常: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
} 