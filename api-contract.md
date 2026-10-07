# 接口契约 · API Contract —— 寻味 / Xunwei

> **状态：三条读接口已实现。** 契约 2026-10-01（Day 15）登记，实现 2026-10-06（Day 17）。
>
> 这份文件是第 3 周（Day 16–20）**建表与写接口的唯一依据**。
> 表的形状见 `db/schema.sql`，授权的 SQL 见 `db/grants.sql`，
> 接口代码在 `cloudfunctions/api/index.js`，形状自测在 `tests/api-shape.test.js`。
> 前端此刻**仍读本地 mock 数据**（`data/dishes.json`），行为与第 2 周完全一致 ——
> 换数据源是下一步的事，做法见 §5。

---

## 0. 这份契约是怎么推导出来的

课程给的例子是打卡应用（`plan_days` / `checkins` 两张表、`GET /api/favorites`）。
**我们没有照抄**——照抄会得到一份与寻味毫无关系的契约。我们是从**自己的三个页面**倒推的，用了三条线索：

| 线索 | 具体问法 | 得出的结论 |
|---|---|---|
| ① 页面到底用了哪些字段 | 把 `js/app.js` 里读过的字段全 grep 出来 | → §4 字段字典 |
| ② 一次要一批，还是一次要一条 | 列表页要 12 条**摘要**；卡片页只要 1 条**全文** | → 列表与详情拆成两个接口 |
| ③ 哪些数字是"算出来的" | 地区索引用 34 个省级静态表 + 每省已收录几道 | → 需要 `GET /api/regions` |

★ **一条硬规矩：字段形状一律照抄现有 `dishes.json`，不重新设计。**

理由很实在：`data-source.js` 当初就是为"换数据源"准备的唯一出入口（它文件头自己写着这句话）。形状不变 ⇒ 第 3 周换成真接口时，**卡片的渲染代码一行都不用改**，改动全部集中在 `data-source.js` 一个文件里。这也是验证"那层抽象到底有没有用"的机会。

---

## 1. 通用约定

### 1.1 基地址

| 用途 | 地址 |
|---|---|
| 云函数（后端） | `https://vibecodingstudy-d1f1el6a03d5aad8-1499243471.ap-shanghai.app.tcloudbase.com` |
| 静态托管（前端） | `https://vibecodingstudy-d1f1el6a03d5aad8-1499243471.tcloudbaseapp.com` |

⚠️ **这两个域名不是同一个**，这是 CloudBase 的正常设计（前端一个域名、云函数一个域名）。
页面调接口因此属于**跨域请求**。今天不处理（清单把跨域划到 Day 16–20）；
配 HTTP 路由时「跨域设置」已经是开着的，届时也许不用额外配。

### 1.2 双语字段一律成对出现

凡是给用户看的文字，一律是这个形状：

```json
{ "zh": "螺蛳粉", "en": "Liuzhou Luosifen (Snail Rice Noodles)" }
```

**不允许只给一种语言。** 前端 `bilingual()` 直接读 `.zh` / `.en`，少一个键就会渲染出一行空白。

### 1.3 ★ 出处标记必须原样保留

`blocks` 的三段正文里**内嵌** `[[sourceId]]` 标记，例如：

```
螺蛳粉的风味常被概括为五个字：酸、辣、鲜、爽、烫[[ihchina]]。
```

前端 `richText()` 负责把 `[[ihchina]]` 替换成角标 `[n]`，点击跳到卡片底部的出处列表。

> ⚠️ **接口不得在返回前把标记剥掉、转义掉或改成 HTML。**
> 剥掉 = 所有事实陈述当场失去出处。而「每一条事实都能点回原文」是这个产品的地基（见 `PRD.md` 第 8 条）。

### 1.4 统一响应形状

**成功：**

```json
{ "ok": true, "data": {} }
```

**失败：**

```json
{ "ok": false, "error": { "code": "not_found", "message": "没有这道菜 / Dish not found" } }
```

错误码（今天先定这三个，实现时可增补）：

