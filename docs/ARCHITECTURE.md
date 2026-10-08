# 寻味 · 云函数分层（Day 19）

> 配图：`architecture-layers.svg`（同目录）。

## 今天做了什么

把「查数据库」的代码从 `cloudfunctions/api/index.js` 整段搬到了新文件
`cloudfunctions/api/db.js`，`index.js` 瘦身为纯业务层。**只搬家、不装修**：
逻辑一行没改，接口路径、字段名、响应形状全部不动（契约不许变）。

## 分层后的职责边界

| 层 | 文件 | 管什么 | 不管什么 |
|---|---|---|---|
| 业务层 | `index.js` | 路由分派（`resolveRoute`）、口令校验（`assertAdmin`）、输入校验（`validateNewDish` 等，中文报错）、行→JSON 映射（`mapDish*`）、统一响应（`ok`/`fail`） | 不发任何网络请求、不认识网关地址 |
| 数据访问层 | `db.js` | 网关读写（`restGet`/`restInsert`）、查询参数编码、`Content-Range` 解析、SQLSTATE → HTTP 状态码翻译（`gatewayError`） | 不知道接口路径、响应形状、什么是"菜品列表" |
| 数据库 | PostgreSQL | 6 张表；**防重复提交靠主键 `pk_dishes`**，不靠应用层"先查再插" | — |

依赖方向是单向的：`index.js → db.js → 数据库`，反向不存在。

## 「今日一问」成稿答案

**拆完之后，「查数据库」这段代码从哪移到了哪？**

从 `cloudfunctions/api/index.js` 的「一、和网关打交道」整节（约 190 行：
`restGet` / `restInsert` / `gatewayError` / `parseTotal` / `encodeValue` /
`buildQueryString` + 网关常量），**移到了独立文件 `cloudfunctions/api/db.js`**。
`index.js` 从此不再 `require('https')`，改为一行 `require('./db.js')`；
连「缺密钥」的自诊检查都随层搬走了。怎么确认搬干净了：全文搜索
`function restGet` 等定义在 index.js 中已为 0 处，而业务函数对它们的调用点全部原样保留。

## 拆层抓出来的一条真缝（值得记）

离线回归第一轮炸了 3 项：测试靠「清 `require` 缓存 → 重新加载 → 验新环境变量生效」，
拆层前 `API_KEY` 在 `index.js` 里读、清它就够；拆层后它住在 `db.js`，
**只清 `index.js` 的缓存，`db.js` 还揣着旧配置**。修法：测试脚手架改为连依赖一起清
（`freshIndex()`）。教训：模块拓扑一变，测试的装载假设要跟着核一遍。

## 回归怎么验的

1. 离线：`node tests/api-shape.test.js` → **73 项全过**（重构后逐字未改断言，只修了上述缓存清理）。
2. 公网（部署后）：四条 GET + 一条 POST 的错误分支逐条探测，响应形状与 Day 17/18 验收时逐字段一致。
