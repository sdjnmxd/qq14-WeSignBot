# 获取社区帖子列表接口

## 接口信息

- **接口地址**: `https://minigame.guangzi.qq.com/starweb/7tn8putvbu_p`
- **请求方法**: POST
- **接口类型**: 获取社区帖子列表（官方帖子）

## 请求头

```
Host: minigame.guangzi.qq.com
Connection: keep-alive
Content-Length: 57
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
  "r": "ListPost",
  "d": "{\"forumId\":\"8\",\"listType\":1}"
}
```

### 请求体字段解析

- `r`: 请求类型，固定值为"ListPost"，表示获取帖子列表
- `d`: 请求数据，JSON字符串格式
  - `forumId`: 论坛ID，固定值为"8"，表示官方论坛
  - `listType`: 列表类型，固定值为1，表示只看官方帖子

## 响应头

```
HTTP/1.1 200
Date: Tue, 15 Jul 2025 07:12:40 GMT
Content-Type: application/json; charset=utf-8
Connection: keep-alive
Server: nginx
X-Envoy-Upstream-Service-Time: 105
X-Request-Id: mock-request-id-123456789
Content-Encoding: gzip
Vary: Accept-Encoding
Content-Length: 3685
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
    "pack": "{\"limit\":10,\"posts\":[...],\"forums\":[...],\"users\":[...],\"topics\":[...],\"total\":\"10\",\"lastId\":\"mock_last_id_123\",\"tags\":[],\"reqId\":\"mock_req_id_123456789\"}",
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
  - `pack`: 包含社区数据的JSON字符串，需要二次解析
  - `serial`: 会话序列号

### pack字段详细解析

pack字段包含以下数据结构：

#### posts（帖子列表）
- `postId`: 帖子ID
- `userId`: 发帖用户ID
- `forumId`: 论坛ID
- `topicIds`: 话题ID列表
- `title`: 帖子标题
- `summary`: 帖子摘要
- `createdAt`: 创建时间戳
- `commentCount`: 评论数
- `likeCount`: 点赞数
- `viewCount`: 浏览数
- `medias`: 媒体文件列表
- `liked`: 是否已点赞
- `tagIds`: 标签ID列表
- `status`: 帖子状态
- `sectionId`: 分区ID
- `isRichText`: 是否为富文本

#### forums（论坛列表）
- `forumId`: 论坛ID
- `title`: 论坛标题
- `authFlag`: 权限标识

#### users（用户列表）
- `userId`: 用户ID
- `nickname`: 用户昵称
- `avatar`: 头像URL
- `region`: 地区
- `authType`: 认证类型
- `gender`: 性别
- `hasMobile`: 是否绑定手机
- `followed`: 是否已关注
- `titleIds`: 头衔ID列表
- `status`: 用户状态

#### topics（话题列表）
- `topicId`: 话题ID
- `title`: 话题标题
- `authFlag`: 权限标识
- `priority`: 优先级
- `background`: 背景图片
- `logo`: 话题图标
- `startAt`: 开始时间
- `finishAt`: 结束时间
- `status`: 话题状态
- `onlyOfficial`: 是否仅官方
- `postCount`: 帖子数量
- `intro`: 话题介绍
- `showDesignerReplied`: 是否显示设计师回复

## 接口作用

此接口用于获取官方论坛的帖子列表，通过 `listType: 1` 参数过滤只显示官方发布的帖子，包括官方活动、官方公告、官方资讯等内容。

## 在签到流程中的位置

此接口用于完成"浏览帖子"任务，通过查看官方帖子来获得积分奖励。

## 注意事项

- 此接口专门用于获取官方帖子，避免查看用户UGC内容
- `pack` 字段是JSON字符串，需要二次解析才能获取具体数据
- 接口包含用户隐私信息（昵称、头像等），需要妥善处理
- 官方帖子通常包含活动公告、游戏更新等重要信息 