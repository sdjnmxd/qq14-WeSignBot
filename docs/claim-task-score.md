# 领取任务奖励接口

## 接口基本信息
- **接口地址**: `https://minigame.guangzi.qq.com/starweb/7tn8putvbu_p`
- **请求方法**: POST
- **接口功能**: 领取指定任务的奖励
- **接口参数**: `r=PickTaskScore`

## 请求信息

### 请求头
```http
Host: minigame.guangzi.qq.com
Connection: keep-alive
Content-Length: 42
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
  "r": "PickTaskScore",
  "d": "{\"taskId\":1}"
}
```

### 请求参数说明
- **r**: 固定值 "PickTaskScore"
- **d**: JSON字符串，包含要领取奖励的任务ID
  - **taskId**: 任务ID (数字或字符串)

## 响应信息

### 响应头
```http
HTTP/1.1 200
Date: Tue, 15 Jul 2025 11:40:56 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 300
Connection: keep-alive
Server: nginx
X-Envoy-Upstream-Service-Time: 50
X-Request-Id: mock-request-id-123456789
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
    "pack": "{\"taskId\":\"1\",\"scoreA\":10,\"scoreATotal\":560,\"scoreB\":0,\"scoreBTotal\":3}",
    "serial": "mock_serial_123456789"
  }
}
```

## 响应数据解析

### 主要字段说明
- **ret**: 0 (成功)
- **iUin**: 用户唯一标识
- **pack**: 任务奖励数据（JSON字符串）

### 任务奖励数据结构
```json
{
  "taskId": "1",
  "scoreA": 10,
  "scoreATotal": 560,
  "scoreB": 0,
  "scoreBTotal": 3
}
```

### 字段详细说明
- **taskId**: 任务ID
- **scoreA**: 本次获得的光之币数量
- **scoreATotal**: 当前总光之币数量
- **scoreB**: 本次获得的友谊水晶数量
- **scoreBTotal**: 当前总友谊水晶数量

## 接口作用
1. **领取任务奖励**: 领取指定任务的积分奖励
2. **更新用户积分**: 增加用户的光之币和友谊水晶
3. **防止重复领取**: 每个任务奖励只能领取一次
4. **返回积分统计**: 显示领取后的总积分情况

## 在奖励流程中的位置
- 在任务完成后调用
- 需要先检查任务是否已完成
- 只有未领取的任务奖励才能领取

## 使用示例

### 领取任务1的奖励
```json
{
  "r": "PickTaskScore",
  "d": "{\"taskId\":1}"
}
```

### 领取任务2的奖励
```json
{
  "r": "PickTaskScore",
  "d": "{\"taskId\":2}"
}
```

## 注意事项
- 需要有效的用户认证信息
- 只能领取已完成且未领取的任务奖励
- 每个任务奖励只能领取一次
- 返回的pack字段是JSON字符串，需要二次解析
- 积分会实时更新到用户账户

## 错误处理
- **ret**: 0 表示成功
- **ret**: 非0 表示失败，具体错误信息在 errmsg 字段
- 常见错误：任务未完成、已领取、参数错误、网络错误等

## 与其他接口的关系
- 配合 `FuliStatus` 接口获取任务完成状态
- 配合 `FuliScores` 接口验证积分更新
- 与签到奖励接口 `PickSignAward` 形成完整的奖励体系 