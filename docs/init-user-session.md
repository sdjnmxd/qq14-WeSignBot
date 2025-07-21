# 初始化用户会话接口

## 接口基本信息
- **接口地址**: `https://minigame.guangzi.qq.com/starweb/7tn8putvbu_init`
- **请求方法**: POST
- **接口功能**: 初始化用户会话，获取用户绑定信息和基础配置
- **接口参数**: `with_bind_info=true`

## 请求信息

### 请求头
```http
Host: minigame.guangzi.qq.com
Connection: keep-alive
Content-Length: 23
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
  "with_bind_info": true
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
X-Envoy-Upstream-Service-Time: 48
X-Request-Id: mock-request-id-123456789
Content-Encoding: gzip
Vary: Accept-Encoding
Content-Length: 901
```

### 响应体
```json
{
  "requestID": "mock_request_id_123456789",
  "ret": 0,
  "errmsg": "",
  "data": {
    "bbs_config": "",
    "bind_info": {
      "area_id": "1",
      "area_name": "天幕魔导城",
      "partition_id": "10005",
      "partition_name": "天幕魔导城",
      "plat_id": "1",
      "plat_name": "微信",
      "role_id": "706551542911388",
      "role_name": "奶鱼"
    },
    "bind_phone": null,
    "current_user": "{\"userInfo\":{\"userId\":113132,\"authType\":4,\"nickname\":\"用户6006095139233\",\"region\":\"浙江省\",\"hasMobile\":true},\"userData\":{},\"userPrivate\":{\"mobile\":\"186****8091\",\"hideFollowing\":false,\"hideFollower\":false,\"hideFavorites\":false,\"hideGameData\":false,\"disablePr\":false}}",
    "extra": "",
    "iUin": "mock_user_id_123456789",
    "openid": "",
    "pic_config": {
      "ext_allowed": ["gif", "jpg", "png", "jpeg"],
      "max_size": 4
    },
    "recruit_info": null,
    "secret_qq": "3073924ee282e41657f16948b429236534f3c03a0cb5775b3b4d482373cc64f186bc8c7ab4d5e3b3",
    "serial": "mock_serial_123456789",
    "userinfo": "{\"TitleIds\":\"\",\"auth_type\":\"4\",\"avatar\":\"\",\"first_init_time\":\"1749174699\",\"last_init_time\":\"1752563582\",\"nickname\":\"用户6006095139233\",\"phone\":\"18668108091\",\"phone_bind_time\":\"1749174987\",\"phone_gift_get\":\"1\",\"phone_unbind_time\":\"1749174823\",\"red_dot\":\"{\\\"at\\\":\\\"0\\\",\\\"cr\\\":\\\"0\\\",\\\"like\\\":\\\"0\\\",\\\"msg\\\":\\\"0\\\",\\\"sys_notice\\\":\\\"0\\\"}\",\"region\":\"浙江省\",\"status\":\"0\",\"uid\":\"113132\",\"user_data_mouth_update_times\":\"3\"}",
    "v2_open_time": "1750003200",
    "video_config": {
      "ext_allowed": ["mp4", "wmv", "rmvb", "flv", "avi", "mov", "m4v", "mkv"],
      "max_size": 200
    }
  }
}
```

## 响应数据解析

### 主要字段说明
- **ret**: 0 (成功)
- **iUin**: 用户唯一标识
- **bind_info**: 游戏绑定信息
  - **area_name**: "天幕魔导城" - 游戏区服名称
  - **role_name**: "奶鱼" - 游戏角色名称
  - **role_id**: "706551542911388" - 角色ID
- **current_user**: 用户信息（JSON字符串）
- **userinfo**: 详细用户信息（JSON字符串）
- **secret_qq**: 加密的QQ信息
- **pic_config**: 图片上传配置
- **video_config**: 视频上传配置

### 用户信息解析
```json
{
  "userInfo": {
    "userId": 113132,
    "authType": 4,
    "nickname": "用户6006095139233",
    "region": "浙江省",
    "hasMobile": true
  }
}
```

### 游戏绑定信息
- **游戏**: 最终幻想14 (FF14)
- **区服**: 天幕魔导城
- **角色**: 奶鱼
- **平台**: 微信

## 接口作用
1. **初始化用户会话**: 建立与服务器的连接
2. **获取用户绑定信息**: 查询用户的游戏账号绑定状态
3. **验证用户身份**: 确认用户登录状态的有效性
4. **获取用户配置**: 获取图片、视频上传等配置信息
5. **准备后续操作**: 为签到、兑换等操作做准备

## 在签到流程中的位置
- 通常是整个流程的第一步
- 在获取用户积分之前调用
- 用于验证用户身份和获取基础信息

## 注意事项
- 需要有效的用户认证信息
- 这个接口是会话建立的必要步骤
- 返回的绑定信息可能影响后续操作权限
- 部分字段是JSON字符串，需要二次解析
- 包含敏感信息（手机号等），需要妥善处理 