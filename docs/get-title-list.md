# 获取头衔列表接口

## 接口信息

- **接口地址**: `https://minigame.guangzi.qq.com/starweb/7tn8putvbu_p`
- **请求方法**: POST
- **接口类型**: 获取头衔列表

## 请求头

```
Host: minigame.guangzi.qq.com
Connection: keep-alive
Content-Length: 26
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
  "r": "ListTitle",
  "d": "{}"
}
```

### 请求体字段解析

- `r`: 请求类型，固定值为"ListTitle"，表示获取头衔列表
- `d`: 请求数据，当前为空对象，可能用于传递筛选参数

## 响应头

```
HTTP/1.1 200
Date: Tue, 15 Jul 2025 07:12:40 GMT
Content-Type: application/json; charset=utf-8
Connection: keep-alive
Server: nginx
X-Envoy-Upstream-Service-Time: 53
X-Request-Id: mock-request-id-123456789
Content-Encoding: gzip
Vary: Accept-Encoding
Content-Length: 722
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
    "pack": "{\"titles\":[{\"titleId\":\"10\",\"label\":\"首席水晶导师\",\"intro\":\"首席水晶导师\",\"image\":\"https://example.com/mock_image.png"},{\"titleId\":\"9\",\"label\":\"资深水晶导师\",\"intro\":\"资深水晶导师\",\"image\":\"https://example.com/mock_image.png"},{\"titleId\":\"8\",\"label\":\"光之锦鲤\",\"intro\":\"光之锦鲤\",\"image\":\"https://example.com/mock_image.png"},{\"titleId\":\"7\",\"label\":\"新任水晶导师\",\"intro\":\"初级导师\",\"image\":\"https://example.com/mock_image.png"},{\"titleId\":\"6\",\"label\":\"版主\",\"intro\":\"版主\",\"image\":\"https://example.com/mock_image.png"},{\"titleId\":\"5\",\"label\":\"搬运工\",\"intro\":\"搬运工（三方）\",\"image\":\"https://example.com/mock_image.png"},{\"titleId\":\"4\",\"label\":\"策划头衔\",\"intro\":\"策划（新）\",\"image\":\"https://example.com/mock_image.png"},{\"titleId\":\"3\",\"label\":\"官方头衔\",\"intro\":\"官方（新）\",\"image\":\"https://example.com/mock_image.png"}]}",
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
  - `pack`: 包含头衔数据的JSON字符串，需要二次解析
  - `serial`: 会话序列号

### pack字段详细解析

pack字段包含头衔列表数据：

#### titles（头衔列表）
- `titleId`: 头衔ID
- `label`: 头衔显示名称
- `intro`: 头衔介绍
- `image`: 头衔图标URL

#### 头衔等级说明
1. **titleId: "10"** - 首席水晶导师（最高等级）
2. **titleId: "9"** - 资深水晶导师
3. **titleId: "8"** - 光之锦鲤
4. **titleId: "7"** - 新任水晶导师（初级导师）
5. **titleId: "6"** - 版主
6. **titleId: "5"** - 搬运工（三方）
7. **titleId: "4"** - 策划头衔（策划）
8. **titleId: "3"** - 官方头衔（官方）

## 接口作用

此接口用于获取用户可获得的头衔列表，包括各种等级的头衔信息，主要用于社区身份展示和用户等级系统。

## 在签到流程中的位置

此接口与签到流程**无直接关系**，属于社区功能模块，用于展示用户头衔和身份信息。

## 注意事项

- 此接口返回的头衔数据按等级排序，数字越大等级越高
- `pack` 字段是JSON字符串，需要二次解析才能获取具体数据
- 头衔系统可能与用户的社区活跃度、贡献度相关
- 此接口主要用于社区功能，不是签到流程的必要步骤 