| code | HTTP | 含义 | 前端会显示什么 |
|---|---|---|---|
| `not_found` | 404 | 没有这道菜 / 这个地区 | 卡片页「**没找到这道菜**」空态 |
| `bad_request` | 400 | 参数不合法（如 `limit=abc`） | 「**读取失败**」失败态 |
| `internal_error` | 500 | 服务端异常 | 「**读取失败**」失败态 + 「重试」按钮 |

> 前端四种状态（正常 / 加载中 / 空 / 失败）已经做好了（见 `TECH_DESIGN.md §12`）。
> 所以接口只要**如实区分 404 和 500**，状态就不用前端手工凑。

### 1.5 缓存与分页

- 所有 GET 响应带 `Cache-Control: no-store`（内容会随收录增加而变；本期数据量小，不值得设计缓存策略）。
- 列表接口支持 `limit` / `offset`，默认 `limit=50`、`offset=0`。当前 12 道菜，一次就取完了。

---

## 2. 接口清单（总览）

| # | 方法 | 路径 | 服务的页面 | 状态 |
|---|---|---|---|---|
| 1 | `GET` | `/api/health` | （无对应页面，存活检查） | ✅ **已上线并验收**（Day 15） |
| 2 | `GET` | `/api/dishes` | 首页列表 / 搜索 / 地区筛选 | ✅ **已实现**（Day 17） |
| 3 | `GET` | `/api/dishes/{id}` | 卡片页 `#/dish/{id}` | ✅ **已实现**（Day 17） |
| 4 | `GET` | `/api/regions` | 地区索引 `#/regions` | ✅ **已实现**（Day 17） |
| 5 | `GET` | `/api` | （无对应页面） | ✅ 附加：接口目录，见 §3.5 |

> **列表读取接口是第 2 条。** 课程里举的 `GET /api/hot`（核心表读取）与 `GET /api/favorites`
> （记录表读取）投到我们项目上，就是第 2 条和第 3 条 —— 我们照自己的表名与页面需求换掉了示例名字。

**全部是 GET，没有任何写接口** —— 为什么，见 §6。

---

## 3. 逐个接口

### 3.1 `GET /api/health` —— 存活检查 ✅ 已上线

无参数。

**响应 200**（已在公网实测，30 字节）：

```json
{ "ok": true, "service": "xunwei" }
```

> ⚠️ **这一条是特例，不符合上面 §1.4 的统一形状**（没有包在 `data` 里）。
> 原因：它已经上线、已经截图验收过，为了统一形状而改，等于把今天的证据作废。
> 处理办法留到 Day 16 定：**(a)** 保留特例并在文档里注明，或 **(b)** 单独协调一次改动。

---

### 3.2 `GET /api/dishes` —— 列表读取

**查询参数**（全部可选）：

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `q` | string | 空 | 关键词，匹配范围见下 |
| `region` | string | 空 | 省级 **slug**，如 `guangxi`、`tianjin` |
| `status` | string | `published` | `published` / `all` |
| `limit` | int | 50 | 取值 1–100 |
| `offset` | int | 0 | ≥ 0 |

**`q` 的匹配范围**（必须与前端 `searchKeys()` **完全一致，不许缩小**）：

```
dish.id  ＋  dish.name.zh  ＋  dish.name.en  ＋  dish.aliases[]  ＋  dish.region.zh  ＋  dish.region.en
```

匹配前先**归一化**：转小写、去掉空格与 `· ・ - _ / （） ( ) 「」 【】`。

效果：`螺蛳粉`、`螺狮粉`（常见错别字）、`螺 蛳 粉`、`luosifen`、`snail noodles` 都能命中螺蛳粉。

> 好消息：我们的搜索是**点「搜索」按钮才提交**的（`form submit`，不是逐字实时搜索），
> 所以搬到服务端**不需要防抖、不会有竞态**——每次提交就一个请求。

**`region` 的匹配规则**（当前实现，见前端 `regionMatches()`）：
`dish.region.zh` **以该省级名开头**即命中。`广西` 命中「广西柳州」；`山西` 不会命中「陕西西安」。

