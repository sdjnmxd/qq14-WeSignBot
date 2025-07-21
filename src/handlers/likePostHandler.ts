import { TaskHandler, TaskType, Task, TaskContext } from '../types';
import { log } from '../utils/logger';

export class LikePostHandler implements TaskHandler {
  canHandle(taskType: TaskType): boolean {
    return taskType === TaskType.LIKE_POST;
  }

  async execute(task: Task, context: TaskContext): Promise<void> {
    const { apiClient, frequencyController } = context;
    
    log.debug(`开始执行点赞任务: ${task.name}`);
    
    // 获取当前进度
    const currentProgress = await this.getProgress(task, apiClient);
    const remainingCount = task.required - currentProgress;
    
    if (remainingCount <= 0) {
      log.info(`任务 ${task.name} 已完成`);
      return;
    }

    log.info(`需要点赞 ${remainingCount} 次`);
    
    // 获取足够的帖子列表（支持分页）
    const posts = await this.getAllAvailablePosts(apiClient, remainingCount);
    if (!posts || posts.length === 0) {
      log.warn('没有可用的帖子');
      return;
    }

    log.debug(`获取到 ${posts.length} 个帖子`);
    
    // 筛选未点赞和已点赞的帖子
    const unlikedPosts = posts.filter(post => !post.liked);
    const likedPosts = posts.filter(post => post.liked);
    log.debug(`其中 ${unlikedPosts.length} 个帖子未点赞，${likedPosts.length} 个已点赞`);
    
    let likedCount = 0;
    
    // 策略1: 优先点赞未点赞的帖子
    if (unlikedPosts.length > 0) {
      log.info(`🔄 策略1: 点赞未点赞的帖子 (${Math.min(unlikedPosts.length, remainingCount)} 个)`);
      
      let postIndex = 0;
      
      while (likedCount < remainingCount && postIndex < unlikedPosts.length) {
        const post = unlikedPosts[postIndex];
        log.debug(`检查帖子 ${postIndex + 1}/${unlikedPosts.length}: ${post.title}`);
        
        try {
          // 记录操作前的进度
          const progressBefore = await this.getProgress(task, apiClient);
          
          // 尝试点赞这个帖子
          const isLiked = await this.tryLikePost(post.postId, apiClient);
          
          if (isLiked) {
            // 等待并检查进度是否有变化
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const progressAfter = await this.getProgress(task, apiClient);
            
            if (progressAfter > progressBefore) {
              likedCount++;
              log.progress(likedCount, remainingCount, `点赞成功 - ${post.title}`);
            } else {
              log.debug(`点赞API成功但进度未更新: ${post.title}`);
            }
          } else {
            log.debug(`点赞失败，跳过: ${post.title}`);
          }
          
          await frequencyController.randomDelay();
          
        } catch (error) {
          log.debug(`点赞帖子失败，跳过: ${post.title}`);
        }
        
        postIndex++;
      }
      
      log.info(`策略1完成: ${likedCount}/${remainingCount} 次点赞`);
    }
    
    // 如果策略1没有完成任务，使用策略2: 取消点赞再重新点赞
    if (likedCount < remainingCount && likedPosts.length > 0) {
      const remainingAfterStrategy1 = remainingCount - likedCount;
      log.info(`🔄 策略2: 取消点赞再重新点赞 (还需要 ${remainingAfterStrategy1} 次)`);
      log.info(`💡 利用已点赞的帖子来完成剩余任务`);
      
      let postIndex = 0;
      
      while (likedCount < remainingCount && postIndex < likedPosts.length) {
        const post = likedPosts[postIndex];
        log.progress(postIndex + 1, Math.min(remainingAfterStrategy1, likedPosts.length), post.title);
        
        try {
          // 记录操作前的进度
          const progressBefore = await this.getProgress(task, apiClient);
          
          // 取消点赞
          const isUnliked = await this.tryUnlikePost(post.postId, apiClient);
          if (!isUnliked) {
            log.debug(`取消点赞失败，跳过: ${post.title}`);
            postIndex++;
            continue;
          }
          
          // 等待一下
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 重新点赞
          const isLiked = await this.tryLikePost(post.postId, apiClient);
          if (!isLiked) {
            log.debug(`重新点赞失败，跳过: ${post.title}`);
            postIndex++;
            continue;
          }
          
          // 等待并检查进度是否有变化
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const progressAfter = await this.getProgress(task, apiClient);
          
          if (progressAfter > progressBefore) {
            likedCount++;
            log.debug(`✅ 取消重新点赞成功，进度更新: ${progressBefore} -> ${progressAfter}`);
          } else {
            log.warn(`⚠️  进度未变化: ${progressBefore} -> ${progressAfter}`);
          }
          
          await frequencyController.randomDelay();
          
        } catch (error) {
          log.debug(`取消重新点赞失败，跳过: ${post.title}`);
        }
        
        postIndex++;
      }
      
      log.info(`策略2完成: 总共 ${likedCount - (remainingCount - remainingAfterStrategy1)}/${remainingAfterStrategy1} 次点赞`);
    }
    
    // 最终结果
    if (likedCount >= remainingCount) {
      log.success(`✅ 点赞任务完成! 总共完成 ${likedCount}/${remainingCount} 次`);
    } else {
      log.warn(`只完成了 ${likedCount}/${remainingCount} 次点赞`);
    }
    
    // 统计信息
    log.info(`📊 统计: 总帖子${posts.length}个，已点赞${likedPosts.length}个，未点赞${unlikedPosts.length}个`);
    
    if (likedPosts.length === posts.length && likedCount < remainingCount) {
      log.info(`💡 所有帖子都已点赞，已自动使用"取消点赞再重新点赞"策略`);
      if (likedCount < remainingCount) {
        log.warn(`⚠️  取消重新点赞策略未能完成任务，可能需要等待新帖子发布或获取更多页面的帖子`);
      }
    }
  }

