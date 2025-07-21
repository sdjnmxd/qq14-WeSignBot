# 获取帖子详情接口

## 接口信息

- **接口地址**: `https://minigame.guangzi.qq.com/starweb/7tn8putvbu_p`
- **请求方法**: POST
- **接口类型**: 获取帖子详情

## 请求头

```
Host: minigame.guangzi.qq.com
Connection: keep-alive
Content-Length: 50
xweb_xhr: 1
cookie: openid=YOUR_OPENID_HERE; acctype=qc; appid=YOUR_APPID_HERE; access_token=YOUR_ACCESS_TOKEN_HERE
User-Agent: mock-user-agent
Content-Type: application/json
Accept: */*
Sec-Fetch-Site: cross-site
Sec-Fetch-Mode: cors
Sec-Fetch-Dest: empty
Referer: https://mock-referer.example.com/
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9
```

## 请求体

```json
{
  "r": "GetPostDetail",
  "d": "{\"postId\":\"mock_post_id_002\"}"
}
```

### 请求体字段解析

- `r`: 请求类型，固定值为"GetPostDetail"，表示获取帖子详情
- `d`: 请求数据，JSON字符串格式
  - `postId`: 帖子ID，用于指定要获取详情的帖子

## 响应头

```
HTTP/1.1 200
Date: Tue, 15 Jul 2025 08:11:55 GMT
Content-Type: application/json; charset=utf-8
Connection: keep-alive
Server: nginx
X-Envoy-Upstream-Service-Time: 73
X-Request-Id: mock-request-id-123456789
Content-Encoding: gzip
Vary: Accept-Encoding
Content-Length: 1369
```

## 响应体

```json
{
  "requestID": "mock_request_id_123456789",
  "ret": 0,
  "errmsg": "",
  "data": {
    "extra1": "",
    "extra2": "",
    "iUin": "mock_user_id_123456789",
    "pack": "{\"post\":{\"postId\":\"mock_post_id_002\",\"author\":{\"userId\":\"mock_user_id_001\",\"gender\":0,\"authType\":4,\"nickname\":\"mock_user_nickname\",\"avatar\":\"\",\"region\":\"mock_region\",\"hasMobile\":true,\"followed\":false,\"titleIds\":[],\"status\":0},\"forum\":{\"forumId\":\"6\",\"title\":\"流沙屋\",\"authFlag\":60,\"sections\":[{\"sectionId\":\"5\",\"title\":\"交流\"},{\"sectionId\":\"6\",\"title\":\"灌水\"},{\"sectionId\":\"7\",\"title\":\"互助\"}]},\"topics\":[{\"topicId\":\"4\",\"title\":\"官方\",\"authFlag\":60,\"priority\":0,\"background\":\"\",\"logo\":\"\",\"startAt\":\"0\",\"finishAt\":\"0\",\"status\":0,\"onlyOfficial\":false,\"postCount\":\"655\",\"intro\":\"\",\"showDesignerReplied\":false},{\"topicId\":\"11\",\"title\":\"ff14手游\",\"authFlag\":60,\"priority\":0,\"background\":\"\",\"logo\":\"\",\"startAt\":\"0\",\"finishAt\":\"0\",\"status\":0,\"onlyOfficial\":false,\"postCount\":\"451\",\"intro\":\"\",\"showDesignerReplied\":false},{\"topicId\":\"18\",\"title\":\"吟游诗人\",\"authFlag\":60,\"priority\":0,\"background\":\"\",\"logo\":\"\",\"startAt\":\"0\",\"finishAt\":\"0\",\"status\":0,\"onlyOfficial\":false,\"postCount\":\"35\",\"intro\":\"\",\"showDesignerReplied\":false}],\"title\":\"测试帖子标题\",\"summary\":\"这是一个测试帖子的摘要内容\",\"createdAt\":\"1700000003000\",\"commentCount\":\"9\",\"likeCount\":\"78\",\"viewCount\":\"434\",\"medias\":[{\"mediaId\":\"mock_media_001\",\"mediaType\":1,\"url\":\"https://example.com/test_image.jpg\",\"cover\":\"\",\"platform\":\"\",\"vid\":\"\"}],\"liked\":false,\"content\":\"这是一个测试帖子的内容，用于演示接口功能。\",\"tags\":[],\"status\":1,\"section\":{\"sectionId\":\"5\",\"title\":\"交流\"},\"modifier\":\"\",\"modifiedAt\":\"0\",\"isRichText\":false}}",
    "serial": "mock_serial_123456789"
  }
}
```

### 响应体字段解析

- `requestID`: 请求唯一标识符
- `ret`: 返回码，0表示成功
- `errmsg`: 错误信息，成功时为空
- `data`: 响应数据
  - `extra1`, `extra2`: 额外信息字段，当前为空
  - `iUin`: 用户内部标识
  - `pack`: 包含帖子详细数据的JSON字符串，需要二次解析
  - `serial`: 会话序列号

### pack字段详细解析

pack字段包含帖子详细信息：

#### post（帖子详情）
- `postId`: 帖子ID
- `title`: 帖子标题
- `summary`: 帖子摘要
- `content`: 帖子完整内容
- `createdAt`: 创建时间戳
- `commentCount`: 评论数
- `likeCount`: 点赞数
- `viewCount`: 浏览数
- `liked`: 当前用户是否已点赞
- `status`: 帖子状态
- `isRichText`: 是否为富文本

#### author（作者信息）
- `userId`: 用户ID
- `nickname`: 用户昵称
- `avatar`: 头像URL
- `region`: 地区
- `authType`: 认证类型
- `hasMobile`: 是否绑定手机
- `followed`: 是否已关注
- `titleIds`: 头衔ID列表

#### forum（论坛信息）
- `forumId`: 论坛ID
- `title`: 论坛标题
- `authFlag`: 权限标识
- `sections`: 论坛分区列表

#### topics（话题列表）
- `topicId`: 话题ID
- `title`: 话题标题
- `authFlag`: 权限标识
- `postCount`: 帖子数量

#### medias（媒体文件）
- `mediaId`: 媒体ID
- `mediaType`: 媒体类型（1为图片，2为视频）
- `url`: 媒体文件URL
- `cover`: 封面URL

#### section（分区信息）
- `sectionId`: 分区ID
- `title`: 分区标题

## 接口作用

此接口用于获取指定帖子的详细信息，包括帖子内容、作者信息、论坛分类、话题标签、媒体文件等完整数据，主要用于帖子详情页面的展示。

## 在签到流程中的位置

此接口与签到流程**无直接关系**，属于社区功能模块，用于展示帖子详情内容。

## 注意事项

- 此接口需要传入具体的 `postId` 参数
- `pack` 字段是JSON字符串，需要二次解析才能获取具体数据
- 接口包含用户隐私信息（昵称、头像等），需要妥善处理
- 此接口主要用于社区功能，不是签到流程的必要步骤 