> ⚠️ 这条规则靠**数据写法的约定**（`region.zh` 必须省名打头），很脆。
> 建表时建议改成 **`region` 存省 slug / code，用等值匹配**——前缀匹配在 SQL 里走不了索引，而且靠人记。
> 这是 Day 16 建表时的事，今天只记下来。

**响应 200：**

```json
{
  "ok": true,
  "data": {
    "items": [ /* 见下方 dishSummary */ ],
    "total": 12,
    "limit": 50,
    "offset": 0
  }
}
```

**`dishSummary`（列表项）—— 只给"画一张预览卡片"需要的字段，不含正文：**

```json
{
  "id": "luosifen",
  "status": "published",
  "name": { "zh": "螺蛳粉", "en": "Liuzhou Luosifen (Snail Rice Noodles)" },
  "region": { "zh": "广西柳州", "en": "Liuzhou, Guangxi" },
  "aliases": ["柳州螺蛳粉", "螺狮粉", "luosifen", "snail noodles"],
  "tagline": { "zh": "一碗闻着「臭」、吃着香的米粉，来自柳江边的夜市。", "en": "..." },
  "image": { "thumb": "https://...", "thumbWidth": 330, "thumbHeight": 222, "alt": { "zh": "...", "en": "..." } }
}
```

**关于 `aliases` 为什么留在摘要里**：它让"不传任何参数、一次取回全量、前端照旧本地筛选"这个**降级方案仍然可行**。接口一旦出问题，前端能立刻退回第 2 周的形态，不至于整站打不开。体积也很小。

**`image` 可以为 `null`** —— 现在 12 道菜里只有 5 道配了图（螺蛳粉 / 兰州牛肉面 / 沙县小吃 / 蒙自过桥米线 / 狗不理包子），其余 7 道没有。前端已经能正确处理"没图"。

**响应 400**（参数不合法）：

```json
{ "ok": false, "error": { "code": "bad_request", "message": "limit 必须是 1–100 的整数" } }
```

---

### 3.3 `GET /api/dishes/{id}` —— 卡片详情

**路径参数：** `id` = `dish.id`，ASCII 短名，如 `luosifen`、`shanxi-knife-cut-noodles`。

**响应 200：** 完整的 dish 对象（比 `dishSummary` 多出 `blocks` / `facts` / `sources` / `image.hero` / `image.credit`）：

```json
{
  "ok": true,
  "data": {
    "id": "luosifen",
    "status": "published",
    "name": { "zh": "螺蛳粉", "en": "..." },
    "aliases": ["..."],
    "region": { "zh": "广西柳州", "en": "Liuzhou, Guangxi" },
    "image": {
      "thumb": "...", "thumbWidth": 330, "thumbHeight": 222,
      "hero": "...", "heroWidth": 1280, "heroHeight": 862,
      "alt": { "zh": "...", "en": "..." },
      "credit": { "author": "N509FZ", "license": "CC BY-SA 4.0", "licenseUrl": "..." }
    },
    "tagline": { "zh": "...", "en": "..." },
    "blocks": {
      "origin":    { "zh": "...[[ihchina]]...", "en": "..." },
      "story":     { "zh": "...", "en": "..." },
      "technique": { "zh": "...[[ihchina]]...", "en": "..." }
    },
    "facts": [
      { "zh": "...", "en": "...", "sources": ["ihchina"] }
    ],
    "sources": [
      { "id": "ihchina", "title": "...", "url": "https://...", "accessed": "2026-09-22" }
    ]
  }
}
```

**响应 404：**

```json
{ "ok": false, "error": { "code": "not_found", "message": "没有这道菜 / Dish not found" } }
```

> ⚠️ **404 绝不要写成 500。** 前端已经把这两种情况分成了两个不同的画面：
> 「没找到这道菜」（可点「看全部」）和「读取失败」（可点「重试」）。
> 报错报错成 500，用户会以为服务器坏了，而实际只是拼错了菜名。

**关于 `status`：** 本期 12 道全是 `published`。
契约保留 `draft` 的可能 —— 前端遇到非 `published` 会走「内容整理中」分支，一个字都不展示（`PRD.md` 第 8 条：未核实的内容不上线）。

---

### 3.4 `GET /api/regions` —— 地区索引

