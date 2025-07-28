import { TaskHandler, TaskType, Task, TaskContext } from '../types';
import { log } from '../utils/logger';

export class ViewPostHandler implements TaskHandler {
  canHandle(taskType: TaskType): boolean {
    return taskType === TaskType.VIEW_POST;
  }

  async execute(task: Task, context: TaskContext): Promise<void> {
    const { apiClient, frequencyController } = context;
    
    log.debug(`开始执行查看帖子任务: ${task.name}`);
    
    // 获取当前进度
    const currentProgress = await this.getProgress(task, apiClient);
    const remainingCount = task.required - currentProgress;
    
    if (remainingCount <= 0) {
      log.info(`任务 ${task.name} 已完成`);
      return;
    }

    log.info(`需要查看 ${remainingCount} 个帖子`);
    
    // 获取足够的帖子列表（支持分页）
    const posts = await this.getAllAvailablePosts(apiClient, remainingCount);
    if (!posts || posts.length === 0) {
      log.warn('没有可用的帖子');
      return;
    }

    // 选择要查看的帖子数量
    const postsToView = Math.min(remainingCount, posts.length);
    log.info(`准备查看 ${postsToView} 个帖子 (总共获取到 ${posts.length} 个)`);
    
    // 逐个查看帖子
    for (let i = 0; i < postsToView; i++) {
      const post = posts[i];
      log.progress(i + 1, postsToView, post.title);
      
      await this.viewPost(post.postId, apiClient);
      await frequencyController.randomDelay();
    }
    
    log.success(`查看帖子任务完成`);
    
    // 操作完成后等待一下，然后验证最终进度
    if (postsToView > 0) {
      log.debug('等待服务器更新任务进度...');
      await frequencyController.randomDelay();
      
      const finalProgress = await this.getProgress(task, apiClient);
      log.debug(`任务最终进度: ${finalProgress}/${task.required}`);
      
      if (finalProgress >= task.required) {
        log.success(`✅ 任务"${task.name}"已达到目标进度!`);
      } else if (finalProgress > currentProgress) {
        log.info(`📈 任务进度已更新: ${currentProgress} -> ${finalProgress}/${task.required}`);
      } else {
        log.warn(`⚠️  任务进度未更新，可能存在延迟或其他问题`);
      }
    }
  }

  async getProgress(task: Task, apiClient?: unknown): Promise<number> {
    if (!apiClient) {
      // 如果没有apiClient，返回任务中的progress字段
      return task.progress;
    }
    
    try {
      // 通过API获取最新的任务状态
      const response = await (apiClient as { getFuliStatus: () => Promise<{ ret: number; errmsg: string; data: { pack: string } }> }).getFuliStatus();
      
      if (response.ret !== 0) {
        log.debug(`获取福利状态失败: ${response.errmsg}，使用缓存进度`);
        return task.progress;
      }
      
      const data = JSON.parse(response.data.pack);
      const tasks = data.tasks || [];
      
      // 查找对应的任务
      const currentTask = tasks.find((t: { id: string }) => t.id === task.id);
      
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

  private async getAllAvailablePosts(apiClient: unknown, needCount: number): Promise<Array<{
    postId: string;
    title: string;
    liked: boolean;
  }>> {
    log.debug(`获取帖子列表，需要 ${needCount} 个帖子...`);
    
    let allPosts: Array<{
      postId: string;
      title: string;
      liked: boolean;
    }> = [];
    let lastId: string | undefined = undefined;
    let pageNum = 1;
    const maxPages = 5; // 查看帖子通常不需要太多页面
    
    while (pageNum <= maxPages && allPosts.length < needCount) {
      log.debug(`获取第 ${pageNum} 页帖子${lastId ? ` (lastId: ${lastId})` : ''}...`);
      
      const response = await (apiClient as { getPosts: (lastId?: string) => Promise<{ ret: number; errmsg: string; data: { pack: string } }> }).getPosts(lastId);
      
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
      
      // 如果已经有足够的帖子，就停止获取
      if (allPosts.length >= needCount) {
        log.debug(`已获取足够的帖子 (${allPosts.length} >= ${needCount})，停止获取更多页面`);
        break;
      }
      
      lastId = postsData.lastId;
      pageNum++;
      
      // 添加小延迟避免请求过快
      // await frequencyController.randomDelay();
    }
    
    log.info(`📄 共获取 ${pageNum - 1} 页，总计 ${allPosts.length} 个帖子`);
    return allPosts;
  }

  private async getPosts(apiClient: unknown): Promise<Array<{
    postId: string;
    title: string;
    liked: boolean;
  }>> {
    // 保持向后兼容，但现在推荐使用 getAllAvailablePosts
    log.debug('获取帖子列表...');
    const response = await (apiClient as { getPosts: () => Promise<{ ret: number; errmsg: string; data: { pack: string } }> }).getPosts();
    
    if (response.ret !== 0) {
      throw new Error(`获取帖子列表失败: ${response.errmsg}`);
    }

    // 解析帖子数据
    const postsData = JSON.parse(response.data.pack);
    return postsData.posts || [];
  }

  private async viewPost(postId: string, apiClient: unknown): Promise<void> {
    log.debug(`查看帖子: ${postId}`);
    
    const response = await (apiClient as { viewPost: (postId: string) => Promise<{ ret: number; errmsg: string; data: { pack?: string } }> }).viewPost(postId);
    
    if (response.ret !== 0) {
      throw new Error(`查看帖子失败: ${response.errmsg}`);
    }
  }
} 