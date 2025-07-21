# 获取福利状态接口

## 接口基本信息
- **接口地址**: `https://minigame.guangzi.qq.com/starweb/7tn8putvbu_p`
- **请求方法**: POST
- **接口功能**: 获取用户的福利签到状态和任务进度
- **接口参数**: `r=FuliStatus`

## 请求信息

### 请求头
```http
Host: minigame.guangzi.qq.com
Connection: keep-alive
Content-Length: 18
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

### 请求体
```json
{
  "r": "FuliStatus"
}
```

## 响应信息

### 响应头
```http
HTTP/1.1 200
Date: Tue, 15 Jul 2025 07:13:02 GMT
Content-Type: application/json; charset=utf-8
Connection: keep-alive
Server: nginx
X-Envoy-Upstream-Service-Time: 66
X-Request-Id: mock-request-id-123456789
Content-Encoding: gzip
Vary: Accept-Encoding
Content-Length: 593
```

### 响应体
```json
{
  "requestID": "mock_request_id_123456789",
  "ret": 0,
  "errmsg": "",
  "data": {
    "extra1": "",
    "extra2": "",
    "iUin": "mock_user_id_123456789",
    "pack": "{\"weekdays\":[{\"day\":1,\"status\":1,\"packageId\":\"6536767\"},{\"day\":2,\"status\":0,\"packageId\":\"6537618\"},{\"day\":3,\"status\":0,\"packageId\":\"6537619\"},{\"day\":4,\"status\":0,\"packageId\":\"6537620\"},{\"day\":5,\"status\":0,\"packageId\":\"6537622\"},{\"day\":6,\"status\":0,\"packageId\":\"6537623\"},{\"day\":7,\"status\":0,\"packageId\":\"6537624\"}],\"tasks\":[{\"id\":\"1\",\"type\":\"visit_mini\",\"name\":\"访问社区小程序\",\"required\":1,\"progress\":1,\"status\":1,\"scoreA\":10,\"scoreB\":0},{\"id\":\"2\",\"type\":\"view_post_count\",\"name\":\"查看1个帖子\",\"required\":1,\"progress\":0,\"status\":0,\"scoreA\":10,\"scoreB\":0},{\"id\":\"3\",\"type\":\"view_post_count\",\"name\":\"查看3个帖子\",\"required\":3,\"progress\":0,\"status\":0,\"scoreA\":10,\"scoreB\":0},{\"id\":\"4\",\"type\":\"view_post_count\",\"name\":\"查看5个帖子\",\"required\":5,\"progress\":0,\"status\":0,\"scoreA\":20,\"scoreB\":0},{\"id\":\"9\",\"type\":\"view_post_count\",\"name\":\"查看10个帖子\",\"required\":10,\"progress\":0,\"status\":0,\"scoreA\":0,\"scoreB\":1},{\"id\":\"5\",\"type\":\"create_post_count\",\"name\":\"发1个帖子\",\"required\":1,\"progress\":0,\"status\":0,\"scoreA\":10,\"scoreB\":0},{\"id\":\"6\",\"type\":\"create_comment_count\",\"name\":\"评论1次\",\"required\":1,\"progress\":0,\"status\":0,\"scoreA\":10,\"scoreB\":0},{\"id\":\"7\",\"type\":\"like_post_count\",\"name\":\"点赞3个帖子\",\"required\":3,\"progress\":0,\"status\":0,\"scoreA\":30,\"scoreB\":0},{\"id\":\"8\",\"type\":\"like_post_count\",\"name\":\"点赞10个帖子\",\"required\":10,\"progress\":0,\"status\":0,\"scoreA\":0,\"scoreB\":1}]}",
    "serial": "mock_serial_123456789"
  }
}
```

## 响应数据解析

### 主要字段说明
- **ret**: 0 (成功)
- **iUin**: 用户唯一标识
- **pack**: 福利状态数据（JSON字符串）

### 数据结构解析

#### 周签到状态 (weekdays)
```json
[
  {
    "day": 1,           // 第几天
    "status": 1,        // 状态：1=已签到，0=未签到
    "packageId": "6536767"  // 奖励包ID
  }
]
```

#### 任务列表 (tasks)
```json
[
  {
    "id": "1",                    // 任务ID
    "type": "visit_mini",         // 任务类型
    "name": "访问社区小程序",        // 任务名称
    "required": 1,                // 需要完成次数
    "progress": 1,                // 当前进度
    "status": 1,                  // 状态：1=已完成，0=未完成
    "scoreA": 10,                 // 奖励光之币数量
    "scoreB": 0                   // 奖励友谊水晶数量
  }
]
```

### 当前状态分析

#### 周签到状态
- **第1天**: 已签到 (status: 1)
- **第2-7天**: 未签到 (status: 0)

#### 任务完成情况
- **已完成任务**: 访问社区小程序 (任务ID: 1)
- **未完成任务**: 查看帖子、发帖、评论、点赞等

### 任务类型说明
1. **visit_mini**: 访问社区小程序
2. **view_post_count**: 查看帖子数量
3. **create_post_count**: 发帖数量
4. **create_comment_count**: 评论数量
5. **like_post_count**: 点赞数量

## 接口作用
1. **获取签到状态**: 查询用户本周的签到情况
2. **获取任务进度**: 显示各种任务的完成状态
3. **显示奖励信息**: 每个任务/签到的奖励币值
4. **支持自动签到**: 为自动签到提供状态判断依据

## 在签到流程中的位置
- 在初始化会话之后调用
- 用于判断是否可以签到
- 为自动签到提供状态信息

## 注意事项
- 需要有效的用户认证信息
- 周签到状态会每周重置
- 任务进度会实时更新
- 返回的pack字段是JSON字符串，需要二次解析
- 可以根据status字段判断哪些任务已完成 