无参数。

**响应 200：**

```json
{
  "ok": true,
  "data": {
    "groups": [
      { "id": "north", "name": "华北", "en": "North China" }
    ],
    "items": [
      {
        "key": "北京", "en": "Beijing", "slug": "beijing",
        "group": "华北", "groupId": "north", "count": 1
      }
    ],
    "total": 34
  }
}
```

`items` 是**全部 34 个省级行政区**（不是"已收录的才返回"）—— 索引页要把没收录的省也列出来，显示成虚线的「暂未收录 · Not yet」。

`count` = 该省已收录几道。

> ★ 契约把 `count` 定为**后端算**，而不是前端拿列表现算。
> 理由：现在前端 `countByRegion()` 和筛选 `regionMatches()` 用的是同一条前缀规则，所以"索引上写 2 道"和"点进去筛出 2 道"不会打架。
> 搬到后端后，**这条规则必须两边完全一致**，否则索引说 2 道、点进去 3 道，用户立刻就不信这个网站了。

---

### 3.5 实现记录（Day 17）

#### 3.5.1 库是怎么读到的：一个 HTTP 网关，不是数据库驱动

云开发 PG 模式的库**没有**把 5432 端口给我们，用不了 `pg` 那类驱动。官方给的读法是基于 PostgREST 的 HTTP 网关：

```
GET https://{环境ID}.api.tcloudbasegateway.com/v1/rdb/rest/{表名}?select=…&过滤=…
Authorization: Bearer <API Key>
```

| 事实 | 说明 |
|---|---|
| 只能读 `public` schema | 我们的 6 张表全在 `public`，正好 |
| 过滤语法 | `字段=eq.值` / `=like.*值*` / `=in.(a,b)`，加上 `select=` `order=` `limit=` `offset=` |
| 总数怎么来 | 请求头带 `Prefer: count=exact`，从响应头 `Content-Range: 0-11/12` 取斜杠后面那个数 |
| 参数化 | 不拼 SQL 字符串；但过滤表达式**自己也有元字符**（逗号、点、括号），所以 id / slug 必须先过白名单再拼 |

API Key 对应库里的 `service_role` 角色，属于后端专用：只从云函数环境变量读，任何响应体里都不带它。

#### 3.5.2 四处决定（此前挂在 §8 待拍板）

| 事项 | 定了什么 | 取舍 |
|---|---|---|
| 筛选放哪边 | **服务端**：`q` / `region` 交给接口 | 后续 `app.js` 要改约 2 处传参；好处是数据涨到几百道也不虚 |
| `region` 参数形状 | **省级 slug**（`guangxi`） | 与地址栏 `#/region/guangxi` 一致，URL 里不出现 `%E5%B9%BF%E8%A5%BF` |
| 地区匹配规则 | **`region_slug` 等值匹配** | 替掉原来"地名字符串前缀匹配"，能走索引；`count` 与筛选共用同一条等值比较，不会打架 |
| 库的权限 | **只给 `service_role` 读**，`anon` / `authenticated` 不给 | API Key 只活在云函数环境变量里，前端不直连网关 |

授权那一步正是 `db/schema.sql` 末尾留的"后三步"里的**授权**（RLS 与策略我们用不上 —— 没有按用户隔离的数据）。
SQL 在 `db/grants.sql`，它顺带把授权结果查出来供核对。

#### 3.5.3 路由怎么配，以及一个会踩的坑

HTTP 网关的路径匹配是**前缀匹配**（见 `docs.cloudbase.net/service/routes`），所以配**一条** `/api`
就能收到 `/api/dishes`、`/api/dishes/luosifen`、`/api/regions`。但**前缀之后那一段能不能拿到，
取决于这条路由有没有打开「路径透传」** —— 开了 `event.path` 才是完整路径。

因此函数在路径只剩 `/` 时返回一份**接口目录**。它还有第二个用途：诊断。
如果你打开 `/api/dishes` 却看到目录，就说明这条路由没开路径透传，一眼定位，不用猜。

#### 3.5.4 已实现 ≠ 形状全同：一处与 mock 文件的差异

