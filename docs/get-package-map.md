# 获取奖励包映射接口

## 接口基本信息
- **接口地址**: `https://minigame.guangzi.qq.com/starweb/7tn8putvbu_p`
- **请求方法**: POST
- **接口功能**: 获取所有奖励包的详细信息映射
- **接口参数**: `r=PackageMap`

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
  "r": "PackageMap"
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
X-Envoy-Upstream-Service-Time: 47
X-Request-Id: mock-request-id-123456789
Content-Encoding: gzip
Vary: Accept-Encoding
Content-Length: 704
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
    "pack": "{\"packages\":{\"6536767\":{\"title\":\"签到1天水煮蛋x10\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537618\":{\"title\":\"签到2天强心剂x1\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537619\":{\"title\":\"签到3天经验之证x1\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537620\":{\"title\":\"签到4天幻象棱晶x2\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537622\":{\"title\":\"签到5天神秘炼金药x1\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537623\":{\"title\":\"签到6天黄昏湾传送x10\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537624\":{\"title\":\"签到7天金蝶币铜卡x1\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537625\":{\"title\":\"改名申请书x1\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537626\":{\"title\":\"特殊染剂x1\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537627\":{\"title\":\"未开封染剂x5\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537628\":{\"title\":\"强心剂x15\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537629\":{\"title\":\"神秘炼金药x1\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537630\":{\"title\":\"经验之证x2\",\"image\":\"https://example.com/mock_image.png",\"offline\":false},\"6537631\":{\"title\":\"辉光独角兽笛x1\",\"image\":\"\",\"offline\":false},\"6537636\":{\"title\":\"绯蔷独角兽笛x1\",\"image\":\"\",\"offline\":false},\"6537637\":{\"title\":\"极光独角兽笛x1\",\"image\":\"\",\"offline\":false},\"6637191\":{\"title\":\"幻想药x1\",\"image\":\"https://example.com/mock_image.png",\"offline\":false}}}",
    "serial": "mock_serial_123456789"
  }
}
```

## 响应数据解析

### 主要字段说明
- **ret**: 0 (成功)
- **iUin**: 用户唯一标识
- **pack**: 奖励包映射数据（JSON字符串）

### 奖励包数据结构
```json
{
  "packages": {
    "packageId": {
      "title": "奖励名称",
      "image": "图片URL",
      "offline": false
    }
  }
}
```

### 奖励包详细列表

#### 周签到奖励 (7天)
1. **6536767**: 签到1天水煮蛋x10
2. **6537618**: 签到2天强心剂x1
3. **6537619**: 签到3天经验之证x1
4. **6537620**: 签到4天幻象棱晶x2
5. **6537622**: 签到5天神秘炼金药x1
6. **6537623**: 签到6天黄昏湾传送x10
7. **6537624**: 签到7天金蝶币铜卡x1

#### 兑换商店奖励
8. **6537625**: 改名申请书x1
9. **6537626**: 特殊染剂x1
10. **6537627**: 未开封染剂x5
11. **6537628**: 强心剂x15
12. **6537629**: 神秘炼金药x1
13. **6537630**: 经验之证x2
14. **6637191**: 幻想药x1

#### 特殊奖励
15. **6537631**: 辉光独角兽笛x1
16. **6537636**: 绯蔷独角兽笛x1
17. **6537637**: 极光独角兽笛x1

### 游戏道具说明
- **水煮蛋**: 恢复HP的食物
- **强心剂**: 恢复MP的药剂
- **经验之证**: 增加经验值的道具
- **幻象棱晶**: 用于幻化的道具
- **神秘炼金药**: 高级恢复药剂
- **黄昏湾传送**: 传送道具
- **金蝶币铜卡**: 游戏货币
- **染剂**: 改变装备颜色的道具
- **独角兽笛**: 坐骑召唤道具

## 接口作用
1. **获取奖励信息**: 查询所有奖励包的详细信息
2. **显示奖励图片**: 为前端提供奖励图标
3. **支持奖励兑换**: 为兑换操作提供奖励信息
4. **验证奖励有效性**: 检查奖励是否已下线

## 在签到流程中的位置
- 在获取福利状态之后调用
- 用于显示可获得的奖励信息
- 为兑换操作提供奖励详情

## 注意事项
- 需要有效的用户认证信息
- 奖励包信息可能会动态更新
- 返回的pack字段是JSON字符串，需要二次解析
- offline字段表示奖励是否已下线
- 图片URL可能为空或无效 