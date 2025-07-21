# 领取签到奖励接口

## 接口基本信息
- **接口地址**: `https://minigame.guangzi.qq.com/starweb/7tn8putvbu_p`
- **请求方法**: POST
- **接口功能**: 领取指定天数的签到奖励
- **接口参数**: `r=PickSignAward`

## 请求信息

### 请求头
```http
Host: minigame.guangzi.qq.com
Connection: keep-alive
Content-Length: 39
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
  "r": "PickSignAward",
  "d": "{\"day\":1}"
}
```

### 请求参数说明
- **r**: 固定值 "PickSignAward"
- **d**: JSON字符串，包含要领取的天数
  - **day**: 要领取的签到天数 (1-7)

## 响应信息

### 响应头
```http
HTTP/1.1 200
Date: Tue, 15 Jul 2025 11:36:16 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 244
Connection: keep-alive
Server: nginx
X-Envoy-Upstream-Service-Time: 151
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
    "pack": "{\"packageId\":\"6536767\"}",
    "serial": "mock_serial_123456789"
  }
}
```

## 响应数据解析

### 主要字段说明
- **ret**: 0 (成功)
- **iUin**: 用户唯一标识
- **pack**: 奖励包信息（JSON字符串）

### 奖励包数据结构
```json
{
  "packageId": "6536767"
}
```

### 奖励包ID对应关系
根据 `get-package-map.md` 文档：

1. **6536767**: 签到1天水煮蛋x10
2. **6537618**: 签到2天强心剂x1
3. **6537619**: 签到3天经验之证x1
4. **6537620**: 签到4天幻象棱晶x2
5. **6537622**: 签到5天神秘炼金药x1
6. **6537623**: 签到6天黄昏湾传送x10
7. **6537624**: 签到7天金蝶币铜卡x1

## 接口作用
1. **领取签到奖励**: 领取指定天数的签到奖励
2. **更新签到状态**: 领取后该天的签到状态会更新
3. **获得游戏道具**: 根据天数获得对应的游戏道具

## 在签到流程中的位置
- 在获取福利状态之后调用
- 需要先检查该天是否已签到
- 只有未签到的天数才能领取奖励

## 使用示例

### 领取第1天签到奖励
```json
{
  "r": "PickSignAward",
  "d": "{\"day\":1}"
}
```

### 领取第2天签到奖励
```json
{
  "r": "PickSignAward",
  "d": "{\"day\":2}"
}
```

## 注意事项
- 需要有效的用户认证信息
- 只能领取未签到的天数
- 每天只能签到一次
- 周签到状态会每周重置
- 返回的pack字段是JSON字符串，需要二次解析
- packageId对应具体的游戏道具奖励

## 错误处理
- **ret**: 0 表示成功
- **ret**: 非0 表示失败，具体错误信息在 errmsg 字段
- 常见错误：已签到、参数错误、网络错误等 