那 7 道没配图的菜，`data/dishes.json` 里**根本没有 `image` 这个键**；
而库里它们的 27 个 `image_*` 列全是 NULL，接口如实返回 `"image": null`。

「字段在场但为空」与「字段根本不在场」在 JSON 里是两回事。**保留 `null`**，理由：
§3.2 本来就写着"`image` 可以为 `null`"，且前端一直是先判空再取值的写法，两种都吃得下。
这处差异由 `tests/api-shape.test.js` **显式记录并计数**，不藏在断言里。

同理，`/api/regions` 的 `count` 和 `/api/dishes` 的 `total`，**在 6 张表里都没有对应列**，
是接口现算的（`count` 按 `region_slug` 数一遍；`total` 从 `Content-Range` 取）。
找"接口返回的数据里哪一项和表对不上"时，最先撞见的就是这两项。

---

## 4. 字段字典（依据现有 `dishes.json`）

| 字段 | 类型 | 列表 | 详情 | 用在哪 | 备注 |
|---|---|---|---|---|---|
| `id` | string | ✔ | ✔ | 卡片页地址 `#/dish/{id}`、复制链接 | ASCII 短名，永远别改（改了旧链接全断） |
| `status` | string | ✔ | ✔ | 决定走"已核实"还是"内容整理中" | `published` / `draft` |
| `name` | `{zh,en}` | ✔ | ✔ | 列表标题、卡片大标题 | |
| `aliases` | string[] | ✔ | ✔ | 搜索命中 | 错别字、方言名、英文别名都放这里 |
| `region` | `{zh,en}` | ✔ | ✔ | 列表副标题、卡片 meta、地区筛选 | `zh` **必须省名打头**（见 §3.2 告警） |
| `tagline` | `{zh,en}` | ✔ | ✔ | 一句话卖点 | |
| `image` | object \| null | ✔ | ✔ | 列表缩略图 / 卡片大图 + 署名 | 可为 `null`（12 道里 7 道没有） |
| `image.credit` | object | ✘ | ✔ | 卡片图片下方署名行 | CC BY-SA 4.0 **要求**署名，不是装饰 |
| `blocks.origin` | `{zh,en}` | ✘ | ✔ | 卡片「起源」段 | 正文含 `[[id]]` 标记 |
| `blocks.story` | `{zh,en}` | ✘ | ✔ | 卡片「故事」段 | 同上 |
| `blocks.technique` | `{zh,en}` | ✘ | ✔ | 卡片「做法」段 | 同上 |
| `facts[]` | array | ✘ | ✔ | 卡片「关键事实」清单 | 每条带出处角标 |
| `facts[].sources` | string[] | ✘ | ✔ | 该条事实的出处 id | 指向同菜 `sources[].id` |
| `sources[]` | array | ✘ | ✔ | 卡片底部「出处」列表 | `id` / `title` / `url` / `accessed` |
| `note` | `{zh,en}` | ✘ | ✔ | 仅 `draft` 时显示 | 本期 12 道都没用到 |

---

## 5. 接接口时要动哪里（第 3 周参考）

| 文件 | 改动 | 量级 |
|---|---|---|
| `js/data-source.js` | `getDishes()` 改成请求 `/api/dishes`；新增 `getDish(id)` / `getRegions()` | **主要就这一个文件**（它当初就是为这天写的） |
| `js/app.js` | 取决于"筛选放哪边"这个选择：<br>· 放服务端 → 要把 `q` / `region` 传下去，约 **2 处**<br>· 全量取回本地筛 → **零改动** | 0 ~ 2 处 |
| `index.html` | 若两个域名之间需要跨域头，可能要在路由上确认配置 | 待定 |

> 这份文件的 §8 第 1 条就是让你定"要不要动 `app.js`"。

---

## 6. 本期没有任何写接口（不是漏了）

课程例子里的打卡应用有写接口（"打卡"= 往 `checkins` 写一条）。**我们一条都不需要**：

- `PRD.md` §9 非目标第 4 条：**不做用户投稿 / 注册登录 / UGC，本期无写入功能**。
- 这个站是**纯检索**：用户只能看、搜、筛，改不了任何东西。

