import { FuliStatusResponse, PostsResponse } from '../../types';

/**
 * 测试用的Mock数据
 * 这些数据用于模拟API响应，确保测试的一致性和可预测性
 */

// 基础福利状态响应
export const mockFuliStatusResponse: FuliStatusResponse = {
  requestID: "mock_request_id_123456789",
  ret: 0,
  errmsg: "",
  data: {
    extra1: "",
    extra2: "",
    iUin: "mock_user_id_123456789",
    pack: JSON.stringify({
      weekdays: [
        { day: 1, status: 1, packageId: "mock_package_001" },
        { day: 2, status: 0, packageId: "mock_package_002" },
        { day: 3, status: 0, packageId: "mock_package_003" },
        { day: 4, status: 0, packageId: "mock_package_004" },
        { day: 5, status: 0, packageId: "mock_package_005" },
        { day: 6, status: 0, packageId: "mock_package_006" },
        { day: 7, status: 0, packageId: "mock_package_007" }
      ],
      tasks: [
        {
          id: "1",
          type: "visit_mini",
          name: "访问社区小程序",
          required: 1,
          progress: 1,
          status: 1,
          scoreA: 10,
          scoreB: 0
        },
        {
          id: "2",
          type: "view_post_count",
          name: "查看1个帖子",
          required: 1,
          progress: 0,
          status: 0,
          scoreA: 10,
          scoreB: 0
        },
        {
          id: "3",
          type: "view_post_count",
          name: "查看3个帖子",
          required: 3,
          progress: 1,
          status: 0,
          scoreA: 10,
          scoreB: 0
        },
        {
          id: "4",
          type: "view_post_count",
          name: "查看5个帖子",
          required: 5,
          progress: 0,
          status: 0,
          scoreA: 20,
          scoreB: 0
        },
        {
          id: "9",
          type: "view_post_count",
          name: "查看10个帖子",
          required: 10,
          progress: 0,
          status: 0,
          scoreA: 0,
          scoreB: 1
        }
      ]
    }),
    serial: "mock_serial_123456789"
  }
};

// 帖子列表响应
export const mockPostsResponse: PostsResponse = {
  requestID: "mock_request_id_987654321",
  ret: 0,
  errmsg: "",
  data: {
    extra1: "",
    extra2: "",
    iUin: "mock_user_id_123456789",
    pack: JSON.stringify({
      limit: 10,
      posts: [
        {
          postId: "mock_post_001",
          userId: "mock_user_001",
          forumId: "8",
          topicIds: ["4", "5"],
          title: "【测试话题】这是一个测试帖子的标题",
          summary: "这是一个测试帖子的摘要内容",
          createdAt: "1700000000000",
          commentCount: "42",
          likeCount: "107",
          viewCount: "0",
          medias: [],
          liked: false,
          tagIds: [],
          status: 1,
          sectionId: "3",
          isRichText: true
        },
        {
          postId: "mock_post_002",
          userId: "mock_user_002",
          forumId: "8",
          topicIds: ["4", "6"],
          title: "【测试公告】这是一个测试公告的标题",
          summary: "这是一个测试公告的摘要内容",
          createdAt: "1700000001000",
          commentCount: "244",
          likeCount: "2305",
          viewCount: "0",
          medias: [],
          liked: false,
          tagIds: [],
          status: 1,
          sectionId: "4",
          isRichText: true
        },
        {
          postId: "mock_post_003",
          userId: "mock_user_003",
          forumId: "8",
          topicIds: ["4", "6"],
          title: "【测试内容】这是另一个测试帖子的标题",
          summary: "这是另一个测试帖子的摘要内容",
          createdAt: "1700000002000",
          commentCount: "236",
          likeCount: "2615",
          viewCount: "0",
          medias: [],
          liked: false,
          tagIds: [],
          status: 1,
          sectionId: "4",
          isRichText: true
        }
      ],
      forums: [
        {
          forumId: "8",
          title: "官方",
          authFlag: 32,
          sections: []
        }
      ],
      users: [
        {
          userId: "mock_user_001",
          gender: 0,
          authType: 32,
          nickname: "测试用户1",
          avatar: "https://example.com/avatar1.jpg",
          region: "测试地区",
          hasMobile: true,
          followed: false,
          titleIds: ["3"],
          status: 0
        },
        {
          userId: "mock_user_002",
          gender: 0,
          authType: 32,
          nickname: "测试用户2",
          avatar: "https://example.com/avatar2.jpg",
          region: "测试地区",
          hasMobile: true,
          followed: false,
          titleIds: ["3"],
          status: 0
        }
      ],
      topics: [
        {
          topicId: "4",
          title: "官方",
          authFlag: 60,
          priority: 0,
          background: "",
          logo: "",
          startAt: "0",
          finishAt: "0",
          status: 0,
          onlyOfficial: false,
          postCount: "656",
          intro: "",
          showDesignerReplied: false
        },
        {
          topicId: "5",
          title: "官方活动",
          authFlag: 32,
          priority: 88,
          background: "https://example.com/background.png",
          logo: "https://example.com/logo.png",
          startAt: "0",
          finishAt: "0",
          status: 0,
          onlyOfficial: true,
          postCount: "19",
          intro: "",
          showDesignerReplied: false
        },
        {
          topicId: "6",
          title: "官方公告",
          authFlag: 32,
          priority: 0,
          background: "",
          logo: "",
          startAt: "0",
          finishAt: "0",
          status: 0,
          onlyOfficial: true,
          postCount: "29",
          intro: "",
          showDesignerReplied: false
        }
      ],
      total: "128",
      lastId: "mock_last_id_123",
      tags: []
    }),
    serial: "mock_serial_987654321"
  }
};