  async getProgress(task: Task, apiClient?: any): Promise<number> {
    if (!apiClient) {
      // 如果没有apiClient，返回任务中的progress字段
      return task.progress;
    }
    
    try {
      // 通过API获取最新的任务状态
      const response = await apiClient.getFuliStatus();
      
      if (response.ret !== 0) {
        log.debug(`获取福利状态失败: ${response.errmsg}，使用缓存进度`);
        return task.progress;
      }
      
      const data = JSON.parse(response.data.pack);
      const tasks = data.tasks || [];
      
      // 查找对应的任务
      const currentTask = tasks.find((t: any) => t.id === task.id);
      
      if (currentTask) {
        log.debug(`获取到实时进度: ${currentTask.progress}/${currentTask.required}`);
        return currentTask.progress;
      } else {
        log.debug(`未找到任务ID ${task.id}，使用缓存进度`);
        return task.progress;
      }
    } catch (error) {
      log.debug(`获取实时进度失败: ${error instanceof Error ? error.message : String(error)}，使用缓存进度`);
      return task.progress;
    }
  }

  private async getAllAvailablePosts(apiClient: any, needCount: number): Promise<any[]> {
    log.debug(`获取帖子列表，至少需要 ${needCount} 个可操作的帖子...`);
    
    let allPosts: any[] = [];
    let lastId: string | undefined = undefined;
    let pageNum = 1;
    const maxPages = 15; // 增加最大页数，确保有足够的帖子可供操作
    
    while (pageNum <= maxPages) {
      log.debug(`获取第 ${pageNum} 页帖子${lastId ? ` (lastId: ${lastId})` : ''}...`);
      
      const response = await apiClient.getPosts(lastId);
      
      if (response.ret !== 0) {
        log.warn(`获取第 ${pageNum} 页帖子失败: ${response.errmsg}`);
        break;
      }

      // 解析帖子数据
      const postsData = JSON.parse(response.data.pack);
      const posts = postsData.posts || [];
      
      if (posts.length === 0) {
        log.debug(`第 ${pageNum} 页没有更多帖子，停止获取`);
        break;
      }
      
      allPosts = allPosts.concat(posts);
      log.debug(`第 ${pageNum} 页获取到 ${posts.length} 个帖子，累计 ${allPosts.length} 个`);
      
      // 检查是否有下一页
      if (!postsData.lastId) {
        log.debug('没有更多页面，停止获取');
        break;
      }
      
      // 检查是否已经有足够的帖子
      const currentUnlikedCount = allPosts.filter(post => !post.liked).length;
      const currentLikedCount = allPosts.filter(post => post.liked).length;
      
      if (currentUnlikedCount >= needCount) {
        log.debug(`已获取足够的未点赞帖子 (${currentUnlikedCount} >= ${needCount})，停止获取更多页面`);
        break;
      } else if (currentUnlikedCount + currentLikedCount >= needCount * 5) {
        // 增加比例，确保有足够的帖子用于策略2
        log.debug(`已获取足够的帖子用于两种策略 (${allPosts.length} >= ${needCount * 5})，停止获取更多页面`);
        break;
      }
      
      lastId = postsData.lastId;
      pageNum++;
      
      // 添加小延迟避免请求过快
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    log.info(`📄 共获取 ${pageNum - 1} 页，总计 ${allPosts.length} 个帖子`);
    return allPosts;
  }

  private async getPosts(apiClient: any): Promise<any[]> {
    // 保持向后兼容，但现在推荐使用 getAllAvailablePosts
    log.debug('获取帖子列表...');
    const response = await apiClient.getPosts();
    
    if (response.ret !== 0) {
      throw new Error(`获取帖子列表失败: ${response.errmsg}`);
    }

    // 解析帖子数据
    const postsData = JSON.parse(response.data.pack);
    const posts = postsData.posts || [];
    
    return posts;
  }

  private async tryLikePost(postId: string, apiClient: any): Promise<boolean> {
    try {
      // 尝试点赞帖子
      log.debug(`尝试点赞帖子: ${postId}`);
      const response = await apiClient.toggleLike(postId, true);
      
      log.debug(`点赞API响应: ret=${response.ret}, errmsg="${response.errmsg}"`);
      
      if (response.ret !== 0) {
        // 如果返回错误，可能是已经点赞过了
        log.debug(`点赞失败: ${response.errmsg}`);
        return false;
      }

      // 解析点赞结果
      if (response.data && response.data.pack) {
        const likeData = JSON.parse(response.data.pack);
        log.debug(`点赞成功，响应数据: ${JSON.stringify(likeData)}`);
        
        // 检查点赞计数
        if (likeData.count !== undefined) {
          const count = parseInt(likeData.count);
          log.debug(`当前点赞数: ${count}`);
        }
      }
      
      return true;
    } catch (error) {
      // 如果发生错误，点赞失败
      log.debug(`点赞异常: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  private async tryUnlikePost(postId: string, apiClient: any): Promise<boolean> {
    try {
      log.debug(`尝试取消点赞帖子: ${postId}`);
      const response = await apiClient.toggleLike(postId, false);
      
      log.debug(`取消点赞API响应: ret=${response.ret}, errmsg="${response.errmsg}"`);
      
      if (response.ret !== 0) {
        log.debug(`取消点赞失败: ${response.errmsg}`);
        return false;
      }

      if (response.data && response.data.pack) {
        const resultData = JSON.parse(response.data.pack);
        log.debug(`取消点赞成功，响应数据: ${JSON.stringify(resultData)}`);
        
        if (resultData.count !== undefined) {
          const count = parseInt(resultData.count);
          log.debug(`当前点赞数: ${count}`);
        }
      }
      
      return true;
    } catch (error) {
      log.debug(`取消点赞异常: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
} 