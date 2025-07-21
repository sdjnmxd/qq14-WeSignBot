# 获取用户积分接口

## 接口基本信息
- **接口地址**: `https://minigame.guangzi.qq.com/starweb/7tn8putvbu_p`
- **请求方法**: POST
- **接口功能**: 获取用户当前的积分/币值信息
- **接口参数**: `r=FuliScores`

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
  "r": "FuliScores"
}
```

## 响应信息

### 响应头
```http
HTTP/1.1 200
Date: Tue, 15 Jul 2025 07:13:03 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 254
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
    "pack": "{\"scoreA\":\"550\",\"scoreB\":\"3\"}",
    "serial": "mock_serial_123456789"
  }
}
```

## 响应数据解析

### 主要字段说明
- **ret**: 0 (成功)
- **iUin**: 用户唯一标识
- **pack**: 积分数据（JSON字符串）
  - **scoreA**: "550" - 光之币数量
  - **scoreB**: "3" - 友谊水晶数量
- **serial**: 请求序列号
- **requestID**: 请求ID

## 接口作用
1. **查询用户积分**: 获取用户当前拥有的各种币值
2. **显示积分状态**: 展示用户的签到奖励积累情况
3. **支持兑换判断**: 为后续兑换操作提供币值基础数据

## 在签到流程中的位置
- 通常是签到流程的第一步
- 在获取可兑换物品列表之前调用
- 用于判断用户是否有足够币值进行兑换

## 注意事项
- 需要有效的用户认证信息
- 币值数据会实时更新
- 不同币种可能有不同的兑换规则
- 返回的pack字段是JSON字符串，需要二次解析 