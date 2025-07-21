# 点赞/取消点赞接口

## 接口信息

- **接口地址**: `https://minigame.guangzi.qq.com/starweb/7tn8putvbu_p`
- **请求方法**: POST
- **接口类型**: 点赞/取消点赞

## 请求头

```
Host: minigame.guangzi.qq.com
Connection: keep-alive
Content-Length: 87
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
  "r": "ToggleLike",
  "d": "{\"likeType\":\"POST\",\"targetId\":\"mock_post_id_001\",\"isLike\":true}"
}
```

### 请求体字段解析

- `r`: 请求类型，固定值为"ToggleLike"，表示点赞/取消点赞操作
- `d`: 请求数据，JSON字符串格式
  - `likeType`: 点赞类型，固定值为"POST"，表示对帖子进行点赞
  - `targetId`: 目标ID，即要点赞的帖子ID
  - `isLike`: 是否点赞，true表示点赞，false表示取消点赞

## 响应头

```
HTTP/1.1 200
Date: Tue, 15 Jul 2025 10:52:11 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 232
Connection: keep-alive
Server: nginx
X-Envoy-Upstream-Service-Time: 66
X-Request-Id: mock-request-id-123456789
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
    "pack": "{\"count\":\"110\"}",
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
  - `pack`: 包含点赞结果的JSON字符串，需要二次解析
  - `serial`: 会话序列号

### pack字段详细解析

pack字段包含点赞操作的结果：

#### count（点赞数）
- `count`: 操作后的点赞数量，字符串格式

## 接口作用

此接口用于对帖子进行点赞或取消点赞操作，支持动态切换点赞状态。

## 在签到流程中的位置

此接口用于完成"点赞帖子"任务，通过点赞官方帖子来获得积分奖励。

## 注意事项

- 此接口支持点赞和取消点赞两种操作
- `targetId` 必须是有效的帖子ID
- 点赞操作会影响帖子的点赞数量统计
- 建议只对官方帖子进行点赞操作 