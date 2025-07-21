# 获取可兑换物品列表接口

## 接口基本信息
- **接口地址**: `https://minigame.guangzi.qq.com/starweb/7tn8putvbu_p`
- **请求方法**: POST
- **接口功能**: 获取用户可兑换的物品列表
- **接口参数**: `r=ListExchangeItem`

## 请求信息

### 请求头
```http
Host: minigame.guangzi.qq.com
Connection: keep-alive
Content-Length: 24
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
  "r": "ListExchangeItem"
}
```

## 响应信息

### 响应头
```http
HTTP/1.1 200
Date: Tue, 15 Jul 2025 07:13:02 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 985
Connection: keep-alive
Server: nginx
X-Envoy-Upstream-Service-Time: 54
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
    "pack": "{\"items\":[{\"packageId\":\"6637191\",\"limitType\":3,\"limitCount\":1,\"scoreA\":0,\"scoreB\":200,\"redeemCount\":0},{\"packageId\":\"6537625\",\"limitType\":3,\"limitCount\":1,\"scoreA\":6000,\"scoreB\":0,\"redeemCount\":0},{\"packageId\":\"6537626\",\"limitType\":3,\"limitCount\":1,\"scoreA\":1500,\"scoreB\":0,\"redeemCount\":0},{\"packageId\":\"6537627\",\"limitType\":3,\"limitCount\":1,\"scoreA\":1500,\"scoreB\":0,\"redeemCount\":0},{\"packageId\":\"6537628\",\"limitType\":3,\"limitCount\":1,\"scoreA\":1000,\"scoreB\":0,\"redeemCount\":0},{\"packageId\":\"6537629\",\"limitType\":3,\"limitCount\":1,\"scoreA\":1000,\"scoreB\":0,\"redeemCount\":0},{\"packageId\":\"6537630\",\"limitType\":3,\"limitCount\":1,\"scoreA\":1000,\"scoreB\":0,\"redeemCount\":0}]}",
    "serial": "mock_serial_123456789"
  }
}
```

## 响应数据解析

### 主要字段说明
- **ret**: 0 (成功)
- **iUin**: 用户唯一标识
- **pack**: 物品列表数据（JSON字符串）

### 物品数据结构
```json
{
  "items": [
    {
      "packageId": "6637191",    // 物品包ID
      "limitType": 3,             // 限制类型
      "limitCount": 1,            // 限制数量
      "scoreA": 0,                // 需要的光之币数量
      "scoreB": 200,              // 需要的友谊水晶数量
      "redeemCount": 0            // 已兑换次数
    }
  ]
}
```

### 当前可兑换物品列表
1. **物品1** (packageId: 6637191): 需要200友谊水晶
2. **物品2** (packageId: 6537625): 需要6000光之币
3. **物品3** (packageId: 6537626): 需要1500光之币
4. **物品4** (packageId: 6537627): 需要1500光之币
5. **物品5** (packageId: 6537628): 需要1000光之币
6. **物品6** (packageId: 6537629): 需要1000光之币
7. **物品7** (packageId: 6537630): 需要1000光之币

## 接口作用
1. **获取兑换物品清单**: 查询当前可兑换的所有物品
2. **显示兑换条件**: 每个物品需要的币值数量
3. **支持兑换操作**: 为后续的兑换操作提供物品列表
4. **显示兑换限制**: 每个物品的兑换限制和已兑换次数

## 在签到流程中的位置
- 在获取用户积分之后调用
- 为用户提供可兑换物品的选择
- 是兑换奖励流程的第一步

## 注意事项
- 需要有效的用户认证信息
- 返回的物品列表可能会动态变化
- 需要检查用户币值是否足够兑换
- 返回的pack字段是JSON字符串，需要二次解析
- 每个物品都有兑换限制，需要检查limitCount和redeemCount 