// 帖子详情响应
export const mockPostDetailResponse = {
  requestID: "mock_request_id_detail_123",
  ret: 0,
  errmsg: "",
  data: {
    extra1: "",
    extra2: "",
    iUin: "mock_user_id_123456789",
    pack: JSON.stringify({
      post: {
        postId: "mock_post_detail_001",
        title: "测试帖子详情",
        summary: "测试帖子详情摘要",
        content: "这是测试帖子的详细内容",
        createdAt: "1700000003000",
        commentCount: "5",
        likeCount: "10",
        viewCount: "100",
        medias: [],
        liked: false,
        status: 1
      }
    }),
    serial: "mock_serial_detail_123"
  }
};

// 点赞响应
export const mockLikeResponse = {
  requestID: "mock_request_id_like_123",
  ret: 0,
  errmsg: "",
  data: {
    extra1: "",
    extra2: "",
    iUin: "mock_user_id_123456789",
    pack: JSON.stringify({
      count: "110"
    }),
    serial: "mock_serial_like_123"
  }
};

// 更新后的福利状态响应（任务进度更新）
export const mockUpdatedFuliStatusResponse: FuliStatusResponse = {
  ...mockFuliStatusResponse,
  data: {
    ...mockFuliStatusResponse.data,
    pack: JSON.stringify({
      weekdays: mockFuliStatusResponse.data.pack ? JSON.parse(mockFuliStatusResponse.data.pack).weekdays : [],
      tasks: [
        {
          id: "1",
          type: "visit_mini",
          name: "访问社区小程序",
          required: 1,
          progress: 1,
          status: 1,
          scoreA: 10,
          scoreB: 0
        },
        {
          id: "2",
          type: "view_post_count",
          name: "查看1个帖子",
          required: 1,
          progress: 1,
          status: 1,
          scoreA: 10,
          scoreB: 0
        },
        {
          id: "3",
          type: "view_post_count",
          name: "查看3个帖子",
          required: 3,
          progress: 3,
          status: 1,
          scoreA: 10,
          scoreB: 0
        },
        {
          id: "4",
          type: "view_post_count",
          name: "查看5个帖子",
          required: 5,
          progress: 3,
          status: 0,
          scoreA: 20,
          scoreB: 0
        },
        {
          id: "9",
          type: "view_post_count",
          name: "查看10个帖子",
          required: 10,
          progress: 3,
          status: 0,
          scoreA: 0,
          scoreB: 1
        }
      ]
    })
  }
};

/**
 * 测试数据构建器 - 方便在测试中创建特定场景的数据
 */
export class MockDataBuilder {
  static createTaskResponse(tasks: Array<{
    id: string;
    type: string;
    name?: string;
    required: number;
    progress: number;
    status: number;
    scoreA?: number;
    scoreB?: number;
  }>) {
    return {
      ret: 0,
      errmsg: '',
      data: {
        pack: JSON.stringify({ tasks })
      }
    };
  }

  static createPostsResponse(posts: Array<{
    postId: string;
    title: string;
    liked: boolean;
  }>) {
    return {
      ret: 0,
      errmsg: '',
      data: {
        pack: JSON.stringify({ posts })
      }
    };
  }

  static createErrorResponse(errorCode: number, errorMessage: string) {
    return {
      ret: errorCode,
      errmsg: errorMessage,
      data: {}
    };
  }

  static createSuccessResponse(data: Record<string, unknown> = {}) {
    return {
      ret: 0,
      errmsg: '',
      data: {
        pack: JSON.stringify(data)
      }
    };
  }
}

// 常用的测试场景数据
export const testScenarios = {
  // 完全新用户（所有任务未完成）
  newUser: MockDataBuilder.createTaskResponse([
    { id: '1', type: 'view_post_count', required: 1, progress: 0, status: 0 },
    { id: '2', type: 'view_post_count', required: 3, progress: 0, status: 0 },
    { id: '3', type: 'like_post', required: 5, progress: 0, status: 0 }
  ]),

  // 部分完成的用户
  partialComplete: MockDataBuilder.createTaskResponse([
    { id: '1', type: 'view_post_count', required: 1, progress: 1, status: 1 },
    { id: '2', type: 'view_post_count', required: 3, progress: 2, status: 0 },
    { id: '3', type: 'like_post', required: 5, progress: 0, status: 0 }
  ]),

  // 所有任务完成
  allComplete: MockDataBuilder.createTaskResponse([
    { id: '1', type: 'view_post_count', required: 1, progress: 1, status: 1 },
    { id: '2', type: 'view_post_count', required: 3, progress: 3, status: 1 },
    { id: '3', type: 'like_post', required: 5, progress: 5, status: 1 }
  ]),

  // 有可点赞帖子
  postsWithUnliked: MockDataBuilder.createPostsResponse([
    { postId: 'p1', title: '帖子1', liked: false },
    { postId: 'p2', title: '帖子2', liked: false },
    { postId: 'p3', title: '帖子3', liked: true }
  ]),

  // 所有帖子已点赞
  postsAllLiked: MockDataBuilder.createPostsResponse([
    { postId: 'p1', title: '帖子1', liked: true },
    { postId: 'p2', title: '帖子2', liked: true },
    { postId: 'p3', title: '帖子3', liked: true }
  ])
}; 