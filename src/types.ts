// 任务类型枚举 - 值直接对应API返回的字符串
export enum TaskType {
  VIEW_POST = 'view_post_count',
  LIKE_POST = 'like_post_count',
  SHARE_POST = 'share_post_count',
  PUBLISH_POST = 'publish_post_count',
  SIGN_IN = 'sign_in',
  VISIT_MINI = 'visit_mini',
  CREATE_POST = 'create_post_count',
  CREATE_COMMENT = 'create_comment_count',
}

// 任务状态枚举 - 值对应API返回的数字状态
export enum TaskStatus {
  INCOMPLETE = 0,  // 未完成
  COMPLETED = 1,   // 已完成
  CLAIMED = 2,     // 已领奖
}

// 检查字符串是否为有效的任务类型
export function isValidTaskType(type: string): type is TaskType {
  return Object.values(TaskType).includes(type as TaskType);
}

// 将API返回的字符串转换为TaskType（如果有效）
export function parseTaskType(type: string): TaskType | undefined {
  return isValidTaskType(type) ? type as TaskType : undefined;
}

// 获取任务状态描述
export function getTaskStatusDescription(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.INCOMPLETE: return '未完成';
    case TaskStatus.COMPLETED: return '已完成';
    case TaskStatus.CLAIMED: return '已领奖';
    default: return '未知状态';
  }
}

// 任务处理器接口
export interface TaskHandler {
  canHandle(taskType: TaskType): boolean;
  execute(task: Task, context: TaskContext): Promise<void>;
  getProgress(task: Task, apiClient?: unknown): Promise<number>;
}

// 任务上下文
export interface TaskContext {
  apiClient: unknown; // ApiClient实例
  frequencyController: unknown; // FrequencyController实例
}

// 奖励接口
export interface Reward {
  taskId: string;
  scoreA: number;
  scoreB: number;
  status: 'available' | 'claimed' | 'expired';
}

// 扩展Task接口
export interface Task {
  id: string;
  type: TaskType;
  name: string;
  required: number;
  progress: number;
  status: TaskStatus;
  scoreA: number;
  scoreB: number;
}

export interface WeekdayStatus {
  day: number;
  status: number;
  packageId: string;
}

export interface FuliStatusResponse {
  requestID: string;
  ret: number;
  errmsg: string;
  data: {
    extra1: string;
    extra2: string;
    iUin: string;
    pack: string;
    serial: string;
  };
}

export interface FuliStatusData {
  weekdays: WeekdayStatus[];
  tasks: Task[];
}

export interface Media {
  mediaId: string;
  mediaType: number;
  url: string;
  cover?: string;
  platform?: string;
  vid?: string;
}

export interface Post {
  postId: string;
  userId: string;
  forumId: string;
  topicIds: string[];
  title: string;
  summary: string;
  createdAt: string;
  commentCount: string;
  likeCount: string;
  viewCount: string;
  medias: Media[];
  liked: boolean;
  tagIds: string[];
  status: number;
  sectionId: string;
  isRichText: boolean;
}

export interface PostsResponse {
  requestID: string;
  ret: number;
  errmsg: string;
  data: {
    extra1: string;
    extra2: string;
    iUin: string;
    pack: string;
    serial: string;
  };
}

export interface Forum {
  forumId: string;
  title: string;
  authFlag: number;
  sections: Array<{
    sectionId: string;
    title: string;
  }>;
}

export interface User {
  userId: string;
  gender: number;
  authType: number;
  nickname: string;
  avatar: string;
  region: string;
  hasMobile: boolean;
  followed: boolean;
  titleIds: string[];
  status: number;
}

export interface Topic {
  topicId: string;
  title: string;
  authFlag: number;
  priority: number;
  background: string;
  logo: string;
  startAt: string;
  finishAt: string;
  status: number;
  onlyOfficial: boolean;
  postCount: string;
  intro: string;
  showDesignerReplied: boolean;
}

export interface Tag {
  tagId: string;
  name: string;
  color: string;
}

export interface PostsData {
  limit: number;
  posts: Post[];
  forums: Forum[];
  users: User[];
  topics: Topic[];
  total: string;
  lastId: string;
  tags: Tag[];
  reqId: string;
}

export interface LikeResponse {
  requestID: string;
  ret: number;
  errmsg: string;
  data: {
    extra1: string;
    extra2: string;
    iUin: string;
    pack: string;
    serial: string;
  };
}

export interface LikeData {
  count: string;
}

// 签到奖励相关类型
export interface SignAwardResponse {
  requestID: string;
  ret: number;
  errmsg: string;
  data: {
    extra1: string;
    extra2: string;
    iUin: string;
    pack: string;
    serial: string;
  };
}

export interface SignAwardData {
  packageId: string;
}

export interface PackageMapResponse {
  requestID: string;
  ret: number;
  errmsg: string;
  data: {
    extra1: string;
    extra2: string;
    iUin: string;
    pack: string;
    serial: string;
  };
}

export interface PackageInfo {
  title: string;
  image: string;
  offline: boolean;
}

export interface PackageMapData {
  packages: {
    [packageId: string]: PackageInfo;
  };
}

// 任务奖励领取相关类型
export interface TaskScoreResponse {
  requestID: string;
  ret: number;
  errmsg: string;
  data: {
    extra1: string;
    extra2: string;
    iUin: string;
    pack: string;
    serial: string;
  };
}

export interface TaskScoreData {
  taskId: string;
  scoreA: number;
  scoreATotal: number;
  scoreB: number;
  scoreBTotal: number;
}

// 多账号配置相关类型
export interface AccountConfig {
  id: string;           // 账号唯一标识
  name: string;         // 账号名称（可选）
  cookie: string;       // 账号cookie
  schedule: ScheduleConfig; // 执行计划配置
  enabled: boolean;     // 是否启用
}

export interface ScheduleConfig {
  // 每天执行的时间点（24小时制）
  times: string[];      // 例如: ["08:00", "12:00", "18:00"]
  // 执行间隔（分钟），如果设置了times则忽略此配置
  interval?: number;    // 每隔多少分钟执行一次
  // 是否在启动时立即执行一次
  runOnStart?: boolean;
}

export interface MultiAccountConfig {
  accounts: AccountConfig[];
  globalSchedule?: ScheduleConfig; // 全局默认执行计划
  globalUA?: string;
  globalReferer?: string;
  globalMinDelay?: number;
  globalMaxDelay?: number;
}

// 账号执行状态
export interface AccountExecutionStatus {
  accountId: string;
  accountName: string;
  lastExecution?: Date;
  nextExecution?: Date;
  executionCount: number;
  successCount: number;
  errorCount: number;
  lastError?: string;
  isRunning: boolean;
}

// 账号执行结果
export interface AccountExecutionResult {
  accountId: string;
  accountName: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number; // 执行时长（毫秒）
  error?: string;
  stats?: {
    totalTasks: number;
    completedTasks: number;
    availableRewards: number;
    coins: number;
    crystals: number;
  };
} 