所以本契约**只有 4 个 GET**。

将来如果真要做「收藏」（那是 Week 4 以后的事了），那时再登记 `POST /api/favorites` 之类的接口 —— 现在登记等于凭空造需求。

> **关于课程里的「收藏」**：Day 17–18 的示例应用是一个打卡应用，它天然有 `favorites` / `checkins`
> 这类"记录表"和对应的写接口。我们照旧不登记 —— 本项目的非目标就是不收用户数据。
> 示例名字一律按本项目实际情况替换（这是 `api-contract.md §0` 就定下的规矩）：
> 课程说"核心表和记录表各一个 GET"，我们对应的是**主表 `dishes`** 与**扩展表
> `dish_aliases` / `dish_facts` / `dish_sources` / `dish_fact_sources`**。

---

## 7. ⚠️ 一个必须说清的矛盾：我们正引入后端，而设计文档说不需要

`TECH_DESIGN.md §2.2` 白纸黑字写着：

> **不使用框架、不使用后端、不使用数据库**

而且给了逐条理由（没有写入需求 / 数据是静态的 / 引入后端属于过度设计）。

Day 15–20 的任务却是**建表 + 写接口**。这两件事在字面上是冲突的。

**我的看法（供你判断）**：这不是"当初设计错了"，而是两件事在**不同层次**上：

- §2.2 回答的是「**这个产品当前需不需要后端**」→ 结论：不需要，而且现在依然成立。
- Day 15–20 要的是「**完整练一遍前后端链路**」→ 这是**学习目标**，不是产品需求。

**建议的处理办法（要你拍板）**：在 `TECH_DESIGN.md` 补一节「第 3 周：有意引入后端（教学目的）」，写清三件事：

1. 引入理由是**课程要求**，不是产品需要；
2. 原 §2.2 的结论**依然成立**，作为"我们本可以不这么做"的记录保留；
3. 引入后前端**行为不变**（同样的页面、同样的内容），只有数据来源从文件换成接口 —— 这正好验证了 `data-source.js` 那层抽象有没有白做。

**不改的代价**：两份文档互相打脸。第 3 周你自己回头翻，会分不清哪份是真的。

---

## 8. 待拍板

| # | 事项 | 选项与代价 | 状态 |
|---|---|---|---|
| 1 | **筛选放服务端还是客户端？** | **(a) 服务端**：`app.js` 改约 2 处；数据涨到几百道也不虚<br>**(b) 客户端全量取回**：`app.js` 零改动；12 道菜够用，但数据一多就慢 | ✅ **已定 (a)**（Day 17） |
| 2 | **`region` 参数用中文还是 slug？** | 建议 **slug**（ASCII、与地址栏 `#/region/guangxi` 一致、URL 里不出现 `%E5%B9%BF%E8%A5%BF`） | ✅ **已定 slug**（Day 17） |
| 3 | **`/api/health` 要不要改成统一形状？** | **(a)** 保留特例 + 文档注明（Day 15 的证据不作废）<br>**(b)** 改掉并重新截一次图 | ⏳ 未定（不阻塞） |
| 4 | **要不要补 `TECH_DESIGN.md` 第 3 周说明？** | 见 §7。不改 → 两份文档长期互相矛盾 | ⏳ 未定（不阻塞） |
| 5 | **地区匹配要不要换成省 code 等值匹配？** | 建议换（前缀匹配走不了索引、靠数据写法的约定撑着）。**建表时定** | ✅ **已定：`region_slug` 等值匹配**（Day 16 建表时落进 `db/schema.sql`） |

---

## 附：本文件的来源与边界

- 字段依据：`data/dishes.json`（2026-09-24 版本，12 道菜，全部 `published`）
- 逻辑依据：`js/app.js` 的 `searchKeys()` / `regionMatches()` / `countByRegion()` / `renderCard()` / `renderDishList()`
- 依据文档：`PRD.md`（非目标）、`TECH_DESIGN.md`（§2.2、§11、§12）
- **本文件只描述形状，不含任何实现。** 第 3 周的建表语句、云函数代码一律另起文件。
